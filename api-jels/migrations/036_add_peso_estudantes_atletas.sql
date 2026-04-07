-- Migration 036: adiciona campo de peso em estudantes-atletas

ALTER TABLE estudantes_atletas
ADD COLUMN IF NOT EXISTS peso NUMERIC(5,2);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'estudantes_atletas_peso_check'
    ) THEN
        ALTER TABLE estudantes_atletas
        ADD CONSTRAINT estudantes_atletas_peso_check
        CHECK (peso IS NULL OR (peso > 0 AND peso <= 500));
    END IF;
END $$;
