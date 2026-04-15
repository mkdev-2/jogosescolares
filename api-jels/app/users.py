"""
Roteador de usuários: CRUD de usuários com permissões por nível.

SUPER_ADMIN: cria usuários de qualquer cargo
ADMIN: só pode criar ADMIN, DIRETOR e MESARIO
DIRETOR: só pode criar COORDENADOR (máx 3 usuários por escola)
COORDENADOR e MESARIO: não criam usuários
DIRETOR e COORDENADOR: só veem usuários da própria escola

Coordenadores multi-escola:
- escola_id fica NULL em users; vínculos ficam em coordenadores_escolas
- DIRETOR pode vincular um coordenador já existente (mesmo CPF de outra escola)
- DELETE desvincula o coordenador da escola; deleta o user só se não houver mais vínculos
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

MAX_USERS_PER_ESCOLA = 3  # 1 DIRETOR + 2 COORDENADORs


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


async def _check_user_visible(
    current_user: dict,
    target: dict,
    conn: psycopg.AsyncConnection,
) -> None:
    """
    Levanta 404 se o usuário logado não pode ver o usuário alvo.
    DIRETOR/COORDENADOR só veem usuários da própria escola.
    Para coordenadores, usa coordenadores_escolas (não users.escola_id).
    """
    role = current_user.get("role")
    escola_id = current_user.get("escola_id")

    if role not in ("DIRETOR", "COORDENADOR") or escola_id is None:
        return  # SUPER_ADMIN/ADMIN veem todos

    target_role = target.get("role")
    target_id = target.get("id")

    if target_role == "COORDENADOR":
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT 1 FROM coordenadores_escolas
                WHERE user_id = %s AND escola_id = %s AND ativo = TRUE
                """,
                (target_id, escola_id),
            )
            if not await cur.fetchone():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    elif target_role == "DIRETOR":
        if target.get("escola_id") != escola_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    else:
        # MESARIO etc. — DIRETOR/COORDENADOR não gerenciam outros roles
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")


