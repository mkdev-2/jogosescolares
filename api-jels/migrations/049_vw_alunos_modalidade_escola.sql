-- Migration 049: view para relatório de alunos por modalidade e escola
-- Usada pelo endpoint GET /api/relatorios/escola-modalidade-alunos

CREATE OR REPLACE VIEW vw_alunos_modalidade_escola AS
SELECT
    ea.id                   AS estudante_id,
    ea.nome                 AS estudante_nome,
    ea.data_nascimento,
    ea.sexo,
    ea.cpf,
    eq.escola_id,
    eq.esporte_variante_id,
    eq.edicao_id,
    eq.id                   AS equipe_id
FROM equipe_estudantes ee
JOIN equipes             eq ON eq.id  = ee.equipe_id
JOIN estudantes_atletas  ea ON ea.id  = ee.estudante_id;
