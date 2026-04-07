"""
Roteador de estudantes-atletas: listagem e criação por escola do usuário.
"""
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
import psycopg
from psycopg import errors as pg_errors

from app.schemas import (
    EstudanteAtletaCreate,
    EstudanteAtletaUpdate,
    EstudanteAtletaResponse,
    EstudanteCredencialResponse,
    ModalidadeSimples,
    ValidacaoDocumentosRequest,
)
from app.auth import get_current_user, get_current_user_with_escola, is_admin
from app.database import get_db, log_audit

router = APIRouter(prefix="/estudantes-atletas", tags=["estudantes-atletas"])
logger = logging.getLogger(__name__)


def _validar_cpf(digitos: str) -> bool:
    """Valida CPF pelo algoritmo de dígitos verificadores."""
    if len(digitos) != 11 or not digitos.isdigit():
        return False
    if len(set(digitos)) == 1:  # todos iguais
        return False
    # Primeiro dígito verificador
    soma = sum(int(digitos[i]) * (10 - i) for i in range(9))
    d1 = 0 if (soma % 11) < 2 else 11 - (soma % 11)
    if d1 != int(digitos[9]):
        return False
    # Segundo dígito verificador
    soma = sum(int(digitos[i]) * (11 - i) for i in range(10))
    d2 = 0 if (soma % 11) < 2 else 11 - (soma % 11)
    return d2 == int(digitos[10])


def _row_to_response(row: dict) -> EstudanteAtletaResponse:
    """Converte row do banco para EstudanteAtletaResponse."""
    r = row if isinstance(row, dict) else dict(row)
    escola_inep_val = r.get("escola_inep")
    escola_inep_out = (str(escola_inep_val).strip() or None) if escola_inep_val is not None else None
    doc_val_em = r.get("documentos_validados_em")
    return EstudanteAtletaResponse(
        id=r["id"],
        escola_id=r["escola_id"],
        escola_nome=r.get("escola_nome"),
        escola_inep=escola_inep_out,
        nome=r["nome"],
        cpf=r.get("cpf", ""),
        rg=r.get("rg"),
        data_nascimento=r["data_nascimento"].isoformat() if r.get("data_nascimento") else None,
        sexo=r.get("sexo"),
        email=r.get("email"),
        endereco=r.get("endereco"),
        cep=r.get("cep"),
        peso=float(r["peso"]) if r.get("peso") is not None else None,
        numero_registro_confederacao=r.get("numero_registro_confederacao"),
        foto_url=r.get("foto_url"),
        responsavel_nome=r["responsavel_nome"],
        responsavel_cpf=r["responsavel_cpf"],
        responsavel_rg=r.get("responsavel_rg"),
        responsavel_celular=r.get("responsavel_celular"),
        responsavel_email=r["responsavel_email"],
        responsavel_nis=r["responsavel_nis"],
        ficha_assinada=r.get("ficha_assinada", False),
        documentacao_assinada_url=r.get("documentacao_assinada_url"),
        documentacao_rg_url=r.get("documentacao_rg_url"),
        documentos_validados=r.get("documentos_validados", False),
        documentos_validados_por=r.get("documentos_validados_por"),
        documentos_validados_por_nome=r.get("documentos_validados_por_nome"),
        documentos_validados_em=doc_val_em.isoformat() if doc_val_em else None,
        created_at=r["created_at"].isoformat() if r.get("created_at") else None,
        updated_at=r["updated_at"].isoformat() if r.get("updated_at") else None,
    )


