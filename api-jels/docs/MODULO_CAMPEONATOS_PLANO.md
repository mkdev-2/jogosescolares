# Módulo de Campeonatos — Plano de Implementação

> **Branch:** `feat/camps`
> **Última atualização:** 2026-04-16

---

## Visão geral

O módulo de campeonatos é dividido em duas fases:

| Fase | Escopo | Status |
|---|---|---|
| **Fase 1 — Sorteio manual** | Criação de campeonato com drag-and-drop de grupos | ✅ Implementado |
| **Fase 2 — Pontuação e desempate** | Registro de resultados, classificação genérica por esporte | 🔧 Parcialmente implementado (infra pronta, serviço de classificação pendente) |

---

## Fase 1 — Fluxo de criação com sorteio manual

### Motivação

Os gestores realizam o sorteio de grupos presencialmente (em reunião ao vivo). O sistema precisa registrar o resultado do sorteio, não fazer a distribuição automaticamente. O escopo é restrito a modalidades **COLETIVAS**.

### Fluxo do usuário

1. Na listagem de campeonatos, clicar em **"Criar Campeonato"** → navega para `/app/criar-campeonato`
2. Selecionar edição (opcional) e modalidade COLETIVA disponível
3. Clicar em **"Buscar equipes"** → abre modal com todas as equipes da variante
4. No modal: desmarcar equipes que não participarão (mínimo 6 para continuar)
5. Clicar em **"Confirmar e sortear"** → tela de drag-and-drop
6. Arrastar cada equipe do pool para um slot de grupo
7. Quando o pool estiver vazio → **"Salvar Campeonato"** habilita
8. Salvar → chamada atômica à API → redireciona para listagem

### Arquivos implementados

| Arquivo | O que foi feito |
|---|---|
| `api-jels/app/campeonatos.py` | `GET /equipes-da-variante` + `POST /criar-com-sorteio` |
| `api-jels/app/services/chaveamentos_service.py` | `gerar_partidas_para_grupos_existentes()` |
| `api-jels/app/schemas.py` | `EquipeDaVarianteResponse`, `GrupoSorteioInput`, `CampeonatoComSorteioCreate` |
| `web/src/pages/CriarCampeonato.jsx` | Página completa: seleção → modal → sorteio DnD |
| `web/src/pages/Campeonatos.jsx` | Formulário inline removido; botão "Criar Campeonato" navega para a nova rota |
| `web/src/services/campeonatosService.js` | `getEquipesDaVariante()`, `criarComSorteio()` |
| `web/src/App.jsx` | Rota `/app/criar-campeonato` em `AdminRoute` |
| `web/package.json` | `@dnd-kit/core ^6.3.1`, `@dnd-kit/utilities ^3.2.2` |

### Regras de negócio

- Só aparecem variantes COLETIVAS sem campeonato existente para aquela edição
- Mínimo de 6 equipes confirmadas
- Distribuição em grupos de 3 ou 4: `numGrupos = ceil(N/4)`; grupos extras de 4 são preenchidos do primeiro ao último
- A mesma equipe não pode estar em dois grupos
- Após salvar: campeonato criado com status `GERADO` (round-robin de grupos + bracket de mata-mata gerados atomicamente)
- Nome do campeonato é auto-gerado: `"{esporte} – {naipe} – {categoria}"`

### Endpoint: `GET /api/campeonatos/equipes-da-variante`

```
Query params:
  esporte_variante_id: str  (obrigatório)
  edicao_id: int            (opcional — usa edição ativa se omitido)
Auth: ADMIN
```

Retorna lista de `{ id, escola_id, nome_escola }` ordenada por nome da escola.
Valida que a variante é do tipo COLETIVAS.

### Endpoint: `POST /api/campeonatos/criar-com-sorteio`

```json
{
  "esporte_variante_id": "uuid",
  "edicao_id": 1,
  "grupos": [
    { "equipes": [10, 5, 22] },
    { "equipes": [8, 17, 3] },
    { "equipes": [12, 6, 19, 1] }
  ]
}
```

Executa em uma única transação:
1. Valida variante COLETIVAS + existência na edição
2. Verifica que não existe campeonato duplicado para variante+edição
3. Valida que todos os `equipe_ids` pertencem à variante+edição
4. Valida mínimo de 6 equipes e sem duplicatas entre grupos
5. Cria `campeonatos` (status `RASCUNHO`, autorização preenchida com o usuário atual)
6. Cria `campeonato_grupos` (A, B, C...)
7. Cria `campeonato_grupo_equipes` (seed_no_grupo = índice + 1)
8. Chama `gerar_partidas_para_grupos_existentes()` → gera round-robin + mata-mata, atualiza status para `GERADO`

### Função de serviço: `gerar_partidas_para_grupos_existentes`

```python
# api-jels/app/services/chaveamentos_service.py

async def gerar_partidas_para_grupos_existentes(
    conn: psycopg.AsyncConnection,
    campeonato_id: int,
    executor_user_id: int,
) -> dict
```

