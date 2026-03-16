#!/usr/bin/env python3
"""
Script para criar professores técnicos e estudantes-atletas.
Executa: python scripts/seed_professores_estudantes.py [--alunos N] [--professores M]
Requer: escolas já criadas (execute seed_escolas.py antes).
"""
import asyncio
import random
import sys
from datetime import date
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

from seed_utils import (
    get_connection,
    gerar_cpf_valido,
    gerar_nis,
    data_nascimento_para_categoria,
    parse_args_professores_estudantes,
)


def _escola_com_menos(contagens: dict, escola_ids: list) -> int:
    """Retorna o escola_id que tem a menor contagem (para balanceamento)."""
    return min(escola_ids, key=lambda eid: contagens[eid])


async def seed_professores_estudantes(total_alunos: int, professores_por_escola: int):
    """Cria professores técnicos e estudantes-atletas, balanceando entre escolas."""
    conn = await get_connection()

    try:
        async with conn.cursor() as cur:
            print("Conectando ao banco...", flush=True)

            # Buscar escolas existentes
            await cur.execute("SELECT id FROM escolas ORDER BY id")
            escola_ids = [r["id"] for r in await cur.fetchall()]
            if not escola_ids:
                print("ERRO: Nenhuma escola encontrada. Execute seed_escolas.py primeiro.", flush=True)
                return

            # Contagens atuais por escola (para balanceamento)
            await cur.execute(
                "SELECT escola_id, COUNT(*) as cnt FROM professores_tecnicos GROUP BY escola_id"
            )
            prof_por_escola = {r["escola_id"]: r["cnt"] for r in await cur.fetchall()}
            await cur.execute(
                "SELECT escola_id, COUNT(*) as cnt FROM estudantes_atletas GROUP BY escola_id"
            )
            est_por_escola = {r["escola_id"]: r["cnt"] for r in await cur.fetchall()}
            for eid in escola_ids:
                prof_por_escola.setdefault(eid, 0)
                est_por_escola.setdefault(eid, 0)

            # ========== PROFESSORES TÉCNICOS ==========
            # Adiciona professores priorizando escolas com menos (até atingir target por escola)
            prof_a_adicionar = sum(
                max(0, professores_por_escola - prof_por_escola[eid]) for eid in escola_ids
            )
            print(f"Inserindo professores (meta: {professores_por_escola} por escola, {prof_a_adicionar} a adicionar)...", flush=True)
            nomes_prof = [
                "Carlos Oliveira", "Ana Paula Costa", "Roberto Lima", "Fernanda Souza", "Marcos Pereira",
                "Juliana Santos", "Pedro Almeida", "Maria Fernanda", "Ricardo Mendes", "Patricia Rocha"
            ]
            prof_ids = []
            prof_counter = 0
            while prof_a_adicionar > 0:
                escola_id = _escola_com_menos(prof_por_escola, escola_ids)
                if prof_por_escola[escola_id] >= professores_por_escola:
                    break
                idx = prof_counter % len(nomes_prof)
                nome = f"{nomes_prof[idx]} {escola_id}_{prof_por_escola[escola_id]}"
                cpf = gerar_cpf_valido()
                cref = f"CREF{random.randint(10000, 99999)}-PE"
                try:
                    await cur.execute(
                        """INSERT INTO professores_tecnicos (escola_id, nome, cpf, cref)
                           VALUES (%s, %s, %s, %s) RETURNING id""",
                        (escola_id, nome, cpf, cref)
                    )
                    prof_ids.append((await cur.fetchone())["id"])
                    prof_por_escola[escola_id] += 1
                    prof_a_adicionar -= 1
                    prof_counter += 1
                except Exception as e:
                    if "duplicate" not in str(e).lower():
                        raise
            print(f"  -> {len(prof_ids)} professores inseridos", flush=True)

            # ========== ESTUDANTES ATLETAS ==========
            # Adiciona estudantes priorizando escolas com menos alunos (balanceamento)
            print(f"Inserindo {total_alunos} estudantes-atletas (balanceando entre escolas)...", flush=True)
            nomes_m = ["Lucas", "Pedro", "Gabriel", "Rafael", "Bruno", "Felipe", "Mateus", "Thiago", "Leonardo", "Gustavo"]
            nomes_f = ["Maria", "Ana", "Julia", "Camila", "Beatriz", "Larissa", "Amanda", "Gabriela", "Isabela", "Letícia"]
            sobrenomes = ["Silva", "Santos", "Oliveira", "Costa", "Lima", "Souza", "Pereira", "Almeida", "Mendes", "Rocha"]
            cpf_usados = set()
            inseridos = 0

            for _ in range(total_alunos):
                escola_id = _escola_com_menos(est_por_escola, escola_ids)
                sexo = random.choice(["M", "F"])
                nome = random.choice(nomes_m if sexo == "M" else nomes_f) + " " + random.choice(sobrenomes)
                while True:
                    cpf = gerar_cpf_valido()
                    if cpf not in cpf_usados:
                        cpf_usados.add(cpf)
                        break
                data_nasc = data_nascimento_para_categoria(12, 17)
                resp_nome = f"Responsável de {nome.split()[0]}"
                resp_cpf = gerar_cpf_valido()
                resp_cel = f"8199{random.randint(10000000, 99999999)}"
                resp_email = f"resp{cpf}@email.com"
                resp_nis = gerar_nis()
                try:
                    await cur.execute(
                        """INSERT INTO estudantes_atletas (escola_id, nome, cpf, data_nascimento, sexo,
                           responsavel_nome, responsavel_cpf, responsavel_celular, responsavel_email, responsavel_nis)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        (escola_id, nome, cpf, data_nasc, sexo, resp_nome, resp_cpf, resp_cel, resp_email, resp_nis)
                    )
                    est_por_escola[escola_id] += 1
                    inseridos += 1
                    if inseridos % 50 == 0:
                        print(f"  ... {inseridos}/{total_alunos} estudantes inseridos", flush=True)
                except Exception as e:
                    if "duplicate" not in str(e).lower():
                        raise

            print(f"  -> {inseridos} estudantes inseridos", flush=True)
            await conn.commit()
            print("\nSeed professores e estudantes concluído com sucesso!", flush=True)
    finally:
        await conn.close()


if __name__ == "__main__":
    args = parse_args_professores_estudantes()
    asyncio.run(seed_professores_estudantes(args.alunos, args.professores))
