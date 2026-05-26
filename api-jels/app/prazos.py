"""Verificação de prazos configuráveis (tabela configuracoes)."""
from datetime import date

from fastapi import HTTPException, status
import psycopg


async def assert_prazo_nao_encerrado(
    conn: psycopg.AsyncConnection,
    chave: str,
    mensagem_encerrado: str,
) -> None:
    """Levanta 403 se a data de hoje for posterior à data limite configurada."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT valor FROM configuracoes WHERE chave = %s",
            (chave,),
        )
        row = await cur.fetchone()
    limit_val = row["valor"] if row and row.get("valor") else None
    if not limit_val:
        return
    limit_str = str(limit_val).strip()[:10]
    try:
        limit_date = date.fromisoformat(limit_str)
        if date.today() > limit_date:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=mensagem_encerrado,
            )
    except ValueError:
        pass
