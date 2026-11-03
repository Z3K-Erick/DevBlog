"""
Script de inicio para {EG} DevBlog:
- Levanta la API REST del Blog en FastAPI + Uvicorn en http://127.0.0.1:8001
  (Documentación interactiva Swagger UI en http://127.0.0.1:8001/docs)
- Levanta el servidor web para el Blog y el CMS (dashboard.html) en http://127.0.0.1:8080
"""

from __future__ import annotations

import functools
import http.server
import socketserver
import threading
import time
from pathlib import Path

import uvicorn

ROOT_DIR = Path(__file__).resolve().parent


def start_static_server(port: int = 8080) -> None:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT_DIR))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
        httpd.serve_forever()


if __name__ == "__main__":
    print("=" * 72)
    print("  {EG} DevBlog — API REST (FastAPI + SQLite) y Panel CMS")
    print("=" * 72)
    print("  • API REST del Blog:      http://127.0.0.1:8001")
    print("  • Documentación OpenAPI:  http://127.0.0.1:8001/docs")
    print("  • Sitio Web (Feed):       http://127.0.0.1:8080/index.html")
    print("  • CMS (Dashboard Admin):  http://127.0.0.1:8080/dashboard.html")
    print("=" * 72)

    thread = threading.Thread(target=start_static_server, args=(8080,), daemon=True)
    thread.start()
    time.sleep(0.3)

    uvicorn.run("api_blog:app", host="127.0.0.1", port=8001, reload=False)
