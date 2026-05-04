"""
Roteador de campeonatos: CRUD administrativo inicial (Fase 1).
"""
from math import log2

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
    CampeonatoManualClassificacaoInput,
    CampeonatoManualClassificacaoResponse,
    CampeonatoManualClassificacaoUpdate,
    CampeonatoManualConfrontoInput,
    CampeonatoManualConfrontoResponse,
    CampeonatoManualConfrontoUpdate,
    CampeonatoManualCreate,
    CampeonatoManualDetalheResponse,
    CampeonatoManualParticipanteResponse,
    CampeonatoPartidaResponse,
    CampeonatoResponse,
    EquipeDaVarianteResponse,
    EsporteConfigPontuacaoResponse,
    EstruturaGruposPreviewResponse,
    PartidaAgendamentoInput,
    PartidaResultadoInput,
    WildcardCandidatoInfo,
)
from app.services.chaveamentos_service import (
    _fase_por_tamanho_chave,
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
        origem=row.get("origem") or "AUTOMATICO",
        formato=row["formato"],
        grupo_tamanho_ideal=row["grupo_tamanho_ideal"],
        classificam_por_grupo=row["classificam_por_grupo"],
        permite_melhores_terceiros=row["permite_melhores_terceiros"],
        tem_fase_grupos=row.get("tem_fase_grupos"),
        vagas_eliminatoria=row.get("vagas_eliminatoria"),
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
        SELECT c.id, c.uuid, c.edicao_id, c.esporte_variante_id, c.nome, c.status, c.origem, c.formato,
               c.grupo_tamanho_ideal, c.classificam_por_grupo, c.permite_melhores_terceiros,
               c.tem_fase_grupos, c.vagas_eliminatoria,
               c.geracao_autorizada_em, c.geracao_autorizada_por, c.geracao_executada_em, c.geracao_executada_por,
               c.created_at, c.updated_at,
               esp.nome AS esporte_nome,
               cat.nome AS categoria_nome,
               nai.nome AS naipe_nome,
               tm.nome AS tipo_modalidade_nome,
               (CASE
                    WHEN c.origem = 'MANUAL'
                    THEN (SELECT COUNT(*)::int
                          FROM campeonato_manual_participantes cmp
                          WHERE cmp.campeonato_id = c.id)
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


def _iso(value) -> str | None:
    return value.isoformat() if value else None


def _manual_participante_response(row: dict) -> CampeonatoManualParticipanteResponse:
    return CampeonatoManualParticipanteResponse(
        id=row["id"],
        campeonato_id=row["campeonato_id"],
        equipe_id=row.get("equipe_id"),
        escola_id=row.get("escola_id"),
        nome_exibicao=row["nome_exibicao"],
        ordem=row["ordem"],
        created_at=_iso(row.get("created_at")),
        updated_at=_iso(row.get("updated_at")),
    )


def _manual_confronto_response(row: dict) -> CampeonatoManualConfrontoResponse:
    return CampeonatoManualConfrontoResponse(
        id=row["id"],
        campeonato_id=row["campeonato_id"],
        fase=row["fase"],
        rodada=row["rodada"],
        participante_a_id=row.get("participante_a_id"),
        participante_b_id=row.get("participante_b_id"),
        participante_a_nome=row.get("participante_a_nome"),
        participante_b_nome=row.get("participante_b_nome"),
        vencedor_participante_id=row.get("vencedor_participante_id"),
        vencedor_nome=row.get("vencedor_nome"),
        inicio_em=_iso(row.get("inicio_em")),
        placar_a=row.get("placar_a"),
        placar_b=row.get("placar_b"),
        placar_a_sec=row.get("placar_a_sec"),
        placar_b_sec=row.get("placar_b_sec"),
        resultado_tipo=row.get("resultado_tipo"),
        ordem=row["ordem"],
        created_at=_iso(row.get("created_at")),
        updated_at=_iso(row.get("updated_at")),
    )


def _manual_classificacao_response(row: dict) -> CampeonatoManualClassificacaoResponse:
    return CampeonatoManualClassificacaoResponse(
        id=row["id"],
        campeonato_id=row["campeonato_id"],
        grupo_nome=row["grupo_nome"],
        participante_id=row.get("participante_id"),
        nome_exibicao=row.get("nome_exibicao"),
        posicao=row["posicao"],
        pontos=row.get("pontos"),
        vitorias=row.get("vitorias"),
        empates=row.get("empates"),
        derrotas=row.get("derrotas"),
        pro=row.get("pro"),
        contra=row.get("contra"),
        saldo=row.get("saldo"),
        observacao=row.get("observacao"),
        ordem=row["ordem"],
        created_at=_iso(row.get("created_at")),
        updated_at=_iso(row.get("updated_at")),
    )


async def _assert_manual_campeonato(conn: psycopg.AsyncConnection, campeonato_id: int, edicao_id: int) -> dict:
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, edicao_id),
        )
        camp = await cur.fetchone()
    if not camp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
    if camp.get("origem") != "MANUAL":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Operação permitida apenas para campeonatos manuais.")
    return dict(camp)


