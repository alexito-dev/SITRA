"""Router para Guía de Trámites y Preguntas Frecuentes (tvm_preguntas)."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException

from ..models.schemas import GuiaCreate, GuiaUpdate
from ..services import guia_service

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/guia", tags=["Guía de Trámites"])


@router.get("")
def api_obtener_guia(q: str = ""):
    """Retorna las preguntas y respuestas de la Guía."""
    return guia_service.obtener_todas(buscar=q)


@router.post("")
def api_crear_guia(payload: GuiaCreate):
    """Crea una nueva pregunta frecuente."""
    pregunta = payload.pregunta.strip()
    respuesta = payload.respuesta.strip()
    if not pregunta or not respuesta:
        raise HTTPException(400, "Pregunta y respuesta son requeridas")
    try:
        return guia_service.crear_pregunta(pregunta, respuesta)
    except Exception as e:
        log.error("Error al insertar pregunta: %s", e)
        raise HTTPException(500, f"Error al guardar pregunta en BD: {e}")


@router.put("/{id_pregunta}")
def api_actualizar_guia(id_pregunta: int, payload: GuiaUpdate):
    """Actualiza una pregunta frecuente existente."""
    pregunta = payload.pregunta.strip()
    respuesta = payload.respuesta.strip()
    if not pregunta or not respuesta:
        raise HTTPException(400, "Pregunta y respuesta son requeridas")
    try:
        res = guia_service.actualizar_pregunta(id_pregunta, pregunta, respuesta)
        if not res:
            raise HTTPException(404, "Pregunta no encontrada")
        return res
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error al actualizar pregunta: %s", e)
        raise HTTPException(500, f"Error al actualizar en BD: {e}")


@router.delete("/{id_pregunta}")
def api_eliminar_guia(id_pregunta: int):
    """Elimina una pregunta frecuente."""
    try:
        ok = guia_service.eliminar_pregunta(id_pregunta)
        if not ok:
            raise HTTPException(404, "Pregunta no encontrada")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error al eliminar pregunta: %s", e)
        raise HTTPException(500, f"Error al eliminar en BD: {e}")
