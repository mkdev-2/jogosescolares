-- Migration 047: Adiciona categoria GERAL (12-17 anos)
-- Categoria que aceita estudantes-atletas de todas as idades dos jogos (12 a 17 anos)
-- Nenhuma alteração no trigger necessária — a validação de faixa etária já é genérica

INSERT INTO categorias (nome, idade_min, idade_max, ativa)
VALUES ('Geral', 12, 17, TRUE)
