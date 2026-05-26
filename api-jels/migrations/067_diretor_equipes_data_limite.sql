-- Prazo para diretor/coordenador criar e editar equipes
INSERT INTO configuracoes (chave, valor) VALUES ('diretor_equipes_data_limite', NULL)
ON CONFLICT (chave) DO NOTHING;
