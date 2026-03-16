"""
Roteador de esportes: CRUD de esportes (Futebol, Judô, Voleibol, etc.).
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
import psycopg

from app.schemas import EsporteCreate, EsporteUpdate, EsporteResponse
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/esportes", tags=["esportes"])
logger = logging.getLogger(__name__)


def _row_to_response(row: dict) -> EsporteResponse:
    """Converte row do banco para EsporteResponse."""
    return EsporteResponse(
        id=str(row["id"]),
        nome=row["nome"],
        descricao=row.get("descricao") or "",
        icone=row.get("icone") or "Zap",
        requisitos=row.get("requisitos") or "",
        limite_atletas=row.get("limite_atletas", 3),
        ativa=row.get("ativa", True),
        created_at=row["created_at"].isoformat() if row.get("created_at") else None,
        updated_at=row["updated_at"].isoformat() if row.get("updated_at") else None,
    )


@router.get("", response_model=list[EsporteResponse])
async def list_esportes(
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Lista todos os esportes."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, nome, descricao, icone, requisitos, limite_atletas, ativa, created_at, updated_at
            FROM esportes
            ORDER BY nome
            """
        )
        rows = await cur.fetchall()
    return [_row_to_response(r) for r in rows]


@router.get("/{esporte_id}", response_model=EsporteResponse)
async def get_esporte(
    esporte_id: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
):
    """Obtém esporte por ID."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT id, nome, descricao, icone, requisitos, limite_atletas, ativa, created_at, updated_at
            FROM esportes
            WHERE id = %s
            """,
            (esporte_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esporte não encontrado")
    return _row_to_response(row)


def _cartesian_product(categoria_ids: list[str], naipe_ids: list[str], tipo_modalidade_ids: list[str]) -> list[tuple[str, str, str]]:
    """Gera produto cartesiano das combinações (categoria_id, naipe_id, tipo_modalidade_id)."""
    if not categoria_ids or not naipe_ids or not tipo_modalidade_ids:
        return []
    result = []
    for c in categoria_ids:
        for n in naipe_ids:
            for t in tipo_modalidade_ids:
                result.append((c, n, t))
    return result


async def _tem_tipo_individual(conn, tipo_modalidade_ids: list[str]) -> bool:
    """Verifica se algum dos tipos de modalidade é INDIVIDUAIS."""
    if not tipo_modalidade_ids:
        return False
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT 1 FROM tipos_modalidade WHERE id = ANY(%s) AND codigo = 'INDIVIDUAIS' LIMIT 1",
            (tipo_modalidade_ids,),
        )
        return await cur.fetchone() is not None


