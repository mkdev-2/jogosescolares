-- Tabela users
CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN', 'ADMIN', 'DIRETOR', 'MESARIO'
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'ADMIN',
    ativo BOOLEAN DEFAULT TRUE,
    foto_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();