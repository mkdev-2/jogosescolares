-- Migration 041: Validação de mínimo de atletas por equipe via trigger DEFERRABLE.
-- Complementa a Validação 4 (máximo) já existente em migration 024.
-- O trigger é DEFERRABLE INITIALLY DEFERRED para que a verificação ocorra
-- ao final da transação, após todos os atletas serem inseridos/removidos de uma vez.

CREATE OR REPLACE FUNCTION check_minimo_atletas_equipe()
RETURNS TRIGGER AS $$
DECLARE
    v_minimo_atletas INT;
    v_total_equipe   INT;
    v_esporte_nome   VARCHAR;
    v_equipe_id      INT;
BEGIN
    v_equipe_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.equipe_id ELSE NEW.equipe_id END;

    -- Se a equipe foi removida (ex: DELETE CASCADE), não há nada a verificar
    SELECT esp.minimo_atletas, esp.nome
    INTO v_minimo_atletas, v_esporte_nome
    FROM equipes e
    JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
    JOIN esportes esp          ON esp.id = ev.esporte_id
    WHERE e.id = v_equipe_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT COUNT(*)::INT INTO v_total_equipe
    FROM equipe_estudantes
    WHERE equipe_id = v_equipe_id;

    IF v_total_equipe < v_minimo_atletas THEN
        RAISE EXCEPTION 'Mínimo de atletas não atingido. O esporte "%" requer no mínimo % atleta(s) por equipe. Esta equipe possui %.',
            v_esporte_nome, v_minimo_atletas, v_total_equipe;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_check_minimo_atletas_equipe
AFTER INSERT OR DELETE ON equipe_estudantes
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_minimo_atletas_equipe();
