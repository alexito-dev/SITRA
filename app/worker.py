"""Módulo de actualización en segundo plano.

Ejecuta un hilo para consultar periódicamente las sedes y guarda los
resultados en memoria para responder rápidamente desde la caché.
"""

from __future__ import annotations

import logging
import os
import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from . import config, db, querys

log = logging.getLogger(__name__)

CONSULTAS = {
    "espera": querys.ESPERA,
    "atencion": querys.ATENCION,
    "suspension": querys.SUSPENSION,
    "produccion": querys.PRODUCCION,
    "produccion_tipo": querys.PRODUCCION_TIPO,
    "produccion_tipo_fallback": querys.PRODUCCION_TIPO_FALLBACK,
    "demanda": querys.DEMANDA,
    "flujo_dia": querys.FLUJO_DIA,
    "flujo_mes": querys.FLUJO_MES,
    "kpis_dia": querys.KPIS_DIA,
}

_cache: dict[str, dict] = {}
_lock = threading.Lock()
_detener = threading.Event()


# Funciones de formato y cálculo de tiempos
def mmss(segundos: int | float | None) -> str:
    """Convierte segundos a formato de minutos y segundos (MM:SS)."""
    if segundos is None:
        return "--:--"
    segundos = max(0, int(segundos))
    return f"{segundos // 60:02d}:{segundos % 60:02d}"


def _calcular_segundos(hora_str: str | None, seg_sql: int | float | None) -> int:
    """Obtiene los segundos transcurridos desde una hora dada, con respaldo si SQL da 0."""
    if seg_sql is not None and int(seg_sql) > 0:
        return int(seg_sql)
    if hora_str:
        try:
            partes = [int(p) for p in str(hora_str).strip()[:8].split(":")]
            if len(partes) >= 2:
                hh = partes[0]
                mm = partes[1]
                ss = partes[2] if len(partes) > 2 else 0
                ahora = datetime.now()
                total_inicio = hh * 3600 + mm * 60 + ss
                total_ahora = ahora.hour * 3600 + ahora.minute * 60 + ahora.second
                diff = total_ahora - total_inicio
                return max(0, diff)
        except Exception:
            pass
    return max(0, int(seg_sql or 0))


def _nivel(clave: str, segundos: int | None) -> str:
    """Determina el nivel de alerta según los umbrales configurados."""
    if segundos is None:
        return "verde"
    return config.UMBRALES[clave].nivel(segundos / 60)


def clasificar_tipo(nombre_tipo: str | None, codigo_impresion: str | None, id_tipo: int | str | None = None) -> tuple[str, str]:
    """Clasifica un tipo de ticket en Orientación, Trámite, Mesa de Partes o Cabinas, y en General o Preferencial."""
    nom = (nombre_tipo or "").upper().strip()
    cod = (codigo_impresion or "").upper().strip()
    try:
        id_t = int(id_tipo) if id_tipo is not None else None
    except Exception:
        id_t = None

    # 1. Mesa de Partes (IDs 14, 15, 16 o si contiene MESA / PARTE o código M / MP)
    if (id_t in (14, 15, 16)) or "MESA" in nom or "PARTE" in nom or cod.startswith("M") or cod == "MP":
        return "Mesa de Partes", "General"

    # 2. Categoría Principal
    if "CABIN" in nom or "INTERNET" in nom or "VIRTUAL" in nom or cod.startswith("C"):
        cat = "Cabinas"
    elif "TRAM" in nom or cod.startswith("T"):
        cat = "Trámite"
    elif "ORIENT" in nom or cod.startswith("O"):
        cat = "Orientación"
    else:
        if "C" in cod:
            cat = "Cabinas"
        elif "T" in cod:
            cat = "Trámite"
        elif "O" in cod:
            cat = "Orientación"
        else:
            cat = "Orientación"

    # 3. Modalidad: Preferencial o General
    pref_keywords = ["PREF", "DISCAP", "CONADIS", "EMBARAZ", "ADULTO", "60", "65", "MAYOR"]
    if any(k in nom for k in pref_keywords) or cod.endswith("P") or cod.startswith("P") or "P" in cod:
        sub = "Preferencial"
    else:
        sub = "General"

    return cat, sub


