# Scripts de Seed do Projeto

Scripts modulares para popular o banco de dados. Execute na ordem indicada.

Requer **migrations aplicadas** (incluindo edições, `edicao_id` em esportes/variantes/equipes)

## Ordem de execução

0. **seed_esportes_modalidades.py** (primeiro) – ~10 esportes base na edição **ATIVA**; variantes = categorias × naipes × **um** tipo coerente com `limite_atletas` (1 → individual, mais de 1 → coletivo). Idempotente.
1. **seed_escolas.py** – escolas, diretores, coordenadores, solicitações; em seguida **catálogo JELS** (esportes + variantes por limite × cat × naipe) e **adesão** (`escola_edicao_modalidades` com todas as variantes) para facilitar testes locais.
2. **seed_professores_estudantes.py** – professores técnicos e estudantes-atletas
3. **seed_equipes.py** – equipes e vínculos na **edição ativa** (por padrão, todas as variantes IND+COL; pode demorar)

## 0. seed_esportes_modalidades.py

Popula esportes e o produto cartesiano completo de variantes na edição ativa.

```bash
python scripts/seed_esportes_modalidades.py
```

Requer migrations **015** (categorias, naipes, tipos_modalidade) e **027/028** (edição com status `ATIVA`). Requer também **031** para `edicao_id` em `esportes` / `esporte_variantes` e o `ON CONFLICT` das variantes.

## 1. seed_escolas.py

Cria escolas, diretores e coordenadores.

```bash
python scripts/seed_escolas.py [--escolas N] [--coordenadores M]
```

| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| `--escolas` | 5 | Quantidade de escolas |
| `--coordenadores` | 0 | Quantidade de escolas que terão coordenador |

## 2. seed_professores_estudantes.py

Cria professores técnicos e estudantes-atletas. **Requer escolas existentes.**

```bash
python scripts/seed_professores_estudantes.py [--alunos N] [--professores M]
```

| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| `--alunos` | 500 | Total de alunos a criar |
| `--professores` | 2 | Professores por escola |

## 3. seed_equipes.py

Cria equipes para **cada escola** e para **cada variante** INDIVIDUAL + COLETIVA do catálogo da edição (ordenadas por esporte/categoria/naipe), respeitando idade, sexo, 1 individual + 1 coletiva por aluno, `limite_atletas` e mínimo ~80% do limite quando aplicável. **Commit após cada escola** (progresso persistido). Logs de progresso no terminal.

```bash
python scripts/seed_equipes.py [--max-variantes N]
```

| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| `--max-variantes` | 0 | Máximo de variantes por escola; **0 = todas** |
| `--equipes` | — | Alias de `--max-variantes` (se informado, sobrescreve o padrão) |

Reexecutar pode gerar conflito em `UNIQUE (escola_id, esporte_variante_id, edicao_id)` se a equipe já existir; use banco limpo ou remova equipes da edição ativa.

## Exemplo completo

```bash
cd api-jels
python scripts/seed_esportes_modalidades.py
python scripts/seed_escolas.py --escolas 10 --coordenadores 3
python scripts/seed_professores_estudantes.py --alunos 200 --professores 2
python scripts/seed_equipes.py
```

## Pré-requisitos

- Banco rodando, `DATABASE_URL` no `.env`
- Migrations executadas (categorias, naipes, tipos_modalidade, edições, escopo por `edicao_id`)
- Pelo menos uma linha em `edicoes` com `status = 'ATIVA'` (criada pela migration 028 em instalação nova)
