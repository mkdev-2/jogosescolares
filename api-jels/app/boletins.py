"""
Boletins oficiais: listagem pública e CRUD (admin).
"""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
import psycopg

from app.database import get_db
from app.auth import get_current_user

router = APIRouter(prefix="/api/boletins", tags=["boletins"])

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}

TIPOS_VALIDOS = frozenset({"INFORMATIVO", "DISCIPLINAR", "SEMANAL"})


def _require_admin(current_user: dict) -> dict:
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem gerenciar boletins.",
        )
    return current_user


class BoletimBase(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=500)
    descricao: Optional[str] = Field(None, max_length=2000)
    documento_url: str = Field(..., min_length=1, max_length=1000)
    documento_bytes: Optional[int] = Field(None, ge=0)
    data_boletim: date
    tipo: str = "INFORMATIVO"
    publicado: bool = False

    model_config = ConfigDict(from_attributes=True)


class BoletimCreate(BoletimBase):
    pass


class BoletimUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=1, max_length=500)
    descricao: Optional[str] = Field(None, max_length=2000)
    documento_url: Optional[str] = Field(None, min_length=1, max_length=1000)
    documento_bytes: Optional[int] = Field(None, ge=0)
    data_boletim: Optional[date] = None
    tipo: Optional[str] = None
    publicado: Optional[bool] = None


class BoletimResponse(BoletimBase):
    id: UUID
    author_id: Optional[int] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BoletinsPublicPageResponse(BaseModel):
    items: List[BoletimResponse]
    total: int


def _validate_tipo(tipo: str) -> str:
    t = (tipo or "").strip().upper()
    if t not in TIPOS_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tipo inválido. Use: {', '.join(sorted(TIPOS_VALIDOS))}.",
        )
    return t


@router.get("", response_model=BoletinsPublicPageResponse)
async def list_boletins_publicos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    q: Optional[str] = Query(None, max_length=200, description="Busca em título e descrição"),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista boletins publicados com total (paginação e busca na página pública)."""
    base_where = "is_active = TRUE AND publicado = TRUE"
    params: list = []
    search_clause = ""
    if q and q.strip():
        search_clause = " AND (titulo ILIKE %s OR COALESCE(descricao, '') ILIKE %s)"
        pattern = f"%{q.strip()}%"
        params.extend([pattern, pattern])

    where_sql = base_where + search_clause

    async with conn.cursor() as cur:
        await cur.execute(
            f"SELECT COUNT(*)::int AS c FROM boletins WHERE {where_sql}",
            tuple(params),
        )
        count_row = await cur.fetchone()
        total = int(count_row["c"]) if count_row else 0

        await cur.execute(
            f"""
            SELECT * FROM boletins
            WHERE {where_sql}
            ORDER BY data_boletim DESC, created_at DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params + [limit, skip]),
        )
        rows = await cur.fetchall()
    return BoletinsPublicPageResponse(items=rows, total=total)


@router.get("/manage", response_model=List[BoletimResponse])
async def list_boletins_manage(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista todos os boletins ativos para gestão (inclui rascunhos)."""
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT * FROM boletins
            WHERE is_active = TRUE
            ORDER BY data_boletim DESC, created_at DESC
            """
        )
        rows = await cur.fetchall()
    return rows


@router.post("", response_model=BoletimResponse, status_code=status.HTTP_201_CREATED)
async def create_boletim(
    data: BoletimCreate,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    _require_admin(current_user)
    tipo = _validate_tipo(data.tipo)
    user_id = current_user.get("id")
    bid = uuid_lib.uuid4()
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO boletins (
                id, titulo, descricao, documento_url, documento_bytes,
                data_boletim, tipo, publicado, author_id, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            RETURNING *
            """,
            (
                bid,
                data.titulo.strip(),
                (data.descricao or "").strip() or None,
                data.documento_url.strip(),
                data.documento_bytes,
                data.data_boletim,
                tipo,
                data.publicado,
                user_id,
            ),
        )
        row = await cur.fetchone()
    await conn.commit()
    return row


@router.put("/{boletim_id}", response_model=BoletimResponse)
async def update_boletim(
    boletim_id: UUID,
    data: BoletimUpdate,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    _require_admin(current_user)
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="Nenhum dado para atualizar")
    if "tipo" in payload and payload["tipo"] is not None:
        payload["tipo"] = _validate_tipo(payload["tipo"])
    if "titulo" in payload and payload["titulo"] is not None:
        payload["titulo"] = payload["titulo"].strip()
    if "descricao" in payload and payload["descricao"] is not None:
        d = payload["descricao"].strip()
        payload["descricao"] = d or None
    if "documento_url" in payload and payload["documento_url"] is not None:
        payload["documento_url"] = payload["documento_url"].strip()

    set_parts = [f"{k} = %s" for k in payload]
    params = list(payload.values())
    params.append(str(boletim_id))
    query = f"UPDATE boletins SET {', '.join(set_parts)}, updated_at = NOW() WHERE id = %s AND is_active = TRUE RETURNING *"

    async with conn.cursor() as cur:
        await cur.execute(query, tuple(params))
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Boletim não encontrado")
    await conn.commit()
    return row


@router.delete("/{boletim_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_boletim(
    boletim_id: UUID,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE boletins SET is_active = FALSE, updated_at = NOW() WHERE id = %s AND is_active = TRUE",
            (str(boletim_id),),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Boletim não encontrado")
    await conn.commit()
    return None
