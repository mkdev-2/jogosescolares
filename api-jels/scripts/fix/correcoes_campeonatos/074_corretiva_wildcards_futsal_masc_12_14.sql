-- =============================================================================
-- SCRIPT 074 — Correção de wildcards: Futsal Masculino 12–14 anos (campeonato_id=1)
-- Data: 2026-05-27
-- Contexto: Os wildcards foram calculados com o bug em _recalcular_stats_equalizados
-- que excluía o seed4 inicial do sorteio (não o 4° colocado real após os jogos).
-- Em grupos onde o seed4 não terminou em último (ex.: Grupo A: seed4=1074 terminou 3°),
-- a equipe equalizadora errada foi usada, distorcendo o ranking de wildcards.
-- =============================================================================
--
-- GRUPOS E CLASSIFICAÇÕES FINAIS (campeonato_id=1)
-- -------------------------------------------------
-- Grupo A (grupo_id=1): 1°=734, 2°=941, 3°=1074(seed4), 4°real=1146(seed3)
-- Grupo B (grupo_id=2): 1°=1283, 2°=947, 3°=1088(seed3), 4°real=905(seed2)
-- Grupo C (grupo_id=3): 1°=1006, 2°=1072(desempate avg), 3°=719, 4°real=800(seed1)
-- Grupo D (grupo_id=4): 1°=1108, 2°=1296, 3°=861(seed1), 4°real=1204(seed2)
-- Grupo E (grupo_id=5): 1°=1106, 2°=879, 3°=738(seed3), 4°real=1233(seed4 = OK)
-- Grupo F (grupo_id=6): 1°=1044, 2°=1175(sorteio), 3°=1127 [3 times, sem equalização]
--
-- STATS EQUALIZADAS CORRETAS (excluindo jogos vs 4° real)
-- --------------------------------------------------------
-- 1074 (A): pts=1, V=0, E=1, pro=2, contra=4   (jogos vs 734 e 941, sem 1146)
-- 719  (C): pts=1, V=0, E=1, pro=2, contra=5   (jogos vs 1006 e 1072, sem 800)
-- 1127 (F): pts=1, V=0, E=1, pro=3, contra=6   (sem equalização; 3 times)
-- 861  (D): pts=0, V=0, E=0, pro=3, contra=7   (jogos vs 1108 e 1296, sem 1204)
-- 1088 (B): pts=0, V=0, E=0, pro=0, contra=8   (jogos vs 947 e 1283, sem 905)
-- 738  (E): pts=0, V=0, E=0, pro=0, contra=10  (jogos vs 879 e 1106, sem 1233)
--
-- RANKING CORRETO (criterios_3plus sem CONFRONTO_DIRETO):
--   Pts → MAIOR_VITORIAS (todos 0) → AVERAGE_DIRETO (grupos distintos, todos 1.0)
--   → SALDO_DIRETO (todos 0) → MENOR_CONTRA_GERAL
--   1° = 1074 (1pt, contra=4)
--   2° = 719  (1pt, contra=5)
--   3° = 1127 (1pt, contra=6)
--   4° = 861  (0pt, contra=7)   ← pior dos 4 wildcards
--
-- ATRIBUIÇÃO DE SLOTS (wild_cards_invertidos, ORDER BY id ASC):
--   jogo34 (SEED_16, id menor) ← wildcard mais fraco (4°) = 861
--   jogo35 (SEED_15)           ← 3° = 1127
--   jogo36 (SEED_14)           ← 2° = 719
--   jogo37 (SEED_13, id maior) ← wildcard mais forte (1°) = 1074
--
-- ESTADO ATUAL (calculado com bug):
--   jogo34 visitante = 1127 (errado → deve ser 861)
--   jogo35 visitante = 861  (errado → deve ser 1127)
--   jogo36 visitante = 1088 (errado → deve ser 719; 1088 não deveria estar no bracket)
--   jogo37 visitante = 719  (errado → deve ser 1074; 1074 ausente do bracket)
-- =============================================================================

BEGIN;

-- jogo34: SEED_1(734) vs SEED_16 → wildcard mais fraco = 861
UPDATE campeonato_partidas
SET visitante_equipe_id = 861,
    updated_at = NOW()
WHERE id = 34;

-- jogo35: SEED_2(1283) vs SEED_15 → 3° wildcard = 1127
UPDATE campeonato_partidas
SET visitante_equipe_id = 1127,
    updated_at = NOW()
WHERE id = 35;

-- jogo36: SEED_3(1006) vs SEED_14 → 2° wildcard = 719
UPDATE campeonato_partidas
SET visitante_equipe_id = 719,
    updated_at = NOW()
WHERE id = 36;

-- jogo37: SEED_4(1108) vs SEED_13 → wildcard mais forte = 1074
UPDATE campeonato_partidas
SET visitante_equipe_id = 1074,
    updated_at = NOW()
WHERE id = 37;

COMMIT;

-- =============================================================================
-- ESTADO ESPERADO APÓS EXECUÇÃO (oitavas-de-final)
-- jogo34: 734  vs 861   (SEED_1 vs SEED_16)
-- jogo35: 1283 vs 1127  (SEED_2 vs SEED_15)
-- jogo36: 1006 vs 719   (SEED_3 vs SEED_14)
-- jogo37: 1108 vs 1074  (SEED_4 vs SEED_13)
-- jogo38: 1106 vs 941   (SEED_5 vs SEED_12) — inalterado
-- jogo39: 1044 vs 947   (SEED_6 vs SEED_11) — inalterado
-- jogo40: 1175 vs 1072  (SEED_7 vs SEED_10) — inalterado
-- jogo41: 879  vs 1296  (SEED_8 vs SEED_9)  — inalterado
-- =============================================================================
