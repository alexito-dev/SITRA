"""  """"""Router para diagnóstico y salud del servicio."""

from __future__ import annotations

from fastapi import APIRouter

from ..core import config, database
from ..services import worker

router = APIRouter(prefix="/api", tags=["Salud del Servicio"])


@router.get("/salud")
def salud():
    """Retorna información sobre el estado del servicio y la conectividad."""
    consolidado = worker.consolidado()
    return {
        "driver": config.DB_DRIVER,
        "drivers_instalados": database.drivers_disponibles(),
        "base": config.DB_NOMBRE,
        "intervalo": config.INTERVALO_REFRESCO,
        "sedes": [
            {"codigo": s["codigo"], "conectado": s["conectado"]}
            for s in consolidado.get("sedes", [])
        ],
    }