# Estructuración de datos por sede
def _armar(sede: config.Sede, crudo: dict[str, list[dict]]) -> dict:
    """Organiza la información cruda de la base de datos para la vista del tablero."""
    espera = []
    for f in crudo.get("espera", []):
        seg = _calcular_segundos(f.get("hora_emision"), f.get("segundos"))
        ruc = (f.get("ruc") or "").strip()
        nom = (f.get("nombre_cliente") or "").strip()
        if ruc and nom and nom != ruc:
            contri_texto = f"{ruc} - {nom[:22]}"
        elif ruc:
            contri_texto = ruc
        else:
            contri_texto = nom or "—"

        espera.append({
            "ticket": f["num_ticket"].strip() if f.get("num_ticket") else "",
            "gestor": (f.get("funcionario") or "").strip() or "—",
            "cliente": contri_texto,
            "ruc": ruc,
            "nombre": nom,
            "hora": f.get("hora_emision"),
            "segundos": seg,
            "minutos": f"{seg // 60:02d}",
            "tiempo": mmss(seg),
            "nivel": _nivel("espera", seg),
        })

    atencion = []
    for f in crudo.get("atencion", []):
        seg = _calcular_segundos(f.get("hora_inicio"), f.get("segundos"))
        ruc = (f.get("ruc") or "").strip()
        nom = (f.get("nombre_cliente") or "").strip()
        if ruc and nom and nom != ruc:
            contri_texto = f"{ruc} - {nom[:22]}"
        elif ruc:
            contri_texto = ruc
        else:
            contri_texto = nom or "—"

        atencion.append({
            "ticket": f["num_ticket"].strip() if f.get("num_ticket") else "",
            "ventanilla": f.get("num_ventanilla"),
            "gestor": (f.get("funcionario") or "").strip() or "—",
            "cliente": contri_texto,
            "ruc": ruc,
            "nombre": nom,
            "hora": f.get("hora_inicio"),
            "segundos": seg,
            "minutos": f"{seg // 60:02d}",
            "tiempo": mmss(seg),
            "nivel": _nivel("atencion", seg),
        })

    suspension = []
    for f in crudo.get("suspension", []):
        seg = _calcular_segundos(f.get("inicio"), f.get("segundos"))
        suspension.append({
            "gestor": (f.get("funcionario") or "").strip(),
            "motivo": (f.get("motivo") or "").strip(),
            "hora": f.get("inicio"),
            "segundos": seg,
            "minutos": f"{seg // 60:02d}",
            "tiempo": mmss(seg),
            "nivel": _nivel("suspension", seg),
        })

    produccion = []
    for f in crudo.get("produccion", []):
        p_seg = int(f.get("prom_segundos") or 0)
        produccion.append({
            "gestor": (f.get("funcionario") or "").strip(),
            "atenciones": int(f.get("atenciones") or 0),
            "prom_segundos": p_seg,
            "prom_minutos": f"{p_seg // 60:02d}",
            "promedio": mmss(p_seg),
            "nivel": _nivel("atencion", p_seg),
        })

    # 3.2 Producción por Tipo de Ticket (Orientación, Trámite, Mesa de Partes, Cabinas - General y Preferencial)
    categorias_tipo = {
        "Orientación": {
            "General": {"atenciones": 0, "total_seg": 0},
            "Preferencial": {"atenciones": 0, "total_seg": 0},
        },
        "Trámite": {
            "General": {"atenciones": 0, "total_seg": 0},
            "Preferencial": {"atenciones": 0, "total_seg": 0},
        },
        "Mesa de Partes": {
            "General": {"atenciones": 0, "total_seg": 0},
            "Preferencial": {"atenciones": 0, "total_seg": 0},
        },
        "Cabinas": {
            "General": {"atenciones": 0, "total_seg": 0},
            "Preferencial": {"atenciones": 0, "total_seg": 0},
        },
    }

    for f in crudo.get("produccion_tipo", []):
        cat, sub = clasificar_tipo(f.get("nombre_tipo"), f.get("codigo_impresion"), f.get("id_tipo_ticket"))
        atenc = int(f.get("atenciones") or 0)
        p_seg = int(f.get("prom_segundos") or 0)
        if cat in categorias_tipo and sub in categorias_tipo[cat]:
            categorias_tipo[cat][sub]["atenciones"] += atenc
            categorias_tipo[cat][sub]["total_seg"] += atenc * p_seg

    produccion_tipo = []
    for cat_nombre in ["Orientación", "Trámite", "Mesa de Partes", "Cabinas"]:
        d_gen = categorias_tipo[cat_nombre]["General"]
        at_g = d_gen["atenciones"]
        seg_g = (d_gen["total_seg"] // at_g) if at_g > 0 else 0

        d_pref = categorias_tipo[cat_nombre]["Preferencial"]
        at_p = d_pref["atenciones"]
        seg_p = (d_pref["total_seg"] // at_p) if at_p > 0 else 0

        at_tot = at_g + at_p
        tot_seg = d_gen["total_seg"] + d_pref["total_seg"]
        seg_tot = (tot_seg // at_tot) if at_tot > 0 else 0

        produccion_tipo.append({
            "categoria": cat_nombre,
            "atenciones": at_tot,
            "prom_segundos": seg_tot,
            "prom_minutos": f"{seg_tot // 60:02d}",
            "promedio": mmss(seg_tot),
            "nivel": _nivel("atencion", seg_tot) if at_tot > 0 else "verde",
            "general": {
                "tipo": "General",
                "atenciones": at_g,
                "prom_segundos": seg_g,
                "prom_minutos": f"{seg_g // 60:02d}",
                "promedio": mmss(seg_g),
                "nivel": _nivel("atencion", seg_g) if at_g > 0 else "verde",
            },
            "preferencial": {
                "tipo": "Preferencial",
                "atenciones": at_p,
                "prom_segundos": seg_p,
                "prom_minutos": f"{seg_p // 60:02d}",
                "promedio": mmss(seg_p),
                "nivel": _nivel("atencion", seg_p) if at_p > 0 else "verde",
            },
        })

    demanda = []
    for f in crudo.get("demanda", []):
        if f.get("hora") is not None:
            h = int(f["hora"])
            m = int(f.get("minuto") or 0)
            interv = f.get("intervalo") or f"{h:02d}:{m:02d}"
            demanda.append({
                "intervalo": interv,
                "hora": h,
                "minuto": m,
                "emitidos": int(f.get("emitidos") or 0),
            })

    flujo_dia = []
    prom_dia_val = 0.0
    for f in crudo.get("flujo_dia", []):
        if f.get("hora") is not None:
            h = int(f["hora"])
            m = int(f.get("minuto") or 0)
            interv = f.get("intervalo") or f"{h:02d}:{m:02d}"
            pd = float(f.get("promedio_dia") or 0.0)
            if pd > 0:
                prom_dia_val = pd
            flujo_dia.append({
                "intervalo": interv,
                "hora": h,
                "minuto": m,
                "flujo": int(f.get("flujo") or 0),
                "promedio_hora": float(f.get("promedio_hora") or 0.0),
                "promedio_dia": pd,
            })

    flujo_mes = []
    prom_mes_val = 0.0
    for f in crudo.get("flujo_mes", []):
        if f.get("hora") is not None:
            h = int(f["hora"])
            m = int(f.get("minuto") or 0)
            interv = f.get("intervalo") or f"{h:02d}:{m:02d}"
            pm = float(f.get("promedio_mes") or 0.0)
            if pm > 0:
                prom_mes_val = pm
    # Respaldo inteligente: si por alguna razón la consulta agrupada de demanda no devolvió registros pero hay tickets activos
    if not demanda and (espera or atencion):
        conteo_fall = {}
        for t in (espera + atencion):
            h_str = t.get("hora") or ""
            if len(h_str) >= 5 and ":" in h_str:
                try:
                    parts = h_str.split(":")
                    hh = int(parts[0])
                    mm = 30 if int(parts[1]) >= 30 else 0
                    lbl = f"{hh:02d}:{mm:02d}"
                    conteo_fall[lbl] = conteo_fall.get(lbl, 0) + 1
                except Exception:
                    pass
        for lbl, cant in sorted(conteo_fall.items()):
            hh, mm = map(int, lbl.split(":"))
            demanda.append({
                "intervalo": lbl,
                "hora": hh,
                "minuto": mm,
                "emitidos": cant,
            })

    # Respaldo para flujo diario si no hay atenciones concluidas aún pero hay ventanillas atendiendo
    if not flujo_dia and atencion:
        conteo_flujo = {}
        for t in atencion:
            h_str = t.get("hora") or ""
            if len(h_str) >= 5 and ":" in h_str:
                try:
                    parts = h_str.split(":")
                    hh = int(parts[0])
                    mm = 30 if int(parts[1]) >= 30 else 0
                    lbl = f"{hh:02d}:{mm:02d}"
                    conteo_flujo[lbl] = conteo_flujo.get(lbl, 0) + 1
                except Exception:
                    pass
        for lbl, cant in sorted(conteo_flujo.items()):
            hh, mm = map(int, lbl.split(":"))
            flujo_dia.append({
                "intervalo": lbl,
                "hora": hh,
                "minuto": mm,
                "flujo": cant,
                "promedio_hora": 0.0,
                "promedio_dia": 0.0,
            })

    if not flujo_mes and flujo_dia:
        flujo_mes = [dict(item) for item in flujo_dia]
        prom_mes_val = prom_dia_val



    # Ordena de mayor a menor tiempo de espera para priorizar casos urgentes
    espera.sort(key=lambda t: -t["segundos"])
    atencion.sort(key=lambda t: -t["segundos"])

    esperas = [t["segundos"] for t in espera]
    llamadas_activas = len(espera) + len(atencion)

    total_atendidos = sum(p["atenciones"] for p in produccion)
    if total_atendidos == 0 and produccion_tipo:
        total_atendidos = sum(pt["atenciones"] for pt in produccion_tipo)

    # 4. KPIs globales del día (% Espera < 15 min y Tiempo de Atención Promedio)
    kpi_raw = crudo.get("kpis_dia", [{}])
    kpi_f = kpi_raw[0] if kpi_raw else {}
    tot_kpi = int(kpi_f.get("total_tickets") or 0)
    m15_kpi = int(kpi_f.get("espera_menor_15m") or 0)
    prom_ta_kpi = kpi_f.get("prom_atencion_segundos")

    if tot_kpi > 0:
        pct_15 = round((m15_kpi / tot_kpi) * 100, 1)
    else:
        tot_eval = len(espera) + total_atendidos
        m15_eval = sum(1 for e in espera if e["segundos"] <= 900) + total_atendidos
        pct_15 = round((m15_eval / tot_eval) * 100, 1) if tot_eval > 0 else 100.0

    if prom_ta_kpi is not None and int(prom_ta_kpi) > 0:
        ta_prom_seg = int(prom_ta_kpi)
    else:
        tot_at = sum(p["atenciones"] for p in produccion)
        ta_prom_seg = (sum(p["atenciones"] * p["prom_segundos"] for p in produccion) // tot_at) if tot_at > 0 else 0

    return {
        "sede": sede.nombre,
        "codigo": sede.codigo,
        "conectado": True,
        "actualizado": datetime.now().strftime("%H:%M:%S"),
        "espera": espera,
        "atencion": atencion,
        "suspension": suspension,
        "produccion": produccion,
        "produccion_tipo": produccion_tipo,
        "demanda": demanda,
        "flujo_dia": flujo_dia,
        "promedio_dia": prom_dia_val,
        "flujo_mes": flujo_mes,
        "promedio_mes": prom_mes_val,
        "resumen": {
            "en_cola": len(espera),
            "en_atencion": len(atencion),
            "suspendidos": len(suspension),
            "llamadas_activas": llamadas_activas,
            "atendidos_hoy": total_atendidos,
            "espera_max": mmss(max(esperas)) if esperas else "00:00",
            "espera_max_nivel": _nivel("espera", max(esperas)) if esperas else "verde",
            "espera_prom": mmss(sum(esperas) / len(esperas)) if esperas else "00:00",
            "pct_espera_15m": pct_15,
            "pct_espera_alerta": pct_15 < 90.0,
            "ta_prom": mmss(ta_prom_seg),
            "ta_prom_minutos": f"{ta_prom_seg // 60:02d}",
            "ta_prom_segundos": ta_prom_seg,
            "ta_prom_nivel": _nivel("atencion", ta_prom_seg) if ta_prom_seg > 0 else "verde",
        },
    }


# Tareas de actualización y sincronización
def _obtener_lista_sedes() -> list[dict]:
    """Obtiene la lista de sedes activas desde intendencias_db con respaldo en config.yaml."""
    try:
        from . import intendencias_db
        sedes = intendencias_db.listar_sedes()
        if sedes:
            return sedes
    except Exception as e:
        log.warning("No se pudo leer sedes desde intendencias_db: %s", e)
    # Respaldo
    return [
        {
            "codigo": s.codigo,
            "nombre": s.nombre,
            "host": s.host,
            "puerto": 1433,
            "instancia": "SQLEXPRESS",
            "base_datos": "bdtvmediasunat",
            "usuario": "sacolas",
            "clave": "sacolas",
            "es_simulado": 0 if s.codigo in ("huancayo", "tarma", "chanchamayo") else 1,
            "intendencia_codigo": "iti_junin",
            "intendencia_nombre": "Intendencia de Tributos Internos Junín (ITI Junín)",
            "region": "JUNIN",
            "color": "#2563eb",
        }
        for s in config.SEDES.values()
    ]


def _generar_datos_simulados(sede_info: dict) -> dict:
    """Genera telemetría operativa simulada realista, dinámica y coherente para la sede."""
    import hashlib
    codigo = sede_info.get("codigo", "demo")
    nombre = sede_info.get("nombre", f"CSC {codigo.upper()}")
    int_cod = sede_info.get("intendencia_codigo", "iti_junin")
    
    # Semilla pseudo-aleatoria estable por bloque de 2 minutos para fluidez
    now = datetime.now()
    seed_str = f"{codigo}_{now.hour}_{now.minute // 2}"
    h = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)

    # Nombres representativos según la región
    if "arequipa" in int_cod or "arequipa" in codigo or "camana" in codigo:
        gestores_pool = ["GONZALO CORNEJO", "VERÓNICA BUSTAMANTE", "FELIPE ZEGARRA", "MILAGROS CARPIO", "DIEGO BALLÓN", "GABRIELA TEJADA"]
        clientes_pool = [
            ("20100047218", "MINERA CERRO VERDE S.A.A."),
            ("20458129041", "TRANSPORTE Y LOGÍSTICA AREQUIPA S.A.C."),
            ("10294819201", "MANUEL ZÚÑIGA MEDINA"),
            ("20601938214", "TEXTILES DEL SUR E.I.R.L."),
            ("10419283741", "CARMEN PINTO VÁSQUEZ"),
            ("20549231844", "CONSORCIO MISTI INDUSTRIAL"),
        ]
    elif "ica" in int_cod or "chincha" in codigo or "pisco" in codigo or "nazca" in codigo:
        gestores_pool = ["ROSA BERNAOLA", "JORGE FALCONÍ", "MÓNICA ORMEÑO", "LUIS DONAYRE", "CARMEN TASAYCO", "ÁLVARO HERNÁNDEZ"]
        clientes_pool = [
            ("20100234567", "AGROEXPORTADORA ICA VERDE S.A.C."),
            ("20485910243", "BODEGA VIÑEDOS DEL SUR S.R.L."),
            ("10214589632", "LUIS FERNANDO CABRERA"),
            ("20602394812", "PESQUERA PARACAS S.A."),
            ("10458921345", "ANA MARÍA VALLE CANALES"),
            ("20539182741", "HOTELERA NAZCA LINES E.I.R.L."),
        ]
    else:
        gestores_pool = ["CARLOS QUISPE", "EDITH HUAMÁN", "MARCO POMAHUACRE", "SONIA ALANYA", "PATRICIA SOTO", "RAÚL VÍLCHEZ"]
        clientes_pool = [
            ("20100084721", "GRUPO ANDINO HUANCAYO S.A.C."),
            ("20486910243", "TRANSPORTES JUNÍN EXPRESS"),
            ("10428591231", "CARLOS MENDOZA BALDEÓN"),
            ("20601839201", "COMERCIALIZADORA EL CENTRO E.I.R.L."),
            ("10198273645", "MARITZA CAMPOS ORIHUELA"),
            ("20549231844", "CONSORCIO LA MERCED S.A.C."),
        ]

    # 1. Espera (1 a 5 tickets)
    num_espera = 1 + (h % 5)
    espera = []
    tipos_cod = ["O", "T", "M", "C"]
    for i in range(num_espera):
        cli = clientes_pool[(h + i) % len(clientes_pool)]
        t_cod = tipos_cod[(h + i) % len(tipos_cod)]
        seg = 120 + ((h * (i + 1)) % 720) # 2 a 14 min
        espera.append({
            "ticket": f"{t_cod}{10 + ((h + i * 3) % 40):02d}",
            "gestor": "—",
            "cliente": f"{cli[0]} - {cli[1][:22]}",
            "ruc": cli[0],
            "nombre": cli[1],
            "hora": (now - timedelta(seconds=seg)).strftime("%H:%M:%S"),
            "segundos": seg,
            "minutos": f"{seg // 60:02d}",
            "tiempo": mmss(seg),
            "nivel": _nivel("espera", seg),
        })
    espera.sort(key=lambda t: -t["segundos"])

    # 2. En atención (2 a 5 ventanillas)
    num_atencion = 2 + (h % 4)
    atencion = []
    for i in range(num_atencion):
        gestor = gestores_pool[i % len(gestores_pool)]
        cli = clientes_pool[(h + i + 2) % len(clientes_pool)]
        t_cod = tipos_cod[(h + i + 1) % len(tipos_cod)]
        seg = 180 + ((h * (i + 2)) % 480) # 3 a 11 min
        atencion.append({
            "ticket": f"{t_cod}{30 + ((h + i * 5) % 50):02d}",
            "ventanilla": str(i + 1),
            "gestor": gestor,
            "cliente": f"{cli[0]} - {cli[1][:22]}",
            "ruc": cli[0],
            "nombre": cli[1],
            "hora": (now - timedelta(seconds=seg)).strftime("%H:%M:%S"),
            "segundos": seg,
            "minutos": f"{seg // 60:02d}",
            "tiempo": mmss(seg),
            "nivel": _nivel("atencion", seg),
        })

    # 3. Suspensión (0 o 1)
    suspension = []
    if (h % 3) == 0 and len(gestores_pool) > num_atencion:
        seg_susp = 150 + (h % 300)
        suspension.append({
            "gestor": gestores_pool[-1],
            "motivo": "REFRIGERIO" if now.hour >= 13 else "COORDINACIÓN TÉCNICA",
            "hora": (now - timedelta(seconds=seg_susp)).strftime("%H:%M:%S"),
            "segundos": seg_susp,
            "minutos": f"{seg_susp // 60:02d}",
            "tiempo": mmss(seg_susp),
            "nivel": _nivel("suspension", seg_susp),
        })

    # 4. Producción del día
    base_prod = 35 + (h % 55)
    produccion = []
    for idx, g in enumerate(gestores_pool[:max(num_atencion + 1, 4)]):
        atenc = max(6, (base_prod // 4) + ((h + idx * 7) % 8) - 4)
        p_seg = 360 + ((h + idx * 23) % 200) # 6 a 9 min
        produccion.append({
            "gestor": g,
            "atenciones": atenc,
            "prom_segundos": p_seg,
            "prom_minutos": f"{p_seg // 60:02d}",
            "promedio": mmss(p_seg),
            "nivel": _nivel("atencion", p_seg),
        })

    total_atendidos = sum(p["atenciones"] for p in produccion)

    # 5. Producción por Tipo
    pct_orient = int(total_atendidos * 0.45)
    pct_tram = int(total_atendidos * 0.30)
    pct_mp = int(total_atendidos * 0.15)
    pct_cab = max(1, total_atendidos - (pct_orient + pct_tram + pct_mp))

    produccion_tipo = [
        {"categoria": "Orientación", "atenciones": pct_orient, "prom_segundos": 420, "promedio": "07:00", "nivel": "verde"},
        {"categoria": "Trámite", "atenciones": pct_tram, "prom_segundos": 480, "promedio": "08:00", "nivel": "verde"},
        {"categoria": "Mesa de Partes", "atenciones": pct_mp, "prom_segundos": 320, "promedio": "05:20", "nivel": "verde"},
        {"categoria": "Cabinas", "atenciones": pct_cab, "prom_segundos": 280, "promedio": "04:40", "nivel": "verde"},
    ]

    # 6. Histograma de Demanda (16 bloques 08:30 - 16:30)
    demanda = []
    horas = [
        ("08:30", 4), ("09:00", 9), ("09:30", 14), ("10:00", 18),
        ("10:30", 22), ("11:00", 25), ("11:30", 21), ("12:00", 16),
        ("12:30", 12), ("13:00", 10), ("13:30", 14), ("14:00", 19),
        ("14:30", 17), ("15:00", 15), ("15:30", 11), ("16:00", 6),
    ]
    for intervalo, base_emitidos in horas:
        emit = max(1, base_emitidos + ((h + int(intervalo[:2])) % 5) - 2)
        demanda.append({"intervalo": intervalo, "emitidos": emit})

    # KPIs
    esperas_sec = [t["segundos"] for t in espera]
    max_esp = max(esperas_sec) if esperas_sec else 0
    prom_esp = sum(esperas_sec) // len(esperas_sec) if esperas_sec else 0
    tot_eval = len(espera) + total_atendidos
    pct_15 = round(92.0 + (h % 70) / 10.0, 1) # 92.0% a 98.9%
    ta_prom_seg = sum(p["prom_segundos"] * p["atenciones"] for p in produccion) // total_atendidos if total_atendidos > 0 else 420

    return {
        "sede": nombre,
        "codigo": codigo,
        "intendencia_codigo": int_cod,
        "conectado": True,
        "es_simulado": True,
        "actualizado": now.strftime("%H:%M:%S"),
        "espera": espera,
        "atencion": atencion,
        "suspension": suspension,
        "produccion": produccion,
        "produccion_tipo": produccion_tipo,
        "demanda": demanda,
        "flujo_dia": demanda,
        "promedio_dia": 7.2,
        "flujo_mes": demanda,
        "promedio_mes": 7.0,
        "resumen": {
            "en_cola": len(espera),
            "en_atencion": len(atencion),
            "suspendidos": len(suspension),
            "llamadas_activas": len(espera) + len(atencion),
            "atendidos_hoy": total_atendidos,
            "espera_max": mmss(max_esp),
            "espera_max_nivel": _nivel("espera", max_esp),
            "espera_prom": mmss(prom_esp),
            "pct_espera_15m": pct_15,
            "pct_espera_alerta": pct_15 < 90.0,
            "ta_prom": mmss(ta_prom_seg),
            "ta_prom_minutos": f"{ta_prom_seg // 60:02d}",
            "ta_prom_segundos": ta_prom_seg,
            "ta_prom_nivel": _nivel("atencion", ta_prom_seg) if ta_prom_seg > 0 else "verde",
        },
    }


def _refrescar_sede(sede_dict: dict) -> None:
    """Actualiza la información de una sede (vía SQL Server real o simulación)."""
    cod = sede_dict["codigo"]
    nombre = sede_dict["nombre"]
    es_sim = bool(sede_dict.get("es_simulado", 0)) or os.getenv("MODO_DEMO") == "1"

    if es_sim:
        datos = _generar_datos_simulados(sede_dict)
    else:
        # Modo Conexión Real SQL Server
        host = sede_dict.get("host", "127.0.0.1")
        puerto = int(sede_dict.get("puerto", config.DB_PUERTO or 1433))
        
        # Pre-chequeo ultrarrápido TCP (0.6s) para no bloquear hilos si no hay VPN activa
        from . import intendencias_db
        test_red = intendencias_db.probar_conexion(host, puerto, timeout=0.6)
        
        if not test_red["ok"]:
            log.warning("Sede %s (host %s:%s) no accesible en red/VPN: %s", nombre, host, puerto, test_red["mensaje"])
            with _lock:
                previo = _cache.get(cod)
            if previo:
                datos = previo.copy()
            else:
                datos = _generar_datos_simulados(sede_dict)
            datos["conectado"] = False
            datos["es_simulado"] = False
            datos["error"] = f"Sin conexión a {host}:{puerto} (¿VPN SUNAT inactiva?): {test_red['mensaje']}"
        else:
            try:
                s_obj = config.Sede(cod, nombre, host)
                crudo = db.consultar_varias(s_obj, CONSULTAS)
                datos = _armar(s_obj, crudo)
                datos["es_simulado"] = False
                datos["intendencia_codigo"] = sede_dict.get("intendencia_codigo", "iti_junin")
            except Exception as exc:
                log.warning("Sede %s (host %s) error al consultar SQL Server: %s", nombre, host, exc)
                with _lock:
                    previo = _cache.get(cod)
                if previo:
                    datos = previo.copy()
                else:
                    datos = _generar_datos_simulados(sede_dict)
                datos["conectado"] = False
                datos["es_simulado"] = False
                datos["error"] = f"Error SQL Server en {host}: {str(exc)[:140]}"

    with _lock:
        _cache[cod] = datos


def refrescar_todas() -> None:
    """Consulta todas las sedes de forma paralela usando un grupo de hilos."""
    sedes = _obtener_lista_sedes()
    with ThreadPoolExecutor(max_workers=max(4, len(sedes))) as pool:
        list(pool.map(_refrescar_sede, sedes))


def _bucle() -> None:
    """Bucle principal que ejecuta las actualizaciones periódicas."""
    while not _detener.is_set():
        inicio = time.monotonic()
        try:
            refrescar_todas()
        except Exception:
            log.exception("Fallo el ciclo de refresco")
        espera = config.INTERVALO_REFRESCO - (time.monotonic() - inicio)
        _detener.wait(max(1.0, espera))


def iniciar() -> None:
    """Inicializa la caché e inicia el hilo de actualización en segundo plano."""
    try:
        from . import intendencias_db
        intendencias_db.inicializar_db()
    except Exception as e:
        log.warning("Error al inicializar intendencias_db: %s", e)

    sedes = _obtener_lista_sedes()
    with _lock:
        for s in sedes:
            cod = s["codigo"]
            if cod not in _cache:
                _cache[cod] = _generar_datos_simulados(s)
    threading.Thread(target=_bucle, name="worker", daemon=True).start()
    log.info("Refresco en segundo plano iniciado para %d sedes de intendencias", len(sedes))


def detener() -> None:
    """Detiene el bucle de actualización en segundo plano."""
    _detener.set()


def tablero(codigo: str) -> dict | None:
    """Retorna los datos actuales de una sede a partir de la caché."""
    with _lock:
        d = _cache.get(codigo)
        return d.copy() if d else None


def consolidado() -> dict:
    """Genera un reporte resumido con el estado de todas las sedes."""
    with _lock:
        datos = [d.copy() for d in _cache.values()]
    
    return {
        "actualizado": datetime.now().strftime("%H:%M:%S"),
        "sedes": [
            {
                "codigo": d["codigo"],
                "nombre": d["sede"],
                "conectado": d["conectado"],
                "es_simulado": d.get("es_simulado", False),
                "intendencia_codigo": d.get("intendencia_codigo", "iti_junin"),
                **d["resumen"],
            }
            for d in datos
        ],
        "totales": {
            "en_cola": sum(d["resumen"]["en_cola"] for d in datos),
            "en_atencion": sum(d["resumen"]["en_atencion"] for d in datos),
            "atendidos_hoy": sum(d["resumen"]["atendidos_hoy"] for d in datos),
            "sedes_caidas": sum(1 for d in datos if not d["conectado"]),
        },
    }


def reporte_comparativo(detallado: bool = False) -> dict:
    """Genera una vista comparativa completa agrupada por Intendencias y Sedes con nivel de detalle según rol."""
    # 1. Obtener intendencias configuradas
    intendencias_raw = []
    try:
        from . import intendencias_db
        intendencias_raw = intendencias_db.listar_intendencias()
    except Exception:
        pass

    if not intendencias_raw:
        intendencias_raw = [
            {"codigo": "iti_junin", "nombre": "Intendencia de Tributos Internos Junín (ITI Junín)", "siglas": "ITI JUNÍN", "region": "JUNIN", "color": "#2563eb", "tipo_conexion": "real"},
            {"codigo": "iti_ica", "nombre": "Intendencia Regional Ica (ITI Ica)", "siglas": "ITI ICA", "region": "ICA", "color": "#059669", "tipo_conexion": "simulado"},
            {"codigo": "iti_arequipa", "nombre": "Intendencia Regional Arequipa (ITI Arequipa)", "siglas": "ITI AREQUIPA", "region": "AREQUIPA", "color": "#d97706", "tipo_conexion": "simulado"},
        ]

    # Mapas de metadatos de intendencias
    mapa_intendencias = {i["codigo"]: i for i in intendencias_raw}

    with _lock:
        datos_cache = [d.copy() for d in _cache.values()]

    # Si la caché aún está fría, sembrar al vuelo
    if not datos_cache:
        sedes_base = _obtener_lista_sedes()
        for s in sedes_base:
            v = _generar_datos_simulados(s)
            _cache[s["codigo"]] = v
            datos_cache.append(v)

    sedes_comparativas = []
    tot_atendidos = 0
    tot_en_cola = 0
    tot_en_atencion = 0
    tot_suspendidos = 0
    tot_evaluados_kpi = 0
    tot_menor_15_kpi = 0
    sum_ta_ponderado = 0
    sedes_activas = 0
    max_espera_global_seg = 0

    # Agrupadores por intendencia
    stats_por_intendencia: dict[str, dict] = {
        i["codigo"]: {
            "codigo": i["codigo"],
            "nombre": i["nombre"],
            "siglas": i.get("siglas", i["nombre"]),
            "region": i.get("region", "PERU"),
            "color": i.get("color", "#2563eb"),
            "tipo_conexion": i.get("tipo_conexion", "real"),
            "totales": {
                "atendidos_hoy": 0,
                "en_cola": 0,
                "en_atencion": 0,
                "suspendidos": 0,
                "sedes_activas": 0,
                "total_sedes": 0,
                "pct_espera_15m": 100.0,
                "ta_prom": "00:00",
                "ta_prom_segundos": 0,
                "_evaluados_kpi": 0,
                "_menor_15_kpi": 0,
                "_sum_ta": 0,
            },
            "sedes": [],
        }
        for i in intendencias_raw
    }

    for d in datos_cache:
        resumen = d.get("resumen", {})
        conectado = bool(d.get("conectado", False))
        if conectado:
            sedes_activas += 1

        at_hoy = int(resumen.get("atendidos_hoy") or 0)
        en_cola = int(resumen.get("en_cola") or 0)
        en_at = int(resumen.get("en_atencion") or 0)
        susp = int(resumen.get("suspendidos") or 0)
        pct_15 = float(resumen.get("pct_espera_15m") or 100.0)
        ta_seg = int(resumen.get("ta_prom_segundos") or 0)

        tot_atendidos += at_hoy
        tot_en_cola += en_cola
        tot_en_atencion += en_at
        tot_suspendidos += susp

        evaluados_sede = at_hoy + en_cola
        if evaluados_sede > 0:
            tot_evaluados_kpi += evaluados_sede
            tot_menor_15_kpi += int((pct_15 / 100.0) * evaluados_sede)

        if at_hoy > 0 and ta_seg > 0:
            sum_ta_ponderado += (at_hoy * ta_seg)

        esperas_sede = [t.get("segundos", 0) for t in d.get("espera", [])]
        max_esp_sede = max(esperas_sede) if esperas_sede else 0
        if max_esp_sede > max_espera_global_seg:
            max_espera_global_seg = max_esp_sede

        servicios_totales = {"Orientación": 0, "Trámite": 0, "Mesa de Partes": 0, "Cabinas": 0}
        for pt in d.get("produccion_tipo", []):
            cat = pt.get("tipo", pt.get("categoria", "Orientación"))
            if cat in servicios_totales:
                servicios_totales[cat] += int(pt.get("atenciones") or 0)

        # Resolver a qué intendencia pertenece la sede
        int_cod = d.get("intendencia_codigo")
        if not int_cod or int_cod not in stats_por_intendencia:
            # Deducir por código
            c_low = d.get("codigo", "")
            if any(k in c_low for k in ("arequipa", "camana")):
                int_cod = "iti_arequipa"
            elif any(k in c_low for k in ("ica", "chincha", "pisco", "nazca")):
                int_cod = "iti_ica"
            else:
                int_cod = "iti_junin"

        int_meta = mapa_intendencias.get(int_cod, {})

        info_sede = {
            "codigo": d.get("codigo"),
            "nombre": d.get("sede"),
            "conectado": conectado,
            "es_simulado": bool(d.get("es_simulado", False)),
            "intendencia_codigo": int_cod,
            "intendencia_nombre": int_meta.get("nombre", "Intendencia Regional"),
            "intendencia_siglas": int_meta.get("siglas", "ITI"),
            "region": int_meta.get("region", "JUNIN"),
            "color": int_meta.get("color", "#2563eb"),
            "actualizado": d.get("actualizado"),
            "resumen": resumen,
            "demanda": d.get("demanda", []),
            "servicios": servicios_totales,
            "espera_max_seg": max_esp_sede,
            "espera_max_texto": mmss(max_esp_sede),
        }

        if detallado:
            info_sede["produccion"] = d.get("produccion", [])
            info_sede["produccion_tipo"] = d.get("produccion_tipo", [])
            info_sede["suspension"] = d.get("suspension", [])
            info_sede["tickets_en_cola"] = [
                {
                    "ticket": t.get("ticket"),
                    "tiempo": t.get("tiempo"),
                    "segundos": t.get("segundos"),
                    "nivel": t.get("nivel"),
                    "cliente": t.get("cliente"),
                    "ruc": t.get("ruc"),
                }
                for t in d.get("espera", [])
            ]
            info_sede["tickets_en_atencion"] = [
                {
                    "ticket": t.get("ticket"),
                    "tiempo": t.get("tiempo"),
                    "segundos": t.get("segundos"),
                    "nivel": t.get("nivel"),
                    "gestor": t.get("gestor"),
                    "ventanilla": t.get("ventanilla"),
                    "cliente": t.get("cliente"),
                }
                for t in d.get("atencion", [])
            ]

        sedes_comparativas.append(info_sede)

        # Acumular en la intendencia correspondiente
        if int_cod in stats_por_intendencia:
            st = stats_por_intendencia[int_cod]["totales"]
            st["atendidos_hoy"] += at_hoy
            st["en_cola"] += en_cola
            st["en_atencion"] += en_at
            st["suspendidos"] += susp
            st["total_sedes"] += 1
            if conectado:
                st["sedes_activas"] += 1
            if evaluados_sede > 0:
                st["_evaluados_kpi"] += evaluados_sede
                st["_menor_15_kpi"] += int((pct_15 / 100.0) * evaluados_sede)
            if at_hoy > 0 and ta_seg > 0:
                st["_sum_ta"] += (at_hoy * ta_seg)
            stats_por_intendencia[int_cod]["sedes"].append(info_sede)

    # Calcular KPIs finales por intendencia
    lista_intendencias_con_stats = []
    for int_cod, int_data in stats_por_intendencia.items():
        st = int_data["totales"]
        ev = st.pop("_evaluados_kpi", 0)
        m15 = st.pop("_menor_15_kpi", 0)
        sum_ta = st.pop("_sum_ta", 0)
        st["pct_espera_15m"] = round((m15 / ev) * 100, 1) if ev > 0 else 100.0
        ta_prom_seg = (sum_ta // st["atendidos_hoy"]) if st["atendidos_hoy"] > 0 else 0
        st["ta_prom_segundos"] = ta_prom_seg
        st["ta_prom"] = mmss(ta_prom_seg)
        lista_intendencias_con_stats.append(int_data)

    pct_global = round((tot_menor_15_kpi / tot_evaluados_kpi) * 100, 1) if tot_evaluados_kpi > 0 else 100.0
    ta_prom_global_seg = (sum_ta_ponderado // tot_atendidos) if tot_atendidos > 0 else 0

    return {
        "actualizado": datetime.now().strftime("%H:%M:%S"),
        "modo_detallado": detallado,
        "totales_regionales": {
            "atendidos_hoy": tot_atendidos,
            "en_cola": tot_en_cola,
            "en_atencion": tot_en_atencion,
            "suspendidos": tot_suspendidos,
            "pct_espera_15m": pct_global,
            "pct_espera_alerta": pct_global < 90.0,
            "ta_prom_segundos": ta_prom_global_seg,
            "ta_prom": mmss(ta_prom_global_seg),
            "espera_max_regional": mmss(max_espera_global_seg),
            "sedes_activas": sedes_activas,
            "sedes_total": len(sedes_comparativas),
            "sedes_caidas": len(sedes_comparativas) - sedes_activas,
        },
        "intendencias": lista_intendencias_con_stats,
        "sedes": sedes_comparativas,
    }


def obtener_reporte_dia(sede_codigo: str, fecha_str: str) -> dict:
    """Consulta el detalle histórico completo de tickets de una fecha específica."""
    from . import intendencias_db
    sede_info = intendencias_db.obtener_sede(sede_codigo)
    nombre_sede = sede_info["nombre"] if sede_info else (config.SEDES[sede_codigo].nombre if sede_codigo in config.SEDES else sede_codigo.upper())
    es_simulado = bool(sede_info.get("es_simulado", 0)) if sede_info else False
    fecha_limpia = fecha_str.strip()[:10]

    # Si es simulado o si MODO_DEMO está activo, generar tickets históricos creíbles
    if es_simulado or os.getenv("MODO_DEMO") == "1":
        import hashlib
        h = int(hashlib.md5(f"{sede_codigo}_{fecha_limpia}".encode()).hexdigest()[:8], 16)
        tot = 35 + (h % 35)
        tickets = []
        esperas = []
        atenciones = []
        espera_menor_15 = 0
        gestores_set = set(["CARLOS QUISPE", "EDITH HUAMÁN", "MARCO POMAHUACRE", "SONIA ALANYA", "PATRICIA SOTO"])
        
        for i in range(tot):
            esp_seg = 120 + ((h + i * 37) % 800)
            at_seg = 240 + ((h + i * 53) % 400)
            esperas.append(esp_seg)
            if esp_seg <= 900:
                espera_menor_15 += 1
            atenciones.append(at_seg)
            gestor = list(gestores_set)[i % len(gestores_set)]
            tipo_cat = ["Orientación", "Trámite", "Mesa de Partes", "Cabinas"][i % 4]
            ruc_val = f"20{100000000 + ((h + i * 997) % 899999999)}"
            cli_nom = f"EMPRESA {chr(65 + (i % 26))} S.A.C."
            h_emi = f"{8 + (i // 7):02d}:{(i * 7) % 60:02d}:00"
            h_ini = f"{8 + (i // 7):02d}:{(i * 7 + (esp_seg // 60)) % 60:02d}:00"
            h_fin = f"{8 + (i // 7):02d}:{(i * 7 + ((esp_seg + at_seg) // 60)) % 60:02d}:00"

            tickets.append({
                "id": i + 1,
                "ticket": f"{tipo_cat[0]}{10 + i:02d}",
                "tipo": tipo_cat,
                "subtipo": "General",
                "servicio": tipo_cat,
                "cliente": f"{ruc_val} - {cli_nom}",
                "ruc": ruc_val,
                "nombre": cli_nom,
                "gestor": gestor,
                "ventanilla": str((i % 4) + 1),
                "hora_emision": h_emi,
                "hora_inicio": h_ini,
                "hora_fin": h_fin,
                "espera_segundos": esp_seg,
                "espera_tiempo": mmss(esp_seg),
                "espera_nivel": _nivel("espera", esp_seg),
                "atencion_segundos": at_seg,
                "atencion_tiempo": mmss(at_seg),
                "atencion_nivel": _nivel("atencion", at_seg),
                "estado": "Atendido",
            })

        pct = round((espera_menor_15 / tot * 100), 1) if tot > 0 else 100.0
        prom_esp = sum(esperas) // tot if tot > 0 else 0
        prom_at = sum(atenciones) // len(atenciones) if atenciones else 0

        return {
            "sede": nombre_sede,
            "codigo": sede_codigo,
            "fecha": fecha_limpia,
            "conectado": True,
            "resumen": {
                "total_tickets": tot,
                "pct_espera_15m": pct,
                "pct_espera_alerta": pct < 90.0,
                "espera_prom": mmss(prom_esp),
                "espera_prom_segundos": prom_esp,
                "ta_prom": mmss(prom_at),
                "ta_prom_segundos": prom_at,
                "ta_prom_nivel": _nivel("atencion", prom_at) if prom_at > 0 else "verde",
                "gestores_activos": len(gestores_set),
            },
            "tickets": tickets,
        }

    # Caso Real: Consultar SQL Server
    sede = config.SEDES.get(sede_codigo)
    if not sede:
        if sede_info:
            sede = config.Sede(sede_info["codigo"], sede_info["nombre"], sede_info["host"])
        else:
            raise ValueError(f"Sede desconocida: {sede_codigo}")

    sql = querys.REPORTE_DIA.format(fecha=fecha_limpia)

    try:
        filas = db.consultar(sede, sql)
    except Exception as exc:
        log.warning("No se pudo consultar reporte de fecha %s en sede %s: %s", fecha_limpia, sede.nombre, exc)
        return {
            "sede": sede.nombre,
            "codigo": sede.codigo,
            "fecha": fecha_limpia,
            "conectado": False,
            "error": f"No se pudo comunicar con la base de datos: {exc}",
            "resumen": {
                "total_tickets": 0,
                "pct_espera_15m": 100.0,
                "pct_espera_alerta": False,
                "espera_prom": "00:00",
                "ta_prom": "00:00",
                "gestores_activos": 0,
            },
            "tickets": [],
        }

    tickets = []
    esperas = []
    atenciones = []
    espera_menor_15 = 0
    total_evaluados = 0
    gestores_set = set()

    for f in filas:
        esp_seg = int(f.get("espera_segundos") or 0)
        at_seg = int(f.get("atencion_segundos") or 0)
        hora_ini = (f.get("hora_inicio") or "").strip()
        estado_nom = (f.get("estado") or "").strip().lower()

        # Según la ficha técnica de SUNAT, solo se evalúan contribuyentes atendidos
        # o que estén actualmente en cola; se excluyen 'Fin_no_atendido' / cancelados
        es_evaluable = bool(hora_ini and hora_ini != "—") or ("cola" in estado_nom)
        if es_evaluable:
            total_evaluados += 1
            esperas.append(esp_seg)
            if esp_seg <= 900:
                espera_menor_15 += 1

        if at_seg > 0:
            atenciones.append(at_seg)

        gestor = (f.get("funcionario") or "—").strip()
        if gestor and gestor != "—":
            gestores_set.add(gestor)

        cat, sub = clasificar_tipo(f.get("tipo_ticket"), f.get("codigo_impresion"))

        ruc = (f.get("ruc") or "").strip()
        nom = (f.get("nombre_cliente") or "").strip()
        if ruc and nom and nom != ruc:
            cliente_str = f"{ruc} - {nom}"
        elif ruc:
            cliente_str = ruc
        else:
            cliente_str = nom or "—"

        tickets.append({
            "id": f.get("id_ticket"),
            "ticket": (f.get("num_ticket") or "").strip(),
            "tipo": cat,
            "subtipo": sub,
            "servicio": (f.get("tipo_ticket") or "").strip(),
            "cliente": cliente_str,
            "ruc": ruc,
            "nombre": nom,
            "gestor": gestor,
            "ventanilla": f.get("num_ventanilla") or "—",
            "hora_emision": f.get("hora_emision") or "—",
            "hora_inicio": f.get("hora_inicio") or "—",
            "hora_fin": f.get("hora_fin") or "—",
            "espera_segundos": esp_seg,
            "espera_tiempo": mmss(esp_seg),
            "espera_nivel": _nivel("espera", esp_seg),
            "atencion_segundos": at_seg,
            "atencion_tiempo": mmss(at_seg),
            "atencion_nivel": _nivel("atencion", at_seg) if at_seg > 0 else "verde",
            "estado": (f.get("estado") or "Atendido").strip(),
        })

    tot = len(tickets)
    pct = round((espera_menor_15 / total_evaluados * 100), 1) if total_evaluados > 0 else 100.0
    prom_esp = sum(esperas) // total_evaluados if total_evaluados > 0 else 0
    prom_at = sum(atenciones) // len(atenciones) if atenciones else 0

    return {
        "sede": sede.nombre,
        "codigo": sede.codigo,
        "fecha": fecha_limpia,
        "conectado": True,
        "resumen": {
            "total_tickets": tot,
            "pct_espera_15m": pct,
            "pct_espera_alerta": pct < 90.0,
            "espera_prom": mmss(prom_esp),
            "espera_prom_segundos": prom_esp,
            "ta_prom": mmss(prom_at),
            "ta_prom_segundos": prom_at,
            "ta_prom_nivel": _nivel("atencion", prom_at) if prom_at > 0 else "verde",
            "gestores_activos": len(gestores_set),
        },
        "tickets": tickets,
    }

