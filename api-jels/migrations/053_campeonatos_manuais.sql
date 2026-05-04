-- Migration 053: suporte a campeonatos cadastrados manualmente.

ALTER TABLE campeonatos
    ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT 'AUTOMATICO';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_campeonatos_origem'
    ) THEN
        ALTER TABLE campeonatos
            ADD CONSTRAINT chk_campeonatos_origem
            CHECK (origem IN ('AUTOMATICO', 'MANUAL'));
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_campeonatos_origem
    ON campeonatos(origem);

CREATE TABLE IF NOT EXISTS campeonato_manual_participantes (
    id SERIAL PRIMARY KEY,
    campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
    equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE RESTRICT,
    escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE RESTRICT,
    nome_exibicao VARCHAR(160) NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_campeonato_manual_participante_equipe UNIQUE (campeonato_id, equipe_id),
    CONSTRAINT chk_campeonato_manual_participante_ordem CHECK (ordem >= 1),
    CONSTRAINT chk_campeonato_manual_participante_nome CHECK (length(trim(nome_exibicao)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_campeonato_manual_participantes_campeonato
    ON campeonato_manual_participantes(campeonato_id, ordem, id);

CREATE TRIGGER update_campeonato_manual_participantes_updated_at
    BEFORE UPDATE ON campeonato_manual_participantes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS campeonato_manual_confrontos (
    id SERIAL PRIMARY KEY,
    campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
    fase campeonato_fase_enum NOT NULL DEFAULT 'GRUPOS',
    rodada INTEGER NOT NULL DEFAULT 1,
    participante_a_id INTEGER NULL REFERENCES campeonato_manual_participantes(id) ON DELETE SET NULL,
    participante_b_id INTEGER NULL REFERENCES campeonato_manual_participantes(id) ON DELETE SET NULL,
    participante_a_nome VARCHAR(160) NULL,
    participante_b_nome VARCHAR(160) NULL,
    vencedor_participante_id INTEGER NULL REFERENCES campeonato_manual_participantes(id) ON DELETE SET NULL,
    vencedor_nome VARCHAR(160) NULL,
    inicio_em TIMESTAMP NULL,
    placar_a INTEGER NULL,
    placar_b INTEGER NULL,
    placar_a_sec INTEGER NULL,
    placar_b_sec INTEGER NULL,
    resultado_tipo VARCHAR(20) NULL,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_campeonato_manual_confronto_rodada CHECK (rodada >= 1),
    CONSTRAINT chk_campeonato_manual_confronto_ordem CHECK (ordem >= 1),
    CONSTRAINT chk_campeonato_manual_confronto_participantes CHECK (
        participante_a_id IS NULL
        OR participante_b_id IS NULL
        OR participante_a_id <> participante_b_id
    )
);

CREATE INDEX IF NOT EXISTS idx_campeonato_manual_confrontos_campeonato
    ON campeonato_manual_confrontos(campeonato_id, fase, rodada, ordem, id);

CREATE TRIGGER update_campeonato_manual_confrontos_updated_at
    BEFORE UPDATE ON campeonato_manual_confrontos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS campeonato_manual_classificacao (
    id SERIAL PRIMARY KEY,
    campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
    grupo_nome VARCHAR(40) NOT NULL DEFAULT 'Geral',
    participante_id INTEGER NULL REFERENCES campeonato_manual_participantes(id) ON DELETE SET NULL,
    nome_exibicao VARCHAR(160) NULL,
    posicao INTEGER NOT NULL,
    pontos INTEGER NULL,
    vitorias INTEGER NULL,
    empates INTEGER NULL,
    derrotas INTEGER NULL,
    pro INTEGER NULL,
    contra INTEGER NULL,
    saldo INTEGER NULL,
    observacao VARCHAR(255) NULL,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_campeonato_manual_classificacao_posicao UNIQUE (campeonato_id, grupo_nome, posicao),
    CONSTRAINT chk_campeonato_manual_classificacao_posicao CHECK (posicao >= 1),
    CONSTRAINT chk_campeonato_manual_classificacao_ordem CHECK (ordem >= 1)
);

CREATE INDEX IF NOT EXISTS idx_campeonato_manual_classificacao_campeonato
    ON campeonato_manual_classificacao(campeonato_id, grupo_nome, posicao);

CREATE TRIGGER update_campeonato_manual_classificacao_updated_at
    BEFORE UPDATE ON campeonato_manual_classificacao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
