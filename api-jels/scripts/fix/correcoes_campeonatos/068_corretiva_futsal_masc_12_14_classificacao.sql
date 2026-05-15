-- Corretiva: Futsal – MASCULINO – 12 a 14 anos (campeonato id=1)
-- Grupo F (3 equipes) passa a classificar 2 diretos ao invés de 1.
-- Resultado: 12 classificados diretos + 4 wildcards (era 11 diretos + 5 wildcards).

BEGIN;

-- 1. Grupo F classifica 2
UPDATE campeonato_grupos
SET classificados_diretos = 2
WHERE id = 6;

-- 2. Campeonato: reduz wildcard de 5 para 4
UPDATE campeonatos
SET vagas_wildcard = 4, updated_at = NOW()
WHERE id = 1;

-- 3. Oitavas (SEED_5 vs SEED_12): visitante deixa de ser wildcard
UPDATE campeonato_partidas
SET is_wildcard_pending  = false,
    visitante_is_wildcard = false
WHERE id = 38;

COMMIT;
