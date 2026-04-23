# Implemente a lógica de geração de grupos para a fase de grupos de um campeonato, seguindo as regras abaixo:

## Contexto geral

- O sistema recebe um número N de equipes inscritas
- Se N = 1, campeão automaticamente
- Se N = 2 ou 4, chave direta simples (final e semifinal)
- Se N = 3 ou 5, gerar grupo único com todos-contra-todos simples, onde o primeiro e segundo lugar da fase de pontos disputam diretamente uma final. O restante das posições fica decidida pela pontuação na tabela ou critérios de desempate da modalidade.
- Para N ≥ 6, gerar grupos e classificar equipes para um chaveamento de 4 ou 8 vagas, segundo as regras a seguir.

## Pontuação dentro dos grupos
Definidas em cada modalidade.

## Geração dos grupos
Os grupos devem ser compostos de 3 ou 4 equipes. A distribuição deve priorizar atingir exatamente 4 ou 8 classificados ao fim da fase, seguindo esta lógica em ordem de prioridade:

- Regra padrão: encontrar valores de g3 (grupos de 3) e g4 (grupos de 4), ambos inteiros não-negativos, que satisfaçam simultaneamente:
  `3·g3 + 4·g4 = N`
  `1·g3 + 2·g4 = 4` ou `1·g3 + 2·g4 = 8`
  Nesse caso, cada grupo de 3 classifica 1 equipe e cada grupo de 4 classifica 2

- Regra de igualdade: se N for divisível por 3 e todos os grupos forem de tamanho 3, classificar 2 equipes por grupo — aplicável apenas quando o total de classificados resultar em exatamente 4 ou 8. Na faixa esperada (6–30), isso ocorre em N=6 e N=12.

- Wild card: se nenhuma das regras anteriores fechar exatamente 4 ou 8 classificados diretos, aplicar a melhor decomposição possível em grupos de 3 e 4, classificar diretamente o máximo possível, e preencher as vagas restantes com wild cards — utilizando os seguintes critérios:
  - 

Faixa de N esperada: 6 a 30 equipes.