"""
Roteador de staff: cadastro público e gerenciamento administrativo.
"""
import logging
from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.auth import get_current_user, is_admin
from app.database import get_db

router = APIRouter(tags=["staff"])
logger = logging.getLogger(__name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class StaffCreate(BaseModel):
    nome: str
    cpf: str
    foto_url: Optional[str] = None
    cargo_id: int
    documento_url: Optional[str] = None


class CargoCreate(BaseModel):
    nome: str


class CargoUpdate(BaseModel):
    nome: Optional[str] = None
    ativo: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validar_cpf(digitos: str) -> bool:
    if len(digitos) != 11 or not digitos.isdigit():
        return False
    if len(set(digitos)) == 1:
        return False
    soma = sum(int(digitos[i]) * (10 - i) for i in range(9))
    d1 = 0 if (soma % 11) < 2 else 11 - (soma % 11)
    if d1 != int(digitos[9]):
        return False
    soma = sum(int(digitos[i]) * (11 - i) for i in range(10))
    d2 = 0 if (soma % 11) < 2 else 11 - (soma % 11)
    return d2 == int(digitos[10])


# ── Rotas públicas ────────────────────────────────────────────────────────────

@router.get("/api/public/staff/cargos")
async def listar_cargos_publico(conn: psycopg.AsyncConnection = Depends(get_db)):
    async with conn.cursor() as cur:
        await cur.execute("SELECT id, nome FROM staff_cargos WHERE ativo = TRUE ORDER BY nome")
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/api/public/staff", status_code=status.HTTP_201_CREATED)
async def cadastrar_staff(payload: StaffCreate, conn: psycopg.AsyncConnection = Depends(get_db)):
    cpf_clean = "".join(filter(str.isdigit, payload.cpf))
    if len(cpf_clean) != 11:
        raise HTTPException(status_code=422, detail="CPF deve conter 11 dígitos.")
    if not _validar_cpf(cpf_clean):
        raise HTTPException(status_code=422, detail="CPF inválido.")

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM staff_cargos WHERE id = %s AND ativo = TRUE", (payload.cargo_id,))
        cargo = await cur.fetchone()
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo não encontrado.")

    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO staff (nome, cpf, foto_url, cargo_id, documento_url)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, nome, cpf, foto_url, cargo_id, documento_url, created_at
            """,
            (payload.nome.strip(), cpf_clean, payload.foto_url, payload.cargo_id, payload.documento_url),
        )
        row = await cur.fetchone()
        await conn.commit()

    return dict(row)


# ── Rotas admin ───────────────────────────────────────────────────────────────

@router.get("/api/staff")
async def listar_staff(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT s.id, s.nome, s.cpf, s.foto_url, s.documento_url, s.created_at,
                   c.id AS cargo_id, c.nome AS cargo_nome
            FROM staff s
            JOIN staff_cargos c ON c.id = s.cargo_id
            ORDER BY s.created_at DESC
            """
        )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/api/staff/cargos")
async def listar_cargos_admin(
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    async with conn.cursor() as cur:
        await cur.execute("SELECT id, nome, ativo, created_at FROM staff_cargos ORDER BY nome")
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.post("/api/staff/cargos", status_code=status.HTTP_201_CREATED)
async def criar_cargo(
    payload: CargoCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO staff_cargos (nome) VALUES (%s) RETURNING id, nome, ativo, created_at",
            (payload.nome.strip(),),
        )
        row = await cur.fetchone()
        await conn.commit()
    return dict(row)


@router.put("/api/staff/cargos/{cargo_id}")
async def atualizar_cargo(
    cargo_id: int,
    payload: CargoUpdate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")

    async with conn.cursor() as cur:
        await cur.execute("SELECT id, nome, ativo FROM staff_cargos WHERE id = %s", (cargo_id,))
        cargo = await cur.fetchone()
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo não encontrado.")

    novo_nome = payload.nome.strip() if payload.nome is not None else cargo["nome"]
    novo_ativo = payload.ativo if payload.ativo is not None else cargo["ativo"]

    async with conn.cursor() as cur:
        await cur.execute(
            "UPDATE staff_cargos SET nome = %s, ativo = %s WHERE id = %s RETURNING id, nome, ativo, created_at",
            (novo_nome, novo_ativo, cargo_id),
        )
        row = await cur.fetchone()
        await conn.commit()
    return dict(row)


@router.delete("/api/staff/cargos/{cargo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_cargo(
    cargo_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")

    async with conn.cursor() as cur:
        await cur.execute("SELECT COUNT(*) AS cnt FROM staff WHERE cargo_id = %s", (cargo_id,))
        row = await cur.fetchone()
    if row["cnt"] > 0:
        raise HTTPException(status_code=409, detail="Cargo possui staff vinculado e não pode ser removido.")

    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM staff_cargos WHERE id = %s RETURNING id", (cargo_id,))
        deleted = await cur.fetchone()
        await conn.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Cargo não encontrado.")


@router.put("/api/staff/{staff_id}")
async def atualizar_staff(
    staff_id: int,
    payload: StaffCreate,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")

    cpf_clean = "".join(filter(str.isdigit, payload.cpf))
    if len(cpf_clean) != 11:
        raise HTTPException(status_code=422, detail="CPF deve conter 11 dígitos.")
    if not _validar_cpf(cpf_clean):
        raise HTTPException(status_code=422, detail="CPF inválido.")

    async with conn.cursor() as cur:
        await cur.execute("SELECT id FROM staff WHERE id = %s", (staff_id,))
        member = await cur.fetchone()
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")

    async with conn.cursor() as cur:
        await cur.execute(
            """
            UPDATE staff
            SET nome = %s, cpf = %s, foto_url = %s, cargo_id = %s, documento_url = %s, updated_at = NOW()
            WHERE id = %s
            """,
            (payload.nome.strip(), cpf_clean, payload.foto_url, payload.cargo_id, payload.documento_url, staff_id),
        )
        await conn.commit()

    return {"id": staff_id}


@router.delete("/api/staff/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_staff(
    staff_id: int,
    conn: psycopg.AsyncConnection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")

    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM staff WHERE id = %s RETURNING id", (staff_id,))
        deleted = await cur.fetchone()
        await conn.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")
