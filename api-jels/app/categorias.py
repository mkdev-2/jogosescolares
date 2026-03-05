"""
Roteador de categorias: CRUD de categorias (faixa etária: 12-14, 15-17 anos).
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import CategoriaCreate, CategoriaUpdate, CategoriaResponse
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/categorias", tags=["categorias"])
logger = logging.getLogger(__name__)


def _row_to_response(row: dict) -> CategoriaResponse:
    """Converte row do banco para CategoriaResponse."""
    return CategoriaResponse(
        id=str(row["id"]),
        nome=row["nome"],
        idade_min=row["idade_min"],
        idade_max=row["idade_max"],
        ativa=row.get("ativa", True),
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


@router.get("", response_model=list[CategoriaResponse])
async def list_categorias(
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista todas as categorias (faixas etárias)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, idade_min, idade_max, ativa, created_at, updated_at FROM categorias ORDER BY idade_min"
        )
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/{categoria_id}", response_model=CategoriaResponse)
async def get_categoria(
    categoria_id: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Obtém categoria por ID."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, idade_min, idade_max, ativa, created_at, updated_at FROM categorias WHERE id = %s",
            (categoria_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")
    return _row_to_response(row)


@router.post("", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED)
async def create_categoria(
    data: CategoriaCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cria nova categoria (requer autenticação)."""
    if data.idade_min > data.idade_max:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="idade_min deve ser menor ou igual a idade_max",
        )

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO categorias (nome, idade_min, idade_max, ativa)
            VALUES (%s, %s, %s, %s)
            RETURNING id, nome, idade_min, idade_max, ativa, created_at, updated_at
            """,
            (
                data.nome.strip(),
                data.idade_min,
                data.idade_max,
                data.ativa if data.ativa is not None else True,
            ),
        )
        row = await cur.fetchone()
        await conn.commit()

    return _row_to_response(row)


@router.put("/{categoria_id}", response_model=CategoriaResponse)
async def update_categoria(
    categoria_id: str,
    data: CategoriaUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza categoria (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, idade_min, idade_max, ativa FROM categorias WHERE id = %s",
            (categoria_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")

    updates = []
    values = []
    if data.nome is not None:
        updates.append("nome = %s")
        values.append(data.nome.strip())
    if data.idade_min is not None:
        updates.append("idade_min = %s")
        values.append(data.idade_min)
    if data.idade_max is not None:
        updates.append("idade_max = %s")
        values.append(data.idade_max)
    if data.ativa is not None:
        updates.append("ativa = %s")
        values.append(data.ativa)

    if updates:
        idade_min = data.idade_min if data.idade_min is not None else existing["idade_min"]
        idade_max = data.idade_max if data.idade_max is not None else existing["idade_max"]
        if idade_min > idade_max:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="idade_min deve ser menor ou igual a idade_max",
            )

    if not updates:
        return _row_to_response(existing)

    updates.append("updated_at = NOW()")
    values.append(categoria_id)

    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            UPDATE categorias
            SET {", ".join(updates)}
            WHERE id = %s
            """,
            values,
        )
        await conn.commit()

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, idade_min, idade_max, ativa, created_at, updated_at FROM categorias WHERE id = %s",
            (categoria_id,),
        )
        row = await cur.fetchone()
    return _row_to_response(row)


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_categoria(
    categoria_id: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove categoria (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT COUNT(*) AS cnt FROM esporte_variantes WHERE categoria_id = %s",
            (categoria_id,),
        )
        row = await cur.fetchone()
        count = row["cnt"] if row else 0
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir: existem {count} variante(s) vinculada(s) a esta categoria",
        )

    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM categorias WHERE id = %s RETURNING id", (categoria_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")
        await conn.commit()
