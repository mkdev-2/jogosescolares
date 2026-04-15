-- 043_coordenador_multi_escola.sql
-- Suporte a coordenadores vinculados a múltiplas escolas.
-- Um coordenador que trabalha em N escolas usa um único usuário/senha
-- e seleciona a escola ativa no login.

-- 1. Tabela de junção user <-> escola (exclusiva para COORDENADORs)
CREATE TABLE IF NOT EXISTS coordenadores_escolas (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    escola_id   INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, escola_id)
);

CREATE INDEX IF NOT EXISTS idx_coordenadores_escolas_user_id
    ON coordenadores_escolas(user_id);

CREATE INDEX IF NOT EXISTS idx_coordenadores_escolas_escola_id
    ON coordenadores_escolas(escola_id);

-- 2. Backfill: migrar vínculos existentes (coordenadores já cadastrados)
INSERT INTO coordenadores_escolas (user_id, escola_id)
SELECT id, escola_id
FROM users
WHERE role = 'COORDENADOR'
  AND escola_id IS NOT NULL
ON CONFLICT (user_id, escola_id) DO NOTHING;

-- 3. Relaxar CHECK constraint: escola_id obrigatório apenas para DIRETOR
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_escola_obrigatoria_diretor_coordenador;

ALTER TABLE users ADD CONSTRAINT chk_escola_obrigatoria_diretor
    CHECK (
        (role = 'DIRETOR' AND escola_id IS NOT NULL)
        OR role != 'DIRETOR'
    );

-- 4. Limpar escola_id dos coordenadores (agora gerido pela tabela de junção)
UPDATE users SET escola_id = NULL WHERE role = 'COORDENADOR';
