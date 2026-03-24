"""
Roteador de campeonatos: CRUD administrativo inicial (Fase 1).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
import psycopg

from app.auth import get_current_user, is_admin
from app.database import get_db, log_audit
from app.edicao_context import resolve_edicao_id
from app.schemas import CampeonatoCreate, CampeonatoListItemResponse, CampeonatoResponse

router = APIRouter(prefix="/api/campeonatos", tags=["campeonatos"])


def _require_admin(current_user: dict) -> None:
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )


def _row_to_list_item(row: dict) -> CampeonatoListItemResponse:
    return CampeonatoListItemResponse(
        id=row["id"],
        uuid=str(row["uuid"]),
        edicao_id=row["edicao_id"],
        esporte_variante_id=str(row["esporte_variante_id"]),
        nome=row["nome"],
        status=row["status"],
        formato=row["formato"],
        grupo_tamanho_ideal=row["grupo_tamanho_ideal"],
        classificam_por_grupo=row["classificam_por_grupo"],
        permite_melhores_terceiros=row["permite_melhores_terceiros"],
        geracao_autorizada_em=row["geracao_autorizada_em"].isoformat() if row.get("geracao_autorizada_em") else None,
        geracao_autorizada_por=row.get("geracao_autorizada_por"),
        geracao_executada_em=row["geracao_executada_em"].isoformat() if row.get("geracao_executada_em") else None,
        geracao_executada_por=row.get("geracao_executada_por"),
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


def _row_to_response(row: dict) -> CampeonatoResponse:
    base = _row_to_list_item(row)
    return CampeonatoResponse(
        **base.model_dump(),
        esporte_nome=row.get("esporte_nome"),
        categoria_nome=row.get("categoria_nome"),
        naipe_nome=row.get("naipe_nome"),
        tipo_modalidade_nome=row.get("tipo_modalidade_nome"),
    )


def _base_select(where_clause: str = "") -> str:
    return f"""
        SELECT c.id, c.uuid, c.edicao_id, c.esporte_variante_id, c.nome, c.status, c.formato,
               c.grupo_tamanho_ideal, c.classificam_por_grupo, c.permite_melhores_terceiros,
               c.geracao_autorizada_em, c.geracao_autorizada_por, c.geracao_executada_em, c.geracao_executada_por,
               c.created_at, c.updated_at,
               esp.nome AS esporte_nome,
               cat.nome AS categoria_nome,
               nai.nome AS naipe_nome,
               tm.nome AS tipo_modalidade_nome
        FROM campeonatos c
        JOIN esporte_variantes ev ON ev.id = c.esporte_variante_id
        JOIN esportes esp ON esp.id = ev.esporte_id
        JOIN categorias cat ON cat.id = ev.categoria_id
        JOIN naipes nai ON nai.id = ev.naipe_id
        JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
        {where_clause}
    """


@router.post("", response_model=CampeonatoResponse, status_code=status.HTTP_201_CREATED)
async def create_campeonato(
    data: CampeonatoCreate,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, data.edicao_id or edicao_id)

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM esporte_variantes WHERE id = %s", (data.esporte_variante_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante não encontrada.")

        try:
            await cur.execute(
                """
                INSERT INTO campeonatos (
                    edicao_id, esporte_variante_id, nome, status, formato,
                    grupo_tamanho_ideal, classificam_por_grupo, permite_melhores_terceiros
                )
                VALUES (%s, %s, %s, 'RASCUNHO', %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    resolved_edicao_id,
                    data.esporte_variante_id,
                    data.nome.strip(),
                    data.formato,
                    data.grupo_tamanho_ideal,
                    data.classificam_por_grupo,
                    data.permite_melhores_terceiros,
                ),
            )
        except psycopg.errors.UniqueViolation:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe campeonato para esta edição e variante.",
            )

        created = await cur.fetchone()
        if not created:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao criar campeonato.")

        campeonato_id = created["id"]
        await cur.execute(_base_select("WHERE c.id = %s"), (campeonato_id,))
        row = await cur.fetchone()
        await conn.commit()

    if row:
        await log_audit(
            conn=conn,
            user_id=current_user["id"],
            acao="CREATE",
            tipo_recurso="CAMPEONATO",
            recurso_id=campeonato_id,
            detalhes_depois=dict(row),
            mensagem=f"Usuário {current_user['nome']} criou o campeonato {row['nome']}.",
        )

    return _row_to_response(dict(row))


