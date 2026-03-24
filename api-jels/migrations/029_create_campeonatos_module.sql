-- Migration 029: Estrutura base do módulo de campeonatos/chaveamentos (MVP).
-- Escopo: criação de campeonatos por edição + variante, grupos, vínculo equipe-grupo e partidas.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'campeonato_status_enum'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE campeonato_status_enum AS ENUM ('RASCUNHO', 'GERADO', 'EM_ANDAMENTO', 'FINALIZADO');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'campeonato_formato_enum'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE campeonato_formato_enum AS ENUM ('GRUPOS_E_MATA_MATA');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'campeonato_fase_enum'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE campeonato_fase_enum AS ENUM ('GRUPOS', 'OITAVAS', 'QUARTAS', 'SEMI', 'FINAL', 'TERCEIRO');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS campeonatos (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    edicao_id INTEGER NOT NULL REFERENCES edicoes(id) ON DELETE RESTRICT,
    esporte_variante_id UUID NOT NULL REFERENCES esporte_variantes(id) ON DELETE RESTRICT,
    nome VARCHAR(160) NOT NULL,
    status campeonato_status_enum NOT NULL DEFAULT 'RASCUNHO',
    formato campeonato_formato_enum NOT NULL DEFAULT 'GRUPOS_E_MATA_MATA',
    grupo_tamanho_ideal INTEGER NOT NULL DEFAULT 4,
    classificam_por_grupo INTEGER NOT NULL DEFAULT 2,
    permite_melhores_terceiros BOOLEAN NOT NULL DEFAULT FALSE,
    geracao_autorizada_em TIMESTAMP NULL,
    geracao_autorizada_por INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    geracao_executada_em TIMESTAMP NULL,
    geracao_executada_por INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_campeonatos_uuid UNIQUE (uuid),
    CONSTRAINT uq_campeonatos_edicao_variante UNIQUE (edicao_id, esporte_variante_id),
    CONSTRAINT chk_campeonatos_grupo_tamanho_ideal CHECK (grupo_tamanho_ideal >= 2),
    CONSTRAINT chk_campeonatos_classificam_por_grupo CHECK (classificam_por_grupo >= 1)
);

CREATE INDEX IF NOT EXISTS idx_campeonatos_edicao_id ON campeonatos(edicao_id);
CREATE INDEX IF NOT EXISTS idx_campeonatos_esporte_variante_id ON campeonatos(esporte_variante_id);
CREATE INDEX IF NOT EXISTS idx_campeonatos_status ON campeonatos(status);

CREATE TRIGGER update_campeonatos_updated_at
    BEFORE UPDATE ON campeonatos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS campeonato_grupos (
    id SERIAL PRIMARY KEY,
    campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
    nome VARCHAR(10) NOT NULL,
    ordem INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_campeonato_grupos_nome UNIQUE (campeonato_id, nome),
    CONSTRAINT uq_campeonato_grupos_ordem UNIQUE (campeonato_id, ordem),
    CONSTRAINT chk_campeonato_grupos_ordem CHECK (ordem >= 1)
);

CREATE INDEX IF NOT EXISTS idx_campeonato_grupos_campeonato_id
    ON campeonato_grupos(campeonato_id);

CREATE TABLE IF NOT EXISTS campeonato_grupo_equipes (
    id SERIAL PRIMARY KEY,
    grupo_id INTEGER NOT NULL REFERENCES campeonato_grupos(id) ON DELETE CASCADE,
    equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE RESTRICT,
    seed_no_grupo INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_campeonato_grupo_equipes_grupo_equipe UNIQUE (grupo_id, equipe_id),
    CONSTRAINT uq_campeonato_grupo_equipes_grupo_seed UNIQUE (grupo_id, seed_no_grupo),
    CONSTRAINT chk_campeonato_grupo_equipes_seed CHECK (seed_no_grupo >= 1)
);

CREATE INDEX IF NOT EXISTS idx_campeonato_grupo_equipes_grupo_id
    ON campeonato_grupo_equipes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_campeonato_grupo_equipes_equipe_id
    ON campeonato_grupo_equipes(equipe_id);

CREATE TABLE IF NOT EXISTS campeonato_partidas (
    id SERIAL PRIMARY KEY,
    campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
    fase campeonato_fase_enum NOT NULL,
    rodada INTEGER NOT NULL DEFAULT 1,
    grupo_id INTEGER NULL REFERENCES campeonato_grupos(id) ON DELETE SET NULL,
    mandante_equipe_id INTEGER NULL REFERENCES equipes(id) ON DELETE RESTRICT,
    visitante_equipe_id INTEGER NULL REFERENCES equipes(id) ON DELETE RESTRICT,
    vencedor_equipe_id INTEGER NULL REFERENCES equipes(id) ON DELETE RESTRICT,
    is_bye BOOLEAN NOT NULL DEFAULT FALSE,
    origem_slot_a VARCHAR(80) NULL,
    origem_slot_b VARCHAR(80) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_campeonato_partidas_rodada CHECK (rodada >= 1),
    CONSTRAINT chk_campeonato_partidas_confronto_valido CHECK (
        mandante_equipe_id IS NULL
        OR visitante_equipe_id IS NULL
        OR mandante_equipe_id <> visitante_equipe_id
    ),
    CONSTRAINT chk_campeonato_partidas_bye_consistente CHECK (
        (is_bye = FALSE)
        OR (mandante_equipe_id IS NULL OR visitante_equipe_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_campeonato_partidas_campeonato_id
    ON campeonato_partidas(campeonato_id);
CREATE INDEX IF NOT EXISTS idx_campeonato_partidas_fase
    ON campeonato_partidas(fase);
CREATE INDEX IF NOT EXISTS idx_campeonato_partidas_grupo_id
    ON campeonato_partidas(grupo_id);
CREATE INDEX IF NOT EXISTS idx_campeonato_partidas_vencedor_equipe_id
    ON campeonato_partidas(vencedor_equipe_id);

CREATE TRIGGER update_campeonato_partidas_updated_at
    BEFORE UPDATE ON campeonato_partidas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
