"""
Roteador de escolas: CRUD de escolas e adesão (formulário público, listagem de pendentes, aprovação).
"""
import json
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import (
    EscolaCreate,
    EscolaResponse,
    AdesaoCreate,
    EscolaAdesaoResponse,
)
from app.auth import get_current_user
from app.database import get_db
from app.security import get_password_hash

router = APIRouter(prefix="/api/escolas", tags=["escolas"])
logger = logging.getLogger(__name__)

ADMIN_ROLES = {"SUPER_ADMIN", "ADMIN"}


def _require_admin(current_user: dict) -> dict:
    """Garante que o usuário é SUPER_ADMIN ou ADMIN."""
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem acessar.",
        )
    return current_user


def _row_to_response(row: dict) -> dict:
    """Converte row do banco para resposta (EscolaResponse)."""
    return {
        "id": row["id"],
        "nome_escola": row["nome_escola"],
        "inep": row["inep"],
        "cnpj": row["cnpj"],
        "endereco": row["endereco"],
        "cidade": row["cidade"],
        "uf": row["uf"],
        "email": row["email"],
        "telefone": row["telefone"],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
    }


def _row_to_adesao_response(row: dict) -> dict:
    """Converte row do banco para resposta com dados de adesão (EscolaAdesaoResponse). Não expõe password_hash."""
    dados_diretor = row.get("dados_diretor")
    if isinstance(dados_diretor, dict):
        dados_diretor = {k: v for k, v in dados_diretor.items() if k != "password_hash"}
    return {
        "id": row["id"],
        "nome_escola": row["nome_escola"],
        "inep": row["inep"],
        "cnpj": row["cnpj"],
        "endereco": row["endereco"],
        "cidade": row["cidade"],
        "uf": row["uf"],
        "email": row["email"],
        "telefone": row["telefone"],
        "status_adesao": row.get("status_adesao"),
        "dados_diretor": dados_diretor,
        "dados_coordenador": row.get("dados_coordenador"),
        "modalidades_adesao": row.get("modalidades_adesao"),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
    }


