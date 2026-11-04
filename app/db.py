"""Módulo de conexión y ejecución de consultas en SQL Server."""

from __future__ import annotations

import logging
from contextlib import contextmanager

from . import config

log = logging.getLogger(__name__)

try:
    import pyodbc
except ImportError:  # Permite ejecutar en modo demo si no está instalado el driver ODBC
    pyodbc = None


def obtener_driver_sql() -> str:
    """Detecta el driver ODBC de SQL Server disponible en la máquina del usuario."""
    if pyodbc is None:
        return config.DB_DRIVER
    drivers = pyodbc.drivers()
    if config.DB_DRIVER in drivers:
        return config.DB_DRIVER
    # Alternativas estándar en entornos corporativos de Windows / SUNAT
    preferencias = [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "ODBC Driver 13 for SQL Server",
        "ODBC Driver 11 for SQL Server",
        "SQL Server Native Client 11.0",
        "SQL Server",
    ]
    for d in preferencias:
        if d in drivers:
            log.info("Usando driver ODBC detectado: %s", d)
            return d
    return config.DB_DRIVER


def cadenas_conexion(sede: config.Sede) -> list[str]:
    """Genera variantes de la cadena de conexión ODBC para garantizar la conectividad."""
    driver_actual = obtener_driver_sql()
    variantes_servidor = []

    # Variante 1: Host con instancia y puerto TCP (ej: 10.51.2.21\SQLEXPRESS,1433)
    if config.DB_INSTANCIA and config.DB_PUERTO:
        variantes_servidor.append(f"{sede.host}\\{config.DB_INSTANCIA},{config.DB_PUERTO}")

    # Variante 2: Host directo con puerto TCP (ej: 10.51.2.21,1433) - como se conecta DBeaver
    if config.DB_PUERTO:
        variantes_servidor.append(f"{sede.host},{config.DB_PUERTO}")

    # Variante 3: Host con instancia sin puerto (ej: 10.51.2.21\SQLEXPRESS)
    if config.DB_INSTANCIA:
        variantes_servidor.append(f"{sede.host}\\{config.DB_INSTANCIA}")

    # Variante 4: Solo host
    variantes_servidor.append(sede.host)

    # Encrypt y TrustServerCertificate solo son soportados por ODBC Driver 17/18, causan error en 'SQL Server'
    attrs_seguridad = "Encrypt=no;TrustServerCertificate=yes;" if "ODBC Driver" in driver_actual else ""

    cadenas = []
    for srv in variantes_servidor:
        cadenas.append(
            f"DRIVER={{{driver_actual}}};"
            f"SERVER={srv};"
            f"DATABASE={config.DB_NOMBRE};"
            f"UID={config.DB_USUARIO};"
            f"PWD={config.DB_CLAVE};"
            f"{attrs_seguridad}"
            f"APP=SITRA_Gestion;"
        )
    return cadenas


@contextmanager
def conectar(sede: config.Sede):
    """Administrador de contexto que intenta conectar usando las variantes disponibles."""
    if pyodbc is None:
        raise RuntimeError(
            "pyodbc no esta instalado. Instala el driver ODBC de SQL Server "
            "o levanta el servicio con MODO_DEMO=1."
        )

    ultimo_error = None
    for cs in cadenas_conexion(sede):
        try:
            cn = pyodbc.connect(cs, timeout=config.TIMEOUT_CONSULTA)
            cn.timeout = config.TIMEOUT_CONSULTA
            try:
                yield cn
                return
            finally:
                cn.close()
        except Exception as exc:
            ultimo_error = exc
            log.debug("Fallo intento de conexión con %s: %s", cs, exc)
            continue

    if ultimo_error:
        raise ultimo_error


def consultar(sede: config.Sede, sql: str) -> list[dict]:
    """Ejecuta una consulta SQL y retorna los registros en formato de diccionario."""
    with conectar(sede) as cn:
        cur = cn.cursor()
        cur.execute(sql)
        columnas = [c[0] for c in cur.description]
        return [dict(zip(columnas, fila)) for fila in cur.fetchall()]


def consultar_varias(sede: config.Sede, consultas: dict[str, str]) -> dict[str, list[dict]]:
    """Ejecuta múltiples consultas utilizando una misma conexión."""
    resultado: dict[str, list[dict]] = {}
    errores: dict[str, Exception] = {}
    with conectar(sede) as cn:
        cur = cn.cursor()
        for nombre, sql in consultas.items():
            try:
                cur.execute(sql)
                columnas = [c[0] for c in cur.description] if cur.description else []
                resultado[nombre] = [dict(zip(columnas, f)) for f in cur.fetchall()]
            except Exception as exc:
                if nombre == "produccion_tipo" and "produccion_tipo_fallback" in consultas:
                    try:
                        cur.execute(consultas["produccion_tipo_fallback"])
                        columnas = [c[0] for c in cur.description] if cur.description else []
                        resultado[nombre] = [dict(zip(columnas, f)) for f in cur.fetchall()]
                        continue
                    except Exception:
                        pass
                log.warning("Sede %s - error en consulta '%s': %s", sede.nombre, nombre, exc)
                errores[nombre] = exc
                resultado[nombre] = []
        if len(errores) == len(consultas):
            primera_falla = next(iter(errores.values()))
            raise primera_falla
    return resultado


def drivers_disponibles() -> list[str]:
    """Retorna la lista de drivers ODBC instalados en el sistema."""
    return list(pyodbc.drivers()) if pyodbc else []

