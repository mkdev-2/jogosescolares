"""
Endpoints públicos de campeonatos — sem autenticação.
Expostos em /api/public/campeonatos para a página de Resultados.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
import psycopg
from psycopg.errors import UndefinedTable

from app.database import get_db
from app.edicao_context import resolve_edicao_id
from app.schemas import (
    ArtilheiroOutput,
    DestaqueEquipeDefesaLanding,
    DestaqueJogoLanding,
    DestaquePontuadorLanding,
    DestaquesCampeonatoLandingItem,
    DestaquesLandingResponse,
)
from app.services.pontuacao_service import (
    calcular_classificacao_grupo,
    calcular_ranking_wildcards,
    get_config_pontuacao,
)
# New import for async DB access
import psycopg
router = APIRouter(prefix="/api/public/campeonatos", tags=["public"])

_STATUSES_VISIVEIS = ("GERADO", "EM_ANDAMENTO", "FINALIZADO")


def _iso(value) -> str | None:
    return value.isoformat() if value else None


def _local_public_from_join_row(r: dict) -> dict | None:
    lid = r.get("loc_join_id")
    if lid is None:
        return None
    return {
        "id": int(lid),
        "nome": r.get("loc_join_nome") or "",
        "endereco_completo": r.get("loc_join_endereco"),
        "foto_url": r.get("loc_join_foto"),
        "link_maps": r.get("loc_join_maps"),
    }


def _row_proximo_confronto_clean(r: dict) -> dict:
    loc = _local_public_from_join_row(r)
    out = {k: v for k, v in r.items() if not str(k).startswith("loc_join")}
    if loc:
        out["local"] = loc
    lid = out.pop("local_id", None)
    if lid is not None:
        out["local_id"] = int(lid)
    out["inicio_em"] = _iso(out.get("inicio_em"))
    return out


async def _manual_classificacao_rows(conn: psycopg.AsyncConnection, campeonato_id: int) -> list[dict]:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT cmcl.*,
                   COALESCE(p.nome_exibicao, cmcl.nome_exibicao) AS nome_exibicao
            FROM campeonato_manual_classificacao cmcl
            LEFT JOIN campeonato_manual_participantes p ON p.id = cmcl.participante_id
            WHERE cmcl.campeonato_id = %s
            ORDER BY cmcl.posicao, cmcl.ordem, cmcl.id
            """,
            (campeonato_id,),
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


async def _manual_estrutura_publica(conn: psycopg.AsyncConnection, campeonato_id: int) -> dict:
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
        participantes = [dict(r) for r in await cur.fetchall()]

        await cur.execute(
            """
            SELECT cmc.*,
                   COALESCE(pa.nome_exibicao, cmc.participante_a_nome) AS participante_a_nome,
                   COALESCE(pb.nome_exibicao, cmc.participante_b_nome) AS participante_b_nome,
                   COALESCE(pv.nome_exibicao, cmc.vencedor_nome) AS vencedor_nome,
                   loc.id AS loc_join_id,
                   loc.nome AS loc_join_nome,
                   loc.endereco_completo AS loc_join_endereco,
                   loc.foto_url AS loc_join_foto,
                   loc.link_maps AS loc_join_maps
            FROM campeonato_manual_confrontos cmc
            LEFT JOIN campeonato_manual_participantes pa ON pa.id = cmc.participante_a_id
            LEFT JOIN campeonato_manual_participantes pb ON pb.id = cmc.participante_b_id
            LEFT JOIN campeonato_manual_participantes pv ON pv.id = cmc.vencedor_participante_id
            LEFT JOIN locais loc ON loc.id = cmc.local_id
            WHERE cmc.campeonato_id = %s
            ORDER BY cmc.fase, cmc.rodada, cmc.ordem, cmc.id
            """,
            (campeonato_id,),
        )
        confrontos = [dict(r) for r in await cur.fetchall()]

        await cur.execute(
            """
            SELECT DISTINCT grupo_nome
            FROM campeonato_manual_classificacao
            WHERE campeonato_id = %s
            ORDER BY grupo_nome
            """,
            (campeonato_id,),
        )
        grupos_nomes = [r["grupo_nome"] for r in await cur.fetchall()] or ["Geral"]

    grupos = [
        {
            "id": idx,
            "nome": nome,
            "ordem": idx + 1,
            "classificados_diretos": 0,
            "equipes": [
                {
                    "grupo_id": idx,
                    "equipe_id": p.get("equipe_id") or p["id"],
                    "escola_id": p.get("escola_id") or 0,
                    "seed_no_grupo": p["ordem"],
                    "nome_escola": p["nome_exibicao"],
                }
                for p in participantes
            ],
        }
        for idx, nome in enumerate(grupos_nomes)
    ]
    partidas = []
    for c in confrontos:
        loc = _local_public_from_join_row(c)
        partidas.append(
            {
                "id": c["id"],
                "origem": "MANUAL",
                "fase": c["fase"],
                "rodada": c["rodada"],
                "grupo_id": 0 if c["fase"] == "GRUPOS" else None,
                "mandante_equipe_id": None,
                "visitante_equipe_id": None,
                "vencedor_equipe_id": None,
                "is_bye": False,
                "origem_slot_a": None,
                "origem_slot_b": None,
                "inicio_em": _iso(c.get("inicio_em")),
                "local_id": c.get("local_id"),
                "local": loc,
                "mandante_nome": c.get("participante_a_nome"),
                "visitante_nome": c.get("participante_b_nome"),
                "vencedor_nome": c.get("vencedor_nome"),
                "placar_mandante": c.get("placar_a"),
                "placar_visitante": c.get("placar_b"),
                "placar_mandante_sec": c.get("placar_a_sec"),
                "placar_visitante_sec": c.get("placar_b_sec"),
                "resultado_tipo": c.get("resultado_tipo"),
            }
        )
    return {
        "grupos": grupos,
        "partidas": partidas,
        "wildcard_equipe_ids": [],
        "wildcard_ranking": [],
    }


