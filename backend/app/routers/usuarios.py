"""Router para gestión de directivos y usuarios (Solo Administrador)."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Request

from ..core import security
from ..models.schemas import UserCreateRequest, UserUpdateRequest
from ..services import auth_service

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/usuarios", tags=["Gestión de Usuarios"])


@router.get("")
def api_listar_usuarios(request: Request):
    """Lista todos los usuarios directivos registrados. Solo accesible por el Administrador."""
    actual = security.obtener_usuario_actual(request)
    if actual.get("rol") != "admin":
        raise HTTPException(403, "Acceso restringido únicamente al Administrador")
    return {"usuarios": auth_service.listar_usuarios()}


@router.post("")
def api_crear_usuario(payload: UserCreateRequest, request: Request):
    """Crea un nuevo usuario asignado (Directivo o Admin). Solo accesible por el Administrador."""
    actual = security.obtener_usuario_actual(request)
    if actual.get("rol") != "admin":
        raise HTTPException(403, "Acceso restringido únicamente al Administrador")

    correo = payload.correo.strip()
    nombre = payload.nombre.strip()
    password = payload.password.strip()
    rol = (payload.rol or "directivo").strip().lower()

    if not correo or not nombre or not password:
        raise HTTPException(400, "Nombre, correo y contraseña son obligatorios")

    try:
        nuevo = auth_service.crear_usuario(correo=correo, nombre=nombre, password=password, rol=rol)
        return {"ok": True, "usuario": nuevo}
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(409, f"El correo '{correo}' ya se encuentra registrado")
        raise HTTPException(400, f"Error al crear usuario: {e}")


@router.put("/{usuario_id}")
def api_actualizar_usuario(usuario_id: int, payload: UserUpdateRequest, request: Request):
    """Actualiza datos o contraseña de un usuario. Solo accesible por el Administrador."""
    actual = security.obtener_usuario_actual(request)
    if actual.get("rol") != "admin":
        raise HTTPException(403, "Acceso restringido únicamente al Administrador")

    try:
        modificado = auth_service.actualizar_usuario(
            usuario_id=usuario_id,
            nombre=payload.nombre,
            correo=payload.correo,
            password=payload.password,
            rol=payload.rol,
            activo=payload.activo,
        )
        if not modificado:
            raise HTTPException(404, "Usuario no encontrado")
        return {"ok": True, "usuario": modificado}
    except Exception as e:
        raise HTTPException(400, f"Error al actualizar usuario: {e}")


@router.delete("/{usuario_id}")
def api_eliminar_usuario(usuario_id: int, request: Request):
    """Elimina un usuario. Solo accesible por el Administrador (no puede eliminarse a sí mismo)."""
    actual = security.obtener_usuario_actual(request)
    if actual.get("rol") != "admin":
        raise HTTPException(403, "Acceso restringido únicamente al Administrador")

    if actual.get("id") == usuario_id:
        raise HTTPException(400, "No puede eliminar su propia cuenta de Administrador")

    ok = auth_service.eliminar_usuario(usuario_id)
    if not ok:
        raise HTTPException(404, "Usuario no encontrado")
    return {"ok": True}
