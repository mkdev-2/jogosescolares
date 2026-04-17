"""
Serviço de pontuação e classificação de grupos.

Responsabilidades:
  1. get_config_pontuacao              – busca config de pontuação do campeonato
  2. calcular_classificacao_grupo      – ordena equipes por pontos + desempate
  3. verificar_grupo_concluido         – todos os jogos do grupo têm resultado?
  4. avancar_classificados_para_mata_mata – atualiza bracket quando grupo termina
  5. avancar_vencedor_knockout         – preenche slot do vencedor na próxima fase
"""
from __future__ import annotations

import logging
from typing import Any

import psycopg

logger = logging.getLogger(__name__)

Config = dict[str, Any]
EquipeStats = dict[str, Any]


# ===========================================================================
# 1. Config de pontuação
# ===========================================================================

async def get_config_pontuacao(
    conn: psycopg.AsyncConnection,
    campeonato_id: int,
) -> Config | None:
    """
    Retorna a configuração de pontuação do esporte vinculado ao campeonato,
    ou None se o esporte não tiver configuração cadastrada para a edição.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT ecp.*
            FROM esporte_config_pontuacao ecp
            JOIN campeonatos c ON c.edicao_id = ecp.edicao_id
            JOIN esporte_variantes ev ON ev.id = c.esporte_variante_id
            WHERE c.id = %s AND ecp.esporte_id = ev.esporte_id
            """,
            (campeonato_id,),
        )
        row = await cur.fetchone()
    return dict(row) if row else None


# ===========================================================================
# 2. Cálculo de pontos e estatísticas
# ===========================================================================

def _pts_da_partida(equipe_id: int, p: dict, config: Config) -> int:
    """Pontos de tabela que esta equipe ganha nesta partida."""
    tipo = p.get("resultado_tipo")
    if not tipo:
        return 0

    mandante_id = p["mandante_equipe_id"]
    visitante_id = p["visitante_equipe_id"]
    vencedor_id = p.get("vencedor_equipe_id")

    if tipo == "WXO":
        return (
            config.get("wxo_pts_vencedor", 3)
            if equipe_id == vencedor_id
            else config.get("wxo_pts_perdedor", 0)
        )

    # NORMAL
    if vencedor_id is None:
        # Empate
        return config.get("pts_empate", 1)

    if equipe_id == vencedor_id:
        pts_vit = config.get("pts_vitoria", 3)
        pts_vit_parc = config.get("pts_vitoria_parcial")
        if pts_vit_parc is not None:
            # Vôlei: 2x0 → pts_vitoria, 2x1 → pts_vitoria_parcial
            loser_score = (
                p.get("placar_visitante") or 0
                if vencedor_id == mandante_id
                else p.get("placar_mandante") or 0
            )
            return pts_vit_parc if loser_score > 0 else pts_vit
        return pts_vit

    # Equipe perdeu
    pts_vit_parc = config.get("pts_vitoria_parcial")
    if pts_vit_parc is not None:
        # Vôlei: perdedor só ganha pts se tiver vencido algum set
        my_score = (
            p.get("placar_mandante") or 0
            if equipe_id == mandante_id
            else p.get("placar_visitante") or 0
        )
        return config.get("pts_derrota", 0) if my_score > 0 else 0
    return config.get("pts_derrota", 0)