**Não gerencia transação própria** — deve ser chamada dentro de uma transação já aberta pelo chamador.

Fluxo:
1. Lê grupos de `campeonato_grupos` ordenados por `ordem`
2. Para cada grupo lê equipes de `campeonato_grupo_equipes` ordenadas por `seed_no_grupo`
3. Gera confrontos round-robin (reutiliza `_gerar_confrontos_round_robin`)
4. Determina classificados: top `classificam_por_grupo` de cada grupo por seed
5. Gera bracket mata-mata com BYEs se necessário (reutiliza `_proxima_potencia_2`, `_gerar_bracket_slots`, `_fase_por_tamanho_chave`)
6. Limita a 52 classificados para o mata-mata
7. Atualiza `campeonatos.status = 'GERADO'` e `geracao_executada_em/por`

### DnD: decisões de implementação

- **Sem `DragOverlay`** — o transform é aplicado diretamente no elemento, fazendo o card seguir o cursor de onde foi pego
- Drag de slot → slot: swap entre os dois slots
- Drag de slot → pool: devolve equipe ao pool
- Drag de pool → slot: se slot vazio, preenche; se ocupado, troca e devolve o anterior ao pool
- Botão ✕ no canto do slot e **clique com botão direito** no card devolvem ao pool

---

## Fase 2 — Sistema genérico de pontuação e desempate

### Motivação

Cada esporte tem regras próprias de pontuação, unidade de placar e critérios de desempate. Como o sistema suporta modalidades arbitrárias a cada edição, essas regras são configuradas por dados, não por código.

### Diferenças entre os 4 esportes desta edição

| Esporte | Pts vitória | Pts empate | Pts derrota | Permite empate | Unidade placar | WxO placar | Obs. |
|---|---|---|---|---|---|---|---|
| Vôlei | 3 (2x0) / 2 (2x1) | — | 0 / 1 | Não | SETS + PONTOS (2 níveis) | 2 sets × 25-0 | Pontos dentro dos sets entram no desempate |
| Basquete | 2 | — | 1 | Não | CESTAS | 20×0 | WxO perdedor leva 0 pts (≠ derrota normal = 1 pt) |
| Futsal | 3 | 1 | 0 | Sim | GOLS | 1×0 | — |
| Handebol | 3 | 2 | 1 | Sim | GOLS | 1×0 | Gols de prorrogação **não** contam para média/saldo |

### Tabela: `esporte_config_pontuacao`

Vinculada a `esportes` (não a `esporte_variantes` — variantes do mesmo esporte compartilham regras).

```sql
CREATE TABLE esporte_config_pontuacao (
    id            SERIAL PRIMARY KEY,
    esporte_id    UUID    NOT NULL REFERENCES esportes(id) ON DELETE CASCADE,
    edicao_id     INTEGER NOT NULL REFERENCES edicoes(id)  ON DELETE RESTRICT,

    unidade_placar       VARCHAR(20) NOT NULL DEFAULT 'GOLS',
    unidade_placar_sec   VARCHAR(20) NULL,        -- vôlei: 'PONTOS' (dentro dos sets)

    pts_vitoria          INTEGER NOT NULL DEFAULT 3,
    pts_vitoria_parcial  INTEGER NULL,            -- vôlei: 2 pts quando 2x1
    pts_empate           INTEGER NOT NULL DEFAULT 1,
    pts_derrota          INTEGER NOT NULL DEFAULT 0,
    permite_empate       BOOLEAN NOT NULL DEFAULT FALSE,

    wxo_pts_vencedor     INTEGER NOT NULL DEFAULT 3,
    wxo_pts_perdedor     INTEGER NOT NULL DEFAULT 0,
    wxo_placar_pro       INTEGER NOT NULL DEFAULT 1,
    wxo_placar_contra    INTEGER NOT NULL DEFAULT 0,
    wxo_placar_pro_sec   INTEGER NULL,            -- vôlei: 50 pontos
    wxo_placar_contra_sec INTEGER NULL,

    ignorar_placar_extra BOOLEAN NOT NULL DEFAULT FALSE,  -- handebol: TRUE

    criterios_desempate_2     JSONB NOT NULL DEFAULT '[]',
    criterios_desempate_3plus JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT uq_esporte_config_pontuacao UNIQUE (esporte_id, edicao_id)
);
```

Migration: `api-jels/migrations/044_esporte_config_pontuacao.sql`

### Colunas adicionadas em `campeonato_partidas`

```sql
ALTER TABLE campeonato_partidas
    ADD COLUMN placar_mandante      INTEGER NULL,
    ADD COLUMN placar_visitante     INTEGER NULL,
    ADD COLUMN placar_mandante_sec  INTEGER NULL,   -- vôlei: pontos totais
    ADD COLUMN placar_visitante_sec INTEGER NULL,
    ADD COLUMN resultado_tipo       VARCHAR(20) NULL,  -- NORMAL | WXO | ADIADA | CANCELADA
    ADD COLUMN registrado_em        TIMESTAMP NULL,
    ADD COLUMN registrado_por       INTEGER NULL REFERENCES users(id) ON DELETE SET NULL;
```

