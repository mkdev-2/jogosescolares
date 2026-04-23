-- Migration 050: view pré-computada para o relatório "Escolas por Modalidade"
-- Elimina os JOINs repetidos a cada chamada do endpoint /api/relatorios/escolas-por-modalidade

CREATE OR REPLACE VIEW vw_escolas_por_modalidade AS
SELECT
    ev.id::text              AS variante_id,
    esp.id::text             AS esporte_id,
    esp.nome                 AS esporte_nome,
    esp.icone                AS esporte_icone,
    c.nome                   AS categoria_nome,
    n.nome                   AS naipe_nome,
    n.codigo                 AS naipe_codigo,
    tm.nome                  AS tipo_modalidade_nome,
    tm.codigo                AS tipo_modalidade_codigo,
    e.id                     AS equipe_id,
    esc.id                   AS escola_id,
    esc.nome_escola,
    esc.inep,
    e.edicao_id,
    (
        SELECT COUNT(*)
        FROM equipe_estudantes ee
        WHERE ee.equipe_id = e.id
    )                        AS total_atletas
FROM equipes e
JOIN esporte_variantes ev  ON ev.id  = e.esporte_variante_id
JOIN esportes esp          ON esp.id = ev.esporte_id
JOIN categorias c          ON c.id   = ev.categoria_id
JOIN naipes n              ON n.id   = ev.naipe_id
JOIN tipos_modalidade tm   ON tm.id  = ev.tipo_modalidade_id
JOIN escolas esc           ON esc.id = e.escola_id;
