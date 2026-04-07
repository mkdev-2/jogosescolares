-- Migration 040: unicidade de equipe por escola apenas para modalidades coletivas
-- Regra desejada:
-- - COLETIVAS: 1 equipe por escola + variante + edição
-- - INDIVIDUAIS: permite múltiplas equipes/inscrições por escola na mesma variante

-- Remove constraint global antiga que bloqueava também as individuais
ALTER TABLE equipes
DROP CONSTRAINT IF EXISTS uq_equipes_escola_variante_edicao;

-- Trigger para aplicar a unicidade apenas quando a variante for COLETIVA
CREATE OR REPLACE FUNCTION validar_unicidade_equipe_coletiva()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_codigo TEXT;
    v_existente_id INTEGER;
BEGIN
    SELECT tm.codigo
      INTO v_tipo_codigo
      FROM esporte_variantes ev
      JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
     WHERE ev.id = NEW.esporte_variante_id;

    IF v_tipo_codigo = 'COLETIVAS' THEN
        SELECT e.id
          INTO v_existente_id
          FROM equipes e
         WHERE e.escola_id = NEW.escola_id
           AND e.esporte_variante_id = NEW.esporte_variante_id
           AND e.edicao_id = NEW.edicao_id
           AND e.id <> COALESCE(NEW.id, 0)
         LIMIT 1;

        IF v_existente_id IS NOT NULL THEN
            RAISE EXCEPTION 'Sua escola já possui uma equipe cadastrada para esta modalidade/categoria/naipe.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validar_unicidade_equipe_coletiva ON equipes;
CREATE TRIGGER trg_validar_unicidade_equipe_coletiva
BEFORE INSERT OR UPDATE OF escola_id, esporte_variante_id, edicao_id
ON equipes
FOR EACH ROW
EXECUTE FUNCTION validar_unicidade_equipe_coletiva();
