-- 044_termo_desatualizado.sql
-- Adiciona flag para verificar se as modalidades da escola foram editadas
-- necessitando atualização do anexo de termo de adesão.

ALTER TABLE escola_edicao_modalidades
ADD COLUMN IF NOT EXISTS termo_desatualizado BOOLEAN NOT NULL DEFAULT FALSE;
