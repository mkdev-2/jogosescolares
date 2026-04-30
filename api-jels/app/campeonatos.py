"""
Roteador de campeonatos: CRUD administrativo inicial (Fase 1).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
import psycopg

from app.auth import get_current_user, is_admin
from app.database import get_db, log_audit
from app.edicao_context import resolve_edicao_id
from app.schemas import (
    CampeonatoAutoCreate,
    CampeonatoComSorteioCreate,
    CampeonatoCreate,
    CampeonatoEstruturaResponse,
    CampeonatoGrupoEquipeResponse,
    CampeonatoGrupoResponse,
    CampeonatoListItemResponse,
    CampeonatoPartidaResponse,
    CampeonatoResponse,
    EquipeDaVarianteResponse,
    EsporteConfigPontuacaoResponse,
    EstruturaGruposPreviewResponse,
    PartidaResultadoInput,
    WildcardCandidatoInfo,
)
from app.services.chaveamentos_service import (
    calcular_distribuicao_grupos,
    gerar_estrutura_campeonato,
    gerar_estrutura_direto,
    gerar_partidas_para_grupos_existentes,
)
from app.services.pontuacao_service import (
    get_config_pontuacao,
    calcular_classificacao_grupo,
    calcular_ranking_wildcards,
    verificar_grupo_concluido,
    avancar_classificados_para_mata_mata,
    avancar_vencedor_knockout,
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
        num_equipes=row.get("num_equipes") or 0,
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
               tm.nome AS tipo_modalidade_nome,
               (CASE
                    WHEN EXISTS (SELECT 1 FROM campeonato_grupos WHERE campeonato_id = c.id)
                    THEN (SELECT COUNT(DISTINCT cge.equipe_id)::int
                          FROM campeonato_grupo_equipes cge
                          JOIN campeonato_grupos cg2 ON cg2.id = cge.grupo_id
                          WHERE cg2.campeonato_id = c.id)
                    ELSE (SELECT COUNT(DISTINCT equipe_id)::int FROM (
                              SELECT mandante_equipe_id AS equipe_id
                              FROM campeonato_partidas
                              WHERE campeonato_id = c.id AND mandante_equipe_id IS NOT NULL
                              UNION
                              SELECT visitante_equipe_id
                              FROM campeonato_partidas
                              WHERE campeonato_id = c.id AND visitante_equipe_id IS NOT NULL
                          ) AS t)
                END) AS num_equipes
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


@router.get("/estrutura-grupos-preview", response_model=EstruturaGruposPreviewResponse)
async def get_estrutura_grupos_preview(
    esporte_variante_id: str = Query(..., description="ID da variante COLETIVA"),
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    total_equipes: int | None = Query(None, description="Total real de equipes confirmadas; se omitido conta do banco"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Calcula e retorna a estrutura de grupos pré-definida para a variante.
    Usado pelo frontend do sorteio manual para montar a UI antes do usuário
    alocar equipes nos grupos.
    """
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

        if total_equipes is None:
            await cur.execute(
                "SELECT COUNT(*) AS total FROM equipes WHERE esporte_variante_id = %s AND edicao_id = %s",
                (esporte_variante_id, resolved_edicao_id),
            )
            total_equipes = int((await cur.fetchone())["total"])

    if total_equipes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhuma equipe inscrita para esta variante na edição.",
        )

    if total_equipes == 1:
        return EstruturaGruposPreviewResponse(
            total_equipes=1,
            regra="DIRETO",
            tamanhos_grupos=[],
            classificados_por_grupo=[],
            vagas_bracket=1,
            vagas_wildcard=0,
        )

    if total_equipes in (2, 4):
        return EstruturaGruposPreviewResponse(
            total_equipes=total_equipes,
            regra="DIRETO",
            tamanhos_grupos=[],
            classificados_por_grupo=[],
            vagas_bracket=total_equipes,
            vagas_wildcard=0,
        )

    if total_equipes in (3, 5):
        return EstruturaGruposPreviewResponse(
            total_equipes=total_equipes,
            regra="UNICO",
            tamanhos_grupos=[total_equipes],
            classificados_por_grupo=[2],
            vagas_bracket=2,
            vagas_wildcard=0,
        )

    dist = calcular_distribuicao_grupos(total_equipes)
    return EstruturaGruposPreviewResponse(
        total_equipes=total_equipes,
        regra=dist["regra"],
        tamanhos_grupos=dist["tamanhos"],
        classificados_por_grupo=dist["classificados_por_grupo"],
        vagas_bracket=dist["vagas_bracket"],
        vagas_wildcard=dist["vagas_wildcard"],
    )


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

    if total_equipes < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="São necessárias ao menos 3 equipes para criar um campeonato com sorteio manual.",
        )
    if len(set(all_equipe_ids)) != total_equipes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A mesma equipe foi alocada em mais de um grupo.",
        )

    # Calcula a estrutura esperada e valida que os grupos enviados batem com ela
    if total_equipes in (3, 5):
        regra_distrib = "UNICO"
        vagas_bracket_calc = 2
        vagas_wc_calc = 0
        tamanhos_esperados = [total_equipes]
        classificados_por_grupo_calc = [2]
    elif total_equipes >= 6:
        dist = calcular_distribuicao_grupos(total_equipes)
        regra_distrib = dist["regra"]
        vagas_bracket_calc = dist["vagas_bracket"]
        vagas_wc_calc = dist["vagas_wildcard"]
        tamanhos_esperados = dist["tamanhos"]
        classificados_por_grupo_calc = dist["classificados_por_grupo"]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="N=2 e N=4 não utilizam fase de grupos. Use a geração automática.",
        )

    tamanhos_recebidos = sorted([len(g.equipes) for g in data.grupos])
    tamanhos_esperados_sorted = sorted(tamanhos_esperados)
    if tamanhos_recebidos != tamanhos_esperados_sorted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Tamanho dos grupos incompatível com a regra calculada. "
                f"Esperado: {tamanhos_esperados_sorted}, recebido: {tamanhos_recebidos}."
            ),
        )

    # Monta mapa de classificados por tamanho de grupo para atribuição
    tamanho_para_classif: dict[int, int] = {}
    for t, c in zip(tamanhos_esperados, classificados_por_grupo_calc):
        tamanho_para_classif[t] = c

    campeonato_id: int

    async with conn.transaction():
        async with conn.cursor() as cur:
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

            await cur.execute(
                "SELECT id FROM campeonatos WHERE edicao_id = %s AND esporte_variante_id = %s",
                (resolved_edicao_id, data.esporte_variante_id),
            )
            if await cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Já existe campeonato para esta edição e variante.",
                )

            await cur.execute(
                "SELECT id FROM equipes WHERE id = ANY(%s) AND esporte_variante_id = %s AND edicao_id = %s",
                (all_equipe_ids, data.esporte_variante_id, resolved_edicao_id),
            )
            equipes_validas = {int(r["id"]) for r in await cur.fetchall()}
            invalidas = set(all_equipe_ids) - equipes_validas
            if invalidas:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Equipes não pertencem a esta variante/edição: {sorted(invalidas)}",
                )

            nome = (
                f"{variante['esporte_nome']} – "
                f"{variante['naipe_nome']} – "
                f"{variante['categoria_nome']}"
            )

            await cur.execute(
                """
                INSERT INTO campeonatos (
                    edicao_id, esporte_variante_id, nome, status, formato,
                    grupo_tamanho_ideal, classificam_por_grupo, permite_melhores_terceiros,
                    regra_distribuicao, vagas_bracket, vagas_wildcard,
                    geracao_autorizada_em, geracao_autorizada_por
                )
                VALUES (%s, %s, %s, 'RASCUNHO', 'GRUPOS_E_MATA_MATA', 4, 2, FALSE,
                        %s, %s, %s, NOW(), %s)
                RETURNING id
                """,
                (
                    resolved_edicao_id, data.esporte_variante_id, nome,
                    regra_distrib, vagas_bracket_calc, vagas_wc_calc,
                    current_user["id"],
                ),
            )
            campeonato_id = (await cur.fetchone())["id"]

            for idx, grupo_input in enumerate(data.grupos):
                tamanho_grupo = len(grupo_input.equipes)
                classif_diretos = tamanho_para_classif.get(tamanho_grupo, 1)
                await cur.execute(
                    """
                    INSERT INTO campeonato_grupos (campeonato_id, nome, ordem, classificados_diretos)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (campeonato_id, chr(ord("A") + idx), idx + 1, classif_diretos),
                )
                grupo_id = (await cur.fetchone())["id"]

                for seed_idx, equipe_id in enumerate(grupo_input.equipes, start=1):
                    await cur.execute(
                        "INSERT INTO campeonato_grupo_equipes (grupo_id, equipe_id, seed_no_grupo) VALUES (%s, %s, %s)",
                        (grupo_id, equipe_id, seed_idx),
                    )

            await gerar_partidas_para_grupos_existentes(
                conn=conn,
                campeonato_id=campeonato_id,
                executor_user_id=current_user["id"],
            )

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


@router.post("/criar-automatico", response_model=CampeonatoResponse, status_code=status.HTTP_201_CREATED)
async def criar_automatico(
    data: CampeonatoAutoCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Cria campeonato COLETIVO com chave direta (N=1, N=2 ou N=4), sem fase de grupos.
    """
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, data.edicao_id)

    total_equipes = len(data.equipe_ids)
    if total_equipes not in (1, 2, 4):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Criação automática disponível apenas para N=1, N=2 ou N=4 equipes.",
        )
    if len(set(data.equipe_ids)) != total_equipes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lista de equipes contém IDs duplicados.",
        )

    campeonato_id: int
    nome: str

    async with conn.transaction():
        async with conn.cursor() as cur:
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

            await cur.execute(
                "SELECT id FROM campeonatos WHERE edicao_id = %s AND esporte_variante_id = %s",
                (resolved_edicao_id, data.esporte_variante_id),
            )
            if await cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Já existe campeonato para esta edição e variante.",
                )

            await cur.execute(
                "SELECT id FROM equipes WHERE id = ANY(%s) AND esporte_variante_id = %s AND edicao_id = %s",
                (data.equipe_ids, data.esporte_variante_id, resolved_edicao_id),
            )
            equipes_validas = {int(r["id"]) for r in await cur.fetchall()}
            invalidas = set(data.equipe_ids) - equipes_validas
            if invalidas:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Equipes não pertencem a esta variante/edição: {sorted(invalidas)}",
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
                        grupo_tamanho_ideal, classificam_por_grupo, permite_melhores_terceiros
                    )
                    VALUES (%s, %s, %s, 'RASCUNHO', 'GRUPOS_E_MATA_MATA', 4, 2, FALSE)
                    RETURNING id
                    """,
                    (resolved_edicao_id, data.esporte_variante_id, nome),
                )
            except psycopg.errors.UniqueViolation:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Já existe campeonato para esta edição e variante.",
                )
            campeonato_id = (await cur.fetchone())["id"]

            await gerar_estrutura_direto(conn, campeonato_id, data.equipe_ids, current_user["id"])

            await cur.execute(_base_select("WHERE c.id = %s"), (campeonato_id,))
            row = await cur.fetchone()

    await log_audit(
        conn=conn,
        user_id=current_user["id"],
        acao="CREATE",
        tipo_recurso="CAMPEONATO",
        recurso_id=campeonato_id,
        detalhes_depois={"total_equipes": total_equipes},
        mensagem=f"Usuário {current_user['nome']} criou o campeonato '{nome}' com geração automática (N={total_equipes}).",
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


@router.post("/{campeonato_id}/cancelar", response_model=CampeonatoResponse)
async def cancelar_campeonato(
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
        if existing["status"] in ("FINALIZADO", "CANCELADO"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Campeonato já está {existing['status'].lower()} e não pode ser cancelado.",
            )

        await cur.execute(
            """
            UPDATE campeonatos
            SET status = 'CANCELADO', updated_at = NOW()
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
        mensagem=f"Usuário {current_user['nome']} cancelou o campeonato {existing['nome']}.",
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
        await cur.execute(
            "SELECT id, vagas_wildcard FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, resolved_edicao_id),
        )
        camp_row = await cur.fetchone()
        if not camp_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
        vagas_wildcard_camp = int(camp_row["vagas_wildcard"] or 0)

        await cur.execute(
            """
            SELECT id, campeonato_id, nome, ordem, classificados_diretos, created_at
            FROM campeonato_grupos
            WHERE campeonato_id = %s
            ORDER BY ordem
            """,
            (campeonato_id,),
        )
        grupos_rows = await cur.fetchall()

        grupo_ids = [r["id"] for r in grupos_rows]

        # Equipes de cada grupo (com nome da escola)
        equipes_por_grupo: dict[int, list] = {gid: [] for gid in grupo_ids}
        if grupo_ids:
            await cur.execute(
                """
                SELECT cge.grupo_id, cge.equipe_id, cge.seed_no_grupo,
                       eq.escola_id, esc.nome_escola
                FROM campeonato_grupo_equipes cge
                JOIN equipes eq ON eq.id = cge.equipe_id
                JOIN escolas esc ON esc.id = eq.escola_id
                WHERE cge.grupo_id = ANY(%s)
                ORDER BY cge.grupo_id, cge.seed_no_grupo
                """,
                (grupo_ids,),
            )
            for r in await cur.fetchall():
                equipes_por_grupo[r["grupo_id"]].append(r)

        await cur.execute(
            """
            SELECT cp.id, cp.campeonato_id, cp.fase, cp.rodada, cp.grupo_id,
                   cp.mandante_equipe_id, cp.visitante_equipe_id, cp.vencedor_equipe_id,
                   cp.is_bye, cp.origem_slot_a, cp.origem_slot_b,
                   cp.placar_mandante, cp.placar_visitante,
                   cp.placar_mandante_sec, cp.placar_visitante_sec,
                   cp.resultado_tipo, cp.registrado_em,
                   cp.created_at, cp.updated_at,
                   esc_m.nome_escola AS mandante_nome,
                   esc_v.nome_escola AS visitante_nome,
                   esc_w.nome_escola AS vencedor_nome
            FROM campeonato_partidas cp
            LEFT JOIN equipes eq_m ON eq_m.id = cp.mandante_equipe_id
            LEFT JOIN escolas esc_m ON esc_m.id = eq_m.escola_id
            LEFT JOIN equipes eq_v ON eq_v.id = cp.visitante_equipe_id
            LEFT JOIN escolas esc_v ON esc_v.id = eq_v.escola_id
            LEFT JOIN equipes eq_w ON eq_w.id = cp.vencedor_equipe_id
            LEFT JOIN escolas esc_w ON esc_w.id = eq_w.escola_id
            WHERE cp.campeonato_id = %s
            ORDER BY
                CASE cp.fase
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
                cp.rodada,
                cp.id
            """,
            (campeonato_id,),
        )
        partidas_rows = await cur.fetchall()

        # Equipes que avançaram via wild card (slots marcados como wildcard e já preenchidos)
        await cur.execute(
            """
            SELECT mandante_equipe_id AS equipe_id
            FROM campeonato_partidas
            WHERE campeonato_id = %s AND mandante_is_wildcard = TRUE AND mandante_equipe_id IS NOT NULL
            UNION ALL
            SELECT visitante_equipe_id AS equipe_id
            FROM campeonato_partidas
            WHERE campeonato_id = %s AND visitante_is_wildcard = TRUE AND visitante_equipe_id IS NOT NULL
            """,
            (campeonato_id, campeonato_id),
        )
        wildcard_rows = await cur.fetchall()
        wildcard_equipe_ids = [int(r["equipe_id"]) for r in wildcard_rows]

    grupos = [
        CampeonatoGrupoResponse(
            id=r["id"],
            campeonato_id=r["campeonato_id"],
            nome=r["nome"],
            ordem=r["ordem"],
            classificados_diretos=r["classificados_diretos"],
            equipes=[
                CampeonatoGrupoEquipeResponse(
                    equipe_id=e["equipe_id"],
                    escola_id=e["escola_id"],
                    nome_escola=e["nome_escola"],
                    seed_no_grupo=e["seed_no_grupo"],
                )
                for e in equipes_por_grupo.get(r["id"], [])
            ],
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
            mandante_nome=r.get("mandante_nome"),
            visitante_nome=r.get("visitante_nome"),
            vencedor_nome=r.get("vencedor_nome"),
            placar_mandante=r.get("placar_mandante"),
            placar_visitante=r.get("placar_visitante"),
            placar_mandante_sec=r.get("placar_mandante_sec"),
            placar_visitante_sec=r.get("placar_visitante_sec"),
            resultado_tipo=r.get("resultado_tipo"),
            registrado_em=r["registrado_em"].isoformat() if r.get("registrado_em") else None,
            created_at=r["created_at"].isoformat() if r.get("created_at") else None,
            updated_at=r["updated_at"].isoformat() if r.get("updated_at") else None,
        )
        for r in partidas_rows
    ]

    config = await get_config_pontuacao(conn, campeonato_id)
    wc_ranking_raw = await calcular_ranking_wildcards(conn, campeonato_id, vagas_wildcard_camp, config)
    wildcard_ranking = [
        WildcardCandidatoInfo(
            equipe_id=e["equipe_id"],
            nome_escola=e["nome_escola"],
            grupo_nome=e["grupo_nome"],
            posicao_no_grupo=e["posicao_no_grupo"],
            pts=e["pts"],
            V=e["V"],
            E=e["E"],
            D=e["D"],
            pro=e["pro"],
            contra=e["contra"],
            saldo=e["saldo"],
            criterio_decisivo=e.get("criterio_decisivo"),
            classificado_wildcard=bool(e.get("classificado_wildcard")),
        )
        for e in wc_ranking_raw
    ]

    return CampeonatoEstruturaResponse(
        campeonato_id=campeonato_id,
        grupos=grupos,
        partidas=partidas,
        wildcard_equipe_ids=wildcard_equipe_ids,
        wildcard_ranking=wildcard_ranking,
    )


