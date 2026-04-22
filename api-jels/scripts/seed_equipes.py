#!/usr/bin/env python3
"""
Script para criar equipes e vincular estudantes.
Regras: idade (faixa da categoria), sexo alinhado ao naipe (M/F), 1 individual + 1 coletiva por aluno,
limite_atletas do esporte. Equipes só são criadas se houver pelo menos o mínimo de membros definido em esportes.minimo_atletas,
exceto quando o limite é tratado como ilimitado (999), onde o mínimo é 1.

Por padrão tenta **todas** as variantes INDIVIDUAIS + COLETIVAS da edição ativa, para **cada escola**.
Use --max-variantes N para limitar (teste rápido).

Executa: python scripts/seed_equipes.py [--max-variantes N]
Requer: seed_esportes_modalidades (ou catálogo equivalente), escolas, professores e estudantes.
"""
import asyncio
import random
import sys
import time
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

from seed_utils import (
    get_connection,
    calcular_idade_anos_completos,
    parse_args_equipes,
    get_edicao_ativa_id,
)


def _fmt_dur(seconds: float) -> str:
    if seconds >= 3600:
        return f"{int(seconds // 3600)}h{int((seconds % 3600) // 60)}m"
    if seconds >= 60:
        return f"{int(seconds // 60)}m{int(seconds % 60)}s"
    return f"{seconds:.1f}s"


