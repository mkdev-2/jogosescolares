"""
Roteador de equipes: listagem e criação por escola do usuário.
Validações de idade e naipe são feitas pelo trigger no banco ao inserir em equipe_estudantes.
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
import psycopg

from app.schemas import (
    EquipeCreate,
    EquipeUpdate,
    EquipeResponse,
    EquipeEstudanteItem,
    FichaColetivaResponse,
    FichaColetivaEstudanteItem,
    FichaColetivaProfessorItem,
)
from app.auth import get_current_user, get_current_user_with_escola, is_admin
from app.database import get_db, log_audit
from app.edicao_context import get_escola_modalidades_adesao, resolve_edicao_id

router = APIRouter(prefix="/equipes", tags=["equipes"])
logger = logging.getLogger(__name__)


def _mensagem_erro_trigger_equipe(exc: Exception) -> str:
    """Extrai mensagem amigável do erro do trigger ao vincular estudante à equipe."""
    raw = ""
    if hasattr(exc, "diag") and exc.diag is not None and getattr(exc.diag, "message_primary", None):
        raw = exc.diag.message_primary
    if not raw:
        raw = str(exc)
    # Remover prefixos comuns (ex.: "ERROR: " do driver) e trechos de contexto
    for sep in (" CONTEXT:", " at RAISE", "\n"):
        raw = raw.split(sep)[0]
    msg = raw.strip()
    for prefix in ("ERROR: ", "error: ", "Exception: "):
        if msg.startswith(prefix):
            msg = msg[len(prefix):].strip()
            break
    if "já participa de uma modalidade" in msg or "no máximo uma modalidade Individual e uma Coletiva" in msg:
        return msg if msg else "Cada aluno pode participar de no máximo uma modalidade Individual e uma Coletiva."
    if "não pode ser cadastrado" in msg:
        return msg if msg else "O aluno não atende aos requisitos de idade ou naipe desta modalidade."
    return "Erro ao vincular estudantes. Verifique idade, naipe e limite de modalidades (1 individual e 1 coletiva por aluno)."


def _row_to_response(row: dict, estudantes: list[EquipeEstudanteItem] | None = None) -> EquipeResponse:
    """Converte row do banco para EquipeResponse."""
    return EquipeResponse(
        id=row["id"],
        edicao_id=row.get("edicao_id"),
        escola_id=row["escola_id"],
        escola_nome=row.get("escola_nome"),
        esporte_variante_id=str(row["esporte_variante_id"]),
        esporte_nome=row.get("esporte_nome"),
        esporte_icone=row.get("esporte_icone"),
        esporte_limite_atletas=row.get("esporte_limite_atletas"),
        categoria_nome=row.get("categoria_nome"),
        naipe_nome=row.get("naipe_nome"),
        tipo_modalidade_codigo=row.get("tipo_modalidade_codigo"),
        tipo_modalidade_nome=row.get("tipo_modalidade_nome"),
        professor_tecnico_id=row["professor_tecnico_id"],
        professor_tecnico_nome=row.get("professor_tecnico_nome"),
        professor_auxiliar_id=row.get("professor_auxiliar_id"),
        professor_auxiliar_nome=row.get("professor_auxiliar_nome"),
        estudantes=estudantes or [],
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


def _get_equipes_sql(where_clause: str = "") -> str:
    return f"""
        SELECT e.id, e.edicao_id, e.escola_id, e.esporte_variante_id, e.professor_tecnico_id, e.professor_auxiliar_id,
               e.created_at, e.updated_at,
               esp.nome AS esporte_nome, esp.icone AS esporte_icone,
               esp.limite_atletas AS esporte_limite_atletas,
               c.nome AS categoria_nome, n.nome AS naipe_nome,
               tm.codigo AS tipo_modalidade_codigo, tm.nome AS tipo_modalidade_nome,
               p.nome AS professor_tecnico_nome, pa.nome AS professor_auxiliar_nome, s.nome_escola AS escola_nome
        FROM equipes e
        JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
        JOIN esportes esp ON esp.id = ev.esporte_id
        JOIN categorias c ON c.id = ev.categoria_id
        JOIN naipes n ON n.id = ev.naipe_id
        JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
        LEFT JOIN professores_tecnicos p ON p.id = e.professor_tecnico_id
        LEFT JOIN professores_tecnicos pa ON pa.id = e.professor_auxiliar_id
        LEFT JOIN escolas s ON s.id = e.escola_id
        {where_clause}
        ORDER BY s.nome_escola NULLS LAST, e.id
    """


@router.get("", response_model=list[EquipeResponse])
async def list_equipes(
    edicao_id: int | None = Query(None, description="Filtra pela edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista equipes: admin vê todas; diretor/coordenador vê apenas da sua escola."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    if is_admin(current_user):
        sql = _get_equipes_sql("WHERE e.edicao_id = %s")
        params = (resolved_edicao_id,)
    else:
        escola_id = current_user.get("escola_id")
        if escola_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito a usuários vinculados a uma escola (diretor/coordenador).",
            )
        sql = _get_equipes_sql("WHERE e.escola_id = %s AND e.edicao_id = %s")
        params = (escola_id, resolved_edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(sql, params)
        rows = await cur.fetchall()

    result = []
    async with conn.cursor() as cur:
        for r in rows:
            row = dict(r) if not isinstance(r, dict) else r
            await cur.execute(
                """
                SELECT est.id, est.nome, est.cpf
                FROM equipe_estudantes ee
                JOIN estudantes_atletas est ON est.id = ee.estudante_id
                WHERE ee.equipe_id = %s
                ORDER BY est.nome
                """,
                (row["id"],),
            )
            est_rows = await cur.fetchall()
            estudantes = [
                EquipeEstudanteItem(id=er["id"], nome=er["nome"], cpf=er.get("cpf"))
                for er in est_rows
            ]
            result.append(_row_to_response(row, estudantes))
    return result


def _check_equipe_visible(current_user: dict, escola_id: int | None) -> None:
    """Verifica se o usuário pode acessar a equipe (mesma escola ou admin)."""
    if is_admin(current_user):
        return
    user_escola = current_user.get("escola_id")
    if user_escola is None or escola_id != user_escola:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado a este registro.",
        )


@router.get("/{equipe_id}/ficha-coletiva", response_model=FichaColetivaResponse)
async def get_ficha_coletiva(
    equipe_id: int,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Retorna dados para impressão da Ficha Coletiva JELS. Apenas para equipes de modalidade COLETIVA."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.escola_id, e.professor_tecnico_id,
                   e.professor_auxiliar_id,
                   esp.nome AS esporte_nome, c.nome AS categoria_nome, n.nome AS naipe_nome,
                   tm.codigo AS tipo_modalidade_codigo,
                   s.nome_escola AS escola_nome, s.dados_coordenador AS dados_coordenador,
                   p.nome AS professor_tecnico_nome, p.cref AS professor_tecnico_cref,
                   pa.nome AS professor_auxiliar_nome, pa.cref AS professor_auxiliar_cref
            FROM equipes e
            JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
            JOIN esportes esp ON esp.id = ev.esporte_id
            JOIN categorias c ON c.id = ev.categoria_id
            JOIN naipes n ON n.id = ev.naipe_id
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            LEFT JOIN professores_tecnicos p ON p.id = e.professor_tecnico_id
            LEFT JOIN professores_tecnicos pa ON pa.id = e.professor_auxiliar_id
            LEFT JOIN escolas s ON s.id = e.escola_id
            WHERE e.id = %s AND e.edicao_id = %s
            """,
            (equipe_id, resolved_edicao_id),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipe não encontrada")
    _check_equipe_visible(current_user, row["escola_id"])

    if row.get("tipo_modalidade_codigo") != "COLETIVAS":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ficha Coletiva está disponível apenas para equipes de modalidades coletivas.",
        )

    dados_coord = row.get("dados_coordenador") or {}
    if isinstance(dados_coord, str):
        try:
            dados_coord = json.loads(dados_coord)
        except Exception:
            dados_coord = {}
    if not isinstance(dados_coord, dict):
        dados_coord = {}

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT est.nome, est.data_nascimento
            FROM equipe_estudantes ee
            JOIN estudantes_atletas est ON est.id = ee.estudante_id
            WHERE ee.equipe_id = %s
            ORDER BY est.nome
            """,
            (equipe_id,),
        )
        est_rows = await cur.fetchall()

    estudantes = [
        FichaColetivaEstudanteItem(
            nome=er["nome"],
            data_nascimento=er["data_nascimento"].strftime("%d/%m/%Y") if er.get("data_nascimento") else None,
        )
        for er in est_rows
    ]
    professor_nome = row.get("professor_tecnico_nome")
    professor_cref = row.get("professor_tecnico_cref")
    auxiliar_nome = row.get("professor_auxiliar_nome")
    auxiliar_cref = row.get("professor_auxiliar_cref")
    professores_tecnicos = []
    if professor_nome or professor_cref:
        professores_tecnicos.append(FichaColetivaProfessorItem(nome=professor_nome or "", cref=professor_cref))
    if auxiliar_nome or auxiliar_cref:
        professores_tecnicos.append(FichaColetivaProfessorItem(nome=auxiliar_nome or "", cref=auxiliar_cref))

    return FichaColetivaResponse(
        instituicao=row.get("escola_nome"),
        coordenador_nome=dados_coord.get("nome"),
        coordenador_contato=dados_coord.get("telefone"),
        coordenador_email=dados_coord.get("email"),
        modalidade=row.get("esporte_nome"),
        categoria=row.get("categoria_nome"),
        naipe=row.get("naipe_nome"),
        estudantes=estudantes,
        professores_tecnicos=professores_tecnicos,
    )


@router.get("/{equipe_id}", response_model=EquipeResponse)
async def get_equipe(
    equipe_id: int,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtém equipe por ID."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            _get_equipes_sql("WHERE e.id = %s AND e.edicao_id = %s"),
            (equipe_id, resolved_edicao_id),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipe não encontrada")
    _check_equipe_visible(current_user, row["escola_id"])

    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT est.id, est.nome, est.cpf
            FROM equipe_estudantes ee
            JOIN estudantes_atletas est ON est.id = ee.estudante_id
            WHERE ee.equipe_id = %s
            ORDER BY est.nome
            """,
            (equipe_id,),
        )
        est_rows = await cur.fetchall()
    estudantes = [
        EquipeEstudanteItem(id=er["id"], nome=er["nome"], cpf=er.get("cpf"))
        for er in est_rows
    ]
    return _row_to_response(dict(row), estudantes)