Migration: `api-jels/migrations/045_campeonato_partidas_placar.sql`

### Códigos de critério de desempate (JSONB)

| Código | Descrição |
|---|---|
| `CONFRONTO_DIRETO` | Resultado do confronto direto entre as equipes empatadas |
| `MAIOR_VITORIAS` | Maior número de vitórias |
| `AVERAGE_DIRETO` | Quociente pro/contra (unidade primária) nos jogos entre empatadas |
| `AVERAGE_SEC_DIRETO` | Quociente pro/contra (unidade secundária) nos jogos entre empatadas |
| `SALDO_DIRETO` | Saldo (pro − contra) nos jogos entre empatadas |
| `AVERAGE_GERAL` | Quociente pro/contra (unidade primária) em todos os jogos da fase |
| `AVERAGE_SEC_GERAL` | Quociente pro/contra (unidade secundária) em todos os jogos |
| `SALDO_GERAL` | Saldo em todos os jogos da fase |
| `MENOR_CONTRA_GERAL` | Menor placar sofrido no geral |
| `MAIOR_PRO_GERAL` | Maior placar marcado no geral |
| `SORTEIO` | Terminal — nunca haverá critério após este |

**Configuração dos 4 esportes desta edição:**

```
Vôlei (entre 2):    ["CONFRONTO_DIRETO"]
Vôlei (entre 3+):   ["MAIOR_VITORIAS","AVERAGE_DIRETO","AVERAGE_SEC_DIRETO","AVERAGE_GERAL","AVERAGE_SEC_GERAL","SORTEIO"]

Basquete (entre 2): ["CONFRONTO_DIRETO"]
Basquete (entre 3+):["MAIOR_VITORIAS","AVERAGE_DIRETO","SALDO_DIRETO","MENOR_CONTRA_GERAL","SORTEIO"]

Futsal (entre 2):   ["CONFRONTO_DIRETO","AVERAGE_GERAL","SALDO_GERAL","MENOR_CONTRA_GERAL","MAIOR_PRO_GERAL","SORTEIO"]
Futsal (entre 3+):  ["MAIOR_VITORIAS","AVERAGE_DIRETO","SALDO_DIRETO","MENOR_CONTRA_GERAL","MAIOR_PRO_GERAL","SORTEIO"]

Handebol: igual ao Futsal (com ignorar_placar_extra = TRUE)
```

### Endpoints implementados (infra)

```
GET  /api/campeonatos/{id}/config-pontuacao
PATCH /api/campeonatos/{id}/partidas/{partida_id}/resultado
```

O `PATCH` de resultado:
- Determina `vencedor_equipe_id` automaticamente a partir do placar
- Para WxO: mandante é marcado como vencedor
- Para empate: `vencedor_equipe_id = NULL`
- Preenche `registrado_em` e `registrado_por`

### Pendente (Fase 2)

| Tarefa | Arquivo | Notas |
|---|---|---|
| Serviço de classificação | `api-jels/app/services/pontuacao_service.py` | Calcular pontos dinamicamente + aplicar critérios de desempate |
| Seed das configs | `api-jels/scripts/seed_config_pontuacao.py` | Inserir configs das 4 modalidades no banco |
| Endpoint de classificação de grupo | `api-jels/app/campeonatos.py` | `GET /{id}/grupos/{grupo_id}/classificacao` |
| Progressão no mata-mata | `api-jels/app/campeonatos.py` | Ao registrar resultado de fase eliminatória, avançar vencedor para próxima partida |
| UI de registro de resultado | `web/src/pages/` | Tela/modal para árbitros lançarem placares |
| UI de tabela de classificação | `web/src/pages/` | Exibir pontos, saldo, average por grupo |

---

## Checklist de verificação

### Fase 1 — Sorteio

- [ ] Acessar `/app/criar-campeonato` como admin
- [ ] Selecionar modalidade COLETIVA e buscar equipes
- [ ] Desmarcar equipes no modal (< 6 deve bloquear o botão)
- [ ] Arrastar todas as equipes para grupos — "Salvar" só habilita com pool vazio
- [ ] Testar X e clique direito para devolver ao pool
- [ ] Salvar e conferir no banco: `campeonatos` (GERADO), `campeonato_grupos`, `campeonato_grupo_equipes`, `campeonato_partidas`
- [ ] Tentar criar segundo campeonato para mesma variante — deve retornar 409

### Fase 2 — Pontuação

- [ ] Rodar migrations 044 e 045
- [ ] Rodar seed das 4 configs de esporte
- [ ] `GET /api/campeonatos/{id}/config-pontuacao` retorna config correta
- [ ] `PATCH /partidas/{id}/resultado` preenche vencedor e placar corretamente
- [ ] Vôlei 2x1: vencedor recebe `pts_vitoria_parcial` (2), perdedor `pts_derrota` (1)
- [ ] Basquete WxO: perdedor recebe 0 pts (não 1)
- [ ] Handebol: prorrogação não entra no saldo/average
