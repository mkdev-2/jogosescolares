-- Migration 056: suporte a equipes provisórias
-- Equipes provisórias são criadas pelo admin para inscrever escolas de última
-- hora em campeonatos, sem professor-técnico ou atletas cadastrados ainda.
-- A escola pode preencher esses dados depois com urgência.

-- Permite professor_tecnico_id nulo (equipes provisórias não têm técnico ainda)
ALTER TABLE equipes
ALTER COLUMN professor_tecnico_id DROP NOT NULL;

-- Marca explicitamente quais equipes são provisórias
ALTER TABLE equipes
ADD COLUMN IF NOT EXISTS is_provisional BOOLEAN NOT NULL DEFAULT FALSE;