def _pro_contra_partida(
    equipe_id: int,
    p: dict,
    config: Config,
    usar_sec: bool = False,
) -> tuple[int, int]:
    """
    Retorna (pro, contra) para esta equipe nesta partida.

    usar_sec=True   → unidade secundária (vôlei: pontos nos sets).
    ignorar_placar_extra=True → subtrai placar_sec do primário (handebol:
                                 gols de prorrogação não contam no saldo).
    """
    if not p.get("resultado_tipo"):
        return 0, 0

    is_mandante = p["mandante_equipe_id"] == equipe_id

    if usar_sec:
        if is_mandante:
            return p.get("placar_mandante_sec") or 0, p.get("placar_visitante_sec") or 0
        return p.get("placar_visitante_sec") or 0, p.get("placar_mandante_sec") or 0

    # Placar primário
    if is_mandante:
        raw_pro = p.get("placar_mandante") or 0
        raw_contra = p.get("placar_visitante") or 0
        sec_pro = p.get("placar_mandante_sec") or 0
        sec_contra = p.get("placar_visitante_sec") or 0
    else:
        raw_pro = p.get("placar_visitante") or 0
        raw_contra = p.get("placar_mandante") or 0
        sec_pro = p.get("placar_visitante_sec") or 0
        sec_contra = p.get("placar_mandante_sec") or 0

    if config.get("ignorar_placar_extra"):
        # sec = gols no tempo extra; não contam para saldo/average
        return raw_pro - sec_pro, raw_contra - sec_contra

    return raw_pro, raw_contra


def _aggregate_stats(
    equipe_id: int,
    partidas: list[dict],
    config: Config,
) -> EquipeStats:
    """Agrega J/V/E/D/pts/pro/contra/saldo/pro_sec/contra_sec de uma equipe."""
    j = v = e = d = pts = 0
    pro = contra = pro_sec = contra_sec = 0

    for p in partidas:
        if not p.get("resultado_tipo"):
            continue
        if p["mandante_equipe_id"] != equipe_id and p["visitante_equipe_id"] != equipe_id:
            continue

        j += 1
        pts += _pts_da_partida(equipe_id, p, config)

        ep, ec = _pro_contra_partida(equipe_id, p, config, usar_sec=False)
        pro += ep
        contra += ec

        ep2, ec2 = _pro_contra_partida(equipe_id, p, config, usar_sec=True)
        pro_sec += ep2
        contra_sec += ec2

        vencedor_id = p.get("vencedor_equipe_id")
        if vencedor_id is None:
            e += 1
        elif vencedor_id == equipe_id:
            v += 1
        else:
            d += 1

    return {
        "J": j, "V": v, "E": e, "D": d,
        "pts": pts,
        "pro": pro, "contra": contra, "saldo": pro - contra,
        "pro_sec": pro_sec, "contra_sec": contra_sec,
    }


# ===========================================================================
# 3. Critérios de desempate
# ===========================================================================

def _average(pro: int, contra: int) -> float:
    if contra == 0:
        return float("inf") if pro > 0 else 1.0
    return pro / contra


def _chave_criterio(
    equipe_id: int,
    stats: EquipeStats,
    criterio: str,
    ids_grupo_emp: set[int],
    todas_partidas: list[dict],
    config: Config,
) -> float:
    """
    Valor numérico para ordenação pelo critério dado (sempre DESCENDENTE).
    MENOR_CONTRA_GERAL: negado para que menos seja melhor posição.
    """
    # Partidas realizadas entre as equipes do grupo empatado
    partidas_diretas = [
        p for p in todas_partidas
        if p.get("resultado_tipo")
        and p["mandante_equipe_id"] in ids_grupo_emp
        and p["visitante_equipe_id"] in ids_grupo_emp
    ]

    if criterio == "CONFRONTO_DIRETO":
        if len(ids_grupo_emp) != 2:
            return 0.0
        for p in partidas_diretas:
            vid = p.get("vencedor_equipe_id")
            if vid is None:
                return 0.0   # empate no confronto direto
            return 1.0 if vid == equipe_id else -1.0
        return 0.0  # partida ainda não aconteceu

    if criterio == "MAIOR_VITORIAS":
        return float(stats["V"])

    if criterio == "AVERAGE_DIRETO":
        pro, contra = 0, 0
        for p in partidas_diretas:
            ep, ec = _pro_contra_partida(equipe_id, p, config, usar_sec=False)
            pro += ep
            contra += ec
        return _average(pro, contra)

    if criterio == "AVERAGE_SEC_DIRETO":
        pro, contra = 0, 0
        for p in partidas_diretas:
            ep, ec = _pro_contra_partida(equipe_id, p, config, usar_sec=True)
            pro += ep
            contra += ec
        return _average(pro, contra)

    if criterio == "SALDO_DIRETO":
        pro, contra = 0, 0
        for p in partidas_diretas:
            ep, ec = _pro_contra_partida(equipe_id, p, config, usar_sec=False)
            pro += ep
            contra += ec
        return float(pro - contra)

    if criterio == "AVERAGE_GERAL":
        return _average(stats["pro"], stats["contra"])

    if criterio == "AVERAGE_SEC_GERAL":
        return _average(stats["pro_sec"], stats["contra_sec"])

    if criterio == "SALDO_GERAL":
        return float(stats["saldo"])

    if criterio == "MENOR_CONTRA_GERAL":
        return float(-stats["contra"])  # negado: descending ⟹ menor contra = melhor

    if criterio == "MAIOR_PRO_GERAL":
        return float(stats["pro"])

    return 0.0  # SORTEIO ou código desconhecido


