-- Corretiva: adiciona CENTRO EDUCA MAIS PIRES COLLINS ao Grupo B do
-- campeonato Futsal – FEMININO – 15 a 17 anos (campeonato id=2).
-- A equipe (id=1320) já existia na edição/esporte mas nunca foi alocada a um grupo.

BEGIN;

-- 1. Alocar Pires Collins no Grupo B como seed 4
INSERT INTO campeonato_grupo_equipes (grupo_id, equipe_id, seed_no_grupo)
VALUES (8, 1320, 4);

-- 2. Criar os 3 confrontos de grupo pendentes (Pires Collins vs cada equipe do Grupo B)
INSERT INTO campeonato_partidas
  (campeonato_id, fase, rodada, grupo_id, mandante_equipe_id, visitante_equipe_id,
   is_bye, is_wildcard_pending, mandante_is_wildcard, visitante_is_wildcard)
VALUES
  -- CENTRO EDUCA MAIS DR. LUIZ SERGIO CABRAL BARRETO vs Pires Collins
  (2, 'GRUPOS', 4, 8, 1002, 1320, false, false, false, false),
  -- INSTITUTO DE EDUCAÇÃO IEMA PLENO DE PAÇO DO LUMIAR vs Pires Collins
  (2, 'GRUPOS', 5, 8,  820, 1320, false, false, false, false),
  -- C.E PROFESSOR ROBSON CAMPOS MARTINS vs Pires Collins
  (2, 'GRUPOS', 6, 8, 1032, 1320, false, false, false, false);

-- 3. Grupo B agora tem 4 equipes: SEED_4 passa a ser classificado direto, não wildcard
UPDATE campeonatos
SET vagas_wildcard = 0, updated_at = NOW()
WHERE id = 2;

-- 4. Semi 1 (id=58) deixa de aguardar resolução de wildcard
UPDATE campeonato_partidas
SET is_wildcard_pending = false
WHERE id = 58;

COMMIT;
