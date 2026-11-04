"""Router para gestión de Intendencias (21 ITIs)."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException

from ..models.schemas import IntendenciaCreate, IntendenciaUpdate
from ..services import intendencias_service, worker

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/intendencias", tags=["Intendencias"])


@router.get("")
def api_listar_intendencias():
    """Lista todas las intendencias registradas con su conteo de sedes y estado."""
    return {"intendencias": intendencias_service.listar_intendencias()}


@router.get("/{codigo}")
def api_obtener_intendencia(codigo: str):
    """Obtiene los detalles de una intendencia y sus sedes asociadas."""
    res = intendencias_service.obtener_intendencia(codigo)
    if not res:
        raise HTTPException(404, "Intendencia no encontrada")
    return res


@router.post("")
def api_crear_intendencia(payload: IntendenciaCreate):
    """Crea una nueva intendencia en el sistema."""
    codigo = payload.codigo.strip().lower()
    nombre = payload.nombre.strip()
    siglas = (payload.siglas or "").strip()
    region = (payload.region or "PERU").strip()
    color = (payload.color or "#2563eb").strip()
    tipo = (payload.tipo_conexion or "real").strip()
    descripcion = (payload.descripcion or "").strip()

    if not codigo or not nombre:
        raise HTTPException(400, "Código y nombre son obligatorios")
    try:
        nueva = intendencias_service.crear_intendencia(
            codigo=codigo,
            nombre=nombre,
            siglas=siglas or nombre[:12].upper(),
            region=region,
            color=color,
            tipo_conexion=tipo,
            descripcion=descripcion,
        )
        worker.refrescar_todas()
        return {"ok": True, "intendencia": nueva}
    except Exception as e:
        raise HTTPException(400, f"Error al crear intendencia: {e}")


@router.put("/{codigo}")
def api_actualizar_intendencia(codigo: str, payload: IntendenciaUpdate):
    """Actualiza una intendencia existente."""
    res = intendencias_service.actualizar_intendencia(
        codigo=codigo,
        nombre=payload.nombre,
        siglas=payload.siglas,
        region=payload.region,
        color=payload.color,
        tipo_conexion=payload.tipo_conexion,
        descripcion=payload.descripcion,
    )
    if not res:
        raise HTTPException(404, "Intendencia no encontrada")
    worker.refrescar_todas()
    return {"ok": True, "intendencia": res}


@router.delete("/{codigo}")
def api_eliminar_intendencia(codigo: str):
    """Elimina una intendencia y sus sedes asociadas."""
    ok = intendencias_service.eliminar_intendencia(codigo)
    if not ok:
        raise HTTPException(404, "Intendencia no encontrada")
    worker.refrescar_todas()
    return {"ok": True}
