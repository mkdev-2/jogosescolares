-- Usuário administrador inicial (CPF: 12345678901, senha: 123456)
-- Hash bcrypt de 'admin123'
INSERT INTO users (cpf, email, password_hash, nome, role, ativo)
SELECT '11144477735', 'admin@jogosescolares.local', '$2b$12$if1uxtVojhgNsQPgtMuwL.Sk6tSdU7aUGGeWWNUvTiJT9mj9F.TH2', 'Administrador', 'ADMIN', TRUE
ON CONFLICT (cpf) DO NOTHING;
