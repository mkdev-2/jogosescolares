"""
Roteador de esportes: CRUD de esportes (Futebol, Judô, Voleibol, etc.).
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import EsporteCreate, EsporteUpdate, EsporteResponse
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/esportes", tags=["esportes"])
logger = logging.getLogger(__name__)


def _row_to_response(row: dict) -> EsporteResponse:
    """Converte row do banco para EsporteResponse."""
    return EsporteResponse(
        id=str(row["id"]),
        nome=row["nome"],
        descricao=row.get("descricao") or "",
        icone=row.get("icone") or "Zap",
        requisitos=row.get("requisitos") or "",
        limite_atletas=row.get("limite_atletas", 3),
        ativa=row.get("ativa", True),
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


@router.get("", response_model=list[EsporteResponse])
async def list_esportes(
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista todos os esportes."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, nome, descricao, icone, requisitos, limite_atletas, ativa, created_at, updated_at
            FROM esportes
            ORDER BY nome
            """
        )
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/{esporte_id}", response_model=EsporteResponse)
async def get_esporte(
    esporte_id: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Obtém esporte por ID."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, nome, descricao, icone, requisitos, limite_atletas, ativa, created_at, updated_at
            FROM esportes
            WHERE id = %s
            """,
            (esporte_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esporte não encontrado")
    return _row_to_response(row)


@router.post("", response_model=EsporteResponse, status_code=status.HTTP_201_CREATED)
async def create_esporte(
    data: EsporteCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cria novo esporte (requer autenticação)."""
    limite_atletas = data.limite_atletas if data.limite_atletas is not None else 3
    icone = (data.icone or "Zap").strip() or "Zap"

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO esportes (nome, descricao, icone, requisitos, limite_atletas, ativa)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, nome, descricao, icone, requisitos, limite_atletas, ativa, created_at, updated_at
            """,
            (
                data.nome.strip(),
                (data.descricao or "").strip(),
                icone,
                (data.requisitos or "").strip(),
                limite_atletas,
                data.ativa if data.ativa is not None else True,
            ),
        )
        row = await cur.fetchone()
        await conn.commit()

    return _row_to_response(row)


@router.put("/{esporte_id}", response_model=EsporteResponse)
async def update_esporte(
    esporte_id: str,
    data: EsporteUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza esporte (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, descricao, icone, requisitos, limite_atletas, ativa FROM esportes WHERE id = %s",
            (esporte_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esporte não encontrado")

    updates = []
    values = []
    if data.nome is not None:
        updates.append("nome = %s")
        values.append(data.nome.strip())
    if data.descricao is not None:
        updates.append("descricao = %s")
        values.append(data.descricao.strip())
    if data.icone is not None:
        updates.append("icone = %s")
        values.append((data.icone or "Zap").strip() or "Zap")
    if data.requisitos is not None:
        updates.append("requisitos = %s")
        values.append(data.requisitos.strip())
    if data.limite_atletas is not None:
        updates.append("limite_atletas = %s")
        values.append(data.limite_atletas)
    if data.ativa is not None:
        updates.append("ativa = %s")
        values.append(data.ativa)

    if not updates:
        return _row_to_response(existing)

    updates.append("updated_at = NOW()")
    values.append(esporte_id)

    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            UPDATE esportes
            SET {", ".join(updates)}
            WHERE id = %s
            """,
            values,
        )
        await conn.commit()

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, descricao, icone, requisitos, limite_atletas, ativa, created_at, updated_at FROM esportes WHERE id = %s",
            (esporte_id,),
        )
        row = await cur.fetchone()
    return _row_to_response(row)


@router.delete("/{esporte_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_esporte(
    esporte_id: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove esporte (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT COUNT(*) AS cnt FROM esporte_variantes WHERE esporte_id = %s",
            (esporte_id,),
        )
        row = await cur.fetchone()
        count = row["cnt"] if row else 0
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não é possível excluir: existem {count} variante(s) vinculada(s) a este esporte",
        )

    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM esportes WHERE id = %s RETURNING id", (esporte_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esporte não encontrado")
        await conn.commit()
