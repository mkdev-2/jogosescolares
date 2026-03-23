"""
Roteador de edições anuais dos Jogos Escolares.
"""
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.auth import get_current_user
from app.database import get_db
from app.schemas import EdicaoCreate, EdicaoResponse, EdicaoStatusUpdate

router = APIRouter(prefix="/api/edicoes", tags=["edicoes"])

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}


def _require_admin(current_user: dict) -> None:
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem gerenciar edições.",
        )


def _row_to_response(row: dict) -> EdicaoResponse:
    return EdicaoResponse(
        id=row["id"],
        uuid=str(row["uuid"]),
        nome=row["nome"],
        ano=row["ano"],
        status=row["status"],
        data_inicio=row["data_inicio"].isoformat() if row.get("data_inicio") else None,
        data_fim=row["data_fim"].isoformat() if row.get("data_fim") else None,
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


@router.get("", response_model=list[EdicaoResponse])
async def list_edicoes(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, uuid, nome, ano, status, data_inicio, data_fim, created_at, updated_at
            FROM edicoes
            ORDER BY ano DESC, id DESC
            """
        )
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.post("", response_model=EdicaoResponse, status_code=status.HTTP_201_CREATED)
async def create_edicao(
    data: EdicaoCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    async with conn.cursor() as cur:
        if data.status == "ATIVA":
            await cur.execute("UPDATE edicoes SET status = 'ENCERRADA' WHERE status = 'ATIVA'")
        await cur.execute(
            """
            INSERT INTO edicoes (nome, ano, status, data_inicio, data_fim)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, uuid, nome, ano, status, data_inicio, data_fim, created_at, updated_at
            """,
            (data.nome.strip(), data.ano, data.status, data.data_inicio, data.data_fim),
        )
        row = await cur.fetchone()
        await conn.commit()
    return _row_to_response(row)


@router.patch("/{edicao_id}/status", response_model=EdicaoResponse)
async def update_status_edicao(
    edicao_id: int,
    data: EdicaoStatusUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM edicoes WHERE id = %s", (edicao_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edição não encontrada.")

        if data.status == "ATIVA":
            await cur.execute("UPDATE edicoes SET status = 'ENCERRADA' WHERE status = 'ATIVA' AND id <> %s", (edicao_id,))

        await cur.execute(
            """
            UPDATE edicoes
            SET status = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, uuid, nome, ano, status, data_inicio, data_fim, created_at, updated_at
            """,
            (data.status, edicao_id),
        )
        row = await cur.fetchone()
        await conn.commit()
    return _row_to_response(row)


@router.post("/{edicao_id}/ativar", response_model=EdicaoResponse)
async def ativar_edicao(
    edicao_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await update_status_edicao(
        edicao_id=edicao_id,
        data=EdicaoStatusUpdate(status="ATIVA"),
        conn=conn,
        current_user=current_user,
    )


@router.post("/{edicao_id}/encerrar", response_model=EdicaoResponse)
async def encerrar_edicao(
    edicao_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await update_status_edicao(
        edicao_id=edicao_id,
        data=EdicaoStatusUpdate(status="ENCERRADA"),
        conn=conn,
        current_user=current_user,
    )
