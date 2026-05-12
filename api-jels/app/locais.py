"""
Locais de competição por edição (quadras/ginásios).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
import psycopg

from app.auth import get_current_user
from app.database import get_db
from app.edicao_context import resolve_edicao_id
from app.schemas import LocalCreate, LocalResponse, LocalUpdate

router = APIRouter(prefix="/api/locais", tags=["locais"])

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}


def _require_admin(current_user: dict) -> None:
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem gerenciar locais.",
        )


def _iso(value) -> str | None:
    return value.isoformat() if value else None


def _row_to_response(row: dict) -> LocalResponse:
    return LocalResponse(
        id=row["id"],
        edicao_id=row["edicao_id"],
        nome=row["nome"],
        endereco_completo=row.get("endereco_completo"),
        foto_url=row.get("foto_url"),
        link_maps=row.get("link_maps"),
        created_at=_iso(row.get("created_at")),
        updated_at=_iso(row.get("updated_at")),
    )


async def assert_local_belongs_to_edicao(
    conn: psycopg.AsyncConnection,
    local_id: int | None,
    edicao_id: int,
) -> None:
    """Garante que local_id existe e pertence à edição indicada."""
    if local_id is None:
        return
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, edicao_id FROM locais WHERE id = %s",
            (local_id,),
        )
        row = await cur.fetchone()
    if not row or int(row["edicao_id"]) != int(edicao_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Local inválido ou não pertence à edição do campeonato.",
        )


@router.get("", response_model=list[LocalResponse])
async def list_locais(
    edicao_id: int | None = Query(None, description="Filtra por edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved = await resolve_edicao_id(conn, edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, edicao_id, nome, endereco_completo, foto_url, link_maps, created_at, updated_at
            FROM locais
            WHERE edicao_id = %s
            ORDER BY nome, id
            """,
            (resolved,),
        )
        rows = await cur.fetchall()
    return [_row_to_response(dict(r)) for r in rows]


@router.post("", response_model=LocalResponse, status_code=status.HTTP_201_CREATED)
async def create_local(
    data: LocalCreate,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved = await resolve_edicao_id(conn, edicao_id)
    nome = data.nome.strip()
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO locais (edicao_id, nome, endereco_completo, foto_url, link_maps)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, edicao_id, nome, endereco_completo, foto_url, link_maps, created_at, updated_at
            """,
            (resolved, nome, data.endereco_completo, data.foto_url, data.link_maps),
        )
        row = await cur.fetchone()
        await conn.commit()
    return _row_to_response(dict(row))


@router.patch("/{local_id}", response_model=LocalResponse)
async def update_local(
    local_id: int,
    data: LocalUpdate,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved = await resolve_edicao_id(conn, edicao_id)
    payload = data.model_dump(exclude_unset=True)
    if "nome" in payload and payload["nome"] is not None:
        payload["nome"] = str(payload["nome"]).strip()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum campo para atualizar.")
    sets = [f"{k} = %s" for k in payload]
    params = list(payload.values()) + [local_id, resolved]
    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            UPDATE locais
            SET {", ".join(sets)}, updated_at = NOW()
            WHERE id = %s AND edicao_id = %s
            RETURNING id, edicao_id, nome, endereco_completo, foto_url, link_maps, created_at, updated_at
            """,
            tuple(params),
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local não encontrado.")
        await conn.commit()
    return _row_to_response(dict(row))


@router.delete("/{local_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_local(
    local_id: int,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved = await resolve_edicao_id(conn, edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM locais WHERE id = %s AND edicao_id = %s RETURNING id",
            (local_id, resolved),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Local não encontrado.")
        await conn.commit()
