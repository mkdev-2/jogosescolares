-- Validação administrativa de documentos de inscrição (alinhado a estudantes_atletas.py)

ALTER TABLE estudantes_atletas
    ADD COLUMN IF NOT EXISTS documentos_validados BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS documentos_validados_por INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS documentos_validados_em TIMESTAMP;
