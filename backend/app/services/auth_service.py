"""Módulo de base de datos local SQLite para autenticación y usuarios asignados."""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from ..core import config

log = logging.getLogger("tablero.auth_db")

# Ubicación de la base de datos local SQLite (Disco D:/SITRA/)
def _determinar_ruta_db() -> Path:
    """Resuelve la ruta de la base de datos de usuarios priorizando D:/SITRA/usuarios.db."""
    ruta_cfg = getattr(config, "RUTA_AUTH_DB", "D:/SITRA/usuarios.db")
    p = Path(ruta_cfg)
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        return p
    except Exception as e:
        log.warning("No se pudo acceder a la ruta primaria %s (%s). Usando respaldo local.", p, e)
        fallback = config.BASE_DIR / "usuarios.db"
        fallback.parent.mkdir(parents=True, exist_ok=True)
        return fallback


DB_PATH = _determinar_ruta_db()


def _obtener_conexion() -> sqlite3.Connection:
    """Retorna una conexión a la base de datos SQLite con soporte para diccionarios."""
    global DB_PATH
    try:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    except Exception as e:
        log.warning("Error al abrir base de datos en %s (%s). Usando directorio de respaldo.", DB_PATH, e)
        DB_PATH = config.BASE_DIR / "usuarios.db"
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)

    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def _hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    """Genera un hash seguro usando PBKDF2-HMAC-SHA256 con salt aleatorio."""
    if salt is None:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    ).hex()
    return pw_hash, salt


def _verificar_password(password: str, pw_hash: str, salt: str) -> bool:
    """Verifica si la contraseña ingresada coincide con el hash almacenado."""
    calc_hash, _ = _hash_password(password, salt)
    return secrets.compare_digest(calc_hash, pw_hash)


