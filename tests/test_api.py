"""Pruebas automáticas de integración para SITRA FastAPI y React SPA."""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from fastapi.testclient import TestClient
from backend.app.main import app

def test_system():
    client = TestClient(app)

    print("--- INICIANDO PRUEBAS DE INTEGRACIÓN SITRA ---")

    # 1. Test salud
    r = client.get("/api/salud")
    assert r.status_code == 200, f"Error en /api/salud: {r.status_code}"
    print("[PASS] /api/salud -> 200 OK | Base de datos:", r.json().get("base"))

    # 2. Test auth me
    r = client.get("/api/auth/me")
    assert r.status_code == 200, f"Error en /api/auth/me: {r.status_code}"
    u = r.json().get("usuario", {})
    print(f"[PASS] /api/auth/me -> 200 OK | Usuario detectado: {u.get('nombre')} ({u.get('rol')})")

    # 3. Test intendencias
    r = client.get("/api/intendencias")
    assert r.status_code == 200, f"Error en /api/intendencias: {r.status_code}"
    count_int = len(r.json().get("intendencias", []))
    assert count_int >= 21, f"Se esperaban al menos 21 intendencias, se encontraron {count_int}"
    print(f"[PASS] /api/intendencias -> 200 OK | Total ITIs oficiales: {count_int}")

    # 4. Test sedes
    r = client.get("/api/sedes")
    assert r.status_code == 200, f"Error en /api/sedes: {r.status_code}"
    count_sedes = len(r.json().get("sedes", []))
    assert count_sedes >= 90, f"Se esperaban al menos 90 sedes, se encontraron {count_sedes}"
    print(f"[PASS] /api/sedes -> 200 OK | Total Centros de Servicios: {count_sedes}")

    # 5. Test comparativo
    r = client.get("/api/comparativo")
    assert r.status_code == 200, f"Error en /api/comparativo: {r.status_code}"
    resumen = r.json().get("resumen_nacional", {})
    print(f"[PASS] /api/comparativo -> 200 OK | Tickets en curso nacional: {resumen.get('total_tickets_curso')}")

    # 6. Test tablero sede huancayo
    r = client.get("/api/tablero/huancayo")
    assert r.status_code == 200, f"Error en /api/tablero/huancayo: {r.status_code}"
    data_tablero = r.json()
    print(f"[PASS] /api/tablero/huancayo -> 200 OK | Espera: {len(data_tablero.get('espera', []))} tickets, Ventanillas: {len(data_tablero.get('atencion', []))}")

    # 7. Test SPA index.html
    r = client.get("/")
    assert r.status_code == 200, f"Error en /: {r.status_code}"
    assert '<div id="root">' in r.text, "index.html no contiene #root"
    print("[PASS] / -> 200 OK | React SPA index.html montado correctamente")

    # 8. Test SPA routing fallback /nacional
    r = client.get("/nacional")
    assert r.status_code == 200, f"Error en /nacional: {r.status_code}"
    assert '<div id="root">' in r.text, "/nacional fallback no retornó index.html"
    print("[PASS] /nacional -> 200 OK | HTML5 History fallback funcionando")

    # 9. Test Guía de trámites
    r = client.get("/api/guia")
    assert r.status_code == 200, f"Error en /api/guia: {r.status_code}"
    print(f"[PASS] /api/guia -> 200 OK | Preguntas cargadas: {len(r.json())}")

    print("\n==============================================")
    print("  TODAS LAS PRUEBAS PASARON EXITOSAMENTE (9/9)")
    print("==============================================")


if __name__ == "__main__":
    test_system()
