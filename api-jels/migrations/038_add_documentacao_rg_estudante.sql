-- Migration 038: anexo da documentação de identidade (RG) do aluno

ALTER TABLE estudantes_atletas
ADD COLUMN IF NOT EXISTS documentacao_rg_url VARCHAR(500);
