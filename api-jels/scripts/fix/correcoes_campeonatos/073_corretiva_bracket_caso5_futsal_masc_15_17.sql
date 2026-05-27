-- =============================================================================
-- SCRIPT 073 — Correção de bracket: Futsal Masculino 15–17 anos (campeonato_id=3)
-- Data: 2026-05-27
-- Contexto: Caso 5 dos bugs de bracket. Todos os 7 grupos estavam completos mas
-- apenas o Grupo A teve seus slots de bracket atualizados — os demais (B–G)
-- nunca dispararam avancar_classificados_para_mata_mata porque os resultados
-- foram inseridos em batch sem passar pelo endpoint da API.
-- =============================================================================
--
-- ESTRUTURA DO BRACKET (16 equipes, oitavas-de-final)
-- Seeds atribuídos 2 por grupo, em ordem A→G, depois wildcards:
--   SEED_1  = 1°A  → jogo 100 mandante   SEED_16 = wildcard 2 → jogo 100 visitante
--   SEED_2  = 2°A  → jogo 101 mandante   SEED_15 = wildcard 1 → jogo 101 visitante
--   SEED_3  = 1°B  → jogo 102 mandante   SEED_14 = 2°G        → jogo 102 visitante
--   SEED_4  = 2°B  → jogo 103 mandante   SEED_13 = 1°G        → jogo 103 visitante
--   SEED_5  = 1°C  → jogo 104 mandante   SEED_12 = 2°F        → jogo 104 visitante
--   SEED_6  = 2°C  → jogo 105 mandante   SEED_11 = 1°F        → jogo 105 visitante
--   SEED_7  = 1°D  → jogo 106 mandante   SEED_10 = 2°E        → jogo 106 visitante
--   SEED_8  = 2°D  → jogo 107 mandante   SEED_9  = 1°E        → jogo 107 visitante
--
-- CLASSIFICAÇÃO REAL DOS GRUPOS (pós-análise 2026-05-27)
-- -------------------------------------------------------
-- Grupo A: 1°=1000 (seed4), 2°=1058 (seed1) → JÁ CORRETO no bracket
-- Grupo B: 1°=1125 (seed1), 2°=1147 (seed2) → seeds não mudaram, JÁ CORRETO
-- Grupo C: 1°=933  (seed3), 2°=984  (seed1) → bracket tem seeds originais 984/1007
-- Grupo D: 1°=1071 (seed1), 2°=743  (seed4) → bracket tem 1179 em SEED_8
-- Grupo E: 1°=785  (seed3), 2°=897  (seed1) → bracket tem seeds originais 897/1115
-- Grupo F: 1°=825  (seed2), 2°=875  (seed4) → bracket tem seeds originais 1049/825
-- Grupo G: 1°=886  (seed2), 2°=1013 (seed1) → SEED_13=1013 (errado), SEED_14=NULL
--            (886 foi adicionado ao grupo G após geração do bracket → slot nunca preenchido)
--
-- WILDCARDS (2 melhores 3° colocados entre todos os grupos)
--   1115 — 3°E (4pts, SG=0)  → SEED_15 (jogo 101 visitante)
--   1179 — 3°D (4pts, SG=-1) → SEED_16 (jogo 100 visitante)
-- =============================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- GRUPO C: jogo 104 (SEED_5 vs SEED_12) + jogo 105 (SEED_6 vs SEED_11)
-- Seeds originais: SEED_5=984(C_seed1), SEED_6=1007(C_seed2)
--                  SEED_12=825(F_seed2), SEED_11=1049(F_seed1)
-- Correção simultânea de C e F (slots no mesmo par de jogos)
-- -------------------------------------------------------------------------
-- jogo 104: SEED_5=1°C=933, SEED_12=2°F=875
UPDATE campeonato_partidas
SET mandante_equipe_id = 933,
    visitante_equipe_id = 875,
    updated_at = NOW()
WHERE id = 104;

-- jogo 105: SEED_6=2°C=984, SEED_11=1°F=825
UPDATE campeonato_partidas
SET mandante_equipe_id = 984,
    visitante_equipe_id = 825,
    updated_at = NOW()
WHERE id = 105;

-- -------------------------------------------------------------------------
-- GRUPO D (SEED_8) + GRUPO E (SEED_9, SEED_10)
-- jogo 106 (SEED_7 vs SEED_10): mandante=1071 correto, visitante=1115→897(2°E)
-- jogo 107 (SEED_8 vs SEED_9):  mandante=1179→743(2°D), visitante=897→785(1°E)
-- -------------------------------------------------------------------------
UPDATE campeonato_partidas
SET visitante_equipe_id = 897,
    updated_at = NOW()
WHERE id = 106;

UPDATE campeonato_partidas
SET mandante_equipe_id = 743,
    visitante_equipe_id = 785,
    updated_at = NOW()
WHERE id = 107;

-- -------------------------------------------------------------------------
-- GRUPO G: jogo 103 (SEED_4 vs SEED_13), jogo 102 (SEED_3 vs SEED_14)
-- SEED_13=1°G=886 (era 1013), SEED_14=2°G=1013 (era NULL — 886 adicionado pós-geração)
-- -------------------------------------------------------------------------
-- jogo 103 visitante: 1013 → 886
UPDATE campeonato_partidas
SET visitante_equipe_id = 886,
    updated_at = NOW()
WHERE id = 103;

-- jogo 102 visitante: NULL → 1013
UPDATE campeonato_partidas
SET visitante_equipe_id = 1013,
    updated_at = NOW()
WHERE id = 102;

-- -------------------------------------------------------------------------
-- WILDCARDS
-- SEED_15 (jogo 101 visitante): melhor wildcard = 1115 (3°E, 4pts, SG=0)
-- SEED_16 (jogo 100 visitante): 2° wildcard    = 1179 (3°D, 4pts, SG=-1)
-- -------------------------------------------------------------------------
UPDATE campeonato_partidas
SET visitante_equipe_id = 1115,
    is_wildcard_pending = FALSE,
    updated_at = NOW()
WHERE id = 101;

UPDATE campeonato_partidas
SET visitante_equipe_id = 1179,
    is_wildcard_pending = FALSE,
    updated_at = NOW()
WHERE id = 100;

COMMIT;

-- =============================================================================
-- ESTADO ESPERADO APÓS EXECUÇÃO
-- jogo 100: 1000 vs 1179  (SEED_1 vs SEED_16)
-- jogo 101: 1058 vs 1115  (SEED_2 vs SEED_15)
-- jogo 102: 1125 vs 1013  (SEED_3 vs SEED_14)
-- jogo 103: 1147 vs 886   (SEED_4 vs SEED_13)
-- jogo 104: 933  vs 875   (SEED_5 vs SEED_12)
-- jogo 105: 984  vs 825   (SEED_6 vs SEED_11)
-- jogo 106: 1071 vs 897   (SEED_7 vs SEED_10)
-- jogo 107: 743  vs 785   (SEED_8 vs SEED_9)
-- =============================================================================
