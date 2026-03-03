-- Tabela de configurações do sistema (chave-valor)
CREATE TABLE IF NOT EXISTS configuracoes (
    chave VARCHAR(100) PRIMARY KEY,
    valor TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Registro inicial: data limite para envio do formulário de cadastro (null = sem limite)
INSERT INTO configuracoes (chave, valor) VALUES ('cadastro_data_limite', NULL)
ON CONFLICT (chave) DO NOTHING;
