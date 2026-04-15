"""
Roteador de campeonatos: CRUD administrativo inicial (Fase 1).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
import psycopg

from app.auth import get_current_user, is_admin
from app.database import get_db, log_audit
from app.edicao_context import resolve_edicao_id
from app.schemas import (
    CampeonatoComSorteioCreate,
    CampeonatoCreate,
    CampeonatoEstruturaResponse,
    CampeonatoGrupoResponse,
    CampeonatoListItemResponse,
    CampeonatoPartidaResponse,
    CampeonatoResponse,
    EquipeDaVarianteResponse,
)
from app.services.chaveamentos_service import (
    gerar_estrutura_campeonato,
    gerar_partidas_para_grupos_existentes,
)

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
        await cur.execute(
            "SELECT id FROM esporte_variantes WHERE id = %s AND edicao_id = %s",
            (data.esporte_variante_id, resolved_edicao_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante não encontrada na edição selecionada.")

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


@router.get("/equipes-da-variante", response_model=list[EquipeDaVarianteResponse])
async def get_equipes_da_variante(
    esporte_variante_id: str = Query(..., description="ID da variante COLETIVA"),
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retorna as equipes cadastradas para uma variante COLETIVA, com nome da escola."""
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT ev.id
            FROM esporte_variantes ev
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE ev.id = %s AND ev.edicao_id = %s AND tm.codigo = 'COLETIVAS'
            """,
            (esporte_variante_id, resolved_edicao_id),
        )
        if not await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variante não encontrada na edição ou não é modalidade COLETIVA.",
            )

        await cur.execute(
            """
            SELECT eq.id, eq.escola_id, esc.nome_escola
            FROM equipes eq
            JOIN escolas esc ON esc.id = eq.escola_id
            WHERE eq.esporte_variante_id = %s AND eq.edicao_id = %s
            ORDER BY esc.nome_escola
            """,
            (esporte_variante_id, resolved_edicao_id),
        )
        rows = await cur.fetchall()

    return [
        EquipeDaVarianteResponse(id=r["id"], escola_id=r["escola_id"], nome_escola=r["nome_escola"])
        for r in rows
    ]


@router.post("/criar-com-sorteio", response_model=CampeonatoResponse, status_code=status.HTTP_201_CREATED)
async def criar_com_sorteio(
    data: CampeonatoComSorteioCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Cria campeonato COLETIVO com grupos e equipes já definidos pelo sorteio manual.
    Gera os confrontos e o bracket de mata-mata atomicamente.
    """
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, data.edicao_id)

    all_equipe_ids = [eid for grupo in data.grupos for eid in grupo.equipes]
    total_equipes = len(all_equipe_ids)

    if total_equipes < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="São necessárias ao menos 6 equipes para criar um campeonato com fase de grupos.",
        )
    if len(set(all_equipe_ids)) != total_equipes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A mesma equipe foi alocada em mais de um grupo.",
        )

    campeonato_id: int

    async with conn.transaction():
        async with conn.cursor() as cur:
            # Valida que a variante é COLETIVAS
            await cur.execute(
                """
                SELECT ev.id,
                       esp.nome AS esporte_nome,
                       cat.nome AS categoria_nome,
                       nai.nome  AS naipe_nome
                FROM esporte_variantes ev
                JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
                JOIN esportes esp        ON esp.id = ev.esporte_id
                JOIN categorias cat      ON cat.id = ev.categoria_id
                JOIN naipes nai          ON nai.id = ev.naipe_id
                WHERE ev.id = %s AND ev.edicao_id = %s AND tm.codigo = 'COLETIVAS'
                """,
                (data.esporte_variante_id, resolved_edicao_id),
            )
            variante = await cur.fetchone()
            if not variante:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Variante não encontrada na edição ou não é modalidade COLETIVA.",
                )

            # Valida que todas as equipes pertencem a esta variante+edição
            await cur.execute(
                "SELECT id FROM equipes WHERE esporte_variante_id = %s AND edicao_id = %s",
                (data.esporte_variante_id, resolved_edicao_id),
            )
            valid_ids = {r["id"] for r in await cur.fetchall()}
            invalidas = [eid for eid in all_equipe_ids if eid not in valid_ids]
            if invalidas:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Equipes não pertencem a esta variante/edição: {invalidas}",
                )

            nome = (
                f"{variante['esporte_nome']} – "
                f"{variante['naipe_nome']} – "
                f"{variante['categoria_nome']}"
            )

            try:
                await cur.execute(
                    """
                    INSERT INTO campeonatos (
                        edicao_id, esporte_variante_id, nome, status, formato,
                        grupo_tamanho_ideal, classificam_por_grupo, permite_melhores_terceiros,
                        geracao_autorizada_em, geracao_autorizada_por
                    )
                    VALUES (%s, %s, %s, 'RASCUNHO', 'GRUPOS_E_MATA_MATA', 4, 2, FALSE, NOW(), %s)
                    RETURNING id
                    """,
                    (resolved_edicao_id, data.esporte_variante_id, nome, current_user["id"]),
                )
            except psycopg.errors.UniqueViolation:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Já existe campeonato para esta edição e variante.",
                )

            campeonato_id = (await cur.fetchone())["id"]

            for idx, grupo_input in enumerate(data.grupos):
                await cur.execute(
                    """
                    INSERT INTO campeonato_grupos (campeonato_id, nome, ordem)
                    VALUES (%s, %s, %s)
                    RETURNING id
                    """,
                    (campeonato_id, chr(ord("A") + idx), idx + 1),
                )
                grupo_id = (await cur.fetchone())["id"]

                for seed_idx, equipe_id in enumerate(grupo_input.equipes, start=1):
                    await cur.execute(
                        """
                        INSERT INTO campeonato_grupo_equipes (grupo_id, equipe_id, seed_no_grupo)
                        VALUES (%s, %s, %s)
                        """,
                        (grupo_id, equipe_id, seed_idx),
                    )

        await gerar_partidas_para_grupos_existentes(
            conn=conn,
            campeonato_id=campeonato_id,
            executor_user_id=current_user["id"],
        )

    async with conn.cursor() as cur:
        await cur.execute(_base_select("WHERE c.id = %s"), (campeonato_id,))
        row = await cur.fetchone()

    await log_audit(
        conn=conn,
        user_id=current_user["id"],
        acao="CREATE",
        tipo_recurso="CAMPEONATO",
        recurso_id=campeonato_id,
        detalhes_depois={"total_grupos": len(data.grupos), "total_equipes": total_equipes},
        mensagem=f"Usuário {current_user['nome']} criou o campeonato '{nome}' via sorteio manual.",
    )

    return _row_to_response(dict(row))


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


