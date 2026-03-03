-- Migration 010: estudantes_atletas, professores_tecnicos, equipes, equipe_estudantes

-- 1. Tabela estudantes_atletas
CREATE TABLE IF NOT EXISTS estudantes_atletas (
    id SERIAL PRIMARY KEY,
    escola_id INTEGER NOT NULL REFERENCES escolas(id),
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    rg VARCHAR(50),
    data_nascimento DATE NOT NULL,
    sexo CHAR(1) NOT NULL,
    email VARCHAR(255),
    endereco VARCHAR(500),
    cep VARCHAR(8),
    numero_registro_confederacao VARCHAR(100),
    responsavel_nome VARCHAR(255) NOT NULL,
    responsavel_cpf VARCHAR(11) NOT NULL,
    responsavel_rg VARCHAR(50),
    responsavel_celular VARCHAR(20) NOT NULL,
    responsavel_email VARCHAR(255) NOT NULL,
    responsavel_nis VARCHAR(11) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(escola_id, cpf)
);

CREATE INDEX IF NOT EXISTS idx_estudantes_atletas_escola_id ON estudantes_atletas(escola_id);

CREATE TRIGGER update_estudantes_atletas_updated_at
    BEFORE UPDATE ON estudantes_atletas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Tabela professores_tecnicos
CREATE TABLE IF NOT EXISTS professores_tecnicos (
    id SERIAL PRIMARY KEY,
    escola_id INTEGER NOT NULL REFERENCES escolas(id),
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    cref VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_professores_tecnicos_escola_id ON professores_tecnicos(escola_id);

CREATE TRIGGER update_professores_tecnicos_updated_at
    BEFORE UPDATE ON professores_tecnicos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Tabela equipes
CREATE TABLE IF NOT EXISTS equipes (
    id SERIAL PRIMARY KEY,
    escola_id INTEGER NOT NULL REFERENCES escolas(id),
    modalidade_id VARCHAR(100) NOT NULL REFERENCES modalidades(id),
    categoria_id VARCHAR(100) NOT NULL REFERENCES categorias(id),
    professor_tecnico_id INTEGER NOT NULL REFERENCES professores_tecnicos(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_equipes_escola_id ON equipes(escola_id);

CREATE TRIGGER update_equipes_updated_at
    BEFORE UPDATE ON equipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Tabela equipe_estudantes (N:N)
CREATE TABLE IF NOT EXISTS equipe_estudantes (
    equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    estudante_id INTEGER NOT NULL REFERENCES estudantes_atletas(id),
    PRIMARY KEY (equipe_id, estudante_id)
);

CREATE INDEX IF NOT EXISTS idx_equipe_estudantes_estudante_id ON equipe_estudantes(estudante_id);
