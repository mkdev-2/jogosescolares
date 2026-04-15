-- Migration 042: remove índice único global uq_escola_variante que bloqueava
-- múltiplas equipes de modalidades INDIVIDUAIS na mesma variante/escola.
--
-- A unicidade para COLETIVAS já é garantida pelo trigger
-- trg_validar_unicidade_equipe_coletiva (migration 040).
-- Para INDIVIDUAIS, cada estudante é cadastrado como uma equipe única,
-- portanto a escola pode ter N equipes na mesma variante.

ALTER TABLE equipes DROP CONSTRAINT IF EXISTS uq_escola_variante;
