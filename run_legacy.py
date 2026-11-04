"""Punto de entrada principal para iniciar SITRA (Versión HTML, CSS, JavaScript)."""

from __future__ import annotations

import sys
from multiprocessing import freeze_support

import uvicorn

from app import config, auth_db
from app.main import app, _obtener_ip_local


def main():
    freeze_support()

    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    ip_local = _obtener_ip_local()
    puerto = getattr(config, "PUERTO", 8080)
    host = "0.0.0.0"
    url_local = f"http://localhost:{puerto}/comparativo"
    url_red = f"http://{ip_local}:{puerto}/comparativo"

    print("\n" + "=" * 68)
    print("        SITRA - Panel de Control y Monitoreo de Tiempos (HTML/CSS/JS)")
    print("=" * 68)
    print("  [OK] Servidor iniciado correctamente.")
    print(f"  [OK] Abriendo panel de control: {url_local}")
    print(f"  Modo de ejecucion  : HTML5 + CSS + JavaScript (Templates Jinja2)")
    print(f"  Base de datos      : {config.DB_NOMBRE} (Usuario: {config.DB_USUARIO})")
    print(f"  Base datos auth    : {auth_db.DB_PATH}")
    print(f"  Direccion en red   : {url_red}")
    print(f"  Documentacion API  : http://localhost:{puerto}/docs")
    print("=" * 68)
    print("  Presione Ctrl + C en esta ventana para cerrar el servidor.")
    print("=" * 68 + "\n")

    uvicorn.run(app, host=host, port=puerto, log_level="warning")


if __name__ == "__main__":
    main()

