-- Migration 015: Reestruturação - Esportes, Categorias (faixa etária), Naipes, Tipos de Modalidade
-- Substitui modalidades/categorias antigas. Sem migração de dados (ambiente em desenvolvimento).
-- Para produção fresh: executar após 001-014.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== REMOVER ESTRUTURA ANTIGA ==========
DROP TABLE IF EXISTS equipe_estudantes;
DROP TABLE IF EXISTS equipes;
DROP TABLE IF EXISTS modalidades;
DROP TABLE IF EXISTS categorias;

-- ========== ESPORTES (antigo "modalidades" - Futebol, Judô, etc.) ==========
CREATE TABLE esportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT DEFAULT '',
    icone VARCHAR(50) DEFAULT 'Zap',
    requisitos TEXT DEFAULT '',
    limite_atletas INTEGER NOT NULL DEFAULT 3,
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_esportes_updated_at
    BEFORE UPDATE ON esportes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========== CATEGORIAS (faixa etária: 12-14, 15-17 anos) ==========
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    idade_min INTEGER NOT NULL,
    idade_max INTEGER NOT NULL,
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT categorias_idade_valida CHECK (idade_min <= idade_max)
);

CREATE TRIGGER update_categorias_updated_at
    BEFORE UPDATE ON categorias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========== NAIPES (MASCULINO, FEMININO) ==========
CREATE TABLE naipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo CHAR(1) NOT NULL UNIQUE,
    nome VARCHAR(50) NOT NULL
);

-- ========== TIPOS DE MODALIDADE (INDIVIDUAIS, COLETIVAS, NOVAS) ==========
CREATE TABLE tipos_modalidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nome VARCHAR(50) NOT NULL
);

-- ========== ESPORTE_VARIANTES (combinações válidas por esporte) ==========
CREATE TABLE esporte_variantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    esporte_id UUID NOT NULL REFERENCES esportes(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES categorias(id),
    naipe_id UUID NOT NULL REFERENCES naipes(id),
    tipo_modalidade_id UUID NOT NULL REFERENCES tipos_modalidade(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(esporte_id, categoria_id, naipe_id, tipo_modalidade_id)
);

CREATE INDEX idx_esporte_variantes_esporte ON esporte_variantes(esporte_id);

-- ========== EQUIPES (referencia esporte_variante) ==========
CREATE TABLE equipes (
    id SERIAL PRIMARY KEY,
    escola_id INTEGER NOT NULL REFERENCES escolas(id),
    esporte_variante_id UUID NOT NULL REFERENCES esporte_variantes(id) ON DELETE RESTRICT,
    professor_tecnico_id INTEGER NOT NULL REFERENCES professores_tecnicos(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_equipes_escola_id ON equipes(escola_id);
CREATE INDEX idx_equipes_esporte_variante ON equipes(esporte_variante_id);

CREATE TRIGGER update_equipes_updated_at
    BEFORE UPDATE ON equipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========== EQUIPE_ESTUDANTES (N:N) ==========
CREATE TABLE equipe_estudantes (
    equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    estudante_id INTEGER NOT NULL REFERENCES estudantes_atletas(id),
    PRIMARY KEY (equipe_id, estudante_id)
);

CREATE INDEX idx_equipe_estudantes_estudante_id ON equipe_estudantes(estudante_id);

-- ========== VALIDAÇÃO: idade e naipe ao vincular estudante à equipe ==========
CREATE OR REPLACE FUNCTION validar_estudante_equipe()
RETURNS TRIGGER AS $$
DECLARE
    v_categoria_id UUID;
    v_idade_min INT;
    v_idade_max INT;
    v_naipe_codigo CHAR(1);
    v_estudante_idade INT;
    v_estudante_sexo CHAR(1);
BEGIN
    SELECT ev.categoria_id, c.idade_min, c.idade_max, n.codigo
    INTO v_categoria_id, v_idade_min, v_idade_max, v_naipe_codigo
    FROM equipes e
    JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
    JOIN categorias c ON c.id = ev.categoria_id
    JOIN naipes n ON n.id = ev.naipe_id
    WHERE e.id = NEW.equipe_id;

    SELECT
        DATE_PART('year', AGE(CURRENT_DATE, est.data_nascimento))::INT,
        est.sexo
    INTO v_estudante_idade, v_estudante_sexo
    FROM estudantes_atletas est
    WHERE est.id = NEW.estudante_id;

    -- Validar faixa etária
    IF v_estudante_idade < v_idade_min OR v_estudante_idade > v_idade_max THEN
        RAISE EXCEPTION 'Estudante com % anos não pode ser cadastrado na categoria % a % anos',
            v_estudante_idade, v_idade_min, v_idade_max;
    END IF;

    -- Validar naipe (M ↔ MASCULINO, F ↔ FEMININO)
    IF v_estudante_sexo != v_naipe_codigo THEN
        RAISE EXCEPTION 'Estudante do sexo % não pode ser cadastrado no naipe %',
            CASE v_estudante_sexo WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Feminino' ELSE v_estudante_sexo END,
            CASE v_naipe_codigo WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Feminino' ELSE v_naipe_codigo END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_estudante_equipe
    BEFORE INSERT ON equipe_estudantes
    FOR EACH ROW
    EXECUTE FUNCTION validar_estudante_equipe();

-- ========== SEED: categorias, naipes, tipos_modalidade ==========
INSERT INTO categorias (nome, idade_min, idade_max, ativa) VALUES
    ('12 a 14 anos', 12, 14, TRUE),
    ('15 a 17 anos', 15, 17, TRUE);

INSERT INTO naipes (codigo, nome) VALUES
    ('M', 'MASCULINO'),
    ('F', 'FEMININO');

INSERT INTO tipos_modalidade (codigo, nome) VALUES
    ('INDIVIDUAIS', 'INDIVIDUAIS'),
    ('COLETIVAS', 'COLETIVAS'),
    ('NOVAS', 'NOVAS');
