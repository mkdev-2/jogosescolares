-- Registro de penalidades por partida (cartões e advertências atribuídos a jogadores)
CREATE TABLE partida_penalidades (
  id           SERIAL PRIMARY KEY,
  partida_id   INTEGER NOT NULL REFERENCES campeonato_partidas(id) ON DELETE CASCADE,
  equipe_id    INTEGER NOT NULL REFERENCES equipes(id),
  estudante_id INTEGER NOT NULL REFERENCES estudantes_atletas(id),
  tipo         VARCHAR NOT NULL CHECK (tipo IN ('CARTAO_AMARELO', 'CARTAO_VERMELHO', 'ADVERTENCIA')),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partida_penalidades_partida   ON partida_penalidades(partida_id);
CREATE INDEX idx_partida_penalidades_estudante ON partida_penalidades(estudante_id);
