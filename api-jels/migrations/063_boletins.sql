-- Boletins oficiais (PDF na landing e área pública)
CREATE TABLE IF NOT EXISTS boletins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    documento_url TEXT NOT NULL,
    documento_bytes BIGINT,
    data_boletim DATE NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'INFORMATIVO'
        CHECK (tipo IN ('INFORMATIVO', 'DISCIPLINAR', 'SEMANAL')),
    publicado BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    author_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boletins_publico_listagem
    ON boletins (is_active, publicado, data_boletim DESC);

CREATE TRIGGER update_boletins_updated_at
    BEFORE UPDATE ON boletins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