@router.post("/{campeonato_id}/gerar-estrutura")
async def gerar_estrutura(
    campeonato_id: int,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute("SELECT id, nome FROM campeonatos WHERE id = %s AND edicao_id = %s", (campeonato_id, resolved_edicao_id))
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")

    resultado = await gerar_estrutura_campeonato(
        conn=conn,
        campeonato_id=campeonato_id,
        executor_user_id=current_user["id"],
    )

    await log_audit(
        conn=conn,
        user_id=current_user["id"],
        acao="UPDATE",
        tipo_recurso="CAMPEONATO",
        recurso_id=campeonato_id,
        detalhes_depois=resultado,
        mensagem=f"Usuário {current_user['nome']} gerou a estrutura do campeonato {existing['nome']}.",
    )
    return resultado


@router.get("/{campeonato_id}/estrutura", response_model=CampeonatoEstruturaResponse)
async def get_estrutura(
    campeonato_id: int,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM campeonatos WHERE id = %s AND edicao_id = %s", (campeonato_id, resolved_edicao_id))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")

        await cur.execute(
            """
            SELECT id, campeonato_id, nome, ordem, created_at
            FROM campeonato_grupos
            WHERE campeonato_id = %s
            ORDER BY ordem
            """,
            (campeonato_id,),
        )
        grupos_rows = await cur.fetchall()

        await cur.execute(
            """
            SELECT id, campeonato_id, fase, rodada, grupo_id,
                   mandante_equipe_id, visitante_equipe_id, vencedor_equipe_id,
                   is_bye, origem_slot_a, origem_slot_b, created_at, updated_at
            FROM campeonato_partidas
            WHERE campeonato_id = %s
            ORDER BY
                CASE fase
                    WHEN 'GRUPOS' THEN 1
                    WHEN 'TRINTA_E_DOIS_AVOS' THEN 2
                    WHEN 'DEZESSEIS_AVOS' THEN 3
                    WHEN 'OITAVAS' THEN 4
                    WHEN 'QUARTAS' THEN 5
                    WHEN 'SEMI' THEN 6
                    WHEN 'FINAL' THEN 7
                    WHEN 'TERCEIRO' THEN 8
                    ELSE 99
                END,
                rodada,
                id
            """,
            (campeonato_id,),
        )
        partidas_rows = await cur.fetchall()

    grupos = [
        CampeonatoGrupoResponse(
            id=r["id"],
            campeonato_id=r["campeonato_id"],
            nome=r["nome"],
            ordem=r["ordem"],
            created_at=r["created_at"].isoformat() if r.get("created_at") else None,
        )
        for r in grupos_rows
    ]
    partidas = [
        CampeonatoPartidaResponse(
            id=r["id"],
            campeonato_id=r["campeonato_id"],
            fase=r["fase"],
            rodada=r["rodada"],
            grupo_id=r.get("grupo_id"),
            mandante_equipe_id=r.get("mandante_equipe_id"),
            visitante_equipe_id=r.get("visitante_equipe_id"),
            vencedor_equipe_id=r.get("vencedor_equipe_id"),
            is_bye=bool(r.get("is_bye")),
            origem_slot_a=r.get("origem_slot_a"),
            origem_slot_b=r.get("origem_slot_b"),
            created_at=r["created_at"].isoformat() if r.get("created_at") else None,
            updated_at=r["updated_at"].isoformat() if r.get("updated_at") else None,
        )
        for r in partidas_rows
    ]

    return CampeonatoEstruturaResponse(
        campeonato_id=campeonato_id,
        grupos=grupos,
        partidas=partidas,
    )
