-- Nova lógica de geração de grupos: regra de distribuição, vagas, classificados por grupo e slots de wild card.

ALTER TABLE campeonatos
    ADD COLUMN IF NOT EXISTS regra_distribuicao VARCHAR(20),
    ADD COLUMN IF NOT EXISTS vagas_bracket      INTEGER,
    ADD COLUMN IF NOT EXISTS vagas_wildcard     INTEGER NOT NULL DEFAULT 0;

ALTER TABLE campeonato_grupos
    ADD COLUMN IF NOT EXISTS classificados_diretos INTEGER NOT NULL DEFAULT 1;

ALTER TABLE campeonato_partidas
    ADD COLUMN IF NOT EXISTS is_wildcard_pending    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mandante_is_wildcard   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS visitante_is_wildcard  BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: grupos de 4 equipes classificam 2; grupos de 3 classificam 1.
UPDATE campeonato_grupos cg
SET classificados_diretos = CASE
    WHEN (SELECT COUNT(*) FROM campeonato_grupo_equipes WHERE grupo_id = cg.id) >= 4 THEN 2
    ELSE 1
END;
