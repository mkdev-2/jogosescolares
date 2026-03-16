# Scripts de Seed do Projeto

Scripts modulares para popular o banco de dados. Execute na ordem indicada.

## Ordem de execução

1. **seed_escolas.py** (ou seed.py) – escolas, diretores, coordenadores
2. **seed_professores_estudantes.py** – professores técnicos e estudantes-atletas
3. **seed_equipes.py** – equipes e vínculos (respeitando regras do banco)

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

Cria equipes e vincula estudantes. Regras: idade (12-14 ou 15-17), sexo (M/F), 1 individual + 1 coletiva por aluno, limite_atletas. **Requer escolas, professores e estudantes.**

```bash
python scripts/seed_equipes.py [--equipes N]
```

| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| `--equipes` | 6 | Variantes de equipe por escola |

## Exemplo completo

```bash
cd api-jels
python scripts/seed_escolas.py --escolas 10 --coordenadores 3
python scripts/seed_professores_estudantes.py --alunos 200 --professores 2
python scripts/seed_equipes.py --equipes 6
```

## Pré-requisitos

- Banco rodando, `DATABASE_URL` no `.env`
- Migrations executadas (esportes, categorias, naipes, tipos_modalidade, esporte_variantes)
