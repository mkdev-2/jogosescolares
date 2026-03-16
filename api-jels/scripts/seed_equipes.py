#!/usr/bin/env python3
"""
Script para criar equipes e vincular estudantes.
Regras: idade (12-14 ou 15-17), sexo (M/F), 1 individual + 1 coletiva por aluno, limite_atletas.
Equipes só são criadas se houver pelo menos 80% do limite de membros (ex: limite 15 → mín 12).
Executa: python scripts/seed_equipes.py [--equipes N]
Requer: escolas, professores e estudantes já criados.
"""
import asyncio
import math
import random
import sys
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

from seed_utils import (
    get_connection,
    calcular_idade_anos_completos,
    parse_args_equipes,
)


async def seed_equipes(variantes_por_escola: int):
    """Cria equipes e vincula estudantes respeitando todas as regras."""
    conn = await get_connection()

    try:
        async with conn.cursor() as cur:
            print("Conectando ao banco...", flush=True)

            # Buscar escolas
            await cur.execute("SELECT id FROM escolas ORDER BY id")
            escola_ids = [r["id"] for r in await cur.fetchall()]
            if not escola_ids:
                print("ERRO: Nenhuma escola encontrada. Execute seed_escolas.py primeiro.", flush=True)
                return

            # Buscar variantes com limite_atletas
            await cur.execute("""
                SELECT ev.id, ev.esporte_id, c.idade_min, c.idade_max, n.codigo as naipe, tm.codigo as tipo,
                       e.limite_atletas
                FROM esporte_variantes ev
                JOIN esportes e ON e.id = ev.esporte_id
                JOIN categorias c ON c.id = ev.categoria_id
                JOIN naipes n ON n.id = ev.naipe_id
                JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
                WHERE tm.codigo IN ('INDIVIDUAIS', 'COLETIVAS')
            """)
            variantes = await cur.fetchall()
            if not variantes:
                print("ERRO: Nenhuma esporte_variante encontrada. Execute as migrations.", flush=True)
                return

            variantes = variantes[:variantes_por_escola]

            # Buscar estudantes (id, escola_id, data_nascimento, sexo)
            await cur.execute(
                "SELECT id, escola_id, data_nascimento, sexo FROM estudantes_atletas"
            )
            estudante_ids = await cur.fetchall()

            # Buscar professores por escola
            await cur.execute("SELECT id, escola_id FROM professores_tecnicos")
            profs_raw = await cur.fetchall()
            profs_por_escola = {}
            for p in profs_raw:
                profs_por_escola.setdefault(p["escola_id"], []).append(p["id"])

            # Regra: 1 individual + 1 coletiva por aluno
            # Pré-carregar vínculos existentes no banco (para re-execuções do script)
            estudante_tipos = {}
            await cur.execute("""
                SELECT ee.estudante_id, tm.codigo as tipo
                FROM equipe_estudantes ee
                JOIN equipes eq ON eq.id = ee.equipe_id
                JOIN esporte_variantes ev ON ev.id = eq.esporte_variante_id
                JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
                WHERE tm.codigo IN ('INDIVIDUAIS', 'COLETIVAS')
            """)
            for r in await cur.fetchall():
                estudante_tipos.setdefault(r["estudante_id"], set()).add(r["tipo"])

            print(f"Inserindo equipes ({len(variantes)} variantes por escola)...", flush=True)
            equipes_criadas = 0
            vinculos_total = 0

            for escola_idx, escola_id in enumerate(escola_ids):
                print(f"  [Escola {escola_idx + 1}/{len(escola_ids)}] Processando...", flush=True)
                profs_escola = profs_por_escola.get(escola_id, [])
                if not profs_escola:
                    print(f"    AVISO: Sem professores para escola {escola_id}", flush=True)
                    continue

                estudantes_escola = [e for e in estudante_ids if e["escola_id"] == escola_id]

                for ev_idx, ev in enumerate(variantes):
                    try:
                        idade_min, idade_max = ev["idade_min"], ev["idade_max"]
                        naipe = ev["naipe"]
                        tipo = ev["tipo"]
                        limite_atletas = ev.get("limite_atletas") or 999
                        minimo_membros = math.ceil(limite_atletas * 0.8) if limite_atletas < 999 else 1

                        # Pré-selecionar alunos elegíveis (idade, sexo, 1 individual + 1 coletiva)
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

                        # Só cria equipe se houver pelo menos 80% do limite
                        if len(candidatos) < minimo_membros:
                            limite_info = f" (mín {minimo_membros}/{limite_atletas})" if limite_atletas < 999 else ""
                            print(f"    Equipe {ev_idx + 1}/{len(variantes)} ({tipo}){limite_info}: PULADA (apenas {len(candidatos)} candidatos)", flush=True)
                            continue

                        # Criar equipe
                        await cur.execute(
                            """INSERT INTO equipes (escola_id, esporte_variante_id, professor_tecnico_id)
                               VALUES (%s, %s, %s) RETURNING id""",
                            (escola_id, ev["id"], random.choice(profs_escola))
                        )
                        equipe_id = (await cur.fetchone())["id"]
                        equipes_criadas += 1

                        vinculos_equipe = 0
                        for est in candidatos:
                            if vinculos_equipe >= limite_atletas:
                                break
                            sp_name = f"sp_v_{est['id']}"
                            try:
                                await cur.execute(f"SAVEPOINT {sp_name}")
                                await cur.execute(
                                    """INSERT INTO equipe_estudantes (equipe_id, estudante_id) VALUES (%s, %s)
                                       ON CONFLICT (equipe_id, estudante_id) DO NOTHING""",
                                    (equipe_id, est["id"])
                                )
                                await cur.execute(f"RELEASE SAVEPOINT {sp_name}")
                                if cur.rowcount and cur.rowcount > 0:
                                    estudante_tipos.setdefault(est["id"], set()).add(tipo)
                                    vinculos_equipe += 1
                                    vinculos_total += 1
                            except Exception as e:
                                err_msg = str(e).lower()
                                if "já participa" in err_msg or "modalidade individual" in err_msg or "modalidade coletiva" in err_msg:
                                    await cur.execute(f"ROLLBACK TO SAVEPOINT {sp_name}")
                                    estudante_tipos.setdefault(est["id"], set()).add(tipo)
                                    continue
                                await conn.rollback()
                                raise RuntimeError(f"Erro ao vincular estudante: {e}") from e

                        limite_info = f" (limite {limite_atletas})" if limite_atletas < 999 else ""
                        print(f"    Equipe {ev_idx + 1}/{len(variantes)} ({tipo}){limite_info}: {vinculos_equipe} alunos", flush=True)
                    except Exception as e:
                        await conn.rollback()
                        raise RuntimeError(f"Erro ao criar equipe (escola {escola_idx+1}, variante {ev_idx+1}): {e}") from e

            print(f"  -> {equipes_criadas} equipes criadas, {vinculos_total} vínculos", flush=True)
            await conn.commit()
            print("\nSeed equipes concluído com sucesso!", flush=True)
    finally:
        await conn.close()


if __name__ == "__main__":
    args = parse_args_equipes()
    asyncio.run(seed_equipes(args.equipes))
