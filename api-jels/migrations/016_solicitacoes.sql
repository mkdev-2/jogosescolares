-- Migração 016: Tabela solicitacoes - armazena dados do formulário de adesão até aprovação do admin
-- Fluxo: formulário → solicitacoes (PENDENTE) → admin aprova → escola + diretor criados, status ACEITO
-- Admin nega → status NEGADO (nada é criado em escolas/users)

CREATE TYPE solicitacao_status AS ENUM ('ACEITO', 'NEGADO', 'PENDENTE');

CREATE TABLE IF NOT EXISTS solicitacoes (
    id SERIAL PRIMARY KEY,
    status solicitacao_status NOT NULL DEFAULT 'PENDENTE',
    -- Dados da instituição (espelho do formulário)
    nome_escola VARCHAR(255) NOT NULL,
    inep VARCHAR(8) NOT NULL,
    cnpj VARCHAR(14) NOT NULL,
    endereco VARCHAR(500) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    -- Dados do diretor (JSONB: nome, cpf, rg, password_hash)
    dados_diretor JSONB NOT NULL,
    -- Dados do coordenador (JSONB: nome, cpf, rg, endereco, email, telefone)
    dados_coordenador JSONB NOT NULL,
    -- Modalidades selecionadas (JSONB: {"variante_ids": ["uuid", ...]})
    modalidades_adesao JSONB,
    -- Preenchido quando status = ACEITO (escola criada)
    escola_id INTEGER REFERENCES escolas(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_created_at ON solicitacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_inep ON solicitacoes(inep);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_cnpj ON solicitacoes(cnpj);

CREATE TRIGGER update_solicitacoes_updated_at
    BEFORE UPDATE ON solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE solicitacoes IS 'Solicitações de adesão de escolas. Dados permanecem aqui até admin aprovar (ACEITO) ou negar (NEGADO).';
COMMENT ON COLUMN solicitacoes.escola_id IS 'ID da escola criada após aprovação. NULL enquanto PENDENTE ou NEGADO.';
