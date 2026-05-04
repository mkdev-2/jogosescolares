"""
Serviço de geração de estrutura de chaveamentos (Fase 2).
"""
from math import ceil, log2
from typing import Any

from fastapi import HTTPException, status
import psycopg


def _fase_por_tamanho_chave(chave_tamanho: int) -> str:
    if chave_tamanho == 2:
        return "FINAL"
    if chave_tamanho == 4:
        return "SEMI"
    if chave_tamanho == 8:
        return "QUARTAS"
    if chave_tamanho == 16:
        return "OITAVAS"
    if chave_tamanho == 32:
        return "DEZESSEIS_AVOS"
    if chave_tamanho == 64:
        return "TRINTA_E_DOIS_AVOS"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Tamanho de chave não suportado. Máximo atual: 64 vagas.",
    )


def _nome_grupo_por_indice(idx: int) -> str:
    return chr(ord("A") + idx)


def _snake_distribuicao(equipe_ids: list[int], num_grupos: int) -> list[list[int]]:
    grupos: list[list[int]] = [[] for _ in range(num_grupos)]
    cursor = 0
    direcao = 1
    for equipe_id in equipe_ids:
        grupos[cursor].append(equipe_id)
        proximo = cursor + direcao
        if proximo >= num_grupos:
            direcao = -1
            proximo = num_grupos - 1 if num_grupos > 1 else 0
        elif proximo < 0:
            direcao = 1
            proximo = 0
        cursor = proximo
    return grupos


def _gerar_confrontos_round_robin(equipes_grupo: list[int]) -> list[tuple[int, int]]:
    confrontos: list[tuple[int, int]] = []
    for i in range(len(equipes_grupo)):
        for j in range(i + 1, len(equipes_grupo)):
            confrontos.append((equipes_grupo[i], equipes_grupo[j]))
    return confrontos


def _proxima_potencia_2(n: int) -> int:
    return 1 if n <= 1 else 2 ** ceil(log2(n))


def _snake_distribuicao_com_tamanho(equipe_ids: list[int], tamanhos_grupos: list[int]) -> list[list[int]]:
    grupos: list[list[int]] = [[] for _ in tamanhos_grupos]
    cursor = 0
    direcao = 1

    for equipe_id in equipe_ids:
        tentativas = 0
        while len(grupos[cursor]) >= tamanhos_grupos[cursor]:
            proximo = cursor + direcao
            if proximo >= len(grupos):
                direcao = -1
                proximo = len(grupos) - 1
            elif proximo < 0:
                direcao = 1
                proximo = 0
            cursor = proximo
            tentativas += 1
            if tentativas > (len(grupos) * 2):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Falha ao distribuir equipes entre os grupos.",
                )

        grupos[cursor].append(equipe_id)

        proximo = cursor + direcao
        if proximo >= len(grupos):
            direcao = -1
            proximo = len(grupos) - 1
        elif proximo < 0:
            direcao = 1
            proximo = 0
        cursor = proximo

    return grupos


