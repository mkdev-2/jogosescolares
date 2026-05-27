-- Tabela para registrar o resultado de sorteios em grupos com empate não resolvido.
-- Quando critérios de desempate se esgotam (SORTEIO), um admin registra aqui
-- a posição final de cada equipe empatada. A classificação do grupo passa a usar
-- esses valores em vez de retornar uma ordem arbitrária.

CREATE TABLE campeonato_grupo_sorteio (
    id               SERIAL PRIMARY KEY,
    grupo_id         INTEGER      NOT NULL REFERENCES campeonato_grupos(id) ON DELETE CASCADE,
    equipe_id        INTEGER      NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
    posicao_no_grupo INTEGER      NOT NULL,  -- posição absoluta no grupo (1=1°, 2=2°, ...)
    registrado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    registrado_por   INTEGER      REFERENCES users(id),

    UNIQUE (grupo_id, equipe_id),
    UNIQUE (grupo_id, posicao_no_grupo)
);

CREATE INDEX idx_grupo_sorteio_grupo ON campeonato_grupo_sorteio (grupo_id);
