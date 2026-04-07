-- Migration 039: anexo de documento do professor-técnico

ALTER TABLE professores_tecnicos
ADD COLUMN IF NOT EXISTS documentacao_url VARCHAR(500);
