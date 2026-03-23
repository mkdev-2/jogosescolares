"""
Utilitários para resolução de contexto de edição.
"""
from fastapi import HTTPException, status
import psycopg


async def get_edicao_ativa(conn: psycopg.AsyncConnection) -> dict:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, uuid, nome, ano, status, data_inicio, data_fim, created_at, updated_at
            FROM edicoes
            WHERE status = 'ATIVA'
            ORDER BY ano DESC, id DESC
            LIMIT 1
            """
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhuma edição ativa foi configurada.",
        )
    return dict(row)


async def resolve_edicao_id(conn: psycopg.AsyncConnection, edicao_id: int | None) -> int:
    if edicao_id is None:
        ativa = await get_edicao_ativa(conn)
        return int(ativa["id"])

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM edicoes WHERE id = %s", (edicao_id,))
        row = await cur.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edição não encontrada.",
        )
    return int(row["id"])


async def get_escola_modalidades_adesao(
    conn: psycopg.AsyncConnection,
    escola_id: int,
    edicao_id: int,
) -> list[str]:
    """Retorna IDs de variantes da escola para uma edição, com fallback para legado."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT modalidades_adesao
            FROM escola_edicao_modalidades
            WHERE escola_id = %s AND edicao_id = %s
            """,
            (escola_id, edicao_id),
        )
        row = await cur.fetchone()
    if row and isinstance(row.get("modalidades_adesao"), dict):
        return row["modalidades_adesao"].get("variante_ids") or []

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT modalidades_adesao FROM escolas WHERE id = %s",
            (escola_id,),
        )
        legacy = await cur.fetchone()
    if legacy and isinstance(legacy.get("modalidades_adesao"), dict):
        return legacy["modalidades_adesao"].get("variante_ids") or []
    return []
