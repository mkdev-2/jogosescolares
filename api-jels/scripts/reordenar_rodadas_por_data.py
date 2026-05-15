#!/usr/bin/env python3
"""
Reordena o campo `rodada` das partidas de GRUPOS com base nas datas agendadas
(inicio_em), garantindo que:
  - A data mais cedo  → Rodada 1
  - A próxima data    → Rodada 2
  - ... e assim por diante
  - Partidas sem data → rodadas finais (mantendo agrupamento interno)

Uso:
    python scripts/reordenar_rodadas_por_data.py              # banco local (.env)
    python scripts/reordenar_rodadas_por_data.py --prod       # banco de produção
    python scripts/reordenar_rodadas_por_data.py --id 7       # campeonato específico
    python scripts/reordenar_rodadas_por_data.py --dry-run    # simula sem alterar
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from seed_utils import get_connection

_PROD_URL = "postgresql://jogosescolares:jogosescolares_pass@147.93.178.221:5438/jogosescolares"


def _parse_args():
    p = argparse.ArgumentParser(description="Reordena rodadas de GRUPOS pela data dos jogos.")
    p.add_argument("--id", dest="campeonato_id", type=int, default=None,
                   help="Processa apenas este campeonato_id.")
    p.add_argument("--dry-run", action="store_true",
                   help="Simula as atualizações sem gravar no banco.")
    p.add_argument("--prod", action="store_true",
                   help="Conecta direto ao banco de produção.")
    return p.parse_args()


async def reordenar(campeonato_id: int | None, dry_run: bool, prod: bool) -> None:
    if prod:
        os.environ["DATABASE_URL"] = _PROD_URL

    conn = await get_connection()

    try:
        async with conn.cursor() as cur:
            # Campeonatos que têm ao menos 1 partida de GRUPOS com data agendada
            if campeonato_id is not None:
                await cur.execute(
                    """
                    SELECT DISTINCT c.id, c.status
                    FROM campeonatos c
                    JOIN campeonato_partidas p ON p.campeonato_id = c.id
                    WHERE c.id = %s AND p.fase = 'GRUPOS' AND p.inicio_em IS NOT NULL
                    ORDER BY c.id
                    """,
                    (campeonato_id,),
                )
            else:
                await cur.execute(
                    """
                    SELECT DISTINCT c.id, c.status
                    FROM campeonatos c
                    JOIN campeonato_partidas p ON p.campeonato_id = c.id
                    WHERE p.fase = 'GRUPOS' AND p.inicio_em IS NOT NULL
                    ORDER BY c.id
                    """
                )
            campeonatos = await cur.fetchall()

        if not campeonatos:
            print("Nenhum campeonato com partidas de GRUPOS agendadas encontrado.")
            return

        print(f"Campeonatos encontrados: {len(campeonatos)}")
        if dry_run:
            print(">>> MODO DRY-RUN: nenhuma alteração será gravada <<<\n")

        total_updates = 0

        for camp in campeonatos:
            cid = camp["id"]
            status = camp["status"]
            print(f"\n--- Campeonato {cid} [{status}] ---")

            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id, nome FROM campeonato_grupos WHERE campeonato_id = %s ORDER BY ordem",
                    (cid,),
                )
                grupos = await cur.fetchall()

            for grupo in grupos:
                gid = grupo["id"]
                gnome = grupo["nome"]

                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        SELECT id, rodada, inicio_em::date AS data
                        FROM campeonato_partidas
                        WHERE grupo_id = %s AND fase = 'GRUPOS' AND is_bye = FALSE
                        ORDER BY inicio_em NULLS LAST, rodada, id
                        """,
                        (gid,),
                    )
                    partidas = [dict(r) for r in await cur.fetchall()]

                if not partidas:
                    continue

                # Datas únicas ordenadas (sem NULL)
                datas_unicas = sorted({p["data"] for p in partidas if p["data"] is not None})

                if not datas_unicas:
                    print(f"  Grupo {gnome}: nenhuma partida com data — pulando.")
                    continue

                # Data → novo número de rodada
                data_para_rodada = {d: i + 1 for i, d in enumerate(datas_unicas)}

                # Partidas sem data: agrupadas pelo rodada atual (mantém agrupamento
                # interno) e recebem os slots seguintes às datas, em ordem crescente
                null_grupos: dict[int, list[int]] = {}
                for p in partidas:
                    if p["data"] is None:
                        null_grupos.setdefault(p["rodada"], []).append(p["id"])

                next_slot = len(datas_unicas) + 1
                rodada_atual_para_nova: dict[int, int] = {}
                for rodada_atual in sorted(null_grupos.keys()):
                    rodada_atual_para_nova[rodada_atual] = next_slot
                    next_slot += 1

                # Calcula e aplica as atualizações
                grupo_updates = 0
                for p in partidas:
                    if p["data"] is not None:
                        nova_rodada = data_para_rodada[p["data"]]
                    else:
                        nova_rodada = rodada_atual_para_nova[p["rodada"]]

                    if nova_rodada == p["rodada"]:
                        continue

                    print(
                        f"  Grupo {gnome} | Partida {p['id']}: "
                        f"rodada {p['rodada']} → {nova_rodada}"
                        f"  (data: {p['data'] or 'sem data'})"
                    )
                    grupo_updates += 1
                    total_updates += 1

                    if not dry_run:
                        async with conn.cursor() as cur:
                            await cur.execute(
                                "UPDATE campeonato_partidas SET rodada = %s WHERE id = %s",
                                (nova_rodada, p["id"]),
                            )

                if grupo_updates == 0:
                    print(f"  Grupo {gnome}: já está na ordem correta.")
                else:
                    print(f"  Grupo {gnome}: {grupo_updates} partida(s) atualizadas.")

        print(f"\n{'[DRY-RUN] ' if dry_run else ''}Total de atualizações: {total_updates}")

        if not dry_run:
            await conn.commit()
            print("Commit realizado com sucesso.")

    finally:
        await conn.close()


def main():
    args = _parse_args()
    asyncio.run(reordenar(args.campeonato_id, args.dry_run, args.prod))


if __name__ == "__main__":
    main()
