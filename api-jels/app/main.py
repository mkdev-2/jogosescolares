"""
Jogos Escolares API Service - Ponto de entrada.
"""
import traceback
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.database import db
from app.auth import router as auth_router
from app.modalidades import router as modalidades_router
from app.categorias import router as categorias_router
from app.users import router as users_router
from app.escolas import router as escolas_router

try:
    from app.storage import router as storage_router
    STORAGE_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    STORAGE_AVAILABLE = False
    storage_router = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação."""
    await db.connect()
    yield
    await db.close()


app = FastAPI(
    title="Jogos Escolares API",
    description="API de autenticação e gestão de modalidades - Jogos Escolares",
    version="1.0.0",
    lifespan=lifespan,
    swagger_ui_init_oauth={"usePkceWithAuthorizationCodeGrant": False},
)

# CORS - incluir localhost para desenvolvimento Vite
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
cors_origins = [o.strip() for o in cors_origins_env.split(",")] if cors_origins_env else ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handler global para exceções."""
    from fastapi import HTTPException
    from pydantic import ValidationError

    if isinstance(exc, HTTPException):
        raise exc

    if isinstance(exc, ValidationError):
        logger.error(f"Erro de validação: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "type": "ValidationError", "path": str(request.url.path)},
        )

    logger.error(f"Erro não tratado: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Erro interno do servidor.", "type": type(exc).__name__, "path": str(request.url.path)},
    )


app.include_router(auth_router)
app.include_router(modalidades_router)
app.include_router(categorias_router)
app.include_router(users_router)
app.include_router(escolas_router)
if STORAGE_AVAILABLE and storage_router:
    app.include_router(storage_router)


@app.get("/")
async def root():
    """Endpoint raiz."""
    return {
        "message": "Jogos Escolares API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "auth": "/auth",
            "modalidades": "/api/modalidades",
            "categorias": "/api/categorias",
            "users": "/api/users",
            "escolas": "/api/escolas",
            "storage": "/api/storage" if STORAGE_AVAILABLE else None,
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health_check():
    """Health check."""
    return {"status": "healthy", "service": "jogosescolares-api"}
