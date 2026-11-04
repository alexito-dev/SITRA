"""Módulo de configuración del sistema SITRA."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml
from dotenv import load_dotenv

# Detección del directorio base de SITRA
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys.executable).resolve().parent
    RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", BASE_DIR))
else:
    # backend/app/core/config.py -> parents[3] = raíz de SITRA
    BASE_DIR = Path(__file__).resolve().parents[3]
    RESOURCE_DIR = BASE_DIR

# Carga de variables de entorno (.env)
env_path = BASE_DIR / ".env"
if not env_path.exists() and (RESOURCE_DIR / ".env").exists():
    env_path = RESOURCE_DIR / ".env"
load_dotenv(env_path)


@dataclass(frozen=True)
class Sede:
    codigo: str
    nombre: str
    host: str

    @property
    def server(self) -> str:
        """Retorna la cadena del servidor o instancia con puerto para ODBC."""
        base = f"{self.host}\\{DB_INSTANCIA}" if DB_INSTANCIA else self.host
        if DB_PUERTO:
            return f"{base},{DB_PUERTO}"
        return base


@dataclass(frozen=True)
class Umbral:
    ambar: float
    rojo: float

    def nivel(self, minutos: float) -> str:
        if minutos > self.rojo:
            return "rojo"
        if minutos >= self.ambar:
            return "ambar"
        return "verde"


# Carga de configuración de sedes y parámetros (config.yaml)
yaml_path = BASE_DIR / "config.yaml"
if not yaml_path.exists() and (RESOURCE_DIR / "config.yaml").exists():
    yaml_path = RESOURCE_DIR / "config.yaml"

if yaml_path.exists():
    _raw = yaml.safe_load(yaml_path.read_text(encoding="utf-8")) or {}
else:
    _raw = {"sedes": [], "semaforo": {}}

SEDES: dict[str, Sede] = {
    s["codigo"]: Sede(s["codigo"], s["nombre"], s["host"]) for s in _raw.get("sedes", [])
}

UMBRALES: dict[str, Umbral] = {
    k: Umbral(v["ambar"], v["rojo"]) for k, v in _raw.get("semaforo", {}).items()
}

INTERVALO_REFRESCO = int(_raw.get("intervalo_refresco", 10))
TIMEOUT_CONSULTA = int(_raw.get("timeout_consulta", 15))
PUERTO = int(os.getenv("PUERTO", _raw.get("puerto", 8080)))

# Credenciales y parámetros de conexión a la base de datos SQL Server
DB_USUARIO = os.getenv("DB_USUARIO", "sacolas")
DB_CLAVE = os.getenv("DB_CLAVE", "sacolas")
DB_NOMBRE = os.getenv("DB_NOMBRE", "bdtvmediasunat")
DB_INSTANCIA = os.getenv("DB_INSTANCIA", "SQLEXPRESS")
DB_PUERTO = os.getenv("DB_PUERTO", "1433")
DB_DRIVER = os.getenv("DB_DRIVER", "SQL Server")

# Rutas de bases de datos SQLite locales
RUTA_GUIA_DB = os.getenv("RUTA_GUIA_DB", _raw.get("ruta_guia_db", str(BASE_DIR / "guia.db")))
RUTA_AUTH_DB = os.getenv("RUTA_AUTH_DB", _raw.get("ruta_auth_db", str(BASE_DIR / "usuarios.db")))

# Parámetros de conexión MariaDB / MySQL para la Guía de Preguntas
MYSQL_HOST = os.getenv("MYSQL_HOST", _raw.get("mysql_host", "10.58.64.88"))
MYSQL_PUERTO = int(os.getenv("MYSQL_PUERTO", _raw.get("mysql_puerto", 3306)))
MYSQL_USUARIO = os.getenv("MYSQL_USUARIO", _raw.get("mysql_usuario", "prodrigu"))
MYSQL_CLAVE = os.getenv("MYSQL_CLAVE", _raw.get("mysql_clave", "Intendencia2026"))
MYSQL_DB = os.getenv("MYSQL_DB", _raw.get("mysql_db", "intendenciajunin"))
MYSQL_TABLA = os.getenv("MYSQL_TABLA", _raw.get("mysql_tabla", "tvm_preguntas"))
MYSQL_TIMEOUT = int(os.getenv("MYSQL_TIMEOUT", _raw.get("mysql_timeout", 4)))
