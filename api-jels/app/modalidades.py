"""
Roteador de modalidades: CRUD de modalidades esportivas.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import ModalidadeCreate, ModalidadeUpdate, ModalidadeResponse
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/modalidades", tags=["modalidades"])
logger = logging.getLogger(__name__)


def _row_to_response(row: dict) -> ModalidadeResponse:
    """Converte row do banco para ModalidadeResponse."""
    return ModalidadeResponse(
        id=str(row["id"]),
        nome=row["nome"],
        descricao=row.get("descricao") or "",
        categoria_id=str(row.get("categoria_id") or ""),
        categoria=row.get("categoria_nome"),
        icone=row.get("icone") or "Zap",
        requisitos=row.get("requisitos") or "",
        limite_atletas=row.get("limite_atletas", 3),
        ativa=row.get("ativa", True),
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


@router.get("", response_model=list[ModalidadeResponse])
async def list_modalidades(
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista todas as modalidades."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT m.id, m.nome, m.descricao, m.categoria_id, c.nome AS categoria_nome,
                   m.icone, m.requisitos, m.limite_atletas, m.ativa, m.created_at, m.updated_at
            FROM modalidades m
            LEFT JOIN categorias c ON c.id = m.categoria_id
            ORDER BY m.nome
            """
        )
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/{modalidade_id}", response_model=ModalidadeResponse)
async def get_modalidade(
    modalidade_id: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Obtém modalidade por ID."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT m.id, m.nome, m.descricao, m.categoria_id, c.nome AS categoria_nome,
                   m.icone, m.requisitos, m.limite_atletas, m.ativa, m.created_at, m.updated_at
            FROM modalidades m
            LEFT JOIN categorias c ON c.id = m.categoria_id
            WHERE m.id = %s
            """,
            (modalidade_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modalidade não encontrada")
    return _row_to_response(row)


@router.post("", response_model=ModalidadeResponse, status_code=status.HTTP_201_CREATED)
async def create_modalidade(
    data: ModalidadeCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cria nova modalidade (requer autenticação). ID gerado pelo banco como UUID."""
    categoria_id = (data.categoria_id or "").strip()
    if not categoria_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="categoria_id é obrigatório",
        )

    limite_atletas = data.limite_atletas if data.limite_atletas is not None else 3
    icone = (data.icone or "Zap").strip() or "Zap"

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM categorias WHERE id = %s", (categoria_id,))
        if not await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categoria não encontrada",
            )

        await cur.execute(
            """
            INSERT INTO modalidades (nome, descricao, categoria_id, icone, requisitos, limite_atletas, ativa)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nome, descricao, categoria_id, icone, requisitos, limite_atletas, ativa, created_at, updated_at
            """,
            (
                data.nome.strip(),
                (data.descricao or "").strip(),
                categoria_id,
                icone,
                (data.requisitos or "").strip(),
                limite_atletas,
                data.ativa if data.ativa is not None else True,
            ),
        )
        row = await cur.fetchone()
        await conn.commit()

    # Buscar com JOIN para retornar categoria_nome
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT m.id, m.nome, m.descricao, m.categoria_id, c.nome AS categoria_nome,
                   m.icone, m.requisitos, m.limite_atletas, m.ativa, m.created_at, m.updated_at
            FROM modalidades m
            LEFT JOIN categorias c ON c.id = m.categoria_id
            WHERE m.id = %s
            """,
            (str(row["id"]),),
        )
        row = await cur.fetchone()
    return _row_to_response(row)


@router.put("/{modalidade_id}", response_model=ModalidadeResponse)
async def update_modalidade(
    modalidade_id: str,
    data: ModalidadeUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza modalidade (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT m.id, m.nome, m.descricao, m.categoria_id, c.nome AS categoria_nome,
                   m.icone, m.requisitos, m.limite_atletas, m.ativa
            FROM modalidades m
            LEFT JOIN categorias c ON c.id = m.categoria_id
            WHERE m.id = %s
            """,
            (modalidade_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modalidade não encontrada")

    updates = []
    values = []
    if data.nome is not None:
        updates.append("nome = %s")
        values.append(data.nome.strip())
    if data.descricao is not None:
        updates.append("descricao = %s")
        values.append(data.descricao.strip())
    if data.categoria_id is not None:
        cat_id = str(data.categoria_id).strip()
        if cat_id:
            async with conn.cursor() as cur:
                await cur.execute("SELECT id FROM categorias WHERE id = %s", (cat_id,))
                if not await cur.fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Categoria não encontrada",
                    )
            updates.append("categoria_id = %s")
            values.append(cat_id)
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
    values.append(modalidade_id)

    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            UPDATE modalidades
            SET {", ".join(updates)}
            WHERE id = %s
            """,
            values,
        )
        await conn.commit()

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT m.id, m.nome, m.descricao, m.categoria_id, c.nome AS categoria_nome,
                   m.icone, m.requisitos, m.limite_atletas, m.ativa, m.created_at, m.updated_at
            FROM modalidades m
            LEFT JOIN categorias c ON c.id = m.categoria_id
            WHERE m.id = %s
            """,
            (modalidade_id,),
        )
        row = await cur.fetchone()
    return _row_to_response(row)


@router.delete("/{modalidade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_modalidade(
    modalidade_id: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove modalidade (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM modalidades WHERE id = %s RETURNING id", (modalidade_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modalidade não encontrada")
        await conn.commit()
