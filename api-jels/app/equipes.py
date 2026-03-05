"""
Roteador de equipes: listagem e criação por escola do usuário.
Validações de idade e naipe são feitas pelo trigger no banco ao inserir em equipe_estudantes.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import EquipeCreate, EquipeResponse, EquipeEstudanteItem
from app.auth import get_current_user, get_current_user_with_escola, is_admin
from app.database import get_db

router = APIRouter(prefix="/equipes", tags=["equipes"])
logger = logging.getLogger(__name__)


def _row_to_response(row: dict, estudantes: list[EquipeEstudanteItem] | None = None) -> EquipeResponse:
    """Converte row do banco para EquipeResponse."""
    return EquipeResponse(
        id=row["id"],
        escola_id=row["escola_id"],
        escola_nome=row.get("escola_nome"),
        esporte_variante_id=str(row["esporte_variante_id"]),
        esporte_nome=row.get("esporte_nome"),
        esporte_icone=row.get("esporte_icone"),
        categoria_nome=row.get("categoria_nome"),
        naipe_nome=row.get("naipe_nome"),
        tipo_modalidade_nome=row.get("tipo_modalidade_nome"),
        professor_tecnico_id=row["professor_tecnico_id"],
        professor_tecnico_nome=row.get("professor_tecnico_nome"),
        estudantes=estudantes or [],
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


def _get_equipes_sql(where_clause: str = "") -> str:
    return f"""
        SELECT e.id, e.escola_id, e.esporte_variante_id, e.professor_tecnico_id,
               e.created_at, e.updated_at,
               esp.nome AS esporte_nome, esp.icone AS esporte_icone,
               c.nome AS categoria_nome, n.nome AS naipe_nome, tm.nome AS tipo_modalidade_nome,
               p.nome AS professor_tecnico_nome, s.nome_escola AS escola_nome
        FROM equipes e
        JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id
        JOIN esportes esp ON esp.id = ev.esporte_id
        JOIN categorias c ON c.id = ev.categoria_id
        JOIN naipes n ON n.id = ev.naipe_id
        JOIN tipos_modalidade tm ON tm.id = ev.tipo_modalidade_id
        LEFT JOIN professores_tecnicos p ON p.id = e.professor_tecnico_id
        LEFT JOIN escolas s ON s.id = e.escola_id
        {where_clause}
        ORDER BY s.nome_escola NULLS LAST, e.id
    """


@router.get("", response_model=list[EquipeResponse])
async def list_equipes(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista equipes: admin vê todas; diretor/coordenador vê apenas da sua escola."""
    if is_admin(current_user):
        sql = _get_equipes_sql("")
        params = ()
    else:
        escola_id = current_user.get("escola_id")
        if escola_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso restrito a usuários vinculados a uma escola (diretor/coordenador).",
            )
        sql = _get_equipes_sql("WHERE e.escola_id = %s")
        params = (escola_id,)

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


@router.post("", response_model=EquipeResponse, status_code=status.HTTP_201_CREATED)
async def create_equipe(
    data: EquipeCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Cria equipe na escola do usuário. Valida professor e estudantes. Idade/naipe validados pelo banco."""
    escola_id = current_user["escola_id"]

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
            "SELECT id FROM esporte_variantes WHERE id = %s",
            (data.esporte_variante_id,),
        )
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variante não encontrada")

        # Validar todos os estudantes existem e pertencem à escola
        for sid in data.estudante_ids:
            await cur.execute(
                "SELECT id, escola_id FROM estudantes_atletas WHERE id = %s",
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

        # Inserir equipe
        await cur.execute(
            """
            INSERT INTO equipes (escola_id, esporte_variante_id, professor_tecnico_id)
            VALUES (%s, %s, %s)
            RETURNING id, escola_id, esporte_variante_id, professor_tecnico_id, created_at, updated_at
            """,
            (escola_id, data.esporte_variante_id, data.professor_tecnico_id),
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
            # Trigger pode ter rejeitado por idade ou naipe
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc) if "não pode ser cadastrado" in str(exc) else "Erro ao vincular estudantes. Verifique idade e naipe.",
            )
        await conn.commit()

    # Montar resposta com JOINs
    async with conn.cursor() as cur:
        await cur.execute(
            _get_equipes_sql("WHERE e.id = %s"),
            (equipe_id,),
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
    estudantes = [
        EquipeEstudanteItem(id=er["id"], nome=er["nome"], cpf=er.get("cpf"))
        for er in est_rows
    ]
    return _row_to_response(dict(row), estudantes)
