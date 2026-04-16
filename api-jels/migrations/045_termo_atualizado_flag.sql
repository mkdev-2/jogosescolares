-- Adiciona flag para indicar que o termo foi atualizado após edição pós-prazo
ALTER TABLE escola_edicao_modalidades ADD COLUMN IF NOT EXISTS termo_atualizado BOOLEAN NOT NULL DEFAULT FALSE;
