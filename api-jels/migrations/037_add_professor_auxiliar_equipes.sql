-- Migration 037: adiciona professor auxiliar em equipes (técnico e auxiliar)

ALTER TABLE equipes
ADD COLUMN IF NOT EXISTS professor_auxiliar_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_equipes_professor_auxiliar'
    ) THEN
        ALTER TABLE equipes
        ADD CONSTRAINT fk_equipes_professor_auxiliar
        FOREIGN KEY (professor_auxiliar_id) REFERENCES professores_tecnicos(id);
    END IF;
END $$;
