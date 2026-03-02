"""
Roteador de categorias: CRUD de categorias (conjuntos de modalidades).
"""
import logging
import time
import random
import string
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import CategoriaCreate, CategoriaUpdate, CategoriaResponse
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/categorias", tags=["categorias"])
logger = logging.getLogger(__name__)


def _generate_id() -> str:
    """Gera ID único para categoria."""
    return f"categoria_{int(time.time() * 1000)}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=7))}"


def _normalize_id(raw: str) -> str:
    """Normaliza ID: maiúsculo, espaços -> underscore."""
    if not raw or not str(raw).strip():
        return _generate_id()
    return str(raw).strip().upper().replace(" ", "_")


def _row_to_response(row: dict) -> CategoriaResponse:
    """Converte row do banco para CategoriaResponse."""
    return CategoriaResponse(
        id=row["id"],
        nome=row["nome"],
        descricao=row.get("descricao") or "",
        ordem=row.get("ordem", 0),
        ativa=row.get("ativa", True),
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


@router.get("", response_model=list[CategoriaResponse])
async def list_categorias(
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista todas as categorias."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, descricao, ordem, ativa, created_at, updated_at FROM categorias ORDER BY ordem, nome"
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
            "SELECT id, nome, descricao, ordem, ativa, created_at, updated_at FROM categorias WHERE id = %s",
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
    id_final = _normalize_id(data.id) if data.id else _normalize_id(data.nome) or _generate_id()
    if not id_final:
        id_final = _generate_id()

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM categorias WHERE id = %s",
            (id_final,),
        )
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Categoria com ID '{id_final}' já existe",
            )

        await cur.execute(
            """
            INSERT INTO categorias (id, nome, descricao, ordem, ativa)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, nome, descricao, ordem, ativa, created_at, updated_at
            """,
            (
                id_final,
                data.nome.strip(),
                (data.descricao or "").strip(),
                data.ordem if data.ordem is not None else 0,
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
            "SELECT id, nome, descricao, ordem, ativa FROM categorias WHERE id = %s",
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
    if data.descricao is not None:
        updates.append("descricao = %s")
        values.append(data.descricao.strip())
    if data.ordem is not None:
        updates.append("ordem = %s")
        values.append(data.ordem)
    if data.ativa is not None:
        updates.append("ativa = %s")
        values.append(data.ativa)

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
            RETURNING id, nome, descricao, ordem, ativa, created_at, updated_at
            """,
            values,
        )
        row = await cur.fetchone()
        await conn.commit()

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
            "SELECT COUNT(*) FROM modalidades WHERE categoria_id = %s",
            (categoria_id,),
        )
        count = (await cur.fetchone())[0]
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir: existem {count} modalidade(s) vinculada(s) a esta categoria",
        )

    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM categorias WHERE id = %s RETURNING id", (categoria_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")
        await conn.commit()
