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
    UserCreate, UserLogin, Token, UserResponse, UserMeResponse, RefreshTokenRequest,
    ChangePasswordRequest,
)
from app.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token, get_current_user_id,
)
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger(__name__)

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}


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

    escola_id = user_data.escola_id if user_data.role in ("DIRETOR", "COORDENADOR") else None

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


@router.post("/token", response_model=Token)
async def login_for_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """OAuth2 para Swagger UI. Username = CPF."""
    user = await authenticate_user(form_data.username, form_data.password, conn)

    token_data = {
        "sub": str(user["id"]),
        "role": user["role"],
        "email": user["email"],
    }

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
    """Login por CPF e senha. Single-tenant: sem validação de subdomínio."""
    try:
        user = await authenticate_user(credentials.cpf, credentials.password, conn)

        token_data = {
            "sub": str(user["id"]),
            "role": user["role"],
            "email": user["email"],
        }

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

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT u.id, u.cpf, u.email, u.nome, u.role, u.escola_id, u.status, u.created_at, u.foto_url,
                   e.inep AS escola_inep
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

    token_data = {
        "sub": str(user["id"]),
        "role": user["role"],
        "email": user["email"],
    }

    return Token(
        access_token=create_access_token(data=token_data),
        refresh_token=create_refresh_token(data=token_data),
        token_type="bearer",
    )


@router.get("/me", response_model=UserMeResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retorna dados do usuário autenticado."""
    created_at = None
    if current_user.get("created_at"):
        created_at = (
            current_user["created_at"].isoformat()
            if hasattr(current_user["created_at"], "isoformat")
            else str(current_user["created_at"])
        )

    return UserMeResponse(
        id=current_user["id"],
        cpf=current_user.get("cpf"),
        email=current_user.get("email"),
        nome=current_user["nome"],
        role=current_user["role"],
        escola_id=current_user.get("escola_id"),
        escola_inep=current_user.get("escola_inep"),
        status=current_user["status"],
        created_at=created_at,
        foto_url=current_user.get("foto_url"),
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
