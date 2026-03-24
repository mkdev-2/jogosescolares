#!/usr/bin/env python3
"""
Primeiro seed do ambiente local: cria ~10 esportes base na edição ATIVA.
Para cada esporte: categoria × naipe × um único tipo_modalidade coerente com limite_atletas
(limite 1 → INDIVIDUAIS; limite > 1 → COLETIVAS). Não gera par individual+coletivo por esporte.

Executa: python scripts/seed_esportes_modalidades.py

Requer: migrations aplicadas (015 + 027/028 com edição ATIVA).
Rodar antes de seed_escolas.py e demais seeds.
"""
import asyncio
import sys
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

from seed_utils import get_connection, get_edicao_ativa_id, codigo_tipo_modalidade_para_limite

# (nome, limite_atletas, ícone lucide aproximado)
ESPORTES_BASE_META: list[tuple[str, int, str]] = [
    ("Futebol de Campo", 15, "PiSoccerBall"),
    ("Futsal", 15, "PiSoccerBall"),
    ("Vôlei", 12, "GiVolleyballBall"),
    ("Basquete", 12, "FaBasketballBall"),
    ("Handebol", 15, "Award"),
    ("Natação", 1, "GrSwim"),
    ("Atletismo", 1, "GiContortionist"),
    ("Judô", 1, "MdSportsKabaddi"),
    ("Tênis de Mesa", 1, "FaTableTennis"),
    ("Xadrez", 1, "FaChess"),
]


async def seed_esportes_modalidades() -> None:
    conn = await get_connection()
    try:
        async with conn.cursor() as cur:
            edicao_id = await get_edicao_ativa_id(cur)
            print(f"Edição ativa id={edicao_id}", flush=True)

            await cur.execute(
                """
                SELECT id FROM categorias
                WHERE COALESCE(ativa, TRUE)
                ORDER BY idade_min, id
                """
            )
            cats = await cur.fetchall()
            if not cats:
                raise RuntimeError("Nenhuma categoria encontrada (migration 015).")

            await cur.execute("SELECT id FROM naipes ORDER BY codigo")
            naipes = await cur.fetchall()
            if not naipes:
                raise RuntimeError("Nenhum naipe encontrado (migration 015).")

            await cur.execute(
                "SELECT id, codigo FROM tipos_modalidade WHERE codigo IN ('INDIVIDUAIS', 'COLETIVAS')"
            )
            tipos_rows = await cur.fetchall()
            tipo_por_codigo = {r["codigo"]: str(r["id"]) for r in tipos_rows}
            if "INDIVIDUAIS" not in tipo_por_codigo or "COLETIVAS" not in tipo_por_codigo:
                raise RuntimeError("Esperados INDIVIDUAIS e COLETIVAS (migration 015).")

            cat_ids = [str(c["id"]) for c in cats]
            naipe_ids = [str(n["id"]) for n in naipes]
            combos_por_esporte = len(cat_ids) * len(naipe_ids)

            print(
                f"Dimensões: {len(cat_ids)} categoria(s) × {len(naipe_ids)} naipe(s) × "
                f"1 tipo (por limite do esporte) → {combos_por_esporte} variantes por esporte",
                flush=True,
            )

            esportes_criados = 0
            variantes_inseridas = 0

            for nome, limite_atletas, icone in ESPORTES_BASE_META:
                await cur.execute(
                    "SELECT id FROM esportes WHERE nome = %s AND edicao_id = %s",
                    (nome, edicao_id),
                )
                row = await cur.fetchone()
                if row:
                    esporte_id = str(row["id"])
                else:
                    await cur.execute(
                        """
                        INSERT INTO esportes (edicao_id, nome, descricao, icone, requisitos, limite_atletas, ativa)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (edicao_id, nome, "", icone, "", limite_atletas, True),
                    )
                    esporte_id = str((await cur.fetchone())["id"])
                    esportes_criados += 1

                cod_tipo = codigo_tipo_modalidade_para_limite(limite_atletas)
                tipo_id = tipo_por_codigo[cod_tipo]
                for cat_id in cat_ids:
                    for naipe_id in naipe_ids:
                        await cur.execute(
                            """
                            INSERT INTO esporte_variantes
                                (esporte_id, categoria_id, naipe_id, tipo_modalidade_id, edicao_id)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (esporte_id, categoria_id, naipe_id, tipo_modalidade_id, edicao_id)
                            DO NOTHING
                            RETURNING id
                            """,
                            (esporte_id, cat_id, naipe_id, tipo_id, edicao_id),
                        )
                        ins = await cur.fetchone()
                        if ins:
                            variantes_inseridas += 1

            await cur.execute(
                "SELECT COUNT(*) AS c FROM esportes WHERE edicao_id = %s",
                (edicao_id,),
            )
            n_esp = int((await cur.fetchone())["c"])
            await cur.execute(
                "SELECT COUNT(*) AS c FROM esporte_variantes WHERE edicao_id = %s",
                (edicao_id,),
            )
            n_var = int((await cur.fetchone())["c"])

            await conn.commit()

            print(f"  -> Esportes novos nesta execução: {esportes_criados}", flush=True)
            print(f"  -> Variantes novas (INSERT) nesta execução: {variantes_inseridas}", flush=True)
            print(f"  -> Totais na edição: {n_esp} esporte(s), {n_var} esporte_variante(s)", flush=True)
            print("\nSeed esportes/modalidades concluído.", flush=True)
    finally:
        await conn.close()


if __name__ == "__main__":
    try:
        asyncio.run(seed_esportes_modalidades())
    except RuntimeError as exc:
        print(f"\nErro: {exc}", file=sys.stderr)
        raise SystemExit(1) from None