def _ordenar_grupo_empatado(
    equipes: list[dict],
    criterios: list[str],
    todas_partidas: list[dict],
    config: Config,
) -> list[dict]:
    """
    Aplica a lista de critérios, em ordem, a um grupo de equipes com mesma
    pontuação. Processa sub-grupos recursivamente até que todos estejam
    resolvidos ou os critérios se esgotem.
    """
    if len(equipes) <= 1 or not criterios:
        return equipes

    criterio = criterios[0]
    restantes = criterios[1:]

    if criterio == "SORTEIO":
        return equipes  # terminal — não desempatamos por sorteio aqui

    ids_grupo = {e["equipe_id"] for e in equipes}

    chaves: dict[int, float] = {
        e["equipe_id"]: _chave_criterio(
            e["equipe_id"], e, criterio, ids_grupo, todas_partidas, config
        )
        for e in equipes
    }

    equipes_sorted = sorted(equipes, key=lambda e: chaves[e["equipe_id"]], reverse=True)

    # Aplica critérios restantes a sub-grupos ainda empatados
    resultado: list[dict] = []
    i = 0
    while i < len(equipes_sorted):
        j = i + 1
        while (
            j < len(equipes_sorted)
            and chaves[equipes_sorted[j]["equipe_id"]] == chaves[equipes_sorted[i]["equipe_id"]]
        ):
            j += 1
        sub = equipes_sorted[i:j]
        if len(sub) > 1 and restantes:
            sub = _ordenar_grupo_empatado(sub, restantes, todas_partidas, config)
        resultado.extend(sub)
        i = j

    return resultado


# ===========================================================================
# 4. Classificação completa do grupo
# ===========================================================================

_CONFIG_PADRAO: Config = {
    "pts_vitoria": 3,
    "pts_vitoria_parcial": None,
    "pts_empate": 1,
    "pts_derrota": 0,
    "permite_empate": True,
    "wxo_pts_vencedor": 3,
    "wxo_pts_perdedor": 0,
    "ignorar_placar_extra": False,
    "criterios_desempate_2": ["CONFRONTO_DIRETO", "SORTEIO"],
    "criterios_desempate_3plus": ["MAIOR_VITORIAS", "SORTEIO"],
}


