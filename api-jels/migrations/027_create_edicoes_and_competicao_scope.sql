-- Migration 027: Introduz o conceito de edições anuais no núcleo competitivo.
-- Escopo inicial: equipes e modalidades de adesão por escola/edição.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'edicao_status_enum'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE edicao_status_enum AS ENUM ('PLANEJAMENTO', 'ATIVA', 'ENCERRADA');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS edicoes (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL,
    ano INTEGER NOT NULL,
    status edicao_status_enum NOT NULL DEFAULT 'PLANEJAMENTO',
    data_inicio DATE,
    data_fim DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_edicoes_uuid UNIQUE (uuid),
    CONSTRAINT uq_edicoes_ano UNIQUE (ano),
    CONSTRAINT chk_edicoes_periodo CHECK (data_fim IS NULL OR data_inicio IS NULL OR data_fim >= data_inicio)
);

CREATE TRIGGER update_edicoes_updated_at
    BEFORE UPDATE ON edicoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS uq_edicoes_status_ativa
    ON edicoes (status)
    WHERE status = 'ATIVA';

ALTER TABLE equipes
    ADD COLUMN IF NOT EXISTS edicao_id INTEGER;

ALTER TABLE equipes
    ADD CONSTRAINT fk_equipes_edicao
    FOREIGN KEY (edicao_id) REFERENCES edicoes(id);

CREATE INDEX IF NOT EXISTS idx_equipes_edicao_id ON equipes(edicao_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'equipes'
          AND constraint_name = 'equipes_escola_id_esporte_variante_id_key'
    ) THEN
        ALTER TABLE equipes DROP CONSTRAINT equipes_escola_id_esporte_variante_id_key;
    END IF;
END$$;

ALTER TABLE equipes
    ADD CONSTRAINT uq_equipes_escola_variante_edicao
    UNIQUE (escola_id, esporte_variante_id, edicao_id);

CREATE TABLE IF NOT EXISTS escola_edicao_modalidades (
    id SERIAL PRIMARY KEY,
    escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    edicao_id INTEGER NOT NULL REFERENCES edicoes(id) ON DELETE CASCADE,
    modalidades_adesao JSONB NOT NULL DEFAULT '{"variante_ids":[]}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_escola_edicao_modalidades UNIQUE (escola_id, edicao_id)
);

CREATE INDEX IF NOT EXISTS idx_escola_edicao_modalidades_escola_id
    ON escola_edicao_modalidades(escola_id);
CREATE INDEX IF NOT EXISTS idx_escola_edicao_modalidades_edicao_id
    ON escola_edicao_modalidades(edicao_id);

CREATE TRIGGER update_escola_edicao_modalidades_updated_at
    BEFORE UPDATE ON escola_edicao_modalidades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
