-- Migração: categorias e modalidades com UUID (id gerado pelo banco)
-- Remove ordem de categorias. IDs passam a ser UUID com gen_random_uuid().
-- Adiciona coluna icone em modalidades. Executado em produção via MCP em 2025-03-04.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Remover FKs
ALTER TABLE modalidades DROP CONSTRAINT IF EXISTS modalidades_categoria_id_fkey;
ALTER TABLE equipes DROP CONSTRAINT IF EXISTS equipes_modalidade_id_fkey;
ALTER TABLE equipes DROP CONSTRAINT IF EXISTS equipes_categoria_id_fkey;

-- categorias: remover ordem, trocar id para UUID
ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_pkey;
ALTER TABLE categorias DROP COLUMN IF EXISTS id;
ALTER TABLE categorias DROP COLUMN IF EXISTS ordem;
ALTER TABLE categorias ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE categorias ADD PRIMARY KEY (id);

-- modalidades: trocar id e categoria_id para UUID
ALTER TABLE modalidades DROP CONSTRAINT IF EXISTS modalidades_pkey;
ALTER TABLE modalidades DROP COLUMN IF EXISTS id;
ALTER TABLE modalidades DROP COLUMN IF EXISTS categoria_id;
ALTER TABLE modalidades ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE modalidades ADD COLUMN categoria_id uuid NOT NULL REFERENCES categorias(id);
ALTER TABLE modalidades ADD PRIMARY KEY (id);

-- equipes: trocar modalidade_id e categoria_id para UUID
ALTER TABLE equipes DROP COLUMN IF EXISTS modalidade_id;
ALTER TABLE equipes DROP COLUMN IF EXISTS categoria_id;
ALTER TABLE equipes ADD COLUMN modalidade_id uuid NOT NULL REFERENCES modalidades(id);
ALTER TABLE equipes ADD COLUMN categoria_id uuid NOT NULL REFERENCES categorias(id);

-- Ícone da modalidade (nome do ícone lucide-react)
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS icone VARCHAR(50) DEFAULT 'Zap';
-- campo existe nem sempre nas versões anteriores; adiciona se necessário
ALTER TABLE modalidades ADD COLUMN IF NOT EXISTS limite_atletas INTEGER DEFAULT 1;
