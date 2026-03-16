"""
Roteador de estudantes-atletas: listagem e criação por escola do usuário.
"""
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
import psycopg
from psycopg import errors as pg_errors

from app.schemas import EstudanteAtletaCreate, EstudanteAtletaUpdate, EstudanteAtletaResponse
from app.auth import get_current_user, get_current_user_with_escola, is_admin
from app.database import get_db

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
                       e.endereco, e.cep, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                       e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                       e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url,
                       e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
                FROM estudantes_atletas e
                LEFT JOIN escolas s ON s.id = e.escola_id
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
                       e.endereco, e.cep, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                       e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                       e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url,
                       e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
                FROM estudantes_atletas e
                LEFT JOIN escolas s ON s.id = e.escola_id
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
                   e.endereco, e.cep, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                   e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                   e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url,
                   e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
            FROM estudantes_atletas e
            LEFT JOIN escolas s ON s.id = e.escola_id
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
                numero_registro_confederacao, foto_url, responsavel_nome, responsavel_cpf, responsavel_rg,
                responsavel_celular, responsavel_email, responsavel_nis,
                ficha_assinada, documentacao_assinada_url
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s
            )
            RETURNING id, escola_id, nome, cpf, rg, data_nascimento, sexo, email, endereco, cep,
                      numero_registro_confederacao, foto_url, responsavel_nome, responsavel_cpf, responsavel_rg,
                      responsavel_celular, responsavel_email, responsavel_nis,
                      ficha_assinada, documentacao_assinada_url, created_at, updated_at
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
            ),
            )
            row = await cur.fetchone()
            await conn.commit()
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
            "SELECT id, escola_id FROM estudantes_atletas WHERE id = %s",
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
                       e.endereco, e.cep, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                       e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                       e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url,
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
        "sexo": "sexo", "email": "email", "endereco": "endereco", "cep": "cep",
        "numero_registro_confederacao": "numero_registro_confederacao", "foto_url": "foto_url",
        "responsavel_nome": "responsavel_nome", "responsavel_cpf": "responsavel_cpf",
        "responsavel_rg": "responsavel_rg", "responsavel_celular": "responsavel_celular",
        "responsavel_email": "responsavel_email", "responsavel_nis": "responsavel_nis",
        "ficha_assinada": "ficha_assinada",
        "documentacao_assinada_url": "documentacao_assinada_url",
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

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.escola_id, e.nome, e.cpf, e.rg, e.data_nascimento, e.sexo, e.email,
                   e.endereco, e.cep, e.numero_registro_confederacao, e.foto_url, e.responsavel_nome,
                   e.responsavel_cpf, e.responsavel_rg, e.responsavel_celular, e.responsavel_email,
                   e.responsavel_nis, e.ficha_assinada, e.documentacao_assinada_url,
                   e.created_at, e.updated_at, s.nome_escola AS escola_nome, s.inep AS escola_inep
            FROM estudantes_atletas e
            LEFT JOIN escolas s ON s.id = e.escola_id
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
            "SELECT id, escola_id FROM estudantes_atletas WHERE id = %s",
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
