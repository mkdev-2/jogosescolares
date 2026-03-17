"""
Roteador de usuários: CRUD de usuários com permissões por nível.

SUPER_ADMIN: cria usuários de qualquer cargo
ADMIN: só pode criar ADMIN, DIRETOR e MESARIO
DIRETOR: só pode criar COORDENADOR (máx 3 usuários por escola)
COORDENADOR e MESARIO: não criam usuários
DIRETOR e COORDENADOR: só veem usuários da própria escola
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import UserCreate, UserUpdate, UserResponse
from app.auth import get_current_user
from app.security import get_password_hash
from app.database import get_db, log_audit

router = APIRouter(prefix="/api/users", tags=["users"])
logger = logging.getLogger(__name__)

USERS_PAGE_ROLES = {"SUPER_ADMIN", "ADMIN", "DIRETOR", "COORDENADOR"}

# Roles que cada nível pode criar
ALLOWED_CREATE_ROLES = {
    "SUPER_ADMIN": {"SUPER_ADMIN", "ADMIN", "DIRETOR", "COORDENADOR", "MESARIO"},
    "ADMIN": {"ADMIN", "DIRETOR", "MESARIO"},
    "DIRETOR": {"COORDENADOR"},
    "COORDENADOR": set(),
    "MESARIO": set(),
}

MAX_USERS_PER_ESCOLA = 3


def require_users_access(current_user: dict) -> dict:
    """Garante que o usuário pode acessar a página de usuários (não MESARIO)."""
    if current_user.get("role") not in USERS_PAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Mesários não têm acesso à página de usuários.",
        )
    return current_user


def can_create_user(current_user: dict) -> bool:
    """Verifica se o usuário pode criar outros usuários."""
    return len(ALLOWED_CREATE_ROLES.get(current_user.get("role"), set())) > 0


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
    """Lista usuários. SUPER_ADMIN/ADMIN: todos. DIRETOR/COORDENADOR: só da própria escola."""
    require_users_access(current_user)
    role = current_user.get("role")
    escola_id = current_user.get("escola_id")

    async with conn.cursor() as cur:
        if role in ("DIRETOR", "COORDENADOR") and escola_id is not None:
            await cur.execute(
                """SELECT id, cpf, email, nome, role, escola_id, status, created_at
                   FROM users WHERE escola_id = %s ORDER BY nome""",
                (escola_id,),
            )
        else:
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
    """Obtém usuário por ID. DIRETOR/COORDENADOR só veem usuários da própria escola."""
    require_users_access(current_user)
    role = current_user.get("role")
    escola_id = current_user.get("escola_id")

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, cpf, email, nome, role, escola_id, status, created_at FROM users WHERE id = %s",
            (user_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    if role in ("DIRETOR", "COORDENADOR") and escola_id is not None:
        if row.get("escola_id") != escola_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return _row_to_response(row)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cria novo usuário conforme permissões do nível do usuário logado."""
    require_users_access(current_user)
    if not can_create_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Coordenadores e mesários não podem criar usuários.",
        )

    allowed_roles = ALLOWED_CREATE_ROLES.get(current_user.get("role"), set())
    if data.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Você não tem permissão para criar usuários do tipo {data.role}.",
        )

    cpf_clean = "".join(filter(str.isdigit, data.cpf))
    if len(cpf_clean) != 11:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF deve conter 11 dígitos")

    role = current_user.get("role")
    escola_id = current_user.get("escola_id")

    # DIRETOR cria apenas COORDENADOR na própria escola
    if role == "DIRETOR":
        if data.role != "COORDENADOR":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Diretor só pode criar coordenadores.")
        if escola_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Diretor deve estar vinculado a uma escola.")

        data_escola_id = escola_id
        # Verificar limite de 3 usuários por escola
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT COUNT(*) FROM users WHERE escola_id = %s",
                (escola_id,),
            )
            count_row = await cur.fetchone()
        count = count_row[0] if count_row else 0
        if count >= MAX_USERS_PER_ESCOLA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Máximo de {MAX_USERS_PER_ESCOLA} usuários por escola. Sua escola já possui {count} usuários.",
            )
    else:
        data_escola_id = data.escola_id if data.role in ("DIRETOR", "COORDENADOR") else None

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
                data_escola_id,
                data.status,
            ),
        )
        row = await cur.fetchone()
        await conn.commit()

        if row:
            log_data = dict(row)
            await log_audit(
                conn=conn,
                user_id=current_user["id"],
                acao="CREATE",
                tipo_recurso="USUARIO",
                recurso_id=row["id"],
                detalhes_depois={k: v for k, v in log_data.items() if k != 'password_hash'},
                mensagem=f"Usuário {current_user['nome']} criou o Usuário {row['nome']} ({row['role']}).",
            )

    return _row_to_response(row)


def _check_user_visible(current_user: dict, target_escola_id) -> None:
    """Levanta 404 se o usuário logado não pode ver o usuário alvo."""
    role = current_user.get("role")
    escola_id = current_user.get("escola_id")
    if role in ("DIRETOR", "COORDENADOR") and escola_id is not None:
        if target_escola_id != escola_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza usuário. DIRETOR/COORDENADOR só podem atualizar usuários da própria escola."""
    require_users_access(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, cpf, email, nome, role, escola_id, status, password_hash FROM users WHERE id = %s",
            (user_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    _check_user_visible(current_user, existing.get("escola_id"))

    # DIRETOR/COORDENADOR não podem alterar role nem escola_id
    role = current_user.get("role")
    if role in ("DIRETOR", "COORDENADOR"):
        if data.role is not None and data.role != existing.get("role"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não pode alterar o perfil de usuários.")
        if data.escola_id is not None and data.escola_id != existing.get("escola_id"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não pode alterar a escola do usuário.")

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

        if row:
            await log_audit(
                conn=conn,
                user_id=current_user["id"],
                acao="UPDATE",
                tipo_recurso="USUARIO",
                recurso_id=user_id,
                detalhes_antes={k: v for k, v in dict(existing).items() if k != 'password_hash'},
                detalhes_depois={k: v for k, v in dict(row).items() if k != 'password_hash'},
                mensagem=f"Usuário {current_user['nome']} alterou dados do Usuário {row['nome']}.",
            )

    return _row_to_response(row)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove usuário. DIRETOR/COORDENADOR só podem excluir usuários da própria escola. Não permite excluir a si mesmo."""
    require_users_access(current_user)
    if current_user["id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir seu próprio usuário",
        )
    async with conn.cursor() as cur:
        await cur.execute("SELECT id, nome, role, escola_id FROM users WHERE id = %s", (user_id,))
        target = await cur.fetchone()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    _check_user_visible(current_user, target.get("escola_id"))

    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM users WHERE id = %s RETURNING id", (user_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        await conn.commit()

        await log_audit(
            conn=conn,
            user_id=current_user["id"],
            acao="DELETE",
            tipo_recurso="USUARIO",
            recurso_id=user_id,
            detalhes_antes=dict(target),
            mensagem=f"Usuário {current_user['nome']} excluiu o Usuário {target['nome']} ({target['role']}).",
        )
