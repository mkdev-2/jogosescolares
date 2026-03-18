"""
Instagram Service - Feed e renovação automática de tokens para Jogos Escolares.
Expõe endpoint público para o feed e endpoint protegido para refresh.
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Depends, Header, status

from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/instagram", tags=["instagram"])

INSTAGRAM_GRAPH_BASE = "https://graph.instagram.com"
REFRESH_ENDPOINT = f"{INSTAGRAM_GRAPH_BASE}/refresh_access_token"


async def get_instagram_token(conn) -> str:
    """
    Obtém o token do Instagram: primeiro do banco, depois do .env como fallback.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT access_token FROM instagram_tokens
            ORDER BY updated_at DESC
            LIMIT 1
            """
        )
        row = await cur.fetchone()

    if row and row.get("access_token"):
        return row["access_token"]

    # Fallback para variável de ambiente (compatibilidade)
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN") or os.getenv("VITE_INSTAGRAM_ACCESS_TOKEN")
    if token:
        return token

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Token do Instagram não configurado. Execute o script de refresh ou configure INSTAGRAM_ACCESS_TOKEN.",
    )


@router.get("/feed")
async def get_instagram_feed(conn=Depends(get_db)):
    """
    Retorna perfil e posts do Instagram para o widget.
    Endpoint público - o token nunca é exposto ao frontend.
    """
    try:
        from app.database import db
        conn = db.pool
        token = await get_instagram_token(conn)

        async with httpx.AsyncClient(timeout=15.0) as client:
            # Buscar perfil
            profile_resp = await client.get(
                f"{INSTAGRAM_GRAPH_BASE}/me",
                params={
                    "fields": "id,username,media_count,profile_picture_url,followers_count,follows_count",
                    "access_token": token,
                },
            )

            if not profile_resp.is_success:
                err_data = profile_resp.json() if profile_resp.content else {}
                err_msg = err_data.get("error", {}).get("message", profile_resp.text)
                logger.error(f"Erro API Instagram perfil: {profile_resp.status_code} - {err_msg}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Erro ao buscar perfil do Instagram: {err_msg}",
                )

            profile = profile_resp.json()

            # Buscar posts
            posts_resp = await client.get(
                f"{INSTAGRAM_GRAPH_BASE}/me/media",
                params={
                    "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
                    "access_token": token,
                    "limit": 12,
                },
            )

            if not posts_resp.is_success:
                err_data = posts_resp.json() if posts_resp.content else {}
                err_msg = err_data.get("error", {}).get("message", posts_resp.text)
                logger.error(f"Erro API Instagram posts: {posts_resp.status_code} - {err_msg}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Erro ao buscar posts do Instagram: {err_msg}",
                )

            posts_data = posts_resp.json()
            posts = posts_data.get("data", []) if isinstance(posts_data, dict) else []

        return {
            "profile": profile,
            "posts": posts,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro ao carregar feed do Instagram: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao carregar feed do Instagram",
        )


def _verify_refresh_secret(x_refresh_secret: Optional[str] = None) -> bool:
    """Verifica o secret para o endpoint de refresh."""
    expected = os.getenv("INSTAGRAM_REFRESH_SECRET")
    if not expected:
        return True
    return x_refresh_secret == expected


@router.post("/refresh")
async def refresh_instagram_token(
    x_refresh_secret: Optional[str] = Header(None, alias="X-Refresh-Secret"),
):
    """
    Renova o token de longa duração do Instagram.
    """
    if not _verify_refresh_secret(x_refresh_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Secret inválido para renovação do token",
        )

    from app.database import db
    conn = db.pool

    # Obter token atual (banco ou .env)
    token = None
    last_updated = None
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT access_token, updated_at FROM instagram_tokens
            ORDER BY updated_at DESC
            LIMIT 1
            """
        )
        row = await cur.fetchone()
        if row and row.get("access_token"):
            token = row["access_token"]
            last_updated = row.get("updated_at")

    if not token:
        token = os.getenv("INSTAGRAM_ACCESS_TOKEN") or os.getenv("VITE_INSTAGRAM_ACCESS_TOKEN")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum token encontrado.",
        )

    # Só renovar se o último token tiver ao menos 50 dias (evita renovação desnecessária)
    MIN_DAYS_BEFORE_REFRESH = 50
    if last_updated:
        if last_updated.tzinfo is None:
            last_updated = last_updated.replace(tzinfo=timezone.utc)
        age_days = (datetime.now(timezone.utc) - last_updated).days
        if age_days < MIN_DAYS_BEFORE_REFRESH:
            logger.info(f"Token do Instagram ainda válido ({age_days} dias). Renovação ignorada (mínimo {MIN_DAYS_BEFORE_REFRESH} dias).")
            return {
                "success": True,
                "skipped": True,
                "reason": f"Token ainda válido ({age_days} dias). Renovar apenas após {MIN_DAYS_BEFORE_REFRESH} dias.",
                "last_updated": last_updated.isoformat(),
                "days_until_refresh": MIN_DAYS_BEFORE_REFRESH - age_days,
            }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            REFRESH_ENDPOINT,
            params={
                "grant_type": "ig_refresh_token",
                "access_token": token,
            },
        )

    if not resp.is_success:
        err_data = resp.json() if resp.content else {}
        err_msg = err_data.get("error", {}).get("message", resp.text)
        logger.error(f"Erro ao renovar token Instagram: {resp.status_code} - {err_msg}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao renovar token: {err_msg}",
        )

    data = resp.json()
    new_token = data.get("access_token")
    expires_in = data.get("expires_in", 5184000)

    if not new_token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Resposta da API sem access_token",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO instagram_tokens (access_token, expires_at, updated_at)
            VALUES (%s, %s, NOW())
            """,
            (new_token, expires_at),
        )
        await conn.commit()

    logger.info(f"Token do Instagram renovado com sucesso. Expira em {expires_in}s (~{expires_in // 86400} dias)")
    return {
        "success": True,
        "expires_in": expires_in,
        "expires_at": expires_at.isoformat(),
    }
