"""
Roteador de equipes: listagem e criação por escola do usuário.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import EquipeCreate, EquipeResponse, EquipeEstudanteItem
from app.auth import get_current_user_with_escola
from app.database import get_db

router = APIRouter(prefix="/equipes", tags=["equipes"])
logger = logging.getLogger(__name__)


def _row_to_response(row: dict, estudantes: list[EquipeEstudanteItem] | None = None) -> EquipeResponse:
    """Converte row do banco para EquipeResponse."""
    return EquipeResponse(
        id=row["id"],
        escola_id=row["escola_id"],
        modalidade_id=row["modalidade_id"],
        categoria_id=row["categoria_id"],
        modalidade_nome=row.get("modalidade_nome"),
        categoria_nome=row.get("categoria_nome"),
        professor_tecnico_id=row["professor_tecnico_id"],
        professor_tecnico_nome=row.get("professor_tecnico_nome"),
        estudantes=estudantes or [],
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


@router.get("", response_model=list[EquipeResponse])
async def list_equipes(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user_with_escola),
):
    """Lista equipes da escola do usuário logado, com modalidade, categoria, técnico e estudantes."""
    escola_id = current_user["escola_id"]
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.escola_id, e.modalidade_id, e.categoria_id, e.professor_tecnico_id,
                   e.created_at, e.updated_at,
                   m.nome AS modalidade_nome, c.nome AS categoria_nome, p.nome AS professor_tecnico_nome
            FROM equipes e
            LEFT JOIN modalidades m ON m.id = e.modalidade_id
            LEFT JOIN categorias c ON c.id = e.categoria_id
            LEFT JOIN professores_tecnicos p ON p.id = e.professor_tecnico_id
            WHERE e.escola_id = %s
            ORDER BY e.id
            """,
            (escola_id,),
        )
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
    """Cria equipe na escola do usuário. Valida que professor e estudantes pertencem à mesma escola."""
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

        # Validar modalidade e categoria existem
        await cur.execute("SELECT id FROM modalidades WHERE id = %s", (data.modalidade_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modalidade não encontrada")
        await cur.execute("SELECT id FROM categorias WHERE id = %s", (data.categoria_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoria não encontrada")

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
            INSERT INTO equipes (escola_id, modalidade_id, categoria_id, professor_tecnico_id)
            VALUES (%s, %s, %s, %s)
            RETURNING id, escola_id, modalidade_id, categoria_id, professor_tecnico_id, created_at, updated_at
            """,
            (escola_id, data.modalidade_id, data.categoria_id, data.professor_tecnico_id),
        )
        equipe_row = await cur.fetchone()
        if not equipe_row:
            await conn.rollback()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao criar equipe")

        equipe_id = equipe_row["id"]
        for sid in data.estudante_ids:
            await cur.execute(
                "INSERT INTO equipe_estudantes (equipe_id, estudante_id) VALUES (%s, %s)",
                (equipe_id, sid),
            )
        await conn.commit()

    # Montar resposta com JOINs
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT e.id, e.escola_id, e.modalidade_id, e.categoria_id, e.professor_tecnico_id,
                   e.created_at, e.updated_at,
                   m.nome AS modalidade_nome, c.nome AS categoria_nome, p.nome AS professor_tecnico_nome
            FROM equipes e
            LEFT JOIN modalidades m ON m.id = e.modalidade_id
            LEFT JOIN categorias c ON c.id = e.categoria_id
            LEFT JOIN professores_tecnicos p ON p.id = e.professor_tecnico_id
            WHERE e.id = %s
            """,
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
