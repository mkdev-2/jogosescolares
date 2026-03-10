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
    EscolaModalidadesUpdate,
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


def _row_solicitacao_to_adesao_response(row: dict) -> dict:
    """Converte row de solicitacoes para formato EscolaAdesaoResponse (compatível com frontend)."""
    dados_diretor = row.get("dados_diretor")
    if isinstance(dados_diretor, dict):
        dados_diretor = {k: v for k, v in dados_diretor.items() if k != "password_hash"}
    status_adesao = row.get("status")
    if status_adesao == "ACEITO":
        status_adesao = "APROVADA"
    elif status_adesao == "NEGADO":
        status_adesao = "REJEITADA"
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
        "status_adesao": status_adesao,
        "dados_diretor": dados_diretor,
        "dados_coordenador": row.get("dados_coordenador"),
        "modalidades_adesao": row.get("modalidades_adesao"),
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
    }


@router.get("/adesoes", response_model=list[EscolaAdesaoResponse])
async def list_adesoes(
    status: str | None = None,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista solicitações de adesão (tabela solicitacoes). Filtro: status=PENDENTE|ACEITO|NEGADO (ou APROVADA/REJEITADA para compat)."""
    _require_admin(current_user)
    status_map = {"PENDENTE": "PENDENTE", "APROVADA": "ACEITO", "REJEITADA": "NEGADO", "ACEITO": "ACEITO", "NEGADO": "NEGADO"}
    db_status = status_map.get(status, status) if status else None
    if status and db_status not in ("PENDENTE", "ACEITO", "NEGADO"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="status deve ser PENDENTE, ACEITO ou NEGADO")
    async with conn.cursor() as cur:
        if db_status:
            await cur.execute(
                """
                SELECT id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone,
                       status, dados_diretor, dados_coordenador, modalidades_adesao,
                       escola_id, created_at, updated_at
                FROM solicitacoes
                WHERE status = %s
                ORDER BY created_at DESC
                """,
                (db_status,),
            )
        else:
            await cur.execute(
                """
                SELECT id, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone,
                       status, dados_diretor, dados_coordenador, modalidades_adesao,
                       escola_id, created_at, updated_at
                FROM solicitacoes
                ORDER BY created_at DESC
                """
            )
        rows = await cur.fetchall()
    return [_row_solicitacao_to_adesao_response(r) for r in rows]


@router.patch("/minha-escola/modalidades", status_code=status.HTTP_200_OK)
async def update_minha_escola_modalidades(
    data: EscolaModalidadesUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza as modalidades da escola do usuário logado. Para uso do diretor (usa escola_id do token)."""
    if current_user.get("role") != "DIRETOR":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o diretor pode editar as modalidades da sua escola por este endpoint.",
        )
    escola_id = current_user.get("escola_id")
    if escola_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário não está vinculado a uma escola.",
        )
    escola_id = int(escola_id)
    modalidades_json = json.dumps({"variante_ids": data.variante_ids})
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM escolas WHERE id = %s",
            (escola_id,),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escola não encontrada")
        await cur.execute(
            "UPDATE escolas SET modalidades_adesao = %s::jsonb, updated_at = NOW() WHERE id = %s",
            (modalidades_json, escola_id),
        )
        await conn.commit()
    return {"message": "Modalidades atualizadas.", "variante_ids": data.variante_ids}


