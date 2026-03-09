"""
Roteador de professores-técnicos: listagem e criação por escola do usuário.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import ProfessorTecnicoCreate, ProfessorTecnicoUpdate, ProfessorTecnicoResponse
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
                       s.nome_escola AS escola_nome
                FROM professores_tecnicos p
                LEFT JOIN escolas s ON s.id = p.escola_id
                ORDER BY s.nome_escola NULLS LAST, p.nome
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
                       s.nome_escola AS escola_nome
                FROM professores_tecnicos p
                LEFT JOIN escolas s ON s.id = p.escola_id
                WHERE p.escola_id = %s
                ORDER BY p.nome
                """,
                (escola_id,),
            )
            rows = await cur.fetchall()
    return [_row_to_response(dict(r)) for r in rows]


def _check_professor_visible(current_user: dict, escola_id: int | None) -> None:
    """Verifica se o usuário pode acessar o professor (mesma escola ou admin)."""
    if is_admin(current_user):
        return
    user_escola = current_user.get("escola_id")
    if user_escola is None or escola_id != user_escola:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado a este registro.",
        )


@router.get("/{professor_id}", response_model=ProfessorTecnicoResponse)
async def get_professor_tecnico(
    professor_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtém professor-técnico por ID."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT p.id, p.escola_id, p.nome, p.cpf, p.cref, p.created_at, p.updated_at,
                   s.nome_escola AS escola_nome
            FROM professores_tecnicos p
            LEFT JOIN escolas s ON s.id = p.escola_id
            WHERE p.id = %s
            """,
            (professor_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor-técnico não encontrado")
    _check_professor_visible(current_user, row["escola_id"])
    return _row_to_response(dict(row))


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


@router.put("/{professor_id}", response_model=ProfessorTecnicoResponse)
async def update_professor_tecnico(
    professor_id: int,
    data: ProfessorTecnicoUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Atualiza professor-técnico. Apenas da mesma escola."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, escola_id FROM professores_tecnicos WHERE id = %s",
            (professor_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor-técnico não encontrado")
    _check_professor_visible(current_user, existing["escola_id"])

    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT p.id, p.escola_id, p.nome, p.cpf, p.cref, p.created_at, p.updated_at,
                       s.nome_escola AS escola_nome
                FROM professores_tecnicos p
                LEFT JOIN escolas s ON s.id = p.escola_id
                WHERE p.id = %s
                """,
                (professor_id,),
            )
            row = await cur.fetchone()
        return _row_to_response(dict(row))

    if "cpf" in updates:
        cpf_clean = "".join(filter(str.isdigit, str(updates["cpf"])))
        if len(cpf_clean) != 11:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF deve conter 11 dígitos")
        updates["cpf"] = cpf_clean

    set_parts = []
    vals = []
    for k in ["nome", "cpf", "cref"]:
        if k in updates:
            set_parts.append(f"{k} = %s")
            vals.append(updates[k].strip() if isinstance(updates[k], str) else updates[k])
    if set_parts:
        set_parts.append("updated_at = NOW()")
        vals.append(professor_id)
        async with conn.cursor() as cur:
            await cur.execute(
                f"UPDATE professores_tecnicos SET {', '.join(set_parts)} WHERE id = %s",
                vals,
            )
            await conn.commit()

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT p.id, p.escola_id, p.nome, p.cpf, p.cref, p.created_at, p.updated_at,
                   s.nome_escola AS escola_nome
            FROM professores_tecnicos p
            LEFT JOIN escolas s ON s.id = p.escola_id
            WHERE p.id = %s
            """,
            (professor_id,),
        )
        row = await cur.fetchone()
    return _row_to_response(dict(row))


@router.delete("/{professor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_professor_tecnico(
    professor_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove professor-técnico. Apenas da mesma escola."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, escola_id FROM professores_tecnicos WHERE id = %s",
            (professor_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor-técnico não encontrado")
    _check_professor_visible(current_user, existing["escola_id"])

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT COUNT(*) AS cnt FROM equipes WHERE professor_tecnico_id = %s",
            (professor_id,),
        )
        r = await cur.fetchone()
        if r and r["cnt"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível excluir: o professor está vinculado a uma ou mais equipes.",
            )
        await cur.execute("DELETE FROM professores_tecnicos WHERE id = %s RETURNING id", (professor_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor-técnico não encontrado")
        await conn.commit()
