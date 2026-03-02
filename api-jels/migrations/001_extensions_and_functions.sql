-- Extensões PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função para atualizar updated_at em triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