async def _get_tipos_das_variantes(conn, esporte_id: str) -> list[str]:
    """Retorna os tipo_modalidade_id das variantes existentes do esporte."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT tipo_modalidade_id FROM esporte_variantes WHERE esporte_id = %s",
            (esporte_id,),
        )
        rows = await cur.fetchall()
    return [str(r["tipo_modalidade_id"]) for r in rows]


@router.post("", response_model=EsporteResponse, status_code=status.HTTP_201_CREATED)
async def create_esporte(
    data: EsporteCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cria novo esporte e variantes em lote (requer autenticação)."""
    tipo_modalidade_ids = data.tipo_modalidade_ids or []
    tem_individual = await _tem_tipo_individual(conn, tipo_modalidade_ids)
    if tem_individual:
        limite_atletas = 1
    else:
        limite_atletas = data.limite_atletas if data.limite_atletas is not None else 3
    if tem_individual and data.limite_atletas is not None and data.limite_atletas != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Modalidade individual deve ter no máximo 1 atleta por equipe.",
        )
    icone = (data.icone or "Zap").strip() or "Zap"
    categoria_ids = data.categoria_ids or []
    naipe_ids = data.naipe_ids or []

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO esportes (nome, descricao, icone, requisitos, limite_atletas, ativa)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, nome, descricao, icone, requisitos, limite_atletas, ativa, created_at, updated_at
            """,
            (
                data.nome.strip(),
                (data.descricao or "").strip(),
                icone,
                (data.requisitos or "").strip(),
                limite_atletas,
                data.ativa if data.ativa is not None else True,
            ),
        )
        row = await cur.fetchone()
        esporte_id = str(row["id"])

        combos = _cartesian_product(categoria_ids, naipe_ids, tipo_modalidade_ids)
        if combos:
            for tbl, col, vals, name in [
                ("categorias", "id", categoria_ids, "Categoria"),
                ("naipes", "id", naipe_ids, "Naipe"),
                ("tipos_modalidade", "id", tipo_modalidade_ids, "Tipo de modalidade"),
            ]:
                for v in vals:
                    await cur.execute(f"SELECT id FROM {tbl} WHERE id = %s", (v,))
                    if not await cur.fetchone():
                        await conn.rollback()
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{name} não encontrado(a)")

            for cat_id, naipe_id, tipo_id in combos:
                await cur.execute(
                    """
                    INSERT INTO esporte_variantes (esporte_id, categoria_id, naipe_id, tipo_modalidade_id)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (esporte_id, categoria_id, naipe_id, tipo_modalidade_id) DO NOTHING
                    """,
                    (esporte_id, cat_id, naipe_id, tipo_id),
                )
        await conn.commit()

    return _row_to_response(row)


@router.put("/{esporte_id}", response_model=EsporteResponse)
async def update_esporte(
    esporte_id: str,
    data: EsporteUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Atualiza esporte e sincroniza variantes (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, descricao, icone, requisitos, limite_atletas, ativa FROM esportes WHERE id = %s",
            (esporte_id,),
        )
        existing = await cur.fetchone()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esporte não encontrado")

    updates = []
    values = []
    if data.nome is not None:
        updates.append("nome = %s")
        values.append(data.nome.strip())
    if data.descricao is not None:
        updates.append("descricao = %s")
        values.append(data.descricao.strip())
    if data.icone is not None:
        updates.append("icone = %s")
        values.append((data.icone or "Zap").strip() or "Zap")
    if data.requisitos is not None:
        updates.append("requisitos = %s")
        values.append(data.requisitos.strip())
    if data.limite_atletas is not None:
        tipos_para_check = data.tipo_modalidade_ids if data.tipo_modalidade_ids is not None else await _get_tipos_das_variantes(conn, esporte_id)
        tem_individual = await _tem_tipo_individual(conn, tipos_para_check)
        if tem_individual and data.limite_atletas != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Modalidade individual deve ter no máximo 1 atleta por equipe.",
            )
        updates.append("limite_atletas = %s")
        values.append(data.limite_atletas)
    if data.ativa is not None:
        updates.append("ativa = %s")
        values.append(data.ativa)

    if updates:
        updates.append("updated_at = NOW()")
        values.append(esporte_id)
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                UPDATE esportes
                SET {", ".join(updates)}
                WHERE id = %s
                """,
                values,
            )

    categoria_ids = data.categoria_ids
    naipe_ids = data.naipe_ids
    tipo_modalidade_ids = data.tipo_modalidade_ids
    if categoria_ids is not None and naipe_ids is not None and tipo_modalidade_ids is not None:
        tem_individual_novas = await _tem_tipo_individual(conn, tipo_modalidade_ids)
        if tem_individual_novas:
            if data.limite_atletas is not None and data.limite_atletas != 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Modalidade individual deve ter no máximo 1 atleta por equipe.",
                )
            limite_ja_atualizado = any("limite_atletas" in u for u in updates)
            if data.limite_atletas is None and not limite_ja_atualizado and existing.get("limite_atletas") != 1:
                async with conn.cursor() as cur:
                    await cur.execute(
                        "UPDATE esportes SET limite_atletas = 1, updated_at = NOW() WHERE id = %s",
                        (esporte_id,),
                    )
        combos = _cartesian_product(categoria_ids, naipe_ids, tipo_modalidade_ids)
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, categoria_id, naipe_id, tipo_modalidade_id FROM esporte_variantes WHERE esporte_id = %s",
                (esporte_id,),
            )
            existing_vars = await cur.fetchall()
        existing_set = {(str(r["categoria_id"]), str(r["naipe_id"]), str(r["tipo_modalidade_id"])) for r in existing_vars}
        desired_set = {(c, n, t) for c, n, t in combos}

        to_remove = existing_set - desired_set
        to_add = desired_set - existing_set

        async with conn.cursor() as cur:
            for cat_id, naipe_id, tipo_id in to_remove:
                await cur.execute(
                    "SELECT COUNT(*) AS cnt FROM equipes e JOIN esporte_variantes ev ON ev.id = e.esporte_variante_id "
                    "WHERE ev.esporte_id = %s AND ev.categoria_id = %s AND ev.naipe_id = %s AND ev.tipo_modalidade_id = %s",
                    (esporte_id, cat_id, naipe_id, tipo_id),
                )
                r = await cur.fetchone()
                if r and r["cnt"] > 0:
                    await conn.rollback()
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Não é possível remover variante: existem equipe(s) vinculada(s)",
                    )
                await cur.execute(
                    "DELETE FROM esporte_variantes WHERE esporte_id = %s AND categoria_id = %s AND naipe_id = %s AND tipo_modalidade_id = %s",
                    (esporte_id, cat_id, naipe_id, tipo_id),
                )

            for tbl, col, vals, name in [
                ("categorias", "id", [c for c, _, _ in to_add], "Categoria"),
                ("naipes", "id", [n for _, n, _ in to_add], "Naipe"),
                ("tipos_modalidade", "id", [t for _, _, t in to_add], "Tipo de modalidade"),
            ]:
                seen = set()
                for v in vals:
                    if v in seen:
                        continue
                    seen.add(v)
                    await cur.execute(f"SELECT id FROM {tbl} WHERE id = %s", (v,))
                    if not await cur.fetchone():
                        await conn.rollback()
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{name} não encontrado(a)")

            for cat_id, naipe_id, tipo_id in to_add:
                await cur.execute(
                    """
                    INSERT INTO esporte_variantes (esporte_id, categoria_id, naipe_id, tipo_modalidade_id)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (esporte_id, categoria_id, naipe_id, tipo_modalidade_id) DO NOTHING
                    """,
                    (esporte_id, cat_id, naipe_id, tipo_id),
                )
        await conn.commit()
    else:
        await conn.commit()

    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, nome, descricao, icone, requisitos, limite_atletas, ativa, created_at, updated_at FROM esportes WHERE id = %s",
            (esporte_id,),
        )
        row = await cur.fetchone()
    return _row_to_response(row)


@router.delete("/{esporte_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_esporte(
    esporte_id: str,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Remove esporte e suas variantes em cascata (requer autenticação)."""
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM esportes WHERE id = %s RETURNING id", (esporte_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Esporte não encontrado")
        await conn.commit()