@router.get("")
async def list_campeonatos_publico(
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista campeonatos visíveis publicamente (GERADO, EM_ANDAMENTO, FINALIZADO)."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT c.id, c.uuid::text AS uuid, c.nome, c.status, c.origem, c.formato,
                   esp.nome AS esporte_nome,
                   cat.nome AS categoria_nome,
                   nai.nome AS naipe_nome,
                   tm.nome  AS tipo_modalidade_nome,
                   tm.codigo AS tipo_modalidade_codigo,
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
            WHERE c.edicao_id = %s AND c.status = ANY(%s)
            ORDER BY esp.nome, cat.nome, nai.nome, c.id
            """,
            (resolved_edicao_id, list(_STATUSES_VISIVEIS)),
        )
        rows = await cur.fetchall()

    return [dict(r) for r in rows]


@router.get("/esportes-com-campeonatos")
async def list_esportes_com_campeonatos(
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT
                esp.id::text      AS esporte_id,
                esp.nome          AS esporte_nome,
                esp.icone,
                ev.id::text       AS variante_id,
                cat.nome          AS categoria_nome,
                nai.nome          AS naipe_nome,
                nai.codigo        AS naipe_codigo,
                tm.codigo         AS tipo_modalidade_codigo,
                c.id              AS campeonato_id,
                c.uuid::text      AS campeonato_uuid,
                c.status::text    AS campeonato_status,
                c.origem::text    AS campeonato_origem,
                c.nome            AS campeonato_nome
            FROM esportes esp
            JOIN esporte_variantes ev
                ON ev.esporte_id = esp.id AND ev.edicao_id = esp.edicao_id
            JOIN categorias cat ON cat.id = ev.categoria_id
            JOIN naipes nai ON nai.id = ev.naipe_id
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            LEFT JOIN campeonatos c
                ON c.esporte_variante_id = ev.id
                AND c.edicao_id = esp.edicao_id
                AND c.status = ANY(%s)
            WHERE esp.edicao_id = %s AND esp.ativa = TRUE
            ORDER BY esp.nome, cat.nome, nai.codigo
            """,
            (list(_STATUSES_VISIVEIS), resolved_edicao_id),
        )
        rows = await cur.fetchall()

    esportes_map: dict = {}
    for r in rows:
        eid = r["esporte_id"]
        if eid not in esportes_map:
            esportes_map[eid] = {
                "id": eid,
                "nome": r["esporte_nome"],
                "icone": r["icone"],
                "variantes": [],
            }
        esportes_map[eid]["variantes"].append({
            "id": r["variante_id"],
            "categoria_nome": r["categoria_nome"],
            "naipe_nome": r["naipe_nome"],
            "naipe_codigo": r["naipe_codigo"],
            "tipo_modalidade_codigo": r["tipo_modalidade_codigo"],
            "campeonato": {
                "id": r["campeonato_id"],
                "uuid": r["campeonato_uuid"],
                "status": r["campeonato_status"],
                "origem": r["campeonato_origem"],
                "nome": r["campeonato_nome"],
            } if r["campeonato_id"] is not None else None,
        })

    return list(esportes_map.values())


