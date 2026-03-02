-- Roles para PostgREST (anon = sem auth, authenticated = com JWT)
-- O usuário do banco (jogosescolares) precisa poder fazer SET ROLE para estas roles

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'jogosescolares_anon') THEN
        CREATE ROLE jogosescolares_anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'jogosescolares_authenticated') THEN
        CREATE ROLE jogosescolares_authenticated NOLOGIN;
    END IF;
END $$;

-- Conceder roles ao usuário de conexão (será jogosescolares via POSTGRES_USER)
GRANT jogosescolares_anon TO jogosescolares;
GRANT jogosescolares_authenticated TO jogosescolares;

-- Permissões para anon (leitura básica - modalidades públicas)
GRANT USAGE ON SCHEMA public TO jogosescolares_anon;
GRANT SELECT ON modalidades TO jogosescolares_anon;

-- Permissões para authenticated (CRUD completo)
GRANT USAGE ON SCHEMA public TO jogosescolares_authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON modalidades TO jogosescolares_authenticated;
GRANT SELECT ON users TO jogosescolares_authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jogosescolares_authenticated;
