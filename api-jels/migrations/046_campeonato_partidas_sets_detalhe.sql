ALTER TABLE campeonato_partidas
  ADD COLUMN IF NOT EXISTS sets_detalhe JSONB DEFAULT NULL;
