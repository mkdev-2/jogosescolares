"""
Roteador de tipos de modalidade: listagem (INDIVIDUAIS, COLETIVAS, NOVAS). Catálogo fixo.
"""
from fastapi import APIRouter, Depends
import psycopg

from app.schemas import TipoModalidadeResponse
from app.database import get_db

router = APIRouter(prefix="/api/tipos-modalidade", tags=["tipos-modalidade"])


def _row_to_response(row: dict) -> TipoModalidadeResponse:
    return TipoModalidadeResponse(
        id=str(row["id"]),
        codigo=row["codigo"],
        nome=row["nome"],
    )


@router.get("", response_model=list[TipoModalidadeResponse])
async def list_tipos_modalidade(
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista todos os tipos de modalidade (INDIVIDUAIS, COLETIVAS, NOVAS)."""
    async with conn.cursor() as cur:
        await cur.execute("SELECT id, codigo, nome FROM tipos_modalidade ORDER BY codigo")
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]
