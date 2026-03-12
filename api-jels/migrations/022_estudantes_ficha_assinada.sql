-- Migration 022: Substituir 4 colunas de assinaturas por uma única ficha_assinada
-- Consolida assinatura_estudante_atleta, assinatura_responsavel_legal, assinatura_medico,
-- assinatura_responsavel_instituicao em uma única coluna ficha_assinada.

-- 1. Adicionar nova coluna
ALTER TABLE estudantes_atletas
  ADD COLUMN IF NOT EXISTS ficha_assinada BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Migrar dados existentes: ficha_assinada = TRUE se todas as 4 assinaturas eram TRUE
UPDATE estudantes_atletas
SET ficha_assinada = (
  COALESCE(assinatura_estudante_atleta, FALSE) AND
  COALESCE(assinatura_responsavel_legal, FALSE) AND
  COALESCE(assinatura_medico, FALSE) AND
  COALESCE(assinatura_responsavel_instituicao, FALSE)
)
WHERE TRUE;

-- 3. Remover as 4 colunas antigas
ALTER TABLE estudantes_atletas
  DROP COLUMN IF EXISTS assinatura_estudante_atleta,
  DROP COLUMN IF EXISTS assinatura_responsavel_legal,
  DROP COLUMN IF EXISTS assinatura_medico,
  DROP COLUMN IF EXISTS assinatura_responsavel_instituicao;
