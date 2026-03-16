#!/usr/bin/env python3
"""
Script de seed de equipes para os Jogos Escolares (JELS).

Cria equipes para cada escola nos seguintes esportes/variantes:
  - Xadrez      → todas as variantes
  - Judô        → todas as variantes
  - Atletismo   → apenas naipe FEMININO
  - Skate       → apenas naipe MASCULINO
  - Surf        → apenas categoria 15 a 17 anos
  - Karatê      → apenas categoria 12 a 14 anos
  - Futsal      → todas as variantes
  - Vôlei de Praia → todas as variantes

Regras de vinculação de atletas (herdadas do trigger do banco):
  - Faixa etária compatível com a categoria
  - Sexo compatível com o naipe
  - Máx. 1 modalidade Individual + 1 Coletiva por aluno
  - Não exceder limite_atletas do esporte

Equipes só são criadas se houver pelo menos 1 atleta elegível.

Executa: python scripts/seed_equipes_jels.py
Requer:  escolas, professores e estudantes já criados.
"""
import asyncio
import random
import sys
from pathlib import Path

_scripts_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_scripts_dir.parent))
sys.path.insert(0, str(_scripts_dir))

from seed_utils import (
    get_connection,
    calcular_idade_anos_completos,
)

# ---------------------------------------------------------------------------
# Configuração dos esportes e filtros de variante
# ---------------------------------------------------------------------------
# Cada entrada define:
#   nome_esporte : nome exato na tabela esportes
#   filtro_naipe : None = todos, 'M' = só masculino, 'F' = só feminino
#   filtro_cat_min / filtro_cat_max : None = todas, int = filtra pela faixa
ESPORTES_CONFIG = [
    {"nome_esporte": "Xadrez",         "filtro_naipe": None, "filtro_cat_min": None, "filtro_cat_max": None},
    {"nome_esporte": "Judô",           "filtro_naipe": None, "filtro_cat_min": None, "filtro_cat_max": None},
    {"nome_esporte": "Atletismo",      "filtro_naipe": "F",  "filtro_cat_min": None, "filtro_cat_max": None},
    {"nome_esporte": "Skate",          "filtro_naipe": "M",  "filtro_cat_min": None, "filtro_cat_max": None},
    {"nome_esporte": "Surf",           "filtro_naipe": None, "filtro_cat_min": 15,   "filtro_cat_max": 17},
    {"nome_esporte": "Karatê",         "filtro_naipe": None, "filtro_cat_min": 12,   "filtro_cat_max": 14},
    {"nome_esporte": "Futsal",         "filtro_naipe": None, "filtro_cat_min": None, "filtro_cat_max": None},
    {"nome_esporte": "Volei de Praia", "filtro_naipe": None, "filtro_cat_min": None, "filtro_cat_max": None},
]


def variante_aceita(ev: dict, cfg: dict) -> bool:
    """Retorna True se a variante passa nos filtros definidos na configuração."""
    if cfg["filtro_naipe"] is not None and ev["naipe"] != cfg["filtro_naipe"]:
        return False
    if cfg["filtro_cat_min"] is not None and ev["idade_min"] != cfg["filtro_cat_min"]:
        return False
    if cfg["filtro_cat_max"] is not None and ev["idade_max"] != cfg["filtro_cat_max"]:
        return False
    return True


