-- Migration 044: Configuração genérica de pontuação e critérios de desempate por esporte.
-- Permite que cada esporte (por edição) defina suas próprias regras de pontuação

CREATE TABLE IF NOT EXISTS esporte_config_pontuacao (
    id            SERIAL PRIMARY KEY,
    esporte_id    UUID    NOT NULL REFERENCES esportes(id) ON DELETE CASCADE,
    edicao_id     INTEGER NOT NULL REFERENCES edicoes(id)  ON DELETE RESTRICT,

    -- Unidade de placar primária: GOLS, CESTAS, SETS, PONTOS, etc.
    unidade_placar      VARCHAR(20) NOT NULL DEFAULT 'PONTOS',
    -- Unidade de placar secundária (ex: vôlei usa SETS como primária e PONTOS como secundária)
    unidade_placar_sec  VARCHAR(20) NULL,

    -- Pontos na tabela de classificação por resultado
    pts_vitoria         INTEGER NOT NULL DEFAULT 3,
    -- Pontos para vitória "parcial" (ex: vôlei 2x1 = 2 pts; NULL = não se aplica)
    pts_vitoria_parcial INTEGER NULL,
    -- Pontos para empate (ignorado quando permite_empate = FALSE)
    pts_empate          INTEGER NOT NULL DEFAULT 1,
    pts_derrota         INTEGER NOT NULL DEFAULT 0,
    permite_empate      BOOLEAN NOT NULL DEFAULT FALSE,

    -- WxO (W×O / walkover) — pontuação na tabela
    wxo_pts_vencedor    INTEGER NOT NULL DEFAULT 3,
    wxo_pts_perdedor    INTEGER NOT NULL DEFAULT 0,
    -- WxO — placar registrado na partida (unidade primária)
    wxo_placar_pro      INTEGER NOT NULL DEFAULT 1,   -- creditado ao vencedor
    wxo_placar_contra   INTEGER NOT NULL DEFAULT 0,   -- creditado ao perdedor
    -- WxO — placar secundário (vôlei: pontos totais nos sets; ex: 50 pro / 0 contra)
    wxo_placar_pro_sec  INTEGER NULL,
    wxo_placar_contra_sec INTEGER NULL,

    -- Se TRUE, gols/pontos de prorrogação NÃO entram no saldo/average (ex: handebol)
    ignorar_placar_extra BOOLEAN NOT NULL DEFAULT FALSE,

    -- Critérios de desempate ordenados — array de strings (ver códigos abaixo)
    -- Códigos válidos: CONFRONTO_DIRETO, MAIOR_VITORIAS,
    --   AVERAGE_DIRETO, AVERAGE_SEC_DIRETO, SALDO_DIRETO,
    --   AVERAGE_GERAL, AVERAGE_SEC_GERAL, SALDO_GERAL,
    --   MENOR_CONTRA_GERAL, MAIOR_PRO_GERAL, SORTEIO
    criterios_desempate_2     JSONB NOT NULL DEFAULT '[]',
    criterios_desempate_3plus JSONB NOT NULL DEFAULT '[]',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_esporte_config_pontuacao UNIQUE (esporte_id, edicao_id),
    CONSTRAINT chk_ecp_pts_vitoria_pos    CHECK (pts_vitoria >= 0),
    CONSTRAINT chk_ecp_pts_derrota_nn     CHECK (pts_derrota >= 0),
    CONSTRAINT chk_ecp_pts_empate_nn      CHECK (pts_empate >= 0),
    CONSTRAINT chk_ecp_wxo_placar_pro_nn  CHECK (wxo_placar_pro >= 0),
    CONSTRAINT chk_ecp_wxo_placar_contra_nn CHECK (wxo_placar_contra >= 0)
);

CREATE INDEX IF NOT EXISTS idx_esporte_config_pontuacao_esporte
    ON esporte_config_pontuacao(esporte_id);
CREATE INDEX IF NOT EXISTS idx_esporte_config_pontuacao_edicao
    ON esporte_config_pontuacao(edicao_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_esporte_config_pontuacao_updated_at'
    ) THEN
        CREATE TRIGGER update_esporte_config_pontuacao_updated_at
            BEFORE UPDATE ON esporte_config_pontuacao
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;
