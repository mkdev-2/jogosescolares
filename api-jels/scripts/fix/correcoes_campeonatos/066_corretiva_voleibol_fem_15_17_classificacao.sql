-- Corretiva: Voleibol – FEMININO – 15 a 17 anos (campeonato id=6)
-- Grupo B (3 equipes) passa a classificar 2 diretos ao invés de 1.
-- Resultado: 4 classificados diretos, 0 wildcards (era 3 diretos + 1 wildcard).

BEGIN;

-- 1. Grupo B classifica 2
UPDATE campeonato_grupos
SET classificados_diretos = 2
WHERE id = 21;

-- 2. Campeonato: zera wildcard
UPDATE campeonatos
SET vagas_wildcard = 0, updated_at = NOW()
WHERE id = 6;

-- 3. Semi 1 (SEED_1 vs SEED_4): visitante deixa de ser wildcard
UPDATE campeonato_partidas
SET is_wildcard_pending  = false,
    visitante_is_wildcard = false
WHERE id = 140;

COMMIT;
