"""
Roteador de estudantes-atletas: listagem e criação por escola do usuário.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg
from psycopg import errors as pg_errors

from app.schemas import EstudanteAtletaCreate, EstudanteAtletaResponse
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
    return EstudanteAtletaResponse(
        id=row["id"],
        escola_id=row["escola_id"],
        escola_nome=row.get("escola_nome"),
        nome=row["nome"],
        cpf=row.get("cpf", ""),
        rg=row.get("rg"),
        data_nascimento=row["data_nascimento"].isoformat() if row.get("data_nascimento") else None,
        sexo=row.get("sexo"),
        email=row.get("email"),
        endereco=row.get("endereco"),
        cep=row.get("cep"),
        numero_registro_confederacao=row.get("numero_registro_confederacao"),
        foto_url=row.get("foto_url"),
        responsavel_nome=row["responsavel_nome"],
        responsavel_cpf=row["responsavel_cpf"],
        responsavel_rg=row.get("responsavel_rg"),
        responsavel_celular=row.get("responsavel_celular"),
        responsavel_email=row["responsavel_email"],
        responsavel_nis=row["responsavel_nis"],
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
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
                       e.responsavel_nis, e.created_at, e.updated_at, s.nome_escola AS escola_nome
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
                       e.responsavel_nis, e.created_at, e.updated_at, s.nome_escola AS escola_nome
                FROM estudantes_atletas e
                LEFT JOIN escolas s ON s.id = e.escola_id
                WHERE e.escola_id = %s
                ORDER BY e.nome
                """,
                (escola_id,),
            )
            rows = await cur.fetchall()
    return [_row_to_response(dict(r)) for r in rows]


@router.post("", response_model=EstudanteAtletaResponse, status_code=status.HTTP_201_CREATED)
async def create_estudante_atleta(
    data: EstudanteAtletaCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Cria estudante-atleta na escola do usuário logado. escola_id é herdado do token."""
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

    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO estudantes_atletas (
                escola_id, nome, cpf, rg, data_nascimento, sexo, email, endereco, cep,
                numero_registro_confederacao, foto_url, responsavel_nome, responsavel_cpf, responsavel_rg,
                responsavel_celular, responsavel_email, responsavel_nis
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id, escola_id, nome, cpf, rg, data_nascimento, sexo, email, endereco, cep,
                      numero_registro_confederacao, foto_url, responsavel_nome, responsavel_cpf, responsavel_rg,
                      responsavel_celular, responsavel_email, responsavel_nis, created_at, updated_at
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
