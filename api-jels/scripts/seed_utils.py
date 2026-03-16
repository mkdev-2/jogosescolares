#!/usr/bin/env python3
"""Utilitários compartilhados pelos scripts de seed."""
import asyncio
import os
import random
import sys
from datetime import date
from pathlib import Path

# Adiciona a raiz do projeto ao path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Configurar SelectorEventLoop para Windows (compatibilidade com psycopg)
if sys.platform == "win32" and sys.version_info >= (3, 8):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import psycopg
from psycopg.rows import dict_row


def gerar_cpf_valido() -> str:
    """Gera um CPF com dígitos verificadores válidos (apenas para seed)."""
    base = [random.randint(1, 9) for _ in range(9)]
    for _ in range(2):
        soma = sum((10 - i) * d for i, d in enumerate(base))
        dig = (soma * 10 % 11) % 10
        base.append(dig)
    return "".join(map(str, base))


def gerar_nis() -> str:
    """Gera um NIS de 11 dígitos (apenas para seed)."""
    return "".join(str(random.randint(0, 9)) for _ in range(11))


def gerar_inep() -> str:
    """Gera um INEP de 8 dígitos."""
    return "".join(str(random.randint(1, 9)) for _ in range(8))


def gerar_cnpj() -> str:
    """Gera um CNPJ de 14 dígitos (apenas para seed)."""
    return "".join(str(random.randint(0, 9)) for _ in range(14))


def data_nascimento_para_categoria(categoria_idade_min: int, categoria_idade_max: int) -> date:
    """Retorna uma data de nascimento que coloca o aluno na faixa etária."""
    hoje = date.today()
    idade = random.randint(categoria_idade_min, categoria_idade_max)
    ano_nasc = hoje.year - idade
    mes = random.randint(1, 12)
    dia = random.randint(1, 28)
    return date(ano_nasc, mes, dia)


def calcular_idade_anos_completos(data_nascimento: date) -> int:
    """Calcula idade em anos completos (mesmo critério do PostgreSQL AGE)."""
    hoje = date.today()
    idade = hoje.year - data_nascimento.year
    if (hoje.month, hoje.day) < (data_nascimento.month, data_nascimento.day):
        idade -= 1
    return idade


def get_database_url() -> str:
    """Obtém DATABASE_URL do ambiente ou .env."""
    try:
        from app.database import settings
        return settings.database_url
    except ImportError:
        pass
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


async def get_connection():
    """Retorna conexão async com o banco."""
    url = get_database_url()
    if not url:
        raise RuntimeError("DATABASE_URL não definida. Configure o .env ou a variável de ambiente.")
    url = url.replace("postgresql+psycopg://", "postgresql://")
    return await psycopg.AsyncConnection.connect(url, row_factory=dict_row)


def parse_args_escolas():
    """Argumentos para seed_escolas."""
    import argparse
    p = argparse.ArgumentParser(description="Cria escolas, diretores e coordenadores")
    p.add_argument("--escolas", type=int, default=5, help="Quantidade de escolas a criar (default: 5)")
    p.add_argument("--coordenadores", type=int, default=0, help="Quantidade de escolas que terão coordenador (0 a --escolas, default: 0)")
    return p.parse_args()


def parse_args_professores_estudantes():
    """Argumentos para seed_professores_estudantes."""
    import argparse
    p = argparse.ArgumentParser(description="Cria professores técnicos e estudantes-atletas")
    p.add_argument("--alunos", type=int, default=500, help="Total de alunos a criar (default: 500)")
    p.add_argument("--professores", type=int, default=2, help="Professores por escola (default: 2)")
    return p.parse_args()


def parse_args_equipes():
    """Argumentos para seed_equipes."""
    import argparse
    p = argparse.ArgumentParser(description="Cria equipes e vincula estudantes")
    p.add_argument("--equipes", type=int, default=6, help="Variantes de equipe por escola (default: 6)")
    return p.parse_args()
