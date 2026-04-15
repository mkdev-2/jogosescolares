"""
Roteador de autenticação: endpoints /login, /register, /refresh e /me.
Single-tenant: sem validação de subdomínio.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import psycopg

from app.schemas import (
    UserCreate, UserLogin, Token, UserResponse, UserMeResponse, UserUpdateMe,
    RefreshTokenRequest, ChangePasswordRequest, EscolaSimples,
    SelectEscolaRequest, SwitchEscolaRequest,
)
from app.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token, get_current_user_id,
)
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger(__name__)

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}

ALLOWED_CREATE_ROLES = {
    "SUPER_ADMIN": ["SUPER_ADMIN", "ADMIN", "DIRETOR", "COORDENADOR", "MESARIO"],
    "ADMIN": ["ADMIN", "DIRETOR", "MESARIO"],
    "DIRETOR": ["COORDENADOR"],
    "COORDENADOR": [],
    "MESARIO": [],
}
MAX_USERS_PER_ESCOLA = 3


def is_admin(user: dict) -> bool:
    """Retorna True se o usuário é SUPER_ADMIN ou ADMIN."""
    return (user or {}).get("role") in ADMIN_ROLES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, conn: psycopg.AsyncConnection = Depends(get_db)):
    """Registro de novo usuário. Associa ao tenant jogosescolares."""
    cpf_clean = "".join(filter(str.isdigit, user_data.cpf))

    if len(cpf_clean) != 11:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF deve conter 11 dígitos")

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM users WHERE cpf = %s", (cpf_clean,))
        if await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF já cadastrado")

    hashed_password = get_password_hash(user_data.password)

    # Coordenadores não têm escola_id na tabela users (gerido por coordenadores_escolas)
    if user_data.role == "COORDENADOR":
        escola_id = None
    elif user_data.role == "DIRETOR":
        escola_id = user_data.escola_id
    else:
        escola_id = None

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO users (cpf, email, password_hash, nome, role, escola_id, status)
            SELECT %s, %s, %s, %s, %s, %s, %s
            RETURNING id, cpf, email, nome, role, escola_id, status, created_at
            """,
            (cpf_clean, user_data.email, hashed_password, user_data.nome, user_data.role, escola_id, user_data.status),
        )
        new_user = await cur.fetchone()

        # Se for coordenador com escola_id informado, vincular via junction table
        if user_data.role == "COORDENADOR" and user_data.escola_id:
            await cur.execute(
                "INSERT INTO coordenadores_escolas (user_id, escola_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (new_user["id"], user_data.escola_id),
            )

        await conn.commit()

    return UserResponse(**new_user)


async def authenticate_user(cpf: str, password: str, conn: psycopg.AsyncConnection) -> dict:
    """Autentica usuário por CPF e senha."""
    cpf_clean = "".join(filter(str.isdigit, cpf))

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, email, password_hash, role, status FROM users WHERE cpf = %s",
            (cpf_clean,),
        )
        user = await cur.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CPF ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.get("status") != "ATIVO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado ou pendente. Entre em contato com o administrador.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="CPF ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def _get_escolas_coordenador(user_id: int, conn: psycopg.AsyncConnection) -> list[dict]:
    """Retorna as escolas ativas vinculadas a um coordenador."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.nome_escola
            FROM escolas e
            JOIN coordenadores_escolas ce ON e.id = ce.escola_id
            WHERE ce.user_id = %s AND ce.ativo = TRUE
            ORDER BY e.nome_escola
            """,
            (user_id,),
        )
        return await cur.fetchall()


def _build_token_data(user: dict, escola_id: Optional[int] = None) -> dict:
    """Monta o payload base do JWT."""
    data = {
        "sub": str(user["id"]),
        "role": user["role"],
        "email": user["email"],
    }
    if escola_id is not None:
        data["escola_id"] = escola_id
    return data


