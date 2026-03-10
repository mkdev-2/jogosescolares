"""
Roteador de configurações: leitura e atualização de datas/prazos (apenas SUPER_ADMIN e ADMIN).
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
import psycopg

from app.auth import get_current_user
from app.database import get_db
from app.schemas import ConfiguracoesUpdate

router = APIRouter(prefix="/api/configuracoes", tags=["configuracoes"])
logger = logging.getLogger(__name__)

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}

# Chaves conhecidas de configuração (expandível no futuro)
CHAVES_CONHECIDAS = {"cadastro_data_limite", "diretor_cadastro_alunos_data_limite"}


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


@router.get("/app")
async def get_configuracoes_app(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retorna configurações para o app (usuário logado): ex. prazo para diretor cadastrar alunos."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT valor FROM configuracoes WHERE chave = %s",
            ("diretor_cadastro_alunos_data_limite",),
        )
        row = await cur.fetchone()
    return {
        "diretor_cadastro_alunos_data_limite": row["valor"] if row and row.get("valor") else None,
    }


@router.get("")
async def get_configuracoes(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retorna as configurações (apenas SUPER_ADMIN/ADMIN)."""
    require_admin(current_user)
    result = {chave: None for chave in CHAVES_CONHECIDAS}
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT chave, valor FROM configuracoes WHERE chave = ANY(%s)",
            (list(CHAVES_CONHECIDAS),),
        )
        async for row in cur:
            result[row["chave"]] = _valor_para_resposta(row["valor"])
    return JSONResponse(
        content=result,
        headers={"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"},
    )


def _normalize_data_limite(value: Optional[str]) -> Optional[str]:
    """Normaliza data YYYY-MM-DD ou retorna None."""
    if value is None or not str(value).strip():
        return None
    return str(value).strip()[:10]


def _valor_para_resposta(val):
    """Garante que o valor lido do banco seja string ou None na resposta JSON."""
    if val is None:
        return None
    s = str(val).strip()
    return s[:10] if s else None


@router.put("")
async def update_configuracoes(
    payload: ConfiguracoesUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza configurações (apenas SUPER_ADMIN/ADMIN). Body: cadastro_data_limite, diretor_cadastro_alunos_data_limite (YYYY-MM-DD ou null)."""
    require_admin(current_user)

    # Sempre gravar as duas chaves para garantir persistência (valor ou None)
    updates = {
        "cadastro_data_limite": _normalize_data_limite(payload.cadastro_data_limite),
        "diretor_cadastro_alunos_data_limite": _normalize_data_limite(
            payload.diretor_cadastro_alunos_data_limite
        ),
    }

    async with conn.cursor() as cur:
        for chave, valor in updates.items():
            await cur.execute(
                """
                INSERT INTO configuracoes (chave, valor)
                VALUES (%s, %s)
                ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
                """,
                (chave, valor),
            )
    await conn.commit()

    result = {chave: None for chave in CHAVES_CONHECIDAS}
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT chave, valor FROM configuracoes WHERE chave = ANY(%s)",
            (list(CHAVES_CONHECIDAS),),
        )
        async for row in cur:
            result[row["chave"]] = _valor_para_resposta(row["valor"])
    return result
