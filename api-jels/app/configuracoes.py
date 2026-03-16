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
from app.schemas import ConfiguracoesUpdate, ConfiguracoesLogosUpdate

router = APIRouter(prefix="/api/configuracoes", tags=["configuracoes"])
logger = logging.getLogger(__name__)

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}

# Chaves conhecidas de configuração (expandível no futuro)
CHAVES_CONHECIDAS = {
    "cadastro_data_limite",
    "diretor_cadastro_alunos_data_limite",
    "diretor_editar_modalidades_data_limite",
    "logo_secretaria",
    "logo_jels",
    "bg_credencial",
}


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
    """Retorna configurações para o app (usuário logado): prazos para diretor cadastrar alunos e editar modalidades."""
    chaves = ("diretor_cadastro_alunos_data_limite", "diretor_editar_modalidades_data_limite")
    result = {k: None for k in chaves}
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT chave, valor FROM configuracoes WHERE chave = ANY(%s)",
            (list(chaves),),
        )
        async for row in cur:
            result[row["chave"]] = _valor_para_resposta(row["valor"], row["chave"])
    return result


@router.get("/logos")
async def get_configuracoes_logos(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retorna apenas as logos e o bg_credencial publicamente."""
    chaves = ("logo_secretaria", "logo_jels", "bg_credencial")
    result = {k: None for k in chaves}
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT chave, valor FROM configuracoes WHERE chave = ANY(%s)",
            (list(chaves),),
        )
        async for row in cur:
            result[row["chave"]] = _valor_para_resposta(row["valor"], row["chave"])
    return result


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
            result[row["chave"]] = _valor_para_resposta(row["valor"], row["chave"])
    return JSONResponse(
        content=result,
        headers={"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"},
    )


def _normalize_data_limite(value: Optional[str]) -> Optional[str]:
    """Normaliza data YYYY-MM-DD ou retorna None."""
    if value is None or not str(value).strip():
        return None
    return str(value).strip()[:10]


def _valor_para_resposta(val, chave: Optional[str] = None):
    """Garante que o valor lido do banco seja string ou None na resposta JSON.
    Para chaves de data (data_limite) retorna só os primeiros 10 chars (YYYY-MM-DD)."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    if chave and "data_limite" in chave:
        return s[:10]
    return s


@router.put("")
async def update_configuracoes(
    payload: ConfiguracoesUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza configurações (apenas SUPER_ADMIN/ADMIN). Body: cadastro_data_limite, diretor_cadastro_alunos_data_limite (YYYY-MM-DD ou null)."""
    require_admin(current_user)

    updates = {
        "cadastro_data_limite": _normalize_data_limite(payload.cadastro_data_limite),
        "diretor_cadastro_alunos_data_limite": _normalize_data_limite(
            payload.diretor_cadastro_alunos_data_limite
        ),
        "diretor_editar_modalidades_data_limite": _normalize_data_limite(
            payload.diretor_editar_modalidades_data_limite
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
            result[row["chave"]] = _valor_para_resposta(row["valor"], row["chave"])
    return result


@router.patch("/logos")
async def update_configuracoes_logos(
    payload: ConfiguracoesLogosUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza apenas as mídias (logo_secretaria, logo_jels, bg_credencial). Apenas SUPER_ADMIN/ADMIN."""
    require_admin(current_user)

    updates = {}
    if payload.logo_secretaria is not None:
        updates["logo_secretaria"] = str(payload.logo_secretaria).strip() or None
    if payload.logo_jels is not None:
        updates["logo_jels"] = str(payload.logo_jels).strip() or None
    if payload.bg_credencial is not None:
        updates["bg_credencial"] = str(payload.bg_credencial).strip() or None

    if not updates:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT chave, valor FROM configuracoes WHERE chave = ANY(%s)",
                (list(CHAVES_CONHECIDAS),),
            )
            result = {chave: None for chave in CHAVES_CONHECIDAS}
            async for row in cur:
                result[row["chave"]] = _valor_para_resposta(row["valor"], row["chave"])
        return result

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
            result[row["chave"]] = _valor_para_resposta(row["valor"], row["chave"])
    return result
