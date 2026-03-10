"""
Endpoints para gerenciamento de notícias (listagem pública e CRUD na área logada).
"""
from typing import List, Optional
from datetime import datetime
from uuid import UUID
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
import psycopg

from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/noticias", tags=["noticias"])

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}


def _require_admin(current_user: dict) -> dict:
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem gerenciar notícias.",
        )
    return current_user


class NoticiaBase(BaseModel):
    title: str
    slug: str
    content: str
    summary: Optional[str] = None
    featured_image_url: Optional[str] = None
    status: str = "rascunho"
    categories: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    event_date: Optional[datetime] = None
    gallery_urls: Optional[List[str]] = None
    documents: Optional[List[dict]] = None
    is_active: bool = True


class NoticiaCreate(NoticiaBase):
    pass


class NoticiaUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    featured_image_url: Optional[str] = None
    status: Optional[str] = None
    categories: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    event_date: Optional[datetime] = None
    gallery_urls: Optional[List[str]] = None
    documents: Optional[List[dict]] = None
    is_active: Optional[bool] = None


class NoticiaResponse(NoticiaBase):
    id: UUID
    author_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[NoticiaResponse])
async def list_noticias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista notícias (público). Filtro por status e categoria."""
    query = "SELECT * FROM noticias WHERE is_active = TRUE"
    params = []

    if status_filter:
        query += " AND status = %s"
        params.append(status_filter)
    if category:
        query += " AND %s = ANY(categories)"
        params.append(category)

    query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
    params.extend([limit, skip])

    async with conn.cursor() as cur:
        await cur.execute(query, tuple(params))
        rows = await cur.fetchall()
    return rows


@router.get("/slug/{slug}", response_model=NoticiaResponse)
async def get_noticia_by_slug(
    slug: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Busca uma notícia por slug (público)."""
    async with conn.cursor() as cur:
        await cur.execute("SELECT * FROM noticias WHERE slug = %s AND is_active = TRUE", (slug,))
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Notícia não encontrada")
    return row


@router.get("/{noticia_id}", response_model=NoticiaResponse)
async def get_noticia(
    noticia_id: UUID,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Busca uma notícia por ID (público)."""
    async with conn.cursor() as cur:
        await cur.execute("SELECT * FROM noticias WHERE id = %s AND is_active = TRUE", (str(noticia_id),))
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Notícia não encontrada")
    return row


@router.post("", response_model=NoticiaResponse, status_code=status.HTTP_201_CREATED)
async def create_noticia(
    noticia_data: NoticiaCreate,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Cria uma nova notícia (apenas admin)."""
    _require_admin(current_user)
    user_id = current_user.get("id")

    noticia_id = uuid_lib.uuid4()
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO noticias (
                id, title, slug, content, summary, featured_image_url,
                status, categories, tags, event_date, author_id,
                gallery_urls, documents, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                noticia_id,
                noticia_data.title,
                noticia_data.slug,
                noticia_data.content,
                noticia_data.summary,
                noticia_data.featured_image_url,
                noticia_data.status,
                noticia_data.categories,
                noticia_data.tags,
                noticia_data.event_date,
                user_id,
                noticia_data.gallery_urls,
                noticia_data.documents,
                noticia_data.is_active,
            ),
        )
        row = await cur.fetchone()
    await conn.commit()
    return row


@router.put("/{noticia_id}", response_model=NoticiaResponse)
async def update_noticia(
    noticia_id: UUID,
    noticia_data: NoticiaUpdate,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Atualiza uma notícia (apenas admin)."""
    _require_admin(current_user)
    update_data = noticia_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")

    set_parts = [f"{k} = %s" for k in update_data]
    params = list(update_data.values())
    params.append(str(noticia_id))
    query = f"UPDATE noticias SET {', '.join(set_parts)}, updated_at = NOW() WHERE id = %s RETURNING *"

    async with conn.cursor() as cur:
        await cur.execute(query, tuple(params))
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Notícia não encontrada")
    await conn.commit()
    return row


@router.delete("/{noticia_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_noticia(
    noticia_id: UUID,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Soft delete de uma notícia (apenas admin)."""
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute("UPDATE noticias SET is_active = FALSE WHERE id = %s", (str(noticia_id),))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Notícia não encontrada")
    await conn.commit()
    return None
