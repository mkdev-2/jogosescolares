#!/usr/bin/env python3
"""Utilitários compartilhados pelos scripts de seed."""
import asyncio
import os
import random
import sys
from datetime import date
from pathlib import Path

from psycopg.types.json import Json

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


def _append_connect_timeout(url: str, seconds: int) -> str:
    """Garante connect_timeout no conninfo (libpq), evitando espera indefinida."""
    if "connect_timeout=" in url:
        return url
    joiner = "&" if "?" in url else "?"
    return f"{url}{joiner}connect_timeout={seconds}"


def _db_target_hint(url: str) -> str:
    """Trecho seguro da URL para mensagens (sem credenciais)."""
    try:
        from urllib.parse import urlparse

        p = urlparse(url.replace("postgresql+psycopg://", "postgresql://"))
        host = p.hostname or "?"
        port = f":{p.port}" if p.port else ""
        db = (p.path or "/").lstrip("/") or "?"
        return f"{host}{port}/{db}"
    except Exception:
        return "(URL configurada)"


async def get_connection(*, connect_timeout: int = 20, verbose: bool = True):
    """Retorna conexão async com o banco.

    Usa connect_timeout no conninfo para não travar minutos quando o host não responde
    (Docker parado, host errado, VPN, etc.).
    """
    url = get_database_url()
    if not url:
        raise RuntimeError("DATABASE_URL não definida. Configure o .env ou a variável de ambiente.")
    url = url.replace("postgresql+psycopg://", "postgresql://")
    url = _append_connect_timeout(url, connect_timeout)
    if verbose:
        hint = _db_target_hint(url)
        print(
            f"Conectando ao PostgreSQL em {hint} (timeout {connect_timeout}s)...",
            flush=True,
        )
    try:
        return await psycopg.AsyncConnection.connect(url, row_factory=dict_row)
    except psycopg.OperationalError as e:
        raise RuntimeError(
            "Não foi possível conectar ao PostgreSQL. Confira: servidor ativo, "
            "DATABASE_URL (host/porta acessíveis deste PC), firewall e VPN.\n"
            f"Causa: {e}"
        ) from e
    except (TimeoutError, OSError) as e:
        raise RuntimeError(
            "Conexão com o PostgreSQL falhou (rede ou timeout). Verifique host/porta em DATABASE_URL.\n"
            f"Causa: {e}"
        ) from e


async def get_edicao_ativa_id(cur) -> int:
    """ID da edição com status ATIVA (mesma regra do backend)."""
    await cur.execute(
        """
        SELECT id FROM edicoes
        WHERE status = 'ATIVA'
        ORDER BY ano DESC, id DESC
        LIMIT 1
        """
    )
    row = await cur.fetchone()
    if not row:
        raise RuntimeError(
            "Nenhuma edição ATIVA no banco. Aplique as migrations (027/028) ou insira uma linha em edicoes."
        )
    return int(row["id"])


def codigo_tipo_modalidade_para_limite(limite_atletas: int) -> str:
    """Modalidade: 1 atleta → INDIVIDUAIS; mais de um → COLETIVAS (regra de negócio do domínio)."""
    return "INDIVIDUAIS" if (limite_atletas or 0) <= 1 else "COLETIVAS"


# Esportes extras do JELS em seed_escolas (nomes podem bater com cenários de equipe)
JELS_ESPORTES_META: list[tuple[str, int]] = [
    ("Xadrez", 1),
    ("Judô", 1),
    ("Atletismo", 1),
    ("Skate", 1),
    ("Surf", 1),
    ("Karatê", 1),
    ("Futsal", 15),
    ("Volei de Praia", 12),
]


