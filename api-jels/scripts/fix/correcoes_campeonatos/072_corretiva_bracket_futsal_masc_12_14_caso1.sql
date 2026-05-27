-- ================================================================
-- CORREÇÃO 072 — Bracket Futsal Masculino 12-14 (campeonato_id=1)
-- Data: 2026-05-26
--
-- CAUSA RAIZ
-- O bug de SWAP sequencial em avancar_classificados_para_mata_mata
-- corrompeu todos os 12 slots diretos das oitavas de final.
-- O bug: UPDATEs feitos por equipe_id em sequência fazem o passo N
-- sobrescrever o que o passo N-1 acabou de escrever (ex.: {A→B, B→A}
-- resulta em A nos dois slots). Fix de código aplicado em
-- pontuacao_service.py — agora atualiza por partida_id.
--
-- CLASSIFICAÇÕES REAIS DOS GRUPOS
--   A: 1°=734  (CMCB XII),         2°=941  (Bandeira Tribuzzi)
--   B: 1°=1283 (José Raimundo),     2°=947  (Gov. Luiz Rocha)
--   C: 1°=1006 (Vila São José),     2°=1072 (Monteiro Lobato)
--   D: 1°=1108 (Pão da Vida),       2°=1296 (Nadir)
--   E: 1°=1106 (Nova Canaã),        2°=879  (Emmanuel Aroso)
--   F: 1°=1044 (La Roque),          2°=SORTEIO PENDENTE (1175 vs 1127)
--
-- DISTRIBUIÇÃO SNAKE dos slots (6 grupos × 2 diretos + 4 wildcards):
--   SEED_1  = jogo 34 mandante = A 1°
--   SEED_2  = jogo 35 mandante = B 1°
--   SEED_3  = jogo 36 mandante = C 1°
--   SEED_4  = jogo 37 mandante = D 1°
--   SEED_5  = jogo 38 mandante = E 1°
--   SEED_6  = jogo 39 mandante = F 1°
--   SEED_7  = jogo 40 mandante = F 2° (sorteio pendente)
--   SEED_8  = jogo 41 mandante = E 2°
--   SEED_9  = jogo 41 visitante = D 2°
--   SEED_10 = jogo 40 visitante = C 2°
--   SEED_11 = jogo 39 visitante = B 2°
--   SEED_12 = jogo 38 visitante = A 2°
--   SEED_13-16 = jogos 34-37 visitante = wildcards
--
-- O SQL é dividido em duas partes:
--   Parte 1 — corrige os 12 slots diretos (por partida_id)
--   Parte 2 — reseta os 4 wildcards para pendente, para que o
--             endpoint de sorteio do Grupo F recalcule corretamente
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- PARTE 1: Slots diretos
-- ----------------------------------------------------------------

-- SEED_1: jogo 34 mandante → A 1° = 734 (CMCB XII)
-- Estava: 941 (Bandeira) — seed inicial ficou após o SWAP reverter
UPDATE campeonato_partidas SET mandante_equipe_id = 734,  updated_at = NOW() WHERE id = 34;

-- SEED_2: jogo 35 mandante → B 1° = 1283 (José Raimundo)
-- Estava: 941 (Bandeira) — DUPLICATA causada pela cascata de SWAPs
UPDATE campeonato_partidas SET mandante_equipe_id = 1283, updated_at = NOW() WHERE id = 35;

-- SEED_3: jogo 36 mandante → C 1° = 1006 (Vila São José)
-- Estava: 1283 (José Raimundo) — deslocado da posição de B pelo SWAP
UPDATE campeonato_partidas SET mandante_equipe_id = 1006, updated_at = NOW() WHERE id = 36;

-- SEED_4: jogo 37 mandante → D 1° = 1108 (Pão da Vida)
-- Estava: 947 (Gov. Luiz Rocha) — B 2°, completamente errado
UPDATE campeonato_partidas SET mandante_equipe_id = 1108, updated_at = NOW() WHERE id = 37;

-- SEED_5 + SEED_12: jogo 38 mandante (E 1°) e visitante (A 2°) juntos
-- Estava: mandante=1006 (cascata pós-SWAP de E), visitante=NULL (734 perdido no SWAP de A)
UPDATE campeonato_partidas
SET mandante_equipe_id = 1106, visitante_equipe_id = 941, updated_at = NOW()
WHERE id = 38;

-- SEED_6 + SEED_11: jogo 39 mandante (F 1°) e visitante (B 2°) juntos
-- Atualizar separado causaria estado intermediário 1044/1044 (violação de constraint).
-- Estava: mandante=1072 (deslocado por cascata), visitante=1044 (F 1° no lugar errado)
UPDATE campeonato_partidas
SET mandante_equipe_id = 1044, visitante_equipe_id = 947, updated_at = NOW()
WHERE id = 39;

-- SEED_7 + SEED_10: jogo 40 mandante (F 2°) e visitante (C 2°) juntos
-- mandante = NULL ("A Definir") enquanto o sorteio do Grupo F não for registrado.
-- O endpoint de sorteio chamará avancar_classificados_para_mata_mata, que preencherá
-- o slot com o vencedor real assim que o sorteio for confirmado.
-- Estava: mandante=1108 (D 1°, completamente errado), visitante=879 (duplicata de E 2°)
UPDATE campeonato_partidas
SET mandante_equipe_id = NULL, visitante_equipe_id = 1072, updated_at = NOW()
WHERE id = 40;

-- SEED_8 + SEED_9: jogo 41 mandante (E 2°) e visitante (D 2°) juntos
-- Atualizar separado causaria estado intermediário 879/879 (violação de constraint).
-- Estava: mandante=1296 (invertido), visitante=879 (invertido + duplicata)
UPDATE campeonato_partidas
SET mandante_equipe_id = 879, visitante_equipe_id = 1296, updated_at = NOW()
WHERE id = 41;

-- ----------------------------------------------------------------
-- PARTE 2: Reset dos wildcards (jogos 34–37 visitante)
--
-- Wildcards atuais (1127, 861, 1088, 719) foram calculados sobre
-- estado corrompido do bracket. Resetamos para NULL + pendente para
-- que _preencher_wild_cards rode novamente, acionado pelo endpoint
-- de sorteio do Grupo F, e recalcule corretamente.
-- ----------------------------------------------------------------

UPDATE campeonato_partidas
SET visitante_equipe_id  = NULL,
    is_wildcard_pending  = TRUE,
    updated_at           = NOW()
WHERE id IN (34, 35, 36, 37);

COMMIT;
