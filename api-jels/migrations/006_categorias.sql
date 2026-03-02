-- Tabela categorias (conjuntos de modalidades)
CREATE TABLE IF NOT EXISTS categorias (
    id VARCHAR(100) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT DEFAULT '',
    ordem INTEGER DEFAULT 0,
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_categorias_updated_at
    BEFORE UPDATE ON categorias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed das categorias padrão (mapeando o ENUM antigo)
INSERT INTO categorias (id, nome, descricao, ordem, ativa) VALUES
    ('COLETIVA', 'Coletiva', 'Modalidades esportivas coletivas', 1, TRUE),
    ('INDIVIDUAL', 'Individual', 'Modalidades esportivas individuais', 2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Adicionar coluna categoria_id em modalidades (nullable temporariamente para migração)
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS categoria_id VARCHAR(100) REFERENCES categorias(id);

-- Migrar dados existentes: vincular ao categoria_id baseado no valor atual do ENUM
UPDATE modalidades SET categoria_id = categoria::text WHERE categoria_id IS NULL AND categoria IS NOT NULL;

-- Tornar categoria_id obrigatório
ALTER TABLE modalidades ALTER COLUMN categoria_id SET NOT NULL;

-- Remover coluna antiga categoria (ENUM)
ALTER TABLE modalidades DROP COLUMN IF EXISTS categoria;

-- Remover o tipo ENUM antigo (apenas se não for usado em outro lugar)
DROP TYPE IF EXISTS modalidade_categoria;

-- Permissões PostgREST para categorias
GRANT SELECT ON categorias TO jogosescolares_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON categorias TO jogosescolares_authenticated;
