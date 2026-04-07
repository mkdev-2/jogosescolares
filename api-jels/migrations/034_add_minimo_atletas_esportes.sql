-- Migration 034: adiciona limite mínimo de atletas por equipe em esportes
-- Objetivo: permitir configurar intervalo (mínimo e máximo) para modalidades coletivas.

ALTER TABLE esportes
ADD COLUMN IF NOT EXISTS minimo_atletas INTEGER NOT NULL DEFAULT 1;

UPDATE esportes
SET minimo_atletas = 1
WHERE minimo_atletas IS NULL OR minimo_atletas < 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'esportes_minimo_atletas_check'
    ) THEN
        ALTER TABLE esportes
        ADD CONSTRAINT esportes_minimo_atletas_check
        CHECK (minimo_atletas >= 1);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'esportes_minimo_menor_igual_limite_check'
    ) THEN
        ALTER TABLE esportes
        ADD CONSTRAINT esportes_minimo_menor_igual_limite_check
        CHECK (minimo_atletas <= limite_atletas);
    END IF;
END $$;
