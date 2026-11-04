"""Router para reportes analíticos e históricos."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Request

from ..core import security
from ..services import worker

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reporte", tags=["Reportes"])


@router.get("/dia")
def api_reporte_dia(request: Request, sede: str, fecha: str):
    """Retorna el reporte de tickets para una sede y fecha dada."""
    usuario = security.obtener_usuario_actual(request)
    es_detallado = usuario.get("rol") in ("admin", "directivo")
    if not es_detallado:
        raise HTTPException(
            status_code=403,
            detail="Acceso denegado: Los invitados no tienen acceso al reporte. Inicie sesión como Directivo o Administrador."
        )

    if not fecha:
        raise HTTPException(400, "El parámetro 'fecha' es requerido (formato YYYY-MM-DD)")

    rep = worker.obtener_reporte_dia(sede, fecha)
    rep["es_detallado"] = True
    return rep
