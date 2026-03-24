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
    # MVP: suporta até 26 grupos (A-Z), suficiente para o escopo.
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


def _gerar_bracket_slots(participantes_ordenados: list[int], chave_tamanho: int) -> list[int | None]:
    byes = chave_tamanho - len(participantes_ordenados)
    return participantes_ordenados + ([None] * byes)


def _distribuir_tamanhos_grupos(total_equipes: int) -> list[int]:
    """
    Distribui equipes em grupos de tamanho 3 ou 4.
    Regra: usado apenas quando total_equipes >= 6.
    """
    if total_equipes < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Distribuição em grupos só é permitida com 6 ou mais equipes.",
        )

    num_grupos = ceil(total_equipes / 4)
    if num_grupos > 26:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limite excedido: no máximo 26 grupos por campeonato.",
        )

    minimo_viavel = num_grupos * 3
    maximo_viavel = num_grupos * 4
    if total_equipes < minimo_viavel or total_equipes > maximo_viavel:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível distribuir equipes em grupos de 3 ou 4.",
        )

    # Começa com todos grupos de 3 e distribui sobras para virar grupos de 4.
    tamanhos = [3] * num_grupos
    sobras = total_equipes - minimo_viavel
    for i in range(sobras):
        tamanhos[i] += 1
    return tamanhos


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


async def gerar_estrutura_campeonato(
    conn: psycopg.AsyncConnection,
    campeonato_id: int,
    executor_user_id: int,
) -> dict[str, Any]:
    """
    Gera estrutura de grupos + partidas + chave eliminatória em transação única.
    Requer campeonato autorizado e em estado RASCUNHO.
    """
    async with conn.transaction():
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, edicao_id, esporte_variante_id, status,
                       grupo_tamanho_ideal, classificam_por_grupo,
                       permite_melhores_terceiros, geracao_autorizada_em,
                       geracao_executada_em
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
            total_grupos_existentes = (await cur.fetchone())["total"] or 0
            await cur.execute("SELECT COUNT(*) AS total FROM campeonato_partidas WHERE campeonato_id = %s", (campeonato_id,))
            total_partidas_existentes = (await cur.fetchone())["total"] or 0
            if total_grupos_existentes > 0 or total_partidas_existentes > 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Estrutura já existente para este campeonato. Reprocessamento exige fluxo controlado.",
                )

            await cur.execute(
                """
                SELECT id
                FROM equipes
                WHERE edicao_id = %s AND esporte_variante_id = %s
                ORDER BY id
                """,
                (campeonato["edicao_id"], campeonato["esporte_variante_id"]),
            )
            equipes_rows = await cur.fetchall()
            equipe_ids = [int(r["id"]) for r in equipes_rows]
            total_equipes = len(equipe_ids)
            if total_equipes < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="É necessário ao menos 2 equipes para gerar a estrutura.",
                )

            usar_grupos = total_equipes >= 6

            grupo_ids: list[int] = []
            classificados_iniciais: list[int] = []

            if usar_grupos:
                tamanhos_grupos = _distribuir_tamanhos_grupos(total_equipes)
                num_grupos = len(tamanhos_grupos)
                grupos_distribuidos = _snake_distribuicao_com_tamanho(equipe_ids, tamanhos_grupos)

                for idx, equipes_grupo in enumerate(grupos_distribuidos):
                    await cur.execute(
                        """
                        INSERT INTO campeonato_grupos (campeonato_id, nome, ordem)
                        VALUES (%s, %s, %s)
                        RETURNING id
                        """,
                        (campeonato_id, _nome_grupo_por_indice(idx), idx + 1),
                    )
                    grupo_id = (await cur.fetchone())["id"]
                    grupo_ids.append(int(grupo_id))

                    for seed_idx, equipe_id in enumerate(equipes_grupo, start=1):
                        await cur.execute(
                            """
                            INSERT INTO campeonato_grupo_equipes (grupo_id, equipe_id, seed_no_grupo)
                            VALUES (%s, %s, %s)
                            """,
                            (grupo_id, equipe_id, seed_idx),
                        )

                    confrontos = _gerar_confrontos_round_robin(equipes_grupo)
                    for rodada_idx, (mandante_id, visitante_id) in enumerate(confrontos, start=1):
                        await cur.execute(
                            """
                            INSERT INTO campeonato_partidas (
                                campeonato_id, fase, rodada, grupo_id,
                                mandante_equipe_id, visitante_equipe_id, is_bye
                            )
                            VALUES (%s, 'GRUPOS', %s, %s, %s, %s, FALSE)
                            """,
                            (campeonato_id, rodada_idx, grupo_id, mandante_id, visitante_id),
                        )

                    # MVP: classificação inicial determinística por seed no grupo (2 por grupo).
                    classificados_grupo = equipes_grupo[:2]
                    classificados_iniciais.extend(classificados_grupo)

            participantes_mata_mata = classificados_iniciais if usar_grupos else equipe_ids
            if len(participantes_mata_mata) < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Não há equipes suficientes para montar o mata-mata após classificação inicial.",
                )

            chave_tamanho = _proxima_potencia_2(len(participantes_mata_mata))
            if usar_grupos and len(participantes_mata_mata) > 52:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Limite excedido: máximo de 52 classificados para o mata-mata.",
                )
            fase_inicial = _fase_por_tamanho_chave(chave_tamanho)
            slots = _gerar_bracket_slots(participantes_mata_mata, chave_tamanho)
            total_rodadas = int(log2(chave_tamanho))

            for idx in range(chave_tamanho // 2):
                mandante = slots[idx]
                visitante = slots[-(idx + 1)]
                is_bye = mandante is None or visitante is None
                vencedor = mandante if visitante is None else (visitante if mandante is None else None)

                await cur.execute(
                    """
                    INSERT INTO campeonato_partidas (
                        campeonato_id, fase, rodada, grupo_id,
                        mandante_equipe_id, visitante_equipe_id, vencedor_equipe_id,
                        is_bye, origem_slot_a, origem_slot_b
                    )
                    VALUES (%s, %s, 1, NULL, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        campeonato_id,
                        fase_inicial,
                        mandante,
                        visitante,
                        vencedor,
                        is_bye,
                        f"SEED_{idx + 1}",
                        f"SEED_{chave_tamanho - idx}",
                    ),
                )

            partidas_na_rodada = chave_tamanho // 2
            for rodada in range(2, total_rodadas + 1):
                partidas_na_rodada //= 2
                fase_rodada = _fase_por_tamanho_chave(partidas_na_rodada * 2)
                for idx in range(partidas_na_rodada):
                    await cur.execute(
                        """
                        INSERT INTO campeonato_partidas (
                            campeonato_id, fase, rodada, grupo_id,
                            mandante_equipe_id, visitante_equipe_id, vencedor_equipe_id,
                            is_bye, origem_slot_a, origem_slot_b
                        )
                        VALUES (%s, %s, %s, NULL, NULL, NULL, NULL, FALSE, %s, %s)
                        """,
                        (
                            campeonato_id,
                            fase_rodada,
                            rodada,
                            f"R{rodada - 1}M{(idx * 2) + 1}",
                            f"R{rodada - 1}M{(idx * 2) + 2}",
                        ),
                    )

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
        "usa_grupos": usar_grupos,
        "total_grupos": len(grupo_ids),
        "total_classificados_iniciais": len(participantes_mata_mata),
        "tamanho_chave": chave_tamanho,
        "total_partidas": total_partidas,
    }
