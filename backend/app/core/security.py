"""Módulo de seguridad, sesiones y resolución de identidad Windows/NTLM."""

from __future__ import annotations

import base64
import logging
import os
import socket
import struct
from typing import Any

from fastapi import Request

from . import config, database

log = logging.getLogger(__name__)


def obtener_ip_local() -> str:
    """Detecta la dirección IP de esta máquina en la red local."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def parse_ntlm_type3(auth_header: str) -> tuple[str, str, str] | None:
    if not auth_header or not auth_header.startswith(("NTLM ", "Negotiate ")):
        return None
    try:
        raw = base64.b64decode(auth_header.split()[1])
        if not raw.startswith(b"NTLMSSP\x00\x03\x00\x00\x00"):
            return None
        dom_len, _, dom_off = struct.unpack("<HHI", raw[28:36])
        user_len, _, user_off = struct.unpack("<HHI", raw[36:44])
        work_len, _, work_off = struct.unpack("<HHI", raw[44:52])

        dom = raw[dom_off:dom_off+dom_len].decode("utf-16le", errors="ignore").strip()
        user = raw[user_off:user_off+user_len].decode("utf-16le", errors="ignore").strip()
        work = raw[work_off:work_off+work_len].decode("utf-16le", errors="ignore").strip()
        return dom, user, work
    except Exception:
        return None


def make_ntlm_type2() -> str:
    sig = b"NTLMSSP\x00"
    msg_type = struct.pack("<I", 2)
    target_name = struct.pack("<HHI", 0, 0, 48)
    flags = struct.pack("<I", 0x00028205)
    challenge = b"\x01\x02\x03\x04\x05\x06\x07\x08"
    context = b"\x00" * 8
    target_info = struct.pack("<HHI", 0, 0, 48)
    t2 = sig + msg_type + target_name + flags + challenge + context + target_info
    return base64.b64encode(t2).decode("ascii")


def obtener_display_name_windows() -> str | None:
    """Consulta a Windows el Nombre Completo oficial (Active Directory / Windows Display Name)."""
    try:
        import ctypes
        GetUserNameExW = ctypes.windll.secur32.GetUserNameExW
        size = ctypes.pointer(ctypes.c_ulong(0))
        GetUserNameExW(3, None, size)  # NameDisplay = 3
        if size.contents.value > 0:
            buf = ctypes.create_unicode_buffer(size.contents.value)
            if GetUserNameExW(3, buf, size):
                val = buf.value.strip()
                if val:
                    if "," in val:
                        p = val.split(",", 1)
                        return f"{p[1].strip().title()} {p[0].strip().title()}"
                    return val
    except Exception:
        pass
    return None


def resolver_nombre_completo(login_str: str) -> str:
    """Obtiene el nombre completo formal del usuario de red (desde Windows o BD de SUNAT)."""
    login = (login_str or "").strip()
    if not login:
        return "Usuario"

    # Si es el usuario de esta máquina, Windows entrega su Nombre Completo oficial directo
    if login.lower() == (os.environ.get("USERNAME") or "").lower():
        win_name = obtener_display_name_windows()
        if win_name:
            return win_name

    # Si no, buscar en la tabla usuario de la base de datos de SUNAT
    try:
        for sede in config.SEDES.values():
            try:
                with database.conectar(sede) as cur:
                    cur.execute("""
                        SELECT TOP 1 nombre
                        FROM usuario
                        WHERE UPPER(login) = UPPER(?)
                           OR UPPER(login) = UPPER(?)
                    """, (login, login.replace("prac-", "")))
                    row = cur.fetchone()
                    if row and row[0]:
                        nom = row[0].strip()
                        if "," in nom:
                            p = nom.split(",", 1)
                            return f"{p[1].strip().title()} {p[0].strip().title()}"
                        return nom.title()
                break
            except Exception:
                continue
    except Exception:
        pass

    return login


def obtener_usuario_actual(request: Request) -> dict[str, Any]:
    """Retorna el usuario autenticado por token, o resuelve automáticamente la identidad por Windows/Red."""
    from ..services import auth_service

    token = request.cookies.get("sitra_session")
    if token:
        try:
            u = auth_service.obtener_usuario_por_token(token)
            if u:
                u_dict = dict(u)
                client_ip = request.client.host if request.client else "127.0.0.1"
                u_dict["ip"] = client_ip
                u_dict["es_local"] = client_ip in ("127.0.0.1", "::1", "localhost", obtener_ip_local())
                return u_dict
        except Exception:
            pass

    client_ip = request.client.host if request.client else "127.0.0.1"
    es_local = client_ip in ("127.0.0.1", "::1", "localhost", obtener_ip_local())

    if es_local:
        win_login = os.environ.get("USERNAME", "alets")
        win_name = obtener_display_name_windows() or win_login.title()
        return {
            "id": 1,
            "nombre": win_name,
            "login": win_login,
            "correo": f"{win_login}@sunat.gob.pe",
            "rol": "directivo",
            "ip": client_ip,
            "es_local": True,
            "activo": 1,
        }
    else:
        # Petición remota desde otra máquina de la red local
        host_remoto = client_ip
        try:
            host_remoto = socket.gethostbyaddr(client_ip)[0].split(".")[0]
        except Exception:
            pass

        display_name = host_remoto if host_remoto != client_ip else f"Terminal {client_ip.split('.')[-1]}"
        return {
            "id": 1,
            "nombre": display_name,
            "login": host_remoto,
            "correo": f"{host_remoto.lower()}@red.sunat.gob.pe",
            "rol": "directivo",
            "ip": client_ip,
            "es_local": False,
            "activo": 1,
        }


def detectar_usuario_local(request: Request) -> str:
    usuario_sesion = obtener_usuario_actual(request)
    if usuario_sesion.get("rol") in ("admin", "directivo"):
        return f"{usuario_sesion.get('nombre')} ({usuario_sesion.get('rol').title()})"

    client_ip = request.client.host if request.client else "127.0.0.1"
    if client_ip in ("127.0.0.1", "::1", "localhost", obtener_ip_local()):
        user = os.environ.get("USERNAME") or os.environ.get("USER", "Usuario")
        return resolver_nombre_completo(user)
    return "Invitado"
