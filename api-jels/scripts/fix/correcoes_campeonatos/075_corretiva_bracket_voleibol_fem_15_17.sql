-- =============================================================================
-- SCRIPT 075 — Correção de bracket: Voleibol Feminino 15–17 anos (campeonato_id=6)
-- Data: 2026-05-27
-- Contexto: O script 066 converteu o slot SEED_4 (jogo 140 visitante) de wildcard
-- para classificado direto (Grupo B 2° lugar), mas não preencheu o equipe_id.
-- O bracket foi gerado originalmente com vagas_wildcard=1 e Grupo B classificando
-- apenas 1 direto. Quando 066 alterou para 2 diretos + vagas_wildcard=0, o slot
-- is_wildcard_pending foi zerado mas visitante_equipe_id permaneceu NULL.
-- =============================================================================
--
-- STANDINGS FINAIS DOS GRUPOS
-- ----------------------------
-- Grupo A (grupo_id=20):
--   1° = 717  (Tiradentes VI)           3V 0D 9pts
--   2° = 791  (IEMA Paço do Lumiar)     2V 1D 6pts
--   3° = 1081 (Monteiro Lobato)         1V 2D 3pts
--   4° = 1001 (Dr. Luiz Sérgio)        0V 3D 0pts
--
-- Grupo B (grupo_id=21):
--   1° = 715  (CEFRAN)                  3V 0D 9pts
--   2° = 1312 (Domingos Vieira Filho)   2V 1D 6pts
--   3° = 1354 (Padre Maurício)          1V(WXO) 2D 3pts
--   4° = 1311 (Pires Collins)           0V 3D 0pts
--
-- MAPEAMENTO DE SEEDS NO BRACKET (gerado com vagas_bracket=4)
--   SEED_1 = Grupo A seed1 → 1°A = 717  (jogo 140 mandante) ✓
--   SEED_2 = Grupo A seed2 → 2°A = 791  (jogo 141 mandante) ✓
--   SEED_3 = Grupo B seed1 → 1°B = 715  (jogo 141 visitante) ✓
--   SEED_4 = Grupo B seed2 → 2°B = 1312 (jogo 140 visitante) ← NULL, precisa ser preenchido
--
-- ESTADO ATUAL:
--   jogo 140: mandante=717, visitante=NULL  ← ERRADO
--   jogo 141: mandante=791, visitante=715   ← correto
--
-- ESTADO ESPERADO APÓS EXECUÇÃO (semifinais):
--   jogo 140: 717 (Tiradentes VI) vs 1312 (Domingos Vieira Filho)  [SEED_1 vs SEED_4]
--   jogo 141: 791 (IEMA Paço)     vs 715  (CEFRAN)                 [SEED_2 vs SEED_3]
-- =============================================================================

BEGIN;

-- jogo 140: SEED_1 (717) vs SEED_4 (2°B = Domingos Vieira Filho = 1312)
UPDATE campeonato_partidas
SET visitante_equipe_id = 1312,
    updated_at = NOW()
WHERE id = 140;

COMMIT;
