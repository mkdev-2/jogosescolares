"""
Funções de segurança: hash de senhas e criação/validação de JWTs.
"""
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt

from app.database import settings


def _truncate_password_for_bcrypt(password: str) -> str:
    """
    Trunca uma senha para o limite de 72 bytes do bcrypt de forma segura.
    """
    if not password:
        return password

    password_bytes = password.encode('utf-8')
    if len(password_bytes) <= 72:
        return password

    truncated = password_bytes[:72]
    max_attempts = 4
    attempts = 0
    while truncated and attempts < max_attempts:
        try:
            return truncated.decode('utf-8')
        except UnicodeDecodeError:
            truncated = truncated[:-1]
            attempts += 1

    return password_bytes[:72].decode('utf-8', errors='replace')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash."""
    if not plain_password or not hashed_password:
        return False

    try:
        plain_password = _truncate_password_for_bcrypt(plain_password)
        if not plain_password:
            return False

        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]

        hashed_password_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_password_bytes)
    except Exception:
        import logging
        logging.getLogger(__name__).error("Erro ao verificar senha", exc_info=True)
        return False


def get_password_hash(password: str) -> str:
    """Gera o hash bcrypt de uma senha."""
    if not password:
        raise ValueError("Password cannot be empty")

    password = _truncate_password_for_bcrypt(password)
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]

    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria um JWT assinado com os dados fornecidos."""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({
        "exp": expire,
        "type": "access",
        "aud": settings.jwt_aud
    })

    return jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.algorithm
    )


def create_refresh_token(data: dict) -> str:
    """Cria um refresh token JWT com expiração mais longa."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)

    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "aud": settings.jwt_aud
    })

    return jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.algorithm
    )


def decode_token(token: str) -> Optional[dict]:
    """Decodifica e valida um JWT."""
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.algorithm],
            audience=settings.jwt_aud
        )
    except JWTError:
        return None


def get_current_user_id(token: str) -> Optional[int]:
    """Extrai o ID do usuário de um token JWT."""
    payload = decode_token(token)
    if payload and "sub" in payload:
        try:
            return int(payload["sub"])
        except (ValueError, TypeError):
            return None
    return None
