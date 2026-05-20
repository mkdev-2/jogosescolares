-- Migration 065: flag permite_campeonato em esportes.
-- Modalidades INDIVIDUAIS marcadas podem ter campeonato (ex.: Vôlei de Praia — duplas).
-- Também aplica unicidade de 1 equipe por escola/variante/edição (como coletivas).

ALTER TABLE esportes
    ADD COLUMN IF NOT EXISTS permite_campeonato BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE esportes
   SET permite_campeonato = TRUE
 WHERE id = 'a1f7ffc9-9e57-4a93-baa2-71a4a2d65605'; -- Vôlei de Praia

CREATE OR REPLACE FUNCTION validar_unicidade_equipe_coletiva()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_codigo TEXT;
    v_permite_campeonato BOOLEAN;
    v_existente_id INTEGER;
BEGIN
    SELECT tm.codigo, COALESCE(esp.permite_campeonato, FALSE)
      INTO v_tipo_codigo, v_permite_campeonato
      FROM esporte_variantes ev
      JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
      JOIN esportes esp ON esp.id = ev.esporte_id
     WHERE ev.id = NEW.esporte_variante_id;

    IF v_tipo_codigo = 'COLETIVAS' OR v_permite_campeonato THEN
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
