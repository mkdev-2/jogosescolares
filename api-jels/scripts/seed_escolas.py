#!/usr/bin/env python3
"""
Script para criar escolas, diretores e coordenadores.
Executa: python scripts/seed_escolas.py [--escolas N] [--coordenadores M]
"""
import asyncio
import sys
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

from seed_utils import (
    get_connection,
    gerar_cpf_valido,
    gerar_cnpj_valido,
    parse_args_escolas,
    get_edicao_ativa_id,
    ensure_jels_esportes_e_variantes,
    sync_escola_adesao_todas_modalidades,
)


def gerar_escolas_dados(quantidade: int, base_inep: int) -> list[tuple]:
    """Gera dados fictícios para N escolas a partir da base de INEP informada."""
    cidades = ["Recife", "Olinda", "Jaboatão", "Caruaru", "Petrolina", "Garanhuns", "Vitória", "Camaragibe"]
    prefixos = ["Escola Municipal", "Escola Estadual", "Colégio", "Escola Técnica"]
    nomes = ["St Agostinho", "Isaac Newton", "Albert Einstein", "Aristóteles", "Stephen Hawking", "René Descartes"]
    dados = []
    for i in range(quantidade):
        nome = f"{prefixos[i % len(prefixos)]} {nomes[i % len(nomes)]}"
        if quantidade > len(nomes):
            nome = f"{nome} {i}"
        inep = str(base_inep + i)
        cnpj = gerar_cnpj_valido()
        cidade = cidades[i % len(cidades)]
        dados.append((
            nome, inep, cnpj,
            f"Rua das Flores, {100 + i * 10}",
            cidade, "PE",
            f"escola{base_inep + i}@email.com",
            f"8198765432{i % 10}"
        ))
    return dados


