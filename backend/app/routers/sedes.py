"""Router para gestión de Centros de Servicios al Contribuyente (Sedes / CSC)."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException

from ..models.schemas import SedeCreate, SedeUpdate
from ..services import intendencias_service, worker

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sedes", tags=["Sedes CSC"])


def _publica(sede: dict | None) -> dict | None:
    """Devuelve la sede sin la clave de la base de datos (nunca sale al navegador)."""
    if sede is None:
        return None
    return {k: v for k, v in sede.items() if k != "clave"}


@router.get("")
def api_listar_sedes(intendencia: str | None = None):
    """Lista todas las sedes registradas, opcionalmente filtradas por intendencia."""
    return {"sedes": [_publica(s) for s in intendencias_service.listar_sedes(intendencia)]}


@router.get("/{codigo}")
def api_obtener_sede(codigo: str):
    """Obtiene los parámetros de configuración de una sede."""
    s = intendencias_service.obtener_sede(codigo)
    if not s:
        raise HTTPException(404, "Sede no encontrada")
    return _publica(s)


@router.post("")
def api_crear_sede(payload: SedeCreate):
    """Crea o conecta una nueva sede."""
    codigo = payload.codigo.strip().lower()
    nombre = payload.nombre.strip()
    int_cod = payload.intendencia_codigo.strip()
    if not codigo or not nombre or not int_cod:
        raise HTTPException(400, "Código, nombre e intendencia son obligatorios")
    try:
        nueva = intendencias_service.crear_sede(
            codigo=codigo,
            nombre=nombre,
            intendencia_codigo=int_cod,
            host=(payload.host or "127.0.0.1").strip(),
            puerto=int(payload.puerto or 1433),
            instancia=(payload.instancia or "SQLEXPRESS").strip(),
            base_datos=(payload.base_datos or "bdtvmediasunat").strip(),
            usuario=(payload.usuario or "sacolas").strip(),
            clave=(payload.clave or "sacolas").strip(),
            es_simulado=int(payload.es_simulado or 0),
        )
        worker.refrescar_todas()
        return {"ok": True, "sede": _publica(nueva)}
    except Exception as e:
        raise HTTPException(400, f"Error al crear sede: {e}")


@router.put("/{codigo}")
def api_actualizar_sede(codigo: str, payload: SedeUpdate):
    """Actualiza los parámetros o credenciales de conexión de una sede."""
    res = intendencias_service.actualizar_sede(
        codigo=codigo,
        nombre=payload.nombre,
        intendencia_codigo=payload.intendencia_codigo,
        host=payload.host,
        puerto=payload.puerto,
        instancia=payload.instancia,
        base_datos=payload.base_datos,
        usuario=payload.usuario,
        clave=payload.clave,
        es_simulado=payload.es_simulado,
        activo=payload.activo,
    )
    if not res:
        raise HTTPException(404, "Sede no encontrada")
    worker.refrescar_todas()
    return {"ok": True, "sede": _publica(res)}


@router.post("/{codigo}/test-conexion")
def api_test_conexion_sede(codigo: str):
    """Ejecuta un diagnóstico en tiempo real (ping TCP / validación de enlace) hacia la sede."""
    return intendencias_service.probar_conexion_sede(codigo)


@router.post("/{codigo}/toggle-modo")
def api_toggle_modo_sede(codigo: str):
    """Alterna instantáneamente una sede entre Conexión Real y Modo Simulado."""
    modificada = intendencias_service.alternar_modo_sede(codigo)
    if not modificada:
        raise HTTPException(404, "Sede no encontrada")
    worker.refrescar_todas()
    return {"ok": True, "sede": _publica(modificada)}


@router.delete("/{codigo}")
def api_eliminar_sede(codigo: str):
    """Elimina una sede de la base de datos."""
    ok = intendencias_service.eliminar_sede(codigo)
    if not ok:
        raise HTTPException(404, "Sede no encontrada")
    worker.refrescar_todas()
    return {"ok": True}
