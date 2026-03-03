-- Migração 007: Tabela escolas
CREATE TABLE IF NOT EXISTS escolas (
    id SERIAL PRIMARY KEY,
    nome_escola VARCHAR(255) NOT NULL,
    inep VARCHAR(8) NOT NULL UNIQUE,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    endereco VARCHAR(500) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_escolas_inep ON escolas(inep);
CREATE INDEX IF NOT EXISTS idx_escolas_cnpj ON escolas(cnpj);

CREATE TRIGGER update_escolas_updated_at
    BEFORE UPDATE ON escolas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
