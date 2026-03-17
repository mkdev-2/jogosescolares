"""
Roteador de auditoria: listagem de logs para administradores.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg
from app.auth import get_current_user, is_admin
from app.database import get_db
from app.schemas import AuditoriaResponse

router = APIRouter(prefix="/auditoria", tags=["auditoria"])

@router.get("", response_model=list[AuditoriaResponse])
async def list_auditoria(
    user_id: Optional[int] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista logs de auditoria (apenas para ADMIN/SUPERADMIN)."""
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )

    query = """
        SELECT a.*, u.nome as usuario_nome
        FROM auditoria a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE 1=1
    """
    params = []

    if user_id:
        query += " AND a.user_id = %s"
        params.append(user_id)
    
    if data_inicio:
        query += " AND a.created_at >= %s"
        params.append(data_inicio)
    
    if data_fim:
        query += " AND a.created_at <= %s"
        params.append(data_fim)

    query += " ORDER BY a.created_at DESC LIMIT 1000"

    async with conn.cursor() as cur:
        await cur.execute(query, params)
        rows = await cur.fetchall()
    
    result = []
    for r in rows:
        result.append(AuditoriaResponse(
            id=r["id"],
            user_id=r["user_id"],
            usuario_nome=r["usuario_nome"],
            acao=r["acao"],
            tipo_recurso=r["tipo_recurso"],
            recurso_id=r["recurso_id"],
            detalhes_antes=r["detalhes_antes"],
            detalhes_depois=r["detalhes_depois"],
            mensagem=r["mensagem"],
            created_at=r["created_at"].isoformat()
        ))
    return result