def calcular_distribuicao_grupos(total_equipes: int) -> dict[str, Any]:
    """
    Para N >= 6: aplica as três regras em ordem de prioridade e retorna a
    configuração de grupos a usar.

    Retorna:
      tamanhos               – tamanho de cada grupo (lista de ints)
      classificados_por_grupo – quantos classificam diretamente de cada grupo
      regra                  – "PADRAO" | "IGUALDADE" | "WILDCARD"
      vagas_bracket          – tamanho do bracket eliminatório (4, 8 ou 16)
      vagas_wildcard         – vagas a preencher via wild card (0 se sem wild card)

    Prioridade por target (8 antes de 4 para N<25; só 16 para N≥25):
      Para cada target:
        1. Regra Padrão    – g3→1, g4→2; soma == target exato.
        2. Regra Igualdade – todos grupos de 3, cada um classifica 2; soma == target exato.
      Se nenhum target fechou exatamente:
        3. Regra Wild card – regra padrão (g4→2, g3→1), wildcards completam o bracket.
           Inclui target=16 como fallback mesmo quando N < 25.
    """
    N = total_equipes
    if N < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Distribuição em grupos exige ao menos 6 equipes.",
        )
    if N > 104:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limite excedido: máximo de 104 equipes para fase de grupos.",
        )

    targets = [16] if N >= 25 else [8, 4]

    for target in targets:
        # Regra 1 — Padrão: g3 classifica 1, g4 classifica 2; total == target exato.
        # Sistema: 3*g3 + 4*g4 = N  e  g3 + 2*g4 = target
        # → g4 = (3*target - N) / 2,  g3 = target - 2*g4
        numerador = 3 * target - N
        if numerador >= 0 and numerador % 2 == 0:
            g4 = numerador // 2
            g3 = target - 2 * g4
            if g3 >= 0:
                return {
                    "tamanhos": [4] * g4 + [3] * g3,
                    "classificados_por_grupo": [2] * g4 + [1] * g3,
                    "regra": "PADRAO",
                    "vagas_bracket": target,
                    "vagas_wildcard": 0,
                }

        # Regra 2 — Igualdade: todos grupos de tamanho 3, cada um classifica 2.
        if N % 3 == 0:
            g3 = N // 3
            if g3 * 2 == target:
                return {
                    "tamanhos": [3] * g3,
                    "classificados_por_grupo": [2] * g3,
                    "regra": "IGUALDADE",
                    "vagas_bracket": target,
                    "vagas_wildcard": 0,
                }

    # Regra 3 — Wild card: regra padrão (g4→2, g3→1), wildcards completam o bracket.
    # Inclui target=16 como fallback mesmo quando N < 25.
    targets_wc = sorted(set(targets) | {16})

    best: tuple[int, int, int, int] | None = None  # (wc, target, g3, g4)

    for target in targets_wc:
        for g4 in range(N // 4 + 1):
            resto = N - 4 * g4
            if resto < 0:
                break
            if resto % 3 != 0:
                continue
            g3 = resto // 3
            diretos = 2 * g4 + g3   # padrão: g4→2, g3→1
            if diretos > target:
                continue
            vagas_wc = target - diretos
            if best is None or vagas_wc < best[0]:
                best = (vagas_wc, target, g3, g4)

    if best is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Não foi possível distribuir {N} equipes em grupos de 3 ou 4.",
        )

    vagas_wc, target, g3, g4 = best
    return {
        "tamanhos": [4] * g4 + [3] * g3,
        "classificados_por_grupo": [2] * g4 + [1] * g3,
        "regra": "WILDCARD",
        "vagas_bracket": target,
        "vagas_wildcard": vagas_wc,
    }


