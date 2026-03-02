"""
Storage Service - Endpoints para gerenciamento de arquivos no MinIO
"""
import os
import logging
from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Body
import base64
from pydantic import BaseModel
from minio import Minio
from minio.error import S3Error

from app.auth import get_current_user
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/storage", tags=["storage"])

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "jogosescolares")
MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "jogosescolares_pass")
MINIO_USE_SSL = os.getenv("MINIO_USE_SSL", "false").lower() == "true"

try:
    minio_client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_USE_SSL,
    )
    logger.info(f"Cliente MinIO inicializado: {MINIO_ENDPOINT}")
except Exception as e:
    logger.error(f"Erro ao inicializar cliente MinIO: {e}")
    minio_client = None


class PresignedUrlRequest(BaseModel):
    bucket: str
    path: str
    contentType: Optional[str] = None
    metadata: Optional[dict] = None


class DeleteFileRequest(BaseModel):
    bucket: str
    path: str


@router.post("/presigned-url")
async def get_presigned_upload_url(
    request: PresignedUrlRequest,
    current_user: dict = Depends(get_current_user),
):
    """Gera presigned URL para upload no MinIO."""
    if not minio_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Serviço de storage não disponível")

    try:
        if not minio_client.bucket_exists(request.bucket):
            minio_client.make_bucket(request.bucket)
        expires = timedelta(hours=1)
        url = minio_client.presigned_put_object(request.bucket, request.path, expires=expires)
        return {"url": url, "bucket": request.bucket, "path": request.path, "expiresIn": int(expires.total_seconds())}
    except S3Error as e:
        logger.error(f"Erro S3: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao gerar presigned URL")


@router.delete("/delete")
async def delete_file(
    request: DeleteFileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Deleta arquivo do MinIO."""
    if not minio_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Serviço de storage não disponível")

    try:
        try:
            minio_client.stat_object(request.bucket, request.path)
        except S3Error as e:
            if e.code == "NoSuchKey":
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado")
            raise
        minio_client.remove_object(request.bucket, request.path)
        return {"success": True, "message": "Arquivo deletado", "bucket": request.bucket, "path": request.path}
    except HTTPException:
        raise
    except S3Error as e:
        logger.error(f"Erro S3: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro ao deletar arquivo")


@router.post("/upload")
async def upload_file_via_proxy(
    file: UploadFile = File(...),
    path: str = Form(...),
    bucket: str = Form(...),
    contentType: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload de arquivo via proxy para MinIO."""
    if not minio_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Serviço de storage não disponível")

    try:
        file_content = await file.read()
        if not minio_client.bucket_exists(bucket):
            minio_client.make_bucket(bucket)
        minio_client.put_object(bucket, path, file_content, length=len(file_content), content_type=contentType)
        protocol = "https" if MINIO_USE_SSL else "http"
        public_url = f"{protocol}://{MINIO_ENDPOINT}/{bucket}/{path}"
        return {"url": public_url}
    except Exception as e:
        logger.error(f"Erro no upload: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro no upload")


@router.post("/upload-base64")
async def upload_base64_via_proxy(
    base64Data: str = Body(..., embed=True),
    path: str = Body(..., embed=True),
    bucket: str = Body(..., embed=True),
    contentType: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
):
    """Upload de arquivo base64 para MinIO."""
    if not minio_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Serviço de storage não disponível")

    try:
        file_content = base64.b64decode(base64Data)
        if not minio_client.bucket_exists(bucket):
            minio_client.make_bucket(bucket)
        minio_client.put_object(bucket, path, file_content, length=len(file_content), content_type=contentType)
        protocol = "https" if MINIO_USE_SSL else "http"
        return {"url": f"{protocol}://{MINIO_ENDPOINT}/{bucket}/{path}"}
    except Exception as e:
        logger.error(f"Erro no upload base64: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro no upload")


@router.get("/public-url/{bucket}/{path:path}")
async def get_public_url(bucket: str, path: str):
    """Gera URL pública de arquivo no MinIO."""
    if not minio_client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Serviço de storage não disponível")
    protocol = "https" if MINIO_USE_SSL else "http"
    return {"url": f"{protocol}://{MINIO_ENDPOINT}/{bucket}/{path}", "bucket": bucket, "path": path}