async def seed_escolas(quantidade_escolas: int, quantidade_coordenadores: int = 0):
    """Cria escolas, diretores e coordenadores."""
    conn = await get_connection()
    hash_senha = "$2b$12$if1uxtVojhgNsQPgtMuwL.Sk6tSdU7aUGGeWWNUvTiJT9mj9F.TH2"  # admin123

    try:
        async with conn.cursor() as cur:
            print("Conectando ao banco...", flush=True)

            # Obtém o próximo INEP disponível para criar escolas novas (evita conflito)
            await cur.execute(
                """SELECT
                    COALESCE(MAX(CAST(NULLIF(TRIM(inep), '') AS BIGINT)), 26123455) + 1 AS next_inep
                FROM escolas"""
            )
            row = await cur.fetchone()
            base_inep = int(row["next_inep"])

            escolas_dados = gerar_escolas_dados(quantidade_escolas, base_inep)
            escola_ids = []

            # ========== ESCOLAS ==========
            print(f"Inserindo {quantidade_escolas} escolas...", flush=True)
            for nome, inep, cnpj, endereco, cidade, uf, email, telefone in escolas_dados:
                try:
                    await cur.execute(
                        """INSERT INTO escolas (nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, status_adesao)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'APROVADA')
                           ON CONFLICT (inep) DO NOTHING RETURNING id""",
                        (nome, inep, cnpj, endereco, cidade, uf, email, telefone)
                    )
                    row = await cur.fetchone()
                    if row:
                        escola_ids.append(row["id"])
                except Exception as e:
                    if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                        await cur.execute("SELECT id FROM escolas WHERE inep = %s", (inep,))
                        r = await cur.fetchone()
                        if r:
                            escola_ids.append(r["id"])
                    else:
                        raise

            if not escola_ids:
                await cur.execute("SELECT id FROM escolas ORDER BY id")
                escola_ids = [r["id"] for r in await cur.fetchall()]

            if not escola_ids:
                print("ERRO: Nenhuma escola encontrada ou criada.", flush=True)
                await conn.rollback()
                return

            print(f"  -> {len(escola_ids)} novas escolas criadas", flush=True)

            # ========== USUÁRIOS: Admin + Diretores + Coordenadores ==========
            print("Inserindo usuários (Admin, Diretores, Coordenadores)...", flush=True)
            await cur.execute(
                """INSERT INTO users (cpf, email, password_hash, nome, role, escola_id, status)
                   VALUES ('11144477735', 'admin@jogosescolares.local', %s, 'Administrador', 'ADMIN', NULL, 'ATIVO')
                   ON CONFLICT (cpf) DO NOTHING""",
                (hash_senha,)
            )

            # Um DIRETOR por escola
            diretores_criados = 0
            for i, escola_id in enumerate(escola_ids):
                await cur.execute(
                    "SELECT 1 FROM users WHERE role = 'DIRETOR' AND escola_id = %s",
                    (escola_id,),
                )
                if await cur.fetchone() is not None:
                    continue  # Escola já tem diretor, pular
                while True:
                    cpf = gerar_cpf_valido()
                    await cur.execute("SELECT 1 FROM users WHERE cpf = %s", (cpf,))
                    if await cur.fetchone() is None:
                        break
                await cur.execute(
                    """INSERT INTO users (cpf, email, password_hash, nome, role, escola_id, status)
                       VALUES (%s, %s, %s, %s, 'DIRETOR', %s, 'ATIVO')
                       ON CONFLICT (cpf) DO NOTHING""",
                    (cpf, f"diretor.escola{i+1}@jogosescolares.local", hash_senha, f"Diretor Escola {i+1}", escola_id)
                )
                diretores_criados += 1

            # Coordenadores em algumas escolas (primeiras N)
            coord_count = min(quantidade_coordenadores, len(escola_ids))
            for i in range(coord_count):
                escola_id = escola_ids[i]
                while True:
                    cpf = gerar_cpf_valido()
                    await cur.execute("SELECT 1 FROM users WHERE cpf = %s", (cpf,))
                    if await cur.fetchone() is None:
                        break
                await cur.execute(
                    """INSERT INTO users (cpf, email, password_hash, nome, role, escola_id, status)
                       VALUES (%s, %s, %s, %s, 'COORDENADOR', NULL, 'ATIVO')
                       ON CONFLICT (cpf) DO NOTHING
                       RETURNING id""",
                    (cpf, f"coordenador.escola{i+1}@jogosescolares.local", hash_senha, f"Coordenador Escola {i+1}")
                )
                row = await cur.fetchone()
                if row:
                    await cur.execute(
                        """INSERT INTO coordenadores_escolas (user_id, escola_id, ativo)
                           VALUES (%s, %s, TRUE)
                           ON CONFLICT (user_id, escola_id) DO UPDATE SET ativo = TRUE""",
                        (row["id"], escola_id),
                    )

            # Corrige coordenadores criados por versões antigas do seed, que gravavam escola_id em users.
            await cur.execute(
                """INSERT INTO coordenadores_escolas (user_id, escola_id, ativo)
                   SELECT id, escola_id, TRUE
                   FROM users
                   WHERE role = 'COORDENADOR' AND escola_id IS NOT NULL
                   ON CONFLICT (user_id, escola_id) DO UPDATE SET ativo = TRUE"""
            )

            print(f"  -> Admin + {diretores_criados} diretores (novos) + {coord_count} coordenadores", flush=True)

            # ========== SOLICITAÇÕES ACEITAS ==========
            print("Inserindo solicitações (uma ACEITA por escola)...", flush=True)
            await cur.execute(
                "SELECT id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone FROM escolas WHERE id = ANY(%s)",
                (escola_ids,)
            )
            escolas_info = {r["id"]: r for r in await cur.fetchall()}
            dados_base = '{"nome": "Diretor", "cpf": "11122233344", "email": "dir@email.com"}'
            for escola_id in escola_ids:
                esc = escolas_info.get(escola_id)
                if not esc:
                    continue
                await cur.execute(
                    """INSERT INTO solicitacoes (status, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, dados_diretor, dados_coordenador, escola_id)
                       VALUES ('ACEITO', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (esc["nome_escola"], esc["inep"], esc["cnpj"], esc["endereco"], esc["cidade"], esc["uf"],
                     esc["email"], esc["telefone"], dados_base, dados_base, escola_id)
                )
            print(f"  -> {len(escola_ids)} solicitações ACEITAS", flush=True)

            # Catálogo competitivo na edição ativa + adesão escolar (alinha com edicao_id em esportes/variantes/equipes)
            try:
                edicao_id = await get_edicao_ativa_id(cur)
                n_var = await ensure_jels_esportes_e_variantes(cur, edicao_id)
                print(f"  -> Edição ativa id={edicao_id}: {n_var} esporte_variante(s) disponíveis", flush=True)
                await sync_escola_adesao_todas_modalidades(cur, edicao_id, escola_ids)
                print(f"  -> Adesão escola+edição atualizada para {len(escola_ids)} escola(s) (todas as modalidades)", flush=True)
            except RuntimeError as ex:
                print(f"  AVISO: catálogo JELS / adesão não aplicados: {ex}", flush=True)

            await conn.commit()
            print("\nSeed escolas concluído com sucesso!", flush=True)
    finally:
        await conn.close()


if __name__ == "__main__":
    args = parse_args_escolas()
    asyncio.run(seed_escolas(args.escolas, args.coordenadores))
