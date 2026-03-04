-- Migração 012: Adesão - dados do diretor/coordenador (JSONB), status e modalidades
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS dados_diretor JSONB;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS dados_coordenador JSONB;
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS status_adesao VARCHAR(20) DEFAULT 'PENDENTE';
ALTER TABLE escolas ADD COLUMN IF NOT EXISTS modalidades_adesao JSONB;

COMMENT ON COLUMN escolas.dados_diretor IS 'Objeto com nome, cpf, rg e password_hash do diretor (formulário de adesão)';
COMMENT ON COLUMN escolas.dados_coordenador IS 'Objeto com nome, cpf, rg, endereco, email, telefone do coordenador de esportes';
COMMENT ON COLUMN escolas.status_adesao IS 'PENDENTE | APROVADA | REJEITADA';
COMMENT ON COLUMN escolas.modalidades_adesao IS 'Matriz categoria/naipe/tipo de modalidades selecionadas no termo de adesão';

-- Escolas já existentes (cadastradas antes desta migração, sem dados_diretor) ficam APROVADA para não aparecerem como pendentes
UPDATE escolas SET status_adesao = 'APROVADA' WHERE dados_diretor IS NULL;

CREATE INDEX IF NOT EXISTS idx_escolas_status_adesao ON escolas(status_adesao);
