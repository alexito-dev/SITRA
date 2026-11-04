"""Módulo de base de datos SQLite para la gestión (CRUD) de Intendencias, Sedes y Conexiones."""

from __future__ import annotations

import logging
import socket
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from ..core import config

log = logging.getLogger("tablero.intendencias_db")

DB_PATH = config.BASE_DIR / "intendencias.db"


def _obtener_conexion() -> sqlite3.Connection:
    """Retorna una conexión a la base de datos SQLite de intendencias."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def inicializar_db() -> None:
    """Crea las tablas de intendencias y sedes si no existen, y precarga los datos iniciales."""
    with _obtener_conexion() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS intendencias (
                codigo TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                siglas TEXT NOT NULL,
                region TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#2563eb',
                tipo_conexion TEXT NOT NULL DEFAULT 'real', -- 'real' o 'simulado'
                descripcion TEXT,
                orden INTEGER DEFAULT 1,
                activo INTEGER DEFAULT 1,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sedes_config (
                codigo TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                intendencia_codigo TEXT NOT NULL,
                host TEXT NOT NULL DEFAULT '127.0.0.1',
                puerto INTEGER DEFAULT 1433,
                instancia TEXT DEFAULT 'SQLEXPRESS',
                base_datos TEXT DEFAULT 'bdtvmediasunat',
                usuario TEXT DEFAULT 'sacolas',
                clave TEXT DEFAULT 'sacolas',
                es_simulado INTEGER DEFAULT 0,
                latencia_ms INTEGER DEFAULT 0,
                ultimo_test_estado TEXT DEFAULT 'desconocido',
                ultimo_test_fecha TIMESTAMP,
                activo INTEGER DEFAULT 1,
                orden INTEGER DEFAULT 1,
                FOREIGN KEY (intendencia_codigo) REFERENCES intendencias(codigo) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_sedes_intendencia ON sedes_config(intendencia_codigo);
        """)

        # Verificar si hay intendencias registradas, si no, sembrar las 21 intendencias y 94 CSC oficiales
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM intendencias")
        total_int = cur.fetchone()[0]
        if total_int < 21:
            log.info("Precargando el catálogo nacional oficial de SUNAT (21 ITIs y 94 CSCs)...")
            try:
                from . import seed_nacional
                seed_nacional.sembrar_datos_nacionales()
            except Exception as err:
                log.error("Error al sembrar datos nacionales: %s", err)
            log.info("Intendencias y sedes inicializadas con éxito en: %s", DB_PATH)


# ====================================================================
# OPERACIONES CRUD: INTENDENCIAS
# ====================================================================

def listar_intendencias() -> list[dict[str, Any]]:
    """Lista todas las intendencias con su conteo de sedes."""
    inicializar_db()
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT i.*, 
                   COUNT(s.codigo) AS total_sedes,
                   SUM(CASE WHEN s.es_simulado = 1 THEN 1 ELSE 0 END) AS sedes_simuladas,
                   SUM(CASE WHEN s.es_simulado = 0 THEN 1 ELSE 0 END) AS sedes_reales
            FROM intendencias i
            LEFT JOIN sedes_config s ON i.codigo = s.intendencia_codigo AND s.activo = 1
            WHERE i.activo = 1
            GROUP BY i.codigo
            ORDER BY i.orden ASC, i.nombre ASC
        """)
        filas = cur.fetchall()
        return [dict(f) for f in filas]


def obtener_intendencia(codigo: str) -> dict[str, Any] | None:
    """Obtiene una intendencia por su código con todas sus sedes configuradas."""
    inicializar_db()
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM intendencias WHERE codigo = ?", (codigo,))
        fila = cur.fetchone()
        if not fila:
            return None
        res = dict(fila)
        cur.execute("SELECT * FROM sedes_config WHERE intendencia_codigo = ? AND activo = 1 ORDER BY orden ASC, nombre ASC", (codigo,))
        res["sedes"] = [dict(s) for s in cur.fetchall()]
        return res


def crear_intendencia(
    codigo: str,
    nombre: str,
    siglas: str,
    region: str,
    color: str = "#2563eb",
    tipo_conexion: str = "real",
    descripcion: str = "",
) -> dict[str, Any]:
    """Crea una nueva intendencia en el sistema."""
    inicializar_db()
    cod_limpio = codigo.strip().lower().replace(" ", "_")
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO intendencias (codigo, nombre, siglas, region, color, tipo_conexion, descripcion, orden)
            VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT IFNULL(MAX(orden), 0) + 1 FROM intendencias))
        """, (cod_limpio, nombre.strip(), siglas.strip().upper(), region.strip().upper(), color, tipo_conexion, descripcion.strip()))
        conn.commit()
    return obtener_intendencia(cod_limpio) # type: ignore