@router.get("", response_model=list[CampeonatoListItemResponse])
async def list_campeonatos(
    edicao_id: int | None = Query(None, description="Filtra por edição; se omitido usa a ativa"),
    esporte_variante_id: str | None = Query(None, description="Filtra por variante"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    where = ["c.edicao_id = %s"]
    params: list[object] = [resolved_edicao_id]
    if esporte_variante_id:
        where.append("c.esporte_variante_id = %s")
        params.append(esporte_variante_id)

    sql = _base_select(f"WHERE {' AND '.join(where)} ORDER BY c.id DESC")
    async with conn.cursor() as cur:
        await cur.execute(sql, tuple(params))
        rows = await cur.fetchall()

    return [_row_to_list_item(dict(r)) for r in rows]


@router.get("/{campeonato_id}", response_model=CampeonatoResponse)
async def get_campeonato(
    campeonato_id: int,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(_base_select("WHERE c.id = %s AND c.edicao_id = %s"), (campeonato_id, resolved_edicao_id))
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")

    return _row_to_response(dict(row))


@router.post("/{campeonato_id}/autorizar-geracao", response_model=CampeonatoResponse)
async def autorizar_geracao(
    campeonato_id: int,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, resolved_edicao_id),
        )
        existing = await cur.fetchone()
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
        if existing["status"] != "RASCUNHO":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A autorização de geração só é permitida para campeonatos em RASCUNHO.",
            )

        await cur.execute(
            """
            UPDATE campeonatos
            SET geracao_autorizada_em = NOW(),
                geracao_autorizada_por = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id
            """,
            (current_user["id"], campeonato_id),
        )
        await cur.fetchone()
        await cur.execute(_base_select("WHERE c.id = %s"), (campeonato_id,))
        row = await cur.fetchone()
        await conn.commit()

    await log_audit(
        conn=conn,
        user_id=current_user["id"],
        acao="UPDATE",
        tipo_recurso="CAMPEONATO",
        recurso_id=campeonato_id,
        detalhes_antes=dict(existing),
        detalhes_depois=dict(row) if row else None,
        mensagem=f"Usuário {current_user['nome']} autorizou a geração do campeonato {existing['nome']}.",
    )
    return _row_to_response(dict(row))


@router.post("/{campeonato_id}/revogar-autorizacao", response_model=CampeonatoResponse)
async def revogar_autorizacao(
    campeonato_id: int,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, resolved_edicao_id),
        )
        existing = await cur.fetchone()
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
        if existing["status"] != "RASCUNHO" or existing.get("geracao_executada_em") is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Só é possível revogar autorização antes da geração da estrutura.",
            )

        await cur.execute(
            """
            UPDATE campeonatos
            SET geracao_autorizada_em = NULL,
                geracao_autorizada_por = NULL,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id
            """,
            (campeonato_id,),
        )
        await cur.fetchone()
        await cur.execute(_base_select("WHERE c.id = %s"), (campeonato_id,))
        row = await cur.fetchone()
        await conn.commit()

    await log_audit(
        conn=conn,
        user_id=current_user["id"],
        acao="UPDATE",
        tipo_recurso="CAMPEONATO",
        recurso_id=campeonato_id,
        detalhes_antes=dict(existing),
        detalhes_depois=dict(row) if row else None,
        mensagem=f"Usuário {current_user['nome']} revogou a autorização de geração do campeonato {existing['nome']}.",
    )
    return _row_to_response(dict(row))