@router.post("/token", response_model=Token)
async def login_for_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """OAuth2 para Swagger UI. Username = CPF."""
    user = await authenticate_user(form_data.username, form_data.password, conn)

    escola_id = None
    if user["role"] == "COORDENADOR":
        escolas = await _get_escolas_coordenador(user["id"], conn)
        if escolas:
            escola_id = escolas[0]["id"]  # Swagger UI: seleciona a primeira automaticamente

    token_data = _build_token_data(user, escola_id)
    return Token(
        access_token=create_access_token(data=token_data),
        refresh_token=create_refresh_token(data=token_data),
        token_type="bearer",
    )


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """
    Login por CPF e senha.

    Para coordenadores vinculados a múltiplas escolas, retorna
    `requires_escola_selection: true` e a lista de escolas disponíveis.
    O cliente deve então chamar POST /auth/select-escola para obter o token completo.
    """
    try:
        user = await authenticate_user(credentials.cpf, credentials.password, conn)

        if user["role"] == "COORDENADOR":
            escolas = await _get_escolas_coordenador(user["id"], conn)

            if not escolas:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Coordenador sem escola vinculada. Entre em contato com o administrador.",
                )

            if len(escolas) == 1:
                # Seleção automática — comportamento idêntico ao de outros roles
                token_data = _build_token_data(user, escolas[0]["id"])
                return Token(
                    access_token=create_access_token(data=token_data),
                    refresh_token=create_refresh_token(data=token_data),
                    token_type="bearer",
                )
            else:
                # Múltiplas escolas — cliente deve selecionar
                return Token(
                    requires_escola_selection=True,
                    escolas=[EscolaSimples(id=e["id"], nome_escola=e["nome_escola"]) for e in escolas],
                )

        # Demais roles: token sem escola_id no payload
        token_data = _build_token_data(user)
        return Token(
            access_token=create_access_token(data=token_data),
            refresh_token=create_refresh_token(data=token_data),
            token_type="bearer",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao processar login: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao processar login.",
        )


@router.post("/select-escola", response_model=Token)
async def select_escola(
    data: SelectEscolaRequest,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """
    Finaliza o login de um coordenador multi-escola selecionando a escola ativa.
    Requer CPF e senha novamente (stateless — sem sessão intermediária).
    """
    user = await authenticate_user(data.cpf, data.password, conn)

    if user["role"] != "COORDENADOR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este endpoint é exclusivo para coordenadores.",
        )

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT 1 FROM coordenadores_escolas
            WHERE user_id = %s AND escola_id = %s AND ativo = TRUE
            """,
            (user["id"], data.escola_id),
        )
        if not await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Coordenador não vinculado a esta escola.",
            )

    token_data = _build_token_data(user, data.escola_id)
    return Token(
        access_token=create_access_token(data=token_data),
        refresh_token=create_refresh_token(data=token_data),
        token_type="bearer",
    )


@router.post("/switch-escola", response_model=Token)
async def switch_escola(
    data: SwitchEscolaRequest,
    request: Request,
    conn: psycopg.AsyncConnection = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
):
    """
    Troca a escola ativa do coordenador sem exigir nova autenticação.
    O token atual deve ser válido e o coordenador deve estar vinculado à escola destino.
    """
    # Resolver o usuário manualmente para evitar dependência circular
    actual_token = token
    if not actual_token:
        auth_header = request.headers.get("Authorization") if request else None
        if auth_header and auth_header.startswith("Bearer "):
            actual_token = auth_header.split("Bearer ")[1]

    if not actual_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token não fornecido")

    payload = decode_token(actual_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    user_id = get_current_user_id(actual_token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, email, role, status FROM users WHERE id = %s",
            (user_id,),
        )
        user = await cur.fetchone()

    if not user or user.get("status") != "ATIVO":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado ou desativado")

    if user["role"] != "COORDENADOR":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Troca de escola é exclusiva para coordenadores.",
        )

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT 1 FROM coordenadores_escolas
            WHERE user_id = %s AND escola_id = %s AND ativo = TRUE
            """,
            (user["id"], data.escola_id),
        )
        if not await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Coordenador não vinculado a esta escola.",
            )

    token_data = _build_token_data(dict(user), data.escola_id)
    return Token(
        access_token=create_access_token(data=token_data),
        refresh_token=create_refresh_token(data=token_data),
        token_type="bearer",
    )