async def _assert_automatico_campeonato(conn: psycopg.AsyncConnection, campeonato_id: int, edicao_id: int) -> dict:
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, edicao_id),
        )
        camp = await cur.fetchone()
    if not camp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
    if camp.get("origem") == "MANUAL":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Use os endpoints manuais para campeonatos cadastrados manualmente.")
    return dict(camp)


async def _manual_participante_ids_validos(
    conn: psycopg.AsyncConnection,
    campeonato_id: int,
    ids: list[int],
) -> None:
    ids = [i for i in ids if i is not None]
    if not ids:
        return
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id
            FROM campeonato_manual_participantes
            WHERE campeonato_id = %s AND id = ANY(%s)
            """,
            (campeonato_id, ids),
        )
        encontrados = {int(r["id"]) for r in await cur.fetchall()}
    invalidos = sorted(set(ids) - encontrados)
    if invalidos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Participantes inválidos: {invalidos}")


async def _get_manual_detalhe(conn: psycopg.AsyncConnection, campeonato_id: int) -> CampeonatoManualDetalheResponse:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT *
            FROM campeonato_manual_participantes
            WHERE campeonato_id = %s
            ORDER BY ordem, id
            """,
            (campeonato_id,),
        )
        participantes = [_manual_participante_response(dict(r)) for r in await cur.fetchall()]

        await cur.execute(
            """
            SELECT cmc.*,
                   COALESCE(pa.nome_exibicao, cmc.participante_a_nome) AS participante_a_nome,
                   COALESCE(pb.nome_exibicao, cmc.participante_b_nome) AS participante_b_nome,
                   COALESCE(pv.nome_exibicao, cmc.vencedor_nome) AS vencedor_nome
            FROM campeonato_manual_confrontos cmc
            LEFT JOIN campeonato_manual_participantes pa ON pa.id = cmc.participante_a_id
            LEFT JOIN campeonato_manual_participantes pb ON pb.id = cmc.participante_b_id
            LEFT JOIN campeonato_manual_participantes pv ON pv.id = cmc.vencedor_participante_id
            WHERE cmc.campeonato_id = %s
            ORDER BY cmc.fase, cmc.rodada, cmc.ordem, cmc.id
            """,
            (campeonato_id,),
        )
        confrontos = [_manual_confronto_response(dict(r)) for r in await cur.fetchall()]

        await cur.execute(
            """
            SELECT cmcl.*,
                   COALESCE(p.nome_exibicao, cmcl.nome_exibicao) AS nome_exibicao
            FROM campeonato_manual_classificacao cmcl
            LEFT JOIN campeonato_manual_participantes p ON p.id = cmcl.participante_id
            WHERE cmcl.campeonato_id = %s
            ORDER BY cmcl.grupo_nome, cmcl.posicao, cmcl.ordem, cmcl.id
            """,
            (campeonato_id,),
        )
        classificacao = [_manual_classificacao_response(dict(r)) for r in await cur.fetchall()]

    return CampeonatoManualDetalheResponse(
        participantes=participantes,
        confrontos=confrontos,
        classificacao=classificacao,
    )


