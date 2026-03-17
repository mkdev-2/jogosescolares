"""
Configuração de conexão com o banco de dados PostgreSQL usando psycopg async.
Single-tenant: sem lógica de multitenancy.
"""
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from urllib.parse import unquote

import psycopg
from psycopg.rows import dict_row
from pydantic_settings import BaseSettings
from datetime import date, datetime
import json
from fastapi import Request

logger = logging.getLogger(__name__)


def _json_serializer(obj):
    """Auxiliar para serializar datas e outros objetos no JSON."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)


async def log_audit(
    conn: psycopg.AsyncConnection,
    user_id: int | None,
    acao: str,
    tipo_recurso: str,
    recurso_id: int | None = None,
    detalhes_antes: dict | None = None,
    detalhes_depois: dict | None = None,
    mensagem: str | None = None,
):
    """Registra uma ação de auditoria no banco de dados."""
    try:
        # Resolver problemas de serialização de data/datetime
        d_antes = json.dumps(detalhes_antes, default=_json_serializer) if detalhes_antes else None
        d_depois = json.dumps(detalhes_depois, default=_json_serializer) if detalhes_depois else None

        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO auditoria (
                    user_id, acao, tipo_recurso, recurso_id,
                    detalhes_antes, detalhes_depois, mensagem
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (user_id, acao, tipo_recurso, recurso_id, d_antes, d_depois, mensagem),
            )
            # Commit imediato para garantir que o log seja salvo mesmo se a transação principal tiver problemas depois
            await conn.commit()
    except Exception as e:
        logger.error(f"Erro ao registrar auditoria: {e}")


class Settings(BaseSettings):
    """Configurações da aplicação carregadas de variáveis de ambiente."""

    database_url: str
    jwt_secret: str
    jwt_aud: str = "jogosescolares"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "ignore",
    }


settings = Settings()


class Database:
    """Gerenciador de conexão com o banco de dados."""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self._conn = None

    async def connect(self):
        """Estabelece conexão com o banco de dados."""
        if self._conn is None or self._conn.closed:
            url = self.database_url.replace("postgresql+psycopg://", "postgresql://")
            url = unquote(url)
            self._conn = await psycopg.AsyncConnection.connect(
                url,
                row_factory=dict_row,
                application_name="api-jels",
            )
        return self._conn

    async def close(self):
        """Fecha a conexão com o banco de dados."""
        if self._conn and not self._conn.closed:
            await self._conn.close()

    @asynccontextmanager
    async def get_connection(self):
        """Context manager para obter uma conexão com o banco."""
        conn = await self.connect()
        try:
            # Sempre limpa estado de transação abortada (evita InFailedSqlTransaction ao reutilizar conexão)
            await conn.rollback()
            yield conn
            await conn.commit()
        except Exception:
            try:
                await conn.rollback()
            except Exception:
                pass
            raise


# Instância global do banco de dados
db = Database(settings.database_url)


async def get_db(request: Request) -> AsyncGenerator[psycopg.AsyncConnection, None]:
    """
    Dependency para FastAPI obter conexão com o banco.
    Single-tenant: retorna conexão direta sem configuração de tenant.
    """
    async with db.get_connection() as conn:
        yield conn


async def get_db_connection():
    """Retorna uma conexão com o banco (para scripts standalone)."""
    return await db.connect()