async def seed_equipes(limite_variantes: int) -> None:
    """Cria equipes e vincula estudantes respeitando todas as regras."""
    t_global = time.perf_counter()
    conn = await get_connection()

    try:
        async with conn.cursor() as cur:
            edicao_id = await get_edicao_ativa_id(cur)

            await cur.execute(
                """
                SELECT ev.id, ev.esporte_id, c.idade_min, c.idade_max, n.codigo AS naipe, tm.codigo AS tipo,
                       e.limite_atletas, e.minimo_atletas, e.nome AS esporte_nome
                FROM esporte_variantes ev
                JOIN esportes e ON e.id = ev.esporte_id AND e.edicao_id = ev.edicao_id
                JOIN categorias c ON c.id = ev.categoria_id
                JOIN naipes n ON n.id = ev.naipe_id
                JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
                WHERE ev.edicao_id = %s
                  AND tm.codigo IN ('INDIVIDUAIS', 'COLETIVAS')
                ORDER BY e.nome, c.idade_min, n.codigo, tm.codigo
                """,
                (edicao_id,),
            )
            variantes = await cur.fetchall()
            if not variantes:
                print(
                    "ERRO: Nenhuma esporte_variante IND/COLET na edição. "
                    "Execute seed_esportes_modalidades.py (ou crie o catálogo) antes.",
                    flush=True,
                )
                return

            if limite_variantes and limite_variantes > 0:
                variantes = variantes[: limite_variantes]

            await cur.execute("SELECT id FROM escolas ORDER BY id")
            escola_ids = [r["id"] for r in await cur.fetchall()]
            if not escola_ids:
                print("ERRO: Nenhuma escola encontrada. Execute seed_escolas.py primeiro.", flush=True)
                return

            await cur.execute(
                "SELECT id, escola_id, data_nascimento, sexo FROM estudantes_atletas"
            )
            estudante_ids = await cur.fetchall()

            await cur.execute("SELECT id, escola_id FROM professores_tecnicos")
            profs_raw = await cur.fetchall()
            profs_por_escola: dict = {}
            for p in profs_raw:
                profs_por_escola.setdefault(p["escola_id"], []).append(p["id"])

            estudante_tipos: dict = {}
            await cur.execute(
                """
                SELECT ee.estudante_id, tm.codigo AS tipo
                FROM equipe_estudantes ee
                JOIN equipes eq ON eq.id = ee.equipe_id
                JOIN esporte_variantes ev ON ev.id = eq.esporte_variante_id AND ev.edicao_id = eq.edicao_id
                JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
                WHERE tm.codigo IN ('INDIVIDUAIS', 'COLETIVAS')
                  AND eq.edicao_id = %s
                """,
                (edicao_id,),
            )
            for r in await cur.fetchall():
                estudante_tipos.setdefault(r["estudante_id"], set()).add(r["tipo"])

            n_escolas = len(escola_ids)
            n_var = len(variantes)
            total_passos = n_escolas * n_var
            # Linha de progresso a cada ~15 variantes (mín. 1), até teto 80
            heartbeat = max(1, min(80, (n_var + 14) // 15))

            print(
                f"Edição ativa id={edicao_id} | {n_var} variante(s) IND+COL por escola | "
                f"{n_escolas} escola(s) | até {total_passos} tentativas de equipe",
                flush=True,
            )
            if limite_variantes and limite_variantes > 0:
                print(f"(modo limitado: primeiras {limite_variantes} variantes por escola)", flush=True)

            equipes_criadas = 0
            vinculos_total = 0
            variantes_puladas = 0
            escolas_sem_prof = 0

            for escola_idx, escola_id in enumerate(escola_ids):
                t_escola = time.perf_counter()
                print(
                    f"\n--- Escola {escola_idx + 1}/{n_escolas} (id={escola_id}) — "
                    f"{n_var} variantes — global {_fmt_dur(time.perf_counter() - t_global)} ---",
                    flush=True,
                )

                profs_escola = profs_por_escola.get(escola_id, [])
                if not profs_escola:
                    print("    AVISO: sem professores técnicos; pulando escola.", flush=True)
                    escolas_sem_prof += 1
                    await conn.commit()
                    continue

                estudantes_escola = [e for e in estudante_ids if e["escola_id"] == escola_id]
                if not estudantes_escola:
                    print("    AVISO: sem estudantes; pulando escola.", flush=True)
                    await conn.commit()
                    continue

                eq_escola = 0
                vin_escola = 0

                for ev_idx, ev in enumerate(variantes):
                    if ev_idx > 0 and ev_idx % heartbeat == 0:
                        pct = (ev_idx * 100) // n_var
                        print(
                            f"    … progresso variante {ev_idx}/{n_var} ({pct}%) "
                            f"— {_fmt_dur(time.perf_counter() - t_escola)} nesta escola",
                            flush=True,
                        )

                    sp = f"sp_ev_{ev_idx}"
                    await cur.execute(f"SAVEPOINT {sp}")

                    try:
                        idade_min, idade_max = ev["idade_min"], ev["idade_max"]
                        naipe = ev["naipe"]
                        tipo = ev["tipo"]
                        limite_atletas = ev.get("limite_atletas") or 999
                        minimo_membros = ev.get("minimo_atletas") or 1

                        candidatos = []
                        for est in estudantes_escola:
                            if tipo in ("INDIVIDUAIS", "COLETIVAS"):
                                if estudante_tipos.get(est["id"], set()) & {tipo}:
                                    continue
                            idade = calcular_idade_anos_completos(est["data_nascimento"])
                            if idade < idade_min or idade > idade_max:
                                continue
                            if est["sexo"] != naipe:
                                continue
                            candidatos.append(est)

                        if len(candidatos) < minimo_membros:
                            variantes_puladas += 1
                            limite_info = f" (mín {minimo_membros}, máx {limite_atletas})" if limite_atletas < 999 else ""
                            if n_var <= 30 or ev_idx % max(1, n_var // 10) == 0:
                                print(
                                    f"    [{ev_idx + 1}/{n_var}] {ev.get('esporte_nome', '?')} ({tipo}){limite_info}: "
                                    f"PULADA — {len(candidatos)} candidato(s)",
                                    flush=True,
                                )
                            await cur.execute(f"RELEASE SAVEPOINT {sp}")
                            continue

                        await cur.execute(
                            """
                            INSERT INTO equipes (escola_id, esporte_variante_id, professor_tecnico_id, edicao_id)
                            VALUES (%s, %s, %s, %s) RETURNING id
                            """,
                            (escola_id, ev["id"], random.choice(profs_escola), edicao_id),
                        )
                        equipe_id = (await cur.fetchone())["id"]
                        equipes_criadas += 1
                        eq_escola += 1

                        vinculos_equipe = 0
                        vinculos_falhou = False
                        for est in candidatos:
                            if vinculos_equipe >= limite_atletas:
                                break
                            sp_name = f"sp_st_{est['id']}"
                            try:
                                await cur.execute(f"SAVEPOINT {sp_name}")
                                await cur.execute(
                                    """
                                    INSERT INTO equipe_estudantes (equipe_id, estudante_id)
                                    VALUES (%s, %s)
                                    ON CONFLICT (equipe_id, estudante_id) DO NOTHING
                                    RETURNING estudante_id
                                    """,
                                    (equipe_id, est["id"]),
                                )
                                row_ins = await cur.fetchone()
                                await cur.execute(f"RELEASE SAVEPOINT {sp_name}")
                                if row_ins:
                                    estudante_tipos.setdefault(est["id"], set()).add(tipo)
                                    vinculos_equipe += 1
                                    vinculos_total += 1
                                    vin_escola += 1
                            except Exception as e:
                                err_msg = str(e).lower()
                                if (
                                    "já participa" in err_msg
                                    or "modalidade individual" in err_msg
                                    or "modalidade coletiva" in err_msg
                                ):
                                    await cur.execute(f"ROLLBACK TO SAVEPOINT {sp_name}")
                                    estudante_tipos.setdefault(est["id"], set()).add(tipo)
                                    continue
                                await cur.execute(f"ROLLBACK TO SAVEPOINT {sp}")
                                print(
                                    f"    [{ev_idx + 1}/{n_var}] ERRO ao vincular estudante {est['id']}: {e}",
                                    flush=True,
                                )
                                vinculos_falhou = True
                                break

                        if vinculos_falhou:
                            await cur.execute(f"RELEASE SAVEPOINT {sp}")
                            continue

                        limite_info = f" (limite {limite_atletas})" if limite_atletas < 999 else ""
                        if n_var <= 40 or ev_idx % max(1, n_var // 15) == 0 or vinculos_equipe > 0:
                            print(
                                f"    [{ev_idx + 1}/{n_var}] {ev.get('esporte_nome', '?')} ({tipo}){limite_info}: "
                                f"{vinculos_equipe} aluno(s)",
                                flush=True,
                            )
                        await cur.execute(f"RELEASE SAVEPOINT {sp}")

                    except Exception as e:
                        await cur.execute(f"ROLLBACK TO SAVEPOINT {sp}")
                        print(
                            f"    [{ev_idx + 1}/{n_var}] ERRO na variante: {e}",
                            flush=True,
                        )
                        continue

                await conn.commit()
                print(
                    f"    [OK] Escola {escola_id} concluída em {_fmt_dur(time.perf_counter() - t_escola)} "
                    f"(+{eq_escola} equipe(s), +{vin_escola} vínculos) — commit salvo.",

                    flush=True,
                )

            print(
                f"\nResumo: {equipes_criadas} equipe(s), {vinculos_total} vínculo(s), "
                f"{variantes_puladas} variante(s) sem candidatos suficientes, "
                f"{escolas_sem_prof} escola(s) sem professor.",
                flush=True,
            )
            print(
                f"Tempo total: {_fmt_dur(time.perf_counter() - t_global)} — seed equipes concluído.",
                flush=True,
            )
    finally:
        await conn.close()


if __name__ == "__main__":
    args = parse_args_equipes()
    asyncio.run(seed_equipes(args.limite_variantes))