async def _get_manual_classificacao_rows(conn: psycopg.AsyncConnection, campeonato_id: int, grupo_nome: str | None = None) -> list[dict]:
    params: list[object] = [campeonato_id]
    extra = ""
    if grupo_nome:
        extra = "AND cmcl.grupo_nome = %s"
        params.append(grupo_nome)

    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            SELECT cmcl.*,
                   COALESCE(p.nome_exibicao, cmcl.nome_exibicao) AS nome_exibicao
            FROM campeonato_manual_classificacao cmcl
            LEFT JOIN campeonato_manual_participantes p ON p.id = cmcl.participante_id
            WHERE cmcl.campeonato_id = %s {extra}
            ORDER BY cmcl.posicao, cmcl.ordem, cmcl.id
            """,
            tuple(params),
        )
        rows = await cur.fetchall()

    return [
        {
            "posicao": r["posicao"],
            "equipe_id": r.get("participante_id") or r["id"],
            "nome_escola": r.get("nome_exibicao") or f"Participante {r['id']}",
            "seed": r.get("ordem") or r["posicao"],
            "J": (r.get("vitorias") or 0) + (r.get("empates") or 0) + (r.get("derrotas") or 0),
            "V": r.get("vitorias") or 0,
            "E": r.get("empates") or 0,
            "D": r.get("derrotas") or 0,
            "pts": r.get("pontos") or 0,
            "pro": r.get("pro") or 0,
            "contra": r.get("contra") or 0,
            "saldo": r.get("saldo") if r.get("saldo") is not None else (r.get("pro") or 0) - (r.get("contra") or 0),
            "pro_sec": None,
            "contra_sec": None,
            "grupo_concluido": True,
            "criterio_decisivo": r.get("observacao"),
        }
        for r in rows
    ]


async def _insert_manual_eliminatoria(
    cur: psycopg.AsyncCursor,
    campeonato_id: int,
    slots: list[int | None],
    vagas_bracket: int,
    skeleton_first_round: bool,
) -> None:
    """Gera confrontos eliminatórios em campeonato_manual_confrontos (espelha o pareamento do bracket automático)."""
    total_rodadas = int(log2(vagas_bracket))
    fase_inicial = _fase_por_tamanho_chave(vagas_bracket)
    slots = list(slots[:vagas_bracket])
    while len(slots) < vagas_bracket:
        slots.append(None)

    for idx in range(vagas_bracket // 2):
        slot_a_idx = idx
        slot_b_idx = vagas_bracket - 1 - idx
        mandante = slots[slot_a_idx]
        visitante = slots[slot_b_idx]

        if skeleton_first_round:
            pa_id = pb_id = None
            pa_nome = pb_nome = "A definir"
            vencedor = None
        else:
            pa_id, pb_id = mandante, visitante
            pa_nome = pb_nome = None
            if mandante is None and visitante is None:
                vencedor = None
            elif mandante is None or visitante is None:
                vencedor = mandante or visitante
            else:
                vencedor = None

        await cur.execute(
            """
            INSERT INTO campeonato_manual_confrontos (
                campeonato_id, fase, rodada,
                participante_a_id, participante_b_id,
                participante_a_nome, participante_b_nome,
                vencedor_participante_id, vencedor_nome,
                ordem
            )
            VALUES (%s, %s, 1, %s, %s, %s, %s, %s, NULL, %s)
            """,
            (campeonato_id, fase_inicial, pa_id, pb_id, pa_nome, pb_nome, vencedor, idx + 1),
        )

    partidas_na_rodada = vagas_bracket // 2
    for rodada in range(2, total_rodadas + 1):
        partidas_na_rodada //= 2
        fase_rodada = _fase_por_tamanho_chave(partidas_na_rodada * 2)
        for idx in range(partidas_na_rodada):
            await cur.execute(
                """
                INSERT INTO campeonato_manual_confrontos (
                    campeonato_id, fase, rodada,
                    participante_a_id, participante_b_id,
                    participante_a_nome, participante_b_nome,
                    vencedor_participante_id, vencedor_nome,
                    ordem
                )
                VALUES (%s, %s, %s, NULL, NULL, NULL, NULL, NULL, NULL, %s)
                """,
                (campeonato_id, fase_rodada, rodada, idx + 1),
            )


async def _get_manual_estrutura(conn: psycopg.AsyncConnection, campeonato_id: int) -> CampeonatoEstruturaResponse:
    detalhe = await _get_manual_detalhe(conn, campeonato_id)
    participantes_por_id = {p.id: p for p in detalhe.participantes}

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT cmg.id, cmg.nome, cmg.ordem,
                   ARRAY(
                       SELECT cmgp.participante_id
                       FROM campeonato_manual_grupo_participantes cmgp
                       WHERE cmgp.grupo_id = cmg.id
                       ORDER BY cmgp.seed_no_grupo
                   ) AS participante_ids
            FROM campeonato_manual_grupos cmg
            WHERE cmg.campeonato_id = %s
            ORDER BY cmg.ordem, cmg.id
            """,
            (campeonato_id,),
        )
        manual_grupo_rows = await cur.fetchall()

    if not manual_grupo_rows:
        grupos_nomes = sorted({c.grupo_nome for c in detalhe.classificacao}) or ["Geral"]
        grupos = [
            CampeonatoGrupoResponse(
                id=idx,
                campeonato_id=campeonato_id,
                nome=nome,
                ordem=idx + 1,
                classificados_diretos=0,
                equipes=[
                    CampeonatoGrupoEquipeResponse(
                        equipe_id=p.equipe_id or p.id,
                        escola_id=p.escola_id or 0,
                        nome_escola=p.nome_exibicao,
                        seed_no_grupo=p.ordem,
                    )
                    for p in detalhe.participantes
                ],
            )
            for idx, nome in enumerate(grupos_nomes)
        ]
    else:
        grupos = []
        for row in manual_grupo_rows:
            pids = list(row["participante_ids"] or [])
            equipes_list: list[CampeonatoGrupoEquipeResponse] = []
            for seed_no, pid in enumerate(pids, start=1):
                p = participantes_por_id.get(pid)
                if not p:
                    continue
                equipes_list.append(
                    CampeonatoGrupoEquipeResponse(
                        equipe_id=int(p.equipe_id) if p.equipe_id is not None else p.id,
                        escola_id=int(p.escola_id) if p.escola_id is not None else 0,
                        nome_escola=p.nome_exibicao,
                        seed_no_grupo=seed_no,
                    )
                )
            grupos.append(
                CampeonatoGrupoResponse(
                    id=int(row["id"]),
                    campeonato_id=campeonato_id,
                    nome=row["nome"],
                    ordem=int(row["ordem"]),
                    classificados_diretos=0,
                    equipes=equipes_list,
                )
            )

    partidas = [
        CampeonatoPartidaResponse(
            id=c.id,
            campeonato_id=campeonato_id,
            origem="MANUAL",
            fase=c.fase,
            rodada=c.rodada,
            grupo_id=0 if c.fase == "GRUPOS" else None,
            mandante_equipe_id=None,
            visitante_equipe_id=None,
            vencedor_equipe_id=None,
            is_bye=False,
            origem_slot_a=None,
            origem_slot_b=None,
            inicio_em=c.inicio_em,
            mandante_nome=c.participante_a_nome or (participantes_por_id.get(c.participante_a_id).nome_exibicao if c.participante_a_id in participantes_por_id else None),
            visitante_nome=c.participante_b_nome or (participantes_por_id.get(c.participante_b_id).nome_exibicao if c.participante_b_id in participantes_por_id else None),
            vencedor_nome=c.vencedor_nome or (participantes_por_id.get(c.vencedor_participante_id).nome_exibicao if c.vencedor_participante_id in participantes_por_id else None),
            placar_mandante=c.placar_a,
            placar_visitante=c.placar_b,
            placar_mandante_sec=c.placar_a_sec,
            placar_visitante_sec=c.placar_b_sec,
            resultado_tipo=c.resultado_tipo,
            registrado_em=None,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in detalhe.confrontos
    ]

    return CampeonatoEstruturaResponse(
        campeonato_id=campeonato_id,
        grupos=grupos,
        partidas=partidas,
        wildcard_equipe_ids=[],
        wildcard_ranking=[],
    )


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


@router.post("/manual", response_model=CampeonatoResponse, status_code=status.HTTP_201_CREATED)
async def create_campeonato_manual(
    data: CampeonatoManualCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, data.edicao_id)

    if data.tem_fase_grupos:
        ordered_equipe_ids = [eid for g in (data.grupos or []) for eid in g.equipe_ids]
    else:
        if not data.chaveamento_equipe_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="chaveamento_equipe_ids é obrigatório sem fase de grupos.",
            )
        ordered_equipe_ids = list(data.chaveamento_equipe_ids)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT ev.id,
                   esp.nome AS esporte_nome,
                   cat.nome AS categoria_nome,
                   nai.nome AS naipe_nome
            FROM esporte_variantes ev
            JOIN esportes esp ON esp.id = ev.esporte_id
            JOIN categorias cat ON cat.id = ev.categoria_id
            JOIN naipes nai ON nai.id = ev.naipe_id
            WHERE ev.id = %s AND ev.edicao_id = %s
            """,
            (data.esporte_variante_id, resolved_edicao_id),
        )
        variante = await cur.fetchone()
        if not variante:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante não encontrada na edição selecionada.")

        await cur.execute(
            """
            SELECT eq.id, eq.escola_id, esc.nome_escola
            FROM equipes eq
            JOIN escolas esc ON esc.id = eq.escola_id
            WHERE eq.id = ANY(%s)
              AND eq.esporte_variante_id = %s
              AND eq.edicao_id = %s
            """,
            (ordered_equipe_ids, data.esporte_variante_id, resolved_edicao_id),
        )
        equipes_rows = await cur.fetchall()
        equipes_by_id = {int(r["id"]): dict(r) for r in equipes_rows}
        equipes_validas = set(equipes_by_id)
        invalidas = set(ordered_equipe_ids) - equipes_validas
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
                    edicao_id, esporte_variante_id, nome, status, origem, formato,
                    grupo_tamanho_ideal, classificam_por_grupo, permite_melhores_terceiros,
                    tem_fase_grupos, vagas_eliminatoria
                )
                VALUES (%s, %s, %s, 'GERADO', 'MANUAL', 'GRUPOS_E_MATA_MATA', 4, 1, FALSE, %s, %s)
                RETURNING id
                """,
                (
                    resolved_edicao_id,
                    data.esporte_variante_id,
                    nome,
                    data.tem_fase_grupos,
                    data.vagas_eliminatoria,
                ),
            )
        except psycopg.errors.UniqueViolation:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe campeonato para esta edição e variante.",
            )
        campeonato_id = (await cur.fetchone())["id"]

        for ordem, eid in enumerate(ordered_equipe_ids, start=1):
            equipe = equipes_by_id[eid]
            await cur.execute(
                """
                INSERT INTO campeonato_manual_participantes (campeonato_id, equipe_id, escola_id, nome_exibicao, ordem)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    campeonato_id,
                    equipe["id"],
                    equipe["escola_id"],
                    equipe["nome_escola"],
                    ordem,
                ),
            )

        await cur.execute(
            "SELECT id, equipe_id FROM campeonato_manual_participantes WHERE campeonato_id = %s",
            (campeonato_id,),
        )
        pid_by_equipe = {int(r["equipe_id"]): int(r["id"]) for r in await cur.fetchall()}

        if data.tem_fase_grupos and data.grupos:
            for gi, g in enumerate(data.grupos):
                await cur.execute(
                    """
                    INSERT INTO campeonato_manual_grupos (campeonato_id, nome, ordem)
                    VALUES (%s, %s, %s)
                    RETURNING id
                    """,
                    (campeonato_id, g.nome.strip(), gi + 1),
                )
                gid = (await cur.fetchone())["id"]
                for si, eid in enumerate(g.equipe_ids):
                    await cur.execute(
                        """
                        INSERT INTO campeonato_manual_grupo_participantes (grupo_id, participante_id, seed_no_grupo)
                        VALUES (%s, %s, %s)
                        """,
                        (gid, pid_by_equipe[eid], si + 1),
                    )

        vagas = data.vagas_eliminatoria
        if data.tem_fase_grupos:
            slots: list[int | None] = [None] * vagas
            skeleton_first = True
        else:
            if not data.chaveamento_equipe_ids:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Estado inválido: chaveamento ausente.",
                )
            slots = [pid_by_equipe[eid] for eid in data.chaveamento_equipe_ids]
            skeleton_first = False

        await _insert_manual_eliminatoria(cur, campeonato_id, slots, vagas, skeleton_first)

        await cur.execute(_base_select("WHERE c.id = %s"), (campeonato_id,))
        row = await cur.fetchone()
        await conn.commit()

    await log_audit(
        conn=conn,
        user_id=current_user["id"],
        acao="CREATE",
        tipo_recurso="CAMPEONATO",
        recurso_id=campeonato_id,
        detalhes_depois=dict(row) if row else None,
        mensagem=f"Usuário {current_user['nome']} criou o campeonato manual {nome}.",
    )
    return _row_to_response(dict(row))


@router.get("/{campeonato_id}/manual", response_model=CampeonatoManualDetalheResponse)
async def get_campeonato_manual(
    campeonato_id: int,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    await _assert_manual_campeonato(conn, campeonato_id, resolved_edicao_id)
    return await _get_manual_detalhe(conn, campeonato_id)


@router.post("/{campeonato_id}/manual/confrontos", response_model=CampeonatoManualConfrontoResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_confronto(
    campeonato_id: int,
    data: CampeonatoManualConfrontoInput,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    await _assert_manual_campeonato(conn, campeonato_id, resolved_edicao_id)
    await _manual_participante_ids_validos(
        conn,
        campeonato_id,
        [data.participante_a_id, data.participante_b_id, data.vencedor_participante_id],
    )

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO campeonato_manual_confrontos (
                campeonato_id, fase, rodada, participante_a_id, participante_b_id,
                participante_a_nome, participante_b_nome, vencedor_participante_id, vencedor_nome,
                inicio_em, placar_a, placar_b, placar_a_sec, placar_b_sec, resultado_tipo, ordem
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                campeonato_id, data.fase, data.rodada, data.participante_a_id, data.participante_b_id,
                None, None, data.vencedor_participante_id, None,
                data.inicio_em, data.placar_a, data.placar_b, data.placar_a_sec, data.placar_b_sec, data.resultado_tipo, data.ordem,
            ),
        )
        row = await cur.fetchone()
        await cur.execute(
            "UPDATE campeonatos SET status = 'EM_ANDAMENTO', updated_at = NOW() WHERE id = %s AND status = 'GERADO' AND %s IS NOT NULL",
            (campeonato_id, data.resultado_tipo),
        )
        await conn.commit()
    return _manual_confronto_response(dict(row))


@router.patch("/{campeonato_id}/manual/confrontos/{confronto_id}", response_model=CampeonatoManualConfrontoResponse)
async def update_manual_confronto(
    campeonato_id: int,
    confronto_id: int,
    data: CampeonatoManualConfrontoUpdate,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    await _assert_manual_campeonato(conn, campeonato_id, resolved_edicao_id)
    values = data.model_dump(exclude_unset=True)
    await _manual_participante_ids_validos(
        conn,
        campeonato_id,
        [values.get("participante_a_id"), values.get("participante_b_id"), values.get("vencedor_participante_id")],
    )
    if not values:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum campo para atualizar.")

    sets = [f"{field} = %s" for field in values]
    params = list(values.values()) + [confronto_id, campeonato_id]
    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            UPDATE campeonato_manual_confrontos
            SET {', '.join(sets)}, updated_at = NOW()
            WHERE id = %s AND campeonato_id = %s
            RETURNING *
            """,
            tuple(params),
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Confronto não encontrado.")
        if values.get("resultado_tipo") is not None:
            await cur.execute(
                "UPDATE campeonatos SET status = 'EM_ANDAMENTO', updated_at = NOW() WHERE id = %s AND status = 'GERADO'",
                (campeonato_id,),
            )
        await conn.commit()
    return _manual_confronto_response(dict(row))


@router.delete("/{campeonato_id}/manual/confrontos/{confronto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manual_confronto(
    campeonato_id: int,
    confronto_id: int,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    await _assert_manual_campeonato(conn, campeonato_id, resolved_edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM campeonato_manual_confrontos WHERE id = %s AND campeonato_id = %s RETURNING id",
            (confronto_id, campeonato_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Confronto não encontrado.")
        await conn.commit()


@router.post("/{campeonato_id}/manual/classificacao", response_model=CampeonatoManualClassificacaoResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_classificacao(
    campeonato_id: int,
    data: CampeonatoManualClassificacaoInput,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    await _assert_manual_campeonato(conn, campeonato_id, resolved_edicao_id)
    await _manual_participante_ids_validos(conn, campeonato_id, [data.participante_id])

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO campeonato_manual_classificacao (
                campeonato_id, grupo_nome, participante_id, nome_exibicao, posicao,
                pontos, vitorias, empates, derrotas, pro, contra, saldo, observacao, ordem
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                campeonato_id, data.grupo_nome.strip(), data.participante_id, None,
                data.posicao, data.pontos, data.vitorias, data.empates, data.derrotas,
                data.pro, data.contra, data.saldo, data.observacao, data.ordem,
            ),
        )
        row = await cur.fetchone()
        await conn.commit()
    return _manual_classificacao_response(dict(row))


@router.patch("/{campeonato_id}/manual/classificacao/{classificacao_id}", response_model=CampeonatoManualClassificacaoResponse)
async def update_manual_classificacao(
    campeonato_id: int,
    classificacao_id: int,
    data: CampeonatoManualClassificacaoUpdate,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    await _assert_manual_campeonato(conn, campeonato_id, resolved_edicao_id)
    values = data.model_dump(exclude_unset=True)
    if "participante_id" in values and values["participante_id"] is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A classificação deve referenciar um participante cadastrado.")
    await _manual_participante_ids_validos(conn, campeonato_id, [values.get("participante_id")])
    if "grupo_nome" in values and values["grupo_nome"] is not None:
        values["grupo_nome"] = values["grupo_nome"].strip()
    if not values:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum campo para atualizar.")

    sets = [f"{field} = %s" for field in values]
    params = list(values.values()) + [classificacao_id, campeonato_id]
    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            UPDATE campeonato_manual_classificacao
            SET {', '.join(sets)}, updated_at = NOW()
            WHERE id = %s AND campeonato_id = %s
            RETURNING *
            """,
            tuple(params),
        )
        row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classificação não encontrada.")
        await conn.commit()
    return _manual_classificacao_response(dict(row))


@router.delete("/{campeonato_id}/manual/classificacao/{classificacao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manual_classificacao(
    campeonato_id: int,
    classificacao_id: int,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    await _assert_manual_campeonato(conn, campeonato_id, resolved_edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM campeonato_manual_classificacao WHERE id = %s AND campeonato_id = %s RETURNING id",
            (classificacao_id, campeonato_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classificação não encontrada.")
        await conn.commit()


@router.get("/equipes-da-variante", response_model=list[EquipeDaVarianteResponse])
async def get_equipes_da_variante(
    esporte_variante_id: str = Query(..., description="ID da variante"),
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retorna as equipes cadastradas para uma variante, com nome da escola."""
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT ev.id
            FROM esporte_variantes ev
            WHERE ev.id = %s AND ev.edicao_id = %s
            """,
            (esporte_variante_id, resolved_edicao_id),
        )
        if not await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Variante não encontrada na edição selecionada.",
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


@router.delete("/{campeonato_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campeonato(
    campeonato_id: int,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            _base_select("WHERE c.id = %s AND c.edicao_id = %s"),
            (campeonato_id, resolved_edicao_id),
        )
        existing = await cur.fetchone()
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")

        await cur.execute(
            "DELETE FROM campeonatos WHERE id = %s AND edicao_id = %s RETURNING id",
            (campeonato_id, resolved_edicao_id),
        )
        await cur.fetchone()
        await conn.commit()

    await log_audit(
        conn=conn,
        user_id=current_user["id"],
        acao="DELETE",
        tipo_recurso="CAMPEONATO",
        recurso_id=campeonato_id,
        detalhes_antes=dict(existing),
        mensagem=f"Usuário {current_user['nome']} excluiu o campeonato {existing['nome']}.",
    )


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
        if existing.get("origem") == "MANUAL":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campeonatos manuais não usam autorização de geração.")
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
        if existing.get("origem") == "MANUAL":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campeonatos manuais não usam autorização de geração.")
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
        await cur.execute("SELECT id, nome, origem FROM campeonatos WHERE id = %s AND edicao_id = %s", (campeonato_id, resolved_edicao_id))
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
    if existing.get("origem") == "MANUAL":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Campeonatos manuais não usam geração automática de estrutura.")

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
            "SELECT id, origem, vagas_wildcard FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, resolved_edicao_id),
        )
        camp_row = await cur.fetchone()
        if not camp_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
        if camp_row.get("origem") == "MANUAL":
            return await _get_manual_estrutura(conn, campeonato_id)
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
                   cp.inicio_em,
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
            origem="AUTOMATICO",
            fase=r["fase"],
            rodada=r["rodada"],
            grupo_id=r.get("grupo_id"),
            mandante_equipe_id=r.get("mandante_equipe_id"),
            visitante_equipe_id=r.get("visitante_equipe_id"),
            vencedor_equipe_id=r.get("vencedor_equipe_id"),
            is_bye=bool(r.get("is_bye")),
            origem_slot_a=r.get("origem_slot_a"),
            origem_slot_b=r.get("origem_slot_b"),
            inicio_em=r["inicio_em"].isoformat() if r.get("inicio_em") else None,
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
            "SELECT esporte_variante_id, edicao_id, origem FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, resolved_edicao_id),
        )
        camp = await cur.fetchone()
        if not camp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
        if camp.get("origem") == "MANUAL":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato manual não usa configuração automática de pontuação.")

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


@router.patch("/{campeonato_id}/partidas/{partida_id}/agendamento")
async def agendar_partida(
    campeonato_id: int,
    partida_id: int,
    data: PartidaAgendamentoInput,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Define ou remove a data/hora planejada de uma partida."""
    _require_admin(current_user)
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, origem FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, resolved_edicao_id),
        )
        camp = await cur.fetchone()
        if not camp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
        if camp.get("origem") == "MANUAL":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Use os endpoints manuais para agendar confrontos manuais.")

        await cur.execute(
            """
            SELECT id, campeonato_id, is_bye, inicio_em
            FROM campeonato_partidas
            WHERE id = %s AND campeonato_id = %s
            """,
            (partida_id, campeonato_id),
        )
        partida = await cur.fetchone()
        if not partida:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partida não encontrada.")
        if partida["is_bye"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Partida BYE não pode ser agendada.")

        await cur.execute(
            """
            UPDATE campeonato_partidas
            SET inicio_em = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, inicio_em, updated_at
            """,
            (data.inicio_em, partida_id),
        )
        updated = await cur.fetchone()
        await conn.commit()

    await log_audit(
        conn=conn,
        user_id=current_user["id"],
        acao="UPDATE",
        tipo_recurso="CAMPEONATO_PARTIDA",
        recurso_id=partida_id,
        detalhes_antes={
            "campeonato_id": campeonato_id,
            "inicio_em": partida["inicio_em"],
        },
        detalhes_depois={
            "campeonato_id": campeonato_id,
            "inicio_em": updated["inicio_em"],
        },
        mensagem=f"Usuário {current_user['nome']} alterou o agendamento da partida {partida_id}.",
    )

    return {
        "partida_id": updated["id"],
        "inicio_em": updated["inicio_em"].isoformat() if updated.get("inicio_em") else None,
        "updated_at": updated["updated_at"].isoformat() if updated.get("updated_at") else None,
    }


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
            "SELECT id, origem FROM campeonatos WHERE id = %s AND edicao_id = %s",
            (campeonato_id, resolved_edicao_id),
        )
        camp = await cur.fetchone()
        if not camp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
        if camp.get("origem") == "MANUAL":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Use os endpoints manuais para registrar resultados manuais.")

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
            SELECT c.origem
            FROM campeonatos c
            WHERE c.id = %s AND c.edicao_id = %s
            """,
            (campeonato_id, resolved_edicao_id),
        )
        camp = await cur.fetchone()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campeonato não encontrado.",
            )
        if camp.get("origem") == "MANUAL":
            return await _get_manual_classificacao_rows(conn, campeonato_id)

        await cur.execute(
            """
            SELECT cg.id
            FROM campeonato_grupos cg
            WHERE cg.id = %s AND cg.campeonato_id = %s
            """,
            (grupo_id, campeonato_id),
        )
        if not await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Grupo não encontrado neste campeonato.",
            )

    config = await get_config_pontuacao(conn, campeonato_id)
    return await calcular_classificacao_grupo(conn, grupo_id, config)
