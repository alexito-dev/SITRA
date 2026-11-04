"""Módulo de base de datos MariaDB / MySQL para la Guía de Preguntas con respaldo local."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from ..core import config

log = logging.getLogger("tablero.guia_service")

try:
    import pymysql
    import pymysql.cursors
except ImportError:
    pymysql = None

LOCAL_SEED_FILE = Path(__file__).resolve().parent / "guia_seed.json"
_local_cache: list[dict[str, Any]] | None = None


def _cargar_preguntas_locales() -> list[dict[str, Any]]:
    global _local_cache
    if _local_cache is not None:
        return _local_cache
    if LOCAL_SEED_FILE.exists():
        try:
            data = json.loads(LOCAL_SEED_FILE.read_text(encoding="utf-8"))
            if isinstance(data, list):
                _local_cache = []
                for idx, item in enumerate(data, 1):
                    _local_cache.append({
                        "id": item.get("id") or item.get("Id") or idx,
                        "pregunta": item.get("pregunta") or item.get("Pregunta") or "",
                        "respuesta": item.get("respuesta") or item.get("Respuesta") or "",
                    })
                return _local_cache
        except Exception as e:
            log.warning("No se pudo leer guia_seed.json: %s", e)
    _local_cache = []
    return _local_cache


def get_connection():
    """Obtiene una conexión a la base de datos MariaDB / MySQL intendenciajunin."""
    if pymysql is None:
        raise RuntimeError("pymysql no está instalado")
    return pymysql.connect(
        host=config.MYSQL_HOST,
        port=config.MYSQL_PUERTO,
        user=config.MYSQL_USUARIO,
        password=config.MYSQL_CLAVE,
        database=config.MYSQL_DB,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=config.MYSQL_TIMEOUT,
        read_timeout=config.MYSQL_TIMEOUT,
        write_timeout=config.MYSQL_TIMEOUT,
        autocommit=True
    )


def inicializar_db():
    """Verifica la existencia de la tabla tvm_preguntas en MariaDB/MySQL."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS {config.MYSQL_TABLA} (
                        Id INT AUTO_INCREMENT PRIMARY KEY,
                        Pregunta TEXT NOT NULL,
                        Respuesta LONGTEXT NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """)
        log.info("Verificación de tabla %s en MySQL exitosa.", config.MYSQL_TABLA)
    except Exception as e:
        log.warning("No se pudo conectar inmediatamente a MySQL (%s:%s): %s. Se usará respaldo local.", config.MYSQL_HOST, config.MYSQL_PUERTO, e)


def obtener_todas(buscar: str = "") -> list[dict]:
    """Obtiene todas las preguntas de tvm_preguntas o del respaldo local."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                if buscar and buscar.strip():
                    patron = f"%{buscar.strip()}%"
                    sql = f"""
                        SELECT Id, Pregunta, Respuesta 
                        FROM {config.MYSQL_TABLA}
                        WHERE Pregunta LIKE %s OR Respuesta LIKE %s
                        ORDER BY Id ASC
                    """
                    cur.execute(sql, (patron, patron))
                else:
                    sql = f"SELECT Id, Pregunta, Respuesta FROM {config.MYSQL_TABLA} ORDER BY Id ASC"
                    cur.execute(sql)

                filas = cur.fetchall()
                resultado = []
                for r in filas:
                    r_lower = {k.lower(): v for k, v in r.items()}
                    resultado.append({
                        "id": r_lower.get("id"),
                        "pregunta": r_lower.get("pregunta") or "",
                        "respuesta": r_lower.get("respuesta") or ""
                    })
                return resultado
    except Exception as exc:
        log.warning("Fallo al conectar con MySQL para preguntas (%s). Usando respaldo local.", exc)
        locales = _cargar_preguntas_locales()
        if buscar and buscar.strip():
            b = buscar.strip().lower()
            return [p for p in locales if b in p["pregunta"].lower() or b in p["respuesta"].lower()]
        return locales


def obtener_por_id(id_pregunta: int) -> dict | None:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                sql = f"SELECT Id, Pregunta, Respuesta FROM {config.MYSQL_TABLA} WHERE Id = %s"
                cur.execute(sql, (id_pregunta,))
                r = cur.fetchone()
                if not r:
                    return None
                r_lower = {k.lower(): v for k, v in r.items()}
                return {
                    "id": r_lower.get("id"),
                    "pregunta": r_lower.get("pregunta") or "",
                    "respuesta": r_lower.get("respuesta") or ""
                }
    except Exception:
        for p in _cargar_preguntas_locales():
            if p["id"] == id_pregunta:
                return p
        return None


def crear_pregunta(pregunta: str, respuesta: str) -> dict:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                sql = f"INSERT INTO {config.MYSQL_TABLA} (Pregunta, Respuesta) VALUES (%s, %s)"
                cur.execute(sql, (pregunta.strip(), respuesta.strip()))
                nuevo_id = cur.lastrowid
                return {
                    "id": nuevo_id,
                    "pregunta": pregunta.strip(),
                    "respuesta": respuesta.strip()
                }
    except Exception:
        # Fallback local
        locales = _cargar_preguntas_locales()
        nuevo_id = max([p["id"] for p in locales], default=0) + 1
        item = {"id": nuevo_id, "pregunta": pregunta.strip(), "respuesta": respuesta.strip()}
        locales.append(item)
        return item


def actualizar_pregunta(id_pregunta: int, pregunta: str, respuesta: str) -> dict | None:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                sql = f"UPDATE {config.MYSQL_TABLA} SET Pregunta = %s, Respuesta = %s WHERE Id = %s"
                cur.execute(sql, (pregunta.strip(), respuesta.strip(), id_pregunta))
                return {
                    "id": id_pregunta,
                    "pregunta": pregunta.strip(),
                    "respuesta": respuesta.strip()
                }
    except Exception:
        locales = _cargar_preguntas_locales()
        for p in locales:
            if p["id"] == id_pregunta:
                p["pregunta"] = pregunta.strip()
                p["respuesta"] = respuesta.strip()
                return p
        return None


def eliminar_pregunta(id_pregunta: int) -> bool:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                sql = f"DELETE FROM {config.MYSQL_TABLA} WHERE Id = %s"
                cur.execute(sql, (id_pregunta,))
                return cur.rowcount > 0
    except Exception:
        locales = _cargar_preguntas_locales()
        for i, p in enumerate(locales):
            if p["id"] == id_pregunta:
                locales.pop(i)
                return True
        return False
