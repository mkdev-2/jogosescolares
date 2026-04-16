-- Migration 045: Adiciona colunas de placar e resultado às partidas de campeonato.
-- Permite registrar resultado de cada partida de forma genérica (qualquer esporte).

ALTER TABLE campeonato_partidas
    ADD COLUMN IF NOT EXISTS placar_mandante       INTEGER NULL,
    ADD COLUMN IF NOT EXISTS placar_visitante      INTEGER NULL,
    -- Unidade secundária (ex: vôlei — total de pontos marcados nos sets)
    ADD COLUMN IF NOT EXISTS placar_mandante_sec   INTEGER NULL,
    ADD COLUMN IF NOT EXISTS placar_visitante_sec  INTEGER NULL,
    -- Tipo do resultado: NORMAL | WXO | ADIADA | CANCELADA
    ADD COLUMN IF NOT EXISTS resultado_tipo        VARCHAR(20) NULL,
    -- Rastreabilidade
    ADD COLUMN IF NOT EXISTS registrado_em         TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS registrado_por        INTEGER NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campeonato_partidas_resultado_tipo
    ON campeonato_partidas(resultado_tipo)
    WHERE resultado_tipo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campeonato_partidas_registrado_por
    ON campeonato_partidas(registrado_por)
    WHERE registrado_por IS NOT NULL;