async def calcular_classificacao_grupo(
    conn: psycopg.AsyncConnection,
    grupo_id: int,
    config: Config | None,
) -> list[EquipeStats]:
    """
    Calcula a tabela classificatória de um grupo aplicando pontuação e
    critérios de desempate configurados para o esporte.

    Retorna lista ordenada (melhor → pior) de dicts com:
      posicao, equipe_id, nome_escola, seed,
      J, V, E, D, pts, pro, contra, saldo, pro_sec, contra_sec.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT cge.equipe_id, cge.seed_no_grupo, esc.nome_escola
            FROM campeonato_grupo_equipes cge
            JOIN equipes eq ON eq.id = cge.equipe_id
            JOIN escolas esc ON esc.id = eq.escola_id
            WHERE cge.grupo_id = %s
            ORDER BY cge.seed_no_grupo
            """,
            (grupo_id,),
        )
        equipes_rows = await cur.fetchall()

        await cur.execute(
            """
            SELECT id,
                   mandante_equipe_id, visitante_equipe_id, vencedor_equipe_id,
                   placar_mandante, placar_visitante,
                   placar_mandante_sec, placar_visitante_sec,
                   resultado_tipo
            FROM campeonato_partidas
            WHERE grupo_id = %s AND is_bye = FALSE
            ORDER BY rodada
            """,
            (grupo_id,),
        )
        partidas_rows = await cur.fetchall()

    if not equipes_rows:
        return []

    cfg = config if config is not None else _CONFIG_PADRAO
    partidas = [dict(p) for p in partidas_rows]

    equipes: list[dict] = []
    for r in equipes_rows:
        eid = r["equipe_id"]
        stats = _aggregate_stats(eid, partidas, cfg)
        stats["equipe_id"] = eid
        stats["nome_escola"] = r["nome_escola"]
        stats["seed"] = r["seed_no_grupo"]
        equipes.append(stats)

    # Ordenação primária por pontos
    equipes.sort(key=lambda e: e["pts"], reverse=True)

    criterios_2 = cfg.get("criterios_desempate_2") or []
    criterios_3 = cfg.get("criterios_desempate_3plus") or []

    resultado_final: list[dict] = []
    i = 0
    while i < len(equipes):
        j = i + 1
        while j < len(equipes) and equipes[j]["pts"] == equipes[i]["pts"]:
            j += 1
        grupo_emp = equipes[i:j]
        if len(grupo_emp) > 1:
            criterios = criterios_2 if len(grupo_emp) == 2 else criterios_3
            grupo_emp = _ordenar_grupo_empatado(grupo_emp, criterios, partidas, cfg)
        resultado_final.extend(grupo_emp)
        i = j

    for pos, e in enumerate(resultado_final, start=1):
        e["posicao"] = pos

    return resultado_final


# ===========================================================================
# 5. Verificar se o grupo está concluído
# ===========================================================================

async def verificar_grupo_concluido(
    conn: psycopg.AsyncConnection,
    grupo_id: int,
) -> bool:
    """
    True se todas as partidas não-BYE do grupo têm resultado_tipo preenchido.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT COUNT(*) AS total,
                   COUNT(resultado_tipo) AS com_resultado
            FROM campeonato_partidas
            WHERE grupo_id = %s AND is_bye = FALSE
            """,
            (grupo_id,),
        )
        row = await cur.fetchone()
    if not row or not row["total"]:
        return False
    return int(row["total"]) == int(row["com_resultado"])


# ===========================================================================
# 6. Avançar classificados para o mata-mata
# ===========================================================================

