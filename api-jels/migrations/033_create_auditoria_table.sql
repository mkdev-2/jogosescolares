-- Migration 033: Criar tabela de auditoria
-- Tabela existia em produção mas não havia migration correspondente

CREATE TABLE IF NOT EXISTS auditoria (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  acao        VARCHAR NOT NULL,
  tipo_recurso VARCHAR NOT NULL,
  recurso_id  INTEGER,
  detalhes_antes  JSONB,
  detalhes_depois JSONB,
  mensagem    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_user_id    ON auditoria (user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON auditoria (created_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_recurso    ON auditoria (tipo_recurso, recurso_id);
