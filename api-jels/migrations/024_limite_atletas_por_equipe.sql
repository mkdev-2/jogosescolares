-- Migration 024: Regra de negócio - limite máximo de atletas por esporte por equipe.
-- Adiciona a Validação 4 à função validar_estudante_equipe():
--   impede inserção em equipe_estudantes quando o total de atletas já atingiu
--   o campo limite_atletas definido na tabela esportes.
-- As validações anteriores (faixa etária, naipe, 1 individual + 1 coletiva) são mantidas.

CREATE OR REPLACE FUNCTION validar_estudante_equipe()
RETURNS TRIGGER AS $$
DECLARE
    v_categoria_id    UUID;
    v_idade_min       INT;
    v_idade_max       INT;
    v_naipe_codigo    CHAR(1);
    v_estudante_idade INT;
    v_estudante_sexo  CHAR(1);
    v_tipo_codigo     VARCHAR(20);
    v_ja_participa    INT;
    v_total_equipe    INT;
    v_limite_atletas  INT;
    v_esporte_nome    VARCHAR;
BEGIN
    SELECT ev.categoria_id, c.idade_min, c.idade_max, n.codigo, tm.codigo,
           esp.limite_atletas, esp.nome
    INTO v_categoria_id, v_idade_min, v_idade_max, v_naipe_codigo, v_tipo_codigo,
         v_limite_atletas, v_esporte_nome
    FROM equipes e
    JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
    JOIN categorias c          ON c.id  = ev.categoria_id
    JOIN naipes n              ON n.id  = ev.naipe_id
    JOIN tipos_modalidade tm   ON tm.id = ev.tipo_modalidade_id
    JOIN esportes esp          ON esp.id = ev.esporte_id
    WHERE e.id = NEW.equipe_id;

    SELECT
        DATE_PART('year', AGE(CURRENT_DATE, est.data_nascimento))::INT,
        est.sexo
    INTO v_estudante_idade, v_estudante_sexo
    FROM estudantes_atletas est
    WHERE est.id = NEW.estudante_id;

    -- Validação 1: Faixa etária da categoria
    IF v_estudante_idade < v_idade_min OR v_estudante_idade > v_idade_max THEN
        RAISE EXCEPTION 'Estudante com % anos não pode ser cadastrado na categoria % a % anos',
            v_estudante_idade, v_idade_min, v_idade_max;
    END IF;

    -- Validação 2: Naipe (M ↔ MASCULINO, F ↔ FEMININO)
    IF v_estudante_sexo != v_naipe_codigo THEN
        RAISE EXCEPTION 'Estudante do sexo % não pode ser cadastrado no naipe %',
            CASE v_estudante_sexo WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Feminino' ELSE v_estudante_sexo END,
            CASE v_naipe_codigo  WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Feminino' ELSE v_naipe_codigo  END;
    END IF;

    -- Validação 3: 1 modalidade Individual e 1 Coletiva por aluno
    IF v_tipo_codigo IN ('INDIVIDUAIS', 'COLETIVAS') THEN
        SELECT COUNT(*)::INT INTO v_ja_participa
        FROM equipe_estudantes ee2
        JOIN equipes e2           ON e2.id  = ee2.equipe_id
        JOIN esporte_variantes ev2 ON ev2.id = e2.esporte_variante_id
        JOIN tipos_modalidade tm2  ON tm2.id = ev2.tipo_modalidade_id
        WHERE ee2.estudante_id = NEW.estudante_id
          AND e2.id != NEW.equipe_id
          AND tm2.codigo = v_tipo_codigo;

        IF v_ja_participa > 0 THEN
            RAISE EXCEPTION 'O aluno já participa de uma modalidade %. Cada aluno pode participar de no máximo uma modalidade Individual e uma Coletiva.',
                CASE v_tipo_codigo WHEN 'INDIVIDUAIS' THEN 'Individual' WHEN 'COLETIVAS' THEN 'Coletiva' ELSE v_tipo_codigo END;
        END IF;
    END IF;

    -- Validação 4: Limite máximo de atletas por esporte
    SELECT COUNT(*)::INT INTO v_total_equipe
    FROM equipe_estudantes
    WHERE equipe_id = NEW.equipe_id;

    IF v_total_equipe >= v_limite_atletas THEN
        RAISE EXCEPTION 'Limite de atletas atingido. O esporte "%" permite no máximo % atleta(s) por equipe. Esta equipe já possui %.',
            v_esporte_nome, v_limite_atletas, v_total_equipe;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- O trigger trg_validar_estudante_equipe já existe (criado em migration anterior).
-- Nenhuma alteração necessária na definição do trigger, apenas na função acima.