@router.post("", response_model=EquipeResponse, status_code=status.HTTP_201_CREATED)
async def create_equipe(
    data: EquipeCreate,
    edicao_id: int | None = Query(None, description="Edição para criação; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Cria equipe na escola do usuário. Valida professor e estudantes. Idade/naipe validados pelo banco."""
    escola_id = current_user["escola_id"]
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        # Validar professor-técnico existe e pertence à escola
        await cur.execute(
            "SELECT id, escola_id FROM professores_tecnicos WHERE id = %s",
            (data.professor_tecnico_id,),
        )
        pt = await cur.fetchone()
        if not pt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor-técnico não encontrado")
        if pt["escola_id"] != escola_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Professor-técnico deve pertencer à sua escola",
            )

        # Validar variante existe
        await cur.execute(
            """
            SELECT ev.id, tm.codigo AS tipo_modalidade_codigo
            FROM esporte_variantes ev
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE ev.id = %s AND ev.edicao_id = %s
            """,
            (data.esporte_variante_id, resolved_edicao_id),
        )
        variante_row = await cur.fetchone()
        if not variante_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante não encontrada na edição selecionada")
        tipo_modalidade_codigo = variante_row.get("tipo_modalidade_codigo")

        professor_auxiliar_id = data.professor_auxiliar_id
        if tipo_modalidade_codigo != "COLETIVAS":
            professor_auxiliar_id = None

        if professor_auxiliar_id is not None:
            if professor_auxiliar_id == data.professor_tecnico_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Técnico e auxiliar devem ser profissionais diferentes.")
            await cur.execute(
                "SELECT id, escola_id FROM professores_tecnicos WHERE id = %s",
                (professor_auxiliar_id,),
            )
            pa = await cur.fetchone()
            if not pa:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor auxiliar não encontrado")
            if pa["escola_id"] != escola_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Professor auxiliar deve pertencer à sua escola")

        # Validar que a variante está entre as selecionadas no cadastro da escola
        variante_ids = await get_escola_modalidades_adesao(conn, escola_id, resolved_edicao_id)
        if variante_ids and data.esporte_variante_id not in variante_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta modalidade não foi selecionada no cadastro da escola. O diretor/coordenador só pode criar equipes para as variantes escolhidas na adesão.",
            )

        # Validar todos os estudantes existem e pertencem à escola
        for sid in data.estudante_ids:
            await cur.execute(
                "SELECT id, escola_id, documentacao_assinada_url FROM estudantes_atletas WHERE id = %s",
                (sid,),
            )
            est = await cur.fetchone()
            if not est:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Estudante com id {sid} não encontrado",
                )
            if est["escola_id"] != escola_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Todos os estudantes devem pertencer à sua escola",
                )
            if not est.get("documentacao_assinada_url") or not str(est.get("documentacao_assinada_url")).strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A equipe só pode ser formada por alunos com documentação assinada.",
                )

        # Validar se a escola já possui equipe nesta variante
        await cur.execute(
            "SELECT id FROM equipes WHERE escola_id = %s AND esporte_variante_id = %s AND edicao_id = %s",
            (escola_id, data.esporte_variante_id, resolved_edicao_id),
        )
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sua escola já possui uma equipe cadastrada para esta modalidade/categoria/naipe.",
            )

        # Inserir equipe
        await cur.execute(
            """
            INSERT INTO equipes (escola_id, esporte_variante_id, professor_tecnico_id, professor_auxiliar_id, edicao_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, escola_id, esporte_variante_id, professor_tecnico_id, professor_auxiliar_id, edicao_id, created_at, updated_at
            """,
            (escola_id, data.esporte_variante_id, data.professor_tecnico_id, professor_auxiliar_id, resolved_edicao_id),
        )
        equipe_row = await cur.fetchone()
        if not equipe_row:
            await conn.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao criar equipe")

        equipe_id = equipe_row["id"]
        try:
            for sid in data.estudante_ids:
                await cur.execute(
                    "INSERT INTO equipe_estudantes (equipe_id, estudante_id) VALUES (%s, %s)",
                    (equipe_id, sid),
                )
        except Exception as exc:
            await conn.rollback()
            logger.warning("Erro ao vincular estudante em equipe (trigger): %s", exc)
            detail = _mensagem_erro_trigger_equipe(exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail,
            )
        await conn.commit()

    # Montar resposta com JOINs
    async with conn.cursor() as cur:
        await cur.execute(
            _get_equipes_sql("WHERE e.id = %s AND e.edicao_id = %s"),
            (equipe_id, resolved_edicao_id),
        )
        row = await cur.fetchone()

        # Auditoria
        if row:
            await log_audit(
                conn=conn,
                user_id=current_user["id"],
                acao="CREATE",
                tipo_recurso="EQUIPE",
                recurso_id=equipe_id,
                detalhes_depois=dict(row),
                mensagem=f"Usuário {current_user['nome']} adicionou a Equipe {row['esporte_nome']} ({row['categoria_nome']} {row['naipe_nome']}).",
            )

        await cur.execute(
            """
            SELECT est.id, est.nome, est.cpf
            FROM equipe_estudantes ee
            JOIN estudantes_atletas est ON est.id = ee.estudante_id
            WHERE ee.equipe_id = %s
            ORDER BY est.nome
            """,
            (equipe_id,),
        )
        est_rows = await cur.fetchall()
    estudantes = [
        EquipeEstudanteItem(id=er["id"], nome=er["nome"], cpf=er.get("cpf"))
        for er in est_rows
    ]
    return _row_to_response(dict(row), estudantes)


