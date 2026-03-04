"""
Roteador de configurações: leitura e atualização de datas/prazos (apenas SUPER_ADMIN e ADMIN).
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.auth import get_current_user
from app.database import get_db
from app.schemas import ConfiguracoesUpdate

router = APIRouter(prefix="/api/configuracoes", tags=["configuracoes"])
logger = logging.getLogger(__name__)

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}

# Chaves conhecidas de configuração (expandível no futuro)
CHAVES_CONHECIDAS = {"cadastro_data_limite"}


def require_admin(current_user: dict) -> dict:
    """Garante que o usuário é SUPER_ADMIN ou ADMIN."""
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem acessar as configurações.",
        )
    return current_user


@router.get("/publico")
async def get_configuracoes_publico(
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Retorna apenas a data limite de cadastro (público, para o formulário de adesão verificar se pode enviar)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT valor FROM configuracoes WHERE chave = %s",
            ("cadastro_data_limite",),
        )
        row = await cur.fetchone()
    return {"cadastro_data_limite": row["valor"] if row and row.get("valor") else None}


@router.get("")
async def get_configuracoes(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retorna as configurações (apenas SUPER_ADMIN/ADMIN)."""
    require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT chave, valor FROM configuracoes WHERE chave = ANY(%s)",
            (list(CHAVES_CONHECIDAS),),
        )
        rows = await cur.fetchall()
    result = {chave: None for chave in CHAVES_CONHECIDAS}
    for row in rows:
        result[row["chave"]] = row["valor"]
    return result


@router.put("")
async def update_configuracoes(
    payload: ConfiguracoesUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza configurações (apenas SUPER_ADMIN/ADMIN). Body: { "cadastro_data_limite": "YYYY-MM-DD" ou null }."""
    require_admin(current_user)

    cadastro_data_limite = payload.cadastro_data_limite

    if cadastro_data_limite is not None and cadastro_data_limite.strip():
        valor = cadastro_data_limite.strip()[:10]
    else:
        valor = None

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO configuracoes (chave, valor)
            VALUES ('cadastro_data_limite', %s)
            ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
            """,
            (valor,),
        )
        await conn.commit()

    return {"cadastro_data_limite": valor}
