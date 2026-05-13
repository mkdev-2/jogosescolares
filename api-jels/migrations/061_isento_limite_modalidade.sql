-- Migration 061: Adiciona flag isento_limite_modalidade em esportes.
-- Esportes marcados como isentos não estão sujeitos à regra de 1 modalidade
-- Individual e 1 Coletiva por aluno. Caso de uso: Jogos Eletrônicos - Free Fire.

-- 1. Nova coluna
ALTER TABLE esportes
    ADD COLUMN IF NOT EXISTS isento_limite_modalidade BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Marcar Free Fire como isento
UPDATE esportes
   SET isento_limite_modalidade = TRUE
 WHERE id = 'ac61d2bb-c341-4b10-9eeb-7115c3463a8a';

-- 3. Recriar trigger respeitando a isenção
CREATE OR REPLACE FUNCTION public.validar_estudante_equipe()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_categoria_id         UUID;
    v_idade_min            INT;
    v_idade_max            INT;
    v_naipe_codigo         CHAR(1);
    v_estudante_idade      INT;
    v_estudante_sexo       CHAR(1);
    v_tipo_codigo          VARCHAR(20);
    v_ja_participa         INT;
    v_total_equipe         INT;
    v_limite_atletas       INT;
    v_esporte_nome         VARCHAR;
    v_isento_limite        BOOLEAN;
BEGIN
    SELECT ev.categoria_id, c.idade_min, c.idade_max, n.codigo, tm.codigo,
           esp.limite_atletas, esp.nome, esp.isento_limite_modalidade
    INTO v_categoria_id, v_idade_min, v_idade_max, v_naipe_codigo, v_tipo_codigo,
         v_limite_atletas, v_esporte_nome, v_isento_limite
    FROM equipes e
    JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
    JOIN categorias c          ON c.id  = ev.categoria_id
    JOIN naipes n              ON n.id  = ev.naipe_id
    JOIN tipos_modalidade tm   ON tm.id = ev.tipo_modalidade_id
    JOIN esportes esp          ON esp.id = ev.esporte_id
    WHERE e.id = NEW.equipe_id;

    SELECT
        (EXTRACT(YEAR FROM CURRENT_DATE)::INT - EXTRACT(YEAR FROM est.data_nascimento)::INT),
        est.sexo
    INTO v_estudante_idade, v_estudante_sexo
    FROM estudantes_atletas est
    WHERE est.id = NEW.estudante_id;

    -- Validação 1: Faixa etária da categoria (idade por ano calendário)
    IF v_estudante_idade < v_idade_min OR v_estudante_idade > v_idade_max THEN
        RAISE EXCEPTION 'Estudante com % anos (regra por ano calendário) não pode ser cadastrado na categoria % a % anos',
            v_estudante_idade, v_idade_min, v_idade_max;
    END IF;

    -- Validação 2: Naipe
    -- MISTO (X) aceita alunos de qualquer sexo (M ou F).
    -- Naipes M e F continuam exigindo correspondência exata com o sexo do aluno.
    IF v_naipe_codigo != 'X' AND v_estudante_sexo != v_naipe_codigo THEN
        RAISE EXCEPTION 'Estudante do sexo % não pode ser cadastrado no naipe %',
            CASE v_estudante_sexo WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Feminino' ELSE v_estudante_sexo END,
            CASE v_naipe_codigo  WHEN 'M' THEN 'Masculino' WHEN 'F' THEN 'Feminino' ELSE v_naipe_codigo  END;
    END IF;

    -- Validação 3: 1 modalidade Individual e 1 Coletiva por aluno
    -- Esportes com isento_limite_modalidade = TRUE são ignorados nesta regra.
    IF v_tipo_codigo IN ('INDIVIDUAIS', 'COLETIVAS') AND NOT v_isento_limite THEN
        SELECT COUNT(*)::INT INTO v_ja_participa
        FROM equipe_estudantes ee2
        JOIN equipes e2            ON e2.id  = ee2.equipe_id
        JOIN esporte_variantes ev2 ON ev2.id = e2.esporte_variante_id
        JOIN tipos_modalidade tm2  ON tm2.id = ev2.tipo_modalidade_id
        JOIN esportes esp2         ON esp2.id = ev2.esporte_id
        WHERE ee2.estudante_id = NEW.estudante_id
          AND e2.id != NEW.equipe_id
          AND tm2.codigo = v_tipo_codigo
          AND NOT esp2.isento_limite_modalidade;

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
$function$;