@router.get("/proximos-confrontos")
async def list_proximos_confrontos(
    edicao_id: int | None = Query(None),
    limite: int = Query(10, ge=1, le=50),
    campeonato_id: int | None = Query(None),
    local_id: int | None = Query(None, description="Filtra partidas/confrontos neste local"),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Partidas pendentes (sem resultado) de campeonatos já publicados (GERADO ou em andamento)."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    extra_camp = ""
    params_auto: list = [resolved_edicao_id]
    params_manual: list = [resolved_edicao_id]
    if campeonato_id is not None:
        extra_camp = "AND c.id = %s"
        params_auto.append(campeonato_id)
        params_manual.append(campeonato_id)
    extra_local_auto = ""
    extra_local_manual = ""
    if local_id is not None:
        extra_local_auto = "AND cp.local_id = %s"
        params_auto.append(local_id)
        extra_local_manual = "AND cmc.local_id = %s"
        params_manual.append(local_id)
    params_auto.append(limite)
    params_manual.append(limite)

    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            SELECT
                cp.id           AS partida_id,
                c.origem::text  AS origem,
                cp.fase::text   AS fase,
                cp.rodada,
                cp.inicio_em,
                cp.local_id     AS local_id,
                esc_m.nome_escola AS mandante_nome,
                esc_v.nome_escola AS visitante_nome,
                c.id            AS campeonato_id,
                c.esporte_variante_id AS esporte_variante_id,
                c.nome          AS campeonato_nome,
                esp.nome        AS esporte_nome,
                esp.icone,
                cat.nome        AS categoria_nome,
                nai.nome        AS naipe_nome,
                loc.id AS loc_join_id,
                loc.nome AS loc_join_nome,
                loc.endereco_completo AS loc_join_endereco,
                loc.foto_url AS loc_join_foto,
                loc.link_maps AS loc_join_maps
            FROM campeonato_partidas cp
            JOIN campeonatos c ON c.id = cp.campeonato_id
            JOIN esporte_variantes ev ON ev.id = c.esporte_variante_id
            JOIN esportes esp ON esp.id = ev.esporte_id
            JOIN categorias cat ON cat.id = ev.categoria_id
            JOIN naipes nai ON nai.id = ev.naipe_id
            LEFT JOIN equipes eq_m ON eq_m.id = cp.mandante_equipe_id
            LEFT JOIN escolas esc_m ON esc_m.id = eq_m.escola_id
            LEFT JOIN equipes eq_v ON eq_v.id = cp.visitante_equipe_id
            LEFT JOIN escolas esc_v ON esc_v.id = eq_v.escola_id
            LEFT JOIN locais loc ON loc.id = cp.local_id
            WHERE c.status IN ('GERADO', 'EM_ANDAMENTO')
              AND cp.registrado_em IS NULL
              AND cp.is_bye = FALSE
              AND cp.mandante_equipe_id IS NOT NULL
              AND cp.visitante_equipe_id IS NOT NULL
              AND c.edicao_id = %s
              {extra_camp}
              {extra_local_auto}
            ORDER BY cp.inicio_em NULLS LAST, cp.id
            LIMIT %s
            """,
            params_auto,
        )
        rows = [dict(r) for r in await cur.fetchall()]

        await cur.execute(
            f"""
            SELECT
                cmc.id           AS partida_id,
                'MANUAL'         AS origem,
                cmc.fase::text   AS fase,
                cmc.rodada,
                cmc.inicio_em,
                cmc.local_id     AS local_id,
                COALESCE(pa.nome_exibicao, cmc.participante_a_nome) AS mandante_nome,
                COALESCE(pb.nome_exibicao, cmc.participante_b_nome) AS visitante_nome,
                c.id             AS campeonato_id,
                c.esporte_variante_id AS esporte_variante_id,
                c.nome           AS campeonato_nome,
                esp.nome         AS esporte_nome,
                esp.icone,
                cat.nome         AS categoria_nome,
                nai.nome         AS naipe_nome,
                loc.id AS loc_join_id,
                loc.nome AS loc_join_nome,
                loc.endereco_completo AS loc_join_endereco,
                loc.foto_url AS loc_join_foto,
                loc.link_maps AS loc_join_maps
            FROM campeonato_manual_confrontos cmc
            JOIN campeonatos c ON c.id = cmc.campeonato_id
            JOIN esporte_variantes ev ON ev.id = c.esporte_variante_id
            JOIN esportes esp ON esp.id = ev.esporte_id
            JOIN categorias cat ON cat.id = ev.categoria_id
            JOIN naipes nai ON nai.id = ev.naipe_id
            LEFT JOIN campeonato_manual_participantes pa ON pa.id = cmc.participante_a_id
            LEFT JOIN campeonato_manual_participantes pb ON pb.id = cmc.participante_b_id
            LEFT JOIN locais loc ON loc.id = cmc.local_id
            WHERE c.status IN ('GERADO', 'EM_ANDAMENTO')
              AND cmc.resultado_tipo IS NULL
              AND COALESCE(pa.nome_exibicao, cmc.participante_a_nome) IS NOT NULL
              AND COALESCE(pb.nome_exibicao, cmc.participante_b_nome) IS NOT NULL
              AND c.edicao_id = %s
              {extra_camp}
              {extra_local_manual}
            ORDER BY cmc.inicio_em NULLS LAST, cmc.ordem, cmc.id
            LIMIT %s
            """,
            params_manual,
        )
        rows.extend(dict(r) for r in await cur.fetchall())

    def _sort_key(r: dict):
        em = r.get("inicio_em")
        if em is None:
            return (1, 0, r.get("partida_id", 0))
        return (0, em, r.get("partida_id", 0))

    rows.sort(key=_sort_key)
    return [_row_proximo_confronto_clean(r) for r in rows[:limite]]


_RESULTADO_DESTAQUE = ("NORMAL", "WXO")
_LANDING_CAMP_LIMIT = 40


def _contra_equipe_na_partida(p: dict, equipe_id: int, config: dict | None) -> int:
    """Unidades sofridas (placar primário do adversário), com handebol ignorando extra em sec."""
    mid = p.get("mandante_equipe_id")
    vid = p.get("visitante_equipe_id")
    if mid != equipe_id and vid != equipe_id:
        return 0
    is_mandante = equipe_id == mid
    if is_mandante:
        raw_contra = int(p.get("placar_visitante") or 0)
        sec_contra = int(p.get("placar_visitante_sec") or 0)
    else:
        raw_contra = int(p.get("placar_mandante") or 0)
        sec_contra = int(p.get("placar_mandante_sec") or 0)
    if config and config.get("ignorar_placar_extra"):
        return max(0, raw_contra - sec_contra)
    return raw_contra


async def _destaques_one_campeonato(
    conn: psycopg.AsyncConnection,
    meta: dict[str, Any],
) -> DestaquesCampeonatoLandingItem | None:
    cid = int(meta["campeonato_id"])
    config = await get_config_pontuacao(conn, cid)
    unidade = (config or {}).get("unidade_placar")
    registra = bool(config and config.get("registra_artilheiro"))
    mostrar_pont = bool(
        registra and unidade and str(unidade).upper() in ("GOLS", "CESTAS", "PONTOS", "SETS"),
    )

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT MAX(cp.rodada) AS r
            FROM campeonato_partidas cp
            WHERE cp.campeonato_id = %s
              AND cp.fase = 'GRUPOS'
              AND cp.resultado_tipo = ANY(%s)
              AND cp.is_bye = FALSE
              AND cp.mandante_equipe_id IS NOT NULL
              AND cp.visitante_equipe_id IS NOT NULL
            """,
            (cid, list(_RESULTADO_DESTAQUE)),
        )
        row_max = await cur.fetchone()
    rodada_ref = int(row_max["r"]) if row_max and row_max["r"] is not None else 0
    if rodada_ref < 1:
        return None

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT cp.id, cp.rodada, cp.mandante_equipe_id, cp.visitante_equipe_id,
                   cp.placar_mandante, cp.placar_visitante,
                   cp.placar_mandante_sec, cp.placar_visitante_sec,
                   esc_m.nome_escola AS mandante_nome,
                   esc_v.nome_escola AS visitante_nome
            FROM campeonato_partidas cp
            LEFT JOIN equipes eq_m ON eq_m.id = cp.mandante_equipe_id
            LEFT JOIN escolas esc_m ON esc_m.id = eq_m.escola_id
            LEFT JOIN equipes eq_v ON eq_v.id = cp.visitante_equipe_id
            LEFT JOIN escolas esc_v ON esc_v.id = eq_v.escola_id
            WHERE cp.campeonato_id = %s
              AND cp.rodada = %s
              AND cp.fase = 'GRUPOS'
              AND cp.resultado_tipo = ANY(%s)
              AND cp.is_bye = FALSE
              AND cp.mandante_equipe_id IS NOT NULL
              AND cp.visitante_equipe_id IS NOT NULL
            """,
            (cid, rodada_ref, list(_RESULTADO_DESTAQUE)),
        )
        partidas = [dict(r) for r in await cur.fetchall()]

    if not partidas:
        return None

    jogo_best: dict | None = None
    best_key = (-1, -1, -1)
    for p in partidas:
        pm = int(p.get("placar_mandante") or 0)
        pv = int(p.get("placar_visitante") or 0)
        s = pm + pv
        sec = int(p.get("placar_mandante_sec") or 0) + int(p.get("placar_visitante_sec") or 0)
        pid = int(p["id"])
        key = (s, sec, pid)
        if key > best_key:
            best_key = key
            jogo_best = p

    jogo_out: DestaqueJogoLanding | None = None
    if jogo_best:
        jogo_out = DestaqueJogoLanding(
            partida_id=int(jogo_best["id"]),
            rodada=int(jogo_best["rodada"]),
            mandante_nome=jogo_best.get("mandante_nome"),
            visitante_nome=jogo_best.get("visitante_nome"),
            placar_mandante=jogo_best.get("placar_mandante"),
            placar_visitante=jogo_best.get("placar_visitante"),
            placar_mandante_sec=jogo_best.get("placar_mandante_sec"),
            placar_visitante_sec=jogo_best.get("placar_visitante_sec"),
        )

    sofridos: dict[int, int] = defaultdict(int)
    jogos: dict[int, int] = defaultdict(int)
    nomes: dict[int, str] = {}
    for p in partidas:
        mid = int(p["mandante_equipe_id"])
        vid = int(p["visitante_equipe_id"])
        cm = _contra_equipe_na_partida(p, mid, config)
        cv = _contra_equipe_na_partida(p, vid, config)
        sofridos[mid] += cm
        sofridos[vid] += cv
        jogos[mid] += 1
        jogos[vid] += 1
        if p.get("mandante_nome"):
            nomes[mid] = str(p["mandante_nome"])
        if p.get("visitante_nome"):
            nomes[vid] = str(p["visitante_nome"])

    equipe_defesa_out: DestaqueEquipeDefesaLanding | None = None
    if sofridos:
        min_s = min(sofridos.values())
        candidatos = [(eid, s) for eid, s in sofridos.items() if s == min_s and jogos.get(eid, 0) >= 1]
        if candidatos:
            eid_pick = min(candidatos, key=lambda x: (x[1], x[0]))[0]
            equipe_defesa_out = DestaqueEquipeDefesaLanding(
                equipe_id=eid_pick,
                nome_escola=nomes.get(eid_pick) or f"Equipe {eid_pick}",
                sofridos_rodada=int(sofridos[eid_pick]),
                jogos_rodada=int(jogos[eid_pick]),
            )

    top_pont: list[DestaquePontuadorLanding] = []
    if mostrar_pont:
        try:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    SELECT ea.id AS estudante_id,
                           ea.nome AS estudante_nome,
                           ea.foto_url,
                           esc.nome_escola AS escola_nome,
                           SUM(pa.quantidade) FILTER (WHERE NOT pa.is_gol_contra)::int AS total
                    FROM partida_artilheiros pa
                    JOIN estudantes_atletas ea ON ea.id = pa.estudante_id
                    JOIN equipes eq ON eq.id = pa.equipe_id
                    JOIN escolas esc ON esc.id = eq.escola_id
                    JOIN campeonato_partidas cp ON cp.id = pa.partida_id
                    WHERE cp.campeonato_id = %s
                      AND cp.rodada = %s
                      AND cp.fase = 'GRUPOS'
                      AND cp.resultado_tipo = ANY(%s)
                    GROUP BY ea.id, ea.nome, ea.foto_url, esc.nome_escola
                    HAVING SUM(pa.quantidade) FILTER (WHERE NOT pa.is_gol_contra) > 0
                    ORDER BY total DESC, ea.nome
                    LIMIT 10
                    """,
                    (cid, rodada_ref, list(_RESULTADO_DESTAQUE)),
                )
                rows_art = await cur.fetchall()
            for i, r in enumerate(rows_art, start=1):
                top_pont.append(
                    DestaquePontuadorLanding(
                        posicao=i,
                        estudante_id=int(r["estudante_id"]),
                        estudante_nome=str(r["estudante_nome"]),
                        escola_nome=str(r["escola_nome"] or ""),
                        total=int(r["total"]),
                        foto_url=r.get("foto_url"),
                        estudante_foto_url=r.get("foto_url"),
                    )
                )
        except UndefinedTable:
            top_pont = []

    return DestaquesCampeonatoLandingItem(
        campeonato_id=cid,
        campeonato_nome=str(meta["campeonato_nome"]),
        esporte_id=str(meta["esporte_id"]),
        esporte_nome=str(meta["esporte_nome"]),
        esporte_icone=meta.get("esporte_icone"),
        categoria_nome=str(meta["categoria_nome"]),
        naipe_nome=str(meta["naipe_nome"]),
        tipo_modalidade_nome=str(meta["tipo_modalidade_nome"]),
        unidade_placar=str(unidade) if unidade else None,
        registra_artilheiro=registra,
        mostrar_pontuadores_individuais=mostrar_pont,
        rodada_referencia=rodada_ref,
        jogo_destaque=jogo_out,
        equipe_defesa=equipe_defesa_out,
        top_pontuadores=top_pont,
    )