async def _gerar_bracket(
    cur: psycopg.AsyncCursor,
    campeonato_id: int,
    participantes_diretos: list[int],
    vagas_bracket: int,
    vagas_wildcard: int,
) -> None:
    """
    Insere as partidas do chaveamento eliminatório.

    participantes_diretos – equipe_ids dos classificados diretos (seeds 1..N).
    vagas_wildcard        – slots WILDCARD_X ainda sem equipe.
    vagas_bracket         – tamanho total do bracket (deve ser potência de 2).
    """
    fase_inicial = _fase_por_tamanho_chave(vagas_bracket)
    total_rodadas = int(log2(vagas_bracket))

    # Slots: diretos primeiro, wildcards como None no final
    slots: list[int | None] = participantes_diretos + ([None] * vagas_wildcard)
    wc_inicio = len(participantes_diretos)

    for idx in range(vagas_bracket // 2):
        slot_a_idx = idx
        slot_b_idx = vagas_bracket - 1 - idx

        mandante = slots[slot_a_idx] if slot_a_idx < len(slots) else None
        visitante = slots[slot_b_idx] if slot_b_idx < len(slots) else None

        m_is_wc = slot_a_idx >= wc_inicio
        v_is_wc = slot_b_idx >= wc_inicio
        is_wc_pending = m_is_wc or v_is_wc
        is_bye = (not is_wc_pending) and (mandante is None or visitante is None)
        vencedor = None
        if is_bye:
            vencedor = mandante if visitante is None else visitante

        await cur.execute(
            """
            INSERT INTO campeonato_partidas (
                campeonato_id, fase, rodada, grupo_id,
                mandante_equipe_id, visitante_equipe_id, vencedor_equipe_id,
                is_bye, is_wildcard_pending,
                mandante_is_wildcard, visitante_is_wildcard,
                origem_slot_a, origem_slot_b
            )
            VALUES (%s, %s, 1, NULL, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                campeonato_id,
                fase_inicial,
                mandante,
                visitante,
                vencedor,
                is_bye,
                is_wc_pending,
                m_is_wc,
                v_is_wc,
                f"SEED_{slot_a_idx + 1}",
                f"SEED_{slot_b_idx + 1}",
            ),
        )

    partidas_na_rodada = vagas_bracket // 2
    for rodada in range(2, total_rodadas + 1):
        partidas_na_rodada //= 2
        fase_rodada = _fase_por_tamanho_chave(partidas_na_rodada * 2)
        for idx in range(partidas_na_rodada):
            await cur.execute(
                """
                INSERT INTO campeonato_partidas (
                    campeonato_id, fase, rodada, grupo_id,
                    mandante_equipe_id, visitante_equipe_id, vencedor_equipe_id,
                    is_bye, is_wildcard_pending, origem_slot_a, origem_slot_b
                )
                VALUES (%s, %s, %s, NULL, NULL, NULL, NULL, FALSE, FALSE, %s, %s)
                """,
                (
                    campeonato_id,
                    fase_rodada,
                    rodada,
                    f"R{rodada - 1}M{(idx * 2) + 1}",
                    f"R{rodada - 1}M{(idx * 2) + 2}",
                ),
            )


async def gerar_estrutura_campeonato(
    conn: psycopg.AsyncConnection,
    campeonato_id: int,
    executor_user_id: int,
) -> dict[str, Any]:
    """
    Gera estrutura de grupos + partidas + chave eliminatória em transação única.
    Requer campeonato autorizado e em estado RASCUNHO.

    Casos por N (total de equipes inscritas):
      N=1  → campeão automático, sem partidas.
      N=2  → chave direta: 1 FINAL.
      N=3  → grupo único round-robin; top 2 disputam FINAL.
      N=4  → chave direta: 2 SEMIs + FINAL.
      N=5  → grupo único round-robin; top 2 disputam FINAL.
      N≥6  → algoritmo de 3 regras (PADRAO / IGUALDADE / WILDCARD).
    """
    async with conn.transaction():
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, edicao_id, esporte_variante_id, status,
                       geracao_autorizada_em, geracao_executada_em
                FROM campeonatos
                WHERE id = %s
                """,
                (campeonato_id,),
            )
            campeonato = await cur.fetchone()
            if not campeonato:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")
            if campeonato["status"] != "RASCUNHO":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A geração só é permitida para campeonatos em RASCUNHO.",
                )
            if campeonato.get("geracao_autorizada_em") is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A geração exige autorização administrativa prévia.",
                )
            if campeonato.get("geracao_executada_em") is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Estrutura já gerada para este campeonato.",
                )

            await cur.execute("SELECT COUNT(*) AS total FROM campeonato_grupos WHERE campeonato_id = %s", (campeonato_id,))
            if (await cur.fetchone())["total"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Estrutura já existente para este campeonato.",
                )

            await cur.execute(
                "SELECT id FROM equipes WHERE edicao_id = %s AND esporte_variante_id = %s ORDER BY id",
                (campeonato["edicao_id"], campeonato["esporte_variante_id"]),
            )
            equipe_ids = [int(r["id"]) for r in await cur.fetchall()]
            total_equipes = len(equipe_ids)

            # --- N = 1: campeão automático por WO ---
            if total_equipes == 1:
                equipe_id = equipe_ids[0]
                await cur.execute(
                    """
                    UPDATE campeonatos
                    SET status = 'FINALIZADO',
                        regra_distribuicao = 'DIRETO',
                        vagas_bracket = 2,
                        vagas_wildcard = 0,
                        geracao_executada_em = NOW(),
                        geracao_executada_por = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (executor_user_id, campeonato_id),
                )
                # Cria partida BYE de FINAL para que o bracket seja exibível
                await cur.execute(
                    """
                    INSERT INTO campeonato_partidas (
                        campeonato_id, fase, rodada, grupo_id,
                        mandante_equipe_id, visitante_equipe_id, vencedor_equipe_id,
                        is_bye, is_wildcard_pending,
                        origem_slot_a, origem_slot_b
                    )
                    VALUES (%s, 'FINAL', 1, NULL, %s, NULL, %s, TRUE, FALSE, 'SEED_1', 'SEED_2')
                    """,
                    (campeonato_id, equipe_id, equipe_id),
                )
                return {
                    "campeonato_id": campeonato_id,
                    "total_equipes": 1,
                    "usa_grupos": False,
                    "total_grupos": 0,
                    "total_classificados_iniciais": 1,
                    "tamanho_chave": 2,
                    "total_partidas": 1,
                }

            if total_equipes < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="É necessário ao menos 2 equipes para gerar a estrutura.",
                )

            grupo_ids: list[int] = []
            participantes_diretos: list[int] = []
            regra_distribuicao: str
            vagas_bracket: int
            vagas_wildcard: int

            # --- N = 3 ou 5: grupo único, round-robin, top 2 disputam FINAL ---
            if total_equipes in (3, 5):
                regra_distribuicao = "UNICO"
                vagas_bracket = 2
                vagas_wildcard = 0

                await cur.execute(
                    "INSERT INTO campeonato_grupos (campeonato_id, nome, ordem, classificados_diretos) VALUES (%s, 'A', 1, 2) RETURNING id",
                    (campeonato_id,),
                )
                grupo_id = int((await cur.fetchone())["id"])
                grupo_ids.append(grupo_id)

                for seed_idx, equipe_id in enumerate(equipe_ids, start=1):
                    await cur.execute(
                        "INSERT INTO campeonato_grupo_equipes (grupo_id, equipe_id, seed_no_grupo) VALUES (%s, %s, %s)",
                        (grupo_id, equipe_id, seed_idx),
                    )

                for rodada_idx, (mandante_id, visitante_id) in enumerate(_gerar_confrontos_round_robin(equipe_ids), start=1):
                    await cur.execute(
                        """
                        INSERT INTO campeonato_partidas (campeonato_id, fase, rodada, grupo_id, mandante_equipe_id, visitante_equipe_id, is_bye)
                        VALUES (%s, 'GRUPOS', %s, %s, %s, %s, FALSE)
                        """,
                        (campeonato_id, rodada_idx, grupo_id, mandante_id, visitante_id),
                    )

                # Top 2 seeds como placeholder do bracket; substituídos após o grupo fechar
                participantes_diretos = equipe_ids[:2]

            # --- N = 2 ou 4: chave direta, sem grupos ---
            elif total_equipes in (2, 4):
                regra_distribuicao = "DIRETO"
                vagas_bracket = total_equipes
                vagas_wildcard = 0
                participantes_diretos = equipe_ids

            # --- N ≥ 6: algoritmo de distribuição ---
            else:
                dist = calcular_distribuicao_grupos(total_equipes)
                regra_distribuicao = dist["regra"]
                vagas_bracket = dist["vagas_bracket"]
                vagas_wildcard = dist["vagas_wildcard"]
                tamanhos = dist["tamanhos"]
                classificados_por_grupo = dist["classificados_por_grupo"]

                if len(tamanhos) > 26:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Limite excedido: máximo de 26 grupos por campeonato.",
                    )

                grupos_distribuidos = _snake_distribuicao_com_tamanho(equipe_ids, tamanhos)

                for idx, equipes_grupo in enumerate(grupos_distribuidos):
                    classif_diretos = classificados_por_grupo[idx]
                    await cur.execute(
                        """
                        INSERT INTO campeonato_grupos (campeonato_id, nome, ordem, classificados_diretos)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id
                        """,
                        (campeonato_id, _nome_grupo_por_indice(idx), idx + 1, classif_diretos),
                    )
                    grupo_id = int((await cur.fetchone())["id"])
                    grupo_ids.append(grupo_id)

                    for seed_idx, equipe_id in enumerate(equipes_grupo, start=1):
                        await cur.execute(
                            "INSERT INTO campeonato_grupo_equipes (grupo_id, equipe_id, seed_no_grupo) VALUES (%s, %s, %s)",
                            (grupo_id, equipe_id, seed_idx),
                        )

                    for rodada_idx, (mandante_id, visitante_id) in enumerate(_gerar_confrontos_round_robin(equipes_grupo), start=1):
                        await cur.execute(
                            """
                            INSERT INTO campeonato_partidas (campeonato_id, fase, rodada, grupo_id, mandante_equipe_id, visitante_equipe_id, is_bye)
                            VALUES (%s, 'GRUPOS', %s, %s, %s, %s, FALSE)
                            """,
                            (campeonato_id, rodada_idx, grupo_id, mandante_id, visitante_id),
                        )

                    # Seeds iniciais como placeholder no bracket
                    participantes_diretos.extend(equipes_grupo[:classif_diretos])

            # Gera bracket eliminatório
            await _gerar_bracket(cur, campeonato_id, participantes_diretos, vagas_bracket, vagas_wildcard)

            status_novo = "FINALIZADO" if total_equipes == 1 else "GERADO"
            await cur.execute(
                """
                UPDATE campeonatos
                SET status = %s,
                    regra_distribuicao = %s,
                    vagas_bracket = %s,
                    vagas_wildcard = %s,
                    geracao_executada_em = NOW(),
                    geracao_executada_por = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (status_novo, regra_distribuicao, vagas_bracket, vagas_wildcard, executor_user_id, campeonato_id),
            )

            await cur.execute("SELECT COUNT(*) AS total FROM campeonato_partidas WHERE campeonato_id = %s", (campeonato_id,))
            total_partidas = (await cur.fetchone())["total"] or 0

    return {
        "campeonato_id": campeonato_id,
        "total_equipes": total_equipes,
        "usa_grupos": total_equipes not in (2, 4),
        "total_grupos": len(grupo_ids),
        "total_classificados_iniciais": len(participantes_diretos),
        "tamanho_chave": vagas_bracket,
        "total_partidas": total_partidas,
    }


