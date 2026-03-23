"""
Roteador de dashboard: estatísticas agregadas para o Quadro de Resumo.
"""
import logging
from fastapi import APIRouter, Depends, Query
import psycopg

from app.auth import get_current_user, is_admin
from app.database import get_db
from app.edicao_context import resolve_edicao_id

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)


@router.get("")
async def get_dashboard_stats(
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna estatísticas agregadas para o Quadro de Resumo.
    Admin vê todos os dados; diretor/coordenador vê apenas da sua escola.
    """
    escola_id = current_user.get("escola_id") if not is_admin(current_user) else None
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        # Totais gerais (admin) ou filtrados por escola
        if escola_id is None:
            # Total de escolas cadastradas
            await cur.execute(
                "SELECT COUNT(*) AS total FROM escolas"
            )
            total_escolas = (await cur.fetchone())["total"] or 0

            # Total de estudantes/atletas
            await cur.execute("SELECT COUNT(*) AS total FROM estudantes_atletas")
            total_estudantes = (await cur.fetchone())["total"] or 0

            # Total de modalidades (esporte_variantes)
            await cur.execute(
                """
                SELECT COUNT(*) AS total FROM esporte_variantes ev
                JOIN esportes esp ON esp.id = ev.esporte_id AND esp.ativa = true
                """
            )
            total_modalidades = (await cur.fetchone())["total"] or 0

            # Total de equipes
            await cur.execute(
                "SELECT COUNT(*) AS total FROM equipes WHERE edicao_id = %s",
                (resolved_edicao_id,),
            )
            total_equipes = (await cur.fetchone())["total"] or 0

            # Total de professores técnicos
            await cur.execute("SELECT COUNT(*) AS total FROM professores_tecnicos")
            total_professores = (await cur.fetchone())["total"] or 0

            # Total de estudantes em equipes (vinculados)
            await cur.execute(
                """
                SELECT COUNT(DISTINCT ee.estudante_id) AS total
                FROM equipe_estudantes ee
                JOIN equipes eq ON eq.id = ee.equipe_id
                WHERE eq.edicao_id = %s
                """
                ,
                (resolved_edicao_id,),
            )
            total_atletas_vinculados = (await cur.fetchone())["total"] or 0

            # Solicitações pendentes (apenas admin)
            await cur.execute(
                "SELECT COUNT(*) AS total FROM solicitacoes WHERE status = 'PENDENTE'"
            )
            solicitacoes_pendentes = (await cur.fetchone())["total"] or 0

            # Escolas por status de adesão
            await cur.execute(
                """
                SELECT status_adesao AS status, COUNT(*) AS total
                FROM escolas
                GROUP BY status_adesao
                """
            )
            escolas_por_status = [
                {"status": r["status"] or "N/A", "total": r["total"]}
                for r in await cur.fetchall()
            ]

            # Equipes por modalidade (esporte + categoria + naipe)
            await cur.execute(
                """
                SELECT esp.nome AS esporte_nome, c.nome AS categoria_nome, n.nome AS naipe_nome,
                       ev.id AS esporte_variante_id,
                       COUNT(e.id) AS total_equipes
                FROM equipes e
                JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
                JOIN esportes esp ON esp.id = ev.esporte_id
                JOIN categorias c ON c.id = ev.categoria_id
                JOIN naipes n ON n.id = ev.naipe_id
                WHERE e.edicao_id = %s
                GROUP BY ev.id, esp.nome, c.nome, n.nome
                ORDER BY total_equipes DESC
                """
                ,
                (resolved_edicao_id,),
            )
            equipes_por_modalidade = [
                {
                    "esporte_nome": r["esporte_nome"],
                    "categoria_nome": r["categoria_nome"],
                    "naipe_nome": r["naipe_nome"],
                    "modalidade": f"{r['esporte_nome']} - {r['categoria_nome']} ({r['naipe_nome']})",
                    "total": r["total_equipes"],
                }
                for r in await cur.fetchall()
            ]

            # Equipes por escola (top 10)
            await cur.execute(
                """
                SELECT s.nome_escola AS escola_nome, s.id AS escola_id, COUNT(e.id) AS total_equipes
                FROM equipes e
                JOIN escolas s ON s.id = e.escola_id
                WHERE e.edicao_id = %s
                GROUP BY s.id, s.nome_escola
                ORDER BY total_equipes DESC
                LIMIT 10
                """
                ,
                (resolved_edicao_id,),
            )
            equipes_por_escola = [
                {"escola_nome": r["escola_nome"], "escola_id": r["escola_id"], "total": r["total_equipes"]}
                for r in await cur.fetchall()
            ]

        else:
            # Filtrado por escola do usuário
            await cur.execute(
                "SELECT COUNT(*) AS total FROM escolas WHERE id = %s",
                (escola_id,),
            )
            total_escolas = 1 if (await cur.fetchone())["total"] else 0

            await cur.execute(
                "SELECT COUNT(*) AS total FROM estudantes_atletas WHERE escola_id = %s",
                (escola_id,),
            )
            total_estudantes = (await cur.fetchone())["total"] or 0

            # Modalidades disponíveis (todas, pois são catálogo)
            await cur.execute(
                """
                SELECT COUNT(*) AS total FROM esporte_variantes ev
                JOIN esportes esp ON esp.id = ev.esporte_id AND esp.ativa = true
                """
            )
            total_modalidades = (await cur.fetchone())["total"] or 0

            await cur.execute(
                "SELECT COUNT(*) AS total FROM equipes WHERE escola_id = %s AND edicao_id = %s",
                (escola_id, resolved_edicao_id),
            )
            total_equipes = (await cur.fetchone())["total"] or 0

            await cur.execute(
                "SELECT COUNT(*) AS total FROM professores_tecnicos WHERE escola_id = %s",
                (escola_id,),
            )
            total_professores = (await cur.fetchone())["total"] or 0

            await cur.execute(
                """
                SELECT COUNT(DISTINCT ee.estudante_id) AS total
                FROM equipe_estudantes ee
                JOIN equipes eq ON eq.id = ee.equipe_id
                WHERE eq.escola_id = %s AND eq.edicao_id = %s
                """,
                (escola_id, resolved_edicao_id),
            )
            total_atletas_vinculados = (await cur.fetchone())["total"] or 0

            solicitacoes_pendentes = 0  # Diretor/coordenador não vê
            escolas_por_status = []

            await cur.execute(
                """
                SELECT esp.nome AS esporte_nome, c.nome AS categoria_nome, n.nome AS naipe_nome,
                       ev.id AS esporte_variante_id,
                       COUNT(e.id) AS total_equipes
                FROM equipes e
                JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
                JOIN esportes esp ON esp.id = ev.esporte_id
                JOIN categorias c ON c.id = ev.categoria_id
                JOIN naipes n ON n.id = ev.naipe_id
                WHERE e.escola_id = %s AND e.edicao_id = %s
                GROUP BY ev.id, esp.nome, c.nome, n.nome
                ORDER BY total_equipes DESC
                """,
                (escola_id, resolved_edicao_id),
            )
            equipes_por_modalidade = [
                {
                    "esporte_nome": r["esporte_nome"],
                    "categoria_nome": r["categoria_nome"],
                    "naipe_nome": r["naipe_nome"],
                    "modalidade": f"{r['esporte_nome']} - {r['categoria_nome']} ({r['naipe_nome']})",
                    "total": r["total_equipes"],
                }
                for r in await cur.fetchall()
            ]

            equipes_por_escola = []  # Para escola única, não faz sentido

    return {
        "total_escolas": total_escolas,
        "total_estudantes": total_estudantes,
        "total_modalidades": total_modalidades,
        "total_equipes": total_equipes,
        "total_professores": total_professores,
        "total_atletas_vinculados": total_atletas_vinculados,
        "solicitacoes_pendentes": solicitacoes_pendentes,
        "escolas_por_status": escolas_por_status,
        "equipes_por_modalidade": equipes_por_modalidade,
        "equipes_por_escola": equipes_por_escola,
    }