@router.get("", response_model=list[EstudanteAtletaResponse])
async def list_estudantes_atletas(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista estudantes-atletas: admin vê todos; diretor/coordenador vê apenas da sua escola."""
    if is_admin(current_user):
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT e.id, e.escola_id, e.nome, e.cpf, e.rg, e.data_nascimento, e.sexo, e.email,
                       e.endereco, e.cep, e.peso, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                       e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                       e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url, e.documentacao_rg_url,
                       e.documentos_validados, e.documentos_validados_por, e.documentos_validados_em,
                       u.nome AS documentos_validados_por_nome,
                       e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
                FROM estudantes_atletas e
                LEFT JOIN escolas s ON s.id = e.escola_id
                LEFT JOIN users u ON u.id = e.documentos_validados_por
                ORDER BY s.nome_escola NULLS LAST, e.nome
                """,
            )
            rows = await cur.fetchall()
    else:
        escola_id = current_user.get("escola_id")
        if escola_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito a usuários vinculados a uma escola (diretor/coordenador).",
            )
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT e.id, e.escola_id, e.nome, e.cpf, e.rg, e.data_nascimento, e.sexo, e.email,
                       e.endereco, e.cep, e.peso, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                       e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                       e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url, e.documentacao_rg_url,
                       e.documentos_validados, e.documentos_validados_por, e.documentos_validados_em,
                       u.nome AS documentos_validados_por_nome,
                       e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
                FROM estudantes_atletas e
                LEFT JOIN escolas s ON s.id = e.escola_id
                LEFT JOIN users u ON u.id = e.documentos_validados_por
                WHERE e.escola_id = %s
                ORDER BY e.nome
                """,
                (escola_id,),
            )
            rows = await cur.fetchall()
    return [_row_to_response(dict(r)) for r in rows]


@router.get("/{estudante_id}/modalidades")
async def get_estudante_modalidades(
    estudante_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retorna as modalidades (equipes) em que o estudante participa: esporte, categoria, naipe e tipo."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.escola_id FROM estudantes_atletas e WHERE e.id = %s
            """,
            (estudante_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudante não encontrado")
    _check_estudante_visible(current_user, row["escola_id"])

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT esp.nome AS esporte_nome, esp.icone AS esporte_icone, c.nome AS categoria_nome, n.nome AS naipe_nome, tm.nome AS tipo_nome
            FROM equipe_estudantes ee
            JOIN equipes eq ON eq.id = ee.equipe_id
            JOIN esporte_variantes ev ON ev.id = eq.esporte_variante_id
            JOIN esportes esp ON esp.id = ev.esporte_id
            JOIN categorias c ON c.id = ev.categoria_id
            JOIN naipes n ON n.id = ev.naipe_id
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE ee.estudante_id = %s
            ORDER BY esp.nome, c.idade_min, n.codigo
            """,
            (estudante_id,),
        )
        rows = await cur.fetchall()
    return [
        {
            "esporte_nome": r["esporte_nome"],
            "esporte_icone": r.get("esporte_icone") or "Zap",
            "categoria_nome": r["categoria_nome"],
            "naipe_nome": r["naipe_nome"],
            "tipo_nome": r["tipo_nome"],
        }
        for r in rows
    ]


def _check_estudante_visible(current_user: dict, escola_id: int | None) -> None:
    """Verifica se o usuário pode acessar o estudante (mesma escola ou admin)."""
    if is_admin(current_user):
        return
    user_escola = current_user.get("escola_id")
    if user_escola is None or escola_id != user_escola:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado a este registro.",
        )


@router.get("/escola/{escola_id}/credenciais", response_model=list[EstudanteCredencialResponse])
async def list_escola_credenciais(
    escola_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista estudantes de uma escola com suas modalidades pré-carregadas.
    Otimizado para geração de credenciais (crachás).
    """
    _check_estudante_visible(current_user, escola_id)

    query = """
        WITH student_modalities AS (
            SELECT
                ee.estudante_id,
                jsonb_agg(
                    jsonb_build_object(
                        'esporte_nome', esp.nome,
                        'esporte_icone', esp.icone,
                        'categoria_nome', c.nome,
                        'naipe_nome', n.nome
                    ) ORDER BY esp.nome, c.idade_min, n.codigo
                ) as modalidades
            FROM equipe_estudantes ee
            JOIN equipes eq ON eq.id = ee.equipe_id
            JOIN esporte_variantes ev ON ev.id = eq.esporte_variante_id
            JOIN esportes esp ON esp.id = ev.esporte_id
            JOIN categorias c ON c.id = ev.categoria_id
            JOIN naipes n ON n.id = ev.naipe_id
            WHERE eq.escola_id = %s
            GROUP BY ee.estudante_id
        )
        SELECT
            e.id,
            e.nome,
            e.cpf,
            e.data_nascimento,
            e.foto_url,
            e.documentacao_assinada_url,
            s.nome_escola as escola_nome,
            COALESCE(sm.modalidades, '[]'::jsonb) as modalidades
        FROM estudantes_atletas e
        JOIN escolas s ON s.id = e.escola_id
        LEFT JOIN student_modalities sm ON sm.estudante_id = e.id
        WHERE e.escola_id = %s
        ORDER BY e.nome
    """

    async with conn.cursor() as cur:
        await cur.execute(query, (escola_id, escola_id))
        rows = await cur.fetchall()

    result = []
    for r in rows:
        result.append(
            EstudanteCredencialResponse(
                id=r["id"],
                nome=r["nome"],
                cpf=r["cpf"],
                data_nascimento=r["data_nascimento"].isoformat() if r.get("data_nascimento") else None,
                escola_nome=r["escola_nome"],
                foto_url=r["foto_url"],
                documentacao_assinada_url=r.get("documentacao_assinada_url"),
                modalidades=[ModalidadeSimples(**m) for m in r["modalidades"]],
            )
        )
    return result


@router.post("/escola/{escola_id}/credenciais/auditar")
async def auditar_geracao_credenciais(
    escola_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Registra na auditoria a ação de geração de credenciais de uma escola.
    """
    _check_estudante_visible(current_user, escola_id)

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT
                s.nome_escola,
                COUNT(e.id) AS total_alunos,
                COUNT(*) FILTER (
                    WHERE e.documentacao_assinada_url IS NOT NULL
                      AND TRIM(e.documentacao_assinada_url) <> ''
                ) AS total_documento_assinado
            FROM escolas s
            LEFT JOIN estudantes_atletas e ON e.escola_id = s.id
            WHERE s.id = %s
            GROUP BY s.id, s.nome_escola
            """,
            (escola_id,),
        )
        escola_stats = await cur.fetchone()

    if not escola_stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escola não encontrada")

    total_alunos = int(escola_stats.get("total_alunos") or 0)
    total_documento_assinado = int(escola_stats.get("total_documento_assinado") or 0)
    total_pendentes = total_alunos - total_documento_assinado
    nome_escola = escola_stats.get("nome_escola") or f"ID {escola_id}"

    await log_audit(
        conn=conn,
        user_id=current_user.get("id"),
        acao="CREATE",
        tipo_recurso="CREDENCIAL",
        recurso_id=escola_id,
        detalhes_depois={
            "escola_id": escola_id,
            "escola_nome": nome_escola,
            "total_alunos": total_alunos,
            "documento_assinado": total_documento_assinado,
            "assinatura_pendente": total_pendentes,
        },
        mensagem=(
            f"Usuário {current_user['nome']} gerou credenciais da escola "
            f"{nome_escola} ({total_documento_assinado} aptos, {total_pendentes} pendentes)."
        ),
    )

    return {"ok": True}


@router.get("/cpf/{cpf}")
async def check_cpf_estudante(
    cpf: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Verifica se já existe um estudante cadastrado com este CPF (busca global)."""
    cpf_clean = "".join(filter(str.isdigit, cpf))
    if len(cpf_clean) != 11:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF inválido")

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.nome, s.nome_escola
            FROM estudantes_atletas e
            LEFT JOIN escolas s ON s.id = e.escola_id
            WHERE e.cpf = %s
            LIMIT 1
            """,
            (cpf_clean,),
        )
        row = await cur.fetchone()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum estudante encontrado com este CPF")

    return {"id": row["id"], "nome": row["nome"], "escola_nome": row.get("nome_escola")}


@router.get("/{estudante_id}", response_model=EstudanteAtletaResponse)
async def get_estudante_atleta(
    estudante_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtém estudante-atleta por ID."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.escola_id, e.nome, e.cpf, e.rg, e.data_nascimento, e.sexo, e.email,
                   e.endereco, e.cep, e.peso, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                   e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                   e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url, e.documentacao_rg_url,
                   e.documentos_validados, e.documentos_validados_por, e.documentos_validados_em,
                   u.nome AS documentos_validados_por_nome,
                   e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
            FROM estudantes_atletas e
            LEFT JOIN escolas s ON s.id = e.escola_id
            LEFT JOIN users u ON u.id = e.documentos_validados_por
            WHERE e.id = %s
            """,
            (estudante_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudante não encontrado")
    _check_estudante_visible(current_user, row["escola_id"])
    return _row_to_response(dict(row))


@router.post("", response_model=EstudanteAtletaResponse, status_code=status.HTTP_201_CREATED)
async def create_estudante_atleta(
    data: EstudanteAtletaCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Cria estudante-atleta na escola do usuário logado. escola_id é herdado do token."""
    # Verificar data limite para diretor/coordenador cadastrar alunos
    if not is_admin(current_user):
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT valor FROM configuracoes WHERE chave = %s",
                ("diretor_cadastro_alunos_data_limite",),
            )
            row = await cur.fetchone()
        limit_val = row["valor"] if row and row.get("valor") else None
        if limit_val:
            limit_str = str(limit_val).strip()[:10]
            try:
                limit_date = date.fromisoformat(limit_str)
                if date.today() > limit_date:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="O prazo para cadastro de novos alunos foi encerrado.",
                    )
            except ValueError:
                pass

    escola_id = current_user["escola_id"]
    cpf_clean = "".join(filter(str.isdigit, data.cpf))
    if len(cpf_clean) != 11:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF deve conter 11 dígitos")
    if not _validar_cpf(cpf_clean):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF inválido")

    resp_cpf = "".join(filter(str.isdigit, data.responsavel_cpf))
    if len(resp_cpf) != 11:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF do responsável deve conter 11 dígitos")
    if not _validar_cpf(resp_cpf):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF do responsável inválido")

    row = None
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO estudantes_atletas (
                escola_id, nome, cpf, rg, data_nascimento, sexo, email, endereco, cep,
                peso, numero_registro_confederacao, foto_url, responsavel_nome, responsavel_cpf, responsavel_rg,
                responsavel_celular, responsavel_email, responsavel_nis,
                ficha_assinada, documentacao_assinada_url, documentacao_rg_url
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s
            )
            RETURNING id, escola_id, nome, cpf, rg, data_nascimento, sexo, email, endereco, cep,
                      peso, numero_registro_confederacao, foto_url, responsavel_nome, responsavel_cpf, responsavel_rg,
                      responsavel_celular, responsavel_email, responsavel_nis,
                      ficha_assinada, documentacao_assinada_url, documentacao_rg_url, created_at, updated_at
            """,
            (
                escola_id,
                data.nome.strip(),
                cpf_clean,
                data.rg.strip(),
                data.data_nascimento,
                data.sexo,
                data.email.strip(),
                data.endereco.strip(),
                data.cep.strip(),
                data.peso,
                data.numero_registro_confederacao.strip() if data.numero_registro_confederacao else None,
                data.foto_url,
                data.responsavel_nome.strip(),
                resp_cpf,
                data.responsavel_rg.strip(),
                data.responsavel_celular.strip(),
                data.responsavel_email.strip(),
                data.responsavel_nis.strip(),
                data.ficha_assinada,
                data.documentacao_assinada_url,
                data.documentacao_rg_url,
            ),
            )
            row = await cur.fetchone()
            await conn.commit()

            if row:
                await log_audit(
                    conn=conn,
                    user_id=current_user["id"],
                    acao="CREATE",
                    tipo_recurso="ESTUDANTE",
                    recurso_id=row["id"],
                    detalhes_depois=dict(row),
                    mensagem=f"Usuário {current_user['nome']} adicionou o Aluno {row['nome']}.",
                )
    except pg_errors.UniqueViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um estudante com este CPF nesta escola.",
        ) from e

    if not row:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao criar estudante")
    return _row_to_response(dict(row))


@router.put("/{estudante_id}", response_model=EstudanteAtletaResponse)
async def update_estudante_atleta(
    estudante_id: int,
    data: EstudanteAtletaUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Atualiza estudante-atleta. Apenas da mesma escola."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM estudantes_atletas WHERE id = %s",
            (estudante_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudante não encontrado")
    _check_estudante_visible(current_user, existing["escola_id"])

    updates = data.model_dump(exclude_unset=True)
    if not updates:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT e.id, e.escola_id, e.nome, e.cpf, e.rg, e.data_nascimento, e.sexo, e.email,
                       e.endereco, e.cep, e.peso, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                       e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                       e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url, e.documentacao_rg_url,
                       e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
                FROM estudantes_atletas e
                LEFT JOIN escolas s ON s.id = e.escola_id
                WHERE e.id = %s
                """,
                (estudante_id,),
            )
            row = await cur.fetchone()
        return _row_to_response(dict(row))

    if "cpf" in updates:
        cpf_clean = "".join(filter(str.isdigit, str(updates["cpf"])))
        if len(cpf_clean) != 11 or not _validar_cpf(cpf_clean):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF inválido")
        updates["cpf"] = cpf_clean
    if "responsavel_cpf" in updates:
        resp_cpf = "".join(filter(str.isdigit, str(updates["responsavel_cpf"])))
        if len(resp_cpf) != 11 or not _validar_cpf(resp_cpf):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF do responsável inválido")
        updates["responsavel_cpf"] = resp_cpf

    col_map = {
        "nome": "nome", "cpf": "cpf", "rg": "rg", "data_nascimento": "data_nascimento",
        "sexo": "sexo", "email": "email", "endereco": "endereco", "cep": "cep", "peso": "peso",
        "numero_registro_confederacao": "numero_registro_confederacao", "foto_url": "foto_url",
        "responsavel_nome": "responsavel_nome", "responsavel_cpf": "responsavel_cpf",
        "responsavel_rg": "responsavel_rg", "responsavel_celular": "responsavel_celular",
        "responsavel_email": "responsavel_email", "responsavel_nis": "responsavel_nis",
        "ficha_assinada": "ficha_assinada",
        "documentacao_assinada_url": "documentacao_assinada_url",
        "documentacao_rg_url": "documentacao_rg_url",
    }
    set_parts = []
    vals = []
    for k, v in updates.items():
        if k in col_map:
            set_parts.append(f"{col_map[k]} = %s")
            vals.append(v.strip() if isinstance(v, str) else v)
    if set_parts:
        set_parts.append("updated_at = NOW()")
        vals.append(estudante_id)
        async with conn.cursor() as cur:
            await cur.execute(
                f"UPDATE estudantes_atletas SET {', '.join(set_parts)} WHERE id = %s",
                vals,
            )
            await conn.commit()

            # Auditoria: pegar estado após update
            async with conn.cursor() as cur:
                await cur.execute("SELECT * FROM estudantes_atletas WHERE id = %s", (estudante_id,))
                after = await cur.fetchone()

            if after:
                await log_audit(
                    conn=conn,
                    user_id=current_user["id"],
                    acao="UPDATE",
                    tipo_recurso="ESTUDANTE",
                    recurso_id=estudante_id,
                    detalhes_antes=dict(existing),
                    detalhes_depois=dict(after),
                    mensagem=f"Usuário {current_user['nome']} alterou dados do Aluno {after['nome']}.",
                )

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.escola_id, e.nome, e.cpf, e.rg, e.data_nascimento, e.sexo, e.email,
                   e.endereco, e.cep, e.peso, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                   e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                   e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url, e.documentacao_rg_url,
                   e.documentos_validados, e.documentos_validados_por, e.documentos_validados_em,
                   u.nome AS documentos_validados_por_nome,
                   e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
            FROM estudantes_atletas e
            LEFT JOIN escolas s ON s.id = e.escola_id
            LEFT JOIN users u ON u.id = e.documentos_validados_por
            WHERE e.id = %s
            """,
            (estudante_id,),
        )
        row = await cur.fetchone()
    return _row_to_response(dict(row))


@router.delete("/{estudante_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_estudante_atleta(
    estudante_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove estudante-atleta. Apenas da mesma escola."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT * FROM estudantes_atletas WHERE id = %s",
            (estudante_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudante não encontrado")
    _check_estudante_visible(current_user, existing["escola_id"])

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT COUNT(*) AS cnt FROM equipe_estudantes WHERE estudante_id = %s",
            (estudante_id,),
        )
        r = await cur.fetchone()
        if r and r["cnt"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não é possível excluir: o aluno está vinculado a uma ou mais equipes.",
            )
        await cur.execute("DELETE FROM estudantes_atletas WHERE id = %s RETURNING id", (estudante_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudante não encontrado")
        await conn.commit()

        await log_audit(
            conn=conn,
            user_id=current_user["id"],
            acao="DELETE",
            tipo_recurso="ESTUDANTE",
            recurso_id=estudante_id,
            detalhes_antes=dict(existing),
            mensagem=f"Usuário {current_user['nome']} excluiu o Aluno {existing['nome']}.",
        )


@router.patch("/{estudante_id}/validar-documentos", response_model=EstudanteAtletaResponse)
async def validar_documentos_estudante(
    estudante_id: int,
    data: ValidacaoDocumentosRequest,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Valida (ou revoga a validação de) documentos de inscrição do aluno. Exclusivo para ADMIN/SUPERADMIN."""
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem validar documentos de inscrição.",
        )

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, documentacao_assinada_url FROM estudantes_atletas WHERE id = %s",
            (estudante_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estudante não encontrado")

    if data.validado and not existing["documentacao_assinada_url"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível validar: o aluno não possui ficha de inscrição anexada.",
        )

    if data.validado:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE estudantes_atletas
                SET documentos_validados = TRUE,
                    documentos_validados_por = %s,
                    documentos_validados_em = NOW()
                WHERE id = %s
                """,
                (current_user["id"], estudante_id),
            )
            await conn.commit()
        mensagem = f"Usuário {current_user['nome']} aprovou os documentos de inscrição do Aluno {existing['nome']}."
        acao_audit = "APPROVE"
    else:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE estudantes_atletas
                SET documentos_validados = FALSE,
                    documentos_validados_por = NULL,
                    documentos_validados_em = NULL
                WHERE id = %s
                """,
                (estudante_id,),
            )
            await conn.commit()
        mensagem = f"Usuário {current_user['nome']} revogou a validação dos documentos do Aluno {existing['nome']}."
        acao_audit = "REVOKE"

    await log_audit(
        conn=conn,
        user_id=current_user["id"],
        acao=acao_audit,
        tipo_recurso="ESTUDANTE",
        recurso_id=estudante_id,
        mensagem=mensagem,
    )

    # Retorna o estudante atualizado
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.escola_id, e.nome, e.cpf, e.rg, e.data_nascimento, e.sexo, e.email,
                   e.endereco, e.cep, e.peso, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                   e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                   e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url, e.documentacao_rg_url,
                   e.documentos_validados, e.documentos_validados_por, e.documentos_validados_em,
                   u.nome AS documentos_validados_por_nome,
                   e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
            FROM estudantes_atletas e
            LEFT JOIN escolas s ON s.id = e.escola_id
            LEFT JOIN users u ON u.id = e.documentos_validados_por
            WHERE e.id = %s
            """,
            (estudante_id,),
        )
        row = await cur.fetchone()
    return _row_to_response(dict(row))