async def gerar_partidas_para_grupos_existentes(
    conn: psycopg.AsyncConnection,
    campeonato_id: int,
    executor_user_id: int,
) -> dict[str, Any]:
    """
    Gera partidas (round-robin + mata-mata) para grupos e equipes já persistidos.
    Usado pelo fluxo de sorteio manual.
    Esta função NÃO gerencia transação — depende do contexto do chamador.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, vagas_bracket, vagas_wildcard, regra_distribuicao FROM campeonatos WHERE id = %s",
            (campeonato_id,),
        )
        campeonato = await cur.fetchone()
        if not campeonato:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campeonato não encontrado.")

        vagas_bracket: int = campeonato["vagas_bracket"]
        vagas_wildcard: int = campeonato["vagas_wildcard"] or 0

        await cur.execute(
            "SELECT id, classificados_diretos FROM campeonato_grupos WHERE campeonato_id = %s ORDER BY ordem",
            (campeonato_id,),
        )
        grupos_rows = await cur.fetchall()
        if not grupos_rows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum grupo encontrado para este campeonato.",
            )

        total_equipes = 0
        participantes_diretos: list[int] = []

        for grupo_row in grupos_rows:
            grupo_id = int(grupo_row["id"])
            classif_diretos = int(grupo_row["classificados_diretos"])

            await cur.execute(
                "SELECT equipe_id FROM campeonato_grupo_equipes WHERE grupo_id = %s ORDER BY seed_no_grupo",
                (grupo_id,),
            )
            equipes_grupo = [int(r["equipe_id"]) for r in await cur.fetchall()]
            total_equipes += len(equipes_grupo)

            for rodada_idx, (mandante_id, visitante_id) in enumerate(_gerar_confrontos_round_robin(equipes_grupo), start=1):
                await cur.execute(
                    """
                    INSERT INTO campeonato_partidas (campeonato_id, fase, rodada, grupo_id, mandante_equipe_id, visitante_equipe_id, is_bye)
                    VALUES (%s, 'GRUPOS', %s, %s, %s, %s, FALSE)
                    """,
                    (campeonato_id, rodada_idx, grupo_id, mandante_id, visitante_id),
                )

            participantes_diretos.extend(equipes_grupo[:classif_diretos])

        await _gerar_bracket(cur, campeonato_id, participantes_diretos, vagas_bracket, vagas_wildcard)

        await cur.execute(
            """
            UPDATE campeonatos
            SET status = 'GERADO',
                geracao_executada_em = NOW(),
                geracao_executada_por = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            (executor_user_id, campeonato_id),
        )

        await cur.execute("SELECT COUNT(*) AS total FROM campeonato_partidas WHERE campeonato_id = %s", (campeonato_id,))
        total_partidas = (await cur.fetchone())["total"] or 0

    return {
        "campeonato_id": campeonato_id,
        "total_equipes": total_equipes,
        "total_grupos": len(grupos_rows),
        "total_classificados_iniciais": len(participantes_diretos),
        "tamanho_chave": vagas_bracket,
        "total_partidas": total_partidas,
    }


