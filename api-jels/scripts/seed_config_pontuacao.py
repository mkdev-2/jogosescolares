#!/usr/bin/env python3
"""
Seed das configurações de pontuação e critérios de desempate para os 4 esportes
coletivos desta edição: Vôlei, Basquete, Futsal e Handebol.

Idempotente: usa INSERT ... ON CONFLICT DO UPDATE, podendo ser re-executado com segurança.

Executa: python scripts/seed_config_pontuacao.py [--edicao-id N]

Flags opcionais:
  --edicao-id N   ID da edição alvo (padrão: edição ATIVA)
  --dry-run       Exibe o que seria inserido sem alterar o banco
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

from seed_utils import get_connection, get_edicao_ativa_id

# ---------------------------------------------------------------------------
# Definição das configs por nome do esporte
# ---------------------------------------------------------------------------

CONFIGS: list[dict] = [
    {
        "nome_esporte": "Vôlei",
        # Unidade de placar: primária = SETS, secundária = PONTOS (dentro dos sets)
        "unidade_placar": "SETS",
        "unidade_placar_sec": "PONTOS",
        # Pontuação na tabela
        # 2x0 → vencedor 3pts / perdedor 0pts
        # 2x1 → vencedor 2pts / perdedor 1pt  (pts_vitoria_parcial)
        "pts_vitoria": 3,
        "pts_vitoria_parcial": 2,
        "pts_empate": 0,          # vôlei não tem empate
        "pts_derrota": 1,         # derrota 1x2 → 1pt; derrota 0x2 → 0pt (tratado no serviço)
        "permite_empate": False,
        # WxO: 2x0 com 25-0 por set → placar_sec = 50 (2 sets × 25 pontos)
        "wxo_pts_vencedor": 3,
        "wxo_pts_perdedor": 0,
        "wxo_placar_pro": 2,
        "wxo_placar_contra": 0,
        "wxo_placar_pro_sec": 50,
        "wxo_placar_contra_sec": 0,
        "ignorar_placar_extra": False,
        # Desempate entre 2: confronto direto decide
        "criterios_desempate_2": ["CONFRONTO_DIRETO"],
        # Desempate entre 3+: vitórias → average de sets → average de pontos → average geral
        "criterios_desempate_3plus": [
            "MAIOR_VITORIAS",
            "AVERAGE_DIRETO",
            "AVERAGE_SEC_DIRETO",
            "AVERAGE_GERAL",
            "AVERAGE_SEC_GERAL",
            "SORTEIO",
        ],
    },
    {
        "nome_esporte": "Basquete",
        "unidade_placar": "CESTAS",
        "unidade_placar_sec": None,
        # Vitória = 2pts / Derrota = 1pt (basquete raramente tem times com 0 pontos)
        "pts_vitoria": 2,
        "pts_vitoria_parcial": None,
        "pts_empate": 0,
        "pts_derrota": 1,
        "permite_empate": False,
        # WxO: perdedor leva 0pts (≠ derrota normal = 1pt); placar 20×0
        "wxo_pts_vencedor": 2,
        "wxo_pts_perdedor": 0,
        "wxo_placar_pro": 20,
        "wxo_placar_contra": 0,
        "wxo_placar_pro_sec": None,
        "wxo_placar_contra_sec": None,
        "ignorar_placar_extra": False,
        "criterios_desempate_2": ["CONFRONTO_DIRETO"],
        "criterios_desempate_3plus": [
            "MAIOR_VITORIAS",
            "AVERAGE_DIRETO",
            "SALDO_DIRETO",
            "MENOR_CONTRA_GERAL",
            "SORTEIO",
        ],
    },
    {
        "nome_esporte": "Futsal",
        "unidade_placar": "GOLS",
        "unidade_placar_sec": None,
        "pts_vitoria": 3,
        "pts_vitoria_parcial": None,
        "pts_empate": 1,
        "pts_derrota": 0,
        "permite_empate": True,
        "wxo_pts_vencedor": 3,
        "wxo_pts_perdedor": 0,
        "wxo_placar_pro": 1,
        "wxo_placar_contra": 0,
        "wxo_placar_pro_sec": None,
        "wxo_placar_contra_sec": None,
        "ignorar_placar_extra": False,
        "criterios_desempate_2": [
            "CONFRONTO_DIRETO",
            "AVERAGE_GERAL",
            "SALDO_GERAL",
            "MENOR_CONTRA_GERAL",
            "MAIOR_PRO_GERAL",
            "SORTEIO",
        ],
        "criterios_desempate_3plus": [
            "MAIOR_VITORIAS",
            "AVERAGE_DIRETO",
            "SALDO_DIRETO",
            "MENOR_CONTRA_GERAL",
            "MAIOR_PRO_GERAL",
            "SORTEIO",
        ],
    },
    {
        "nome_esporte": "Handebol",
        "unidade_placar": "GOLS",
        "unidade_placar_sec": None,
        "pts_vitoria": 3,
        "pts_vitoria_parcial": None,
        "pts_empate": 2,
        "pts_derrota": 1,
        "permite_empate": True,
        "wxo_pts_vencedor": 3,
        "wxo_pts_perdedor": 0,
        "wxo_placar_pro": 1,
        "wxo_placar_contra": 0,
        "wxo_placar_pro_sec": None,
        "wxo_placar_contra_sec": None,
        # Gols de prorrogação NÃO entram no saldo/average
        "ignorar_placar_extra": True,
        "criterios_desempate_2": [
            "CONFRONTO_DIRETO",
            "AVERAGE_GERAL",
            "SALDO_GERAL",
            "MENOR_CONTRA_GERAL",
            "MAIOR_PRO_GERAL",
            "SORTEIO",
        ],
        "criterios_desempate_3plus": [
            "MAIOR_VITORIAS",
            "AVERAGE_DIRETO",
            "SALDO_DIRETO",
            "MENOR_CONTRA_GERAL",
            "MAIOR_PRO_GERAL",
            "SORTEIO",
        ],
    },
]

UPSERT_SQL = """
INSERT INTO esporte_config_pontuacao (
    esporte_id, edicao_id,
    unidade_placar, unidade_placar_sec,
    pts_vitoria, pts_vitoria_parcial, pts_empate, pts_derrota, permite_empate,
    wxo_pts_vencedor, wxo_pts_perdedor,
    wxo_placar_pro, wxo_placar_contra,
    wxo_placar_pro_sec, wxo_placar_contra_sec,
    ignorar_placar_extra,
    criterios_desempate_2, criterios_desempate_3plus
) VALUES (
    %(esporte_id)s, %(edicao_id)s,
    %(unidade_placar)s, %(unidade_placar_sec)s,
    %(pts_vitoria)s, %(pts_vitoria_parcial)s, %(pts_empate)s, %(pts_derrota)s, %(permite_empate)s,
    %(wxo_pts_vencedor)s, %(wxo_pts_perdedor)s,
    %(wxo_placar_pro)s, %(wxo_placar_contra)s,
    %(wxo_placar_pro_sec)s, %(wxo_placar_contra_sec)s,
    %(ignorar_placar_extra)s,
    %(criterios_desempate_2_json)s::jsonb, %(criterios_desempate_3plus_json)s::jsonb
)
ON CONFLICT (esporte_id, edicao_id) DO UPDATE SET
    unidade_placar        = EXCLUDED.unidade_placar,
    unidade_placar_sec    = EXCLUDED.unidade_placar_sec,
    pts_vitoria           = EXCLUDED.pts_vitoria,
    pts_vitoria_parcial   = EXCLUDED.pts_vitoria_parcial,
    pts_empate            = EXCLUDED.pts_empate,
    pts_derrota           = EXCLUDED.pts_derrota,
    permite_empate        = EXCLUDED.permite_empate,
    wxo_pts_vencedor      = EXCLUDED.wxo_pts_vencedor,
    wxo_pts_perdedor      = EXCLUDED.wxo_pts_perdedor,
    wxo_placar_pro        = EXCLUDED.wxo_placar_pro,
    wxo_placar_contra     = EXCLUDED.wxo_placar_contra,
    wxo_placar_pro_sec    = EXCLUDED.wxo_placar_pro_sec,
    wxo_placar_contra_sec = EXCLUDED.wxo_placar_contra_sec,
    ignorar_placar_extra  = EXCLUDED.ignorar_placar_extra,
    criterios_desempate_2     = EXCLUDED.criterios_desempate_2,
    criterios_desempate_3plus = EXCLUDED.criterios_desempate_3plus,
    updated_at            = CURRENT_TIMESTAMP
