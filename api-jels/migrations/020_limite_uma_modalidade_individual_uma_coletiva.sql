-- Migration 020: Regra de negócio - cada aluno pode participar de no máximo
-- 1 modalidade Individual e 1 modalidade Coletiva.
-- A validação é feita ao inserir em equipe_estudantes (criação de equipe ou inclusão de aluno).

CREATE OR REPLACE FUNCTION validar_estudante_equipe()
RETURNS TRIGGER AS $$
DECLARE
    v_categoria_id UUID;
    v_idade_min INT;
    v_idade_max INT;
    v_naipe_codigo CHAR(1);
    v_estudante_idade INT;
    v_estudante_sexo CHAR(1);
    v_tipo_codigo VARCHAR(20);
    v_ja_participa INT;
BEGIN
    SELECT ev.categoria_id, c.idade_min, c.idade_max, n.codigo, tm.codigo
    INTO v_categoria_id, v_idade_min, v_idade_max, v_naipe_codigo, v_tipo_codigo
    FROM equipes e
    JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
    JOIN categorias c ON c.id = ev.categoria_id
    JOIN naipes n ON n.id = ev.naipe_id
    JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
    WHERE e.id = NEW.equipe_id;

    SELECT
        DATE_PART('year', AGE(CURRENT_DATE, est.data_nascimento))::INT,
        est.sexo
    INTO v_estudante_idade, v_estudante_sexo
    FROM estudantes_atletas est
    WHERE est.id = NEW.estudante_id;

    -- Validar faixa etária
    IF v_estudante_idade < v_idade_min OR v_estudante_idade > v_idade_max THEN
        RAISE EXCEPTION 'Estudante com % anos não pode ser cadastrado na categoria % a % anos',
            v_estudante_idade, v_idade_min, v_idade_max;
    END IF;

    -- Validar naipe (M ↔ MASCULINO, F ↔ FEMININO)
    IF v_estudante_sexo != v_naipe_codigo THEN
        RAISE EXCEPTION 'Estudante do sexo % não pode ser cadastrado no naipe %',
            CASE v_estudante_sexo WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Feminino' ELSE v_estudante_sexo END,
            CASE v_naipe_codigo WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Feminino' ELSE v_naipe_codigo END;
    END IF;

    -- Regra: 1 modalidade Individual e 1 Coletiva por aluno
    IF v_tipo_codigo IN ('INDIVIDUAIS', 'COLETIVAS') THEN
        SELECT COUNT(*)::INT INTO v_ja_participa
        FROM equipe_estudantes ee2
        JOIN equipes e2 ON e2.id = ee2.equipe_id
        JOIN esporte_variantes ev2 ON ev2.id = e2.esporte_variante_id
        JOIN tipos_modalidade tm2 ON tm2.id = ev2.tipo_modalidade_id
        WHERE ee2.estudante_id = NEW.estudante_id
          AND e2.id != NEW.equipe_id
          AND tm2.codigo = v_tipo_codigo;

        IF v_ja_participa > 0 THEN
            RAISE EXCEPTION 'O aluno já participa de uma modalidade %. Cada aluno pode participar de no máximo uma modalidade Individual e uma Coletiva.',
                CASE v_tipo_codigo WHEN 'INDIVIDUAIS' THEN 'Individual' WHEN 'COLETIVAS' THEN 'Coletiva' ELSE v_tipo_codigo END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
