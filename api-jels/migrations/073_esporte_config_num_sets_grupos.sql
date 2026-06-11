-- Migration 073: Adiciona num_sets_grupos à config de pontuação por esporte.
-- Permite configurar quantos sets são disputados na fase de grupos (ex: Vôlei de Praia = 1).
-- DEFAULT 3 garante retrocompatibilidade com todos os esportes existentes.

ALTER TABLE esporte_config_pontuacao
    ADD COLUMN IF NOT EXISTS num_sets_grupos INTEGER NOT NULL DEFAULT 3;