RETURNING id, (xmax = 0) AS is_insert
"""


async def run(edicao_id_override: int | None, dry_run: bool) -> None:
    conn = await get_connection()
    try:
        async with conn.cursor() as cur:
            edicao_id = edicao_id_override or await get_edicao_ativa_id(cur)
            print(f"Edição alvo: id={edicao_id}", flush=True)

            for cfg in CONFIGS:
                nome = cfg["nome_esporte"]

                # Busca o esporte pelo nome na edição
                await cur.execute(
                    "SELECT id FROM esportes WHERE nome = %s AND edicao_id = %s",
                    (nome, edicao_id),
                )
                row = await cur.fetchone()
                if not row:
                    print(f"  [SKIP] Esporte '{nome}' não encontrado na edição {edicao_id}.", flush=True)
                    continue

                esporte_id = str(row["id"])

                params = {
                    "esporte_id": esporte_id,
                    "edicao_id": edicao_id,
                    "unidade_placar": cfg["unidade_placar"],
                    "unidade_placar_sec": cfg["unidade_placar_sec"],
                    "pts_vitoria": cfg["pts_vitoria"],
                    "pts_vitoria_parcial": cfg["pts_vitoria_parcial"],
                    "pts_empate": cfg["pts_empate"],
                    "pts_derrota": cfg["pts_derrota"],
                    "permite_empate": cfg["permite_empate"],
                    "wxo_pts_vencedor": cfg["wxo_pts_vencedor"],
                    "wxo_pts_perdedor": cfg["wxo_pts_perdedor"],
                    "wxo_placar_pro": cfg["wxo_placar_pro"],
                    "wxo_placar_contra": cfg["wxo_placar_contra"],
                    "wxo_placar_pro_sec": cfg["wxo_placar_pro_sec"],
                    "wxo_placar_contra_sec": cfg["wxo_placar_contra_sec"],
                    "ignorar_placar_extra": cfg["ignorar_placar_extra"],
                    "criterios_desempate_2_json": json.dumps(cfg["criterios_desempate_2"]),
                    "criterios_desempate_3plus_json": json.dumps(cfg["criterios_desempate_3plus"]),
                }

                if dry_run:
                    print(
                        f"  [DRY-RUN] {nome} (esporte_id={esporte_id}): "
                        f"pts={cfg['pts_vitoria']}/{cfg['pts_empate']}/{cfg['pts_derrota']} "
                        f"permite_empate={cfg['permite_empate']} "
                        f"placar={cfg['unidade_placar']}",
                        flush=True,
                    )
                    continue

                await cur.execute(UPSERT_SQL, params)
                result = await cur.fetchone()
                action = "INSERIDO" if result["is_insert"] else "ATUALIZADO"
                print(f"  [{action}] {nome} (esporte_id={esporte_id}, config_id={result['id']})", flush=True)

        if not dry_run:
            await conn.commit()
            print("\nSeed de configuração de pontuação concluído.", flush=True)
        else:
            await conn.rollback()
            print("\n[DRY-RUN] Nenhuma alteração gravada.", flush=True)
    finally:
        await conn.close()


def parse_args():
    p = argparse.ArgumentParser(description="Seed de configurações de pontuação por esporte")
    p.add_argument("--edicao-id", type=int, default=None, help="ID da edição alvo (padrão: edição ATIVA)")
    p.add_argument("--dry-run", action="store_true", help="Apenas exibe o que seria inserido, sem alterar o banco")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        asyncio.run(run(args.edicao_id, args.dry_run))
    except RuntimeError as exc:
        print(f"\nErro: {exc}", file=sys.stderr)
        raise SystemExit(1) from None
