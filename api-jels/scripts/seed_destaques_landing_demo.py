#!/usr/bin/env python3
"""
Preenche dados mínimos para o bloco "Destaques da rodada" na landing.

O que faz (edição ATIVA):
  1. Lista **todos** os campeonatos automáticos (não manual) em GERADO/EM_ANDAMENTO/FINALIZADO
     que tenham partidas de fase GRUPOS sem resultado na **maior rodada** em aberto — ou seja,
     cobre todas as combinações de esporte, categoria, naipe e tipo que existirem como
     campeonato distinto na edição ativa.
  2. Para cada um: registra placares fictícios (NORMAL) em todas as partidas dessa rodada —
     um confronto com placar mais alto para destacar "jogo da rodada".
  3. Se o esporte usar unidade GOLS ou CESTAS: ativa registra_artilheiro na config da edição
     (se ainda estiver false) e insere linhas em partida_artilheiros coerentes com o placar
     (um atleta por equipe somando os gols/cestas da equipe).

Uso:
  python scripts/seed_destaques_landing_demo.py
  python scripts/seed_destaques_landing_demo.py --campeonato-id 42
  python scripts/seed_destaques_landing_demo.py --dry-run

Requer: DATABASE_URL, campeonatos já gerados com partidas de grupos e equipes com pelo menos
um estudante vinculado (ex.: seed_equipes.py). Não substitui o fluxo oficial no painel:
é atalho para ambiente de demo/teste.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

from psycopg.errors import UndefinedTable

from seed_utils import get_connection, get_edicao_ativa_id

_STATUSES = ("GERADO", "EM_ANDAMENTO", "FINALIZADO")


async def _primeiro_estudante_equipe(cur, equipe_id: int) -> int | None:
    await cur.execute(
        "SELECT estudante_id FROM equipe_estudantes WHERE equipe_id = %s ORDER BY estudante_id LIMIT 1",
        (equipe_id,),
    )
    r = await cur.fetchone()
    return int(r["estudante_id"]) if r else None


async def listar_alvos(cur, edicao_id: int, campeonato_id_arg: int | None) -> list[tuple[int, int, str]]:
    """
    Retorna lista de (campeonato_id, rodada, unidade_placar).
    Um campeonato por combinação na edição; rodada = maior rodada com ao menos uma partida
    de GRUPOS ainda sem resultado.
    unidade_placar em GOLS|CESTAS|SETS|... (pode vir vazia; o chamador resolve via SELECT no camp).
    """
    extra = ""
    params: list = [edicao_id, list(_STATUSES)]
    if campeonato_id_arg is not None:
        extra = "AND c.id = %s"
        params.append(campeonato_id_arg)

    await cur.execute(
        f"""
        SELECT c.id AS campeonato_id,
               mx.rodada,
               UPPER(COALESCE(ecp.unidade_placar, '')) AS unidade_placar
        FROM campeonatos c
        JOIN esporte_variantes ev ON ev.id = c.esporte_variante_id
        LEFT JOIN esporte_config_pontuacao ecp
          ON ecp.esporte_id = ev.esporte_id AND ecp.edicao_id = c.edicao_id
        JOIN (
            SELECT campeonato_id, MAX(rodada) AS rodada
            FROM campeonato_partidas
            WHERE fase = 'GRUPOS'
              AND is_bye = FALSE
              AND mandante_equipe_id IS NOT NULL
              AND visitante_equipe_id IS NOT NULL
              AND resultado_tipo IS NULL
            GROUP BY campeonato_id
        ) mx ON mx.campeonato_id = c.id
        WHERE c.edicao_id = %s
          AND c.status = ANY(%s)
          AND c.origem <> 'MANUAL'
          {extra}
        ORDER BY c.id
        """,
        tuple(params),
    )
    rows = await cur.fetchall()
    out: list[tuple[int, int, str]] = []
    for row in rows:
        if row["rodada"] is None:
            continue
        out.append((int(row["campeonato_id"]), int(row["rodada"]), str(row["unidade_placar"] or "")))
    return out


async def _resolver_unidade_placar(cur, cid: int, unidade: str) -> str:
    if unidade:
        return unidade
    await cur.execute(
        """
        SELECT UPPER(COALESCE(ecp.unidade_placar, 'GOLS')) AS u
        FROM campeonatos c
        JOIN esporte_variantes ev ON ev.id = c.esporte_variante_id
        LEFT JOIN esporte_config_pontuacao ecp
          ON ecp.esporte_id = ev.esporte_id AND ecp.edicao_id = c.edicao_id
        WHERE c.id = %s
        """,
        (cid,),
    )
    r2 = await cur.fetchone()
    return str(r2["u"]) if r2 else "GOLS"


async def _seed_um_campeonato(
    cur,
    *,
    cid: int,
    rodada: int,
    unidade_in: str,
    dry_run: bool,
    admin_id: int | None,
) -> int:
    """Atualiza uma rodada de um campeonato. Retorna quantidade de partidas atualizadas (0 se nada a fazer)."""
    unidade = await _resolver_unidade_placar(cur, cid, unidade_in)
    print(f"  -> campeonato_id={cid}, rodada={rodada}, unidade_placar={unidade!r}", flush=True)

    await cur.execute(
        """
        SELECT cp.id, cp.mandante_equipe_id, cp.visitante_equipe_id
        FROM campeonato_partidas cp
        WHERE cp.campeonato_id = %s AND cp.rodada = %s AND cp.fase = 'GRUPOS'
          AND NOT cp.is_bye
          AND cp.mandante_equipe_id IS NOT NULL
          AND cp.visitante_equipe_id IS NOT NULL
          AND cp.resultado_tipo IS NULL
        ORDER BY cp.id
        """,
        (cid, rodada),
    )
    partidas = await cur.fetchall()
    if not partidas:
        print("    (sem partidas pendentes nesta rodada - ignorado)", flush=True)
        return 0

    specs: list[tuple[int, int, int, int, int, int | None, int | None]] = []
    for i, p in enumerate(partidas):
        pid = int(p["id"])
        mid = int(p["mandante_equipe_id"])
        vid = int(p["visitante_equipe_id"])
        if i == 0:
            if unidade == "CESTAS":
                specs.append((pid, mid, vid, 78, 72, None, None))
            elif unidade == "SETS":
                specs.append((pid, mid, vid, 3, 2, 98, 91))
            else:
                specs.append((pid, mid, vid, 6, 4, None, None))
        elif i == 1:
            specs.append((pid, mid, vid, 2, 1, None, None))
        else:
            specs.append((pid, mid, vid, 1, 1, None, None))

    if dry_run:
        print(f"    [dry-run] specs: {specs}", flush=True)
        return len(specs)

    for pid, mid, vid, pm, pv, pms, pvs in specs:
        venc = mid if pm > pv else (vid if pv > pm else None)
        await cur.execute(
            """
            UPDATE campeonato_partidas
            SET placar_mandante = %s,
                placar_visitante = %s,
                placar_mandante_sec = %s,
                placar_visitante_sec = %s,
                resultado_tipo = 'NORMAL',
                vencedor_equipe_id = %s,
                registrado_em = COALESCE(registrado_em, NOW()),
                registrado_por = COALESCE(registrado_por, %s),
                updated_at = NOW()
            WHERE id = %s
            """,
            (pm, pv, pms, pvs, venc, admin_id, pid),
        )

    await cur.execute(
        "UPDATE campeonatos SET status = 'EM_ANDAMENTO', updated_at = NOW() WHERE id = %s AND status = 'GERADO'",
        (cid,),
    )

    if unidade in ("GOLS", "CESTAS"):
        await cur.execute(
            """
            UPDATE esporte_config_pontuacao ecp
            SET registra_artilheiro = TRUE
            FROM campeonatos c
            JOIN esporte_variantes ev ON ev.id = c.esporte_variante_id
            WHERE c.id = %s
              AND ecp.edicao_id = c.edicao_id
              AND ecp.esporte_id = ev.esporte_id
            """,
            (cid,),
        )

        for pid, mid, vid, pm, pv, _pms, _pvs in specs:
            est_m = await _primeiro_estudante_equipe(cur, mid)
            est_v = await _primeiro_estudante_equipe(cur, vid)
            if not est_m or not est_v:
                print(
                    f"    Aviso: partida {pid} sem estudante em uma das equipes; "
                    "pule artilheiros. Execute seed_equipes.py.",
                    flush=True,
                )
                continue
            try:
                await cur.execute("DELETE FROM partida_artilheiros WHERE partida_id = %s", (pid,))
                await cur.execute(
                    """
                    INSERT INTO partida_artilheiros (partida_id, equipe_id, estudante_id, quantidade)
                    VALUES (%s, %s, %s, %s), (%s, %s, %s, %s)
                    """,
                    (pid, mid, est_m, pm, pid, vid, est_v, pv),
                )
            except UndefinedTable as e:
                print(f"    Tabela partida_artilheiros indisponível: {e}", flush=True)
                break

    return len(specs)


async def seed_destaques(*, dry_run: bool, campeonato_id_arg: int | None) -> None:
    conn = await get_connection()
    try:
        async with conn.cursor() as cur:
            edicao_id = await get_edicao_ativa_id(cur)
            alvos = await listar_alvos(cur, edicao_id, campeonato_id_arg)
            if not alvos:
                print(
                    "Nenhum campeonato encontrado com partidas de GRUPOS sem resultado.\n"
                    "Gere campeonatos no sistema (com chaveamento) e volte a executar este script,\n"
                    "ou use --campeonato-id <id> se já souber o ID.",
                    flush=True,
                )
                return

            print(f"Edicao ativa id={edicao_id} - {len(alvos)} campeonato(s) com rodada pendente.", flush=True)

            admin_id = None
            if not dry_run:
                await cur.execute(
                    "SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') ORDER BY id LIMIT 1"
                )
                u = await cur.fetchone()
                if u:
                    admin_id = int(u["id"])

            total_partidas = 0
            for cid, rodada, unidade in alvos:
                n = await _seed_um_campeonato(
                    cur, cid=cid, rodada=rodada, unidade_in=unidade, dry_run=dry_run, admin_id=admin_id
                )
                total_partidas += n

            if dry_run:
                print(f"[dry-run] Fim: {len(alvos)} campeonato(s), {total_partidas} partida(s) no total.", flush=True)
                return

            await conn.commit()
            print(
                f"OK: {total_partidas} partida(s) em {len(alvos)} campeonato(s). "
                "Recarregue a landing para ver Destaques da rodada.",
                flush=True,
            )
    finally:
        await conn.close()


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dry-run", action="store_true", help="Só mostra o que faria")
    p.add_argument("--campeonato-id", type=int, default=None, help="Força um campeonato específico")
    args = p.parse_args()
    asyncio.run(seed_destaques(dry_run=args.dry_run, campeonato_id_arg=args.campeonato_id))


if __name__ == "__main__":
    main()
