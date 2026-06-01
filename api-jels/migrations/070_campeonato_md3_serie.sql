-- Suporte a séries MD3 (melhor de 3) para campeonatos com 2 equipes.
-- Cada campeonato agora declara quantos jogos por confronto final (padrão 1).
-- Cada partida da série tem num_jogo_serie para identificar sua posição.

ALTER TABLE campeonatos
    ADD COLUMN jogos_por_confronto_final INTEGER NOT NULL DEFAULT 1;

ALTER TABLE campeonato_partidas
    ADD COLUMN num_jogo_serie INTEGER;

-- Campeonatos com 2 equipes passam a ser MD3
UPDATE campeonatos
    SET jogos_por_confronto_final = 3
    WHERE vagas_bracket = 2 AND regra_distribuicao = 'DIRETO';

-- Partidas existentes desses campeonatos viram jogo 1 da série
UPDATE campeonato_partidas
    SET num_jogo_serie = 1
    WHERE campeonato_id IN (
        SELECT id FROM campeonatos WHERE jogos_por_confronto_final = 3
    );

-- Camp. 8 (Beach Soccer F 12-14): revert FINALIZADO → EM_ANDAMENTO
-- O jogo 1 (id=146) já aconteceu (7×1 para equipe 1056), mas era o único jogo.
-- Agora é uma série, então o campeonato ainda não terminou.
UPDATE campeonatos SET status = 'EM_ANDAMENTO' WHERE id = 8;

-- Camp. 8: jogo 2 (equipes invertidas: 924 = E. M. BENJAMIN PEIXOTO como mandante)
INSERT INTO campeonato_partidas (
    campeonato_id, fase, rodada, grupo_id,
    mandante_equipe_id, visitante_equipe_id,
    is_bye, is_wildcard_pending,
    mandante_is_wildcard, visitante_is_wildcard,
    origem_slot_a, origem_slot_b,
    num_jogo_serie
) VALUES (8, 'FINAL', 1, NULL, 924, 1056, FALSE, FALSE, FALSE, FALSE, 'SEED_2', 'SEED_1', 2);

-- Camp. 10 (Beach Soccer F 15-17): jogo 2 (equipes invertidas: 1324 = Iguaíba como mandante)
INSERT INTO campeonato_partidas (
    campeonato_id, fase, rodada, grupo_id,
    mandante_equipe_id, visitante_equipe_id,
    is_bye, is_wildcard_pending,
    mandante_is_wildcard, visitante_is_wildcard,
    origem_slot_a, origem_slot_b,
    num_jogo_serie
) VALUES (10, 'FINAL', 1, NULL, 1324, 828, FALSE, FALSE, FALSE, FALSE, 'SEED_2', 'SEED_1', 2);
