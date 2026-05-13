-- Flag por esporte: quando true, o sistema habilita registro de quem marcou cada gol/ponto
ALTER TABLE esporte_config_pontuacao
  ADD COLUMN registra_artilheiro BOOLEAN NOT NULL DEFAULT FALSE;

-- Registro de artilheiros por partida (resumo: jogador X marcou Y gols nesta partida)
CREATE TABLE partida_artilheiros (
  id           SERIAL PRIMARY KEY,
  partida_id   INTEGER NOT NULL REFERENCES campeonato_partidas(id) ON DELETE CASCADE,
  equipe_id    INTEGER NOT NULL REFERENCES equipes(id),
  estudante_id INTEGER NOT NULL REFERENCES estudantes_atletas(id),
  quantidade   INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(partida_id, estudante_id)
);

CREATE INDEX idx_partida_artilheiros_partida   ON partida_artilheiros(partida_id);
CREATE INDEX idx_partida_artilheiros_estudante ON partida_artilheiros(estudante_id);
