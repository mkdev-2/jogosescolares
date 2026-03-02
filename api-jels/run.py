"""
Script de inicialização para Windows.
Configura o event loop correto (SelectorEventLoop) para compatibilidade com psycopg.
"""
import sys
import platform
import asyncio

# Configurar SelectorEventLoop para Windows ANTES de importar qualquer coisa que use async
if platform.system() == "Windows":
    if sys.version_info >= (3, 8):
        # Windows com Python 3.8+ usa ProactorEventLoop por padrão,
        # mas psycopg precisa do SelectorEventLoop
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