def inicializar_db():
    """Crea las tablas de usuarios y sesiones en SQLite si no existen, y asegura el administrador inicial."""
    with _obtener_conexion() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                correo TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                rol TEXT NOT NULL CHECK(rol IN ('admin', 'directivo')),
                activo INTEGER NOT NULL DEFAULT 1,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultimo_acceso TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sesiones (
                token TEXT PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expira_en TIMESTAMP NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones(token);
            CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
        """)
    log.info("Base de datos local de usuarios inicializada en: %s", DB_PATH)

    # Asegurar que exista al menos una cuenta de administrador
    with _obtener_conexion() as conn:
        tiene_admin = conn.execute("SELECT 1 FROM usuarios WHERE rol = 'admin' LIMIT 1").fetchone()
    if not tiene_admin:
        asegurar_admin(
            correo="admin@sunat.gob.pe",
            password="admin123",
            nombre="Administrador SITRA"
        )
        log.info("Cuenta administrador asegurada en: %s", DB_PATH)


def contar_usuarios() -> int:
    """Retorna el total de usuarios registrados."""
    with _obtener_conexion() as conn:
        res = conn.execute("SELECT COUNT(*) FROM usuarios").fetchone()
        return res[0] if res else 0


def crear_usuario(correo: str, nombre: str, password: str, rol: str = "directivo") -> dict:
    """Registra un nuevo usuario en la base de datos local."""
    correo_limpio = correo.strip().lower()
    nombre_limpio = nombre.strip()
    rol_limpio = rol.strip().lower()
    if rol_limpio not in ("admin", "directivo"):
        raise ValueError("El rol debe ser 'admin' o 'directivo'")

    pw_hash, salt = _hash_password(password)

    with _obtener_conexion() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO usuarios (correo, nombre, password_hash, salt, rol, activo)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (correo_limpio, nombre_limpio, pw_hash, salt, rol_limpio))
        nuevo_id = cur.lastrowid
        conn.commit()

    return {
        "id": nuevo_id,
        "correo": correo_limpio,
        "nombre": nombre_limpio,
        "rol": rol_limpio,
        "activo": 1,
    }


def autenticar(correo: str, password: str) -> dict | None:
    """Verifica las credenciales del usuario y actualiza la fecha de último acceso."""
    correo_limpio = correo.strip().lower()
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        fila = cur.execute("""
            SELECT id, correo, nombre, password_hash, salt, rol, activo
            FROM usuarios
            WHERE correo = ?
        """, (correo_limpio,)).fetchone()

        if not fila:
            return None

        if not fila["activo"]:
            raise PermissionError("La cuenta de usuario se encuentra desactivada")

        if not _verificar_password(password, fila["password_hash"], fila["salt"]):
            return None

        cur.execute("""
            UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?
        """, (fila["id"],))
        conn.commit()

        return {
            "id": fila["id"],
            "correo": fila["correo"],
            "nombre": fila["nombre"],
            "rol": fila["rol"],
            "activo": fila["activo"],
        }


def crear_sesion(usuario_id: int, dias_validez: int = 7) -> str:
    """Genera un token de sesión seguro y lo guarda en la base de datos."""
    token = secrets.token_urlsafe(32)
    expira_en = (datetime.utcnow() + timedelta(days=dias_validez)).strftime("%Y-%m-%d %H:%M:%S")

    with _obtener_conexion() as conn:
        conn.execute("""
            INSERT INTO sesiones (token, usuario_id, expira_en)
            VALUES (?, ?, ?)
        """, (token, usuario_id, expira_en))
        conn.commit()

    return token


def obtener_usuario_por_token(token: str) -> dict | None:
    """Obtiene el usuario asociado a un token de sesión activo."""
    if not token:
        return None

    ahora = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    with _obtener_conexion() as conn:
        fila = conn.execute("""
            SELECT u.id, u.correo, u.nombre, u.rol, u.activo
            FROM sesiones s
            JOIN usuarios u ON s.usuario_id = u.id
            WHERE s.token = ? AND s.expira_en > ? AND u.activo = 1
        """, (token, ahora)).fetchone()

        if not fila:
            return None

        return dict(fila)


def cerrar_sesion(token: str) -> None:
    """Elimina la sesión activa de la base de datos."""
    if not token:
        return
    with _obtener_conexion() as conn:
        conn.execute("DELETE FROM sesiones WHERE token = ?", (token,))
        conn.commit()


def listar_usuarios() -> list[dict]:
    """Retorna la lista de todos los usuarios registrados (sin hashes ni salts)."""
    with _obtener_conexion() as conn:
        filas = conn.execute("""
            SELECT id, correo, nombre, rol, activo, creado_en, ultimo_acceso
            FROM usuarios
            ORDER BY id ASC
        """).fetchall()
        return [dict(f) for f in filas]


def obtener_usuario_por_id(usuario_id: int) -> dict | None:
    """Obtiene un usuario por su ID numérico."""
    with _obtener_conexion() as conn:
        fila = conn.execute("""
            SELECT id, correo, nombre, rol, activo, creado_en, ultimo_acceso
            FROM usuarios
            WHERE id = ?
        """, (usuario_id,)).fetchone()
        return dict(fila) if fila else None


def actualizar_usuario(
    usuario_id: int,
    nombre: str | None = None,
    correo: str | None = None,
    password: str | None = None,
    rol: str | None = None,
    activo: int | None = None
) -> dict | None:
    """Actualiza los campos de un usuario existente."""
    with _obtener_conexion() as conn:
        fila = conn.execute("SELECT * FROM usuarios WHERE id = ?", (usuario_id,)).fetchone()
        if not fila:
            return None

        campos = []
        valores = []

        if nombre is not None and nombre.strip():
            campos.append("nombre = ?")
            valores.append(nombre.strip())

        if correo is not None and correo.strip():
            campos.append("correo = ?")
            valores.append(correo.strip().lower())

        if rol is not None and rol.strip().lower() in ("admin", "directivo"):
            campos.append("rol = ?")
            valores.append(rol.strip().lower())

        if activo is not None:
            campos.append("activo = ?")
            valores.append(1 if activo else 0)

        if password is not None and password.strip():
            pw_hash, salt = _hash_password(password.strip())
            campos.append("password_hash = ?")
            valores.append(pw_hash)
            campos.append("salt = ?")
            valores.append(salt)

        if not campos:
            return dict(fila)

        valores.append(usuario_id)
        sql = f"UPDATE usuarios SET {', '.join(campos)} WHERE id = ?"
        conn.execute(sql, tuple(valores))
        conn.commit()

        return obtener_usuario_por_id(usuario_id)


def eliminar_usuario(usuario_id: int) -> bool:
    """Elimina un usuario por su ID."""
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM usuarios WHERE id = ?", (usuario_id,))
        conn.commit()
        return cur.rowcount > 0


def asegurar_admin(correo: str, password: str, nombre: str = "Administrador SITRA") -> dict:
    """Garantiza la existencia o actualiza las credenciales de la cuenta administrador."""
    correo_limpio = correo.strip().lower()
    with _obtener_conexion() as conn:
        fila = conn.execute("""
            SELECT id FROM usuarios WHERE rol = 'admin' OR correo = ?
        """, (correo_limpio,)).fetchone()

        if fila:
            # Actualiza clave y nombre
            actualizar_usuario(
                fila["id"],
                nombre=nombre,
                correo=correo_limpio,
                password=password,
                rol="admin",
                activo=1
            )
            return obtener_usuario_por_id(fila["id"])
        else:
            return crear_usuario(
                correo=correo_limpio,
                nombre=nombre,
                password=password,
                rol="admin"
            )
