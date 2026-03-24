-- Migration 031: escopo de esportes e variantes por edição.
-- Permite catálogos diferentes por edição e garante consistência entre edição e variante.

ALTER TABLE esportes
    ADD COLUMN IF NOT EXISTS edicao_id INTEGER;

DO $$
DECLARE
    v_edicao_id INTEGER;
BEGIN
    SELECT id INTO v_edicao_id
    FROM edicoes
    WHERE status = 'ATIVA'
    ORDER BY ano DESC, id DESC
    LIMIT 1;

    IF v_edicao_id IS NULL THEN
        SELECT id INTO v_edicao_id
        FROM edicoes
        ORDER BY ano DESC, id DESC
        LIMIT 1;
    END IF;

    IF v_edicao_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível resolver edição para backfill de esportes.';
    END IF;

    UPDATE esportes
    SET edicao_id = v_edicao_id
    WHERE edicao_id IS NULL;
END$$;

ALTER TABLE esportes
    ALTER COLUMN edicao_id SET NOT NULL;

ALTER TABLE esportes
    ADD CONSTRAINT fk_esportes_edicao
    FOREIGN KEY (edicao_id) REFERENCES edicoes(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_esportes_edicao_id ON esportes(edicao_id);

ALTER TABLE esportes
    ADD CONSTRAINT uq_esportes_id_edicao UNIQUE (id, edicao_id);

ALTER TABLE esporte_variantes
    ADD COLUMN IF NOT EXISTS edicao_id INTEGER;

UPDATE esporte_variantes ev
SET edicao_id = e.edicao_id
FROM esportes e
WHERE ev.esporte_id = e.id
  AND ev.edicao_id IS NULL;

ALTER TABLE esporte_variantes
    ALTER COLUMN edicao_id SET NOT NULL;

ALTER TABLE esporte_variantes
    ADD CONSTRAINT fk_esporte_variantes_edicao
    FOREIGN KEY (edicao_id) REFERENCES edicoes(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_esporte_variantes_edicao_id ON esporte_variantes(edicao_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'esporte_variantes'
          AND constraint_name = 'esporte_variantes_esporte_id_categoria_id_naipe_id_tipo_modalidade_id_key'
    ) THEN
        ALTER TABLE esporte_variantes
            DROP CONSTRAINT esporte_variantes_esporte_id_categoria_id_naipe_id_tipo_modalidade_id_key;
    END IF;
END$$;

ALTER TABLE esporte_variantes
    ADD CONSTRAINT uq_esporte_variantes_combo_edicao
    UNIQUE (esporte_id, categoria_id, naipe_id, tipo_modalidade_id, edicao_id);

ALTER TABLE esporte_variantes
    ADD CONSTRAINT uq_esporte_variantes_id_edicao UNIQUE (id, edicao_id);

ALTER TABLE esporte_variantes
    ADD CONSTRAINT fk_esporte_variantes_esporte_edicao
    FOREIGN KEY (esporte_id, edicao_id)
    REFERENCES esportes(id, edicao_id)
    ON DELETE CASCADE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'equipes'
          AND constraint_name = 'equipes_esporte_variante_id_fkey'
    ) THEN
        ALTER TABLE equipes
            DROP CONSTRAINT equipes_esporte_variante_id_fkey;
    END IF;
END$$;

ALTER TABLE equipes
    ADD CONSTRAINT fk_equipes_variante_edicao
    FOREIGN KEY (esporte_variante_id, edicao_id)
    REFERENCES esporte_variantes(id, edicao_id)
    ON DELETE RESTRICT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'campeonatos'
          AND constraint_name = 'campeonatos_esporte_variante_id_fkey'
    ) THEN
        ALTER TABLE campeonatos
            DROP CONSTRAINT campeonatos_esporte_variante_id_fkey;
    END IF;
END$$;

ALTER TABLE campeonatos
    ADD CONSTRAINT fk_campeonatos_variante_edicao
    FOREIGN KEY (esporte_variante_id, edicao_id)
    REFERENCES esporte_variantes(id, edicao_id)
    ON DELETE RESTRICT;
