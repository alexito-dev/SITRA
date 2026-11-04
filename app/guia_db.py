"""Módulo de base de datos MariaDB / MySQL para la Guía de Preguntas (tvm_preguntas)."""

from __future__ import annotations

import logging
import pymysql
import pymysql.cursors
from . import config

log = logging.getLogger("tablero.guia_db")


def get_connection():
    """Obtiene una conexión a la base de datos MariaDB / MySQL intendenciajunin."""
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
        log.warning("No se pudo conectar inmediatamente a MySQL (%s:%s): %s", config.MYSQL_HOST, config.MYSQL_PUERTO, e)


def obtener_todas(buscar: str = "") -> list[dict]:
    """Obtiene todas las preguntas de tvm_preguntas, filtrando opcionalmente por 'buscar'."""
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
                # Normaliza los nombres de campos (Id / id, Pregunta / pregunta, etc.)
                r_lower = {k.lower(): v for k, v in r.items()}
                resultado.append({
                    "id": r_lower.get("id"),
                    "pregunta": r_lower.get("pregunta") or "",
                    "respuesta": r_lower.get("respuesta") or ""
                })
            return resultado


def obtener_por_id(id_pregunta: int) -> dict | None:
    """Obtiene una pregunta por su Id."""
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


def crear_pregunta(pregunta: str, respuesta: str) -> dict:
    """Inserta una nueva pregunta en tvm_preguntas."""
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


def actualizar_pregunta(id_pregunta: int, pregunta: str, respuesta: str) -> dict | None:
    """Actualiza la pregunta y respuesta en tvm_preguntas por Id."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            sql = f"UPDATE {config.MYSQL_TABLA} SET Pregunta = %s, Respuesta = %s WHERE Id = %s"
            cur.execute(sql, (pregunta.strip(), respuesta.strip(), id_pregunta))
            # Retorna la pregunta actualizada
            return {
                "id": id_pregunta,
                "pregunta": pregunta.strip(),
                "respuesta": respuesta.strip()
            }


def eliminar_pregunta(id_pregunta: int) -> bool:
    """Elimina un registro de tvm_preguntas por Id."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            sql = f"DELETE FROM {config.MYSQL_TABLA} WHERE Id = %s"
            cur.execute(sql, (id_pregunta,))
            return cur.rowcount > 0
