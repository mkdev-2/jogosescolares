#!/usr/bin/env python3
"""
Script para renovar automaticamente o token de longa duração do Instagram.
Deve ser executado periodicamente (ex: a cada 50 dias via cron ou agendador).

Uso:
  python scripts/refresh_instagram_token.py

O script chama o endpoint POST /api/instagram/refresh do serviço de API interno (auth-service).
"""
import os
import sys
from datetime import datetime, timezone

# Adicionar raiz do projeto ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import httpx
except ImportError:
    print("Instale httpx: pip install httpx")
    sys.exit(1)


def get_env(name: str, fallback: str = "") -> str:
    from dotenv import load_dotenv
    load_dotenv()
    return os.getenv(name, fallback)


def refresh_via_api() -> bool:
    """Chama o endpoint de refresh do container local de auth-service."""
    # Como rodará dentro do stack do docker-compose:
    auth_url = get_env("INTERNAL_AUTH_URL", "http://auth-service:8000")
    secret = get_env("INSTAGRAM_REFRESH_SECRET", "")

    url = f"{auth_url.rstrip('/')}/api/instagram/refresh"
    headers = {}
    if secret:
        headers["X-Refresh-Secret"] = secret

    print(f"[{datetime.now()}] Chamando {url}...")
    try:
        resp = httpx.post(url, headers=headers or None, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("skipped"):
                print(f"[{datetime.now()}] ⏭️ Renovação ignorada: {data.get('reason', 'Token ainda válido')}")
                print(f"  Próxima renovação em ~{data.get('days_until_refresh', '?')} dias")
            else:
                print(f"[{datetime.now()}] ✅ Token renovado com sucesso!")
                print(f"  Expira em: {data.get('expires_in', 'N/A')} segundos (~{data.get('expires_in', 0) // 86400} dias)")
            return True
        else:
            print(f"[{datetime.now()}] ❌ Erro {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"[{datetime.now()}] ❌ Erro de conexão: {e}")
        return False


def main():
    print("=== RENOVAÇÃO DO TOKEN INSTAGRAM (JOGOS ESCOLARES) ===")
    ok = refresh_via_api()
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
