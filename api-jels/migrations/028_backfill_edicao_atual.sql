-- Migration 028: Backfill da edição ativa e dados legados de competição.

DO $$
DECLARE
    v_ano_atual INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    v_edicao_id INTEGER;
BEGIN
    -- Cria edição do ano atual como ativa se ainda não existir.
    INSERT INTO edicoes (nome, ano, status, data_inicio, data_fim)
    VALUES (
        'Edição ' || v_ano_atual::TEXT,
        v_ano_atual,
        'ATIVA',
        make_date(v_ano_atual, 1, 1),
        make_date(v_ano_atual, 12, 31)
    )
    ON CONFLICT (ano) DO NOTHING;

    -- Se já existia edição do ano atual com outro status, força ATIVA para garantir fallback funcional.
    UPDATE edicoes
    SET status = 'ATIVA'
    WHERE ano = v_ano_atual
      AND status <> 'ATIVA';

    SELECT id INTO v_edicao_id
    FROM edicoes
    WHERE status = 'ATIVA'
    ORDER BY ano DESC, id DESC
    LIMIT 1;

    IF v_edicao_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível resolver a edição ativa para backfill.';
    END IF;

    -- Backfill das equipes existentes para edição ativa.
    UPDATE equipes
    SET edicao_id = v_edicao_id
    WHERE edicao_id IS NULL;

    -- Migra modalidades legadas da escola para o vínculo escola+edição.
    INSERT INTO escola_edicao_modalidades (escola_id, edicao_id, modalidades_adesao)
    SELECT e.id, v_edicao_id, COALESCE(e.modalidades_adesao, '{"variante_ids":[]}'::jsonb)
    FROM escolas e
    ON CONFLICT (escola_id, edicao_id) DO UPDATE
    SET modalidades_adesao = EXCLUDED.modalidades_adesao,
        updated_at = CURRENT_TIMESTAMP;
END$$;

ALTER TABLE equipes
    ALTER COLUMN edicao_id SET NOT NULL;