@router.get("", response_model=list[UserResponse])
async def list_users(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista usuários.
    SUPER_ADMIN/ADMIN: todos.
    DIRETOR/COORDENADOR: apenas os usuários da própria escola
    (o DIRETOR da escola + COORDENADORs vinculados via coordenadores_escolas).
    """
    require_users_access(current_user)
    role = current_user.get("role")
    escola_id = current_user.get("escola_id")

    async with conn.cursor() as cur:
        if role in ("DIRETOR", "COORDENADOR") and escola_id is not None:
            await cur.execute(
                """
                SELECT u.id, u.cpf, u.email, u.nome, u.role,
                       u.escola_id, u.status, u.created_at
                FROM users u
                WHERE u.escola_id = %s

                UNION ALL

                SELECT u.id, u.cpf, u.email, u.nome, u.role,
                       ce.escola_id, u.status, u.created_at
                FROM users u
                JOIN coordenadores_escolas ce ON u.id = ce.user_id
                WHERE ce.escola_id = %s AND ce.ativo = TRUE AND u.role = 'COORDENADOR'

                ORDER BY nome
                """,
                (escola_id, escola_id),
            )
        else:
            await cur.execute(
                "SELECT id, cpf, email, nome, role, escola_id, status, created_at FROM users ORDER BY nome"
            )
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/check-cpf")
async def check_cpf(
    cpf: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Verifica se um CPF já existe como COORDENADOR no sistema.
    Usado pelo DIRETOR ao preencher o formulário de novo coordenador para
    exibir um aviso informativo antes de confirmar o cadastro.

    Retorna:
    - { exists: false } se o CPF não pertence a nenhum coordenador
    - { exists: true, nome, cpf, escolas: [{id, nome_escola}] } se existir
    """
    if current_user.get("role") not in {"DIRETOR", "SUPER_ADMIN", "ADMIN"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado.")

    cpf_clean = "".join(filter(str.isdigit, cpf))
    if len(cpf_clean) != 11:
        return {"exists": False}

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT u.id, u.nome, u.cpf
            FROM users u
            WHERE u.cpf = %s AND u.role = 'COORDENADOR'
            """,
            (cpf_clean,),
        )
        user_row = await cur.fetchone()

    if not user_row:
        return {"exists": False}

    # Buscar todas as escolas vinculadas a este coordenador
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.nome_escola
            FROM escolas e
            JOIN coordenadores_escolas ce ON e.id = ce.escola_id
            WHERE ce.user_id = %s AND ce.ativo = TRUE
            ORDER BY e.nome_escola
            """,
            (user_row["id"],),
        )
        escola_rows = await cur.fetchall()

    return {
        "exists": True,
        "nome": user_row["nome"],
        "cpf": user_row["cpf"],
        "escolas": [{"id": r["id"], "nome_escola": r["nome_escola"]} for r in escola_rows],
    }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtém usuário por ID. DIRETOR/COORDENADOR só veem usuários da própria escola."""
    require_users_access(current_user)

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, cpf, email, nome, role, escola_id, status, created_at FROM users WHERE id = %s",
            (user_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    await _check_user_visible(current_user, dict(row), conn)

    # Para coordenadores retornados no contexto de uma escola, ajustar escola_id
    result = _row_to_response(dict(row))
    if row["role"] == "COORDENADOR" and result["escola_id"] is None:
        result["escola_id"] = current_user.get("escola_id")

    return result


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Cria novo usuário conforme permissões do nível do usuário logado.

    Fluxo do DIRETOR (cria COORDENADOR):
    - Se o CPF já existir como COORDENADOR → vincula à escola do DIRETOR (sem criar novo usuário)
    - Se o CPF não existir → cria usuário + vincula à escola
    - Se o CPF existir com outro role → erro
    """
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

    # ── Fluxo DIRETOR criando COORDENADOR ──────────────────────────────────
    if role == "DIRETOR":
        if escola_id is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Diretor deve estar vinculado a uma escola.")

        # Contar coordenadores ativos nesta escola (limite = MAX - 1, pois o DIRETOR ocupa 1 vaga)
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT COUNT(*) FROM coordenadores_escolas WHERE escola_id = %s AND ativo = TRUE",
                (escola_id,),
            )
            coord_count = (await cur.fetchone())[0]

        max_coords = MAX_USERS_PER_ESCOLA - 1  # 2
        if coord_count >= max_coords:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Limite atingido: a escola já possui {coord_count} coordenador(es). O máximo é {max_coords}.",
            )

        # Verificar se o CPF já existe no sistema
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, role, nome, cpf, email, status, created_at FROM users WHERE cpf = %s",
                (cpf_clean,),
            )
            existing = await cur.fetchone()

        if existing:
            existing = dict(existing)
            if existing["role"] != "COORDENADOR":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CPF pertence a um usuário de outro perfil e não pode ser vinculado como coordenador.",
                )

            # Verificar se já está vinculado a esta escola
            async with conn.cursor() as cur:
                await cur.execute(
                    "SELECT id, ativo FROM coordenadores_escolas WHERE user_id = %s AND escola_id = %s",
                    (existing["id"], escola_id),
                )
                link = await cur.fetchone()

            if link:
                if link["ativo"]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Este coordenador já está vinculado à sua escola.",
                    )
                # Reativar vínculo desativado
                async with conn.cursor() as cur:
                    await cur.execute(
                        "UPDATE coordenadores_escolas SET ativo = TRUE WHERE user_id = %s AND escola_id = %s",
                        (existing["id"], escola_id),
                    )
                    await conn.commit()
            else:
                async with conn.cursor() as cur:
                    await cur.execute(
                        "INSERT INTO coordenadores_escolas (user_id, escola_id) VALUES (%s, %s)",
                        (existing["id"], escola_id),
                    )
                    await conn.commit()

            await log_audit(
                conn=conn,
                user_id=current_user["id"],
                acao="CREATE",
                tipo_recurso="USUARIO",
                recurso_id=existing["id"],
                detalhes_depois={"acao": "vinculo_escola", "escola_id": escola_id},
                mensagem=f"Usuário {current_user['nome']} vinculou o Coordenador {existing['nome']} à escola {escola_id}.",
            )

            existing["escola_id"] = escola_id
            return _row_to_response(existing)

        # CPF não existe → criar novo coordenador
        if not data.password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Senha é obrigatória para criar um novo coordenador.",
            )
        hashed_password = get_password_hash(data.password)

        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO users (cpf, email, password_hash, nome, role, escola_id, status)
                VALUES (%s, %s, %s, %s, 'COORDENADOR', NULL, %s)
                RETURNING id, cpf, email, nome, role, escola_id, status, created_at
                """,
                (cpf_clean, data.email or None, hashed_password, data.nome.strip(), data.status),
            )
            row_db = await cur.fetchone()
            row_dict = dict(row_db)

            await cur.execute(
                "INSERT INTO coordenadores_escolas (user_id, escola_id) VALUES (%s, %s)",
                (row_dict["id"], escola_id),
            )
            await conn.commit()

            await log_audit(
                conn=conn,
                user_id=current_user["id"],
                acao="CREATE",
                tipo_recurso="USUARIO",
                recurso_id=row_dict["id"],
                detalhes_depois={k: v for k, v in row_dict.items() if k != "password_hash"},
                mensagem=f"Usuário {current_user['nome']} criou o Coordenador {row_dict['nome']}.",
            )

        row_dict["escola_id"] = escola_id
        return _row_to_response(row_dict)

    # ── Fluxo SUPER_ADMIN / ADMIN ───────────────────────────────────────────
    data_escola_id = data.escola_id if data.role in ("DIRETOR", "COORDENADOR") else None

    if not data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha é obrigatória para criar um novo usuário.",
        )
    hashed_password = get_password_hash(data.password)

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM users WHERE cpf = %s", (cpf_clean,))
        if await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF já cadastrado")

        # Coordenadores: escola_id fica NULL na tabela users
        db_escola_id = None if data.role == "COORDENADOR" else data_escola_id

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
                db_escola_id,
                data.status,
            ),
        )
        row_db = await cur.fetchone()
        row_dict = dict(row_db)

        # Se for COORDENADOR com escola_id informado, criar vínculo na junction table
        if data.role == "COORDENADOR" and data_escola_id:
            await cur.execute(
                "INSERT INTO coordenadores_escolas (user_id, escola_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (row_dict["id"], data_escola_id),
            )
            row_dict["escola_id"] = data_escola_id

        await conn.commit()

        await log_audit(
            conn=conn,
            user_id=current_user["id"],
            acao="CREATE",
            tipo_recurso="USUARIO",
            recurso_id=row_dict["id"],
            detalhes_depois={k: v for k, v in row_dict.items() if k != "password_hash"},
            mensagem=f"Usuário {current_user['nome']} criou o Usuário {row_dict['nome']} ({row_dict['role']}).",
        )

    return _row_to_response(row_dict)


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
            "SELECT id, cpf, email, nome, role, escola_id, status, password_hash, created_at FROM users WHERE id = %s",
            (user_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    existing_dict = dict(existing)
    await _check_user_visible(current_user, existing_dict, conn)

    # DIRETOR/COORDENADOR não podem alterar role nem escola_id
    role = current_user.get("role")
    if role in ("DIRETOR", "COORDENADOR"):
        if data.role is not None and data.role != existing_dict.get("role"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Você não pode alterar o perfil de usuários.")
        if data.escola_id is not None:
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
    # escola_id para COORDENADOR é gerida via coordenadores_escolas — ignorar aqui
    if data.escola_id is not None and existing_dict.get("role") != "COORDENADOR":
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
        result = _row_to_response(existing_dict)
        if existing_dict["role"] == "COORDENADOR" and result["escola_id"] is None:
            result["escola_id"] = current_user.get("escola_id")
        return result

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
                detalhes_antes={k: v for k, v in existing_dict.items() if k != "password_hash"},
                detalhes_depois={k: v for k, v in dict(row).items() if k != "password_hash"},
                mensagem=f"Usuário {current_user['nome']} alterou dados do Usuário {row['nome']}.",
            )

    result = _row_to_response(dict(row))
    if row["role"] == "COORDENADOR" and result["escola_id"] is None:
        result["escola_id"] = current_user.get("escola_id")
    return result


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Remove / desvincula usuário.

    Para COORDENADORs:
    - DIRETOR: desvincula o coordenador da sua escola (DELETE em coordenadores_escolas).
      Se o coordenador não tiver mais nenhuma escola vinculada, o usuário é deletado.
    - SUPER_ADMIN/ADMIN: deleta o usuário por completo (cascade limpa coordenadores_escolas).

    Para outros roles: DELETE direto no usuário.
    """
    require_users_access(current_user)
    if current_user["id"] == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir seu próprio usuário",
        )

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, role, escola_id FROM users WHERE id = %s",
            (user_id,),
        )
        target = await cur.fetchone()

    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    target_dict = dict(target)
    await _check_user_visible(current_user, target_dict, conn)

    current_role = current_user.get("role")
    escola_id = current_user.get("escola_id")

    # ── DIRETOR desvinculando COORDENADOR ───────────────────────────────────
    if current_role == "DIRETOR" and target_dict["role"] == "COORDENADOR":
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM coordenadores_escolas WHERE user_id = %s AND escola_id = %s",
                (user_id, escola_id),
            )

            # Verificar se ainda há vínculos restantes
            await cur.execute(
                "SELECT COUNT(*) FROM coordenadores_escolas WHERE user_id = %s",
                (user_id,),
            )
            remaining = (await cur.fetchone())[0]

            if remaining == 0:
                # Sem mais vínculos — remover o usuário
                await cur.execute("DELETE FROM users WHERE id = %s", (user_id,))

            await conn.commit()

            await log_audit(
                conn=conn,
                user_id=current_user["id"],
                acao="DELETE",
                tipo_recurso="USUARIO",
                recurso_id=user_id,
                detalhes_antes=target_dict,
                mensagem=(
                    f"Usuário {current_user['nome']} desvinculou o Coordenador {target_dict['nome']} da escola {escola_id}"
                    + (" e excluiu o usuário (sem mais vínculos)." if remaining == 0 else ".")
                ),
            )
        return

    # ── Demais casos (SUPER_ADMIN/ADMIN deletando qualquer role) ────────────
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
            detalhes_antes=target_dict,
            mensagem=f"Usuário {current_user['nome']} excluiu o Usuário {target_dict['nome']} ({target_dict['role']}).",
        )
