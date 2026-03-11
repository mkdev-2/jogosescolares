-- Migration 021: Assinaturas e documentação assinada no cadastro de estudantes-atletas
-- Checkboxes de confirmação: estudante-atleta, responsável legal, médico, responsável da instituição
-- URL do anexo da documentação assinada (opcional)

ALTER TABLE estudantes_atletas
  ADD COLUMN IF NOT EXISTS assinatura_estudante_atleta BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assinatura_responsavel_legal BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assinatura_medico BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assinatura_responsavel_instituicao BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS documentacao_assinada_url VARCHAR(500);