async def get_current_user(
    request: Request,
    conn: psycopg.AsyncConnection = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> dict:
    """Dependency para obter o usuário autenticado."""
    actual_token = token
    if not actual_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            actual_token = auth_header.split("Bearer ")[1]

    if not actual_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token não fornecido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(actual_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = get_current_user_id(actual_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Para COORDENADORs, escola_id vem do payload do token (não de users.escola_id)
    token_escola_id = payload.get("escola_id")

    async with conn.cursor() as cur:
        if token_escola_id:
            await cur.execute(
                """
                SELECT u.id, u.cpf, u.email, u.nome, u.role, %s::int AS escola_id,
                       u.status, u.created_at, u.foto_url,
                       e.inep AS escola_inep, e.nome_escola AS escola_nome
                FROM users u
                LEFT JOIN escolas e ON e.id = %s
                WHERE u.id = %s
                """,
                (token_escola_id, token_escola_id, user_id),
            )
        else:
            await cur.execute(
                """
                SELECT u.id, u.cpf, u.email, u.nome, u.role, u.escola_id,
                       u.status, u.created_at, u.foto_url,
                       e.inep AS escola_inep, e.nome_escola AS escola_nome
                FROM users u
                LEFT JOIN escolas e ON u.escola_id = e.id
                WHERE u.id = %s
                """,
                (user_id,),
            )
        row = await cur.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = dict(row)

    if user.get("status") != "ATIVO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário desativado ou pendente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_user_with_escola(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Dependency para obter usuário autenticado que possui escola (diretor/coordenador). Retorna 403 se sem escola_id."""
    if current_user.get("escola_id") is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a usuários vinculados a uma escola (diretor/coordenador).",
        )
    return current_user


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Renovar access token usando refresh token."""
    payload = decode_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, email, role, status FROM users WHERE id = %s",
            (int(user_id),),
        )
        user = await cur.fetchone()

    if not user or user.get("status") != "ATIVO":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou desativado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Preservar escola_id no refresh (coordenador mantém a escola selecionada)
    escola_id = payload.get("escola_id")
    token_data = _build_token_data(dict(user), escola_id)

    return Token(
        access_token=create_access_token(data=token_data),
        refresh_token=create_refresh_token(data=token_data),
        token_type="bearer",
    )


@router.get("/me", response_model=UserMeResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Retorna dados do usuário autenticado."""
    created_at = None
    if current_user.get("created_at"):
        created_at = (
            current_user["created_at"].isoformat()
            if hasattr(current_user["created_at"], "isoformat")
            else str(current_user["created_at"])
        )

    role = current_user.get("role", "")
    allowed = ALLOWED_CREATE_ROLES.get(role, [])
    can_create = len(allowed) > 0

    # Para coordenadores, buscar todas as escolas vinculadas
    escolas = None
    if role == "COORDENADOR":
        rows = await _get_escolas_coordenador(current_user["id"], conn)
        escolas = [EscolaSimples(id=r["id"], nome_escola=r["nome_escola"]) for r in rows]

    return UserMeResponse(
        id=current_user["id"],
        cpf=current_user.get("cpf"),
        email=current_user.get("email"),
        nome=current_user["nome"],
        role=current_user["role"],
        escola_id=current_user.get("escola_id"),
        escola_inep=current_user.get("escola_inep"),
        escola_nome=current_user.get("escola_nome"),
        status=current_user["status"],
        created_at=created_at,
        foto_url=current_user.get("foto_url"),
        can_create_users=can_create,
        allowed_roles_for_create=allowed,
        max_users_per_escola=MAX_USERS_PER_ESCOLA,
        escolas=escolas,
    )


@router.patch("/me", response_model=UserMeResponse)
@router.put("/me", response_model=UserMeResponse)
async def update_me(
    data: UserUpdateMe,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Atualiza nome, email e/ou foto do usuário autenticado (minha conta). Aceita PATCH e PUT."""
    updates = {}
    if data.nome is not None:
        updates["nome"] = data.nome.strip()
    if data.email is not None:
        updates["email"] = data.email.strip() or None
    if data.foto_url is not None:
        updates["foto_url"] = data.foto_url.strip() or None

    role = current_user.get("role", "")
    allowed = ALLOWED_CREATE_ROLES.get(role, [])

    if not updates:
        created_at = current_user.get("created_at")
        if created_at:
            created_at = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)

        escolas = None
        if role == "COORDENADOR":
            rows = await _get_escolas_coordenador(current_user["id"], conn)
            escolas = [EscolaSimples(id=r["id"], nome_escola=r["nome_escola"]) for r in rows]

        return UserMeResponse(
            id=current_user["id"],
            cpf=current_user.get("cpf"),
            email=current_user.get("email"),
            nome=current_user.get("nome", ""),
            role=current_user.get("role", ""),
            escola_id=current_user.get("escola_id"),
            escola_inep=str(current_user["escola_inep"]) if current_user.get("escola_inep") else None,
            escola_nome=current_user.get("escola_nome"),
            status=current_user.get("status", "ATIVO"),
            created_at=created_at,
            foto_url=current_user.get("foto_url"),
            can_create_users=len(allowed) > 0,
            allowed_roles_for_create=allowed,
            max_users_per_escola=MAX_USERS_PER_ESCOLA,
            escolas=escolas,
        )

    async with conn.cursor() as cur:
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [current_user["id"]]
        await cur.execute(
            f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = %s RETURNING id",
            values,
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
        await conn.commit()

    # Recarregar usuário para resposta
    async with conn.cursor() as cur:
        await cur.execute(
            """SELECT u.id, u.cpf, u.email, u.nome, u.role, u.escola_id, u.status, u.created_at, u.foto_url,
                      s.inep AS escola_inep, s.nome_escola AS escola_nome
               FROM users u
               LEFT JOIN escolas s ON s.id = u.escola_id
               WHERE u.id = %s""",
            (current_user["id"],),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    row = dict(row)
    role = row.get("role", "")
    allowed = ALLOWED_CREATE_ROLES.get(role, [])
    created_at = row.get("created_at")
    if created_at:
        created_at = created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at)

    escolas = None
    if role == "COORDENADOR":
        escolas_rows = await _get_escolas_coordenador(row["id"], conn)
        escolas = [EscolaSimples(id=r["id"], nome_escola=r["nome_escola"]) for r in escolas_rows]

    return UserMeResponse(
        id=row["id"],
        cpf=row.get("cpf"),
        email=row.get("email"),
        nome=row["nome"],
        role=row["role"],
        escola_id=row.get("escola_id") or current_user.get("escola_id"),
        escola_inep=str(row["escola_inep"]) if row.get("escola_inep") else None,
        escola_nome=row.get("escola_nome"),
        status=row["status"],
        created_at=created_at,
        foto_url=row.get("foto_url"),
        can_create_users=len(allowed) > 0,
        allowed_roles_for_create=allowed,
        max_users_per_escola=MAX_USERS_PER_ESCOLA,
        escolas=escolas,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout (operação do cliente: remover tokens)."""
    return {"message": "Logout realizado com sucesso"}


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Alterar senha do usuário autenticado."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT password_hash FROM users WHERE id = %s",
            (current_user["id"],),
        )
        user = await cur.fetchone()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    if not verify_password(password_data.current_password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Senha atual incorreta")

    if verify_password(password_data.new_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ser diferente da senha atual",
        )

    new_hash = get_password_hash(password_data.new_password)
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE users SET password_hash = %s, updated_at = NOW() WHERE id = %s",
            (new_hash, current_user["id"]),
        )
        await conn.commit()

    return {"message": "Senha alterada com sucesso"}
