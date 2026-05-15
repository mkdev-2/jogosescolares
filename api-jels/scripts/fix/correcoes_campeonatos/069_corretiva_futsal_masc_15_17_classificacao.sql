-- Corretiva: Futsal – MASCULINO – 15 a 17 anos (campeonato id=3)
-- Grupo G (3 equipes) passa a classificar 2 diretos ao invés de 1.
-- Resultado: 14 classificados diretos + 2 wildcards (era 13 diretos + 3 wildcards).

BEGIN;

-- 1. Grupo G classifica 2
UPDATE campeonato_grupos
SET classificados_diretos = 2
WHERE id = 15;

-- 2. Campeonato: reduz wildcard de 3 para 2
UPDATE campeonatos
SET vagas_wildcard = 2, updated_at = NOW()
WHERE id = 3;

-- 3. Oitavas (SEED_3 vs SEED_14): visitante deixa de ser wildcard
UPDATE campeonato_partidas
SET is_wildcard_pending  = false,
    visitante_is_wildcard = false
WHERE id = 102;

COMMIT;
