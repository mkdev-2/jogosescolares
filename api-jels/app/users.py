"""
Roteador de usuários: CRUD de usuários (apenas SUPER_ADMIN e ADMIN).
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import UserCreate, UserUpdate, UserResponse
from app.auth import get_current_user
from app.security import get_password_hash
from app.database import get_db

router = APIRouter(prefix="/api/users", tags=["users"])
logger = logging.getLogger(__name__)

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}


def require_admin(current_user: dict) -> dict:
    """Garante que o usuário é SUPER_ADMIN ou ADMIN."""
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem gerenciar usuários.",
        )
    return current_user


def _row_to_response(row: dict) -> dict:
    """Converte row do banco para resposta (sem senha)."""
    return {
        "id": row["id"],
        "cpf": row.get("cpf"),
        "email": row.get("email"),
        "nome": row["nome"],
        "role": row["role"],
        "escola_id": row.get("escola_id"),
        "status": row.get("status", "ATIVO"),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }


@router.get("", response_model=list[UserResponse])
async def list_users(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista todos os usuários (apenas SUPER_ADMIN/ADMIN)."""
    require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, cpf, email, nome, role, escola_id, status, created_at FROM users ORDER BY nome"
        )
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtém usuário por ID (apenas SUPER_ADMIN/ADMIN)."""
    require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, cpf, email, nome, role, escola_id, status, created_at FROM users WHERE id = %s",
            (user_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return _row_to_response(row)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cria novo usuário (apenas SUPER_ADMIN/ADMIN)."""
    require_admin(current_user)
    cpf_clean = "".join(filter(str.isdigit, data.cpf))
    if len(cpf_clean) != 11:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF deve conter 11 dígitos")

    hashed_password = get_password_hash(data.password)

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM users WHERE cpf = %s", (cpf_clean,))
        if await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF já cadastrado")

        await cur.execute(
            """
            INSERT INTO users (cpf, email, password_hash, nome, role, escola_id, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, cpf, email, nome, role, escola_id, status, created_at
            """,
            (
                cpf_clean,
                data.email or None,
                hashed_password,
                data.nome.strip(),
                data.role,
                data.escola_id if data.role in ("DIRETOR", "COORDENADOR") else None,
                data.status if data.status is not None else "ATIVO",
            ),
        )
        row = await cur.fetchone()
        await conn.commit()

    return _row_to_response(row)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza usuário (apenas SUPER_ADMIN/ADMIN)."""
    require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, cpf, email, nome, role, status, password_hash FROM users WHERE id = %s",
            (user_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    updates = []
    values = []
    if data.nome is not None:
        updates.append("nome = %s")
        values.append(data.nome.strip())
    if data.email is not None:
        updates.append("email = %s")
        values.append(data.email.strip() or None)
    if data.role is not None:
        updates.append("role = %s")
        values.append(data.role)
    if data.escola_id is not None:
        updates.append("escola_id = %s")
        values.append(data.escola_id)
    elif data.role is not None and data.role not in ("DIRETOR", "COORDENADOR"):
        updates.append("escola_id = %s")
        values.append(None)
    if data.status is not None:
        updates.append("status = %s")
        values.append(data.status)
    if data.password is not None and data.password.strip():
        updates.append("password_hash = %s")
        values.append(get_password_hash(data.password.strip()))

    if not updates:
        return _row_to_response(existing)

    updates.append("updated_at = NOW()")
    values.append(user_id)

    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            UPDATE users SET {", ".join(updates)}
            WHERE id = %s
            RETURNING id, cpf, email, nome, role, escola_id, status, created_at
            """,
            values,
        )
        row = await cur.fetchone()
        await conn.commit()

    return _row_to_response(row)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove usuário (apenas SUPER_ADMIN/ADMIN). Não permite excluir a si mesmo."""
    require_admin(current_user)
    if current_user["id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir seu próprio usuário",
        )
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        await conn.commit()
