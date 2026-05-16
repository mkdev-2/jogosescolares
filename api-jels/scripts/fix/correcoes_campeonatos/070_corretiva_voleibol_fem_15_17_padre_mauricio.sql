-- Corretiva: adiciona ESCOLA MUNICIPAL PADRE MAURICIO ao Grupo B do
-- campeonato Voleibol – FEMININO – 15 a 17 anos (campeonato id=6).
-- A equipe (id=1354) já existia na edição/esporte mas nunca foi alocada a um grupo.
-- Nenhuma partida do Grupo B tinha resultado no momento desta correção.

BEGIN;

-- 1. Alocar Padre Mauricio no Grupo B como seed 4
INSERT INTO campeonato_grupo_equipes (grupo_id, equipe_id, seed_no_grupo)
VALUES (21, 1354, 4);

-- 2. Criar os 3 confrontos de grupo pendentes (Padre Mauricio vs cada equipe do Grupo B)
INSERT INTO campeonato_partidas
  (campeonato_id, fase, rodada, grupo_id, mandante_equipe_id, visitante_equipe_id,
   is_bye, is_wildcard_pending, mandante_is_wildcard, visitante_is_wildcard)
VALUES
  -- CENTRO EDUCA MAIS DOMINGOS VIEIRA FILHO vs Padre Mauricio
  (6, 'GRUPOS', 4, 21, 1312, 1354, false, false, false, false),
  -- CENTRO EDUCA MAIS PIRES COLLINS vs Padre Mauricio
  (6, 'GRUPOS', 5, 21, 1311, 1354, false, false, false, false),
  -- Escola Municipal CEFRAN vs Padre Mauricio
  (6, 'GRUPOS', 6, 21,  715, 1354, false, false, false, false);

-- Sem ajuste em vagas_wildcard (já é 0) nem nas semis:
-- Grupo B continua classificando 2 diretos, estrutura eliminatória inalterada.

COMMIT;