async def gerar_estrutura_direto(
    conn: psycopg.AsyncConnection,
    campeonato_id: int,
    equipe_ids: list[int],
    executor_user_id: int,
) -> None:
    """
    Gera estrutura sem fase de grupos para N=1, N=2 ou N=4.
    Não gerencia transação — depende do contexto do chamador.
    """
    total = len(equipe_ids)
    async with conn.cursor() as cur:
        if total == 1:
            equipe_id = equipe_ids[0]
            await cur.execute(
                """
                UPDATE campeonatos
                SET status = 'FINALIZADO',
                    regra_distribuicao = 'DIRETO',
                    vagas_bracket = 2,
                    vagas_wildcard = 0,
                    geracao_autorizada_em = NOW(),
                    geracao_autorizada_por = %s,
                    geracao_executada_em = NOW(),
                    geracao_executada_por = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (executor_user_id, executor_user_id, campeonato_id),
            )
            await cur.execute(
                """
                INSERT INTO campeonato_partidas (
                    campeonato_id, fase, rodada, grupo_id,
                    mandante_equipe_id, visitante_equipe_id, vencedor_equipe_id,
                    is_bye, is_wildcard_pending,
                    origem_slot_a, origem_slot_b
                )
                VALUES (%s, 'FINAL', 1, NULL, %s, NULL, %s, TRUE, FALSE, 'SEED_1', 'SEED_2')
                """,
                (campeonato_id, equipe_id, equipe_id),
            )
        else:
            await _gerar_bracket(cur, campeonato_id, equipe_ids, total, 0)
            await cur.execute(
                """
                UPDATE campeonatos
                SET status = 'GERADO',
                    regra_distribuicao = 'DIRETO',
                    vagas_bracket = %s,
                    vagas_wildcard = 0,
                    geracao_autorizada_em = NOW(),
                    geracao_autorizada_por = %s,
                    geracao_executada_em = NOW(),
                    geracao_executada_por = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (total, executor_user_id, executor_user_id, campeonato_id),
            )
