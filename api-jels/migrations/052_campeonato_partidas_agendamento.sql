-- Migration 052: Agendamento de partidas de campeonatos.

ALTER TABLE campeonato_partidas
    ADD COLUMN IF NOT EXISTS inicio_em TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_campeonato_partidas_campeonato_inicio
    ON campeonato_partidas(campeonato_id, inicio_em);