def actualizar_intendencia(
    codigo: str,
    nombre: str | None = None,
    siglas: str | None = None,
    region: str | None = None,
    color: str | None = None,
    tipo_conexion: str | None = None,
    descripcion: str | None = None,
) -> dict[str, Any] | None:
    """Actualiza los datos de una intendencia."""
    actual = obtener_intendencia(codigo)
    if not actual:
        return None

    nuevo_nombre = nombre.strip() if nombre is not None else actual["nombre"]
    nuevas_siglas = siglas.strip().upper() if siglas is not None else actual["siglas"]
    nueva_region = region.strip().upper() if region is not None else actual["region"]
    nuevo_color = color.strip() if color is not None else actual["color"]
    nuevo_tipo = tipo_conexion.strip() if tipo_conexion is not None else actual["tipo_conexion"]
    nueva_desc = descripcion.strip() if descripcion is not None else actual.get("descripcion", "")

    with _obtener_conexion() as conn:
        conn.execute("""
            UPDATE intendencias
            SET nombre = ?, siglas = ?, region = ?, color = ?, tipo_conexion = ?, descripcion = ?
            WHERE codigo = ?
        """, (nuevo_nombre, nuevas_siglas, nueva_region, nuevo_color, nuevo_tipo, nueva_desc, codigo))
        conn.commit()

    return obtener_intendencia(codigo)


def eliminar_intendencia(codigo: str) -> bool:
    """Elimina una intendencia y sus sedes asociadas."""
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM intendencias WHERE codigo = ?", (codigo,))
        conn.commit()
        return cur.rowcount > 0


# ====================================================================
# OPERACIONES CRUD: SEDES Y CONEXIONES
# ====================================================================

def listar_sedes(intendencia_codigo: str | None = None) -> list[dict[str, Any]]:
    """Lista todas las sedes registradas, opcionalmente filtradas por intendencia."""
    inicializar_db()
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        if intendencia_codigo:
            cur.execute("""
                SELECT s.*, i.nombre AS intendencia_nombre, i.siglas AS intendencia_siglas, i.region, i.color AS intendencia_color
                FROM sedes_config s
                JOIN intendencias i ON s.intendencia_codigo = i.codigo
                WHERE s.activo = 1 AND s.intendencia_codigo = ?
                ORDER BY s.orden ASC, s.nombre ASC
            """, (intendencia_codigo,))
        else:
            cur.execute("""
                SELECT s.*, i.nombre AS intendencia_nombre, i.siglas AS intendencia_siglas, i.region, i.color AS intendencia_color
                FROM sedes_config s
                JOIN intendencias i ON s.intendencia_codigo = i.codigo
                WHERE s.activo = 1
                ORDER BY i.orden ASC, s.orden ASC, s.nombre ASC
            """)
        return [dict(f) for f in cur.fetchall()]


