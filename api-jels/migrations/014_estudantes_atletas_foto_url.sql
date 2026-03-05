-- Migration 014: Adiciona coluna foto_url na tabela estudantes_atletas
-- Permite armazenar URL da foto do aluno (ex.: upload no MinIO)

ALTER TABLE estudantes_atletas ADD COLUMN IF NOT EXISTS foto_url VARCHAR(500);
