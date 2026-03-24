#!/usr/bin/env python3
"""
Uso único (dev local): remove esporte_variantes em que o tipo (INDIVIDUAIS/COLETIVAS)
contradiz esportes.limite_atletas, junto com campeonatos, equipes e vínculos dependentes.

Regra (igual à do seed/API):
  limite_atletas <= 1  → só INDIVIDUAIS faz sentido
  limite_atletas > 1   → só COLETIVAS faz sentido

Executa:
  python scripts/cleanup_variantes_tipo_inconsistente.py --dry-run   # só inspeciona
  python scripts/cleanup_variantes_tipo_inconsistente.py            # aplica na edição ATIVA
  python scripts/cleanup_variantes_tipo_inconsistente.py --todas-edicoes  # todas as edições

Requer DATABASE_URL (mesmo padrão dos outros scripts em scripts/).
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from psycopg.types.json import Json

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

from seed_utils import get_connection, get_edicao_ativa_id


_SQL_RUINS = """
SELECT ev.id::text AS id, ev.edicao_id, e.nome AS esporte_nome, tm.codigo AS tipo_codigo, e.limite_atletas
FROM esporte_variantes ev
JOIN esportes e ON e.id = ev.esporte_id AND e.edicao_id = ev.edicao_id
JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
WHERE tm.codigo IN ('INDIVIDUAIS', 'COLETIVAS')
  AND (
        (e.limite_atletas <= 1 AND tm.codigo = 'COLETIVAS')
     OR (e.limite_atletas > 1 AND tm.codigo = 'INDIVIDUAIS')
      )
  AND ({filtro_edicao})
ORDER BY ev.edicao_id, e.nome, ev.id
"""

_SQL_CREATE_TEMP = """
CREATE TEMP TABLE _cleanup_ruins (
    variante_id UUID NOT NULL,
    edicao_id INTEGER NOT NULL
) ON COMMIT DROP
"""

_SQL_FILL_TEMP = """
INSERT INTO _cleanup_ruins (variante_id, edicao_id)
SELECT ev.id, ev.edicao_id
FROM esporte_variantes ev
JOIN esportes e ON e.id = ev.esporte_id AND e.edicao_id = ev.edicao_id
JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
WHERE tm.codigo IN ('INDIVIDUAIS', 'COLETIVAS')
  AND (
        (e.limite_atletas <= 1 AND tm.codigo = 'COLETIVAS')
     OR (e.limite_atletas > 1 AND tm.codigo = 'INDIVIDUAIS')
      )
  AND ({filtro_edicao})
"""

_SQL_DEL_CAMP = """
DELETE FROM campeonatos c
USING _cleanup_ruins r
WHERE c.esporte_variante_id = r.variante_id AND c.edicao_id = r.edicao_id
"""

_SQL_DEL_EQ = """
DELETE FROM equipes eq
USING _cleanup_ruins r
WHERE eq.esporte_variante_id = r.variante_id AND eq.edicao_id = r.edicao_id
"""

_SQL_DEL_EV = """
DELETE FROM esporte_variantes ev
USING _cleanup_ruins r
WHERE ev.id = r.variante_id AND ev.edicao_id = r.edicao_id
"""


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Remove variantes incoerentes (tipo vs limite) e campeonatos/equipes ligados."
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Apenas lista o que seria removido, sem alterar o banco.",
    )
    p.add_argument(
        "--todas-edicoes",
        action="store_true",
        help="Processa todas as edições (use só se tiver certeza em ambiente local).",
    )
    p.add_argument(
        "--edicao-id",
        type=int,
        default=None,
        help="Restringe a uma edição (ignora --todas-edicoes). Default sem flag: edição ATIVA.",
    )
    return p.parse_args()


async def _run() -> None:
    args = _parse_args()
    if args.todas_edicoes and args.edicao_id is not None:
        print("Use --todas-edicoes OU --edicao-id, não ambos.", file=sys.stderr)
        raise SystemExit(2)

    conn = await get_connection()
    try:
        async with conn.cursor() as cur:
            if args.todas_edicoes:
                filtro = "TRUE"
                params: tuple = ()
                print("Escopo: todas as edições.", flush=True)
            elif args.edicao_id is not None:
                filtro = "ev.edicao_id = %s"
                params = (args.edicao_id,)
                print(f"Escopo: edição id={args.edicao_id}.", flush=True)
            else:
                eid = await get_edicao_ativa_id(cur)
                filtro = "ev.edicao_id = %s"
                params = (eid,)
                print(f"Escopo: edição ATIVA id={eid}.", flush=True)

            q = _SQL_RUINS.format(filtro_edicao=filtro)
            await cur.execute(q, params)
            rows = await cur.fetchall()
            n = len(rows)
            print(f"\nVariantes incoerentes encontradas: {n}", flush=True)
            for r in rows[:80]:
                print(
                    f"  edicao={r['edicao_id']} | {r['esporte_nome']} | "
                    f"tipo={r['tipo_codigo']} | limite={r['limite_atletas']} | id={r['id']}",
                    flush=True,
                )
            if n > 80:
                print(f"  … e mais {n - 80} linha(s).", flush=True)

            if n == 0:
                print("\nNada a fazer.", flush=True)
                return

            if args.dry_run:
                print("\n--dry-run: nenhuma alteração aplicada.", flush=True)
                return

            ruin_ids = {str(r["id"]) for r in rows}
            edicaos = list({r["edicao_id"] for r in rows})

            await cur.execute(_SQL_CREATE_TEMP)
            await cur.execute(_SQL_FILL_TEMP.format(filtro_edicao=filtro), params)

            await cur.execute(_SQL_DEL_CAMP)
            n_camp = cur.rowcount
            print(f"\nCampeonatos removidos: {n_camp}", flush=True)

            await cur.execute(_SQL_DEL_EQ)
            n_eq = cur.rowcount
            print(
                f"Equipes removidas: {n_eq} (equipe_estudantes em CASCADE).",
                flush=True,
            )

            await cur.execute(
                "SELECT escola_id, edicao_id, modalidades_adesao FROM escola_edicao_modalidades "
                "WHERE edicao_id = ANY(%s)",
                (edicaos,),
            )
            ad_rows = await cur.fetchall()
            n_adesao = 0
            for ar in ad_rows:
                mo = ar["modalidades_adesao"]
                if not isinstance(mo, dict):
                    continue
                ids = mo.get("variante_ids") or []
                if not ids:
                    continue
                new_ids = [x for x in ids if str(x) not in ruin_ids]
                if len(new_ids) == len(ids):
                    continue
                await cur.execute(
                    """
                    UPDATE escola_edicao_modalidades
                    SET modalidades_adesao = %s, updated_at = NOW()
                    WHERE escola_id = %s AND edicao_id = %s
                    """,
                    (Json({"variante_ids": new_ids}), ar["escola_id"], ar["edicao_id"]),
                )
                n_adesao += 1
            if n_adesao:
                print(f"Linhas de adesão escolar atualizadas (UUIDs removidos): {n_adesao}", flush=True)

            await cur.execute(_SQL_DEL_EV)
            n_ev = cur.rowcount
            print(f"Esporte_variantes removidas: {n_ev}", flush=True)

            await conn.commit()
            print("\nLimpeza concluída e commit salvo.", flush=True)
    finally:
        await conn.close()


if __name__ == "__main__":
    try:
        asyncio.run(_run())
    except RuntimeError as exc:
        print(f"\nErro: {exc}", file=sys.stderr)
        raise SystemExit(1) from None