async def seed_equipes_jels():
    conn = await get_connection()

    try:
        async with conn.cursor() as cur:
            print("Conectando ao banco...", flush=True)

            # ----------------------------------------------------------------
            # Carregar escolas
            # ----------------------------------------------------------------
            await cur.execute("SELECT id FROM escolas ORDER BY id")
            escola_ids = [r["id"] for r in await cur.fetchall()]
            if not escola_ids:
                print("ERRO: Nenhuma escola encontrada. Execute seed_escolas.py primeiro.", flush=True)
                return

            # ----------------------------------------------------------------
            # Carregar TODAS as variantes com metadados
            # ----------------------------------------------------------------
            await cur.execute("""
                SELECT
                    ev.id,
                    esp.nome AS esporte_nome,
                    esp.limite_atletas,
                    c.idade_min,
                    c.idade_max,
                    n.codigo  AS naipe,
                    n.nome    AS naipe_nome,
                    tm.codigo AS tipo,
                    c.nome    AS categoria_nome
                FROM esporte_variantes ev
                JOIN esportes        esp ON esp.id = ev.esporte_id
                JOIN categorias      c   ON c.id   = ev.categoria_id
                JOIN naipes          n   ON n.id   = ev.naipe_id
                JOIN tipos_modalidade tm  ON tm.id  = ev.tipo_modalidade_id
                WHERE tm.codigo IN ('INDIVIDUAIS', 'COLETIVAS')
                ORDER BY esp.nome, c.idade_min, n.codigo
            """)
            todas_variantes = await cur.fetchall()

            # ----------------------------------------------------------------
            # Selecionar variantes conforme configuração JELS
            # ----------------------------------------------------------------
            variantes_selecionadas = []
            for cfg in ESPORTES_CONFIG:
                encontrou = False
                for ev in todas_variantes:
                    if ev["esporte_nome"].lower() == cfg["nome_esporte"].lower():
                        encontrou = True
                        if variante_aceita(ev, cfg):
                            variantes_selecionadas.append(ev)
                if not encontrou:
                    print(f"AVISO: Esporte '{cfg['nome_esporte']}' não encontrado no banco.", flush=True)

            if not variantes_selecionadas:
                print("ERRO: Nenhuma variante selecionada. Verifique os nomes dos esportes.", flush=True)
                return

            # Resumo das variantes
            print(f"\n{len(variantes_selecionadas)} variantes selecionadas:", flush=True)
            esporte_atual = None
            for ev in variantes_selecionadas:
                if ev["esporte_nome"] != esporte_atual:
                    esporte_atual = ev["esporte_nome"]
                    print(f"  {esporte_atual} (limite: {ev['limite_atletas']})", flush=True)
                print(f"    → {ev['categoria_nome']} | {ev['naipe_nome']}", flush=True)

            # ----------------------------------------------------------------
            # Carregar estudantes
            # ----------------------------------------------------------------
            await cur.execute(
                "SELECT id, escola_id, data_nascimento, sexo FROM estudantes_atletas"
            )
            todos_estudantes = await cur.fetchall()

            # ----------------------------------------------------------------
            # Carregar professores por escola
            # ----------------------------------------------------------------
            await cur.execute("SELECT id, escola_id FROM professores_tecnicos")
            profs_por_escola = {}
            for p in await cur.fetchall():
                profs_por_escola.setdefault(p["escola_id"], []).append(p["id"])

            # ----------------------------------------------------------------
            # Pré-carregar vínculos já existentes (reexecução segura)
            # ----------------------------------------------------------------
            estudante_tipos = {}
            await cur.execute("""
                SELECT ee.estudante_id, tm.codigo AS tipo
                FROM equipe_estudantes ee
                JOIN equipes            eq  ON eq.id  = ee.equipe_id
                JOIN esporte_variantes  ev  ON ev.id  = eq.esporte_variante_id
                JOIN tipos_modalidade   tm  ON tm.id  = ev.tipo_modalidade_id
                WHERE tm.codigo IN ('INDIVIDUAIS', 'COLETIVAS')
            """)
            for r in await cur.fetchall():
                estudante_tipos.setdefault(r["estudante_id"], set()).add(r["tipo"])

            # ----------------------------------------------------------------
            # Criar equipes
            # ----------------------------------------------------------------
            print(f"\nProcessando {len(escola_ids)} escola(s)...\n", flush=True)
            equipes_criadas = 0
            vinculos_total = 0
            equipes_puladas = 0

            for escola_idx, escola_id in enumerate(escola_ids):
                profs_escola = profs_por_escola.get(escola_id, [])
                if not profs_escola:
                    print(f"  [Escola {escola_idx + 1}/{len(escola_ids)}] AVISO: sem professores — pulada.", flush=True)
                    continue

                estudantes_escola = [e for e in todos_estudantes if e["escola_id"] == escola_id]
                print(f"  [Escola {escola_idx + 1}/{len(escola_ids)}] {len(estudantes_escola)} aluno(s) disponíveis", flush=True)

                for ev in variantes_selecionadas:
                    try:
                        limite = ev["limite_atletas"] or 999
                        tipo   = ev["tipo"]
                        naipe  = ev["naipe"]

                        # Filtrar candidatos elegíveis
                        candidatos = []
                        for est in estudantes_escola:
                            # Regra: 1 individual + 1 coletiva
                            if tipo in ("INDIVIDUAIS", "COLETIVAS"):
                                if tipo in estudante_tipos.get(est["id"], set()):
                                    continue
                            # Faixa etária
                            idade = calcular_idade_anos_completos(est["data_nascimento"])
                            if idade < ev["idade_min"] or idade > ev["idade_max"]:
                                continue
                            # Naipe
                            if est["sexo"] != naipe:
                                continue
                            candidatos.append(est)

                        label = f"{ev['esporte_nome']} | {ev['categoria_nome']} | {ev['naipe_nome']}"

                        if not candidatos:
                            print(f"    PULADA  [{label}]: sem candidatos", flush=True)
                            equipes_puladas += 1
                            continue

                        # Criar a equipe
                        await cur.execute(
                            """INSERT INTO equipes (escola_id, esporte_variante_id, professor_tecnico_id)
                               VALUES (%s, %s, %s) RETURNING id""",
                            (escola_id, ev["id"], random.choice(profs_escola))
                        )
                        equipe_id = (await cur.fetchone())["id"]
                        equipes_criadas += 1

                        # Vincular atletas até o limite
                        random.shuffle(candidatos)
                        vinculos_equipe = 0
                        for est in candidatos:
                            if vinculos_equipe >= limite:
                                break
                            sp = f"sp_{est['id']}"
                            try:
                                await cur.execute(f"SAVEPOINT {sp}")
                                await cur.execute(
                                    """INSERT INTO equipe_estudantes (equipe_id, estudante_id)
                                       VALUES (%s, %s)
                                       ON CONFLICT (equipe_id, estudante_id) DO NOTHING""",
                                    (equipe_id, est["id"])
                                )
                                await cur.execute(f"RELEASE SAVEPOINT {sp}")
                                if cur.rowcount and cur.rowcount > 0:
                                    estudante_tipos.setdefault(est["id"], set()).add(tipo)
                                    vinculos_equipe += 1
                                    vinculos_total += 1
                            except Exception as e:
                                err = str(e).lower()
                                # Erros esperados do trigger → pula o aluno
                                if any(k in err for k in ("já participa", "limite de atletas", "faixa", "naipe", "sexo")):
                                    await cur.execute(f"ROLLBACK TO SAVEPOINT {sp}")
                                    continue
                                await conn.rollback()
                                raise RuntimeError(f"Erro ao vincular estudante: {e}") from e

                        print(f"    OK      [{label}]: {vinculos_equipe}/{limite} atleta(s)", flush=True)

                    except Exception as e:
                        await conn.rollback()
                        raise RuntimeError(
                            f"Erro ao criar equipe (escola {escola_idx + 1}, variante {ev['id']}): {e}"
                        ) from e

            await conn.commit()

            print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Seed JELS concluído com sucesso!
  Equipes criadas : {equipes_criadas}
  Equipes puladas : {equipes_puladas}  (sem candidatos elegíveis)
  Vínculos totais : {vinculos_total}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━""", flush=True)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(seed_equipes_jels())
