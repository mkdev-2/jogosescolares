-- Corretiva: Beach Soccer – MASCULINO – 15 a 17 anos (campeonato id=11)
-- Grupos C e D (3 equipes cada) passam a classificar 2 diretos ao invés de 1.
-- Resultado: 8 classificados diretos, 0 wildcards (era 6 diretos + 2 wildcards).

BEGIN;

-- 1. Grupos C e D classificam 2
UPDATE campeonato_grupos
SET classificados_diretos = 2
WHERE id IN (26, 27);

-- 2. Campeonato: zera wildcard
UPDATE campeonatos
SET vagas_wildcard = 0, updated_at = NOW()
WHERE id = 11;

-- 3. Quartas 1 (SEED_1 vs SEED_8): visitante deixa de ser wildcard
UPDATE campeonato_partidas
SET is_wildcard_pending  = false,
    visitante_is_wildcard = false
WHERE id = 181;

-- 4. Quartas 2 (SEED_2 vs SEED_7): visitante deixa de ser wildcard
UPDATE campeonato_partidas
SET is_wildcard_pending  = false,
    visitante_is_wildcard = false
WHERE id = 182;

COMMIT;
