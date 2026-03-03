-- Migração 008: COORDENADOR, escola_id, constraint e permissões
-- Rode com a aplicação parada para evitar bloqueio de locks.

-- 1. Adicionar COORDENADOR ao enum user_role
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'COORDENADOR'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'COORDENADOR';
    END IF;
END
$$;

-- 2. Adicionar coluna escola_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS escola_id INTEGER REFERENCES escolas(id);

CREATE INDEX IF NOT EXISTS idx_users_escola_id ON users(escola_id);

-- 3. Tratar DIRETOR existentes sem escola_id
DO $$
DECLARE
    escola_placeholder_id INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE role = 'DIRETOR' AND escola_id IS NULL) THEN
        INSERT INTO escolas (nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone)
        VALUES ('Escola pendente de vinculação', '00000000', '00000000000000', 'A definir', 'A definir', 'MA', 'pendente@email.com', '0000000000')
        ON CONFLICT (inep) DO NOTHING;
        SELECT id INTO escola_placeholder_id FROM escolas WHERE inep = '00000000' LIMIT 1;
        UPDATE users SET escola_id = escola_placeholder_id WHERE role = 'DIRETOR' AND escola_id IS NULL;
    END IF;
END
$$;

-- 4. Constraint: escola_id obrigatório para DIRETOR e COORDENADOR
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_escola_obrigatoria_diretor_coordenador;
ALTER TABLE users ADD CONSTRAINT chk_escola_obrigatoria_diretor_coordenador
    CHECK (
        (role IN ('DIRETOR', 'COORDENADOR') AND escola_id IS NOT NULL) OR
        (role NOT IN ('DIRETOR', 'COORDENADOR'))
    );

-- 5. Permissões PostgREST para escolas
GRANT SELECT, INSERT, UPDATE ON escolas TO jogosescolares_authenticated;
GRANT USAGE, SELECT ON SEQUENCE escolas_id_seq TO jogosescolares_authenticated;

GRANT INSERT ON escolas TO jogosescolares_anon;
GRANT USAGE, SELECT ON SEQUENCE escolas_id_seq TO jogosescolares_anon;