@router.patch("/{escola_id}/modalidades", status_code=status.HTTP_200_OK)
async def update_escola_modalidades(
    escola_id: int,
    data: EscolaModalidadesUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza as modalidades (variantes) em que a escola está vinculada. Diretor só pode editar a própria escola."""
    role = current_user.get("role")
    user_escola_id = current_user.get("escola_id")
    if role == "DIRETOR":
        if user_escola_id is None or int(escola_id) != int(user_escola_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode editar as modalidades da sua escola.",
            )
    elif role not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado.",
        )

    modalidades_json = json.dumps({"variante_ids": data.variante_ids})
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM escolas WHERE id = %s",
            (escola_id,),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escola não encontrada")
        await cur.execute(
            "UPDATE escolas SET modalidades_adesao = %s::jsonb, updated_at = NOW() WHERE id = %s",
            (modalidades_json, escola_id),
        )
        await conn.commit()
    return {"message": "Modalidades atualizadas.", "variante_ids": data.variante_ids}


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


@router.post("/{solicitacao_id}/aprovar", status_code=status.HTTP_200_OK)
async def aprovar_adesao(
    solicitacao_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Aprova solicitação: cria escola, usuário DIRETOR e marca solicitação como ACEITO. Apenas admin."""
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, status, nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone,
                   dados_diretor, dados_coordenador, modalidades_adesao
            FROM solicitacoes WHERE id = %s
            """,
            (solicitacao_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")
    if row["status"] != "PENDENTE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solicitação já foi aprovada ou negada.",
        )
    dados_diretor = row.get("dados_diretor")
    if not isinstance(dados_diretor, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dados do diretor não encontrados para esta solicitação.",
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
            "SELECT id FROM escolas WHERE inep = %s OR cnpj = %s",
            (row["inep"], row["cnpj"]),
        )
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Escola já cadastrada com este INEP ou CNPJ.",
            )
        # 1. Criar escola
        modalidades = row.get("modalidades_adesao")
        modalidades_json = json.dumps(modalidades) if modalidades else None
        dados_coord = row.get("dados_coordenador")
        dados_coord_json = json.dumps(dados_coord) if dados_coord else None
        await cur.execute(
            """
            INSERT INTO escolas (nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone,
                                dados_coordenador, status_adesao, modalidades_adesao)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, 'APROVADA', %s::jsonb)
            RETURNING id
            """,
            (
                row["nome_escola"],
                row["inep"],
                row["cnpj"],
                row["endereco"],
                row["cidade"],
                row["uf"],
                row["email"],
                row["telefone"],
                dados_coord_json,
                modalidades_json,
            ),
        )
        escola_row = await cur.fetchone()
        escola_id = escola_row["id"]
        # 2. Criar usuário diretor
        await cur.execute(
            """
            INSERT INTO users (cpf, email, password_hash, nome, role, escola_id, status)
            VALUES (%s, NULL, %s, %s, 'DIRETOR', %s, 'ATIVO')
            RETURNING id, cpf, nome, role, escola_id, status
            """,
            (cpf_clean, password_hash, nome.strip(), escola_id),
        )
        new_user = await cur.fetchone()
        # 3. Atualizar solicitação
        await cur.execute(
            "UPDATE solicitacoes SET status = 'ACEITO', escola_id = %s WHERE id = %s",
            (escola_id, solicitacao_id),
        )
        await conn.commit()
    return {
        "message": "Solicitação aprovada. Escola e usuário diretor criados.",
        "user": {
            "id": new_user["id"],
            "cpf": new_user["cpf"],
            "nome": new_user["nome"],
            "role": new_user["role"],
            "escola_id": new_user["escola_id"],
        },
    }


@router.post("/{solicitacao_id}/negar", status_code=status.HTTP_200_OK)
async def negar_solicitacao(
    solicitacao_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Nega solicitação de adesão. Apenas admin."""
    _require_admin(current_user)
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, status FROM solicitacoes WHERE id = %s",
            (solicitacao_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitação não encontrada")
    if row["status"] != "PENDENTE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solicitação já foi aprovada ou negada.",
        )
    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE solicitacoes SET status = 'NEGADO' WHERE id = %s",
            (solicitacao_id,),
        )
        await conn.commit()
    return {"message": "Solicitação negada."}


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


@router.post("/publico", status_code=status.HTTP_201_CREATED)
async def create_escola_publico(
    data: AdesaoCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Cadastro público: cria solicitação de adesão (PENDENTE). Escola e diretor só são criados quando admin aprovar."""
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
        # Verificar se já existe escola com mesmo INEP/CNPJ
        await cur.execute("SELECT id FROM escolas WHERE inep = %s OR cnpj = %s", (inep_clean, cnpj_clean))
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Escola já cadastrada com este INEP ou CNPJ",
            )
        # Verificar solicitação pendente duplicada (mesmo INEP/CNPJ)
        await cur.execute(
            "SELECT id FROM solicitacoes WHERE (inep = %s OR cnpj = %s) AND status = 'PENDENTE'",
            (inep_clean, cnpj_clean),
        )
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe uma solicitação pendente para este INEP ou CNPJ",
            )

        await cur.execute(
            """
            INSERT INTO solicitacoes (
                nome_escola, inep, cnpj, endereco, cidade, uf, email, telefone,
                dados_diretor, dados_coordenador, modalidades_adesao
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb)
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
                modalidades_json,
            ),
        )
        row = await cur.fetchone()
        await conn.commit()
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
