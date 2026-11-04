"""Punto de entrada principal para iniciar SITRA (FastAPI + React SPA)."""

from __future__ import annotations

import sys
from multiprocessing import freeze_support
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import uvicorn

from backend.app.core import config
from backend.app.core.security import obtener_ip_local
from backend.app.main import app


def main():
    freeze_support()

    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    ip_local = obtener_ip_local()
    puerto = getattr(config, "PUERTO", 8080)
    host = "0.0.0.0"
    url_local = f"http://localhost:{puerto}"
    url_red = f"http://{ip_local}:{puerto}"

    print("\n" + "=" * 68)
    print("        SITRA - Sistema Integral de Tiempos de Atencion (SUNAT)")
    print("=" * 68)
    print("  [OK] Servidor iniciado correctamente.")
    print(f"  Acceso Local       : {url_local}")
    print(f"  Acceso en Red      : {url_red}")
    print(f"  Documentacion API  : {url_local}/docs")
    print(f"  Modo de ejecucion  : FastAPI 2.0 + React SPA")
    print(f"  Base de datos      : {config.DB_NOMBRE}")
    print("=" * 68)
    print("  Presione Ctrl + C en esta ventana para cerrar el servidor.")
    print("=" * 68 + "\n")

    uvicorn.run(app, host=host, port=puerto, log_level="info")


if __name__ == "__main__":
    main()
