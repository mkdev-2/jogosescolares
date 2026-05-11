 -- ================================================================
  -- JELS 2026 — Configurações de pontuação e critérios de desempate
  -- Edição ID: 1 (2026)
  --
  -- Esportes configurados:
  --   Vôlei + Volei de Praia   → regras do Voleibol
  --   Futsal + Futebol de Campo → regras do Futsal
  --   Handebol                  → regras próprias (ignorar prorrogação)
  --   Basquete                  → regras próprias
  --
  -- É seguro re-executar: usa ON CONFLICT ... DO UPDATE (upsert)
  -- ================================================================

  INSERT INTO esporte_config_pontuacao (
      esporte_id,
      edicao_id,
      unidade_placar,
      unidade_placar_sec,
      pts_vitoria,
      pts_vitoria_parcial,
      pts_empate,
      pts_derrota,
      permite_empate,
      wxo_pts_vencedor,
      wxo_pts_perdedor,
      wxo_placar_pro,
      wxo_placar_contra,
      wxo_placar_pro_sec,
      wxo_placar_contra_sec,
      ignorar_placar_extra,
      criterios_desempate_2,
      criterios_desempate_3plus
  )
  VALUES

  -- ----------------------------------------------------------------
  -- VÔLEI
  -- vitória 2x0 = 3 pts | vitória 2x1 = 2 pts (perdedor leva 1 pt)
  -- WxO = 3 pts, placar registrado: 2x0 sets / 50x0 pontos totais
  -- Desempate 2: confronto direto
  -- Desempate 3+: vitórias → sets avg direto → pts avg direto →
  --               sets avg geral → pts avg geral → sorteio
  -- ----------------------------------------------------------------
  (
      '99109e26-ae65-458a-aa06-a5d57afccc7a', -- Vôlei
      1,
      'SETS', 'PONTOS',
      3,   -- pts_vitoria (2x0)
      2,   -- pts_vitoria_parcial (2x1, vencedor)
      0,   -- pts_empate (sem empate no vôlei)
      1,   -- pts_derrota (derrota 2x1 vale 1 pt)
      FALSE,
      3, 0, -- wxo pts vencedor / perdedor
      2, 0, -- wxo placar sets pro / contra
      50, 0, -- wxo placar pontos totais pro / contra (25x0 + 25x0)
      FALSE,
      '["CONFRONTO_DIRETO"]',
      '["MAIOR_VITORIAS","AVERAGE_DIRETO","AVERAGE_SEC_DIRETO","AVERAGE_GERAL","AVERAGE_SEC_GERAL","SORTEIO"]'
  ),

  -- ----------------------------------------------------------------
  -- VOLEI DE PRAIA (mesmas regras do Voleibol)
  -- ----------------------------------------------------------------
  (
      '4e45bb9e-5ade-4f7a-92d6-102486f15182', -- Volei de Praia
      1,
      'SETS', 'PONTOS',
      3, 2, 0, 1, FALSE,
      3, 0, 2, 0, 50, 0,
      FALSE,
      '["CONFRONTO_DIRETO"]',
      '["MAIOR_VITORIAS","AVERAGE_DIRETO","AVERAGE_SEC_DIRETO","AVERAGE_GERAL","AVERAGE_SEC_GERAL","SORTEIO"]'
  ),

  -- ----------------------------------------------------------------
  -- BASQUETE
  -- vitória = 2 pts | derrota = 1 pt (sem empate)
  -- WxO: vencedor 2 pts + 20 cestas a favor; perdedor 0 pts + 20 contra
  -- Desempate 2: confronto direto
  -- Desempate 3+: vitórias → cestas avg direto → saldo direto →
  --               menor cestas contra geral → sorteio
  -- ----------------------------------------------------------------
  (
      'd1dd4ec6-cd1f-4594-877e-e00c1e72eb1c', -- Basquete
      1,
      'CESTAS', NULL,
      2,   -- pts_vitoria
      NULL, -- sem pts parcial
      0,   -- pts_empate (sem empate)
      1,   -- pts_derrota
      FALSE,
      2, 0,   -- wxo pts vencedor / perdedor (derrota WxO = 0, diferente da derrota normal)
      20, 0,  -- wxo placar cestas pro / contra
      NULL, NULL,
      FALSE,
      '["CONFRONTO_DIRETO"]',
      '["MAIOR_VITORIAS","AVERAGE_DIRETO","SALDO_DIRETO","MENOR_CONTRA_GERAL","SORTEIO"]'
  ),

  -- ----------------------------------------------------------------
  -- FUTSAL
  -- vitória = 3 pts | empate = 1 pt | derrota = 0
  -- WxO: vencedor 3 pts + 1 gol a favor; perdedor 0 pts + 1 contra
  -- Desempate 2: confronto direto → gols avg geral → saldo geral →
  --              menor gols contra → maior gols pró → sorteio
  -- Desempate 3+: vitórias → avg direto → saldo direto →
  --               menor contra → maior pró → sorteio
  -- ----------------------------------------------------------------
  (
      '1e910b2f-dfe8-4aeb-8f02-64458eee7b51', -- Futsal
      1,
      'GOLS', NULL,
      3, NULL, 1, 0, TRUE,
      3, 0, 1, 0, NULL, NULL,
      FALSE,
      '["CONFRONTO_DIRETO","AVERAGE_GERAL","SALDO_GERAL","MENOR_CONTRA_GERAL","MAIOR_PRO_GERAL","SORTEIO"]',
      '["MAIOR_VITORIAS","AVERAGE_DIRETO","SALDO_DIRETO","MENOR_CONTRA_GERAL","MAIOR_PRO_GERAL","SORTEIO"]'
  ),

  -- ----------------------------------------------------------------
  -- FUTEBOL DE CAMPO (mesmas regras do Futsal)
  -- ----------------------------------------------------------------
  (
      '7a824f02-86a0-4a57-a760-4ba564d78fe3', -- Futebol de Campo
      1,
      'GOLS', NULL,
      3, NULL, 1, 0, TRUE,
      3, 0, 1, 0, NULL, NULL,
      FALSE,
      '["CONFRONTO_DIRETO","AVERAGE_GERAL","SALDO_GERAL","MENOR_CONTRA_GERAL","MAIOR_PRO_GERAL","SORTEIO"]',
      '["MAIOR_VITORIAS","AVERAGE_DIRETO","SALDO_DIRETO","MENOR_CONTRA_GERAL","MAIOR_PRO_GERAL","SORTEIO"]'
  ),

  -- ----------------------------------------------------------------
  -- HANDEBOL
  -- vitória = 3 pts | empate = 2 pts | derrota = 1 pt
  -- WxO: vencedor 3 pts + 1 gol a favor; perdedor 0 pts + 1 contra
  -- ignorar_placar_extra = TRUE (gols na prorrogação não contam)
  -- Critérios idênticos ao Futsal
  -- ----------------------------------------------------------------
  (
      'a5533add-f245-450f-bd48-dfb774cb019c', -- Handebol
      1,
      'GOLS', NULL,
      3, NULL, 2, 1, TRUE,
      3, 0, 1, 0, NULL, NULL,
      TRUE, -- gols de prorrogação NÃO são computados
      '["CONFRONTO_DIRETO","AVERAGE_GERAL","SALDO_GERAL","MENOR_CONTRA_GERAL","MAIOR_PRO_GERAL","SORTEIO"]',
      '["MAIOR_VITORIAS","AVERAGE_DIRETO","SALDO_DIRETO","MENOR_CONTRA_GERAL","MAIOR_PRO_GERAL","SORTEIO"]'
  )

  ON CONFLICT (esporte_id, edicao_id) DO UPDATE SET
      unidade_placar          = EXCLUDED.unidade_placar,
      unidade_placar_sec      = EXCLUDED.unidade_placar_sec,
      pts_vitoria             = EXCLUDED.pts_vitoria,
      pts_vitoria_parcial     = EXCLUDED.pts_vitoria_parcial,
      pts_empate              = EXCLUDED.pts_empate,
      pts_derrota             = EXCLUDED.pts_derrota,
      permite_empate          = EXCLUDED.permite_empate,
      wxo_pts_vencedor        = EXCLUDED.wxo_pts_vencedor,
      wxo_pts_perdedor        = EXCLUDED.wxo_pts_perdedor,
      wxo_placar_pro          = EXCLUDED.wxo_placar_pro,
      wxo_placar_contra       = EXCLUDED.wxo_placar_contra,
      wxo_placar_pro_sec      = EXCLUDED.wxo_placar_pro_sec,
      wxo_placar_contra_sec   = EXCLUDED.wxo_placar_contra_sec,
      ignorar_placar_extra    = EXCLUDED.ignorar_placar_extra,
      criterios_desempate_2   = EXCLUDED.criterios_desempate_2,
      criterios_desempate_3plus = EXCLUDED.criterios_desempate_3plus,
      updated_at              = CURRENT_TIMESTAMP;