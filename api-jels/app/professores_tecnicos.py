"""
Roteador de professores-técnicos: listagem e criação por escola do usuário.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import ProfessorTecnicoCreate, ProfessorTecnicoResponse
from app.auth import get_current_user, get_current_user_with_escola, is_admin
from app.database import get_db

router = APIRouter(prefix="/professores-tecnicos", tags=["professores-tecnicos"])
logger = logging.getLogger(__name__)


def _row_to_response(row: dict) -> ProfessorTecnicoResponse:
    """Converte row do banco para ProfessorTecnicoResponse."""
    return ProfessorTecnicoResponse(
        id=row["id"],
        escola_id=row["escola_id"],
        escola_nome=row.get("escola_nome"),
        nome=row["nome"],
        cpf=row.get("cpf", ""),
        cref=row["cref"],
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


@router.get("", response_model=list[ProfessorTecnicoResponse])
async def list_professores_tecnicos(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista professores-técnicos: admin vê todos; diretor/coordenador vê apenas da sua escola."""
    if is_admin(current_user):
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT p.id, p.escola_id, p.nome, p.cpf, p.cref, p.created_at, p.updated_at,
                       s.nome AS escola_nome
                FROM professores_tecnicos p
                LEFT JOIN escolas s ON s.id = p.escola_id
                ORDER BY s.nome NULLS LAST, p.nome
                """,
            )
            rows = await cur.fetchall()
    else:
        escola_id = current_user.get("escola_id")
        if escola_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito a usuários vinculados a uma escola (diretor/coordenador).",
            )
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT p.id, p.escola_id, p.nome, p.cpf, p.cref, p.created_at, p.updated_at,
                       s.nome AS escola_nome
                FROM professores_tecnicos p
                LEFT JOIN escolas s ON s.id = p.escola_id
                WHERE p.escola_id = %s
                ORDER BY p.nome
                """,
                (escola_id,),
            )
            rows = await cur.fetchall()
    return [_row_to_response(dict(r)) for r in rows]


@router.post("", response_model=ProfessorTecnicoResponse, status_code=status.HTTP_201_CREATED)
async def create_professor_tecnico(
    data: ProfessorTecnicoCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Cria professor-técnico na escola do usuário logado. escola_id é herdado do token."""
    escola_id = current_user["escola_id"]
    cpf_clean = "".join(filter(str.isdigit, data.cpf))
    if len(cpf_clean) != 11:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF deve conter 11 dígitos")

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO professores_tecnicos (escola_id, nome, cpf, cref)
            VALUES (%s, %s, %s, %s)
            RETURNING id, escola_id, nome, cpf, cref, created_at, updated_at
            """,
            (escola_id, data.nome.strip(), cpf_clean, data.cref.strip()),
        )
        row = await cur.fetchone()
        await conn.commit()

    if not row:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao criar professor-técnico")
    return _row_to_response(dict(row))
