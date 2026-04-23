"""
Relatórios - endpoints de relatórios gerenciais do sistema.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
import psycopg

from app.auth import get_current_user
from app.database import get_db
from app.edicao_context import resolve_edicao_id

router = APIRouter(prefix="/api/relatorios", tags=["relatorios"])
logger = logging.getLogger(__name__)

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}


def _require_admin(current_user: dict) -> dict:
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem visualizar este relatório.",
        )
    return current_user


@router.get("/escolas-por-modalidade")
async def escolas_por_modalidade(
    edicao_id: int | None = Query(None, description="ID da edição; se omitido usa a ativa"),
    esporte_id: str | None = Query(None, description="Filtra por esporte específico (UUID)"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna escolas agrupadas por modalidade (esporte + categoria + naipe + tipo).
    Cada entrada lista as escolas que possuem equipes na respectiva modalidade.
    Requer perfil ADMIN ou SUPER_ADMIN.
    """
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    where = "WHERE e.edicao_id = %s"
    params: list = [resolved_edicao_id]

    if esporte_id:
        where += " AND ev.esporte_id::text = %s"
        params.append(str(esporte_id))

    sql = f"""
        SELECT
            ev.id::text              AS variante_id,
            esp.id::text             AS esporte_id,
            esp.nome                 AS esporte_nome,
            esp.icone                AS esporte_icone,
            c.nome                   AS categoria_nome,
            n.nome                   AS naipe_nome,
            n.codigo                 AS naipe_codigo,
            tm.nome                  AS tipo_modalidade_nome,
            tm.codigo                AS tipo_modalidade_codigo,
            e.id                     AS equipe_id,
            esc.id                   AS escola_id,
            esc.nome_escola,
            esc.inep,
            (
                SELECT COUNT(*)
                FROM equipe_estudantes ee
                WHERE ee.equipe_id = e.id
            )                        AS total_atletas
        FROM equipes e
        JOIN esporte_variantes ev  ON ev.id  = e.esporte_variante_id
        JOIN esportes esp          ON esp.id = ev.esporte_id
        JOIN categorias c          ON c.id   = ev.categoria_id
        JOIN naipes n              ON n.id   = ev.naipe_id
        JOIN tipos_modalidade tm   ON tm.id  = ev.tipo_modalidade_id
        JOIN escolas esc           ON esc.id = e.escola_id
        {where}
        ORDER BY esp.nome, c.nome, n.nome, tm.codigo, esc.nome_escola
    """

    async with conn.cursor() as cur:
        await cur.execute(sql, params)
        rows = await cur.fetchall()

    # Agrupa as linhas por variante no lado Python
    variants: dict[str, dict] = {}
    for row in rows:
        vid = row["variante_id"]
        if vid not in variants:
            variants[vid] = {
                "variante_id": vid,
                "esporte_id": row["esporte_id"],
                "esporte_nome": row["esporte_nome"],
                "esporte_icone": row["esporte_icone"],
                "categoria_nome": row["categoria_nome"],
                "naipe_nome": row["naipe_nome"],
                "naipe_codigo": row["naipe_codigo"],
                "tipo_modalidade_nome": row["tipo_modalidade_nome"],
                "tipo_modalidade_codigo": row["tipo_modalidade_codigo"],
                "escolas": [],
            }
        variants[vid]["escolas"].append({
            "equipe_id": row["equipe_id"],
            "escola_id": row["escola_id"],
            "escola_nome": row["nome_escola"],
            "escola_inep": row["inep"],
            "total_atletas": int(row["total_atletas"]) if row["total_atletas"] is not None else 0,
        })

    result = list(variants.values())
    for v in result:
        v["total_escolas"] = len(v["escolas"])

    return result
