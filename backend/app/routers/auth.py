"""Router de autenticación y sesiones."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Request, Response

from ..core import security
from ..models.schemas import LoginRequest, SetupAdminRequest
from ..services import auth_service

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


@router.get("/me")
def api_auth_me(request: Request):
    """Retorna los datos del usuario actualmente autenticado o su estado como Invitado."""
    usuario = security.obtener_usuario_actual(request)
    hay_admin = auth_service.contar_usuarios() > 0
    return {
        "usuario": usuario,
        "hay_admin_configurado": hay_admin,
    }


@router.post("/login")
def api_auth_login(payload: LoginRequest, response: Response):
    """Inicia sesión con correo y contraseña, emitiendo una cookie HttpOnly segura."""
    correo = payload.correo.strip()
    password = payload.password.strip()
    if not correo or not password:
        raise HTTPException(400, "Debe ingresar correo y contraseña")

    try:
        usuario = auth_service.autenticar(correo, password)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except Exception as e:
        log.error("Error al autenticar usuario: %s", e)
        raise HTTPException(500, f"Error al procesar autenticación: {e}")

    if not usuario:
        raise HTTPException(401, "Correo o contraseña incorrectos")

    token = auth_service.crear_sesion(usuario["id"])
    response.set_cookie(
        key="sitra_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=7 * 86400,
        path="/",
    )
    return {"ok": True, "usuario": usuario}


@router.post("/invitado")
def api_auth_invitado(response: Response):
    """Establece acceso en modo invitado (vista general) sin contraseña."""
    response.set_cookie(
        key="sitra_guest",
        value="1",
        max_age=7 * 86400,
        path="/",
        samesite="lax",
    )
    return {"ok": True, "destino": "/nacional"}


@router.post("/logout")
def api_auth_logout(request: Request, response: Response):
    """Cierra la sesión activa y elimina las cookies."""
    token = request.cookies.get("sitra_session")
    if token:
        try:
            auth_service.cerrar_sesion(token)
        except Exception:
            pass
    response.delete_cookie(key="sitra_session", path="/")
    response.delete_cookie(key="sitra_guest", path="/")
    return {"ok": True}


@router.post("/setup-admin")
def api_setup_admin(payload: SetupAdminRequest, request: Request, response: Response):
    """Permite inicializar o actualizar la cuenta de Administrador con el correo y clave indicados."""
    correo = payload.correo.strip()
    password = payload.password.strip()
    nombre = (payload.nombre or "Administrador SITRA").strip()

    if not correo or not password:
        raise HTTPException(400, "Correo y contraseña son requeridos para la cuenta de Administrador")

    actual = security.obtener_usuario_actual(request)
    total_usuarios = auth_service.contar_usuarios()
    if total_usuarios > 0 and actual.get("rol") != "admin":
        raise HTTPException(403, "Solo un Administrador autenticado puede reconfigurar la cuenta de Administrador")

    try:
        admin_user = auth_service.asegurar_admin(correo=correo, password=password, nombre=nombre)
        token = auth_service.crear_sesion(admin_user["id"])
        response.set_cookie(
            key="sitra_session",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=7 * 86400,
            path="/",
        )
        return {"ok": True, "usuario": admin_user}
    except Exception as e:
        log.error("Error al configurar cuenta administrador: %s", e)
        raise HTTPException(500, f"Error al configurar administrador: {e}")
