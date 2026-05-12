-- Migration 055: Locais de competição por edição + vínculo opcional em confrontos/partidas.

CREATE TABLE IF NOT EXISTS locais (
    id SERIAL PRIMARY KEY,
    edicao_id INTEGER NOT NULL REFERENCES edicoes(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    endereco_completo TEXT NULL,
    foto_url VARCHAR(512) NULL,
    link_maps VARCHAR(1024) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locais_edicao_id ON locais(edicao_id);

CREATE TRIGGER update_locais_updated_at
    BEFORE UPDATE ON locais
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE campeonato_manual_confrontos
    ADD COLUMN IF NOT EXISTS local_id INTEGER NULL REFERENCES locais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campeonato_manual_confrontos_local_id
    ON campeonato_manual_confrontos(local_id);

ALTER TABLE campeonato_partidas
    ADD COLUMN IF NOT EXISTS local_id INTEGER NULL REFERENCES locais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campeonato_partidas_local_id
    ON campeonato_partidas(local_id);
