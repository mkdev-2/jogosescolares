"""
Roteador de naipes: listagem (MASCULINO, FEMININO). Catálogo fixo.
"""
from fastapi import APIRouter, Depends
import psycopg

from app.schemas import NaipeResponse
from app.database import get_db

router = APIRouter(prefix="/api/naipes", tags=["naipes"])


def _row_to_response(row: dict) -> NaipeResponse:
    return NaipeResponse(
        id=str(row["id"]),
        codigo=row["codigo"],
        nome=row["nome"],
    )


@router.get("", response_model=list[NaipeResponse])
async def list_naipes(
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista todos os naipes (MASCULINO, FEMININO)."""
    async with conn.cursor() as cur:
        await cur.execute("SELECT id, codigo, nome FROM naipes ORDER BY codigo")
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]