@router.get("/{campeonato_id}/config-pontuacao", response_model=EsporteConfigPontuacaoResponse)
async def get_config_pontuacao_endpoint(
    campeonato_id: int,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retorna a configuração de pontuação e desempate do esporte do campeonato."""
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT esporte_variante_id, edicao_id FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, resolved_edicao_id),
        )
        camp = await cur.fetchone()
        if not camp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")

        await cur.execute(
            """
            SELECT ecp.*
            FROM esporte_config_pontuacao ecp
            JOIN esporte_variantes ev ON ev.esporte_id = ecp.esporte_id AND ev.edicao_id = ecp.edicao_id
            WHERE ev.id = %s AND ecp.edicao_id = %s
            """,
            (camp["esporte_variante_id"], resolved_edicao_id),
        )
        config = await cur.fetchone()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuração de pontuação não encontrada para este esporte/edição.",
        )

    return EsporteConfigPontuacaoResponse(
        id=config["id"],
        esporte_id=str(config["esporte_id"]),
        edicao_id=config["edicao_id"],
        unidade_placar=config["unidade_placar"],
        unidade_placar_sec=config.get("unidade_placar_sec"),
        pts_vitoria=config["pts_vitoria"],
        pts_vitoria_parcial=config.get("pts_vitoria_parcial"),
        pts_empate=config["pts_empate"],
        pts_derrota=config["pts_derrota"],
        permite_empate=config["permite_empate"],
        wxo_pts_vencedor=config["wxo_pts_vencedor"],
        wxo_pts_perdedor=config["wxo_pts_perdedor"],
        wxo_placar_pro=config["wxo_placar_pro"],
        wxo_placar_contra=config["wxo_placar_contra"],
        wxo_placar_pro_sec=config.get("wxo_placar_pro_sec"),
        wxo_placar_contra_sec=config.get("wxo_placar_contra_sec"),
        ignorar_placar_extra=config["ignorar_placar_extra"],
        criterios_desempate_2=config["criterios_desempate_2"] or [],
        criterios_desempate_3plus=config["criterios_desempate_3plus"] or [],
    )


@router.patch("/{campeonato_id}/partidas/{partida_id}/resultado")
async def registrar_resultado_partida(
    campeonato_id: int,
    partida_id: int,
    data: PartidaResultadoInput,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Registra o resultado de uma partida.

    Após salvar:
    - Se for partida de grupo e o grupo ficar completo → avança classificados
      para os slots do mata-mata com a classificação real.
    - Se for partida eliminatória → preenche o slot do vencedor na próxima fase.
    """
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, resolved_edicao_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")

        await cur.execute(
            """
            SELECT id, campeonato_id, grupo_id,
                   mandante_equipe_id, visitante_equipe_id,
                   is_bye, resultado_tipo
            FROM campeonato_partidas
            WHERE id = %s AND campeonato_id = %s
            """,
            (partida_id, campeonato_id),
        )
        partida = await cur.fetchone()

    if not partida:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partida não encontrada.")
    if partida["is_bye"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Partida BYE não pode ter resultado registrado.")

    # Determina vencedor a partir do placar
    vencedor_id: int | None = None
    if data.resultado_tipo == "WXO":
        # WxO: o campo vencedor_wxo indica quem vence (MANDANTE ou VISITANTE)
        if data.vencedor_wxo == "VISITANTE":
            vencedor_id = partida["visitante_equipe_id"]
        else:
            vencedor_id = partida["mandante_equipe_id"]
    elif data.resultado_tipo == "NORMAL":
        if data.placar_mandante > data.placar_visitante:
            vencedor_id = partida["mandante_equipe_id"]
        elif data.placar_visitante > data.placar_mandante:
            vencedor_id = partida["visitante_equipe_id"]
        # Empate: vencedor_id permanece NULL

    async with conn.cursor() as cur:
        await cur.execute(
            """
            UPDATE campeonato_partidas
            SET placar_mandante      = %s,
                placar_visitante     = %s,
                placar_mandante_sec  = %s,
                placar_visitante_sec = %s,
                resultado_tipo       = %s,
                vencedor_equipe_id   = %s,
                registrado_em        = NOW(),
                registrado_por       = %s,
                updated_at           = NOW()
            WHERE id = %s
            """,
            (
                data.placar_mandante,
                data.placar_visitante,
                data.placar_mandante_sec,
                data.placar_visitante_sec,
                data.resultado_tipo,
                vencedor_id,
                current_user["id"],
                partida_id,
            ),
        )
        await conn.commit()

    # Transição automática GERADO → EM_ANDAMENTO no primeiro resultado registrado
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE campeonatos SET status = 'EM_ANDAMENTO', updated_at = NOW() WHERE id = %s AND status = 'GERADO'",
            (campeonato_id,),
        )
        await conn.commit()

    grupo_id = partida["grupo_id"]
    config = await get_config_pontuacao(conn, campeonato_id)

    # --- Fase de grupos: verificar se o grupo ficou completo ---
    grupo_concluido = False
    if grupo_id is not None:
        grupo_concluido = await verificar_grupo_concluido(conn, grupo_id)
        if grupo_concluido:
            await avancar_classificados_para_mata_mata(
                conn, campeonato_id, grupo_id, config
            )
            await conn.commit()

    # --- Mata-mata: avançar vencedor para a próxima fase ---
    elif vencedor_id is not None:
        await avancar_vencedor_knockout(conn, campeonato_id, partida_id, vencedor_id)
        await conn.commit()

    # Auto-finalizar quando a FINAL tiver vencedor
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT 1 FROM campeonato_partidas
            WHERE campeonato_id = %s AND fase = 'FINAL' AND vencedor_equipe_id IS NOT NULL
            LIMIT 1
            """,
            (campeonato_id,),
        )
        if await cur.fetchone():
            await cur.execute(
                """
                UPDATE campeonatos SET status = 'FINALIZADO', updated_at = NOW()
                WHERE id = %s AND status IN ('GERADO', 'EM_ANDAMENTO')
                """,
                (campeonato_id,),
            )
            await conn.commit()

    return {
        "partida_id": partida_id,
        "placar_mandante": data.placar_mandante,
        "placar_visitante": data.placar_visitante,
        "resultado_tipo": data.resultado_tipo,
        "vencedor_equipe_id": vencedor_id,
        "grupo_concluido": grupo_concluido,
    }


# ---------------------------------------------------------------------------
# Classificação do grupo
# ---------------------------------------------------------------------------

@router.get("/{campeonato_id}/grupos/{grupo_id}/classificacao")
async def get_classificacao_grupo(
    campeonato_id: int,
    grupo_id: int,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna a tabela classificatória atual do grupo, com pontos e critérios
    de desempate aplicados conforme a config de pontuação do esporte.

    Cada item da lista contém:
      posicao, equipe_id, nome_escola, seed,
      J, V, E, D, pts, pro, contra, saldo, pro_sec, contra_sec.
    """
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    # Valida que o grupo pertence ao campeonato na edição correta
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT cg.id
            FROM campeonato_grupos cg
            JOIN campeonatos c ON c.id = cg.campeonato_id
            WHERE cg.id = %s AND cg.campeonato_id = %s AND c.edicao_id = %s
            """,
            (grupo_id, campeonato_id, resolved_edicao_id),
        )
        if not await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grupo não encontrado neste campeonato.",
            )

    config = await get_config_pontuacao(conn, campeonato_id)
    return await calcular_classificacao_grupo(conn, grupo_id, config)
