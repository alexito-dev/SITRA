"""Aplicación principal FastAPI para SITRA."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .core import config
from .routers import auth, guia, intendencias, reportes, salud, sedes, tablero, usuarios
from .services import auth_service, intendencias_service, worker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("sitra.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Controla el inicio y detención del worker y bases de datos locales."""
    try:
        auth_service.inicializar_db()
        intendencias_service.inicializar_db()
    except Exception as e:
        log.error("Error al inicializar bases de datos locales: %s", e)
    worker.iniciar()
    yield
    worker.detener()


app = FastAPI(
    title="SITRA - Sistema Integral de Tiempos de Atención SUNAT",
    description="API REST modular para monitoreo multirregional de tiempos en 21 ITIs y 94 Centros de Servicios al Contribuyente.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS para permitir peticiones desde React Vite (desarrollo y red local)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_no_cache_header(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


# Registro de routers modulares
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(intendencias.router)
app.include_router(sedes.router)
app.include_router(tablero.router)
app.include_router(reportes.router)
app.include_router(guia.router)
app.include_router(salud.router)


@app.get("/logout")
def ruta_logout():
    """Ruta directa para cerrar sesión."""
    resp = RedirectResponse(url="/login", status_code=302)
    resp.delete_cookie(key="sitra_session", path="/")
    resp.delete_cookie(key="sitra_guest", path="/")
    return resp


# Configuración para servir la SPA de React compilada si existe frontend/dist
frontend_dist = config.BASE_DIR / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")
    if (frontend_dist / "data").exists():
        app.mount("/data", StaticFiles(directory=str(frontend_dist / "data")), name="data")

    @app.get("/")
    async def serve_root():
        return FileResponse(frontend_dist / "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Si la petición apunta a un archivo estático existente en frontend/dist
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # De lo contrario retornar index.html para React Router SPA
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def inicio_api():
        return {
            "mensaje": "SITRA FastAPI Backend activo",
            "frontend_dev": "http://localhost:5173",
            "documentacion": "/docs",
            "version": "2.0.0",
        }
