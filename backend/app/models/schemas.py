"""Modelos Pydantic v2 para validación de datos del API SITRA."""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    correo: str = Field(..., description="Correo institucional")
    password: str = Field(..., description="Contraseña de acceso")


class SetupAdminRequest(BaseModel):
    correo: str = Field(..., description="Correo del administrador")
    password: str = Field(..., description="Contraseña maestra")
    nombre: Optional[str] = Field("Administrador SITRA", description="Nombre del administrador")


class UserCreateRequest(BaseModel):
    correo: str
    nombre: str
    password: str
    rol: Optional[str] = "directivo"


class UserUpdateRequest(BaseModel):
    nombre: Optional[str] = None
    correo: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[int] = None


class IntendenciaCreate(BaseModel):
    codigo: str
    nombre: str
    siglas: Optional[str] = ""
    region: Optional[str] = "PERU"
    color: Optional[str] = "#2563eb"
    tipo_conexion: Optional[str] = "real"
    descripcion: Optional[str] = ""


class IntendenciaUpdate(BaseModel):
    nombre: Optional[str] = None
    siglas: Optional[str] = None
    region: Optional[str] = None
    color: Optional[str] = None
    tipo_conexion: Optional[str] = None
    descripcion: Optional[str] = None


class SedeCreate(BaseModel):
    codigo: str
    nombre: str
    intendencia_codigo: str
    host: Optional[str] = "127.0.0.1"
    puerto: Optional[int] = 1433
    instancia: Optional[str] = "SQLEXPRESS"
    base_datos: Optional[str] = "bdtvmediasunat"
    usuario: Optional[str] = "sacolas"
    clave: Optional[str] = "sacolas"
    es_simulado: Optional[int] = 0


class SedeUpdate(BaseModel):
    nombre: Optional[str] = None
    intendencia_codigo: Optional[str] = None
    host: Optional[str] = None
    puerto: Optional[int] = None
    instancia: Optional[str] = None
    base_datos: Optional[str] = None
    usuario: Optional[str] = None
    clave: Optional[str] = None
    es_simulado: Optional[int] = None
    activo: Optional[int] = None


class GuiaCreate(BaseModel):
    pregunta: str
    respuesta: str


class GuiaUpdate(BaseModel):
    pregunta: str
    respuesta: str
