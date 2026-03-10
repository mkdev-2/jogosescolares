"""
Endpoints para gerenciamento de categorias de notícias.
"""
from typing import Optional
from datetime import datetime
from uuid import UUID
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
import psycopg

from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/categorias-noticias", tags=["categorias-noticias"])

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}


def _require_admin(current_user: dict) -> dict:
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem gerenciar categorias.",
        )
    return current_user


class CategoriaNoticiaBase(BaseModel):
    name: str
    slug: str
    color: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class CategoriaNoticiaCreate(CategoriaNoticiaBase):
    pass


class CategoriaNoticiaUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoriaNoticiaResponse(CategoriaNoticiaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=list)
async def list_categorias(conn: psycopg.AsyncConnection = Depends(get_db)):
    """Lista categorias ativas (público)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM categorias_noticias WHERE is_active = TRUE ORDER BY name ASC"
        )
        rows = await cur.fetchall()
    return rows


@router.get("/{categoria_id}", response_model=CategoriaNoticiaResponse)
async def get_categoria(
    categoria_id: UUID,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Busca uma categoria por ID."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM categorias_noticias WHERE id = %s AND is_active = TRUE",
            (str(categoria_id),),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return row


@router.post("", response_model=CategoriaNoticiaResponse, status_code=status.HTTP_201_CREATED)
async def create_categoria(
    data: CategoriaNoticiaCreate,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Cria uma nova categoria (apenas admin)."""
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM categorias_noticias WHERE slug = %s",
            (data.slug,),
        )
        if await cur.fetchone():
            raise HTTPException(status_code=400, detail="Slug já está em uso")

        cat_id = uuid_lib.uuid4()
        await cur.execute(
            """
            INSERT INTO categorias_noticias (id, name, slug, color, icon, description, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                cat_id,
                data.name,
                data.slug,
                data.color,
                data.icon,
                data.description,
                data.is_active,
            ),
        )
        row = await cur.fetchone()
    await conn.commit()
    return row


@router.put("/{categoria_id}", response_model=CategoriaNoticiaResponse)
async def update_categoria(
    categoria_id: UUID,
    data: CategoriaNoticiaUpdate,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Atualiza uma categoria (apenas admin)."""
    _require_admin(current_user)
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")

    set_parts = [f"{k} = %s" for k in update_data]
    params = list(update_data.values())
    params.append(str(categoria_id))
    query = f"UPDATE categorias_noticias SET {', '.join(set_parts)}, updated_at = NOW() WHERE id = %s RETURNING *"

    async with conn.cursor() as cur:
        await cur.execute(query, tuple(params))
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    await conn.commit()
    return row


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_categoria(
    categoria_id: UUID,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Soft delete de uma categoria (apenas admin)."""
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE categorias_noticias SET is_active = FALSE WHERE id = %s",
            (str(categoria_id),),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
    await conn.commit()
    return None
