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
    apenas_com_equipes: bool = Query(True, description="True = apenas escolas com equipes; False = todas com adesão"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna escolas agrupadas por modalidade (esporte + categoria + naipe + tipo).
    - apenas_com_equipes=true  → base: equipes já formadas (vw_escolas_por_modalidade)
    - apenas_com_equipes=false → base: adesões da escola, com LEFT JOIN nas equipes
    Requer perfil ADMIN ou SUPER_ADMIN.
    """
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    if apenas_com_equipes:
        where = "WHERE edicao_id = %s"
        params: list = [resolved_edicao_id]
        if esporte_id:
            where += " AND esporte_id = %s"
            params.append(str(esporte_id))
        sql = f"""
            SELECT *, true AS tem_equipe
            FROM vw_escolas_por_modalidade
            {where}
            ORDER BY esporte_nome, categoria_nome, naipe_nome, tipo_modalidade_codigo, nome_escola
        """
    else:
        esporte_filter = ""
        params: list = []
        if esporte_id:
            esporte_filter = "AND esp.id::text = %s"
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
                eem.edicao_id,
                COALESCE(
                    (SELECT COUNT(*) FROM equipe_estudantes ee WHERE ee.equipe_id = e.id),
                    0
                )                        AS total_atletas,
                (e.id IS NOT NULL)       AS tem_equipe
            FROM escola_edicao_modalidades eem
            CROSS JOIN LATERAL jsonb_array_elements_text(eem.modalidades_adesao->'variante_ids') AS vid(variante_id_text)
            JOIN esporte_variantes ev  ON ev.id  = vid.variante_id_text::uuid
            JOIN esportes esp          ON esp.id = ev.esporte_id {esporte_filter}
            JOIN categorias c          ON c.id   = ev.categoria_id
            JOIN naipes n              ON n.id   = ev.naipe_id
            JOIN tipos_modalidade tm   ON tm.id  = ev.tipo_modalidade_id
            JOIN escolas esc           ON esc.id = eem.escola_id
            LEFT JOIN equipes e        ON e.escola_id          = eem.escola_id
                                      AND e.esporte_variante_id = ev.id
                                      AND e.edicao_id           = eem.edicao_id
            WHERE eem.edicao_id = %s
            ORDER BY esp.nome, c.nome, n.nome, tm.codigo, esc.nome_escola
        """
        params.append(resolved_edicao_id)

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
            "tem_equipe": bool(row["tem_equipe"]),
        })

    result = list(variants.values())
    for v in result:
        v["total_escolas"] = len(v["escolas"])

    return result


@router.get("/escola-modalidade-alunos")
async def escola_modalidade_alunos(
    escola_id: int = Query(..., description="ID da escola"),
    variante_id: str = Query(..., description="UUID da esporte_variante"),
    edicao_id: int | None = Query(None, description="ID da edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna informações da escola e lista de alunos inscritos em uma modalidade específica.
    Utiliza a view vw_alunos_modalidade_escola.
    Requer perfil ADMIN ou SUPER_ADMIN.
    """
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    # Dados da escola
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, nome_escola, inep, cidade, uf, email, telefone, endereco
            FROM escolas
            WHERE id = %s
            """,
            (escola_id,),
        )
        escola_row = await cur.fetchone()

    if not escola_row:
        raise HTTPException(status_code=404, detail="Escola não encontrada.")

    # Dados da variante (modalidade)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT esp.nome AS esporte_nome, c.nome AS categoria_nome,
                   n.nome AS naipe_nome, tm.nome AS tipo_modalidade_nome
            FROM esporte_variantes ev
            JOIN esportes        esp ON esp.id = ev.esporte_id
            JOIN categorias      c   ON c.id   = ev.categoria_id
            JOIN naipes          n   ON n.id   = ev.naipe_id
            JOIN tipos_modalidade tm  ON tm.id  = ev.tipo_modalidade_id
            WHERE ev.id = %s::uuid
            """,
            (variante_id,),
        )
        variante_row = await cur.fetchone()

    if not variante_row:
        raise HTTPException(status_code=404, detail="Modalidade não encontrada.")

    # Alunos via view
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT estudante_id, estudante_nome, data_nascimento, sexo, cpf
            FROM vw_alunos_modalidade_escola
            WHERE escola_id = %s
              AND esporte_variante_id = %s::uuid
              AND edicao_id = %s
            ORDER BY estudante_nome
            """,
            (escola_id, variante_id, resolved_edicao_id),
        )
        aluno_rows = await cur.fetchall()

    def fmt_date(d):
        return d.strftime("%d/%m/%Y") if d else None

    alunos = [
        {
            "id": r["estudante_id"],
            "nome": r["estudante_nome"],
            "data_nascimento": fmt_date(r.get("data_nascimento")),
            "sexo": r.get("sexo"),
            "cpf": r.get("cpf"),
        }
        for r in aluno_rows
    ]

    return {
        "escola": {
            "id":          escola_row["id"],
            "nome_escola": escola_row["nome_escola"],
            "inep":        escola_row["inep"],
            "cidade":      escola_row.get("cidade"),
            "uf":          escola_row.get("uf"),
            "email":       escola_row.get("email"),
            "telefone":    escola_row.get("telefone"),
            "endereco":    escola_row.get("endereco"),
        },
        "variante": dict(variante_row),
        "alunos":   alunos,
    }