def obtener_sede(codigo: str) -> dict[str, Any] | None:
    """Obtiene una sede por su código."""
    inicializar_db()
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT s.*, i.nombre AS intendencia_nombre, i.siglas AS intendencia_siglas, i.region, i.color AS intendencia_color
            FROM sedes_config s
            JOIN intendencias i ON s.intendencia_codigo = i.codigo
            WHERE s.codigo = ?
        """, (codigo,))
        fila = cur.fetchone()
        return dict(fila) if fila else None


def crear_sede(
    codigo: str,
    nombre: str,
    intendencia_codigo: str,
    host: str = "127.0.0.1",
    puerto: int = 1433,
    instancia: str = "SQLEXPRESS",
    base_datos: str = "bdtvmediasunat",
    usuario: str = "sacolas",
    clave: str = "sacolas",
    es_simulado: int = 0,
) -> dict[str, Any]:
    """Crea una nueva sede con sus parámetros de conexión."""
    inicializar_db()
    cod_limpio = codigo.strip().lower().replace(" ", "_")
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO sedes_config (
                codigo, nombre, intendencia_codigo, host, puerto, instancia, base_datos, usuario, clave, es_simulado, orden
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT IFNULL(MAX(orden), 0) + 1 FROM sedes_config WHERE intendencia_codigo = ?))
        """, (cod_limpio, nombre.strip(), intendencia_codigo, host.strip(), puerto, instancia.strip(), base_datos.strip(), usuario.strip(), clave.strip(), es_simulado, intendencia_codigo))
        conn.commit()
    return obtener_sede(cod_limpio) # type: ignore


def actualizar_sede(
    codigo: str,
    nombre: str | None = None,
    intendencia_codigo: str | None = None,
    host: str | None = None,
    puerto: int | None = None,
    instancia: str | None = None,
    base_datos: str | None = None,
    usuario: str | None = None,
    clave: str | None = None,
    es_simulado: int | None = None,
    activo: int | None = None,
) -> dict[str, Any] | None:
    """Actualiza la configuración o credenciales de conexión de una sede."""
    actual = obtener_sede(codigo)
    if not actual:
        return None

    nuevo_nombre = nombre.strip() if nombre is not None else actual["nombre"]
    nueva_int = intendencia_codigo.strip() if intendencia_codigo is not None else actual["intendencia_codigo"]
    nuevo_host = host.strip() if host is not None else actual["host"]
    nuevo_puerto = int(puerto) if puerto is not None else actual["puerto"]
    nueva_inst = instancia.strip() if instancia is not None else actual["instancia"]
    nueva_bd = base_datos.strip() if base_datos is not None else actual["base_datos"]
    nuevo_usr = usuario.strip() if usuario is not None else actual["usuario"]
    # Sin clave en el formulario = conservar la actual (la API ya no la devuelve al navegador)
    nueva_clave = clave.strip() if clave else actual["clave"]
    nuevo_sim = int(es_simulado) if es_simulado is not None else actual["es_simulado"]
    nuevo_act = int(activo) if activo is not None else actual["activo"]

    with _obtener_conexion() as conn:
        conn.execute("""
            UPDATE sedes_config
            SET nombre = ?, intendencia_codigo = ?, host = ?, puerto = ?, instancia = ?,
                base_datos = ?, usuario = ?, clave = ?, es_simulado = ?, activo = ?
            WHERE codigo = ?
        """, (nuevo_nombre, nueva_int, nuevo_host, nuevo_puerto, nueva_inst, nueva_bd, nuevo_usr, nueva_clave, nuevo_sim, nuevo_act, codigo))
        conn.commit()

    return obtener_sede(codigo)


def alternar_modo_sede(codigo: str) -> dict[str, Any] | None:
    """Alterna el modo de una sede entre Conexión Real y Simulado."""
    actual = obtener_sede(codigo)
    if not actual:
        return None
    nuevo_modo = 0 if actual["es_simulado"] == 1 else 1
    return actualizar_sede(codigo, es_simulado=nuevo_modo)


def eliminar_sede(codigo: str) -> bool:
    """Elimina una sede de la base de datos."""
    with _obtener_conexion() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM sedes_config WHERE codigo = ?", (codigo,))
        conn.commit()
        return cur.rowcount > 0