async def ensure_jels_esportes_e_variantes(cur, edicao_id: int) -> int:
    """
    Garante os esportes do cenário JELS e variantes categoria × naipe × tipo coerente com limite_atletas
    (1 → INDIVIDUAIS, >1 → COLETIVAS).
    Idempotente (ON CONFLICT DO NOTHING nas variantes).
    Retorna o total de variantes existentes para a edição após a operação.
    """
    await cur.execute(
        """
        SELECT id FROM categorias
        WHERE COALESCE(ativa, TRUE)
        ORDER BY idade_min, id
        """
    )
    cats = await cur.fetchall()
    if len(cats) < 1:
        raise RuntimeError("Nenhuma categoria encontrada (esp. 015).")
    cat_ids = [str(c["id"]) for c in cats]

    await cur.execute("SELECT id, codigo FROM naipes ORDER BY codigo")
    naipes = await cur.fetchall()
    if len(naipes) < 1:
        raise RuntimeError("Nenhum naipe encontrado (esp. 015).")
    naipe_ids = [str(n["id"]) for n in naipes]

    await cur.execute(
        "SELECT id, codigo FROM tipos_modalidade WHERE codigo IN ('INDIVIDUAIS', 'COLETIVAS')"
    )
    tipos_rows = await cur.fetchall()
    tipo_por_codigo = {r["codigo"]: str(r["id"]) for r in tipos_rows}
    if "INDIVIDUAIS" not in tipo_por_codigo or "COLETIVAS" not in tipo_por_codigo:
        raise RuntimeError("Esperados tipos_modalidade INDIVIDUAIS e COLETIVAS (migration 015).")

    for nome, limite in JELS_ESPORTES_META:
        await cur.execute(
            "SELECT id FROM esportes WHERE nome = %s AND edicao_id = %s",
            (nome, edicao_id),
        )
        row = await cur.fetchone()
        if row:
            esporte_id = str(row["id"])
        else:
            await cur.execute(
                """
                INSERT INTO esportes (edicao_id, nome, descricao, icone, requisitos, limite_atletas, ativa)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (edicao_id, nome, "", "Zap", "", limite, True),
            )
            esporte_id = str((await cur.fetchone())["id"])

        cod_tipo = codigo_tipo_modalidade_para_limite(limite)
        tipo_id = tipo_por_codigo[cod_tipo]
        for cat_id in cat_ids:
            for naipe_id in naipe_ids:
                await cur.execute(
                    """
                    INSERT INTO esporte_variantes
                        (esporte_id, categoria_id, naipe_id, tipo_modalidade_id, edicao_id)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (esporte_id, categoria_id, naipe_id, tipo_modalidade_id, edicao_id)
                    DO NOTHING
                    """,
                    (esporte_id, cat_id, naipe_id, tipo_id, edicao_id),
                )

    await cur.execute(
        "SELECT COUNT(*) AS c FROM esporte_variantes WHERE edicao_id = %s",
        (edicao_id,),
    )
    return int((await cur.fetchone())["c"])


async def sync_escola_adesao_todas_modalidades(cur, edicao_id: int, escola_ids: list[int]) -> None:
    """
    Preenche escola_edicao_modalidades com todas as variantes da edição (útil para dev / seeds).
    """
    if not escola_ids:
        return
    await cur.execute(
        "SELECT id FROM esporte_variantes WHERE edicao_id = %s ORDER BY id",
        (edicao_id,),
    )
    rows = await cur.fetchall()
    if not rows:
        return
    ids = [str(r["id"]) for r in rows]
    payload = Json({"variante_ids": ids})
    for eid in escola_ids:
        await cur.execute(
            """
            INSERT INTO escola_edicao_modalidades (escola_id, edicao_id, modalidades_adesao)
            VALUES (%s, %s, %s)
            ON CONFLICT (escola_id, edicao_id) DO UPDATE SET
                modalidades_adesao = EXCLUDED.modalidades_adesao,
                updated_at = CURRENT_TIMESTAMP
            """,
            (eid, edicao_id, payload),
        )


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
    p = argparse.ArgumentParser(
        description="Cria equipes e vincula estudantes (todas as modalidades IND+COL por padrão)"
    )
    p.add_argument(
        "--max-variantes",
        type=int,
        default=0,
        help="Máximo de variantes (IND+COL) processadas por escola; 0 = todas (padrão).",
    )
    p.add_argument(
        "--equipes",
        type=int,
        default=None,
        help="Alias legado: mesmo que --max-variantes (se informado, sobrescreve --max-variantes).",
    )
    args = p.parse_args()
    args.limite_variantes = args.equipes if args.equipes is not None else args.max_variantes
    return args
