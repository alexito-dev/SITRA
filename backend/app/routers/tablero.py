"""Router para datos operativos del tablero y comparativo multi-intendencia."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Request

from ..core import security
from ..services import intendencias_service, worker

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Datos Tablero"])


@router.get("/tablero/{codigo}")
def api_tablero(codigo: str):
    """Retorna la información en formato JSON de una sede específica."""
    datos = worker.tablero(codigo)
    if datos is None:
        sede_info = intendencias_service.obtener_sede(codigo)
        if sede_info:
            worker._refrescar_sede(sede_info)
            datos = worker.tablero(codigo)
        if datos is None:
            raise HTTPException(503, "Aún no hay lectura de esta sede")
    return datos


@router.get("/consolidado")
def api_consolidado():
    """Retorna el reporte consolidado de todas las sedes."""
    return worker.consolidado()


@router.get("/comparativo")
def api_comparativo(request: Request, intendencia: str | None = None):
    """Retorna la comparativa nacional (21 ITIs) o filtrada por una Intendencia específica."""
    usuario = security.obtener_usuario_actual(request)
    es_detallado = usuario.get("rol") in ("admin", "directivo")
    res = worker.reporte_comparativo(detallado=es_detallado)
    
    if intendencia:
        int_limpio = intendencia.strip().lower()
        res["sedes"] = [s for s in res.get("sedes", []) if s.get("intendencia_codigo") == int_limpio]
        res["intendencias"] = [i for i in res.get("intendencias", []) if i.get("codigo") == int_limpio]

    res["usuario"] = {
        "id": usuario.get("id"),
        "nombre": usuario.get("nombre"),
        "rol": usuario.get("rol"),
        "correo": usuario.get("correo"),
    }
    return res
