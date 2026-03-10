"""
Storage Service - Endpoints para gerenciamento de arquivos no MinIO.
Padrão turismoempaco: upload retorna path relativo (bucket/path); arquivos servidos via GET /file/.
"""
import io
import os
import logging
from datetime import timedelta
from typing import Optional
from urllib.parse import urlparse, urlunparse

from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Body
from fastapi.responses import Response
import base64
from pydantic import BaseModel
from minio import Minio
from minio.error import S3Error

from app.auth import get_current_user
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/storage", tags=["storage"])

# Configurações do MinIO (defaults alinhados ao docker-compose para evitar InvalidAccessKeyId)
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", "http://localhost:9002")
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


@router.post("/upload")
async def upload_file(
    bucket: str,
    path: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload de arquivo para o MinIO. bucket e path vêm na query string.
    Retorna path relativo (bucket/path) para o frontend usar em getStorageUrl.
    """
    if not minio_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de storage não disponível",
        )

    try:
        if not minio_client.bucket_exists(bucket):
            minio_client.make_bucket(bucket)
            logger.info(f"Bucket '{bucket}' criado")

        file_content = await file.read()
        file_size = len(file_content)

        minio_client.put_object(
            bucket,
            path,
            io.BytesIO(file_content),
            length=file_size,
            content_type=file.content_type or "application/octet-stream",
        )

        relative_path = f"{bucket}/{path}"
        return {
            "url": relative_path,
            "bucket": bucket,
            "path": path,
            "size": file_size,
        }
    except S3Error as e:
        logger.error(f"Erro S3 ao fazer upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao fazer upload: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Erro ao fazer upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro inesperado: {str(e)}",
        )


@router.post("/presigned-url")
async def get_presigned_upload_url(
    request: PresignedUrlRequest,
    current_user: dict = Depends(get_current_user),
):
    """Gera presigned URL para upload no MinIO."""
    if not minio_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de storage não disponível",
        )
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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de storage não disponível",
        )
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


@router.get("/file/{bucket}/{path:path}")
async def get_file(bucket: str, path: str):
    """
    Serve arquivo do MinIO através do backend.
    Usado pelo frontend para exibir imagens (getStorageUrl aponta para este endpoint).
    """
    if not minio_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de storage não disponível",
        )
    try:
        response = minio_client.get_object(bucket, path)
        content = response.read()
        response.close()
        response.release_conn()

        content_type = "application/octet-stream"
        if path.endswith(".png"):
            content_type = "image/png"
        elif path.endswith(".jpg") or path.endswith(".jpeg"):
            content_type = "image/jpeg"
        elif path.endswith(".gif"):
            content_type = "image/gif"
        elif path.endswith(".webp"):
            content_type = "image/webp"

        return Response(
            content=content,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=31536000"},
        )
    except S3Error as e:
        if e.code == "NoSuchKey":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao obter arquivo: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Erro ao servir arquivo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro inesperado",
        )


@router.get("/public-url/{bucket}/{path:path}")
async def get_public_url(bucket: str, path: str):
    """Gera URL pública (presigned) para download. Para exibição de imagens prefira GET /file/."""
    if not minio_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de storage não disponível",
        )
    try:
        expires = timedelta(days=7)
        presigned_url = minio_client.presigned_get_object(bucket, path, expires=expires)
        parsed_url = urlparse(presigned_url)
        public_parsed = urlparse(MINIO_PUBLIC_URL)
        public_url = urlunparse(
            (
                public_parsed.scheme,
                public_parsed.netloc,
                parsed_url.path,
                parsed_url.params,
                parsed_url.query,
                parsed_url.fragment,
            )
        )
        return {"url": public_url, "bucket": bucket, "path": path}
    except Exception as e:
        logger.error(f"Erro ao gerar URL pública: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro inesperado")


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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de storage não disponível",
        )
    try:
        file_content = base64.b64decode(base64Data)
        if not minio_client.bucket_exists(bucket):
            minio_client.make_bucket(bucket)
        data = io.BytesIO(file_content)
        minio_client.put_object(bucket, path, data, length=len(file_content), content_type=contentType)
        return {"url": f"{bucket}/{path}"}
    except Exception as e:
        logger.error(f"Erro no upload base64: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Erro no upload")
