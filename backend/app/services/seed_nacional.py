"""Script de precarga oficial de las 21 Intendencias de Tributos Internos (ITI)
y 94 Centros de Servicios al Contribuyente (CSC) de SUNAT.
Fuente oficial: RS N.° 000103-2023/SUNAT y directorios oficiales de CSC SUNAT.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from ..core import config

DB_PATH = config.BASE_DIR / "intendencias.db"

INTENDENCIAS_OFICIALES = [
    {
        "codigo": "iti_lima",
        "nombre": "Intendencia Lima",
        "siglas": "INTENDENCIA LIMA",
        "region": "LIMA",
        "color": "#0163ac",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Callao (todo); Lima (solo Cañete, Canta, Huarochirí, Lima, Yauyos). 14 CSC.",
        "orden": 1,
        "sedes": [
            ("csc_canete", "CSC Cañete"),
            ("csc_ate", "CSC Ate"),
            ("csc_barranco", "CSC Barranco"),
            ("csc_callao", "CSC Callao"),
            ("csc_gamarra", "CSC Gamarra"),
            ("csc_la_victoria", "CSC La Victoria"),
            ("csc_arenales", "CSC Arenales"),
            ("csc_los_olivos", "CSC Los Olivos"),
            ("csc_pueblo_libre", "CSC Pueblo Libre"),
            ("csc_puente_piedra", "CSC Puente Piedra"),
            ("csc_san_isidro", "CSC San Isidro"),
            ("csc_sjl", "CSC San Juan de Lurigancho"),
            ("csc_surco", "CSC Surco"),
            ("csc_ves", "CSC Villa El Salvador"),
        ]
    },
    {
        "codigo": "iti_arequipa",
        "nombre": "ITI Arequipa",
        "siglas": "ITI AREQUIPA",
        "region": "AREQUIPA",
        "color": "#2563eb",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Arequipa (todo); Moquegua (solo General Sánchez Cerro excepto Chojata, Ichuña, Lloque, Quinistaquillas y Yunga). 6 CSC.",
        "orden": 2,
        "sedes": [
            ("csc_arequipa", "CSC Arequipa"),
            ("csc_la_tomilla", "CSC La Tomilla"),
            ("csc_paucarpata", "CSC Paucarpata"),
            ("csc_camana", "CSC Camaná"),
            ("csc_el_pedregal", "CSC El Pedregal"),
            ("csc_mollendo", "CSC Mollendo"),
        ]
    },
    {
        "codigo": "iti_lalibertad",
        "nombre": "ITI La Libertad",
        "siglas": "ITI LA LIBERTAD",
        "region": "LA LIBERTAD",
        "color": "#0891b2",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: La Libertad (todo). 7 CSC.",
        "orden": 3,
        "sedes": [
            ("csc_casa_grande", "CSC Casa Grande"),
            ("csc_chepen", "CSC Chepén"),
            ("csc_huamachuco", "CSC Huamachuco"),
            ("csc_trujillo", "CSC Trujillo"),
            ("csc_union", "CSC Unión"),
            ("csc_las_quintanas", "CSC Las Quintanas"),
            ("csc_pacasmayo", "CSC Pacasmayo"),
        ]
    },
    {
        "codigo": "iti_ayacucho",
        "nombre": "ITI Ayacucho",
        "siglas": "ITI AYACUCHO",
        "region": "AYACUCHO",
        "color": "#7c3aed",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Ayacucho (todo). Salvedad: distritos Kimbiri y Pichari (La Convención, Cusco) los atiende ITI Ayacucho. 4 CSC.",
        "orden": 4,
        "sedes": [
            ("csc_ayacucho", "CSC Ayacucho"),
            ("csc_huanta", "CSC Huanta"),
            ("csc_kimbiri", "CSC Kimbiri"),
            ("csc_pichari", "CSC Pichari"),
        ]
    },
    {
        "codigo": "iti_cajamarca",
        "nombre": "ITI Cajamarca",
        "siglas": "ITI CAJAMARCA",
        "region": "CAJAMARCA",
        "color": "#d97706",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Cajamarca (todo). 3 CSC.",
        "orden": 5,
        "sedes": [
            ("csc_cajamarca", "CSC Cajamarca"),
            ("csc_jaen", "CSC Jaén"),
            ("csc_chota", "CSC Chota"),
        ]
    },
    {
        "codigo": "iti_chimbote",
        "nombre": "ITI Chimbote",
        "siglas": "ITI CHIMBOTE",
        "region": "ANCASH",
        "color": "#0284c7",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Áncash (solo Casma, Corongo, Huarmey, Pallasca, Santa, Sihuas). 2 CSC.",
        "orden": 6,
        "sedes": [
            ("csc_nuevo_chimbote", "CSC Nuevo Chimbote"),
            ("csc_chimbote", "CSC Chimbote"),
        ]
    },
    {
        "codigo": "iti_cusco",
        "nombre": "ITI Cusco",
        "siglas": "ITI CUSCO",
        "region": "CUSCO",
        "color": "#dc2626",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Cusco (todo); Apurímac (todo) (excepto Kimbiri y Pichari). 8 CSC.",
        "orden": 7,
        "sedes": [
            ("csc_abancay", "CSC Abancay"),
            ("csc_andahuaylas", "CSC Andahuaylas"),
            ("csc_cusco", "CSC Cusco"),
            ("csc_quillabamba", "CSC Quillabamba"),
            ("csc_sicuani", "CSC Sicuani"),
            ("csc_san_sebastian", "CSC San Sebastian"),
            ("csc_urubamba", "CSC Urubamba"),
            ("csc_espinar", "CSC Espinar"),
        ]
    },
    {
        "codigo": "iti_huacho",
        "nombre": "ITI Huacho",
        "siglas": "ITI HUACHO",
        "region": "LIMA PROVINCIAS",
        "color": "#475569",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Lima (solo Barranca, Cajatambo, Huaral, Huaura, Oyón). 3 CSC.",
        "orden": 8,
        "sedes": [
            ("csc_barranca", "CSC Barranca"),
            ("csc_huaral", "CSC Huaral"),
            ("csc_huacho", "CSC Huacho"),
        ]
    },
    {
        "codigo": "iti_huanuco",
        "nombre": "ITI Huánuco",
        "siglas": "ITI HUÁNUCO",
        "region": "HUÁNUCO",
        "color": "#16a34a",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Huánuco (todo); Pasco (todo, excepto Oxapampa). 3 CSC.",
        "orden": 9,
        "sedes": [
            ("csc_huanuco", "CSC Huánuco"),
            ("csc_tingo_maria", "CSC Tingo María"),
            ("csc_pasco", "CSC Pasco"),
        ]
    },
    {
        "codigo": "iti_huaraz",
        "nombre": "ITI Huaraz",
        "siglas": "ITI HUARAZ",
        "region": "ANCASH",
        "color": "#ea580c",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Áncash (todo, excepto Casma, Corongo, Huarmey, Pallasca, Santa, Sihuas). 3 CSC.",
        "orden": 10,
        "sedes": [
            ("csc_huaraz", "CSC Huaraz"),
            ("csc_caraz", "CSC Caraz"),
            ("csc_huari", "CSC Huari"),
        ]
    },
    {
        "codigo": "iti_ica",
        "nombre": "ITI Ica",
        "siglas": "ITI ICA",
        "region": "ICA",
        "color": "#059669",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Huancavelica (solo Huaytará); Ica (todo). 4 CSC.",
        "orden": 11,
        "sedes": [
            ("csc_chincha", "CSC Chincha"),
            ("csc_ica", "CSC Ica"),
            ("csc_pisco", "CSC Pisco"),
            ("csc_nasca", "CSC Nasca"),
        ]
    },
    {
        "codigo": "iti_juliaca",
        "nombre": "ITI Juliaca",
        "siglas": "ITI JULIACA",
        "region": "PUNO",
        "color": "#4338ca",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Puno (todo). 3 CSC.",
        "orden": 12,
        "sedes": [
            ("csc_juliaca", "CSC Juliaca"),
            ("csc_puno", "CSC Puno"),
            ("csc_desaguadero", "CSC Desaguadero"),
        ]
    },
    {
        "codigo": "iti_junin",
        "nombre": "ITI Junín",
        "siglas": "ITI JUNÍN",
        "region": "JUNIN",
        "color": "#0163ac",
        "tipo_conexion": "real",
        "descripcion": "Jurisdicción: Huancavelica (todo, excepto Huaytará); Junín (todo); Pasco (solo Oxapampa). 7 CSC con conexión local a SQL Server.",
        "orden": 13,
        "sedes": [
            ("huancavelica", "CSC Huancavelica"),
            ("chanchamayo", "CSC Chanchamayo"),
            ("huancayo", "CSC Huancayo"),
            ("laoroya", "CSC La Oroya"),
            ("satipo", "CSC Satipo"),
            ("tarma", "CSC Tarma"),
            ("oxapampa", "CSC Oxapampa"),
        ]
    },
    {
        "codigo": "iti_lambayeque",
        "nombre": "ITI Lambayeque",
        "siglas": "ITI LAMBAYEQUE",
        "region": "LAMBAYEQUE",
        "color": "#0284c7",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Amazonas (todo); Lambayeque (todo). 4 CSC.",
        "orden": 14,
        "sedes": [
            ("csc_chachapoyas", "CSC Chachapoyas"),
            ("csc_bagua_grande", "CSC Bagua Grande"),
            ("csc_balta", "CSC Balta"),
            ("csc_jlo", "CSC José Leonardo Ortíz"),
        ]
    },
    {
        "codigo": "iti_loreto",
        "nombre": "ITI Loreto",
        "siglas": "ITI LORETO",
        "region": "LORETO",
        "color": "#0d9488",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Loreto (todo, excepto Alto Amazonas, Ucayali). Salvedad: distritos Jeberos, Lagunas, Santa Cruz y Teniente César López Rojas los atiende ITI Loreto. 2 CSC.",
        "orden": 15,
        "sedes": [
            ("csc_punchana", "CSC Punchana"),
            ("csc_iquitos", "CSC Iquitos"),
        ]
    },
    {
        "codigo": "iti_madrededios",
        "nombre": "ITI Madre de Dios",
        "siglas": "ITI MADRE DE DIOS",
        "region": "MADRE DE DIOS",
        "color": "#15803d",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Madre de Dios (todo). 1 CSC.",
        "orden": 16,
        "sedes": [
            ("csc_madre_de_dios", "CSC Madre de Dios"),
        ]
    },
    {
        "codigo": "iti_piura",
        "nombre": "ITI Piura",
        "siglas": "ITI PIURA",
        "region": "PIURA",
        "color": "#0369a1",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Piura (todo). 6 CSC.",
        "orden": 17,
        "sedes": [
            ("csc_chulucanas", "CSC Chulucanas"),
            ("csc_paita", "CSC Paita"),
            ("csc_piura", "CSC Piura"),
            ("csc_sullana", "CSC Sullana"),
            ("csc_talara", "CSC Talara"),
            ("csc_sechura", "CSC Sechura"),
        ]
    },
    {
        "codigo": "iti_sanmartin",
        "nombre": "ITI San Martín",
        "siglas": "ITI SAN MARTÍN",
        "region": "SAN MARTÍN",
        "color": "#047857",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Loreto (solo Alto Amazonas, excepto 4 distritos); San Martín (todo). 6 CSC.",
        "orden": 18,
        "sedes": [
            ("csc_yurimaguas", "CSC Yurimaguas"),
            ("csc_moyobamba", "CSC Moyobamba"),
            ("csc_tarapoto", "CSC Tarapoto"),
            ("csc_tocache", "CSC Tocache"),
            ("csc_juanjui", "CSC Juanjui"),
            ("csc_nueva_cajamarca", "CSC Nueva Cajamarca"),
        ]
    },
    {
        "codigo": "iti_tacna",
        "nombre": "ITI Tacna",
        "siglas": "ITI TACNA",
        "region": "TACNA",
        "color": "#b91c1c",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Moquegua (todo, excepto General Sánchez Cerro); Tacna (todo). Salvedad: Chojata, Ichuña, Lloque, Quinistaquillas y Yunga los atiende ITI Tacna. 3 CSC.",
        "orden": 19,
        "sedes": [
            ("csc_ilo", "CSC Ilo"),
            ("csc_moquegua", "CSC Moquegua"),
            ("csc_tacna", "CSC Tacna"),
        ]
    },
    {
        "codigo": "iti_tumbes",
        "nombre": "ITI Tumbes",
        "siglas": "ITI TUMBES",
        "region": "TUMBES",
        "color": "#c2410c",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Tumbes (todo). 2 CSC.",
        "orden": 20,
        "sedes": [
            ("csc_aguas_verdes", "CSC Aguas Verdes"),
            ("csc_tumbes", "CSC Tumbes"),
        ]
    },
    {
        "codigo": "iti_ucayali",
        "nombre": "ITI Ucayali",
        "siglas": "ITI UCAYALI",
        "region": "UCAYALI",
        "color": "#4d7c0f",
        "tipo_conexion": "simulado",
        "descripcion": "Jurisdicción: Loreto (solo Ucayali); Ucayali (todo). 2 CSC.",
        "orden": 21,
        "sedes": [
            ("csc_raymondi", "CSC Raymondi"),
            ("csc_salvador_allende", "CSC Salvador Allende"),
        ]
    },
]


def sembrar_datos_nacionales():
    """Actualiza la base de datos de intendencias y sedes con la relación oficial de 21 ITIs y 94 CSCs."""
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS intendencias (
            codigo TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            siglas TEXT NOT NULL,
            region TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#2563eb',
            tipo_conexion TEXT NOT NULL DEFAULT 'real',
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

    # IPs de producción para Junín
    ips_junin = {
        "huancayo": "10.51.2.21",
        "chanchamayo": "10.133.2.21",
        "huancavelica": "10.70.2.21",
        "oxapampa": "10.183.2.21",
        "satipo": "10.182.2.21",
        "tarma": "10.82.2.21",
        "laoroya": "10.156.2.21",
    }

    # Limpiar y regenerar catálogo oficial
    cur.execute("DELETE FROM sedes_config")
    cur.execute("DELETE FROM intendencias")

    total_sedes = 0

    for int_data in INTENDENCIAS_OFICIALES:
        cur.execute("""
            INSERT INTO intendencias (codigo, nombre, siglas, region, color, tipo_conexion, descripcion, orden, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            int_data["codigo"],
            int_data["nombre"],
            int_data["siglas"],
            int_data["region"],
            int_data["color"],
            int_data["tipo_conexion"],
            int_data["descripcion"],
            int_data["orden"],
        ))

        for idx, (s_cod, s_nom) in enumerate(int_data["sedes"], start=1):
            total_sedes += 1
            es_junin = int_data["codigo"] == "iti_junin"
            host = ips_junin.get(s_cod, "127.0.0.1")
            es_sim = 0 if es_junin else 1

            cur.execute("""
                INSERT INTO sedes_config (
                    codigo, nombre, intendencia_codigo, host, puerto, instancia, base_datos, usuario, clave, es_simulado, orden, activo
                ) VALUES (?, ?, ?, ?, 1433, 'SQLEXPRESS', 'bdtvmediasunat', 'sacolas', 'sacolas', ?, ?, 1)
            """, (s_cod, s_nom, int_data["codigo"], host, es_sim, idx))

    conn.commit()
    conn.close()
    print(f"Éxito: {len(INTENDENCIAS_OFICIALES)} Intendencias y {total_sedes} CSCs precargados en {DB_PATH}")


if __name__ == "__main__":
    sembrar_datos_nacionales()
