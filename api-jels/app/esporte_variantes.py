"""
Roteador de esporte_variantes: CRUD de combinações válidas (esporte + categoria + naipe + tipo).
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
import psycopg

from app.schemas import (
    EsporteVarianteCreate,
    EsporteVarianteResponse,
)
from app.auth import get_current_user, get_current_user_with_escola
from app.database import get_db
from app.edicao_context import get_escola_modalidades_adesao, resolve_edicao_id

router = APIRouter(prefix="/api/esporte-variantes", tags=["esporte-variantes"])
logger = logging.getLogger(__name__)


def _row_to_response(row: dict) -> EsporteVarianteResponse:
    return EsporteVarianteResponse(
        id=str(row["id"]),
        edicao_id=row.get("edicao_id"),
        esporte_id=str(row["esporte_id"]),
        esporte_nome=row.get("esporte_nome"),
        esporte_icone=row.get("esporte_icone"),
        esporte_minimo_atletas=row.get("esporte_minimo_atletas", 1),
        esporte_limite_atletas=row.get("esporte_limite_atletas", 3),
        esporte_requisitos=row.get("esporte_requisitos"),
        esporte_ativa=row.get("esporte_ativa", True),
        categoria_id=str(row["categoria_id"]),
        categoria_nome=row.get("categoria_nome"),
        categoria_idade_min=row.get("categoria_idade_min"),
        categoria_idade_max=row.get("categoria_idade_max"),
        naipe_id=str(row["naipe_id"]),
        naipe_codigo=row.get("naipe_codigo"),
        naipe_nome=row.get("naipe_nome"),
        tipo_modalidade_id=str(row["tipo_modalidade_id"]),
        tipo_modalidade_codigo=row.get("tipo_modalidade_codigo"),
        tipo_modalidade_nome=row.get("tipo_modalidade_nome"),
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
    )


@router.get("", response_model=list[EsporteVarianteResponse])
async def list_esporte_variantes(
    esporte_id: str | None = Query(None, description="Filtrar por esporte"),
    edicao_id: int | None = Query(None, description="Filtrar pela edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista variantes. Opcionalmente filtra por esporte_id."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    if esporte_id:
        sql = """
            SELECT ev.id, ev.edicao_id, ev.esporte_id, ev.categoria_id, ev.naipe_id, ev.tipo_modalidade_id, ev.created_at,
                   e.nome AS esporte_nome, e.icone AS esporte_icone, e.minimo_atletas AS esporte_minimo_atletas, e.limite_atletas AS esporte_limite_atletas,
                   e.requisitos AS esporte_requisitos, e.ativa AS esporte_ativa,
                   c.nome AS categoria_nome, c.idade_min AS categoria_idade_min, c.idade_max AS categoria_idade_max,
                   n.codigo AS naipe_codigo, n.nome AS naipe_nome,
                   tm.codigo AS tipo_modalidade_codigo, tm.nome AS tipo_modalidade_nome
            FROM esporte_variantes ev
            JOIN esportes e ON e.id = ev.esporte_id
            JOIN categorias c ON c.id = ev.categoria_id
            JOIN naipes n ON n.id = ev.naipe_id
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE ev.esporte_id = %s AND ev.edicao_id = %s
            ORDER BY e.nome, c.idade_min, n.codigo, tm.codigo
            """
        params = (esporte_id, resolved_edicao_id)
    else:
        sql = """
            SELECT ev.id, ev.edicao_id, ev.esporte_id, ev.categoria_id, ev.naipe_id, ev.tipo_modalidade_id, ev.created_at,
                   e.nome AS esporte_nome, e.icone AS esporte_icone, e.minimo_atletas AS esporte_minimo_atletas, e.limite_atletas AS esporte_limite_atletas,
                   e.requisitos AS esporte_requisitos, e.ativa AS esporte_ativa,
                   c.nome AS categoria_nome, c.idade_min AS categoria_idade_min, c.idade_max AS categoria_idade_max,
                   n.codigo AS naipe_codigo, n.nome AS naipe_nome,
                   tm.codigo AS tipo_modalidade_codigo, tm.nome AS tipo_modalidade_nome
            FROM esporte_variantes ev
            JOIN esportes e ON e.id = ev.esporte_id
            JOIN categorias c ON c.id = ev.categoria_id
            JOIN naipes n ON n.id = ev.naipe_id
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE ev.edicao_id = %s
            ORDER BY e.nome, c.idade_min, n.codigo, tm.codigo
            """
        params = (resolved_edicao_id,)

    async with conn.cursor() as cur:
        await cur.execute(sql, params)
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/minha-escola", response_model=list[EsporteVarianteResponse])
async def list_variantes_minha_escola(
    edicao_id: int | None = Query(None, description="Filtra pelo vínculo da escola na edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Lista variantes em que a escola do usuário está vinculada. Apenas para Diretor/Coordenador."""
    if current_user.get("role") not in ("DIRETOR", "COORDENADOR"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint é exclusivo para Diretores e Coordenadores.",
        )
    escola_id = current_user.get("escola_id")
    if not escola_id:
        return []
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    variante_ids = await get_escola_modalidades_adesao(conn, escola_id, resolved_edicao_id)
    if not variante_ids:
        return []

    sql = """
        SELECT ev.id, ev.edicao_id, ev.esporte_id, ev.categoria_id, ev.naipe_id, ev.tipo_modalidade_id, ev.created_at,
               e.nome AS esporte_nome, e.icone AS esporte_icone, e.minimo_atletas AS esporte_minimo_atletas, e.limite_atletas AS esporte_limite_atletas,
               e.requisitos AS esporte_requisitos, e.ativa AS esporte_ativa,
               c.nome AS categoria_nome, c.idade_min AS categoria_idade_min, c.idade_max AS categoria_idade_max,
               n.codigo AS naipe_codigo, n.nome AS naipe_nome,
               tm.codigo AS tipo_modalidade_codigo, tm.nome AS tipo_modalidade_nome
        FROM esporte_variantes ev
        JOIN esportes e ON e.id = ev.esporte_id
        JOIN categorias c ON c.id = ev.categoria_id
        JOIN naipes n ON n.id = ev.naipe_id
        JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
        WHERE ev.id = ANY(%s)
          AND ev.edicao_id = %s
        ORDER BY e.nome, c.idade_min, n.codigo, tm.codigo
    """
    async with conn.cursor() as cur:
        await cur.execute(sql, (variante_ids, resolved_edicao_id))
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/{variante_id}", response_model=EsporteVarianteResponse)
async def get_esporte_variante(
    variante_id: str,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Obtém variante por ID."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT ev.id, ev.edicao_id, ev.esporte_id, ev.categoria_id, ev.naipe_id, ev.tipo_modalidade_id, ev.created_at,
                   e.nome AS esporte_nome, e.icone AS esporte_icone, e.minimo_atletas AS esporte_minimo_atletas, e.limite_atletas AS esporte_limite_atletas,
                   e.requisitos AS esporte_requisitos, e.ativa AS esporte_ativa,
                   c.nome AS categoria_nome, c.idade_min AS categoria_idade_min, c.idade_max AS categoria_idade_max,
                   n.codigo AS naipe_codigo, n.nome AS naipe_nome,
                   tm.codigo AS tipo_modalidade_codigo, tm.nome AS tipo_modalidade_nome
            FROM esporte_variantes ev
            JOIN esportes e ON e.id = ev.esporte_id
            JOIN categorias c ON c.id = ev.categoria_id
            JOIN naipes n ON n.id = ev.naipe_id
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE ev.id = %s AND ev.edicao_id = %s
            """,
            (variante_id, resolved_edicao_id),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante não encontrada")
    return _row_to_response(row)


@router.post("", response_model=EsporteVarianteResponse, status_code=status.HTTP_201_CREATED)
async def create_esporte_variante(
    data: EsporteVarianteCreate,
    edicao_id: int | None = Query(None, description="Edição da variante; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cria nova variante (requer autenticação)."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT limite_atletas FROM esportes WHERE id = %s AND edicao_id = %s",
            (data.esporte_id, resolved_edicao_id),
        )
        row_esp = await cur.fetchone()
        if not row_esp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esporte não encontrado(a) na edição informada")
        limite = int(row_esp["limite_atletas"] or 1)
        await cur.execute("SELECT codigo FROM tipos_modalidade WHERE id = %s", (data.tipo_modalidade_id,))
        row_tipo = await cur.fetchone()
        if not row_tipo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de modalidade não encontrado(a)")
        cod = row_tipo["codigo"]
        if cod in ("INDIVIDUAIS", "COLETIVAS"):
            if limite <= 1 and cod == "COLETIVAS":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Esporte com limite de 1 atleta é individual; não use tipo coletivo.",
                )
            if limite > 1 and cod == "INDIVIDUAIS":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Esporte com mais de um atleta por equipe é coletivo; não use tipo individual.",
                )
        for tbl, val, name in [
            ("categorias", data.categoria_id, "Categoria"),
            ("naipes", data.naipe_id, "Naipe"),
        ]:
            await cur.execute(f"SELECT id FROM {tbl} WHERE id = %s", (val,))
            if not await cur.fetchone():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{name} não encontrado(a)")

        await cur.execute(
            """
            INSERT INTO esporte_variantes (esporte_id, categoria_id, naipe_id, tipo_modalidade_id, edicao_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, edicao_id, esporte_id, categoria_id, naipe_id, tipo_modalidade_id, created_at
            """,
            (data.esporte_id, data.categoria_id, data.naipe_id, data.tipo_modalidade_id, resolved_edicao_id),
        )
        row = await cur.fetchone()
        await conn.commit()
        variante_id = str(row["id"])

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT ev.id, ev.edicao_id, ev.esporte_id, ev.categoria_id, ev.naipe_id, ev.tipo_modalidade_id, ev.created_at,
                   e.nome AS esporte_nome, e.icone AS esporte_icone, e.minimo_atletas AS esporte_minimo_atletas, e.limite_atletas AS esporte_limite_atletas,
                   e.requisitos AS esporte_requisitos, e.ativa AS esporte_ativa,
                   c.nome AS categoria_nome, c.idade_min AS categoria_idade_min, c.idade_max AS categoria_idade_max,
                   n.codigo AS naipe_codigo, n.nome AS naipe_nome,
                   tm.codigo AS tipo_modalidade_codigo, tm.nome AS tipo_modalidade_nome
            FROM esporte_variantes ev
            JOIN esportes e ON e.id = ev.esporte_id
            JOIN categorias c ON c.id = ev.categoria_id
            JOIN naipes n ON n.id = ev.naipe_id
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE ev.id = %s AND ev.edicao_id = %s
            """,
            (variante_id, resolved_edicao_id),
        )
        row = await cur.fetchone()
    return _row_to_response(row)


@router.delete("/{variante_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_esporte_variante(
    variante_id: str,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove variante (requer autenticação)."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT COUNT(*) AS cnt FROM equipes WHERE esporte_variante_id = %s AND edicao_id = %s",
            (variante_id, resolved_edicao_id),
        )
        r = await cur.fetchone()
        if r and r["cnt"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Não é possível excluir: existem {r['cnt']} equipe(s) vinculada(s) a esta variante",
            )
        await cur.execute(
            "DELETE FROM esporte_variantes WHERE id = %s AND edicao_id = %s RETURNING id",
            (variante_id, resolved_edicao_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante não encontrada")
        await conn.commit()