@router.get("/destaques-landing", response_model=DestaquesLandingResponse)
async def list_destaques_landing(
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Agrega destaques da última rodada com resultado por campeonato (automático), para a landing."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT c.id AS campeonato_id,
                   c.nome AS campeonato_nome,
                   esp.id::text AS esporte_id,
                   esp.nome AS esporte_nome,
                   esp.icone AS esporte_icone,
                   cat.nome AS categoria_nome,
                   nai.nome AS naipe_nome,
                   tm.nome AS tipo_modalidade_nome
            FROM campeonatos c
            JOIN esporte_variantes ev ON ev.id = c.esporte_variante_id
            JOIN esportes esp ON esp.id = ev.esporte_id
            JOIN categorias cat ON cat.id = ev.categoria_id
            JOIN naipes nai ON nai.id = ev.naipe_id
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE c.edicao_id = %s
              AND c.status = ANY(%s)
              AND c.origem <> 'MANUAL'
              AND EXISTS (
                  SELECT 1
                  FROM campeonato_partidas cp
                  WHERE cp.campeonato_id = c.id
                    AND cp.fase = 'GRUPOS'
                    AND cp.resultado_tipo = ANY(%s)
                    AND cp.is_bye = FALSE
                    AND cp.mandante_equipe_id IS NOT NULL
                    AND cp.visitante_equipe_id IS NOT NULL
              )
            ORDER BY esp.nome, cat.nome, nai.nome, c.id
            LIMIT %s
            """,
            (
                resolved_edicao_id,
                list(_STATUSES_VISIVEIS),
                list(_RESULTADO_DESTAQUE),
                _LANDING_CAMP_LIMIT,
            ),
        )
        metas = [dict(r) for r in await cur.fetchall()]

    items: list[DestaquesCampeonatoLandingItem] = []
    for meta in metas:
        item = await _destaques_one_campeonato(conn, meta)
        if item:
            items.append(item)

    return DestaquesLandingResponse(items=items)


@router.get("/{campeonato_id}")
async def get_campeonato_publico(
    campeonato_id: int,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """
    Retorna campeonato + estrutura completa + config em uma única chamada.
    Apenas campeonatos públicos (GERADO, EM_ANDAMENTO, FINALIZADO).
    """
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT c.id, c.uuid::text AS uuid, c.nome, c.status, c.origem, c.formato,
                   c.vagas_wildcard,
                   esp.nome AS esporte_nome,
                   cat.nome AS categoria_nome,
                   nai.nome AS naipe_nome,
                   tm.nome  AS tipo_modalidade_nome
            FROM campeonatos c
            JOIN esporte_variantes ev ON ev.id = c.esporte_variante_id
            JOIN esportes esp ON esp.id = ev.esporte_id
            JOIN categorias cat ON cat.id = ev.categoria_id
            JOIN naipes nai ON nai.id = ev.naipe_id
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE c.id = %s AND c.edicao_id = %s AND c.status = ANY(%s)
            """,
            (campeonato_id, resolved_edicao_id, list(_STATUSES_VISIVEIS)),
        )
        camp_row = await cur.fetchone()

    if not camp_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")

    camp = dict(camp_row)
    if camp.get("origem") == "MANUAL":
        camp.pop("vagas_wildcard", None)
        return {
            **camp,
            "estrutura": await _manual_estrutura_publica(conn, campeonato_id),
            "config": None,
        }
    vagas_wildcard = int(camp.pop("vagas_wildcard") or 0)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, nome, ordem, classificados_diretos
            FROM campeonato_grupos
            WHERE campeonato_id = %s
            ORDER BY ordem
            """,
            (campeonato_id,),
        )
        grupos_rows = await cur.fetchall()
        grupo_ids = [r["id"] for r in grupos_rows]

        equipes_por_grupo: dict[int, list] = {gid: [] for gid in grupo_ids}
        if grupo_ids:
            await cur.execute(
                """
                SELECT cge.grupo_id, cge.equipe_id, cge.seed_no_grupo,
                       esc.nome_escola
                FROM campeonato_grupo_equipes cge
                JOIN equipes eq ON eq.id = cge.equipe_id
                JOIN escolas esc ON esc.id = eq.escola_id
                WHERE cge.grupo_id = ANY(%s)
                ORDER BY cge.grupo_id, cge.seed_no_grupo
                """,
                (grupo_ids,),
            )
            for r in await cur.fetchall():
                equipes_por_grupo[r["grupo_id"]].append(dict(r))

        await cur.execute(
            """
            SELECT cp.id, cp.fase, cp.rodada, cp.grupo_id,
                   cp.mandante_equipe_id, cp.visitante_equipe_id, cp.vencedor_equipe_id,
                   cp.is_bye, cp.origem_slot_a, cp.origem_slot_b,
                   cp.inicio_em, cp.local_id,
                   cp.placar_mandante, cp.placar_visitante,
                   cp.placar_mandante_sec, cp.placar_visitante_sec,
                   cp.sets_detalhe,
                   cp.resultado_tipo,
                   esc_m.nome_escola AS mandante_nome,
                   esc_v.nome_escola AS visitante_nome,
                   esc_w.nome_escola AS vencedor_nome,
                   loc.id AS loc_join_id,
                   loc.nome AS loc_join_nome,
                   loc.endereco_completo AS loc_join_endereco,
                   loc.foto_url AS loc_join_foto,
                   loc.link_maps AS loc_join_maps
            FROM campeonato_partidas cp
            LEFT JOIN equipes eq_m ON eq_m.id = cp.mandante_equipe_id
            LEFT JOIN escolas esc_m ON esc_m.id = eq_m.escola_id
            LEFT JOIN equipes eq_v ON eq_v.id = cp.visitante_equipe_id
            LEFT JOIN escolas esc_v ON esc_v.id = eq_v.escola_id
            LEFT JOIN equipes eq_w ON eq_w.id = cp.vencedor_equipe_id
            LEFT JOIN escolas esc_w ON esc_w.id = eq_w.escola_id
            LEFT JOIN locais loc ON loc.id = cp.local_id
            WHERE cp.campeonato_id = %s
            ORDER BY
                CASE cp.fase
                    WHEN 'GRUPOS'   THEN 1
                    WHEN 'OITAVAS'  THEN 2
                    WHEN 'QUARTAS' THEN 3
                    WHEN 'SEMI'    THEN 4
                    WHEN 'FINAL'   THEN 5
                    WHEN 'TERCEIRO' THEN 6
                    ELSE 99
                END,
                cp.rodada, cp.id
            """,
            (campeonato_id,),
        )
        partidas_rows = await cur.fetchall()

        await cur.execute(
            """
            SELECT mandante_equipe_id AS equipe_id
            FROM campeonato_partidas
            WHERE campeonato_id = %s AND mandante_is_wildcard = TRUE AND mandante_equipe_id IS NOT NULL
            UNION ALL
            SELECT visitante_equipe_id
            FROM campeonato_partidas
            WHERE campeonato_id = %s AND visitante_is_wildcard = TRUE AND visitante_equipe_id IS NOT NULL
            """,
            (campeonato_id, campeonato_id),
        )
        wildcard_equipe_ids = [int(r["equipe_id"]) for r in await cur.fetchall()]

    config = await get_config_pontuacao(conn, campeonato_id)
    wc_ranking = await calcular_ranking_wildcards(conn, campeonato_id, vagas_wildcard, config)

    grupos = [
        {
            "id": r["id"],
            "nome": r["nome"],
            "ordem": r["ordem"],
            "classificados_diretos": r["classificados_diretos"],
            "equipes": equipes_por_grupo.get(r["id"], []),
        }
        for r in grupos_rows
    ]

    partidas = []
    for r in partidas_rows:
        rd = dict(r)
        loc = _local_public_from_join_row(rd)
        partidas.append(
            {
                "id": rd["id"],
                "origem": "AUTOMATICO",
                "fase": rd["fase"],
                "rodada": rd["rodada"],
                "grupo_id": rd.get("grupo_id"),
                "mandante_equipe_id": rd.get("mandante_equipe_id"),
                "visitante_equipe_id": rd.get("visitante_equipe_id"),
                "vencedor_equipe_id": rd.get("vencedor_equipe_id"),
                "is_bye": bool(rd.get("is_bye")),
                "origem_slot_a": rd.get("origem_slot_a"),
                "origem_slot_b": rd.get("origem_slot_b"),
                "inicio_em": _iso(rd.get("inicio_em")),
                "local_id": rd.get("local_id"),
                "local": loc,
                "mandante_nome": rd.get("mandante_nome"),
                "visitante_nome": rd.get("visitante_nome"),
                "vencedor_nome": rd.get("vencedor_nome"),
                "placar_mandante": rd.get("placar_mandante"),
                "placar_visitante": rd.get("placar_visitante"),
                "placar_mandante_sec": rd.get("placar_mandante_sec"),
                "placar_visitante_sec": rd.get("placar_visitante_sec"),
                "sets_detalhe": rd.get("sets_detalhe"),
                "resultado_tipo": rd.get("resultado_tipo"),
            }
        )

    config_out = None
    if config:
        config_out = {
            "unidade_placar": config.get("unidade_placar"),
            "unidade_placar_sec": config.get("unidade_placar_sec"),
            "pts_vitoria": config.get("pts_vitoria"),
            "pts_empate": config.get("pts_empate"),
            "pts_derrota": config.get("pts_derrota"),
            "permite_empate": config.get("permite_empate"),
            "wxo_placar_pro": config.get("wxo_placar_pro"),
            "wxo_placar_contra": config.get("wxo_placar_contra"),
            "registra_artilheiro": bool(config.get("registra_artilheiro")),
        }

    return {
        **camp,
        "estrutura": {
            "grupos": grupos,
            "partidas": partidas,
            "wildcard_equipe_ids": wildcard_equipe_ids,
            "wildcard_ranking": wc_ranking,
        },
        "config": config_out,
    }


@router.get("/{campeonato_id}/grupos/{grupo_id}/classificacao")
async def get_classificacao_grupo_publico(
    campeonato_id: int,
    grupo_id: int,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Classificação atual de um grupo (endpoint público)."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT c.origem
            FROM campeonatos c
            WHERE c.id = %s AND c.edicao_id = %s AND c.status = ANY(%s)
            """,
            (campeonato_id, resolved_edicao_id, list(_STATUSES_VISIVEIS)),
        )
        camp = await cur.fetchone()
        if not camp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campeonato não encontrado.",
            )
        if camp.get("origem") == "MANUAL":
            return await _manual_classificacao_rows(conn, campeonato_id)

        await cur.execute(
            """
            SELECT cg.id
            FROM campeonato_grupos cg
            WHERE cg.id = %s AND cg.campeonato_id = %s
            """,
            (grupo_id, campeonato_id),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo não encontrado.")

    config = await get_config_pontuacao(conn, campeonato_id)
    return await calcular_classificacao_grupo(conn, grupo_id, config)


@router.get("/{campeonato_id}/partidas/{partida_id}/artilheiros", response_model=list[ArtilheiroOutput])
async def get_artilheiros_partida_publico(
    campeonato_id: int,
    partida_id: int,
    edicao_id: int | None = Query(None),
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Artilheiros de uma partida (público, para a página de Resultados)."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT cp.id
            FROM campeonato_partidas cp
            JOIN campeonatos c ON c.id = cp.campeonato_id
            WHERE cp.id = %s AND cp.campeonato_id = %s
              AND c.edicao_id = %s AND c.status = ANY(%s)
            """,
            (partida_id, campeonato_id, resolved_edicao_id, list(_STATUSES_VISIVEIS)),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partida não encontrada.")

        try:
            await cur.execute(
                """
                SELECT pa.estudante_id, ea.nome AS estudante_nome,
                       pa.equipe_id, esc.nome_escola AS escola_nome,
                       pa.quantidade, pa.is_gol_contra
                FROM partida_artilheiros pa
                JOIN estudantes_atletas ea ON ea.id = pa.estudante_id
                JOIN equipes eq ON eq.id = pa.equipe_id
                JOIN escolas esc ON esc.id = eq.escola_id
                WHERE pa.partida_id = %s
                ORDER BY pa.equipe_id, pa.is_gol_contra, ea.nome
                """,
                (partida_id,),
            )
            rows = await cur.fetchall()
        except UndefinedTable:
            rows = []

    return [
        ArtilheiroOutput(
            estudante_id=r["estudante_id"],
            estudante_nome=r["estudante_nome"],
            equipe_id=r["equipe_id"],
            escola_nome=r["escola_nome"],
            quantidade=r["quantidade"],
            is_gol_contra=bool(r.get("is_gol_contra")),
        )
        for r in rows
    ]
