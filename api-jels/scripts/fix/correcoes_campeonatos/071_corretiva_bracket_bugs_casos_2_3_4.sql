-- =============================================================================
-- MIGRATION 071 — Correção de corrupção de bracket (Casos 2, 3 e 4)
-- Data: 2026-05-26
-- Executar: UMA instrução por vez, conforme autorização explícita.
-- =============================================================================
--
-- CONTEXTO GERAL
-- --------------
-- A função `avancar_classificados_para_mata_mata` (pontuacao_service.py, ~linha 532)
-- resolve os seeds iniciais do bracket (atribuídos na geração) para os times
-- que realmente se classificaram nos grupos. Ela monta um mapeamento
-- {seed_inicial → classificado_real} e executa UPDATEs sequenciais
-- WHERE equipe_id = old_id.
--
-- Esse mecanismo é inseguro quando o mapeamento forma um SWAP ou CADEIA:
--
--   SWAP {A→B, B→A}: o segundo UPDATE encontra o banco já modificado pelo
--   primeiro e desfaz a correção, fazendo ambos os slots apontarem para A.
--
--   CADEIA {A→B, B→C}: o segundo UPDATE acerta o slot recém-escrito pelo
--   primeiro, transformando dois slots distintos num único valor.
--
-- =============================================================================


-- =============================================================================
-- CASO 2 — Beach Soccer MASCULINO 12 a 14 anos (campeonato_id=9)
-- Status: JÁ EXECUTADO DIRETAMENTE NO BANCO EM 2026-05-26
-- =============================================================================
--
-- Semifinais corrompidas após o Grupo A encerrar.
-- Seeds iniciais do Grupo A: seed_1=982 (Benjamin Peixoto), seed_2=836 (Luis Pires).
-- Classificação real invertida:  1°=836 (Luis Pires),  2°=982 (Benjamin Peixoto).
-- Mapeamento gerado: {982→836, 836→982} — SWAP puro.
--
-- Efeito do bug:
--   Step 1 (982→836): jogo 159 mandante: 982→836 ✓
--   Step 2 (836→982): jogo 159 mandante: 836→982 ✗  (colide com step 1)
--                      jogo 160 mandante: 836→982 ✗
-- Resultado: 982 (Benjamin Peixoto) ficou como mandante nos dois jogos de semi;
-- 836 (Luis Pires) desapareceu do bracket.
--
-- Correção: restaurar Luis Pires (836) como mandante do jogo 159.
-- Jogo 160 (mandante=982, visitante=1266) já estava correto após o bug.

UPDATE campeonato_partidas SET mandante_equipe_id = 836, updated_at = NOW() WHERE id = 159;
-- ^ JÁ EXECUTADO — mantido aqui apenas para documentação.


-- =============================================================================
-- CASO 3 — Beach Soccer MASCULINO 15 a 17 anos (campeonato_id=11)
-- =============================================================================
--
-- Quartas de final corrompidas por mismatch entre a configuração usada na
-- geração do bracket e a configuração editada manualmente depois.
--
-- O campeonato tem 14 equipes, distribuídas em grupos A e B (4 times cada)
-- e C e D (3 times cada). A fórmula WILDCARD gerou vagas_wildcard=2 e
-- classificados_por_grupo=[2,2,1,1]. O bracket foi gerado com:
--   SEED_1..4 = 1°s e 2°s dos grupos A e B (participantes diretos)
--   SEED_5    = 1° do Grupo C (730 – CEVS)        → jogo 184 visitante
--   SEED_6    = 1° do Grupo D (750)               → jogo 183 visitante
--   SEED_7    = NULL (wildcard pendente)           → jogo 182 visitante
--   SEED_8    = NULL (wildcard pendente)           → jogo 181 visitante
--
-- Após a geração, campos foram alterados manualmente no banco:
--   campeonato_grupos.classificados_diretos → 2 (para grupos C e D)
--   campeonatos.vagas_wildcard              → 0
--
-- Efeitos: wildcards nunca preenchidos (jogos 181 e 182 ficaram com visitante=NULL).
-- Quando o Grupo D encerrou, a função leu classificados_diretos=2 e montou
-- seeds_no_bracket=[750, 838], real=[786, 838], mapeamento={750→786}.
-- O UPDATE encontrou 750 no jogo 183 (não no 182) e colocou Machadinho (786)
-- no lugar errado.
--
-- Classificação correta dos grupos:
--   Grupo A: 1°=Dr. Luiz Sérgio (999),     2°=Tiradentes VI (906)
--   Grupo B: 1°=Robson Campos (1019),       2°=Prof.ª Conceição Costa (1040)
--   Grupo C: 1°=CEVS (730),                 2°=Benjamin Peixoto (980)
--   Grupo D: 1°=Machadinho (786),            2°=Luis Pires (838)
--
-- Bracket correto:
--   Jogo 181 (SEED_1 vs SEED_8): 999  vs 838  — visitante NULL → 838
--   Jogo 182 (SEED_2 vs SEED_7): 906  vs 786  — visitante NULL → 786
--   Jogo 183 (SEED_3 vs SEED_6): 1019 vs 980  — visitante 786  → 980
--   Jogo 184 (SEED_4 vs SEED_5): 1040 vs 730  ✅ já correto

UPDATE campeonato_partidas SET visitante_equipe_id = 838, updated_at = NOW() WHERE id = 181;
-- ^ JÁ EXECUTADO em 2026-05-27 — mantido aqui apenas para documentação.

UPDATE campeonato_partidas SET visitante_equipe_id = 786, updated_at = NOW() WHERE id = 182;
-- ^ JÁ EXECUTADO em 2026-05-27 — mantido aqui apenas para documentação.

UPDATE campeonato_partidas SET visitante_equipe_id = 980, updated_at = NOW() WHERE id = 183;
-- ^ JÁ EXECUTADO em 2026-05-27 — mantido aqui apenas para documentação.


-- =============================================================================
-- CASO 4 — Voleibol MASCULINO 12 a 14 anos (campeonato_id=5)
-- =============================================================================
--
-- Final corrompida. Formato UNICO, grupo único (grupo_id=19), 3 times,
-- classificados_diretos=2.
--
-- Seeds iniciais (seed_no_grupo):
--   seed_1 = 1282 (Monteiro Lobato) → mandante do jogo 130
--   seed_2 = 713  (CEFRAN)          → visitante do jogo 130
--   seed_3 = 1276 (Bandeira Tribuzzi) → fora do bracket (3° seed, não classifica diretamente)
--
-- Classificação real após todos os jogos do grupo:
--   1° = CEFRAN (713):           2 vitórias, SG +4
--   2° = Bandeira Tribuzzi (1276): 1 vitória,  SG  0
--   3° = Monteiro Lobato (1282):   0 vitórias, SG -4
--
-- Mapeamento gerado: {1282→713, 713→1276} — CADEIA.
-- O bug produziria mandante=1276, visitante=1276 (Bandeira vs Bandeira).
-- Evidência de que a transação foi revertida (ROLLBACK): updated_at do jogo 130
-- permanece em 2026-05-16, anterior ao registro de qualquer jogo do grupo.
-- O bracket nunca foi corrigido; continua com os seeds originais da geração.
--
-- Bracket correto:
--   Final (jogo 130): CEFRAN (713) vs Bandeira Tribuzzi (1276)

UPDATE campeonato_partidas SET mandante_equipe_id = 713, visitante_equipe_id = 1276, updated_at = NOW() WHERE id = 130;
-- ^ JÁ EXECUTADO em 2026-05-27 — mantido aqui apenas para documentação.
