"""Services package initialization."""
from . import auth_service, intendencias_service, guia_service, seed_nacional, querys, worker

# Alias para compatibilidad interna
intendencias_db = intendencias_service
auth_db = auth_service
guia_db = guia_service
