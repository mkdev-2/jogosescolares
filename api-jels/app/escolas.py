"""
Roteador de escolas: CRUD de escolas.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import EscolaCreate, EscolaResponse
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/escolas", tags=["escolas"])
logger = logging.getLogger(__name__)


def _row_to_response(row: dict) -> dict:
    """Converte row do banco para resposta."""
    return {
        "id": row["id"],
        "nome_escola": row["nome_escola"],
        "inep": row["inep"],
        "cnpj": row["cnpj"],
        "endereco": row["endereco"],
        "cidade": row["cidade"],
        "uf": row["uf"],
        "email": row["email"],
        "telefone": row["telefone"],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
    }


@router.get("", response_model=list[EscolaResponse])
async def list_escolas(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista todas as escolas (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, created_at, updated_at "
            "FROM escolas ORDER BY nome_escola"
        )
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/{escola_id}", response_model=EscolaResponse)
async def get_escola(
    escola_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtém escola por ID."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, created_at, updated_at "
            "FROM escolas WHERE id = %s",
            (escola_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escola não encontrada")
    return _row_to_response(row)


@router.post("", response_model=EscolaResponse, status_code=status.HTTP_201_CREATED)
async def create_escola(
    data: EscolaCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cria nova escola (requer autenticação)."""
    inep_clean = "".join(filter(str.isdigit, data.inep))
    cnpj_clean = "".join(filter(str.isdigit, data.cnpj))
    if len(inep_clean) != 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INEP deve conter 8 dígitos")
    if len(cnpj_clean) != 14:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CNPJ deve conter 14 dígitos")

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO escolas (nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, created_at, updated_at
            """,
            (
                data.nome_escola.strip(),
                inep_clean,
                cnpj_clean,
                data.endereco.strip(),
                data.cidade.strip(),
                data.uf.strip().upper(),
                data.email.strip(),
                data.telefone.strip(),
            ),
        )
        row = await cur.fetchone()
        await conn.commit()
    return _row_to_response(row)


@router.post("/publico", response_model=EscolaResponse, status_code=status.HTTP_201_CREATED)
async def create_escola_publico(
    data: EscolaCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Cadastro público de escola (formulário /cadastro). Sem autenticação."""
    inep_clean = "".join(filter(str.isdigit, data.inep))
    cnpj_clean = "".join(filter(str.isdigit, data.cnpj))
    if len(inep_clean) != 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INEP deve conter 8 dígitos")
    if len(cnpj_clean) != 14:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CNPJ deve conter 14 dígitos")

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM escolas WHERE inep = %s OR cnpj = %s", (inep_clean, cnpj_clean))
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Escola já cadastrada com este INEP ou CNPJ",
            )

        await cur.execute(
            """
            INSERT INTO escolas (nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, created_at, updated_at
            """,
            (
                data.nome_escola.strip(),
                inep_clean,
                cnpj_clean,
                data.endereco.strip(),
                data.cidade.strip(),
                data.uf.strip().upper(),
                data.email.strip(),
                data.telefone.strip(),
            ),
        )
        row = await cur.fetchone()
        await conn.commit()
    return _row_to_response(row)