# ====================================================================
# TEST DE CONECTIVIDAD EN VIVO (DIAGNÓSTICO EN MILISEGUNDOS)
# ====================================================================

def probar_conexion(host: str, puerto: int = 1433, timeout: float = 0.6) -> dict[str, Any]:
    """Test rápido de apertura de socket TCP a un host y puerto dados."""
    inicio = time.perf_counter()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, int(puerto)))
        sock.close()
        duracion_ms = int((time.perf_counter() - inicio) * 1000)
        return {
            "ok": True,
            "host": host,
            "puerto": puerto,
            "latencia_ms": duracion_ms,
            "mensaje": f"Conexión exitosa a {host}:{puerto} en {duracion_ms} ms."
        }
    except Exception as exc:
        duracion_ms = int((time.perf_counter() - inicio) * 1000)
        return {
            "ok": False,
            "host": host,
            "puerto": puerto,
            "latencia_ms": duracion_ms,
            "mensaje": f"No alcanzable ({exc})"
        }


def probar_conexion_sede(codigo: str) -> dict[str, Any]:
    """
    Realiza un test de diagnóstico en vivo hacia la sede:
    - Si es simulado: Simula un ping local inmediato (0-2 ms).
    - Si es real: Intenta apertura de socket TCP al host y puerto configurados (timeout 2s).
    """
    sede = obtener_sede(codigo)
    if not sede:
        return {"ok": False, "codigo": codigo, "mensaje": "Sede no encontrada", "latencia_ms": -1}

    if sede["es_simulado"] == 1:
        resultado = {
            "ok": True,
            "codigo": codigo,
            "nombre": sede["nombre"],
            "modo": "simulado",
            "latencia_ms": 1,
            "mensaje": "Modo Simulado Activo: Generación de telemetría operativa en memoria.",
            "hora": datetime.now().strftime("%H:%M:%S"),
        }
        _guardar_test(codigo, "ok", 1)
        return resultado

    # Conexión Real: Test de socket TCP
    host = sede["host"]
    puerto = sede["puerto"] or 1433
    inicio = time.perf_counter()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2.5)  # 2.5 segundos máximo
        sock.connect((host, puerto))
        sock.close()
        duracion_ms = int((time.perf_counter() - inicio) * 1000)
        resultado = {
            "ok": True,
            "codigo": codigo,
            "nombre": sede["nombre"],
            "modo": "real",
            "host": host,
            "puerto": puerto,
            "latencia_ms": duracion_ms,
            "mensaje": f"Conexión TCP exitosa con SQL Server ({host}:{puerto}) en {duracion_ms} ms.",
            "hora": datetime.now().strftime("%H:%M:%S"),
        }
        _guardar_test(codigo, "ok", duracion_ms)
        return resultado
    except Exception as exc:
        duracion_ms = int((time.perf_counter() - inicio) * 1000)
        resultado = {
            "ok": False,
            "codigo": codigo,
            "nombre": sede["nombre"],
            "modo": "real",
            "host": host,
            "puerto": puerto,
            "latencia_ms": duracion_ms,
            "mensaje": f"No se pudo conectar a {host}:{puerto} ({exc}). Asegúrese de estar conectado a la red/VPN institucional de SUNAT.",
            "hora": datetime.now().strftime("%H:%M:%S"),
        }
        _guardar_test(codigo, "error", duracion_ms)
        return resultado


def _guardar_test(codigo: str, estado: str, latencia: int) -> None:
    try:
        with _obtener_conexion() as conn:
            conn.execute("""
                UPDATE sedes_config
                SET latencia_ms = ?, ultimo_test_estado = ?, ultimo_test_fecha = CURRENT_TIMESTAMP
                WHERE codigo = ?
            """, (latencia, estado, codigo))
            conn.commit()
    except Exception:
        pass
