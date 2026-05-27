-- Adiciona colunas de rastreamento de origem dos slots de mata-mata.
-- Cada slot de bracket (mandante/visitante) registra de qual grupo e qual
-- posição de seed_no_grupo ele veio, permitindo que avancar_classificados_para_mata_mata
-- encontre o slot correto por (grupo_id, seed) em vez de inferir via classificados_diretos.
-- Isso torna a função robusta a edições posteriores de classificados_diretos/vagas_wildcard.

ALTER TABLE campeonato_partidas
    ADD COLUMN mandante_fonte_grupo_id  INTEGER REFERENCES campeonato_grupos(id),
    ADD COLUMN mandante_fonte_seed      INTEGER,
    ADD COLUMN visitante_fonte_grupo_id INTEGER REFERENCES campeonato_grupos(id),
    ADD COLUMN visitante_fonte_seed     INTEGER;
