#!/usr/bin/env python3
"""
Recalcula o campo `rodada` das partidas de GRUPOS aplicando o algoritmo do
círculo (round-robin real), onde cada rodada agrupa o máximo de partidas sem
repetir nenhuma equipe.

A migração é segura: `rodada` em GRUPOS é usado apenas para exibição.
Resultados, pontuação e progressão de chave não são afetados.

Uso:
    python scripts/recalcular_rodadas_grupos.py              # banco local (.env)
    python scripts/recalcular_rodadas_grupos.py --prod       # banco de produção
    python scripts/recalcular_rodadas_grupos.py --id 7       # campeonato específico
    python scripts/recalcular_rodadas_grupos.py --dry-run    # simula sem alterar
"""
import argparse
import asyncio
import sys
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os

from seed_utils import get_connection
from app.services.chaveamentos_service import _gerar_rodadas_round_robin

_PROD_URL = "postgresql://jogosescolares:jogosescolares_pass@147.93.178.221:5438/jogosescolares"


def _parse_args():
    p = argparse.ArgumentParser(description="Recalcula rodadas das partidas de fase de GRUPOS.")
    p.add_argument("--id", dest="campeonato_id", type=int, default=None,
                   help="Processa apenas este campeonato_id.")
    p.add_argument("--dry-run", action="store_true",
                   help="Simula as atualizações sem gravar no banco.")
    p.add_argument("--prod", action="store_true",
                   help="Conecta direto ao banco de produção.")
    return p.parse_args()


async def recalcular(campeonato_id: int | None, dry_run: bool, prod: bool) -> None:
    if prod:
        os.environ["DATABASE_URL"] = _PROD_URL
    conn = await get_connection()

    try:
        async with conn.cursor() as cur:
            # Busca campeonatos que têm partidas na fase GRUPOS
            if campeonato_id is not None:
                await cur.execute(
                    """
                    SELECT DISTINCT c.id, c.status
                    FROM campeonatos c
                    JOIN campeonato_partidas p ON p.campeonato_id = c.id
                    WHERE c.id = %s AND p.fase = 'GRUPOS'
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
                    WHERE p.fase = 'GRUPOS'
                    ORDER BY c.id
                    """
                )
            campeonatos = await cur.fetchall()

        if not campeonatos:
            print("Nenhum campeonato com partidas de GRUPOS encontrado.")
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
                # Busca todos os grupos do campeonato
                await cur.execute(
                    "SELECT id, nome FROM campeonato_grupos WHERE campeonato_id = %s ORDER BY ordem",
                    (cid,),
                )
                grupos = await cur.fetchall()

            for grupo in grupos:
                gid = grupo["id"]
                gnome = grupo["nome"]

                async with conn.cursor() as cur:
                    # Equipes do grupo em ordem de seed
                    await cur.execute(
                        """
                        SELECT equipe_id
                        FROM campeonato_grupo_equipes
                        WHERE grupo_id = %s
                        ORDER BY seed_no_grupo
                        """,
                        (gid,),
                    )
                    equipe_ids = [int(r["equipe_id"]) for r in await cur.fetchall()]

                    # Partidas de GRUPOS deste grupo (exclui byes por segurança)
                    await cur.execute(
                        """
                        SELECT id, mandante_equipe_id, visitante_equipe_id, rodada
                        FROM campeonato_partidas
                        WHERE grupo_id = %s AND fase = 'GRUPOS' AND is_bye = FALSE
                        ORDER BY id
                        """,
                        (gid,),
                    )
                    partidas = await cur.fetchall()

                if not equipe_ids or not partidas:
                    print(f"  Grupo {gnome}: sem equipes ou partidas — pulando.")
                    continue

                # Gera o mapeamento novo: (mandante_id, visitante_id) → nova rodada
                rodadas = _gerar_rodadas_round_robin(equipe_ids)
                novo_mapa: dict[tuple[int, int], int] = {}
                for rodada_idx, confrontos in enumerate(rodadas, start=1):
                    for a, b in confrontos:
                        novo_mapa[(a, b)] = rodada_idx

                # Compara e atualiza
                grupo_updates = 0
                for p in partidas:
                    mid = int(p["mandante_equipe_id"])
                    vid = int(p["visitante_equipe_id"])
                    rodada_atual = p["rodada"]
                    nova_rodada = novo_mapa.get((mid, vid))

                    if nova_rodada is None:
                        # O algoritmo do círculo pode inverter mandante/visitante —
                        # tenta o par na ordem oposta antes de desistir.
                        nova_rodada = novo_mapa.get((vid, mid))

                    if nova_rodada is None:
                        print(f"  [AVISO] Partida {p['id']}: par ({mid}×{vid}) não encontrado no novo mapeamento.")
                        continue

                    if nova_rodada == rodada_atual:
                        continue  # já está correto

                    print(f"  Grupo {gnome} | Partida {p['id']}: rodada {rodada_atual} → {nova_rodada}  ({mid}×{vid})")
                    grupo_updates += 1
                    total_updates += 1

                    if not dry_run:
                        async with conn.cursor() as cur:
                            await cur.execute(
                                "UPDATE campeonato_partidas SET rodada = %s WHERE id = %s",
                                (nova_rodada, p["id"]),
                            )

                if grupo_updates == 0:
                    print(f"  Grupo {gnome}: já está correto, nenhuma alteração.")
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
    asyncio.run(recalcular(args.campeonato_id, args.dry_run, args.prod))


if __name__ == "__main__":
    main()