@router.put("/{equipe_id}", response_model=EquipeResponse)
async def update_equipe(
    equipe_id: int,
    data: EquipeUpdate,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Atualiza equipe. Apenas da mesma escola."""
    escola_id = current_user["escola_id"]
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)

    async with conn.cursor() as cur:
        await cur.execute(
            _get_equipes_sql("WHERE e.id = %s AND e.edicao_id = %s"),
            (equipe_id, resolved_edicao_id),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipe não encontrada")
    _check_equipe_visible(current_user, existing["escola_id"])

    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        async with conn.cursor() as cur:
            await cur.execute(
                _get_equipes_sql("WHERE e.id = %s AND e.edicao_id = %s"),
                (equipe_id, resolved_edicao_id),
            )
            row = await cur.fetchone()
            await cur.execute(
                """
                SELECT est.id, est.nome, est.cpf
                FROM equipe_estudantes ee
                JOIN estudantes_atletas est ON est.id = ee.estudante_id
                WHERE ee.equipe_id = %s
                ORDER BY est.nome
                """,
                (equipe_id,),
            )
            est_rows = await cur.fetchall()
        estudantes = [EquipeEstudanteItem(id=er["id"], nome=er["nome"], cpf=er.get("cpf")) for er in est_rows]
        return _row_to_response(dict(row), estudantes)

    async with conn.cursor() as cur:
        if "professor_tecnico_id" in updates:
            await cur.execute(
                "SELECT id, escola_id FROM professores_tecnicos WHERE id = %s",
                (updates["professor_tecnico_id"],),
            )
            pt = await cur.fetchone()
            if not pt or pt["escola_id"] != escola_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Professor-técnico deve pertencer à sua escola")

        final_variante_id = updates.get("esporte_variante_id", existing["esporte_variante_id"])
        await cur.execute(
            """
            SELECT tm.codigo AS tipo_modalidade_codigo
            FROM esporte_variantes ev
            JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
            WHERE ev.id = %s AND ev.edicao_id = %s
            """,
            (final_variante_id, resolved_edicao_id),
        )
        final_variante_tipo = await cur.fetchone()
        if not final_variante_tipo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante não encontrada na edição selecionada")
        final_tipo_codigo = final_variante_tipo.get("tipo_modalidade_codigo")
        final_tecnico_id = updates.get("professor_tecnico_id", existing["professor_tecnico_id"])
        final_auxiliar_id = updates.get("professor_auxiliar_id", existing.get("professor_auxiliar_id"))
        if final_tipo_codigo != "COLETIVAS":
            final_auxiliar_id = None

        if "professor_auxiliar_id" in updates and updates["professor_auxiliar_id"] is not None:
            await cur.execute(
                "SELECT id, escola_id FROM professores_tecnicos WHERE id = %s",
                (updates["professor_auxiliar_id"],),
            )
            pa = await cur.fetchone()
            if not pa or pa["escola_id"] != escola_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Professor auxiliar deve pertencer à sua escola")
        if final_auxiliar_id is not None and final_auxiliar_id == final_tecnico_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Técnico e auxiliar devem ser profissionais diferentes.")

        if "esporte_variante_id" in updates:
            variante_ids = await get_escola_modalidades_adesao(conn, escola_id, resolved_edicao_id)
            if variante_ids and updates["esporte_variante_id"] not in variante_ids:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Modalidade não vinculada à escola")

        if "estudante_ids" in updates:
            for sid in updates["estudante_ids"]:
                await cur.execute(
                    "SELECT id, escola_id, documentacao_assinada_url FROM estudantes_atletas WHERE id = %s",
                    (sid,),
                )
                est = await cur.fetchone()
                if not est or est["escola_id"] != escola_id:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Todos os estudantes devem pertencer à sua escola")
                if not est.get("documentacao_assinada_url") or not str(est.get("documentacao_assinada_url")).strip():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="A equipe só pode ser formada por alunos com documentação assinada.",
                    )

        if "professor_tecnico_id" in updates:
            await cur.execute(
                "UPDATE equipes SET professor_tecnico_id = %s, updated_at = NOW() WHERE id = %s",
                (updates["professor_tecnico_id"], equipe_id),
            )
        if "professor_auxiliar_id" in updates or final_tipo_codigo != "COLETIVAS":
            await cur.execute(
                "UPDATE equipes SET professor_auxiliar_id = %s, updated_at = NOW() WHERE id = %s",
                (final_auxiliar_id, equipe_id),
            )
        if "esporte_variante_id" in updates:
            # Validar se já existe outra equipe com esta variante
            await cur.execute(
                "SELECT id FROM equipes WHERE escola_id = %s AND esporte_variante_id = %s AND edicao_id = %s AND id <> %s",
                (escola_id, updates["esporte_variante_id"], resolved_edicao_id, equipe_id),
            )
            if await cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Sua escola já possui outra equipe cadastrada para esta modalidade/categoria/naipe.",
                )

            await cur.execute(
                "UPDATE equipes SET esporte_variante_id = %s, updated_at = NOW() WHERE id = %s",
                (updates["esporte_variante_id"], equipe_id),
            )
        if "estudante_ids" in updates:
            await cur.execute("DELETE FROM equipe_estudantes WHERE equipe_id = %s", (equipe_id,))
            try:
                for sid in updates["estudante_ids"]:
                    await cur.execute(
                        "INSERT INTO equipe_estudantes (equipe_id, estudante_id) VALUES (%s, %s)",
                        (equipe_id, sid),
                    )
            except Exception as exc:
                await conn.rollback()
                logger.warning("Erro ao vincular estudante em equipe (trigger) no update: %s", exc)
                detail = _mensagem_erro_trigger_equipe(exc)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=detail,
                )
        await conn.commit()

        # Auditoria: pegar estado após update
        async with conn.cursor() as cur:
            await cur.execute(_get_equipes_sql("WHERE e.id = %s AND e.edicao_id = %s"), (equipe_id, resolved_edicao_id))
            after = await cur.fetchone()

        if after:
            await log_audit(
                conn=conn,
                user_id=current_user["id"],
                acao="UPDATE",
                tipo_recurso="EQUIPE",
                recurso_id=equipe_id,
                detalhes_antes=dict(existing),
                detalhes_depois=dict(after),
                mensagem=f"Usuário {current_user['nome']} alterou dados da Equipe {after['esporte_nome']} ({after['categoria_nome']} {after['naipe_nome']}).",
            )

    async with conn.cursor() as cur:
        await cur.execute(_get_equipes_sql("WHERE e.id = %s AND e.edicao_id = %s"), (equipe_id, resolved_edicao_id))
        row = await cur.fetchone()
        await cur.execute(
            """
            SELECT est.id, est.nome, est.cpf
            FROM equipe_estudantes ee
            JOIN estudantes_atletas est ON est.id = ee.estudante_id
            WHERE ee.equipe_id = %s
            ORDER BY est.nome
            """,
            (equipe_id,),
        )
        est_rows = await cur.fetchall()
    estudantes = [EquipeEstudanteItem(id=er["id"], nome=er["nome"], cpf=er.get("cpf")) for er in est_rows]
    return _row_to_response(dict(row), estudantes)


@router.delete("/{equipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipe(
    equipe_id: int,
    edicao_id: int | None = Query(None, description="Contexto de edição; se omitido usa a ativa"),
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove equipe. Apenas da mesma escola."""
    resolved_edicao_id = await resolve_edicao_id(conn, edicao_id)
    async with conn.cursor() as cur:
        await cur.execute(
            _get_equipes_sql("WHERE e.id = %s AND e.edicao_id = %s"),
            (equipe_id, resolved_edicao_id),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipe não encontrada")
    _check_equipe_visible(current_user, existing["escola_id"])

    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM equipe_estudantes WHERE equipe_id = %s", (equipe_id,))
        await cur.execute("DELETE FROM equipes WHERE id = %s RETURNING id", (equipe_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipe não encontrada")
        await conn.commit()

        await log_audit(
            conn=conn,
            user_id=current_user["id"],
            acao="DELETE",
            tipo_recurso="EQUIPE",
            recurso_id=equipe_id,
            detalhes_antes=dict(existing),
            mensagem=f"Usuário {current_user['nome']} excluiu a Equipe {existing['esporte_nome']} ({existing['categoria_nome']} {existing['naipe_nome']}).",
        )
