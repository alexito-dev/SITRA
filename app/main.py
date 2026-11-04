"""Aplicación web para el tablero de tiempos."""

from __future__ import annotations

import base64
import logging
import os
import socket
import struct
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from . import config, db, worker, guia_db, auth_db, intendencias_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("tablero")


@asynccontextmanager
async def ciclo_vida(app: FastAPI):
    """Controla el inicio y detención del worker en segundo plano y las bases de datos locales."""
    try:
        auth_db.inicializar_db()
        intendencias_db.inicializar_db()
    except Exception as e:
        log.error("Error al inicializar bases de datos locales: %s", e)
    worker.iniciar()
    yield
    worker.detener()


import time

app = FastAPI(title="Tablero de tiempos - IR Junin", lifespan=ciclo_vida)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VERSION = str(int(time.time()))

@app.middleware("http")
async def add_no_cache_header(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/") or request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

_static_dir = config.RESOURCE_DIR / "app" / "static"
if not _static_dir.exists():
    _static_dir = config.BASE_DIR / "app" / "static"

_templates_dir = config.RESOURCE_DIR / "app" / "templates"
if not _templates_dir.exists():
    _templates_dir = config.BASE_DIR / "app" / "templates"

app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")
plantillas = Jinja2Templates(directory=str(_templates_dir))


def _obtener_ip_local() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def _parse_ntlm_type3(auth_header: str) -> tuple[str, str, str] | None:
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


def _make_ntlm_type2() -> str:
    sig = b"NTLMSSP\x00"
    msg_type = struct.pack("<I", 2)
    target_name = struct.pack("<HHI", 0, 0, 48)
    flags = struct.pack("<I", 0x00028205)
    challenge = b"\x01\x02\x03\x04\x05\x06\x07\x08"
    context = b"\x00" * 8
    target_info = struct.pack("<HHI", 0, 0, 48)
    t2 = sig + msg_type + target_name + flags + challenge + context + target_info
    return base64.b64encode(t2).decode("ascii")


def _obtener_display_name_windows() -> str | None:
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


def _resolver_nombre_completo(login_str: str) -> str:
    """Obtiene el nombre completo formal del usuario de red (desde Windows o BD de SUNAT)."""
    login = (login_str or "").strip()
    if not login:
        return "Usuario"

    # Si es el usuario de esta máquina, Windows entrega su Nombre Completo oficial directo
    if login.lower() == (os.environ.get("USERNAME") or "").lower():
        win_name = _obtener_display_name_windows()
        if win_name:
            return win_name

    # Si no, buscar en la tabla usuario de la base de datos de SUNAT
    try:
        for sede in config.SEDES.values():
            try:
                with db.conectar(sede) as cur:
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


def _obtener_usuario_actual(request: Request) -> dict:
    """Retorna el usuario autenticado por token, o resuelve automáticamente la identidad por Windows/Red."""
    token = request.cookies.get("sitra_session")
    if token:
        try:
            u = auth_db.obtener_usuario_por_token(token)
            if u:
                u_dict = dict(u)
                client_ip = request.client.host if request.client else "127.0.0.1"
                u_dict["ip"] = client_ip
                u_dict["es_local"] = client_ip in ("127.0.0.1", "::1", "localhost", _obtener_ip_local())
                return u_dict
        except Exception:
            pass

    client_ip = request.client.host if request.client else "127.0.0.1"
    es_local = client_ip in ("127.0.0.1", "::1", "localhost", _obtener_ip_local())

    if es_local:
        win_login = os.environ.get("USERNAME", "alets")
        win_name = _obtener_display_name_windows() or win_login.title()
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


def _detectar_usuario_local(request: Request) -> str:
    # Si hay un usuario asignado en sesión, priorizarlo
    usuario_sesion = _obtener_usuario_actual(request)
    if usuario_sesion.get("rol") in ("admin", "directivo"):
        return f"{usuario_sesion.get('nombre')} ({usuario_sesion.get('rol').title()})"

    client_ip = request.client.host if request.client else "127.0.0.1"
    if client_ip in ("127.0.0.1", "::1", "localhost", _obtener_ip_local()):
        user = os.environ.get("USERNAME") or os.environ.get("USER", "Usuario")
        return _resolver_nombre_completo(user)
    return "Invitado"


# ====================================================================
# ENDPOINTS DE AUTENTICACIÓN Y SESIÓN
# ====================================================================

@app.get("/api/auth/me")
def api_auth_me(request: Request):
    """Retorna los datos del usuario actualmente autenticado o su estado como Invitado."""
    usuario = _obtener_usuario_actual(request)
    hay_admin = auth_db.contar_usuarios() > 0
    return {
        "usuario": usuario,
        "hay_admin_configurado": hay_admin,
    }


@app.post("/api/auth/login")
async def api_auth_login(request: Request, response: Response):
    """Inicia sesión con correo y contraseña, emitiendo una cookie HttpOnly segura."""
    data = await request.json()
    correo = (data.get("correo") or "").strip()
    password = (data.get("password") or "").strip()
    if not correo or not password:
        raise HTTPException(400, "Debe ingresar correo y contraseña")

    try:
        usuario = auth_db.autenticar(correo, password)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except Exception as e:
        log.error("Error al autenticar usuario: %s", e)
        raise HTTPException(500, f"Error al procesar autenticación: {e}")

    if not usuario:
        raise HTTPException(401, "Correo o contraseña incorrectos")

    token = auth_db.crear_sesion(usuario["id"])
    response.set_cookie(
        key="sitra_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=7 * 86400,
        path="/",
    )
    return {"ok": True, "usuario": usuario}


@app.post("/api/auth/invitado")
def api_auth_invitado(response: Response):
    """Establece acceso en modo invitado (vista general) sin contraseña."""
    response.set_cookie(
        key="sitra_guest",
        value="1",
        max_age=7 * 86400,
        path="/",
        samesite="lax",
    )
    return {"ok": True, "destino": "/comparativo"}


@app.post("/api/auth/logout")
def api_auth_logout(request: Request, response: Response):
    """Cierra la sesión activa y elimina las cookies."""
    token = request.cookies.get("sitra_session")
    if token:
        try:
            auth_db.cerrar_sesion(token)
        except Exception:
            pass
    response.delete_cookie(key="sitra_session", path="/")
    response.delete_cookie(key="sitra_guest", path="/")
    return {"ok": True}


@app.get("/logout")
def vista_logout(request: Request, response: Response):
    """Ruta directa para cerrar sesión y volver a la pantalla de inicio limpia."""
    token = request.cookies.get("sitra_session")
    if token:
        try:
            auth_db.cerrar_sesion(token)
        except Exception:
            pass
    resp = RedirectResponse(url="/login", status_code=302)
    resp.delete_cookie(key="sitra_session", path="/")
    resp.delete_cookie(key="sitra_guest", path="/")
    return resp


@app.post("/api/auth/setup-admin")
async def api_setup_admin(request: Request, response: Response):
    """Permite inicializar o actualizar la cuenta de Administrador con el correo y clave indicados."""
    data = await request.json()
    correo = (data.get("correo") or "").strip()
    password = (data.get("password") or "").strip()
    nombre = (data.get("nombre") or "Administrador SITRA").strip()

    if not correo or not password:
        raise HTTPException(400, "Correo y contraseña son requeridos para la cuenta de Administrador")

    # Si ya existen usuarios y el que ejecuta no es admin, validar permisos
    actual = _obtener_usuario_actual(request)
    total_usuarios = auth_db.contar_usuarios()
    if total_usuarios > 0 and actual.get("rol") != "admin":
        raise HTTPException(403, "Solo un Administrador autenticado puede reconfigurar la cuenta de Administrador")

    try:
        admin_user = auth_db.asegurar_admin(correo=correo, password=password, nombre=nombre)
        # Iniciar sesión automáticamente
        token = auth_db.crear_sesion(admin_user["id"])
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


# ====================================================================
# GESTIÓN DE USUARIOS / DIRECTIVOS (SOLO ADMINISTRADOR)
# ====================================================================

@app.get("/api/usuarios")
def api_listar_usuarios(request: Request):
    """Lista todos los usuarios directivos registrados. Solo accesible por el Administrador."""
    actual = _obtener_usuario_actual(request)
    if actual.get("rol") != "admin":
        raise HTTPException(403, "Acceso restringido únicamente al Administrador")
    return {"usuarios": auth_db.listar_usuarios()}


@app.post("/api/usuarios")
async def api_crear_usuario(request: Request):
    """Crea un nuevo usuario asignado (Directivo o Admin). Solo accesible por el Administrador."""
    actual = _obtener_usuario_actual(request)
    if actual.get("rol") != "admin":
        raise HTTPException(403, "Acceso restringido únicamente al Administrador")

    data = await request.json()
    correo = (data.get("correo") or "").strip()
    nombre = (data.get("nombre") or "").strip()
    password = (data.get("password") or "").strip()
    rol = (data.get("rol") or "directivo").strip().lower()

    if not correo or not nombre or not password:
        raise HTTPException(400, "Nombre, correo y contraseña son obligatorios")

    try:
        nuevo = auth_db.crear_usuario(correo=correo, nombre=nombre, password=password, rol=rol)
        return {"ok": True, "usuario": nuevo}
    except Exception as e:
        if "UNIQUE" in str(e).upper():
            raise HTTPException(409, f"El correo '{correo}' ya se encuentra registrado")
        raise HTTPException(400, f"Error al crear usuario: {e}")


@app.put("/api/usuarios/{usuario_id}")
async def api_actualizar_usuario(usuario_id: int, request: Request):
    """Actualiza datos o contraseña de un usuario. Solo accesible por el Administrador."""
    actual = _obtener_usuario_actual(request)
    if actual.get("rol") != "admin":
        raise HTTPException(403, "Acceso restringido únicamente al Administrador")

    data = await request.json()
    try:
        modificado = auth_db.actualizar_usuario(
            usuario_id=usuario_id,
            nombre=data.get("nombre"),
            correo=data.get("correo"),
            password=data.get("password"),
            rol=data.get("rol"),
            activo=data.get("activo"),
        )
        if not modificado:
            raise HTTPException(404, "Usuario no encontrado")
        return {"ok": True, "usuario": modificado}
    except Exception as e:
        raise HTTPException(400, f"Error al actualizar usuario: {e}")


@app.delete("/api/usuarios/{usuario_id}")
def api_eliminar_usuario(usuario_id: int, request: Request):
    """Elimina un usuario. Solo accesible por el Administrador (no puede eliminarse a sí mismo)."""
    actual = _obtener_usuario_actual(request)
    if actual.get("rol") != "admin":
        raise HTTPException(403, "Acceso restringido únicamente al Administrador")

    if actual.get("id") == usuario_id:
        raise HTTPException(400, "No puede eliminar su propia cuenta de Administrador")

    ok = auth_db.eliminar_usuario(usuario_id)
    if not ok:
        raise HTTPException(404, "Usuario no encontrado")
    return {"ok": True}


# ====================================================================
# RUTAS DE INTERFAZ Y VISTAS
# ====================================================================

@app.get("/login", response_class=HTMLResponse)
def vista_login(request: Request):
    """Pantalla de inicio minimalista para iniciar sesión o entrar como invitado."""
    usuario = _obtener_usuario_actual(request)
    return plantillas.TemplateResponse(
        request,
        "login.html",
        {
            "version": VERSION,
            "usuario": usuario,
            "es_autenticado": bool(usuario and usuario.get("id")),
        },
    )


@app.get("/", response_class=HTMLResponse)
def inicio(request: Request):
    """Pantalla inicial: redirige directamente al panel comparativo y mapa nacional."""
    return RedirectResponse(url="/comparativo", status_code=302)


@app.get("/nacional", response_class=HTMLResponse)
@app.get("/comparativo", response_class=HTMLResponse)
def vista_nacional(request: Request):
    """Nivel 1: Monitoreo Nacional consolidado de las 21 Intendencias de Tributos Internos (ITI) y 94 CSC."""
    usuario = _obtener_usuario_actual(request)
    todas_itis = intendencias_db.listar_intendencias()
    todas_sedes = intendencias_db.listar_sedes()

    return plantillas.TemplateResponse(
        request,
        "comparativo.html",
        {
            "nivel": "nacional",
            "intendencias": todas_itis,
            "sedes": todas_sedes,
            "intervalo": config.INTERVALO_REFRESCO,
            "version": str(int(time.time())),
            "usuario": usuario,
            "es_detallado": usuario.get("rol") in ("admin", "directivo"),
            "es_admin": usuario.get("rol") == "admin",
        },
    )


@app.get("/intendencia/{codigo}", response_class=HTMLResponse)
def vista_intendencia(request: Request, codigo: str):
    """Nivel 2: Monitoreo detallado de una Intendencia (ITI) específica y sus Centros de Servicios adscritos."""
    iti_info = intendencias_db.obtener_intendencia(codigo)
    if not iti_info:
        raise HTTPException(404, f"Intendencia no encontrada: {codigo}")

    usuario = _obtener_usuario_actual(request)
    todas_itis = intendencias_db.listar_intendencias()
    sedes_iti = intendencias_db.listar_sedes(codigo)

    return plantillas.TemplateResponse(
        request,
        "comparativo.html",
        {
            "nivel": "iti",
            "intendencia_actual": iti_info,
            "intendencias": todas_itis,
            "sedes": sedes_iti,
            "intervalo": config.INTERVALO_REFRESCO,
            "version": str(int(time.time())),
            "usuario": usuario,
            "es_detallado": usuario.get("rol") in ("admin", "directivo"),
            "es_admin": usuario.get("rol") == "admin",
        },
    )


@app.get("/control/{codigo}", response_class=HTMLResponse)
@app.get("/sede/{codigo}", response_class=HTMLResponse)
@app.get("/tv/{codigo}", response_class=HTMLResponse)
def pantalla(request: Request, codigo: str):
    """Nivel 3: Tablero operativo en tiempo real de un Centro de Servicios al Contribuyente (CSC) específico."""
    sede_info = intendencias_db.obtener_sede(codigo)
    if not sede_info and codigo not in config.SEDES:
        raise HTTPException(404, f"CSC desconocido: {codigo}")
    
    todas_sedes = intendencias_db.listar_sedes()
    if not todas_sedes:
        todas_sedes = [{"codigo": s.codigo, "nombre": s.nombre} for s in config.SEDES.values()]

    # Resolver Intendencia padre y sedes hermanas de la misma ITI
    iti_cod = sede_info.get("intendencia_codigo", "iti_junin") if sede_info else "iti_junin"
    iti_info = intendencias_db.obtener_intendencia(iti_cod)
    sedes_hermanas = intendencias_db.listar_sedes(iti_cod)
    try:
        cons = worker.consolidado()
        estados = {s.get("codigo"): s.get("conectado", False) for s in cons.get("sedes", [])}
        for sh in sedes_hermanas:
            cod_sh = sh.get("codigo", "")
            sh["conectado"] = estados.get(cod_sh, estados.get(f"csc_{cod_sh}", estados.get(cod_sh.replace("csc_", ""), False)))
    except Exception:
        pass

    nombre_sede = sede_info["nombre"] if sede_info else config.SEDES[codigo].nombre
    usuario = _obtener_usuario_actual(request)
    return plantillas.TemplateResponse(
        request,
        "tablero.html",
        {
            "nivel": "csc",
            "sedes": todas_sedes,
            "sedes_hermanas": sedes_hermanas,
            "intendencia_padre": iti_info,
            "sede_actual": codigo,
            "sede_nombre": nombre_sede,
            "intervalo": config.INTERVALO_REFRESCO,
            "version": VERSION,
            "usuario_actual": usuario.get("nombre") if usuario.get("id") else _detectar_usuario_local(request),
            "usuario": usuario,
            "es_detallado": usuario.get("rol") in ("admin", "directivo"),
            "es_admin": usuario.get("rol") == "admin",
        },
    )


# ====================================================================
# GESTIÓN DE INTENDENCIAS Y CONEXIONES (CRUD PRECISO)
# ====================================================================

@app.get("/api/intendencias")
def api_listar_intendencias():
    """Lista todas las intendencias registradas con su conteo de sedes y estado."""
    return {"intendencias": intendencias_db.listar_intendencias()}


@app.get("/api/intendencias/{codigo}")
def api_obtener_intendencia(codigo: str):
    """Obtiene los detalles de una intendencia y sus sedes asociadas."""
    res = intendencias_db.obtener_intendencia(codigo)
    if not res:
        raise HTTPException(404, "Intendencia no encontrada")
    return res


@app.post("/api/intendencias")
async def api_crear_intendencia(request: Request):
    """Crea una nueva intendencia en el sistema."""
    data = await request.json()
    codigo = (data.get("codigo") or "").strip().lower()
    nombre = (data.get("nombre") or "").strip()
    siglas = (data.get("siglas") or "").strip()
    region = (data.get("region") or "").strip()
    color = (data.get("color") or "#2563eb").strip()
    tipo = (data.get("tipo_conexion") or "real").strip()
    descripcion = (data.get("descripcion") or "").strip()

    if not codigo or not nombre:
        raise HTTPException(400, "Código y nombre son obligatorios")
    try:
        nueva = intendencias_db.crear_intendencia(
            codigo=codigo,
            nombre=nombre,
            siglas=siglas or nombre[:12].upper(),
            region=region or "PERU",
            color=color,
            tipo_conexion=tipo,
            descripcion=descripcion,
        )
        worker.refrescar_todas()
        return {"ok": True, "intendencia": nueva}
    except Exception as e:
        raise HTTPException(400, f"Error al crear intendencia: {e}")


@app.put("/api/intendencias/{codigo}")
async def api_actualizar_intendencia(codigo: str, request: Request):
    """Actualiza una intendencia existente."""
    data = await request.json()
    res = intendencias_db.actualizar_intendencia(
        codigo=codigo,
        nombre=data.get("nombre"),
        siglas=data.get("siglas"),
        region=data.get("region"),
        color=data.get("color"),
        tipo_conexion=data.get("tipo_conexion"),
        descripcion=data.get("descripcion"),
    )
    if not res:
        raise HTTPException(404, "Intendencia no encontrada")
    worker.refrescar_todas()
    return {"ok": True, "intendencia": res}


@app.delete("/api/intendencias/{codigo}")
def api_eliminar_intendencia(codigo: str):
    """Elimina una intendencia y sus sedes asociadas."""
    ok = intendencias_db.eliminar_intendencia(codigo)
    if not ok:
        raise HTTPException(404, "Intendencia no encontrada")
    worker.refrescar_todas()
    return {"ok": True}


@app.get("/api/sedes")
def api_listar_sedes(intendencia: str | None = None):
    """Lista todas las sedes registradas, opcionalmente filtradas por intendencia."""
    return {"sedes": intendencias_db.listar_sedes(intendencia)}


@app.get("/api/sedes/{codigo}")
def api_obtener_sede(codigo: str):
    """Obtiene los parámetros de configuración de una sede."""
    s = intendencias_db.obtener_sede(codigo)
    if not s:
        raise HTTPException(404, "Sede no encontrada")
    return s


@app.post("/api/sedes")
async def api_crear_sede(request: Request):
    """Crea o conecta una nueva sede."""
    data = await request.json()
    codigo = (data.get("codigo") or "").strip().lower()
    nombre = (data.get("nombre") or "").strip()
    int_cod = (data.get("intendencia_codigo") or "").strip()
    if not codigo or not nombre or not int_cod:
        raise HTTPException(400, "Código, nombre e intendencia son obligatorios")
    try:
        nueva = intendencias_db.crear_sede(
            codigo=codigo,
            nombre=nombre,
            intendencia_codigo=int_cod,
            host=(data.get("host") or "127.0.0.1").strip(),
            puerto=int(data.get("puerto") or 1433),
            instancia=(data.get("instancia") or "SQLEXPRESS").strip(),
            base_datos=(data.get("base_datos") or "bdtvmediasunat").strip(),
            usuario=(data.get("usuario") or "sacolas").strip(),
            clave=(data.get("clave") or "sacolas").strip(),
            es_simulado=int(data.get("es_simulado") or 0),
        )
        worker.refrescar_todas()
        return {"ok": True, "sede": nueva}
    except Exception as e:
        raise HTTPException(400, f"Error al crear sede: {e}")


@app.put("/api/sedes/{codigo}")
async def api_actualizar_sede(codigo: str, request: Request):
    """Actualiza los parámetros o credenciales de conexión de una sede."""
    data = await request.json()
    res = intendencias_db.actualizar_sede(
        codigo=codigo,
        nombre=data.get("nombre"),
        intendencia_codigo=data.get("intendencia_codigo"),
        host=data.get("host"),
        puerto=data.get("puerto"),
        instancia=data.get("instancia"),
        base_datos=data.get("base_datos"),
        usuario=data.get("usuario"),
        clave=data.get("clave"),
        es_simulado=data.get("es_simulado"),
        activo=data.get("activo"),
    )
    if not res:
        raise HTTPException(404, "Sede no encontrada")
    worker.refrescar_todas()
    return {"ok": True, "sede": res}


@app.post("/api/sedes/{codigo}/test-conexion")
def api_test_conexion_sede(codigo: str):
    """Ejecuta un diagnóstico en tiempo real (ping TCP / validación de enlace) hacia la sede."""
    return intendencias_db.probar_conexion_sede(codigo)


@app.post("/api/sedes/{codigo}/toggle-modo")
def api_toggle_modo_sede(codigo: str):
    """Alterna instantáneamente una sede entre Conexión Real y Modo Simulado."""
    modificada = intendencias_db.alternar_modo_sede(codigo)
    if not modificada:
        raise HTTPException(404, "Sede no encontrada")
    worker.refrescar_todas()
    return {"ok": True, "sede": modificada}


@app.delete("/api/sedes/{codigo}")
def api_eliminar_sede(codigo: str):
    """Elimina una sede de la base de datos."""
    ok = intendencias_db.eliminar_sede(codigo)
    if not ok:
        raise HTTPException(404, "Sede no encontrada")
    worker.refrescar_todas()
    return {"ok": True}


# ====================================================================
# RUTAS DE API DE DATOS
# ====================================================================

@app.get("/api/tablero/{codigo}")
def api_tablero(codigo: str):
    """Retorna la información en formato JSON de una sede."""
    datos = worker.tablero(codigo)
    if datos is None:
        # Intentar refrescar sobre demanda
        sede_info = intendencias_db.obtener_sede(codigo)
        if sede_info:
            worker._refrescar_sede(sede_info)
            datos = worker.tablero(codigo)
        if datos is None:
            raise HTTPException(503, "Aun no hay lectura de esta sede")
    return datos


@app.get("/api/consolidado")
def api_consolidado():
    """Retorna el reporte consolidado de todas las sedes."""
    return worker.consolidado()


@app.get("/api/comparativo")
def api_comparativo(request: Request, intendencia: str | None = None):
    """Retorna la comparativa nacional (21 ITIs) o filtrada por una Intendencia específica."""
    usuario = _obtener_usuario_actual(request)
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


@app.get("/api/reporte/dia")
def api_reporte_dia(request: Request, sede: str, fecha: str):
    """Retorna el reporte de tickets para una sede y fecha. Acceso restringido para invitados."""
    usuario = _obtener_usuario_actual(request)
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


@app.get("/api/guia")
def api_obtener_guia(q: str = ""):
    """Retorna las preguntas y respuestas de la Guía desde MariaDB/MySQL tvm_preguntas."""
    try:
        return guia_db.obtener_todas(buscar=q)
    except Exception as e:
        log.error("Error al consultar preguntas en MySQL (%s:%s): %s", config.MYSQL_HOST, config.MYSQL_PUERTO, e)
        raise HTTPException(
            503,
            f"No se pudo conectar a la base de datos MariaDB ({config.MYSQL_HOST}:{config.MYSQL_PUERTO} - {config.MYSQL_DB}). Verifique que se encuentre conectado a la red/VPN institucional: {e}"
        )


@app.post("/api/guia")
async def api_crear_guia(request: Request):
    """Crea una nueva pregunta frecuente en MySQL tvm_preguntas."""
    payload = await request.json()
    pregunta = payload.get("pregunta", "").strip()
    respuesta = payload.get("respuesta", "").strip()
    if not pregunta or not respuesta:
        raise HTTPException(400, "Pregunta y respuesta son requeridas")
    try:
        return guia_db.crear_pregunta(pregunta, respuesta)
    except Exception as e:
        log.error("Error al insertar pregunta en MySQL: %s", e)
        raise HTTPException(503, f"Error al guardar pregunta en BD: {e}")


@app.put("/api/guia/{id_pregunta}")
async def api_actualizar_guia(id_pregunta: int, request: Request):
    """Actualiza una pregunta existente en MySQL tvm_preguntas por su ID."""
    payload = await request.json()
    pregunta = payload.get("pregunta", "").strip()
    respuesta = payload.get("respuesta", "").strip()
    if not pregunta or not respuesta:
        raise HTTPException(400, "Pregunta y respuesta son requeridas")
    try:
        res = guia_db.actualizar_pregunta(id_pregunta, pregunta, respuesta)
        if not res:
            raise HTTPException(404, "Pregunta no encontrada")
        return res
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error al actualizar pregunta en MySQL: %s", e)
        raise HTTPException(503, f"Error al actualizar en BD: {e}")


@app.delete("/api/guia/{id_pregunta}")
def api_eliminar_guia(id_pregunta: int):
    """Elimina una pregunta frecuente en MySQL tvm_preguntas por su ID."""
    try:
        ok = guia_db.eliminar_pregunta(id_pregunta)
        if not ok:
            raise HTTPException(404, "Pregunta no encontrada")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        log.error("Error al eliminar pregunta en MySQL: %s", e)
        raise HTTPException(503, f"Error al eliminar en BD: {e}")


@app.get("/api/salud")
def salud():
    """Retorna información sobre el estado del servicio y la base de datos."""
    consolidado = worker.consolidado()
    return {
        "driver": config.DB_DRIVER,
        "drivers_instalados": db.drivers_disponibles(),
        "base": config.DB_NOMBRE,
        "intervalo": config.INTERVALO_REFRESCO,
        "sedes": [
            {"codigo": s["codigo"], "conectado": s["conectado"]}
            for s in consolidado["sedes"]
        ],
    }

