-- Migration: Adicionar termo_assinatura_url nas tabelas solicitacoes e escolas
-- Descrição: Permite anexar a cópia assinada do Termo de Adesão JELS da instituição.

ALTER TABLE solicitacoes ADD COLUMN termo_assinatura_url VARCHAR;
ALTER TABLE escolas ADD COLUMN termo_assinatura_url VARCHAR;
