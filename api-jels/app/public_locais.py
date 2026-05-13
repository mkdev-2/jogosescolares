"""
Locais da edição — leitura pública (sem autenticação).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
import psycopg

from app.database import get_db
from app.schemas import LocalResumo

router = APIRouter(prefix="/api/public/locais", tags=["public"])


async def _edicao_ativa_id(conn: psycopg.AsyncConnection) -> int | None:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id FROM edicoes
            WHERE status = 'ATIVA'
            ORDER BY ano DESC, id DESC
            LIMIT 1
            """
        )
        row = await cur.fetchone()
    return int(row["id"]) if row else None


@router.get("", response_model=list[LocalResumo])
async def list_locais_publico(
    edicao_id: int | None = Query(
        None,
        description="Filtra por edição; se omitido usa a edição com status ATIVA",
    ),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    if edicao_id is not None:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id FROM edicoes WHERE id = %s", (edicao_id,))
            if not await cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Edição não encontrada.",
                )
        resolved = edicao_id
    else:
        resolved = await _edicao_ativa_id(conn)
        if resolved is None:
            return []

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, nome, endereco_completo, foto_url, link_maps
            FROM locais
            WHERE edicao_id = %s
            ORDER BY nome, id
            """,
            (resolved,),
        )
        rows = await cur.fetchall()

    return [
        LocalResumo(
            id=int(r["id"]),
            nome=r["nome"] or "",
            endereco_completo=r.get("endereco_completo"),
            foto_url=r.get("foto_url"),
            link_maps=r.get("link_maps"),
        )
        for r in rows
    ]
