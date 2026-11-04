# SITRA — Sistema Integral de Tiempos de Atención (SUNAT)
### Arquitectura Fullstack: FastAPI (Python) + React (TypeScript / Vite)

SITRA es la plataforma institucional para el monitoreo en tiempo real de tiempos de espera, atención, suspensión y producción operativa en las **21 Intendencias de Tributos Internos (ITI)** y los **94 Centros de Servicios al Contribuyente (CSC)** a nivel nacional.

---

## 🏗️ Arquitectura y Estructura del Proyecto

El sistema ha sido estructurado siguiendo principios de **Arquitectura Limpia (Clean Architecture)** y separación de responsabilidades:

```text
SITRA/
├── backend/                  # Servidor API REST con FastAPI 2.0
│   ├── app/
│   │   ├── core/             # Configuración central, conectores ODBC y seguridad NTLM/Windows
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/           # Esquemas y validaciones con Pydantic v2
│   │   │   └── schemas.py
│   │   ├── routers/          # Endpoints modulares del sistema
│   │   │   ├── auth.py       # Sesión, inicio de sesión, modo invitado y configuración admin
│   │   │   ├── intendencias.py # CRUD de las 21 Intendencias de Tributos Internos
│   │   │   ├── sedes.py      # CRUD de los 94 Centros de Servicios y pruebas de ping TCP
│   │   │   ├── tablero.py    # Datos operativos en vivo, consolidado y comparativo
│   │   │   ├── reportes.py   # Auditoría y reporte histórico por día con exportación CSV
│   │   │   ├── guia.py       # Guía de preguntas y trámites (MySQL tvm_preguntas + fallback)
│   │   │   ├── usuarios.py   # Gestión de cuentas y directivos (Solo Administrador)
│   │   │   └── salud.py      # Diagnóstico de drivers ODBC y conectividad
│   │   ├── services/         # Lógica de negocio y segundo plano
│   │   │   ├── auth_service.py
│   │   │   ├── intendencias_service.py
│   │   │   ├── guia_service.py
│   │   │   ├── seed_nacional.py
│   │   │   ├── querys.py
│   │   │   └── worker.py     # Worker en background con caché y generador de simulación
│   │   └── main.py           # App principal, CORS, Lifespan y montaje SPA React
│   ├── requirements.txt
│   └── run.py
│
├── frontend/                 # Aplicación Web SPA en React + TypeScript + Vite
│   ├── src/
│   │   ├── api/              # Cliente HTTP centralizado con credenciales seguras
│   │   ├── context/          # Estado global (AuthContext y permisos de rol)
│   │   ├── hooks/            # Hooks reactivos (usePolling, useClock)
│   │   ├── utils/            # Semáforos BSC, clasificación de tickets y formateadores
│   │   ├── types/            # Tipos e interfaces TypeScript
│   │   ├── components/
│   │   │   ├── layout/       # Sidebar colapsable, Topbar institucional y Layout shell
│   │   │   ├── common/       # KpiCard, Badge de estado y Modal reutilizable
│   │   │   ├── comparativo/  # HeroKpis, ItiCardGrid, RankingTable y MapView (Leaflet)
│   │   │   ├── tablero/      # Paneles de Espera, Atención, Suspensión, Producción y Demanda
│   │   │   └── modals/       # Modales de Reporte Día, Guía FAQ, Conexiones y Directivos
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── NacionalPage.tsx
│   │   │   ├── IntendenciaPage.tsx
│   │   │   └── CscTableroPage.tsx
│   │   ├── App.tsx           # Enrutamiento React Router v7
│   │   ├── index.css         # Sistema de diseño tokens y microanimaciones
│   │   └── main.tsx
│   └── dist/                 # Bundle compilado de producción servido por FastAPI
│
├── tests/                    # Pruebas automatizadas de integración
│   └── test_api.py
├── config.yaml               # Umbrales SLA y configuración de sedes
├── .env                      # Variables de entorno y credenciales de red
├── run.py                    # Lanzador unificado de la solución
├── iniciar.bat               # Inicio rápido local
├── INICIAR_SITRA_RED.bat     # Inicio para visualización en red local o TVs
└── compilar_frontend.bat     # Compilador de React a carpeta dist
```

---

## 🚀 Puesta en Marcha

### 1. Ejecución Unificada (Modo Producción Local)
Simplemente ejecuta:
```bat
python run.py
```
o haz doble clic en `iniciar.bat`.
El servidor FastAPI arrancará en `http://localhost:8080`, sirviendo automáticamente la interfaz React compilada y abriendo el navegador.

### 2. Modo Desarrollo con Recarga Rápida (Vite HMR)
Para trabajar en caliente con recarga automática:

**Terminal 1 — Backend FastAPI:**
```bat
python backend/run.py
```
*(Escuchando en `http://localhost:8080` con documentación interactiva en `http://localhost:8080/docs`)*

**Terminal 2 — Frontend React:**
```bat
cd frontend
npm run dev
```
*(Interfaz React en `http://localhost:5173` con proxy inverso automático a la API)*

### 3. Compilación del Frontend
Si realizas modificaciones en la carpeta `frontend/src`:
```bat
compilar_frontend.bat
```
o desde la carpeta `frontend`:
```bat
npm run build
```

---

## 🛡️ Niveles de Navegación y Vistas

1. **Nivel 1: Monitoreo Nacional (`/nacional`)**
   - 4 Hero KPIs ejecutivos (Tickets en curso, En cola, Tiempo medio espera, Cumplimiento SLA < 15m).
   - Alternancia de vistas:
     - **Tarjetas ITI:** Mosaico de las 21 Intendencias Regionales con métricas en tiempo real.
     - **Ranking General:** Tabla comparativa ordenada por desempeño operativo.
     - **Mapa del Perú:** Cartografía interactiva con Leaflet y GeoJSON de jurisdicciones.

2. **Nivel 2: Intendencia Regional (`/intendencia/:codigo`)**
   - Visualización detallada de los Centros de Servicios adscritos a dicha ITI.

3. **Nivel 3: Tablero Operativo CSC / Kiosco TV (`/sede/:codigo` o `/tv/:codigo`)**
   - Optimizado para televisores en salas de espera y computadoras de monitoreo.
   - Paneles en tiempo real: **Esperando Turno**, **En Atención**, **Ventanillas Suspendidas**, **Producción del Día** y **Distribución de Demanda por Hora**.
   - Selector desplegable de sedes hermanas, reloj oficial en vivo y modo Pantalla Completa.

4. **Herramientas y Administración Integradas:**
   - **Reporte por Día:** Auditoría de tickets históricos con filtro por fecha y exportación a CSV.
   - **Guía de Preguntas:** Base de conocimiento de trámites SUNAT conectada a MariaDB/MySQL con fallback local.
   - **Conexiones & Red:** Diagnóstico ping TCP en tiempo real y selector de modo Real SQL vs Simulado.
   - **Gestión Directivos:** Administración de cuentas institucionales y niveles de acceso (Admin, Directivo, Analista).

---

## 🧪 Validación y Pruebas Automatizadas
Para verificar la salud completa de la API, rutas y bundles estáticos:
```bat
python tests/test_api.py
```
Todas las 9 suites de pruebas validan el funcionamiento sin errores.
