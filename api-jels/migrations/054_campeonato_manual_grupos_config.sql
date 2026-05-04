-- Configuração de fase de grupos / vagas eliminatória e grupos manuais isolados do motor automático.

ALTER TABLE campeonatos
    ADD COLUMN IF NOT EXISTS tem_fase_grupos BOOLEAN NULL;

ALTER TABLE campeonatos
    ADD COLUMN IF NOT EXISTS vagas_eliminatoria INTEGER NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_campeonatos_vagas_eliminatoria'
    ) THEN
        ALTER TABLE campeonatos
            ADD CONSTRAINT chk_campeonatos_vagas_eliminatoria
            CHECK (vagas_eliminatoria IS NULL OR vagas_eliminatoria IN (2, 4, 8, 16));
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS campeonato_manual_grupos (
    id SERIAL PRIMARY KEY,
    campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
    nome VARCHAR(80) NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_campeonato_manual_grupo_ordem UNIQUE (campeonato_id, ordem),
    CONSTRAINT chk_campeonato_manual_grupo_ordem CHECK (ordem >= 1),
    CONSTRAINT chk_campeonato_manual_grupo_nome CHECK (length(trim(nome)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_campeonato_manual_grupos_campeonato
    ON campeonato_manual_grupos(campeonato_id, ordem, id);

CREATE TRIGGER update_campeonato_manual_grupos_updated_at
    BEFORE UPDATE ON campeonato_manual_grupos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS campeonato_manual_grupo_participantes (
    grupo_id INTEGER NOT NULL REFERENCES campeonato_manual_grupos(id) ON DELETE CASCADE,
    participante_id INTEGER NOT NULL REFERENCES campeonato_manual_participantes(id) ON DELETE CASCADE,
    seed_no_grupo INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (grupo_id, participante_id),
    CONSTRAINT chk_campeonato_manual_grupo_seed CHECK (seed_no_grupo >= 1)
);

CREATE INDEX IF NOT EXISTS idx_campeonato_manual_grupo_participantes_participante
    ON campeonato_manual_grupo_participantes(participante_id);