async def avancar_classificados_para_mata_mata(
    conn: psycopg.AsyncConnection,
    campeonato_id: int,
    grupo_id: int,
    config: Config | None,
) -> None:
    """
    Recalcula a classificação real do grupo e substitui os slots do bracket
    (partidas de mata-mata, grupo_id IS NULL) que ainda apontam para os seeds
    iniciais pelos classificados reais.

    Estratégia: os seeds_no_grupo 1..N foram usados na geração para preencher
    os slots do chaveamento. Mapeamos seed_inicial[i] → classificado_real[i]
    e atualizamos as partidas de mata-mata correspondentes.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT classificam_por_grupo FROM campeonatos WHERE id = %s",
            (campeonato_id,),
        )
        camp = await cur.fetchone()
        if not camp:
            return
        classificam = int(camp["classificam_por_grupo"])

        await cur.execute(
            """
            SELECT equipe_id FROM campeonato_grupo_equipes
            WHERE grupo_id = %s ORDER BY seed_no_grupo
            """,
            (grupo_id,),
        )
        seeds = [r["equipe_id"] for r in await cur.fetchall()]

    seeds_no_bracket = seeds[:classificam]
    if not seeds_no_bracket:
        return

    classificacao = await calcular_classificacao_grupo(conn, grupo_id, config)
    classificados_reais = [e["equipe_id"] for e in classificacao[:classificam]]

    if len(classificados_reais) < len(seeds_no_bracket):
        return

    # Apenas pares que de facto mudaram
    mapeamento = {
        seeds_no_bracket[i]: classificados_reais[i]
        for i in range(len(seeds_no_bracket))
        if seeds_no_bracket[i] != classificados_reais[i]
    }
    if not mapeamento:
        return

    async with conn.cursor() as cur:
        for old_id, new_id in mapeamento.items():
            logger.info(
                "Campeonato %s / grupo %s: substituindo equipe %s → %s no bracket",
                campeonato_id, grupo_id, old_id, new_id,
            )
            await cur.execute(
                """
                UPDATE campeonato_partidas
                SET mandante_equipe_id = %s, updated_at = NOW()
                WHERE campeonato_id = %s AND grupo_id IS NULL
                  AND mandante_equipe_id = %s
                """,
                (new_id, campeonato_id, old_id),
            )
            await cur.execute(
                """
                UPDATE campeonato_partidas
                SET visitante_equipe_id = %s, updated_at = NOW()
                WHERE campeonato_id = %s AND grupo_id IS NULL
                  AND visitante_equipe_id = %s
                """,
                (new_id, campeonato_id, old_id),
            )
            # BYE: atualiza vencedor também (avança automaticamente sem jogar)
            await cur.execute(
                """
                UPDATE campeonato_partidas
                SET vencedor_equipe_id = %s, updated_at = NOW()
                WHERE campeonato_id = %s AND grupo_id IS NULL
                  AND is_bye = TRUE AND vencedor_equipe_id = %s
                """,
                (new_id, campeonato_id, old_id),
            )


# ===========================================================================
# 7. Avançar vencedor no chaveamento eliminatório
# ===========================================================================

async def avancar_vencedor_knockout(
    conn: psycopg.AsyncConnection,
    campeonato_id: int,
    partida_id: int,
    vencedor_equipe_id: int,
) -> bool:
    """
    Após o resultado de uma partida eliminatória ser registrado, localiza a
    próxima partida do bracket que a referencia e preenche o slot do vencedor.

    Usa ROW_NUMBER() para determinar a posição (1-based) da partida dentro
    de sua rodada e monta o código de referência "R{rodada}M{pos}".

    Retorna True se encontrou e atualizou a próxima partida, False se era
    a partida final (não há próxima).
    """
    async with conn.cursor() as cur:
        await cur.execute(
            """
            WITH ranked AS (
                SELECT id, rodada,
                       ROW_NUMBER() OVER (
                           PARTITION BY campeonato_id, fase, rodada
                           ORDER BY id
                       ) AS match_num
                FROM campeonato_partidas
                WHERE campeonato_id = %s AND grupo_id IS NULL AND is_bye = FALSE
            )
            SELECT rodada, match_num
            FROM ranked
            WHERE id = %s
            """,
            (campeonato_id, partida_id),
        )
        row = await cur.fetchone()

    if not row:
        return False

    referencia = f"R{row['rodada']}M{row['match_num']}"

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, origem_slot_a, origem_slot_b
            FROM campeonato_partidas
            WHERE campeonato_id = %s
              AND (origem_slot_a = %s OR origem_slot_b = %s)
            LIMIT 1
            """,
            (campeonato_id, referencia, referencia),
        )
        proxima = await cur.fetchone()

    if not proxima:
        return False  # Esta era a final

    coluna = (
        "mandante_equipe_id"
        if proxima["origem_slot_a"] == referencia
        else "visitante_equipe_id"
    )
    async with conn.cursor() as cur:
        await cur.execute(
            f"""
            UPDATE campeonato_partidas
            SET {coluna} = %s, updated_at = NOW()
            WHERE id = %s
            """,
            (vencedor_equipe_id, proxima["id"]),
        )

    return True