@router.get("", response_model=list[EscolaResponse])
async def list_escolas(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista todas as escolas (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, created_at, updated_at "
            "FROM escolas ORDER BY nome_escola"
        )
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/adesoes", response_model=list[EscolaAdesaoResponse])
async def list_adesoes(
    status: str | None = None,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista escolas com dados de adesão (para painel do admin). Filtro opcional: status=PENDENTE|APROVADA|REJEITADA."""
    _require_admin(current_user)
    if status and status not in ("PENDENTE", "APROVADA", "REJEITADA"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="status deve ser PENDENTE, APROVADA ou REJEITADA")
    async with conn.cursor() as cur:
        if status:
            await cur.execute(
                """
                SELECT id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone,
                       status_adesao, dados_diretor, dados_coordenador, modalidades_adesao,
                       created_at, updated_at
                FROM escolas
                WHERE status_adesao = %s
                ORDER BY created_at DESC
                """,
                (status,),
            )
        else:
            await cur.execute(
                """
                SELECT id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone,
                       status_adesao, dados_diretor, dados_coordenador, modalidades_adesao,
                       created_at, updated_at
                FROM escolas
                WHERE status_adesao IS NOT NULL
                ORDER BY created_at DESC
                """
            )
        rows = await cur.fetchall()
    return [_row_to_adesao_response(r) for r in rows]


@router.get("/{escola_id}", response_model=EscolaResponse)
async def get_escola(
    escola_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtém escola por ID."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, created_at, updated_at "
            "FROM escolas WHERE id = %s",
            (escola_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escola não encontrada")
    return _row_to_response(row)


@router.post("/{escola_id}/aprovar", status_code=status.HTTP_200_OK)
async def aprovar_adesao(
    escola_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Aprova adesão da escola: cria usuário DIRETOR com dados e senha do termo e marca escola como APROVADA. Apenas admin."""
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, status_adesao, dados_diretor
            FROM escolas WHERE id = %s
            """,
            (escola_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escola não encontrada")
    if row["status_adesao"] != "PENDENTE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Escola já foi aprovada ou rejeitada.",
        )
    dados_diretor = row.get("dados_diretor")
    if not isinstance(dados_diretor, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dados do diretor não encontrados para esta adesão.",
        )
    cpf = dados_diretor.get("cpf")
    nome = dados_diretor.get("nome")
    password_hash = dados_diretor.get("password_hash")
    if not cpf or not nome or not password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dados do diretor incompletos (cpf, nome ou senha).",
        )
    cpf_clean = "".join(filter(str.isdigit, str(cpf)))
    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM users WHERE cpf = %s", (cpf_clean,))
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe um usuário cadastrado com o CPF do diretor.",
            )
        await cur.execute(
            """
            INSERT INTO users (cpf, email, password_hash, nome, role, escola_id, status)
            VALUES (%s, NULL, %s, %s, 'DIRETOR', %s, 'ATIVO')
            RETURNING id, cpf, nome, role, escola_id, status
            """,
            (cpf_clean, password_hash, nome.strip(), escola_id),
        )
        new_user = await cur.fetchone()
        await cur.execute(
            "UPDATE escolas SET status_adesao = %s WHERE id = %s",
            ("APROVADA", escola_id),
        )
        await conn.commit()
    return {
        "message": "Adesão aprovada. Usuário diretor criado.",
        "user": {
            "id": new_user["id"],
            "cpf": new_user["cpf"],
            "nome": new_user["nome"],
            "role": new_user["role"],
            "escola_id": new_user["escola_id"],
        },
    }


@router.post("", response_model=EscolaResponse, status_code=status.HTTP_201_CREATED)
async def create_escola(
    data: EscolaCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cria nova escola (requer autenticação)."""
    inep_clean = "".join(filter(str.isdigit, data.inep))
    cnpj_clean = "".join(filter(str.isdigit, data.cnpj))
    if len(inep_clean) != 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INEP deve conter 8 dígitos")
    if len(cnpj_clean) != 14:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CNPJ deve conter 14 dígitos")

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO escolas (nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, created_at, updated_at
            """,
            (
                data.nome_escola.strip(),
                inep_clean,
                cnpj_clean,
                data.endereco.strip(),
                data.cidade.strip(),
                data.uf.strip().upper(),
                data.email.strip(),
                data.telefone.strip(),
            ),
        )
        row = await cur.fetchone()
        await conn.commit()
    return _row_to_response(row)


@router.post("/publico", response_model=EscolaResponse, status_code=status.HTTP_201_CREATED)
async def create_escola_publico(
    data: AdesaoCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Cadastro público de escola (formulário de adesão). Sem autenticação. Persiste instituição, diretor, coordenador e modalidades. Bloqueia após data limite."""
    inep_clean = "".join(filter(str.isdigit, data.inep))
    cnpj_clean = "".join(filter(str.isdigit, data.cnpj))
    if len(inep_clean) != 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INEP deve conter 8 dígitos")
    if len(cnpj_clean) != 14:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CNPJ deve conter 14 dígitos")

    # Verificar data limite de cadastro
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT valor FROM configuracoes WHERE chave = %s",
            ("cadastro_data_limite",),
        )
        row_cfg = await cur.fetchone()
    data_limite_str = row_cfg["valor"] if row_cfg and row_cfg.get("valor") else None
    if data_limite_str:
        try:
            data_limite = date.fromisoformat(data_limite_str.strip()[:10])
            if date.today() > data_limite:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Período de adesão encerrado. O prazo para envio do formulário já foi encerrado.",
                )
        except (ValueError, TypeError):
            pass

    cpf_diretor_clean = "".join(filter(str.isdigit, data.diretor.cpf))
    if len(cpf_diretor_clean) != 11:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF do diretor deve conter 11 dígitos")

    dados_diretor = {
        "nome": data.diretor.nome.strip(),
        "cpf": cpf_diretor_clean,
        "rg": data.diretor.rg.strip(),
        "password_hash": get_password_hash(data.diretor.senha),
    }
    dados_coordenador = {
        "nome": data.coordenador.nome.strip(),
        "cpf": "".join(filter(str.isdigit, data.coordenador.cpf)),
        "rg": data.coordenador.rg.strip(),
        "endereco": data.coordenador.endereco.strip(),
        "email": data.coordenador.email.strip(),
        "telefone": data.coordenador.telefone.strip(),
    }
    if len(dados_coordenador["cpf"]) != 11:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CPF do coordenador deve conter 11 dígitos")

    modalidades_json = json.dumps({"variante_ids": data.variante_ids}) if data.variante_ids else None
    dados_diretor_json = json.dumps(dados_diretor)
    dados_coordenador_json = json.dumps(dados_coordenador)

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM escolas WHERE inep = %s OR cnpj = %s", (inep_clean, cnpj_clean))
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Escola já cadastrada com este INEP ou CNPJ",
            )

        await cur.execute(
            """
            INSERT INTO escolas (
                nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone,
                dados_diretor, dados_coordenador, status_adesao, modalidades_adesao
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s::jsonb)
            RETURNING id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone, created_at, updated_at
            """,
            (
                data.nome_escola.strip(),
                inep_clean,
                cnpj_clean,
                data.endereco.strip(),
                data.cidade.strip(),
                data.uf.strip().upper(),
                data.email.strip(),
                data.telefone.strip(),
                dados_diretor_json,
                dados_coordenador_json,
                "PENDENTE",
                modalidades_json,
            ),
        )
        row = await cur.fetchone()
        await conn.commit()
    return _row_to_response(row)
