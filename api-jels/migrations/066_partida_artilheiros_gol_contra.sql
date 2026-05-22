-- Gol contra: atleta da equipe X, gol creditado ao adversário
ALTER TABLE partida_artilheiros
  ADD COLUMN is_gol_contra BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE partida_artilheiros
  DROP CONSTRAINT IF EXISTS partida_artilheiros_partida_id_estudante_id_key;

ALTER TABLE partida_artilheiros
  ADD CONSTRAINT partida_artilheiros_partida_estudante_gol_contra_key
  UNIQUE (partida_id, estudante_id, is_gol_contra);
