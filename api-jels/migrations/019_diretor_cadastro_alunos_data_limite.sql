-- Data limite para diretor/coordenador cadastrar alunos (null = sem limite)
INSERT INTO configuracoes (chave, valor) VALUES ('diretor_cadastro_alunos_data_limite', NULL)
ON CONFLICT (chave) DO NOTHING;
