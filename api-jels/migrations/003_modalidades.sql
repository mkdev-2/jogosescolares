CREATE TYPE modalidade_categoria AS ENUM (
    'COLETIVA', 'INDIVIDUAL'
);

-- Tabela modalidades
CREATE TABLE IF NOT EXISTS modalidades (
    id VARCHAR(100) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT DEFAULT '',
    categoria modalidade_categoria NOT NULL,
    requisitos TEXT DEFAULT '',
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_modalidades_updated_at
    BEFORE UPDATE ON modalidades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
