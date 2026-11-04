/* ====================================================================
   SITRA - Lógica del Cliente para Gestión Tiempos (Junín)
   ==================================================================== */

const sede = document.body.dataset.sede;
const intervalo = (parseInt(document.body.dataset.intervalo, 10) || 10) * 1000;

const UMBRALES = {
  espera:     { ambar: 12, rojo: 15 },
  atencion:   { ambar: 5,  rojo: 8 },
  suspension: { ambar: 5,  rojo: 8 },
};

let datos = null;
let desfase = 0; // Segundos transcurridos desde la última lectura del servidor

const $ = (id) => document.getElementById(id);

function mmss(segundos) {
  const s = Math.max(0, Math.round(segundos));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function minutosStr(segundos) {
  const s = Math.max(0, Math.round(segundos));
  return String(Math.floor(s / 60)).padStart(2, "0");
}

function nivel(tipo, segundos) {
  const u = UMBRALES[tipo] || { ambar: 12, rojo: 15 };
  const m = segundos / 60;
  if (m > u.rojo) return "rojo";
  if (m >= u.ambar) return "ambar";
  return "verde";
}

function celda(texto, clase) {
  const td = document.createElement("td");
  td.textContent = texto ?? "";
  if (texto !== undefined && texto !== null && String(texto).trim() !== "") {
    td.title = String(texto);
  }
  if (clase) td.className = clase;
  return td;
}

// Clasifica el ticket por prefijo de categoría (Orientación, Trámite, Cabinas, Mesa de Partes)
function clasificarTicketCategoria(ticketStr) {
  const s = (ticketStr || "").toUpperCase().trim();
  if (s.startsWith("MP") || s.startsWith("M")) {
    return { id: "mesa", nombre: "Mesa de Partes", clase: "ticket-cat--mesa", pillClase: "ticket-pill--mesa" };
  }
  if (s.startsWith("TP") || s.startsWith("T")) {
    return { id: "tramite", nombre: "Trámite", clase: "ticket-cat--tramite", pillClase: "ticket-pill--tramite" };
  }
  if (s.startsWith("CP") || s.startsWith("C")) {
    return { id: "cabina", nombre: "Cabinas", clase: "ticket-cat--cabina", pillClase: "ticket-pill--cabina" };
  }
  if (s.startsWith("OP") || s.startsWith("O")) {
    return { id: "orientacion", nombre: "Orientación", clase: "ticket-cat--orientacion", pillClase: "ticket-pill--orientacion" };
  }
  return { id: "default", nombre: "General", clase: "ticket-cat--default", pillClase: "ticket-pill--default" };
}

// Crea la celda del ticket con color temático exclusivo para la celda según su categoría
function celdaTicket(ticketStr) {
  const td = document.createElement("td");
  const texto = (ticketStr || "").trim();
  const cat = clasificarTicketCategoria(texto);

  td.className = `ticket-cell ${cat.clase}`;
  if (texto) {
    td.title = `Ticket ${texto} (${cat.nombre})`;
  }

  const pill = document.createElement("span");
  pill.className = `ticket-pill ${cat.pillClase}`;
  pill.textContent = texto || "—";
  td.appendChild(pill);

  return td;
}

function celdaBsc(nivelColor) {
  const td = document.createElement("td");
  td.className = "col-bsc";
  const span = document.createElement("span");
  span.className = "bsc-dot bsc-dot--" + nivelColor;
  span.title = "Nivel BSC: " + nivelColor.toUpperCase();
  td.appendChild(span);
  return td;
}

function pintarTabla(cuerpoId, vacioId, conteoId, filas, constructor) {
  const cuerpo = $(cuerpoId);
  if (!cuerpo) return;
  cuerpo.replaceChildren(...filas.map(constructor));
  const vacio = $(vacioId);
  if (vacio) vacio.hidden = filas.length > 0;
  if (conteoId && $(conteoId)) $(conteoId).textContent = filas.length;
}

function pintarProduccionTipo(cuerpoId, vacioId, conteoId, categorias) {
  const cuerpo = $(cuerpoId);
  if (!cuerpo) return;

  const lista = (categorias && categorias.length > 0) ? categorias : [
    { categoria: "Orientación", atenciones: 0, prom_minutos: "00", nivel: "verde", general: { atenciones: 0, prom_minutos: "00", nivel: "verde" }, preferencial: { atenciones: 0, prom_minutos: "00", nivel: "verde" } },
    { categoria: "Trámite", atenciones: 0, prom_minutos: "00", nivel: "verde", general: { atenciones: 0, prom_minutos: "00", nivel: "verde" }, preferencial: { atenciones: 0, prom_minutos: "00", nivel: "verde" } },
    { categoria: "Mesa de Partes", atenciones: 0, prom_minutos: "00", nivel: "verde", general: { atenciones: 0, prom_minutos: "00", nivel: "verde" }, preferencial: { atenciones: 0, prom_minutos: "00", nivel: "verde" } },
    { categoria: "Cabinas", atenciones: 0, prom_minutos: "00", nivel: "verde", general: { atenciones: 0, prom_minutos: "00", nivel: "verde" }, preferencial: { atenciones: 0, prom_minutos: "00", nivel: "verde" } },
  ];

  let totalAtenc = 0;
  const filas = [];

  lista.forEach(p => {
    totalAtenc += (p.atenciones || 0);

    // 1. Categoría Principal
    const trCat = document.createElement("tr");
    trCat.className = "row-cat-header";
    trCat.append(celda(p.categoria, "tipo-cat-nom"));
    trCat.append(celda(p.atenciones ?? 0, "num-atenc"));
    trCat.append(celda(p.prom_minutos || "00", "num-prom"));
    trCat.append(celdaBsc(p.atenciones > 0 ? p.nivel : "verde"));
    filas.push(trCat);

    // 2. Subtipo General
    const gen = p.general || { atenciones: 0, prom_minutos: "00", nivel: "verde" };
    const trGen = document.createElement("tr");
    trGen.className = "row-subtipo";
    trGen.append(celda("General", "tipo-sub-nom"));
    trGen.append(celda(gen.atenciones ?? 0, "num-atenc"));
    trGen.append(celda(gen.prom_minutos || "00", "num-prom"));
    trGen.append(celdaBsc(gen.atenciones > 0 ? gen.nivel : "verde"));
    filas.push(trGen);

    // 3. Subtipo Preferencial (no aplica a Mesa de Partes ya que es 100% General)
    if (p.categoria !== "Mesa de Partes" || (p.preferencial && p.preferencial.atenciones > 0)) {
      const pref = p.preferencial || { atenciones: 0, prom_minutos: "00", nivel: "verde" };
      const trPref = document.createElement("tr");
      trPref.className = "row-subtipo";
      trPref.append(celda("Preferencial", "tipo-sub-nom"));
      trPref.append(celda(pref.atenciones ?? 0, "num-atenc"));
      trPref.append(celda(pref.prom_minutos || "00", "num-prom"));
      trPref.append(celdaBsc(pref.atenciones > 0 ? pref.nivel : "verde"));
      filas.push(trPref);
    }
  });

  cuerpo.replaceChildren(...filas);
  const vacio = $(vacioId);
  if (vacio) vacio.hidden = totalAtenc > 0 || filas.length > 0;
  if (conteoId && $(conteoId)) $(conteoId).textContent = totalAtenc;
}

// Lista de los 20 intervalos de 30 minutos (08:30 a 18:00)
const INTERVALOS_30M = [
  "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00",
  "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00"
];

function obtenerSiguienteIntervalo(label) {
  if (label === "18:00") return "18:00 (Cierre)";
  const [h, m] = label.split(":").map(Number);
  const totalMin = h * 60 + m + 30;
  const nextH = Math.floor(totalMin / 60);
  const nextM = totalMin % 60;
  return `${nextH.toString().padStart(2, "0")}:${nextM.toString().padStart(2, "0")}`;
}

// Funciones de tooltip para el histograma
function formatChartTooltipHtml(p, totalEmitidos) {
  let tagHtml = "";
  if (p.isCurrent) {
    tagHtml = `<span class="tip-tag tip-tag--live">En Vivo</span>`;
  } else if (p.esFuturo) {
    tagHtml = `<span class="tip-tag tip-tag--future">Pendiente</span>`;
  } else if (p.isPeak) {
    tagHtml = `<span class="tip-tag tip-tag--peak">Pico Máx</span>`;
  } else {
    tagHtml = `<span class="tip-tag tip-tag--normal">Bloque 30m</span>`;
  }

  let bodyHtml = "";
  if (p.val > 0) {
    const pct = totalEmitidos > 0 ? Math.round((p.val / totalEmitidos) * 100) : 0;
    bodyHtml = `
      <div class="tip-val">${p.val} <small>tickets</small></div>
      <div class="tip-comp" style="color: #38bdf8; font-size: 10px; margin-top: 2px;">
        Participación: <b>${pct}% del día</b>
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="tip-val" style="color: #94a3b8;">0 <small>tickets</small></div>
      <div class="tip-comp" style="color: #64748b; font-size: 9.5px; margin-top: 2px;">
        ${p.esFuturo ? 'Horario laboral por iniciar' : 'Sin tickets emitidos en este bloque'}
      </div>
    `;
  }

  return `
    <div class="tip-header">
      <span class="tip-hour">${p.label} - ${p.nextLabel}</span>
      ${tagHtml}
    </div>
    <div class="tip-body">
      ${bodyHtml}
    </div>
  `;
}

// Modo de vista para la curva de flujo: "dia" o "mes" (por defecto "dia")
let vistaFlujo = localStorage.getItem("sitra_flujo_vista") || "dia";

function formatFlujoTooltipHtml(p, promFlujoPorBloque, esDia) {
  const periodoLabel = esDia ? "Hoy" : "Mes";
  const picoBadge = p.isPeak
    ? `<span class="tip-tag tip-tag--peak">Pico ${periodoLabel}</span>`
    : (p.isCurrent ? `<span class="tip-tag tip-tag--live">En Vivo</span>` : `<span class="tip-tag tip-tag--normal">Bloque 30m</span>`);

  const taHStr = p.promedio_hora > 0 ? `${p.promedio_hora.toFixed(1)} min` : "—";

  return `
    <div class="tip-header">
      <span class="tip-hour">${p.label} - ${p.nextLabel} (${periodoLabel})</span>
      ${picoBadge}
    </div>
    <div class="tip-body">
      <div class="tip-val">${p.flujo} <small>atenciones</small></div>
      <div class="tip-comp" style="color: #cbd5e1; font-size: 10.5px; margin-top: 3px;">
        Tiempo Promedio: <b style="color: #38bdf8; margin-left: 3px;">${taHStr}</b>
      </div>
    </div>
  `;
}

function actualizarBotonesFlujo() {
  const btnDia = $("btn-flujo-dia");
  const btnMes = $("btn-flujo-mes");
  const titCard = $("flujo-card-title");
  const legFlujo = $("lbl-leg-flujo");

  const esDia = (vistaFlujo === "dia");
  if (btnDia) btnDia.classList.toggle("active", esDia);
  if (btnMes) btnMes.classList.toggle("active", !esDia);

  if (titCard) titCard.textContent = `Curva de Flujo Horario (${esDia ? 'Hoy' : 'Mes'})`;
  if (legFlujo) legFlujo.textContent = esDia ? "Flujo Hoy" : "Flujo Mes";
}

function cambiarVistaFlujo(tipo) {
  vistaFlujo = tipo;
  try {
    localStorage.setItem("sitra_flujo_vista", tipo);
  } catch (e) {}
  actualizarBotonesFlujo();
  if (datos) {
    dibujarCurva(datos.demanda, datos.flujo_dia, datos.promedio_dia, datos.flujo_mes, datos.promedio_mes);
  }
}

function configurarToggleFlujo() {
  const btnDia = $("btn-flujo-dia");
  const btnMes = $("btn-flujo-mes");
  if (btnDia) btnDia.addEventListener("click", () => cambiarVistaFlujo("dia"));
  if (btnMes) btnMes.addEventListener("click", () => cambiarVistaFlujo("mes"));
  actualizarBotonesFlujo();
}

function renderLiveMarker() {
  const svgHistLive = $("svg-hist-live");
  if (!svgHistLive) return;

  const ahora = new Date();
  const hNow = ahora.getHours();
  const mNow = ahora.getMinutes();
  const sNow = ahora.getSeconds();
  const curMin = hNow * 60 + mNow;

  // Horario laboral SUNAT: 08:30 (510 min) a 18:00 (1080 min) = 570 min totales
  const minInicio = 510;
  const minFin = 1080;
  const anchoTotal = 620;
  const baseLineY = 92;
  const paddingLeft = 30;
  const paddingRight = 14;
  const chartWidth = anchoTotal - paddingLeft - paddingRight;

  if (curMin >= minInicio && curMin <= minFin) {
    const frac = (curMin - minInicio + sNow / 60) / (minFin - minInicio);
    const liveX = Math.round(paddingLeft + frac * chartWidth);

    svgHistLive.innerHTML = `
      <g class="hist-live-group">
        <!-- Sombra verde resplandeciente en vivo -->
        <line x1="${liveX}" y1="12" x2="${liveX}" y2="${baseLineY}" stroke="#10b981" stroke-width="3.5" opacity="0.35" class="hist-live-glow" />
        
        <!-- Línea guía vertical verde punteada -->
        <line x1="${liveX}" y1="12" x2="${liveX}" y2="${baseLineY}" stroke="#10b981" stroke-width="1.8" stroke-dasharray="3,3" class="hist-live-line" />
        
        <!-- Faro/Beacon verde animado en el tope -->
        <circle cx="${liveX}" cy="12" r="5" fill="#10b981" class="hist-live-beacon" />
        <circle cx="${liveX}" cy="12" r="2.2" fill="#ffffff" />
        
        <!-- Badge AHORA verde sobre el indicador -->
        <g transform="translate(${liveX}, 1)">
          <rect x="-17" y="0" width="34" height="11" rx="3" fill="#10b981" class="hist-live-badge" />
          <text x="0" y="8" text-anchor="middle" font-size="7.5" font-weight="800" fill="#ffffff" letter-spacing="0.4">AHORA</text>
        </g>
      </g>
    `;
  } else {
    svgHistLive.innerHTML = "";
  }
}

function mostrarTooltipChart(e, html) {
  const tip = $("chart-tooltip");
  if (!tip) return;
  tip.innerHTML = html;
  tip.classList.add("chart-tooltip--visible");
  posicionarTooltipChart(e);
}

function posicionarTooltipChart(e) {
  const tip = $("chart-tooltip");
  if (!tip) return;
  const tipWidth = tip.offsetWidth || 140;
  const tipHeight = tip.offsetHeight || 65;
  
  let left = e.clientX;
  if (left + tipWidth / 2 > window.innerWidth - 12) {
    left = window.innerWidth - 12 - tipWidth / 2;
  }
  if (left - tipWidth / 2 < 12) {
    left = 12 + tipWidth / 2;
  }
  
  let top = e.clientY - 14;
  if (top - tipHeight < 10) {
    top = e.clientY + 24;
  }
  
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function ocultarTooltipChart() {
  const tip = $("chart-tooltip");
  if (!tip) return;
  tip.classList.remove("chart-tooltip--visible");
}

// Dibuja los dos reportes gráficos con bloques de 30 minutos (08:30 a 18:00)
function dibujarCurva(demanda, flujoDia, promDiaGlobal, flujoMes, promMesGlobal) {
  const svgBarras = $("svg-barras");
  const svgHistGrid = $("svg-hist-grid");

  const svgLinea = $("svg-linea");
  const svgArea = $("svg-area");
  const svgSec = $("svg-linea-sec");
  const svgGrid = $("svg-grid");
  const svgPuntos = $("svg-puntos");
  const svgFlujoHoras = $("svg-flujo-horas");
  const svgPromBadge = $("svg-prom-badge");
  const svgCurvaCrosshair = $("svg-curva-crosshair");

  const ahora = new Date();
  const curH = ahora.getHours();
  const curM = ahora.getMinutes();
  const curMinOfDay = curH * 60 + curM;

  const anchoTotal = 620;
  const baseLineY = 92;
  const maxBarHeight = 70;
  const paddingLeft = 30;
  const paddingRight = 14;
  const chartWidth = anchoTotal - paddingLeft - paddingRight;

  const N = INTERVALOS_30M.length; // 20 bloques
  const slotWidth = chartWidth / N; // ~28.8px
  const barWidth = 16; // Ancho de barra con buen cuerpo

  // -------------------------------------------------------------
  // REPORTE 1: HISTOGRAMA DE DEMANDA (CADA 30 MIN: 08:30 A 18:00)
  // -------------------------------------------------------------
  const mapaDemanda = {};
  if (demanda && demanda.length > 0) {
    demanda.forEach(d => {
      let intv = d.intervalo;
      if (!intv && d.hora !== undefined) {
        const m = (d.minuto !== undefined && d.minuto >= 30) ? "30" : "00";
        intv = `${d.hora.toString().padStart(2, "0")}:${m}`;
      }
      if (intv && intv.includes(":")) {
        const parts = intv.split(":");
        intv = `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
      }
      if (intv) {
        if (intv < "08:30") intv = "08:30";
        if (intv > "18:00") intv = "18:00";
        mapaDemanda[intv] = (mapaDemanda[intv] || 0) + (d.emitidos || 0);
      }
    });
  }

  // Horario laboral SUNAT: 08:30 (510 min) a 18:00 (1080 min)
  const dentroJornada = curMinOfDay >= 510 && curMinOfDay <= 1080;

  const puntos = INTERVALOS_30M.map((intv, idx) => {
    const [h, m] = intv.split(":").map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + 30;
    const val = mapaDemanda[intv] !== undefined ? mapaDemanda[intv] : 0;
    const isCurrent = curMinOfDay >= startMin && curMinOfDay < endMin;
    const esFuturo = dentroJornada && (startMin > curMinOfDay) && (val === 0);
    return {
      idx,
      hora: h,
      minuto: m,
      label: intv,
      nextLabel: obtenerSiguienteIntervalo(intv),
      val,
      esFuturo,
      isCurrent,
      tieneDato: val > 0,
    };
  });

  const totalEmitidos = puntos.reduce((acc, p) => acc + p.val, 0);
  const chipDemandaTotal = $("chip-demanda-total");
  if (chipDemandaTotal) {
    if (totalEmitidos > 0) {
      chipDemandaTotal.style.display = "inline-flex";
      chipDemandaTotal.innerHTML = `Total: <b>${totalEmitidos}</b> t.`;
    } else {
      chipDemandaTotal.style.display = "none";
    }
  }

  const puntosValidos = puntos.filter(p => p.val > 0);
  const peakVal = puntosValidos.length > 0 ? Math.max(...puntosValidos.map(p => p.val)) : 0;
  puntos.forEach(p => { p.isPeak = p.val > 0 && p.val === peakVal; });

  const maxVal = Math.max(10, Math.ceil((peakVal > 0 ? peakVal * 1.25 : 10)));
  const puntoPico = puntos.find(p => p.isPeak);
  const chipPico = $("chip-pico-live");
  if (chipPico) {
    if (puntoPico && peakVal > 0) {
      chipPico.style.display = "inline-flex";
      chipPico.innerHTML = `Pico: <b>${puntoPico.label}</b> (${peakVal} t.)`;
    } else {
      chipPico.style.display = "none";
    }
  }

  // Cuadrícula y escala en el eje Y del Histograma
  if (svgHistGrid) {
    let hGrid = "";
    [1.0, 0.66, 0.33].forEach(lvl => {
      const gy = baseLineY - Math.round(lvl * maxBarHeight);
      const valLvl = Math.round(lvl * maxVal);
      hGrid += `
        <line x1="${paddingLeft}" y1="${gy}" x2="${anchoTotal - paddingRight}" y2="${gy}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${paddingLeft - 5}" y="${gy + 2.5}" text-anchor="end" font-size="7" font-weight="600" fill="#94a3b8">${valLvl}</text>
      `;
    });
    // Línea base sólida y valor 0
    hGrid += `
      <line x1="${paddingLeft}" y1="${baseLineY}" x2="${anchoTotal - paddingRight}" y2="${baseLineY}" stroke="#cbd5e1" stroke-width="1.4" stroke-linecap="round" />
      <text x="${paddingLeft - 5}" y="${baseLineY + 2.5}" text-anchor="end" font-size="7" font-weight="600" fill="#94a3b8">0</text>
    `;
    svgHistGrid.innerHTML = hGrid;
  }

  // Columnas y Barras del Histograma
  let htmlBarras = "";
  puntos.forEach((p, i) => {
    const barHeight = (p.val > 0) ? Math.max(6, Math.round((p.val / maxVal) * maxBarHeight)) : 0;
    const centerX = Math.round(paddingLeft + i * slotWidth + slotWidth / 2);
    const x = Math.round(centerX - barWidth / 2);
    const y = baseLineY - barHeight;

    const trackW = Math.round(slotWidth - 4);
    const trackX = Math.round(centerX - trackW / 2);
    const trackY = 12;
    const trackH = baseLineY - trackY;

    const isCurrentBar = p.isCurrent;
    const barFill = p.isPeak
      ? 'url(#grad-bar-peak)'
      : (isCurrentBar ? 'url(#grad-bar-live)' : 'url(#grad-bar)');

    const valTextColor = p.isPeak ? '#e7000b' : '#0163ac';
    const isFullHour = p.minuto === 0;
    const isStartHour = p.label === "08:30";
    const labelColor = p.isPeak ? '#7c3aed' : (isCurrentBar ? '#059669' : ((isFullHour || isStartHour) ? '#334155' : '#64748b'));
    const labelWeight = (p.isPeak || isCurrentBar || isFullHour || isStartHour) ? '700' : '500';
    const labelSize = '7.1';

    htmlBarras += `
      <g class="histogram-col ${isCurrentBar ? 'histogram-col--current' : ''}" data-idx="${i}" data-hora="${p.label}" data-val="${p.val}">
        <!-- Pilar/Slot de guía visible y con borde -->
        <rect x="${trackX}" y="${trackY}" width="${trackW}" height="${trackH}" rx="4" class="histogram-track" ${p.esFuturo ? 'opacity="0.3"' : ''} />
        <!-- Barra de valor emitida -->
        ${barHeight > 0 ? `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${barFill}" filter="url(#shadow-bar)" class="histogram-bar" />` : ''}
        <!-- Número de tickets en el tope -->
        ${(p.val > 0) ? `<text x="${centerX}" y="${y - 4}" text-anchor="middle" font-size="8.5" font-weight="800" fill="${valTextColor}">${p.val}</text>` : ''}
        <!-- Etiqueta horaria cada 30 min -->
        <text x="${centerX}" y="108" text-anchor="middle" font-size="${labelSize}" font-weight="${labelWeight}" fill="${labelColor}">${p.label}</text>
      </g>
    `;
  });

  if (svgBarras) {
    svgBarras.innerHTML = htmlBarras;

    svgBarras.onmousemove = (e) => {
      const col = e.target.closest(".histogram-col");
      if (col) {
        const idx = parseInt(col.dataset.idx, 10);
        if (!isNaN(idx) && puntos[idx]) {
          mostrarTooltipChart(e, formatChartTooltipHtml(puntos[idx], totalEmitidos));
        }
      } else {
        ocultarTooltipChart();
      }
    };

    svgBarras.onmouseleave = ocultarTooltipChart;
  }

  renderLiveMarker();

  // -------------------------------------------------------------
  // REPORTE 2: CURVA DE FLUJO HORARIO (CADA 30 MIN: 08:30 A 18:00)
  // -------------------------------------------------------------
  const esDia = (vistaFlujo === "dia");
  const datosFlujo = esDia ? (flujoDia || []) : (flujoMes || []);

  const mapaFlujo = {};
  if (datosFlujo && datosFlujo.length > 0) {
    datosFlujo.forEach(f => {
      let intv = f.intervalo;
      if (!intv && f.hora !== undefined) {
        const m = (f.minuto !== undefined && f.minuto >= 30) ? "30" : "00";
        intv = `${f.hora.toString().padStart(2, "0")}:${m}`;
      }
      if (intv && intv.includes(":")) {
        const parts = intv.split(":");
        intv = `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
      }
      if (intv) {
        if (intv < "08:30") intv = "08:30";
        if (intv > "18:00") intv = "18:00";
        if (mapaFlujo[intv]) {
          mapaFlujo[intv].flujo = (mapaFlujo[intv].flujo || 0) + (f.flujo || 0);
        } else {
          mapaFlujo[intv] = { ...f, intervalo: intv };
        }
      }
    });
  }

  const puntosFlujo = INTERVALOS_30M.map((intv, idx) => {
    const [h, m] = intv.split(":").map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + 30;
    const fItem = mapaFlujo[intv] || {};
    const val = fItem.flujo !== undefined ? fItem.flujo : 0;
    const isCurrent = curMinOfDay >= startMin && curMinOfDay < endMin;
    const esFuturo = dentroJornada && (startMin > curMinOfDay) && (val === 0);
    const promHora = fItem.promedio_hora || 0;
    const promDia = (esDia ? fItem.promedio_dia : fItem.promedio_mes) || promDiaGlobal || 0;
    return {
      idx,
      hora: h,
      minuto: m,
      label: intv,
      nextLabel: obtenerSiguienteIntervalo(intv),
      flujo: val,
      promedio_hora: promHora,
      promedio_general: promDia,
      esFuturo,
      isCurrent,
      esDia,
    };
  });

  // Cálculo del promedio de atenciones por intervalo (en la misma escala de tickets que el flujo)
  const concluidosFlujo = puntosFlujo.filter(p => !p.esFuturo);
  const totalFlujo = puntosFlujo.reduce((acc, p) => acc + p.flujo, 0);
  const divisor = concluidosFlujo.length > 0 ? concluidosFlujo.length : 1;
  const promFlujoPorBloque = totalFlujo > 0 ? (totalFlujo / divisor) : 0;
  const peakFlujo = Math.max(0, ...puntosFlujo.map(p => p.flujo));
  puntosFlujo.forEach(p => { p.isPeak = p.flujo > 0 && p.flujo === peakFlujo; });

  const maxFlujo = Math.max(10, Math.ceil(Math.max(peakFlujo, promFlujoPorBloque * 1.3) * 1.2));

  const chipFlujo = $("chip-flujo-total");
  if (chipFlujo) {
    if (totalFlujo > 0) {
      chipFlujo.style.display = "inline-flex";
      chipFlujo.innerHTML = `Total ${esDia ? 'Hoy' : 'Mes'}: <b>${totalFlujo}</b> t.`;
    } else {
      chipFlujo.style.display = "none";
    }
  }

  // Cuadrícula y escala en el eje Y de la Curva de Flujo
  if (svgGrid) {
    let fGrid = "";
    [1.0, 0.66, 0.33].forEach(lvl => {
      const gy = baseLineY - Math.round(lvl * maxBarHeight);
      const valLvl = Math.round(lvl * maxFlujo);
      fGrid += `
        <line x1="${paddingLeft}" y1="${gy}" x2="${anchoTotal - paddingRight}" y2="${gy}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${paddingLeft - 5}" y="${gy + 2.5}" text-anchor="end" font-size="7" font-weight="600" fill="#94a3b8">${valLvl}</text>
      `;
    });
    fGrid += `
      <line x1="${paddingLeft}" y1="${baseLineY}" x2="${anchoTotal - paddingRight}" y2="${baseLineY}" stroke="#cbd5e1" stroke-width="1.4" stroke-linecap="round" />
      <text x="${paddingLeft - 5}" y="${baseLineY + 2.5}" text-anchor="end" font-size="7" font-weight="600" fill="#94a3b8">0</text>
    `;
    svgGrid.innerHTML = fGrid;
  }

  // Coordenadas de los 20 puntos de la curva
  const coordsFlujo = [];
  puntosFlujo.forEach((p, i) => {
    const cx = Math.round(paddingLeft + i * slotWidth + slotWidth / 2);
    const fHeight = (p.flujo > 0) ? Math.max(4, Math.round((p.flujo / maxFlujo) * maxBarHeight)) : 0;
    const cy = baseLineY - fHeight;
    coordsFlujo.push([cx, cy]);
  });

  // Trazo continuo Bezier y área sombreada
  if (svgLinea && svgArea) {
    if (coordsFlujo.length > 1) {
      let dLinea = `M ${coordsFlujo[0][0]},${coordsFlujo[0][1]}`;
      for (let i = 1; i < coordsFlujo.length; i++) {
        const [x0, y0] = coordsFlujo[i - 1];
        const [x1, y1] = coordsFlujo[i];
        const mx = Math.round((x0 + x1) / 2);
        dLinea += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`;
      }

      svgLinea.setAttribute("d", dLinea);

      const firstX = coordsFlujo[0][0];
      const lastX = coordsFlujo[coordsFlujo.length - 1][0];
      svgArea.setAttribute("d", `${dLinea} L ${lastX},${baseLineY} L ${firstX},${baseLineY} Z`);
    } else {
      svgLinea.setAttribute("d", "");
      svgArea.setAttribute("d", "");
    }
  }

  // Nodos de los puntos en cada intervalo de 30 min
  if (svgPuntos) {
    let htmlPuntos = "";
    puntosFlujo.forEach((p, i) => {
      const [cx, cy] = coordsFlujo[i];
      htmlPuntos += `
        <g class="flow-point" data-fidx="${i}">
          ${p.isPeak ? `<circle cx="${cx}" cy="${cy}" r="7" fill="#7c3aed" opacity="0.25" />` : ''}
          <circle cx="${cx}" cy="${cy}" r="${p.isPeak ? '4.2' : '3.0'}" fill="#ffffff" stroke="${p.isPeak ? '#7c3aed' : '#0284c7'}" stroke-width="${p.isPeak ? '2.5' : '2.0'}" />
        </g>
      `;
    });
    svgPuntos.innerHTML = htmlPuntos;
  }

  // Etiquetas horarias cada 30 min en la Curva de Flujo
  if (svgFlujoHoras) {
    let htmlHoras = "";
    puntosFlujo.forEach((p, i) => {
      const [cx] = coordsFlujo[i];
      const isFullHour = p.minuto === 0;
      const isStartHour = p.label === "08:30";
      const labelColor = p.isPeak ? '#7c3aed' : ((isFullHour || isStartHour) ? '#334155' : '#64748b');
      const labelWeight = (p.isPeak || isFullHour || isStartHour) ? '700' : '500';
      const labelSize = '7.1';
      htmlHoras += `<text x="${cx}" y="108" text-anchor="middle" font-size="${labelSize}" font-weight="${labelWeight}" fill="${labelColor}">${p.label}</text>`;
    });
    svgFlujoHoras.innerHTML = htmlHoras;
  }

  // Curva de flujo libre de líneas horizontales estáticas arbitrarias (diseño limpio y profesional)
  if (svgSec) {
    svgSec.setAttribute("d", "");
  }
  if (svgPromBadge) {
    svgPromBadge.innerHTML = "";
  }

  // Interacción Crosshair fluida al mover el cursor sobre la gráfica
  const svgCurva = $("svg-curva");
  if (svgCurva) {
    svgCurva.onmousemove = (e) => {
      const rect = svgCurva.getBoundingClientRect();
      const mouseXRel = ((e.clientX - rect.left) / rect.width) * anchoTotal;
      let closestIdx = 0;
      let minDiff = Infinity;
      coordsFlujo.forEach((pt, i) => {
        const diff = Math.abs(pt[0] - mouseXRel);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });

      const ptSel = puntosFlujo[closestIdx];
      const [cx, cy] = coordsFlujo[closestIdx];

      if (svgCurvaCrosshair) {
        svgCurvaCrosshair.innerHTML = `
          <line x1="${cx}" y1="12" x2="${cx}" y2="${baseLineY}" stroke="#0284c7" stroke-width="1.4" stroke-dasharray="3,3" />
          <circle cx="${cx}" cy="${cy}" r="7.5" fill="#38bdf8" opacity="0.35" />
          <circle cx="${cx}" cy="${cy}" r="4.2" fill="#ffffff" stroke="#0284c7" stroke-width="2.5" />
        `;
      }

      mostrarTooltipChart(e, formatFlujoTooltipHtml(ptSel, promFlujoPorBloque, esDia));
    };

    svgCurva.onmouseleave = () => {
      if (svgCurvaCrosshair) svgCurvaCrosshair.innerHTML = "";
      ocultarTooltipChart();
    };
  }
}

// Tick en tiempo real para actualizar cronómetros cada segundo
function tickear() {
  if (!datos) return;
  desfase += 1;

  // Actualiza tiempos en cola
  if (datos.espera) {
    datos.espera.forEach((fila, i) => {
      const seg = fila.segundos + desfase;
      const min = minutosStr(seg);
      const n = nivel("espera", seg);
      const nodoMin = document.querySelector(`[data-min="espera-${i}"]`);
      if (nodoMin) nodoMin.textContent = min;
      const nodoBsc = document.querySelector(`[data-bsc="espera-${i}"]`);
      if (nodoBsc) nodoBsc.className = "bsc-dot bsc-dot--" + n;
    });
  }

  // Actualiza tiempos en atención
  if (datos.atencion) {
    datos.atencion.forEach((fila, i) => {
      const seg = fila.segundos + desfase;
      const min = minutosStr(seg);
      const n = nivel("atencion", seg);
      const nodoMin = document.querySelector(`[data-min="atencion-${i}"]`);
      if (nodoMin) nodoMin.textContent = min;
      const nodoBsc = document.querySelector(`[data-bsc="atencion-${i}"]`);
      if (nodoBsc) nodoBsc.className = "bsc-dot bsc-dot--" + n;
    });
  }

  // Actualiza suspensiones
  if (datos.suspension) {
    datos.suspension.forEach((fila, i) => {
      const seg = fila.segundos + desfase;
      const t = mmss(seg);
      const n = nivel("suspension", seg);
      const nodoT = document.querySelector(`[data-cron="suspension-${i}"]`);
      if (nodoT) nodoT.textContent = t;
      const nodoBsc = document.querySelector(`[data-bsc="suspension-${i}"]`);
      if (nodoBsc) nodoBsc.className = "bsc-dot bsc-dot--" + n;
    });
  }

  // Reloj institucional y marcador de tiempo real en el histograma
  const reloj = $("reloj");
  if (reloj) {
    reloj.textContent = new Date().toLocaleTimeString("es-PE", { hour12: false });
  }
  renderLiveMarker();
}

// Vuelca la información de la sede recibida en pantalla
function pintar(d) {
  datos = d;
  desfase = 0;

  $("nombre-sede").textContent = d.sede || "CSC";
  const sello = $("sello");
  if (sello) {
    sello.textContent = d.conectado ? "Actualizado " + d.actualizado : "Sin respuesta de BD";
    sello.className = "sello " + (d.conectado ? "" : "sello--caida");
  }

  const centroDot = $("centro-status-dot");
  const centroText = $("centro-status-text");
  const centroPill = $("centro-status-pill");
  if (centroText && centroDot) {
    if (d.conectado) {
      centroText.textContent = "En línea";
      centroDot.style.backgroundColor = "#00b074";
      centroDot.style.boxShadow = "0 0 0 2px rgba(0, 176, 116, 0.2)";
      if (centroPill) {
        centroPill.style.backgroundColor = "#eafaf1";
        centroPill.style.borderColor = "rgba(0, 176, 116, 0.2)";
        centroPill.style.color = "#00b074";
      }
    } else {
      centroText.textContent = "Sin conexión";
      centroDot.style.backgroundColor = "#ef4444";
      centroDot.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.2)";
      if (centroPill) {
        centroPill.style.backgroundColor = "#fef2f2";
        centroPill.style.borderColor = "rgba(239, 68, 68, 0.2)";
        centroPill.style.color = "#dc2626";
      }
    }
  }

  const aviso = $("aviso");
  if (aviso) {
    aviso.hidden = d.conectado;
    if (!d.conectado) {
      aviso.textContent = `Aviso: No se pudo comunicar con el SQL Server de esta sede (${d.error || "tiempo de espera agotado"}). Mostrando última lectura conocida.`;
    }
  }

  // Resumen
  const res = d.resumen || {};
  if ($("ac-total")) $("ac-total").textContent = res.llamadas_activas ?? (d.espera.length + d.atencion.length);
  if ($("en-cola")) $("en-cola").textContent = res.en_cola ?? d.espera.length;
  if ($("en-atencion")) $("en-atencion").textContent = res.en_atencion ?? d.atencion.length;
  if ($("suspendidos")) $("suspendidos").textContent = res.suspendidos ?? d.suspension.length;
  if ($("espera-max")) $("espera-max").textContent = res.espera_max || "00:00";

  // Nuevos KPIs: % Espera < 15m (con alerta roja < 90%) y TA Promedio
  const elPct = $("espera-pct");
  if (elPct) {
    const pct = res.pct_espera_15m ?? 100;
    elPct.textContent = `${pct}%`;
    const boxPct = elPct.closest(".kpi-mini-box");
    const esAlerta = res.pct_espera_alerta || pct < 90;
    if (boxPct) boxPct.classList.toggle("kpi-mini-box--alert", esAlerta);
    elPct.className = "kpi-mini-box__value " + (esAlerta ? "text-danger" : "text-success");
  }

  const elTa = $("ta-prom");
  if (elTa) {
    elTa.textContent = res.ta_prom || "00:00";
    const nivelClase = res.ta_prom_nivel === "rojo" ? "text-danger" : (res.ta_prom_nivel === "ambar" ? "text-warning" : "text-success");
    elTa.className = "kpi-mini-box__value " + nivelClase;
  }

  // Gráfica de demanda (día actual) y curva de flujo (diario o mes según selección)
  actualizarBotonesFlujo();
  dibujarCurva(d.demanda, d.flujo_dia, d.promedio_dia, d.flujo_mes, d.promedio_mes);

  // 1. TIEMPO ESPERA: TICKET | MINUTOS | CONTRIBUYENTE | BSC
  pintarTabla("tb-espera", "v-espera", "c-espera", d.espera, (t, i) => {
    const tr = document.createElement("tr");
    tr.append(celdaTicket(t.ticket));

    const tdMin = celda(t.minutos || minutosStr(t.segundos), "num-min");
    tdMin.dataset.min = "espera-" + i;
    tr.append(tdMin);

    const contri = t.cliente || t.ruc || "—";
    tr.append(celda(contri, "contri-nom"));

    const tdBsc = celdaBsc(t.nivel);
    tdBsc.querySelector(".bsc-dot").dataset.bsc = "espera-" + i;
    tr.append(tdBsc);
    return tr;
  });

  // 2. TIEMPO ATENCIÓN: TICKET | MINUTOS | GESTOR | CONTRIBUYENTE | BSC
  pintarTabla("tb-atencion", "v-atencion", "c-atencion", d.atencion, (t, i) => {
    const tr = document.createElement("tr");
    tr.append(celdaTicket(t.ticket));

    const tdMin = celda(t.minutos || minutosStr(t.segundos), "num-min");
    tdMin.dataset.min = "atencion-" + i;
    tr.append(tdMin);

    const gestorTexto = t.gestor ? (t.ventanilla ? `${t.gestor} (V.${t.ventanilla})` : t.gestor) : "—";
    tr.append(celda(gestorTexto, "gestor-nom"));

    const contri = t.cliente || t.ruc || "—";
    tr.append(celda(contri, "contri-nom"));

    const tdBsc = celdaBsc(t.nivel);
    tdBsc.querySelector(".bsc-dot").dataset.bsc = "atencion-" + i;
    tr.append(tdBsc);
    return tr;
  });

  // 3. PRODUCCIÓN POR GESTOR
  pintarTabla("tb-produccion", "v-produccion", "c-produccion", d.produccion, (p, i) => {
    const tr = document.createElement("tr");
    tr.append(celda(p.gestor || "Funcionario", "gestor-nom"));
    tr.append(celda(p.atenciones, "num-atenc"));
    tr.append(celda(p.prom_minutos || minutosStr(p.prom_segundos), "num-prom"));
    tr.append(celdaBsc(p.nivel));
    return tr;
  });

  // 3.2 PRODUCCIÓN POR TIPO DE TICKET (Orientación, Trámite, Cabinas - General y Preferencial)
  pintarProduccionTipo("tb-produccion-tipo", "v-produccion-tipo", "c-produccion-tipo", d.produccion_tipo);

  // 4. SUSPENSIÓN: Se despliega automáticamente solo si hay funcionarios suspendidos
  const detSuspension = document.querySelector(".suspension-box");
  const haySuspendidos = d.suspension && d.suspension.length > 0;
  if (detSuspension) {
    detSuspension.open = haySuspendidos;
    detSuspension.classList.toggle("suspension-box--activa", haySuspendidos);
  }

  pintarTabla("tb-suspension", "v-suspension", "c-suspension", d.suspension, (s, i) => {
    const tr = document.createElement("tr");
    tr.append(celda(s.gestor));
    tr.append(celda(s.motivo));
    tr.append(celda(s.hora));

    const tdT = celda(s.tiempo);
    tdT.dataset.cron = "suspension-" + i;
    tr.append(tdT);

    const tdBsc = celdaBsc(s.nivel);
    tdBsc.querySelector(".bsc-dot").dataset.bsc = "suspension-" + i;
    tr.append(tdBsc);
    return tr;
  });
}

// Consulta periódica de datos de la sede
async function traerDatos() {
  try {
    const r = await fetch(`/api/tablero/${sede}`, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    pintar(await r.json());
  } catch (e) {
    const sello = $("sello");
    if (sello) {
      sello.textContent = "Sin conexión al servicio local";
      sello.className = "sello sello--caida";
    }
  }
}

// Consulta estado de todas las sedes (semáforo lateral y selector CSC cabecera)
async function actualizarEstadoSedes() {
  try {
    const r = await fetch("/api/consolidado", { cache: "no-store" });
    const c = await r.json();
    if (c && c.sedes) {
      for (const s of c.sedes) {
        const punto = document.querySelector(`[data-estado-sede="${s.codigo}"]`);
        if (punto) {
          punto.className = "sede__punto " + (s.conectado ? "sede__punto--ok" : "sede__punto--caida");
          punto.title = s.conectado ? "Conexión BD Activa" : "Sin conexión BD: " + (s.error || "No responde");
        }

        // Actualizar selector desplegable de cabecera CSC
        const cod = s.codigo;
        const codAlt = cod.startsWith("csc_") ? cod.replace("csc_", "") : `csc_${cod}`;
        const dot = document.querySelector(`[data-csc-dot="${cod}"], [data-csc-dot="${codAlt}"]`);
        if (dot) {
          dot.className = "csc-status-dot " + (s.conectado ? "csc-status-dot--live" : "csc-status-dot--offline");
        }
        const badge = document.querySelector(`[data-csc-badge="${cod}"], [data-csc-badge="${codAlt}"]`);
        if (badge) {
          badge.className = "csc-status-badge " + (s.conectado ? "csc-status-badge--live" : "csc-status-badge--offline");
          badge.textContent = s.conectado ? "En vivo" : "Sin conexión";
        }
      }
    }
  } catch (e) {
    // Silencioso en caso de caída temporal
  }
}

// ====================================================================
// CONTROLADOR DEL SELECTOR DESPLEGABLE DE CSC DE LA INTENDENCIA
// ====================================================================
function toggleCscDropdown(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const popover = document.getElementById("csc-dropdown-popover");
  const wrapper = document.getElementById("csc-selector-container");
  if (!popover || !wrapper) return;

  const estaAbierto = popover.style.display === "block";
  if (estaAbierto) {
    closeCscDropdown();
  } else {
    popover.style.display = "block";
    wrapper.classList.add("is-open");
    const input = document.getElementById("csc-search-input");
    if (input) {
      input.value = "";
      filtrarCscs("");
      setTimeout(() => input.focus(), 60);
    }
  }
}

function closeCscDropdown() {
  const popover = document.getElementById("csc-dropdown-popover");
  const wrapper = document.getElementById("csc-selector-container");
  if (popover) popover.style.display = "none";
  if (wrapper) wrapper.classList.remove("is-open");
}

function filtrarCscs(query) {
  const q = (query || "").toLowerCase().trim();
  const items = document.querySelectorAll(".csc-popover-item");
  let visibles = 0;

  items.forEach((item) => {
    const name = (item.getAttribute("data-csc-name") || item.textContent || "").toLowerCase();
    if (!q || name.includes(q)) {
      item.style.display = "flex";
      visibles++;
    } else {
      item.style.display = "none";
    }
  });

  const emptyState = document.getElementById("csc-empty-state");
  if (emptyState) {
    emptyState.style.display = visibles === 0 ? "block" : "none";
  }

  const countLabel = document.getElementById("csc-count-label");
  if (countLabel) {
    countLabel.textContent = `${visibles} CSC disponible${visibles === 1 ? "" : "s"}`;
  }
}

window.toggleCscDropdown = toggleCscDropdown;
window.closeCscDropdown = closeCscDropdown;
window.filtrarCscs = filtrarCscs;

document.addEventListener("click", (e) => {
  const wrapper = document.getElementById("csc-selector-container");
  if (wrapper && !wrapper.contains(e.target)) {
    closeCscDropdown();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeCscDropdown();
  }
});


// ====================================================================
// GESTIÓN DE LA GUÍA DE PREGUNTAS (CRUD INTERACTIVO EN MARIADB / MYSQL)
// ====================================================================
let guiaPreguntas = [];

async function cargarGuia(buscar = "") {
  const cont = $("faq-list-container");
  try {
    const url = "/api/guia" + (buscar.trim() ? "?q=" + encodeURIComponent(buscar.trim()) : "");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      let errTxt = "HTTP " + res.status;
      try {
        const errJson = await res.json();
        if (errJson && errJson.detail) errTxt = errJson.detail;
      } catch (_) {}
      throw new Error(errTxt);
    }
    guiaPreguntas = await res.json();
    renderizarGuia(guiaPreguntas);
  } catch (err) {
    if (cont) {
      cont.innerHTML = `
        <div class="faq-empty" style="color: #b91c1c; border: 1px dashed #fca5a5; background: #fff5f5; padding: 18px; text-align: center; border-radius: 8px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">⚠️ Estado de Conexión a MariaDB / MySQL</div>
          <div style="font-size: 12px; margin-bottom: 12px; line-height: 1.4; color: #475569;">${escapeHtml(err.message)}</div>
          <button type="button" class="btn btn--primary btn--sm" onclick="cargarGuia()" style="display: inline-flex; margin: 0 auto;">
            Reintentar Conexión
          </button>
        </div>
      `;
    }
  }
}

function renderizarGuia(items) {
  const container = $("faq-list-container");
  const countEl = $("faq-count");
  if (!container) return;

  if (countEl) countEl.textContent = items.length;

  if (!items || items.length === 0) {
    container.innerHTML = `<div class="faq-empty">No se encontraron preguntas frecuentes o trámites con esa búsqueda.</div>`;
    return;
  }

  container.innerHTML = "";
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "faq-card";

    // Reemplazar saltos de línea por párrafos / saltos limpios
    const respHtml = escapeHtml(item.respuesta || "");

    card.innerHTML = `
      <div class="faq-card__header">
        <div class="faq-card__title-wrap">
          <span class="faq-card__badge">#${item.id}</span>
          <h3 class="faq-card__title">${escapeHtml(item.pregunta || "")}</h3>
        </div>
        <div class="faq-card__actions">
          <button type="button" class="btn-icon btn-icon--edit" data-id="${item.id}" title="Editar esta pregunta">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>Editar</span>
          </button>
          <button type="button" class="btn-icon btn-icon--delete" data-id="${item.id}" title="Eliminar pregunta">
            <i class="fa-solid fa-trash-can"></i>
            <span>Eliminar</span>
          </button>
        </div>
      </div>
      <div class="faq-card__body">${respHtml}</div>
    `;

    // Event listeners para los botones de la tarjeta
    const btnEdit = card.querySelector(".btn-icon--edit");
    const btnDel = card.querySelector(".btn-icon--delete");

    if (btnEdit) {
      btnEdit.addEventListener("click", () => abrirModalGuia(item));
    }
    if (btnDel) {
      btnDel.addEventListener("click", () => eliminarGuia(item.id));
    }

    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Modal dialog para crear / editar preguntas
function abrirModalGuia(item = null) {
  const backdrop = $("modal-guia-backdrop");
  const title = $("modal-guia-title");
  const inputId = $("faq-id");
  const inputPreg = $("faq-pregunta");
  const inputResp = $("faq-respuesta");

  if (!backdrop) return;

  if (item) {
    if (title) title.textContent = `Editar Pregunta #${item.id}`;
    if (inputId) inputId.value = item.id;
    if (inputPreg) inputPreg.value = item.pregunta || "";
    if (inputResp) inputResp.value = item.respuesta || "";
  } else {
    if (title) title.textContent = "Agregar Pregunta Frecuente";
    if (inputId) inputId.value = "";
    if (inputPreg) inputPreg.value = "";
    if (inputResp) inputResp.value = "";
  }

  backdrop.hidden = false;
  if (inputPreg) setTimeout(() => inputPreg.focus(), 100);
}

function cerrarModalGuia() {
  const backdrop = $("modal-guia-backdrop");
  if (backdrop) backdrop.hidden = true;
}

async function guardarGuia(e) {
  e.preventDefault();
  const inputId = $("faq-id");
  const inputPreg = $("faq-pregunta");
  const inputResp = $("faq-respuesta");

  const id = inputId ? inputId.value.trim() : "";
  const pregunta = inputPreg ? inputPreg.value.trim() : "";
  const respuesta = inputResp ? inputResp.value.trim() : "";

  if (!pregunta || !respuesta) {
    mostrarToast("Por favor complete la pregunta y respuesta");
    return;
  }

  try {
    let res;
    if (id) {
      // Actualizar existente (PUT)
      res = await fetch(`/api/guia/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta, respuesta })
      });
    } else {
      // Crear nueva (POST)
      res = await fetch("/api/guia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta, respuesta })
      });
    }

    if (!res.ok) throw new Error("HTTP " + res.status);

    cerrarModalGuia();
    await cargarGuia($("input-filtro-faq")?.value || "");
    mostrarToast(id ? "✓ Pregunta actualizada exitosamente" : "✓ Nueva pregunta registrada exitosamente");
  } catch (err) {
    mostrarToast("Error al guardar la pregunta: " + err.message);
  }
}

async function eliminarGuia(id) {
  if (!confirm(`¿Está seguro de eliminar la pregunta #${id} de la Guía de Preguntas?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/guia/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    await cargarGuia($("input-filtro-faq")?.value || "");
    mostrarToast(`✓ Pregunta #${id} eliminada exitosamente`);
  } catch (err) {
    mostrarToast("Error al eliminar la pregunta: " + err.message);
  }
}

// Configuración de eventos de la Guía y Modal
function configurarFaq() {
  const input = $("input-filtro-faq");
  const btnAgregar = $("btn-nueva-pregunta");
  const btnCerrarModal = $("btn-cerrar-modal-guia");
  const btnCancelarModal = $("btn-cancelar-modal-guia");
  const formGuia = $("form-guia");

  let timeoutFiltro = null;
  if (input) {
    input.addEventListener("input", () => {
      clearTimeout(timeoutFiltro);
      timeoutFiltro = setTimeout(() => {
        cargarGuia(input.value);
      }, 250);
    });
  }

  if (btnAgregar) btnAgregar.addEventListener("click", () => abrirModalGuia(null));
  if (btnCerrarModal) btnCerrarModal.addEventListener("click", cerrarModalGuia);
  if (btnCancelarModal) btnCancelarModal.addEventListener("click", cerrarModalGuia);
  if (formGuia) formGuia.addEventListener("submit", guardarGuia);

  // Cargar preguntas iniciales desde base de datos
  cargarGuia();
}

// Control del panel desplegable (Drawer de Guía y Padrones)
function configurarDrawer() {
  const drawer = $("drawer-guia");
  const backdrop = $("drawer-backdrop");
  const btnAbrirGuia = $("btn-abrir-guia");
  const btnAbrirPadrones = $("btn-abrir-padrones");
  const btnCerrar = $("btn-cerrar-guia");

  function cambiarPestana(targetTabId) {
    const tabs = document.querySelectorAll(".drawer-tab");
    tabs.forEach(t => {
      const active = t.dataset.tab === targetTabId;
      t.classList.toggle("drawer-tab--active", active);
    });

    document.querySelectorAll(".drawer-pane").forEach(pane => {
      pane.classList.toggle("drawer-pane--active", pane.id === targetTabId);
    });
  }

  function abrir(tabInicial = "tab-faq") {
    if (!drawer) return;
    cambiarPestana(tabInicial);
    drawer.classList.add("drawer--open");
    drawer.setAttribute("aria-hidden", "false");
    if (backdrop) backdrop.classList.add("drawer-backdrop--visible");

    if (tabInicial === "tab-faq") {
      const input = $("input-filtro-faq");
      if (input) setTimeout(() => input.focus(), 150);
      cargarGuia(input?.value || "");
    }
  }

  function cerrar() {
    if (!drawer) return;
    drawer.classList.remove("drawer--open");
    drawer.setAttribute("aria-hidden", "true");
    if (backdrop) backdrop.classList.remove("drawer-backdrop--visible");
  }

  // Botones separados en la cabecera
  if (btnAbrirGuia) {
    btnAbrirGuia.addEventListener("click", () => abrir("tab-faq"));
  }
  if (btnAbrirPadrones) {
    btnAbrirPadrones.addEventListener("click", () => abrir("tab-padrones"));
  }

  if (btnCerrar) btnCerrar.addEventListener("click", cerrar);
  if (backdrop) backdrop.addEventListener("click", cerrar);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = $("modal-guia-backdrop");
      if (modal && !modal.hidden) {
        cerrarModalGuia();
      } else if (drawer && drawer.classList.contains("drawer--open")) {
        cerrar();
      }
    }
  });

  // Selector de pestañas dentro del drawer
  const tabs = document.querySelectorAll(".drawer-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      cambiarPestana(tab.dataset.tab);
    });
  });
}

// Notificación flotante sutil (Toast)
function mostrarToast(mensaje) {
  const toast = $("toast");
  if (!toast) return;
  toast.textContent = mensaje;
  toast.classList.add("toast--visible");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove("toast--visible");
  }, 2500);
}

// Interacción con padrones
function configurarPadrones() {
  const items = document.querySelectorAll(".padron-item");
  items.forEach(item => {
    item.addEventListener("click", () => {
      const nombre = item.querySelector(".padron-nombre")?.textContent || "Padrón";
      mostrarToast(`✓ ${nombre}: Sincronizado y disponible`);
    });
  });
}

// Copiar enlace al portapapeles
function configurarCopiar() {
  const btn = $("btn-copiar-url");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        mostrarToast("✓ Enlace de sede copiado al portapapeles");
      }).catch(() => {
        prompt("Copiar dirección:", url);
      });
    } else {
      prompt("Copiar dirección:", url);
    }
  });
}

// Alternar modo de datos simulados en caliente
function configurarToggleDemo() {
  const btn = $("btn-toggle-demo");
  const chip = $("chip-modo-demo");

  async function alternar() {
    try {
      const res = await fetch("/api/demo/toggle", { method: "POST" });
      const data = await res.json();
      const activo = data.modo_demo;

      if (btn) {
        btn.className = "btn " + (activo ? "btn--demo-active" : "btn--subtle");
        const txtBtn = $("txt-modo-demo");
        if (txtBtn) txtBtn.textContent = activo ? "Simulación ACTIVA" : "Modo Producción";
        const dotBtn = $("dot-modo-demo");
        if (dotBtn) dotBtn.className = "badge-dot " + (activo ? "badge-dot--demo" : "badge-dot--prod");
      }

      if (chip) {
        const txtChip = $("txt-sidebar-demo");
        if (txtChip) txtChip.textContent = activo ? "Modo Simulación (Demo)" : "SQL Server Conectado";
        const dotChip = $("dot-sidebar-demo");
        if (dotChip) dotChip.className = "badge-dot " + (activo ? "badge-dot--demo" : "badge-dot--prod");
      }

      mostrarToast(activo
        ? "⚡ Simulación ACTIVADA: RUCs y tickets generados para todas las sedes"
        : "🔌 Modo Producción activado: reconectando a SQL Server"
      );

      await traerDatos();
      await actualizarEstadoSedes();
    } catch (err) {
      mostrarToast("Error al alternar modo de datos");
    }
  }

  if (btn) btn.addEventListener("click", alternar);
  if (chip) chip.addEventListener("click", alternar);
}

// Módulo de Reporte Detallado por Día
let reporteTicketsCache = [];

function configurarModalReporte() {
  const btnAbrir = $("btn-abrir-reporte-dia");
  const modalBackdrop = $("modal-reporte-backdrop");
  const btnCerrar = $("btn-cerrar-modal-reporte");
  const btnCerrarBottom = $("btn-cerrar-reporte-bottom");
  const btnConsultar = $("btn-consultar-reporte");
  const inputFecha = $("rep-filtro-fecha");
  const selectSede = $("rep-filtro-sede");
  const inputBusqueda = $("rep-filtro-busqueda");
  const btnExportar = $("btn-exportar-csv");

  if (!btnAbrir || !modalBackdrop) return;

  // Fecha actual local por defecto en formato YYYY-MM-DD
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  const hoyStr = `${yyyy}-${mm}-${dd}`;

  if (inputFecha && !inputFecha.value) {
    inputFecha.value = hoyStr;
  }

  function abrir() {
    modalBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    if (selectSede && sede) selectSede.value = sede;
    if (reporteTicketsCache.length === 0) {
      cargarReporte();
    }
  }

  function cerrar() {
    modalBackdrop.hidden = true;
    document.body.style.overflow = "";
  }

  btnAbrir.addEventListener("click", abrir);
  if (btnCerrar) btnCerrar.addEventListener("click", cerrar);
  if (btnCerrarBottom) btnCerrarBottom.addEventListener("click", cerrar);

  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) cerrar();
  });

  async function cargarReporte() {
    const sedeCod = selectSede ? selectSede.value : sede;
    const fecha = (inputFecha && inputFecha.value) ? inputFecha.value : hoyStr;

    const tb = $("tb-reporte-dia");
    const vacio = $("v-reporte-dia");
    if (vacio) vacio.hidden = true;
    if (tb) {
      tb.innerHTML = `<tr><td colspan="12" class="empty-state">Consultando base de datos de ${sedeCod.toUpperCase()} para el día ${fecha}...</td></tr>`;
    }

    try {
      const res = await fetch(`/api/reporte/dia?sede=${encodeURIComponent(sedeCod)}&fecha=${encodeURIComponent(fecha)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      reporteTicketsCache = data.tickets || [];

      // Renderizar resumen del día
      const r = data.resumen || {};
      if ($("rep-kpi-total")) $("rep-kpi-total").textContent = r.total_tickets ?? 0;
      if ($("rep-kpi-pct")) {
        const pct = r.pct_espera_15m ?? 100;
        $("rep-kpi-pct").textContent = `${pct}%`;
        $("rep-kpi-pct").className = "rep-kpi-val " + (r.pct_espera_alerta ? "text-danger" : "text-success");
      }
      if ($("rep-kpi-esp")) $("rep-kpi-esp").textContent = r.espera_prom || "00:00";
      if ($("rep-kpi-ta")) {
        $("rep-kpi-ta").textContent = r.ta_prom || "00:00";
        const claseTa = r.ta_prom_nivel === "rojo" ? "text-danger" : (r.ta_prom_nivel === "ambar" ? "text-warning" : "text-success");
        $("rep-kpi-ta").className = "rep-kpi-val " + claseTa;
      }
      if (data.mensaje_privacidad) {
        if (tb) {
          tb.innerHTML = `<tr><td colspan="12" class="empty-state" style="padding: 28px 16px; text-align: center;">
            <div style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">🔒 Detalle de Tickets Restringido en Vista Invitado</div>
            <div style="font-size: 13px; color: var(--text-muted); max-width: 620px; margin: 0 auto 14px; line-height: 1.5;">${data.mensaje_privacidad}</div>
            <button type="button" class="btn btn--primary btn--sm" onclick="window.abrirModalAuth && window.abrirModalAuth()">
              <span>Identificarse como Directivo</span>
            </button>
          </td></tr>`;
        }
        if (btnExportar) btnExportar.classList.add("u-hidden");
        return;
      } else {
        if (btnExportar) btnExportar.classList.remove("u-hidden");
      }

      if (data.error && (!data.tickets || data.tickets.length === 0)) {
        if (tb) {
          tb.innerHTML = `<tr><td colspan="12" class="empty-state text-warning">Aviso: ${data.error}</td></tr>`;
        }
        return;
      }

      filtrarYRenderizar();
    } catch (err) {
      if (tb) {
        tb.innerHTML = `<tr><td colspan="12" class="empty-state text-danger">Error al consultar el reporte: ${err.message}</td></tr>`;
      }
    }
  }

  function filtrarYRenderizar() {
    const q = (inputBusqueda ? inputBusqueda.value : "").toLowerCase().trim();
    const filtrados = reporteTicketsCache.filter(t => {
      if (!q) return true;
      return (
        (t.ticket && t.ticket.toLowerCase().includes(q)) ||
        (t.gestor && t.gestor.toLowerCase().includes(q)) ||
        (t.cliente && t.cliente.toLowerCase().includes(q)) ||
        (t.tipo && t.tipo.toLowerCase().includes(q)) ||
        (t.ruc && t.ruc.toLowerCase().includes(q)) ||
        (t.ventanilla && String(t.ventanilla).toLowerCase().includes(q))
      );
    });

    renderizarTablaReporte(filtrados);
  }

  function renderizarTablaReporte(tickets) {
    const tb = $("tb-reporte-dia");
    const vacio = $("v-reporte-dia");
    const info = $("rep-footer-info");
    if (!tb) return;

    if (info) info.textContent = `Mostrando ${tickets.length} de ${reporteTicketsCache.length} tickets`;

    if (tickets.length === 0) {
      tb.innerHTML = "";
      if (vacio) vacio.hidden = false;
      return;
    }
    if (vacio) vacio.hidden = true;

    const filas = tickets.map(t => {
      const tr = document.createElement("tr");

      // 1. Ticket
      tr.append(celdaTicket(t.ticket));
      // 2. Tipo
      tr.append(celda(t.servicio || t.tipo));
      // 3. Modalidad
      tr.append(celda(t.subtipo || "General"));
      // 4. Contribuyente
      tr.append(celda(t.cliente, "contri-nom"));
      // 5. Gestor
      tr.append(celda(t.gestor, "gestor-nom"));
      // 6. Ventanilla
      const tdVent = celda(t.ventanilla);
      tdVent.className = "text-center";
      tr.append(tdVent);
      // 7. Emisión
      tr.append(celda(t.hora_emision));
      // 8. Inicio
      tr.append(celda(t.hora_inicio));
      // 9. Fin
      tr.append(celda(t.hora_fin));
      // 10. T. Espera
      const tdEsp = celda(t.espera_tiempo, "text-right num-min");
      if (t.espera_nivel === "rojo") tdEsp.classList.add("text-danger");
      tr.append(tdEsp);
      // 11. T. Atención
      const tdAt = celda(t.atencion_tiempo, "text-right num-min");
      if (t.atencion_nivel === "rojo") tdAt.classList.add("text-danger");
      else if (t.atencion_nivel === "ambar") tdAt.classList.add("text-warning");
      tr.append(tdAt);
      // 12. Estado
      tr.append(celda(t.estado));

      return tr;
    });

    tb.replaceChildren(...filas);
  }

  if (btnConsultar) btnConsultar.addEventListener("click", cargarReporte);
  if (inputFecha) inputFecha.addEventListener("change", cargarReporte);
  if (selectSede) selectSede.addEventListener("change", cargarReporte);
  if (inputBusqueda) inputBusqueda.addEventListener("input", filtrarYRenderizar);

  // Exportación a CSV
  if (btnExportar) {
    btnExportar.addEventListener("click", () => {
      if (!reporteTicketsCache || reporteTicketsCache.length === 0) {
        mostrarToast("No hay registros para exportar");
        return;
      }
      const fechaSel = (inputFecha && inputFecha.value) ? inputFecha.value : hoyStr;
      const sedeSel = selectSede ? selectSede.value : sede;

      const cabeceras = ["Ticket", "Servicio", "Modalidad", "RUC", "Contribuyente", "Gestor", "Ventanilla", "Hora Emision", "Hora Inicio", "Hora Fin", "Espera (MM:SS)", "Espera (Seg)", "Atencion (MM:SS)", "Atencion (Seg)", "Estado"];
      const csvFilas = [cabeceras.join(";")];

      reporteTicketsCache.forEach(t => {
        const fila = [
          `"${t.ticket || ''}"`,
          `"${t.servicio || t.tipo || ''}"`,
          `"${t.subtipo || ''}"`,
          `"${t.ruc || ''}"`,
          `"${(t.nombre || t.cliente || '').replace(/"/g, '""')}"`,
          `"${(t.gestor || '').replace(/"/g, '""')}"`,
          `"${t.ventanilla || ''}"`,
          `"${t.hora_emision || ''}"`,
          `"${t.hora_inicio || ''}"`,
          `"${t.hora_fin || ''}"`,
          `"${t.espera_tiempo || ''}"`,
          t.espera_segundos || 0,
          `"${t.atencion_tiempo || ''}"`,
          t.atencion_segundos || 0,
          `"${t.estado || ''}"`,
        ];
        csvFilas.push(fila.join(";"));
      });

      const blob = new Blob(["\uFEFF" + csvFilas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SITRA_Reporte_${sedeSel}_${fechaSel}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      mostrarToast(`✓ Reporte ${fechaSel} exportado correctamente`);
    });
  }
}

// ====================================================================
// AUTENTICACIÓN Y SESIÓN DE USUARIOS (DIRECTIVOS / ADMIN / INVITADO)
// ====================================================================

async function detectarUsuarioActual() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      const u = data.usuario || {};
      const esAutenticado = Boolean(u.id && u.rol && u.rol !== "invitado");

      const labelSession = $("label-user-session");
      if (labelSession) {
        if (u.rol === "admin") {
          labelSession.textContent = `Admin: ${u.nombre}`;
        } else if (u.rol === "directivo") {
          labelSession.textContent = `Directivo: ${u.nombre}`;
        } else {
          labelSession.textContent = "Invitado • Iniciar Sesión";
        }
      }

      const greetingText = $("user-greeting-text");
      if (greetingText) {
        greetingText.textContent = esAutenticado ? `${u.nombre} (${u.rol.toUpperCase()})` : "Modo Invitado";
      }

      const btnAdmin = $("btn-abrir-gestion-usuarios");
      if (btnAdmin) {
        if (u.rol === "admin") btnAdmin.classList.remove("u-hidden");
        else btnAdmin.classList.add("u-hidden");
      }

      const btnCerrar = $("btn-cerrar-sesion");
      if (btnCerrar) {
        if (esAutenticado) btnCerrar.classList.remove("u-hidden");
        else btnCerrar.classList.add("u-hidden");
      }
    }
  } catch (err) {
    console.debug("Error al verificar sesión:", err);
  }
}

function configurarAuth() {
  const modal = $("modal-auth-backdrop");
  if (!modal) return;

  const btnCerrar = $("btn-cerrar-modal-auth");
  const tabLogin = $("tab-btn-login");
  const tabGuest = $("tab-btn-guest");
  const paneLogin = $("pane-auth-login");
  const paneGuest = $("pane-auth-guest");
  const formLogin = $("form-auth-login");
  const errorBox = $("auth-login-error");
  const btnConfirmGuest = $("btn-confirm-guest");
  const btnLogout = $("btn-cerrar-sesion");

  window.abrirModalAuth = function() {
    if (errorBox) {
      errorBox.textContent = "";
      errorBox.classList.add("u-hidden");
    }
    modal.hidden = false;
  };

  const cerrarModal = () => { modal.hidden = true; };

  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) cerrarModal();
  });

  // Gatillos para abrir modal de login
  const btnChip = $("btn-auth-user-chip");
  if (btnChip) btnChip.addEventListener("click", window.abrirModalAuth);

  const greetingChip = $("user-greeting-chip");
  if (greetingChip) greetingChip.addEventListener("click", window.abrirModalAuth);

  const btnBannerLogin = $("btn-banner-login");
  if (btnBannerLogin) btnBannerLogin.addEventListener("click", window.abrirModalAuth);

  const btnTeaserLogin = $("btn-teaser-login");
  if (btnTeaserLogin) btnTeaserLogin.addEventListener("click", window.abrirModalAuth);

  // Selector de tabs en modal
  if (tabLogin && tabGuest && paneLogin && paneGuest) {
    tabLogin.addEventListener("click", () => {
      tabLogin.classList.add("auth-tab--active");
      tabGuest.classList.remove("auth-tab--active");
      paneLogin.classList.remove("u-hidden");
      paneGuest.classList.add("u-hidden");
    });

    tabGuest.addEventListener("click", () => {
      tabGuest.classList.add("auth-tab--active");
      tabLogin.classList.remove("auth-tab--active");
      paneGuest.classList.remove("u-hidden");
      paneLogin.classList.add("u-hidden");
    });
  }

  // Continuar como invitado
  if (btnConfirmGuest) {
    btnConfirmGuest.addEventListener("click", () => {
      sessionStorage.setItem("sitra_invitado_ack", "1");
      cerrarModal();
      mostrarToast("Acceso confirmado en Modo Invitado (Vista General)");
    });
  }

  // Enviar formulario de inicio de sesión
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const correo = $("auth-correo") ? $("auth-correo").value.trim() : "";
      const password = $("auth-password") ? $("auth-password").value.trim() : "";

      if (!correo || !password) return;

      const submitBtn = $("btn-submit-login");
      if (submitBtn) submitBtn.disabled = true;
      if (errorBox) errorBox.classList.add("u-hidden");

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ correo, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Correo o contraseña incorrectos");
        }

        mostrarToast(`✓ Bienvenido, ${data.usuario.nombre}`);
        cerrarModal();
        setTimeout(() => { window.location.reload(); }, 600);
      } catch (err) {
        if (errorBox) {
          errorBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${err.message}</span>`;
          errorBox.classList.remove("u-hidden");
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Cerrar Sesión
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
        mostrarToast("Sesión cerrada");
        setTimeout(() => { window.location.reload(); }, 500);
      } catch (err) {
        window.location.reload();
      }
    });
  }
}

// ====================================================================
// GESTIÓN DE DIRECTIVOS (SOLO ADMINISTRADOR)
// ====================================================================

function configurarGestionUsuarios() {
  const modal = $("modal-usuarios-backdrop");
  const btnAbrir = $("btn-abrir-gestion-usuarios");
  const btnCerrar = $("btn-cerrar-modal-usuarios");
  const formCrear = $("form-crear-usuario");
  const tbUsuarios = $("tb-lista-usuarios");

  if (!modal) return;

  const cerrarModal = () => { modal.hidden = true; };

  if (btnAbrir) {
    btnAbrir.addEventListener("click", () => {
      modal.hidden = false;
      cargarUsuarios();
    });
  }

  if (btnCerrar) btnCerrar.addEventListener("click", cerrarModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) cerrarModal();
  });

  async function cargarUsuarios() {
    if (!tbUsuarios) return;
    tbUsuarios.innerHTML = '<tr><td colspan="6" class="empty-state">Consultando base de datos local...</td></tr>';

    try {
      const res = await fetch("/api/usuarios", { credentials: "include" });
      if (!res.ok) throw new Error("No tiene permisos o ocurrió un error al consultar");
      const data = await res.json();
      const lista = data.usuarios || [];

      if (lista.length === 0) {
        tbUsuarios.innerHTML = '<tr><td colspan="6" class="empty-state">No hay usuarios registrados aún</td></tr>';
        return;
      }

      tbUsuarios.innerHTML = "";
      lista.forEach(u => {
        const tr = document.createElement("tr");

        const tdNom = document.createElement("td");
        tdNom.innerHTML = `<strong>${u.nombre}</strong>`;

        const tdCorreo = document.createElement("td");
        tdCorreo.textContent = u.correo;

        const tdRol = document.createElement("td");
        tdRol.innerHTML = `<span class="badge-tag">${u.rol.toUpperCase()}</span>`;

        const tdEstado = document.createElement("td");
        tdEstado.className = "text-center";
        tdEstado.innerHTML = u.activo
          ? '<span class="badge-status badge-status--online">Activo</span>'
          : '<span class="badge-status badge-status--offline">Inactivo</span>';

        const tdCreado = document.createElement("td");
        tdCreado.textContent = (u.creado_en || "").substring(0, 10);

        const tdAcc = document.createElement("td");
        tdAcc.className = "text-right";
        if (u.rol !== "admin") {
          const btnDel = document.createElement("button");
          btnDel.className = "btn btn--subtle btn--sm text-danger";
          btnDel.innerHTML = "Eliminar";
          btnDel.title = "Eliminar usuario asignado";
          btnDel.addEventListener("click", () => eliminarUsuario(u.id, u.nombre));
          tdAcc.appendChild(btnDel);
        } else {
          tdAcc.innerHTML = '<span class="text-muted text-sm">Principal</span>';
        }

        tr.append(tdNom, tdCorreo, tdRol, tdEstado, tdCreado, tdAcc);
        tbUsuarios.appendChild(tr);
      });
    } catch (err) {
      tbUsuarios.innerHTML = `<tr><td colspan="6" class="empty-state text-danger">${err.message}</td></tr>`;
    }
  }

  async function eliminarUsuario(id, nombre) {
    if (!confirm(`¿Confirma eliminar al usuario directivo '${nombre}'?`)) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Error al eliminar usuario");
      mostrarToast(`✓ Usuario ${nombre} eliminado`);
      cargarUsuarios();
    } catch (err) {
      mostrarToast(`Error: ${err.message}`);
    }
  }

  if (formCrear) {
    formCrear.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nombre = $("new-user-nombre") ? $("new-user-nombre").value.trim() : "";
      const correo = $("new-user-correo") ? $("new-user-correo").value.trim() : "";
      const password = $("new-user-password") ? $("new-user-password").value.trim() : "";
      const rol = $("new-user-rol") ? $("new-user-rol").value : "directivo";

      if (!nombre || !correo || !password) return;

      const btnGuardar = $("btn-guardar-nuevo-usuario");
      if (btnGuardar) btnGuardar.disabled = true;

      try {
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ nombre, correo, password, rol }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al crear usuario");

        mostrarToast(`✓ Directivo ${data.usuario.nombre} registrado con éxito`);
        formCrear.reset();
        cargarUsuarios();
      } catch (err) {
        mostrarToast(`Error: ${err.message}`);
      } finally {
        if (btnGuardar) btnGuardar.disabled = false;
      }
    });
  }
}

// ====================================================================
// VISTA GENERAL COMPARATIVA DE CADA CSC
// ====================================================================

function configurarVistaComparativa() {
  const tbComp = $("tb-comparativa-csc");
  if (!tbComp) return; // Solo se ejecuta si estamos en /comparativo

  let cacheComparativo = null;
  let filtroIntendenciaActual = document.body.dataset.intendencia || "todas";
  let submodoActual = "cards"; // 'cards' o 'lista'
  let busquedaActual = "";

  // ====================================================================
  // 1. MOTOR DE AUDIO GAMIFICADO (WEB AUDIO API NATIVO)
  // ====================================================================
  let audioCtx = null;
  let soundEnabled = localStorage.getItem("sitra_sound") === "1";

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = "sine", duration = 0.12, gainVal = 0.06) {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function playBloop() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(580, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.14);
    } catch (e) {}
  }

  function playPop() {
    playTone(540, "triangle", 0.08, 0.05);
  }

  function playChime() {
    if (!soundEnabled) return;
    setTimeout(() => playTone(523.25, "sine", 0.2, 0.06), 0);
    setTimeout(() => playTone(659.25, "sine", 0.25, 0.06), 80);
    setTimeout(() => playTone(783.99, "sine", 0.35, 0.07), 160);
  }

  function playWarning() {
    playTone(220, "sawtooth", 0.2, 0.06);
  }

  // Configurar botón de sonido en la barra superior (icono limpio sin texto abultado)
  const btnSound = $("btn-sound-toggle");
  const lblSound = $("btn-sound-label");
  function actualizarBotonSonido() {
    if (!btnSound) return;
    if (soundEnabled) {
      btnSound.classList.remove("muted");
      btnSound.setAttribute("title", "Silenciar efectos de sonido");
      if (lblSound) lblSound.textContent = "Sonido: ON";
      btnSound.querySelector("i")?.setAttribute("class", "fa-solid fa-volume-high");
    } else {
      btnSound.classList.add("muted");
      btnSound.setAttribute("title", "Activar efectos de sonido");
      if (lblSound) lblSound.textContent = "Sonido: OFF";
      btnSound.querySelector("i")?.setAttribute("class", "fa-solid fa-volume-xmark");
    }
  }
  if (btnSound) {
    actualizarBotonSonido();
    btnSound.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem("sitra_sound", soundEnabled ? "1" : "0");
      actualizarBotonSonido();
      if (soundEnabled) playChime();
    });
  }

  // ====================================================================
  // 2. SELECTOR UNIFICADO DE VISTAS (SEGMENTED CONTROL: Tarjetas | Tabla | Mapa)
  // ====================================================================
  const btnSegCards = $("btn-seg-cards");
  const btnSegLista = $("btn-seg-lista");
  const btnSegMapa = $("btn-seg-mapa");

  const btnVistaCardsLista = $("btn-switch-cards-lista");
  const btnVistaMapaReporte = $("btn-switch-mapa-reporte");
  const viewCardsLista = $("view-cards-lista");
  const viewMapaReporte = $("view-mapa-reporte");

  function activarSegmentoVista(modo) {
    if (soundEnabled) playBloop();
    if (btnSegCards) btnSegCards.classList.toggle("active", modo === "cards");
    if (btnSegLista) btnSegLista.classList.toggle("active", modo === "lista");
    if (btnSegMapa) btnSegMapa.classList.toggle("active", modo === "mapa");

    const wrapCards = $("contenedor-cards-gamificadas");
    const wrapLista = $("contenedor-tabla-ejecutiva");

    if (modo === "mapa") {
      if (viewCardsLista) viewCardsLista.style.display = "none";
      if (viewMapaReporte) viewMapaReporte.style.display = "block";
      renderizarMapaYReportePro();
      setTimeout(() => {
        if (typeof leafletMap !== "undefined" && leafletMap) {
          leafletMap.invalidateSize();
        }
      }, 150);
    } else if (modo === "lista") {
      if (viewMapaReporte) viewMapaReporte.style.display = "none";
      if (viewCardsLista) viewCardsLista.style.display = "block";
      if (wrapCards) wrapCards.style.display = "none";
      if (wrapLista) wrapLista.style.display = "block";
      submodoActual = "lista";
      renderizarVista1();
    } else {
      // cards
      if (viewMapaReporte) viewMapaReporte.style.display = "none";
      if (viewCardsLista) viewCardsLista.style.display = "block";
      if (wrapLista) wrapLista.style.display = "none";
      if (wrapCards) wrapCards.style.display = "grid";
      submodoActual = "cards";
      renderizarVista1();
    }
  }

  if (btnSegCards) btnSegCards.addEventListener("click", () => activarSegmentoVista("cards"));
  if (btnSegLista) btnSegLista.addEventListener("click", () => activarSegmentoVista("lista"));
  if (btnSegMapa) btnSegMapa.addEventListener("click", () => activarSegmentoVista("mapa"));

  function cambiarVistaPrincipal(vista) {
    if (vista === "mapa") {
      activarSegmentoVista("mapa");
    } else {
      activarSegmentoVista(submodoActual || "cards");
    }
  }

  if (btnVistaCardsLista) {
    btnVistaCardsLista.addEventListener("click", () => cambiarVistaPrincipal("cards"));
  }
  if (btnVistaMapaReporte) {
    btnVistaMapaReporte.addEventListener("click", () => cambiarVistaPrincipal("mapa"));
  }

  // Sub-modo en Vista 2: Mapa Territorial vs Reporte PRO
  const tabV2Mapa = $("tab-v2-mapa");
  const tabV2Reporte = $("tab-v2-reporte");
  const seccionMapaTerritorial = $("seccion-mapa-territorial");
  const seccionReportePro = $("seccion-reporte-pro");
  const btnSlidebarIrReporte = $("btn-slidebar-ir-reporte");
  const btnReporteVolverMapa = $("btn-reporte-volver-mapa");

  function cambiarSubvistaMapa(subvista) {
    playPop();
    if (subvista === "reporte") {
      if (tabV2Mapa) tabV2Mapa.classList.remove("active");
      if (tabV2Reporte) tabV2Reporte.classList.add("active");
      if (seccionMapaTerritorial) seccionMapaTerritorial.style.display = "none";
      if (seccionReportePro) seccionReportePro.style.display = "block";
    } else {
      if (tabV2Reporte) tabV2Reporte.classList.remove("active");
      if (tabV2Mapa) tabV2Mapa.classList.add("active");
      if (seccionReportePro) seccionReportePro.style.display = "none";
      if (seccionMapaTerritorial) seccionMapaTerritorial.style.display = "block";
      setTimeout(() => {
        if (typeof leafletMap !== "undefined" && leafletMap) {
          leafletMap.invalidateSize();
        }
      }, 100);
    }
  }

  if (tabV2Mapa) tabV2Mapa.addEventListener("click", () => cambiarSubvistaMapa("mapa"));
  if (tabV2Reporte) tabV2Reporte.addEventListener("click", () => cambiarSubvistaMapa("reporte"));
  if (btnSlidebarIrReporte) btnSlidebarIrReporte.addEventListener("click", () => cambiarSubvistaMapa("reporte"));
  if (btnReporteVolverMapa) btnReporteVolverMapa.addEventListener("click", () => cambiarSubvistaMapa("mapa"));

  // SLIDEBAR DRAWER LATERAL (TELEMETRÍA Y SEDES)
  const btnToggleDrawer = $("btn-toggle-drawer");
  const btnCloseSlidebar = $("btn-close-slidebar");
  const slidebarTelemetria = $("slidebar-telemetria");
  const slidebarBackdrop = $("slidebar-backdrop");

  function abrirSlidebar(intCod) {
    if (intCod) {
      actualizarSideTelemetry(intCod);
    }
    if (slidebarTelemetria) {
      slidebarTelemetria.classList.add("open");
      slidebarTelemetria.setAttribute("aria-hidden", "false");
    }
    if (slidebarBackdrop) slidebarBackdrop.classList.add("visible");
    if (btnToggleDrawer) btnToggleDrawer.classList.add("active");
  }

  function cerrarSlidebar() {
    if (slidebarTelemetria) {
      slidebarTelemetria.classList.remove("open");
      slidebarTelemetria.setAttribute("aria-hidden", "true");
    }
    if (slidebarBackdrop) slidebarBackdrop.classList.remove("visible");
    if (btnToggleDrawer) btnToggleDrawer.classList.remove("active");
  }

  function toggleSlidebar() {
    if (slidebarTelemetria && slidebarTelemetria.classList.contains("open")) {
      cerrarSlidebar();
    } else {
      abrirSlidebar(intendenciaSeleccionadaMapa || "iti_junin");
    }
  }

  if (btnToggleDrawer) btnToggleDrawer.addEventListener("click", () => {
    playPop();
    toggleSlidebar();
  });
  if (btnCloseSlidebar) btnCloseSlidebar.addEventListener("click", () => {
    playPop();
    cerrarSlidebar();
  });
  if (slidebarBackdrop) slidebarBackdrop.addEventListener("click", () => {
    playPop();
    cerrarSlidebar();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && slidebarTelemetria && slidebarTelemetria.classList.contains("open")) {
      cerrarSlidebar();
    }
  });

  // Sub-modo en Vista 1: Cards vs Lista
  const btnSubCards = $("btn-submode-cards");
  const btnSubLista = $("btn-submode-lista");
  const wrapCards = $("contenedor-cards-gamificadas");
  const wrapLista = $("contenedor-tabla-ejecutiva");

  function cambiarSubmodo(modo) {
    playPop();
    submodoActual = modo;
    if (modo === "lista") {
      if (btnSubCards) btnSubCards.classList.remove("active");
      if (btnSubLista) btnSubLista.classList.add("active");
      if (wrapCards) wrapCards.style.display = "none";
      if (wrapLista) wrapLista.style.display = "block";
    } else {
      if (btnSubLista) btnSubLista.classList.remove("active");
      if (btnSubCards) btnSubCards.classList.add("active");
      if (wrapLista) wrapLista.style.display = "none";
      if (wrapCards) wrapCards.style.display = "grid";
    }
    renderizarVista1();
  }

  if (btnSubCards) btnSubCards.addEventListener("click", () => cambiarSubmodo("cards"));
  if (btnSubLista) btnSubLista.addEventListener("click", () => cambiarSubmodo("lista"));

  // Chips de Filtro por Intendencia
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      playPop();
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      filtroIntendenciaActual = chip.dataset.intendencia || "todas";
      renderizarVista1();
    });
  });

  // Buscador en tiempo real de sedes (en vista por ITI)
  const inputBuscador = $("buscador-sedes-cards");
  if (inputBuscador) {
    inputBuscador.addEventListener("input", (e) => {
      busquedaActual = (e.target.value || "").trim().toLowerCase();
      renderizarVista1();
    });
  }

  // Buscador de ITIs en Monitoreo Nacional (Nivel 1)
  let busquedaItiActual = "";
  const inputBuscadorItis = $("buscador-itis-input");
  if (inputBuscadorItis) {
    inputBuscadorItis.addEventListener("input", (e) => {
      busquedaItiActual = (e.target.value || "").trim().toLowerCase();
      if (cacheComparativo) renderizarItisNacional(cacheComparativo.intendencias || []);
    });
  }

  // Toggle Tarjetas / Tabla para ITIs en Monitoreo Nacional
  const btnViewTarjetas = $("btn-view-tarjetas");
  const btnViewTablaIti = $("btn-view-tabla-iti");
  const gridItisCards = $("grid-itis-cards");
  const tablaItisWrap = $("tabla-itis-wrap");

  if (btnViewTarjetas && btnViewTablaIti) {
    btnViewTarjetas.addEventListener("click", () => {
      playPop();
      btnViewTarjetas.classList.add("active");
      btnViewTablaIti.classList.remove("active");
      if (gridItisCards) gridItisCards.style.display = "grid";
      if (tablaItisWrap) tablaItisWrap.style.display = "none";
    });
    btnViewTablaIti.addEventListener("click", () => {
      playPop();
      btnViewTablaIti.classList.add("active");
      btnViewTarjetas.classList.remove("active");
      if (gridItisCards) gridItisCards.style.display = "none";
      if (tablaItisWrap) tablaItisWrap.style.display = "block";
    });
  }

  // Buscador y conmutador de vista para CSCs de una Intendencia (Nivel 2)
  let busquedaCscActual = "";
  const buscadorCscInput = $("buscador-csc-cards");
  if (buscadorCscInput) {
    buscadorCscInput.addEventListener("input", (e) => {
      busquedaCscActual = (e.target.value || "").trim().toLowerCase();
      if (cacheComparativo) {
        const itiActualCod = document.body.dataset.intendencia || "";
        const todasSedes = cacheComparativo.sedes || [];
        const sedesIti = todasSedes.filter(s => !itiActualCod || itiActualCod === "todas" || s.intendencia_codigo === itiActualCod);
        const itiInfo = (cacheComparativo.intendencias || []).find(i => i.codigo === itiActualCod) || {};
        renderizarCscsIti(sedesIti, itiInfo);
      }
    });
  }

  const btnToggleCscCards = $("btn-toggle-csc-view-cards");
  const btnToggleCscTable = $("btn-toggle-csc-view-table");
  const gridCscCardsWrap = $("grid-csc-cards");
  const tablaCscWrap = $("tabla-csc-wrap");

  if (btnToggleCscCards && btnToggleCscTable) {
    btnToggleCscCards.addEventListener("click", () => {
      playPop();
      btnToggleCscCards.classList.add("active");
      btnToggleCscTable.classList.remove("active");
      if (gridCscCardsWrap) gridCscCardsWrap.style.display = "grid";
      if (tablaCscWrap) tablaCscWrap.style.display = "none";
    });
    btnToggleCscTable.addEventListener("click", () => {
      playPop();
      btnToggleCscTable.classList.add("active");
      btnToggleCscCards.classList.remove("active");
      if (gridCscCardsWrap) gridCscCardsWrap.style.display = "none";
      if (tablaCscWrap) tablaCscWrap.style.display = "block";
    });
  }

  // Botón Ver Mapa Completo y Pantalla Completa
  const btnVerMapaTerritorial = $("btn-ver-mapa-territorial");
  const btnFullscreenMapa = $("btn-fullscreen-mapa");
  if (btnVerMapaTerritorial) {
    btnVerMapaTerritorial.addEventListener("click", () => {
      activarSegmentoVista("mapa");
    });
  }
  if (btnFullscreenMapa) {
    btnFullscreenMapa.addEventListener("click", () => {
      activarSegmentoVista("mapa");
    });
  }

  // Reloj en vivo
  function actualizarRelojComp() {
    const d = new Date();
    const timeStr = d.toLocaleTimeString("es-PE", { hour12: false });
    const relojNodo = $("comp-reloj");
    if (relojNodo) {
      relojNodo.textContent = timeStr;
    }
    const itiClock = $("iti-live-clock");
    if (itiClock) {
      itiClock.textContent = timeStr;
    }
    const nacClock = $("nac-live-clock");
    if (nacClock) {
      nacClock.textContent = timeStr;
    }
    const topClock = $("sitra-topbar-clock");
    if (topClock) {
      topClock.textContent = timeStr;
    }
    document.querySelectorAll(".sitra-live-clock").forEach(el => {
      el.textContent = timeStr;
    });
  }
  setInterval(actualizarRelojComp, 1000);
  actualizarRelojComp();

  // ====================================================================
  // 3. CONSULTA PERIÓDICA AL BACKEND
  // ====================================================================
  async function cargarDatosComparativos() {
    try {
      const res = await fetch("/api/comparativo", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cacheComparativo = data;

      const sincronizado = $("comp-sello");
      if (sincronizado) sincronizado.textContent = "Sincronizado";

      const lastSync = $("comp-last-sync");
      if (lastSync) lastSync.textContent = `Actualizado: ${data.actualizado}`;

      // Actualizar contador total de sedes
      const totalSedes = (data.sedes || []).length;
      if ($("crud-total-sedes-badge")) $("crud-total-sedes-badge").textContent = totalSedes;
      if ($("count-todas-sedes")) $("count-todas-sedes").textContent = totalSedes;

      const nivelPagina = document.body.dataset.nivel || "nacional";
      if (nivelPagina === "nacional") {
        renderizarVistaNacional(data);
      } else {
        const itiActualCod = document.body.dataset.intendencia || "";
        renderizarVistaIti(data, itiActualCod);
      }

      if (viewMapaReporte && viewMapaReporte.style.display !== "none") {
        renderizarMapaYReportePro();
      }

      if (data.modo_detallado && typeof configurarDetalleDirectivos === "function") {
        configurarDetalleDirectivos(data.sedes || []);
      }
    } catch (err) {
      console.warn("Fallo al actualizar comparativa:", err);
      const sincronizado = $("comp-sello");
      if (sincronizado) sincronizado.textContent = "Reconectando...";
    }
  }

  function obtenerSedesFiltradas() {
    if (!cacheComparativo || !cacheComparativo.sedes) return [];
    return cacheComparativo.sedes.filter(s => {
      const matchInt = (filtroIntendenciaActual === "todas" || s.intendencia_codigo === filtroIntendenciaActual);
      const matchSearch = (!busquedaActual || 
        s.nombre.toLowerCase().includes(busquedaActual) || 
        s.codigo.toLowerCase().includes(busquedaActual) ||
        (s.intendencia_nombre && s.intendencia_nombre.toLowerCase().includes(busquedaActual))
      );
      return matchInt && matchSearch;
    });
  }

  function renderizarVista1() {
    const nivelPagina = document.body.dataset.nivel || "nacional";
    if (nivelPagina === "nacional") {
      if (cacheComparativo) renderizarItisNacional(cacheComparativo.intendencias || []);
      return;
    }
    const itiActualCod = document.body.dataset.intendencia || "";
    if (cacheComparativo) {
      renderizarVistaIti(cacheComparativo, itiActualCod);
    }
  }

  // ====================================================================
  // 4. MONITOREO NACIONAL (NIVEL 1 - 21 ITIs) - FIEL AL MOCKUP SUNAT
  // ====================================================================
  let itisPathsCache = null;
  let provinciasPathsCache = null;
  let depLinesCache = null;
  let itiLinesCache = null;
  let itisZoomedPathsCache = null;

  const DEPTO_A_ITI = {
    "LIMA": "iti_lima",
    "CALLAO": "iti_lima",
    "AREQUIPA": "iti_arequipa",
    "LA LIBERTAD": "iti_lalibertad",
    "AYACUCHO": "iti_ayacucho",
    "CAJAMARCA": "iti_cajamarca",
    "CUSCO": "iti_cusco",
    "APURIMAC": "iti_cusco",
    "ANCASH": "iti_huaraz",
    "HUANUCO": "iti_huanuco",
    "PASCO": "iti_huanuco",
    "ICA": "iti_ica",
    "PUNO": "iti_juliaca",
    "JUNIN": "iti_junin",
    "HUANCAVELICA": "iti_junin",
    "LAMBAYEQUE": "iti_lambayeque",
    "LORETO": "iti_loreto",
    "MADRE DE DIOS": "iti_madrededios",
    "PIURA": "iti_piura",
    "SAN MARTIN": "iti_sanmartin",
    "AMAZONAS": "iti_sanmartin",
    "TACNA": "iti_tacna",
    "MOQUEGUA": "iti_tacna",
    "TUMBES": "iti_tumbes",
    "UCAYALI": "iti_ucayali"
  };

  async function renderizarVistaNacional(data) {
    if (!data) return;

    // 1. Fecha y Hora de Sincronización
    const d = new Date();
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
    const diaNom = dias[d.getDay()];
    const diaNum = d.getDate();
    const mesNom = meses[d.getMonth()];
    const anio = d.getFullYear();
    const fechaStr = `${diaNom}, ${diaNum} ${mesNom} ${anio}`;
    if ($("hero-date-str")) $("hero-date-str").textContent = fechaStr;
    if ($("hero-sync-time")) $("hero-sync-time").textContent = `Actualizado: ${data.actualizado || '--:--'}`;

    // 2. 4 Top KPI Cards
    const tot = data.totales_regionales || {};
    const totalCola = tot.en_cola || 0;
    const totalAtencion = tot.en_atencion || 0;
    const totalEnCurso = totalCola + totalAtencion;

    let totalAgentes = 0;
    (data.sedes || []).forEach(s => {
      const prod = s.produccion || [];
      if (prod.length > 0) totalAgentes += prod.length;
      else if (s.resumen && s.resumen.en_atencion > 0) totalAgentes += s.resumen.en_atencion;
    });
    if (totalAgentes === 0) totalAgentes = totalAtencion;

    if ($("kpi-nac-tickets")) $("kpi-nac-tickets").textContent = totalEnCurso.toLocaleString();
    if ($("kpi-nac-cola")) $("kpi-nac-cola").textContent = totalCola.toLocaleString();
    if ($("kpi-nac-atencion")) $("kpi-nac-atencion").textContent = totalAtencion.toLocaleString();
    if ($("kpi-nac-agentes")) $("kpi-nac-agentes").textContent = totalAgentes.toLocaleString();

    // Actualizar Resumen de Red Nacional
    let itisEnMeta = 0;
    let itisAlerta = 0;
    (data.intendencias || []).forEach(i => {
      const p = i.totales?.pct_espera_15m ?? 95;
      if (p >= 90) itisEnMeta++;
      else itisAlerta++;
    });
    if ($("stat-itis-en-meta")) $("stat-itis-en-meta").textContent = itisEnMeta;
    if ($("stat-itis-alerta")) $("stat-itis-alerta").textContent = itisAlerta;
    if ($("stat-total-sedes-nac")) $("stat-total-sedes-nac").textContent = (data.sedes || []).length;
    if ($("stat-espera-prom-nac")) $("stat-espera-prom-nac").textContent = tot.ta_prom || '07:39';

    // Elementos puente para compatibilidad técnica
    if ($("reg-ac-total")) $("reg-ac-total").textContent = totalEnCurso;
    if ($("reg-en-cola")) $("reg-en-cola").textContent = totalCola;
    if ($("reg-en-atencion")) $("reg-en-atencion").textContent = totalAtencion;
    if ($("reg-agentes-activos")) $("reg-agentes-activos").textContent = totalAgentes;

    // 3. Renderizar Mapa SVG y Ranking de Barras
    await renderizarMapaYRankingNacional(data.intendencias || []);

    // 4. Renderizar Cards de ITIs y Tabla
    renderizarItisNacional(data.intendencias || []);
  }

  async function renderizarMapaYRankingNacional(intendencias) {
    const svgMap = $("svg-peru-choropleth");
    const rankingWrap = $("iti-ranking-bars-container");
    if (!svgMap && !rankingWrap) return;

    if (!itisPathsCache) {
      try {
        const [respItis, respDeps] = await Promise.all([
          fetch("/static/peru_itis_paths.json"),
          fetch("/static/peru_departamentos_lines.json")
        ]);
        if (respItis.ok) itisPathsCache = await respItis.json();
        if (respDeps.ok) depLinesCache = await respDeps.json();
      } catch (e) {
        console.warn("No se pudieron cargar las geometrías del mapa:", e);
      }
    }

    const itiDataMap = {};
    intendencias.forEach(iti => {
      itiDataMap[iti.codigo] = iti;
    });

    const colorPorIti = {
      "iti_lima": "#ef4444",      // Muy alta (Rojo)
      "iti_huacho": "#ef4444",    // Muy alta (Rojo)
      "iti_arequipa": "#f97316",  // Alta (Naranja)
      "iti_lalibertad": "#f97316",// Alta (Naranja)
      "iti_chimbote": "#f97316",  // Alta (Naranja)
      "iti_piura": "#facc15",     // Media (Amarillo)
      "iti_cusco": "#facc15",     // Media (Amarillo)
      "iti_madrededios": "#facc15",// Media (Amarillo)
      "iti_tumbes": "#facc15",    // Media (Amarillo)
      "iti_lambayeque": "#10b981",// Baja (Verde)
      "iti_junin": "#10b981",     // Baja (Verde)
      "iti_ica": "#10b981",       // Baja (Verde)
      "iti_cajamarca": "#10b981", // Baja (Verde)
      "iti_ayacucho": "#10b981",  // Baja (Verde)
      "iti_huaraz": "#10b981",    // Baja (Verde)
      "iti_huanuco": "#10b981",   // Baja (Verde)
      "iti_juliaca": "#10b981",   // Baja (Verde)
      "iti_loreto": "#10b981",    // Baja (Verde)
      "iti_sanmartin": "#10b981", // Baja (Verde)
      "iti_tacna": "#10b981",     // Baja (Verde)
      "iti_ucayali": "#10b981"    // Baja (Verde)
    };

    if (svgMap && itisPathsCache && svgMap.children.length === 0) {
      svgMap.innerHTML = "";

      // Capa 1: Las 21 Intendencias Tributarias (ITIs) fieles al mapa de PERU
      const gItis = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gItis.setAttribute("id", "g-mapa-itis");

      // Contenedor del tooltip flotante tipo píldora
      const mapPanel = svgMap.closest(".exec-map-panel") || svgMap.parentElement;
      let tooltipEl = mapPanel ? mapPanel.querySelector(".iti-map-custom-tooltip") : null;
      if (!tooltipEl && mapPanel) {
        tooltipEl = document.createElement("div");
        tooltipEl.className = "iti-map-custom-tooltip";
        mapPanel.appendChild(tooltipEl);
      }

      function moverTooltipNacional(e) {
        if (!tooltipEl || !mapPanel) return;
        const panelRect = mapPanel.getBoundingClientRect();
        const x = e.clientX - panelRect.left;
        const y = e.clientY - panelRect.top;
        tooltipEl.style.left = `${x}px`;
        tooltipEl.style.top = `${y}px`;
        if (y < 45) {
          tooltipEl.style.transform = "translate(-50%, 18px)";
        } else {
          tooltipEl.style.transform = "translate(-50%, -125%)";
        }
      }

      svgMap.addEventListener("mouseleave", () => {
        if (tooltipEl) tooltipEl.style.display = "none";
      });

      itisPathsCache.forEach(item => {
        const itiCod = item.codigo;
        const itiInfo = itiDataMap[itiCod] || {};
        const color = colorPorIti[itiCod] || "#10b981";
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", item.d);
        pathEl.setAttribute("fill", color);
        pathEl.setAttribute("stroke", "#ffffff");
        pathEl.setAttribute("stroke-width", "1.5");
        pathEl.setAttribute("stroke-linejoin", "round");
        pathEl.setAttribute("stroke-linecap", "round");
        pathEl.setAttribute("data-iti", itiCod);
        pathEl.style.cursor = "pointer";
        pathEl.style.transition = "filter 0.15s ease, stroke-width 0.15s ease";

        const nombreMostrar = item.nombre || itiInfo.nombre || 'Intendencia';

        pathEl.addEventListener("click", () => {
          window.location.href = `/intendencia/${itiCod}`;
        });

        pathEl.addEventListener("mouseenter", (e) => {
          pathEl.style.filter = "brightness(1.15) drop-shadow(0 0 3px rgba(255,255,255,0.85))";
          pathEl.style.stroke = "#ffffff";
          pathEl.style.strokeWidth = "2.2";
          const rankItem = rankingWrap ? rankingWrap.querySelector(`[data-iti-rank="${itiCod}"]`) : null;
          if (rankItem) rankItem.classList.add("ranking-bar-highlight");

          if (tooltipEl) {
            tooltipEl.innerHTML = `<span>${nombreMostrar}</span><svg class="iti-tooltip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
            tooltipEl.style.display = "inline-flex";
            moverTooltipNacional(e);
          }
        });

        pathEl.addEventListener("mousemove", (e) => {
          if (tooltipEl && tooltipEl.style.display === "inline-flex") {
            moverTooltipNacional(e);
          }
        });

        pathEl.addEventListener("mouseleave", () => {
          pathEl.style.filter = "";
          pathEl.style.stroke = "#ffffff";
          pathEl.style.strokeWidth = "1.5";
          const rankItem = rankingWrap ? rankingWrap.querySelector(`[data-iti-rank="${itiCod}"]`) : null;
          if (rankItem) rankItem.classList.remove("ranking-bar-highlight");

          if (tooltipEl) {
            tooltipEl.style.display = "none";
          }
        });

        gItis.appendChild(pathEl);
      });
      svgMap.appendChild(gItis);

      // Capa 2: Líneas divisorias departamentales punteadas (fiel a limitesDep de PERU)
      if (depLinesCache && depLinesCache.d) {
        const depPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        depPath.setAttribute("id", "path-dep-lines");
        depPath.setAttribute("d", depLinesCache.d);
        depPath.setAttribute("fill", "none");
        depPath.setAttribute("stroke", "rgba(255,255,255,0.75)");
        depPath.setAttribute("stroke-width", "0.85");
        depPath.setAttribute("stroke-dasharray", "3 2");
        depPath.setAttribute("stroke-linecap", "round");
        depPath.setAttribute("stroke-linejoin", "round");
        depPath.style.pointerEvents = "none";
        svgMap.appendChild(depPath);
      }
    }

    // Ranking de barras en formato tabla ejecutiva (fiel al mockup)
    if (rankingWrap) {
      rankingWrap.innerHTML = "";
      const itisOrdenadas = [...intendencias].sort((a, b) => {
        const valA = ((a.totales?.en_atencion || 0) + (a.totales?.en_cola || 0));
        const valB = ((b.totales?.en_atencion || 0) + (b.totales?.en_cola || 0));
        return valB - valA;
      });

      const top8 = itisOrdenadas.slice(0, 8);
      const restantes = itisOrdenadas.slice(8);
      let sumaRestantes = 0;
      restantes.forEach(i => {
        sumaRestantes += ((i.totales?.en_atencion || 0) + (i.totales?.en_cola || 0));
      });

      const maxVal = top8.length > 0 ? ((top8[0].totales?.en_atencion || 0) + (top8[0].totales?.en_cola || 0)) : 100;

      const mapaNombres = {
        "iti_lima": "Lima",
        "iti_lalibertad": "La Libertad",
        "iti_cusco": "Cusco",
        "iti_junin": "Junín",
        "iti_sanmartin": "San Martín",
        "iti_piura": "Piura",
        "iti_arequipa": "Arequipa",
        "iti_ica": "Ica",
        "iti_lambayeque": "Lambayeque",
        "iti_cajamarca": "Cajamarca",
        "iti_ayacucho": "Ayacucho",
        "iti_chimbote": "Chimbote",
        "iti_huaraz": "Huaraz",
        "iti_huanuco": "Huánuco",
        "iti_juliaca": "Juliaca",
        "iti_loreto": "Loreto",
        "iti_madrededios": "Madre de Dios",
        "iti_tacna": "Tacna",
        "iti_tumbes": "Tumbes",
        "iti_ucayali": "Ucayali",
        "iti_huacho": "Huacho"
      };

      top8.forEach((iti, idx) => {
        const val = ((iti.totales?.en_atencion || 0) + (iti.totales?.en_cola || 0));
        const color = colorPorIti[iti.codigo] || (val >= 60 ? "#ef4444" : val >= 45 ? "#f97316" : val >= 38 ? "#facc15" : "#10b981");
        const pctWidth = Math.max(12, Math.min(100, Math.round((val / Math.max(1, maxVal)) * 95)));
        
        let nombreCorto = mapaNombres[iti.codigo];
        if (!nombreCorto) {
          nombreCorto = (iti.nombre || iti.siglas || "")
            .replace(/Intendencia\s+de\s+Tributos\s+Internos/gi, "")
            .replace(/Intendencia\s+Regional/gi, "")
            .replace(/Intendencia/gi, "")
            .replace(/ITI/gi, "")
            .trim();
        }

        const item = document.createElement("div");
        item.className = "ranking-table-row";
        item.setAttribute("data-iti-rank", iti.codigo);
        item.title = `${iti.nombre}: ${val} tickets activos`;
        item.innerHTML = `
          <span class="r-col-rank">${idx + 1}</span>
          <div class="ranking-iti-wrap">
            <span class="ranking-dot" style="background: ${color};"></span>
            <span class="ranking-name">${nombreCorto}</span>
          </div>
          <div class="ranking-track">
            <div class="ranking-fill" style="width: ${pctWidth}%; background: ${color};"></div>
          </div>
          <span class="ranking-val">${val.toLocaleString()}</span>
        `;
        item.addEventListener("click", () => {
          window.location.href = `/intendencia/${iti.codigo}`;
        });
        item.addEventListener("mouseenter", () => {
          if (svgMap) {
            const itiEl = svgMap.querySelector(`[data-iti="${iti.codigo}"]`);
            if (itiEl) {
              itiEl.style.filter = "brightness(1.15) drop-shadow(0 0 3px rgba(255,255,255,0.85))";
              itiEl.style.stroke = "#ffffff";
              itiEl.style.strokeWidth = "2.2";
            }
          }
        });
        item.addEventListener("mouseleave", () => {
          if (svgMap) {
            const itiEl = svgMap.querySelector(`[data-iti="${iti.codigo}"]`);
            if (itiEl) {
              itiEl.style.filter = "";
              itiEl.style.stroke = "#ffffff";
              itiEl.style.strokeWidth = "1.5";
            }
          }
        });
        rankingWrap.appendChild(item);
      });

      if (restantes.length > 0) {
        const pctOtras = Math.max(12, Math.min(100, Math.round((sumaRestantes / Math.max(1, maxVal * 2.5)) * 95)));
        const itemOtras = document.createElement("div");
        itemOtras.className = "ranking-table-row ranking-table-row--otras";
        itemOtras.title = `Otras ${restantes.length} ITIs: ${sumaRestantes} tickets activos`;
        itemOtras.innerHTML = `
          <span class="r-col-rank"></span>
          <div class="ranking-iti-wrap">
            <span class="ranking-dot-placeholder" style="width: 7.5px;"></span>
            <span class="ranking-name">Otras</span>
          </div>
          <div class="ranking-track">
            <div class="ranking-fill" style="width: ${pctOtras}%; background: #8da2ba;"></div>
          </div>
          <span class="ranking-val">${sumaRestantes.toLocaleString()}</span>
        `;
        itemOtras.addEventListener("click", () => {
          activarSegmentoVista("mapa");
        });
        rankingWrap.appendChild(itemOtras);
      }
    }
  }

  function renderizarItisNacional(intendencias) {
    const gridCards = $("grid-itis-cards");
    const tbody = $("tabla-itis-body");
    if (!gridCards && !tbody) return;

    const q = (busquedaItiActual || "").trim().toLowerCase();
    const itisFiltradas = (intendencias || []).filter(iti => {
      if (!q) return true;
      return iti.nombre.toLowerCase().includes(q) ||
             iti.codigo.toLowerCase().includes(q) ||
             (iti.region && iti.region.toLowerCase().includes(q)) ||
             (iti.siglas && iti.siglas.toLowerCase().includes(q));
    });

    // 1. Grid de Tarjetas de ITI (Compacto y de Alta Densidad)
    if (gridCards) {
      gridCards.innerHTML = "";
      if (itisFiltradas.length === 0) {
        gridCards.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center;">
            <i class="fa-solid fa-filter fa-2x" style="color: #94a3b8; margin-bottom: 8px;"></i>
            <p>No se encontraron Intendencias Tributarias con "${q}".</p>
          </div>
        `;
      } else {
        itisFiltradas.forEach(iti => {
          const tot = iti.totales || {};
          const enAtencion = tot.en_atencion || 0;
          const enCola = tot.en_cola || 0;
          const slaVal = tot.pct_espera_15m ?? 95.0;
          const slaNum = typeof slaVal === "number" ? slaVal.toFixed(1) : parseFloat(slaVal).toFixed(1);
          const ticketsTotal = (tot.atendidos_hoy || 0) + enAtencion + enCola;

          let agentesIti = 0;
          (iti.sedes || []).forEach(s => {
            const prod = s.produccion || [];
            if (prod.length > 0) agentesIti += prod.length;
            else if (s.resumen && s.resumen.en_atencion > 0) agentesIti += s.resumen.en_atencion;
          });
          if (agentesIti === 0) agentesIti = enAtencion;

          let minutosEspera = 8;
          if (tot.ta_prom && String(tot.ta_prom).includes(":")) {
            minutosEspera = parseInt(tot.ta_prom.split(":")[0], 10) || 1;
          }

          const isDemandaAlta = slaVal < 91 || enCola > 14;
          const statusText = isDemandaAlta ? "Demanda alta" : "En atención";
          const statusCls = isDemandaAlta ? "status--warning" : "status--online";
          const gaugeColor = isDemandaAlta ? "#f59e0b" : "#00b074";
          const gaugeBgColor = isDemandaAlta ? "#fef0e3" : "#e6f7ef";

          const radius = 31;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (Math.min(100, Math.max(0, slaVal)) / 100) * circumference;

          let tituloLimpio = iti.siglas || iti.nombre || "ITI";
          if (tituloLimpio.toUpperCase().includes("LIMA")) {
            tituloLimpio = "ITI Lima";
          } else {
            tituloLimpio = tituloLimpio
              .replace(/INTENDENCIA REGIONAL DE /i, "ITI ")
              .replace(/INTENDENCIA DE TRIBUTOS INTERNOS /i, "ITI ")
              .replace(/INTENDENCIA /i, "ITI ")
              .trim();
            if (!tituloLimpio.toUpperCase().startsWith("ITI")) {
              tituloLimpio = "ITI " + tituloLimpio;
            }
            tituloLimpio = tituloLimpio
              .split(" ")
              .map((w, idx) => {
                if (idx === 0) return "ITI";
                const lower = w.toLowerCase();
                if (lower === "de" || lower === "la") return lower;
                return lower.charAt(0).toUpperCase() + lower.slice(1);
              })
              .join(" ");
            if (tituloLimpio.toLowerCase().includes("la libertad")) tituloLimpio = "ITI La Libertad";
            if (tituloLimpio.toLowerCase().includes("madre de dios")) tituloLimpio = "ITI Madre de Dios";
            if (tituloLimpio.toLowerCase().includes("san martin") || tituloLimpio.toLowerCase().includes("san martín")) tituloLimpio = "ITI San Martín";
          }

          const card = document.createElement("div");
          card.className = "iti-stat-card";
          card.innerHTML = `
            <div class="iti-card-top">
              <span class="iti-card-title">${tituloLimpio}</span>
              <span class="iti-status-badge ${statusCls}">
                <span class="status-dot"></span>
                <span>${statusText}</span>
              </span>
            </div>
            <div class="iti-card-middle">
              <div class="gauge-ring-wrap">
                <svg width="76" height="76" viewBox="0 0 76 76">
                  <circle class="gauge-bg" cx="38" cy="38" r="31" stroke="${gaugeBgColor}"/>
                  <circle class="gauge-bar" cx="38" cy="38" r="31"
                    stroke="${gaugeColor}"
                    stroke-dasharray="${circumference.toFixed(2)}"
                    stroke-dashoffset="${offset.toFixed(2)}"/>
                </svg>
                <div class="gauge-val-wrap">
                  <span class="gauge-percent">${slaNum}%</span>
                  <span class="gauge-label">Atención</span>
                </div>
              </div>
              <div class="iti-metrics-list">
                <div class="iti-metric-row">
                  <span class="m-label"><i class="fa-regular fa-user icon--green"></i> En atención</span>
                  <span class="m-val">${enAtencion.toLocaleString()}</span>
                </div>
                <div class="iti-metric-row">
                  <span class="m-label"><i class="fa-regular fa-clock icon--amber"></i> En cola</span>
                  <span class="m-val">${enCola.toLocaleString()}</span>
                </div>
                <div class="iti-metric-row">
                  <span class="m-label"><i class="fa-solid fa-users icon--blue"></i> Agentes</span>
                  <span class="m-val">${agentesIti.toLocaleString()}</span>
                </div>
                <div class="iti-metric-row">
                  <span class="m-label"><i class="fa-regular fa-file-lines icon--blue"></i> Tickets</span>
                  <span class="m-val">${ticketsTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div class="iti-card-bottom">
              <div class="iti-wait-time">
                <i class="fa-regular fa-clock"></i>
                <span>Espera: <strong>${minutosEspera} min</strong></span>
              </div>
              <div class="iti-arrow-btn" title="Ver detalle de ${iti.nombre}">
                <i class="fa-solid fa-chevron-right"></i>
              </div>
            </div>
          `;
          card.addEventListener("click", () => {
            window.location.href = `/intendencia/${iti.codigo}`;
          });
          gridCards.appendChild(card);
        });
      }
    }

    // 2. Tabla Ejecutiva de ITIs
    if (tbody) {
      tbody.innerHTML = "";
      if (itisFiltradas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No hay ITIs que coincidan con la búsqueda</td></tr>';
      } else {
        itisFiltradas.forEach(iti => {
          const tot = iti.totales || {};
          const enAtencion = tot.en_atencion || 0;
          const enCola = tot.en_cola || 0;
          const slaVal = tot.pct_espera_15m ?? 95.0;
          const slaNum = typeof slaVal === "number" ? slaVal.toFixed(1) : parseFloat(slaVal).toFixed(1);
          const ticketsTotal = (tot.atendidos_hoy || 0) + enAtencion + enCola;

          let agentesIti = 0;
          (iti.sedes || []).forEach(s => {
            const prod = s.produccion || [];
            if (prod.length > 0) agentesIti += prod.length;
            else if (s.resumen && s.resumen.en_atencion > 0) agentesIti += s.resumen.en_atencion;
          });
          if (agentesIti === 0) agentesIti = enAtencion;

          let minutosEspera = 8;
          if (tot.ta_prom && String(tot.ta_prom).includes(":")) {
            minutosEspera = parseInt(tot.ta_prom.split(":")[0], 10) || 1;
          }

          const isDemandaAlta = slaVal < 91 || enCola > 14;
          const statusText = isDemandaAlta ? "Demanda alta" : "En atención";
          const statusCls = isDemandaAlta ? "status--warning" : "status--online";
          const gaugeColor = isDemandaAlta ? "#f59e0b" : "#10b981";

          const tr = document.createElement("tr");
          tr.style.cursor = "pointer";
          tr.innerHTML = `
            <td>
              <div style="font-weight: 700; color: #0f172a;">${iti.nombre}</div>
              <div style="font-size: 11px; color: #64748b;">${(iti.sedes || []).length} Sedes / Centros de Servicios</div>
            </td>
            <td class="text-center">
              <span class="iti-status-badge ${statusCls}">
                <span class="status-dot"></span>
                <span>${statusText}</span>
              </span>
            </td>
            <td class="text-center" style="font-weight: 800; color: ${gaugeColor};">${slaNum}%</td>
            <td class="text-center num-cell" style="color: #059669;">${enAtencion.toLocaleString()}</td>
            <td class="text-center num-cell" style="color: #ea580c;">${enCola.toLocaleString()}</td>
            <td class="text-center num-cell" style="color: #475569;">${agentesIti.toLocaleString()}</td>
            <td class="text-center num-cell">${ticketsTotal.toLocaleString()}</td>
            <td class="text-center num-cell" style="color: #475569;">${minutosEspera} min</td>
            <td class="text-center">
              <a href="/intendencia/${iti.codigo}" class="btn btn--subtle btn--sm" style="font-size: 11px; text-decoration: none;" onclick="event.stopPropagation();">
                <span>Ver ITI &rarr;</span>
              </a>
            </td>
          `;
          tr.addEventListener("click", () => {
            window.location.href = `/intendencia/${iti.codigo}`;
          });
          tbody.appendChild(tr);
        });
      }
    }
  }

  // ====================================================================
  // 4.1 MONITOREO POR INTENDENCIA (NIVEL 2 - CSCs) - FIEL AL MOCKUP SAAS
  // ====================================================================
  async function renderizarVistaIti(data, itiActualCod) {
    if (!data) return;

    // 1. Fecha y Hora de Sincronización
    const d = new Date();
    const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
    const diaNom = dias[d.getDay()];
    const diaNum = d.getDate();
    const mesNom = meses[d.getMonth()];
    const anio = d.getFullYear();
    const fechaStr = `${diaNom}, ${diaNum} ${mesNom} ${anio}`;
    if ($("hero-date-str")) $("hero-date-str").textContent = fechaStr;
    if ($("hero-sync-time")) $("hero-sync-time").textContent = `Actualizado: ${data.actualizado || '--:--'}`;

    // 2. Obtener la Intendencia actual y sus CSCs adscritos
    const todasSedes = data.sedes || [];
    const sedesIti = todasSedes.filter(s => !itiActualCod || itiActualCod === "todas" || s.intendencia_codigo === itiActualCod);
    const itiInfo = (data.intendencias || []).find(i => i.codigo === itiActualCod) || {};

    // 3. 4 Hero KPI Cards para esta ITI
    let totalCola = 0;
    let totalAtencion = 0;
    let totalAgentes = 0;

    sedesIti.forEach(s => {
      const res = s.resumen || {};
      totalCola += (res.en_cola || 0);
      totalAtencion += (res.en_atencion || 0);
      const prod = s.produccion || [];
      if (prod.length > 0) totalAgentes += prod.length;
      else if (res.en_atencion > 0) totalAgentes += res.en_atencion;
    });
    if (totalAgentes === 0) totalAgentes = totalAtencion;
    const totalEnCurso = totalCola + totalAtencion;

    if ($("reg-ac-total")) $("reg-ac-total").textContent = totalEnCurso.toLocaleString();
    if ($("reg-en-cola")) $("reg-en-cola").textContent = totalCola.toLocaleString();
    if ($("reg-en-atencion")) $("reg-en-atencion").textContent = totalAtencion.toLocaleString();
    if ($("reg-agentes-activos")) $("reg-agentes-activos").textContent = totalAgentes.toLocaleString();

    // 4. Tarjeta Resumen Territorial de la ITI (Columna Izquierda)
    const slaValIti = itiInfo.totales?.pct_espera_15m ?? 96.5;
    const slaNumIti = typeof slaValIti === "number" ? slaValIti.toFixed(1) : parseFloat(slaValIti).toFixed(1);
    if ($("iti-stat-csccount")) $("iti-stat-csccount").textContent = sedesIti.length;
    if ($("iti-stat-sla")) $("iti-stat-sla").textContent = `${slaNumIti}%`;
    if ($("iti-stat-cola")) $("iti-stat-cola").textContent = totalCola.toLocaleString();
    if ($("iti-stat-taprom")) $("iti-stat-taprom").textContent = itiInfo.totales?.ta_prom || '08:12';

    // 5. Renderizar Mapa Regional Zoomed y Ranking de CSCs
    await renderizarMapaYRankingIti(itiActualCod, sedesIti, itiInfo);

    // 6. Renderizar Cards de CSC y Tabla
    renderizarCscsIti(sedesIti, itiInfo);
  }

  function formatTitleCase(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/(?:^|\s|-)\S/g, a => a.toUpperCase());
  }

  // Función de semáforo institucional (Rojo / Amarillo / Verde) idéntica al mapa nacional
  function obtenerSemaforoCsc(s, rankingList) {
    const res = s.resumen || {};
    const totActivos = (res.en_atencion || 0) + (res.en_cola || 0);
    const sla = res.pct_espera_15m !== undefined ? res.pct_espera_15m : 95.0;
    const maxVal = rankingList && rankingList.length > 0
      ? Math.max(1, ((rankingList[0].resumen?.en_atencion || 0) + (rankingList[0].resumen?.en_cola || 0)))
      : 10;

    // Umbrales para distribución semáforo armoniosa:
    // 1. ROJO: Alta demanda / SLA crítico (<85%) o carga máxima superior (10+) o espera >15m
    if (sla < 85 || (maxVal >= 7 && totActivos >= Math.max(10, Math.round(maxVal * 0.95))) || (res.espera_max_seg && res.espera_max_seg >= 900)) {
      return {
        estado: "rojo",
        color: "#ef4444",
        colorHover: "#dc2626",
        colorLight: "#fee2e2",
        label: "Alta demanda"
      };
    }
    // 2. AMARILLO: Demanda moderada / SLA en alerta (85-92%) o carga intermedia (7 a 9)
    if (sla < 93 || (maxVal >= 6 && totActivos >= Math.max(7, Math.round(maxVal * 0.65))) || (res.espera_max_seg && res.espera_max_seg >= 600)) {
      return {
        estado: "amarillo",
        color: "#f59e0b",
        colorHover: "#d97706",
        colorLight: "#fef3c7",
        label: "Demanda media"
      };
    }
    // 3. VERDE: Atención fluida / SLA óptimo (>=93%) y carga normal
    return {
      estado: "verde",
      color: "#10b981",
      colorHover: "#059669",
      colorLight: "#dcfce7",
      label: "Atención fluida"
    };
  }

  async function renderizarMapaYRankingIti(itiActualCod, sedesIti, itiInfo) {
    const svgMap = $("svg-iti-choropleth");
    const rankingWrap = $("csc-ranking-bars-container");
    if (!svgMap && !rankingWrap) return;

    if (!itisZoomedPathsCache) {
      try {
        const resp = await fetch("/static/peru_itis_zoomed_paths.json");
        if (resp.ok) itisZoomedPathsCache = await resp.json();
      } catch (e) {
        console.warn("No se pudieron cargar geometrías de ITIs zoomed:", e);
      }
    }

    const itiGeo = (itisZoomedPathsCache && itiActualCod) ? itisZoomedPathsCache[itiActualCod] : null;

    // 1. Calcular Ranking ordenado previo para derivar semáforos y carga relativa
    const rankingList = [...sedesIti].sort((a, b) => {
      const valA = ((a.resumen?.en_atencion || 0) + (a.resumen?.en_cola || 0));
      const valB = ((b.resumen?.en_atencion || 0) + (b.resumen?.en_cola || 0));
      return valB - valA;
    });

    const maxVal = Math.max(1, ((rankingList[0]?.resumen?.en_atencion || 0) + (rankingList[0]?.resumen?.en_cola || 0)));

    // 2. Mapeo indexado de sedes por código y por provincia
    const sedesMap = {};
    const cscPorProvincia = {};
    sedesIti.forEach(s => {
      sedesMap[s.codigo] = s;
      if (s.codigo.startsWith("csc_")) {
        sedesMap[s.codigo.replace("csc_", "")] = s;
      } else {
        sedesMap[`csc_${s.codigo}`] = s;
      }
    });

    (itiGeo?.cscs || []).forEach(c => {
      const provNorm = (c.provincia || "").toUpperCase().trim();
      if (!cscPorProvincia[provNorm]) cscPorProvincia[provNorm] = [];
      const s = sedesMap[c.codigo];
      if (s && !cscPorProvincia[provNorm].includes(s)) {
        cscPorProvincia[provNorm].push(s);
      }
    });

    // 3. Renderizar SVG del mapa regional (SOLO las provincias y CSCs de esta ITI)
    if (svgMap && itiGeo) {
      svgMap.innerHTML = "";
      svgMap.setAttribute("viewBox", itiGeo.viewBox || "0 0 240 280");

      const mapPanel = svgMap.closest(".exec-map-panel") || svgMap.parentElement;
      let tooltipEl = mapPanel ? mapPanel.querySelector(".iti-map-custom-tooltip") : null;
      if (!tooltipEl && mapPanel) {
        tooltipEl = document.createElement("div");
        tooltipEl.className = "iti-map-custom-tooltip";
        mapPanel.appendChild(tooltipEl);
      }

      svgMap.addEventListener("mouseleave", () => {
        if (tooltipEl) tooltipEl.style.display = "none";
      });

      // Capa 1: Provincias de esta ITI coloreadas por su Semáforo (Rojo, Amarillo, Verde) con borde blanco 2px
      const gProvs = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gProvs.setAttribute("id", "g-iti-provincias");

      (itiGeo.provincias || []).forEach(p => {
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", p.d);

        const provNomUpper = (p.provincia || "").toUpperCase().trim();
        const sedesDeEstaProv = cscPorProvincia[provNomUpper] || [];
        const tieneCsc = p.has_csc || sedesDeEstaProv.length > 0;

        let colorProv = "#94a3b8"; // Plomo definido para que se aprecie la silueta completa del mapa
        let semaforoProv = null;

        if (tieneCsc && sedesDeEstaProv.length > 0) {
          const sems = sedesDeEstaProv.map(s => obtenerSemaforoCsc(s, rankingList));
          if (sems.some(sem => sem.estado === "rojo")) {
            semaforoProv = sems.find(sem => sem.estado === "rojo");
          } else if (sems.some(sem => sem.estado === "amarillo")) {
            semaforoProv = sems.find(sem => sem.estado === "amarillo");
          } else {
            semaforoProv = sems[0] || { color: "#10b981", estado: "verde", label: "Atención fluida" };
          }
          colorProv = semaforoProv.color;
        }

        pathEl.setAttribute("fill", colorProv);
        pathEl.setAttribute("stroke", "#ffffff");
        pathEl.setAttribute("stroke-width", "2.0");
        pathEl.setAttribute("stroke-linejoin", "round");
        pathEl.setAttribute("stroke-linecap", "round");
        pathEl.className.baseVal = tieneCsc
          ? `iti-prov-path iti-prov-active iti-prov--${semaforoProv?.estado || 'verde'}`
          : "iti-prov-path iti-prov-inactive";

        if (tieneCsc && sedesDeEstaProv.length > 0) {
          pathEl.setAttribute("data-prov-code", sedesDeEstaProv[0].codigo);
          pathEl.addEventListener("mouseenter", (e) => {
            sedesDeEstaProv.forEach(s => {
              const pin = svgMap.querySelector(`[data-csc-pin="${s.codigo}"]`);
              if (pin) pin.classList.add("pin-highlight");
              const lbl = svgMap.querySelector(`[data-csc-label="${s.codigo}"]`);
              if (lbl) lbl.classList.add("pin-highlight");
              const rankItem = rankingWrap ? rankingWrap.querySelector(`[data-csc-rank="${s.codigo}"]`) : null;
              if (rankItem) rankItem.classList.add("ranking-bar-highlight");
            });

            if (tooltipEl) {
              const nomsCsc = sedesDeEstaProv.map(s => s.nombre).join(" · ");
              tooltipEl.innerHTML = `
                <span style="background:${colorProv}; width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px;"></span>
                <span>${p.provincia}: <strong>${nomsCsc}</strong></span>
                <span style="color:#64748b; margin-left:4px;">(${semaforoProv?.label || 'Estado'})</span>
              `;
              tooltipEl.style.display = "inline-flex";
              const panelRect = mapPanel.getBoundingClientRect();
              const x = e.clientX - panelRect.left;
              const y = e.clientY - panelRect.top;
              tooltipEl.style.left = `${x}px`;
              tooltipEl.style.top = `${y}px`;
              tooltipEl.style.transform = (y < 45) ? "translate(-50%, 18px)" : "translate(-50%, -125%)";
            }
          });

          pathEl.addEventListener("mousemove", (e) => {
            if (tooltipEl && tooltipEl.style.display === "inline-flex") {
              const panelRect = mapPanel.getBoundingClientRect();
              const x = e.clientX - panelRect.left;
              const y = e.clientY - panelRect.top;
              tooltipEl.style.left = `${x}px`;
              tooltipEl.style.top = `${y}px`;
              tooltipEl.style.transform = (y < 45) ? "translate(-50%, 18px)" : "translate(-50%, -125%)";
            }
          });

          pathEl.addEventListener("mouseleave", () => {
            sedesDeEstaProv.forEach(s => {
              const pin = svgMap.querySelector(`[data-csc-pin="${s.codigo}"]`);
              if (pin) pin.classList.remove("pin-highlight");
              const lbl = svgMap.querySelector(`[data-csc-label="${s.codigo}"]`);
              if (lbl) lbl.classList.remove("pin-highlight");
              const rankItem = rankingWrap ? rankingWrap.querySelector(`[data-csc-rank="${s.codigo}"]`) : null;
              if (rankItem) rankItem.classList.remove("ranking-bar-highlight");
            });
            if (tooltipEl) tooltipEl.style.display = "none";
          });

          pathEl.addEventListener("click", () => {
            window.location.href = `/sede/${sedesDeEstaProv[0].codigo}`;
          });
        }

        gProvs.appendChild(pathEl);
      });
      svgMap.appendChild(gProvs);

      // Capa 2: Nombres exclusivos de las CSCs oficiales (según la CSC, nada más)
      const gLabels = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gLabels.setAttribute("id", "g-iti-csc-labels");

      (itiGeo.cscs || []).forEach(csc => {
        const cscNombre = (csc.nombre || "").replace(/^CSC\s+/i, "").trim();
        const lblY = csc.y + 7.8;

        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", csc.x);
        txt.setAttribute("y", lblY);
        txt.setAttribute("text-anchor", "middle");
        txt.className.baseVal = "iti-csc-label";
        txt.setAttribute("data-csc-label", csc.codigo);
        txt.textContent = cscNombre;
        gLabels.appendChild(txt);
      });
      svgMap.appendChild(gLabels);

      // Capa 3: Pines interactivos con semáforo exacto en vivo
      const gPins = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gPins.setAttribute("id", "g-iti-csc-pins");

      (itiGeo.cscs || []).forEach(csc => {
        const s = sedesMap[csc.codigo] || {};
        const sem = obtenerSemaforoCsc(s, rankingList);
        const pinColor = sem.color;

        const pinGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        pinGroup.setAttribute("class", "csc-map-pin");
        pinGroup.setAttribute("data-csc-pin", csc.codigo);
        pinGroup.setAttribute("transform", `translate(${csc.x}, ${csc.y})`);

        // Área de impacto interactiva generosa para hover y clic suaves
        const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        hitArea.setAttribute("r", "8");
        hitArea.setAttribute("fill", "transparent");
        hitArea.style.cursor = "pointer";
        pinGroup.appendChild(hitArea);

        // Círculo exterior pulsante en el color semáforo
        const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        pulse.setAttribute("r", "3.6");
        pulse.setAttribute("fill", pinColor);
        pulse.setAttribute("class", "csc-map-pin-pulse");
        pulse.style.pointerEvents = "none";
        pinGroup.appendChild(pulse);

        // Círculo principal del pin con borde blanco nítido
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("r", "2.8");
        dot.setAttribute("fill", pinColor);
        dot.setAttribute("stroke", "#ffffff");
        dot.setAttribute("stroke-width", "0.9");
        dot.style.pointerEvents = "none";
        pinGroup.appendChild(dot);

        // Punto interior blanco para acabado ejecutivo
        const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        center.setAttribute("r", "0.95");
        center.setAttribute("fill", "#ffffff");
        center.style.pointerEvents = "none";
        pinGroup.appendChild(center);

        pinGroup.addEventListener("click", () => {
          window.location.href = `/sede/${csc.codigo}`;
        });

        pinGroup.addEventListener("mouseenter", (e) => {
          pinGroup.classList.add("pin-highlight");
          const lbl = svgMap.querySelector(`[data-csc-label="${csc.codigo}"]`);
          if (lbl) lbl.classList.add("pin-highlight");
          const card = document.querySelector(`[data-csc-card="${csc.codigo}"]`);
          if (card) {
            card.classList.add("csc-card-highlighted");
          }
          const rankItem = rankingWrap ? rankingWrap.querySelector(`[data-csc-rank="${csc.codigo}"]`) : null;
          if (rankItem) rankItem.classList.add("ranking-bar-highlight");

          if (tooltipEl) {
            tooltipEl.innerHTML = `
              <span style="background:${pinColor}; width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px;"></span>
              <span><strong>${csc.nombre}</strong></span>
              <span style="color:#64748b; margin-left:4px;">(${sem.label})</span>
            `;
            tooltipEl.style.display = "inline-flex";
            const panelRect = mapPanel.getBoundingClientRect();
            const x = e.clientX - panelRect.left;
            const y = e.clientY - panelRect.top;
            tooltipEl.style.left = `${x}px`;
            tooltipEl.style.top = `${y}px`;
            tooltipEl.style.transform = (y < 45) ? "translate(-50%, 18px)" : "translate(-50%, -125%)";
          }
        });

        pinGroup.addEventListener("mousemove", (e) => {
          if (tooltipEl && tooltipEl.style.display === "inline-flex") {
            const panelRect = mapPanel.getBoundingClientRect();
            const x = e.clientX - panelRect.left;
            const y = e.clientY - panelRect.top;
            tooltipEl.style.left = `${x}px`;
            tooltipEl.style.top = `${y}px`;
            tooltipEl.style.transform = (y < 45) ? "translate(-50%, 18px)" : "translate(-50%, -125%)";
          }
        });

        pinGroup.addEventListener("mouseleave", () => {
          pinGroup.classList.remove("pin-highlight");
          const lbl = svgMap.querySelector(`[data-csc-label="${csc.codigo}"]`);
          if (lbl) lbl.classList.remove("pin-highlight");
          const card = document.querySelector(`[data-csc-card="${csc.codigo}"]`);
          if (card) card.classList.remove("csc-card-highlighted");
          const rankItem = rankingWrap ? rankingWrap.querySelector(`[data-csc-rank="${csc.codigo}"]`) : null;
          if (rankItem) rankItem.classList.remove("ranking-bar-highlight");

          if (tooltipEl) {
            tooltipEl.style.display = "none";
          }
        });

        gPins.appendChild(pinGroup);
      });
      svgMap.appendChild(gPins);
    }

    // 4. Renderizar Ranking de CSCs con colores de Semáforo (Rojo, Amarillo, Verde)
    if (rankingWrap) {
      rankingWrap.innerHTML = "";
      const topCount = Math.min(8, rankingList.length);
      const top = rankingList.slice(0, topCount);
      const restantes = rankingList.slice(topCount);
      let sumaRestantes = 0;
      restantes.forEach(s => {
        sumaRestantes += ((s.resumen?.en_atencion || 0) + (s.resumen?.en_cola || 0));
      });

      top.forEach((s, idx) => {
        const totActivos = ((s.resumen?.en_atencion || 0) + (s.resumen?.en_cola || 0));
        const pct = Math.max(14, Math.min(100, Math.round((totActivos / Math.max(1, maxVal)) * 95)));
        const sem = obtenerSemaforoCsc(s, rankingList);
        const color = sem.color;

        let nomCorto = s.nombre.replace(/^CSC\s+/i, "").trim();

        const item = document.createElement("div");
        item.className = "ranking-table-row";
        item.setAttribute("data-csc-rank", s.codigo);
        item.title = `${s.nombre}: ${totActivos} tickets activos (${sem.label})`;
        item.innerHTML = `
          <span class="r-col-rank">${idx + 1}</span>
          <div class="ranking-iti-wrap">
            <span class="ranking-dot" style="background: ${color}; box-shadow: 0 0 0 2px ${sem.colorLight};"></span>
            <span class="ranking-name">${nomCorto}</span>
          </div>
          <div class="ranking-track">
            <div class="ranking-fill" style="width: ${pct}%; background: ${color};"></div>
          </div>
          <span class="ranking-val">${totActivos.toLocaleString()}</span>
        `;

        item.addEventListener("click", () => {
          window.location.href = `/sede/${s.codigo}`;
        });

        item.addEventListener("mouseenter", () => {
          const pin = svgMap ? svgMap.querySelector(`[data-csc-pin="${s.codigo}"]`) : null;
          if (pin) pin.classList.add("pin-highlight");
          const lbl = svgMap ? svgMap.querySelector(`[data-csc-label="${s.codigo}"]`) : null;
          if (lbl) lbl.classList.add("pin-highlight");
          const prov = svgMap ? svgMap.querySelector(`[data-prov-code="${s.codigo}"]`) : null;
          if (prov) {
            prov.style.filter = "brightness(1.15)";
            prov.setAttribute("stroke-width", "2.8");
          }
          const card = document.querySelector(`[data-csc-card="${s.codigo}"]`);
          if (card) {
            card.classList.add("csc-card-highlighted");
            card.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });

        item.addEventListener("mouseleave", () => {
          const pin = svgMap ? svgMap.querySelector(`[data-csc-pin="${s.codigo}"]`) : null;
          if (pin) pin.classList.remove("pin-highlight");
          const lbl = svgMap ? svgMap.querySelector(`[data-csc-label="${s.codigo}"]`) : null;
          if (lbl) lbl.classList.remove("pin-highlight");
          const prov = svgMap ? svgMap.querySelector(`[data-prov-code="${s.codigo}"]`) : null;
          if (prov) {
            prov.style.filter = "none";
            prov.setAttribute("stroke-width", "2.0");
          }
          const card = document.querySelector(`[data-csc-card="${s.codigo}"]`);
          if (card) card.classList.remove("csc-card-highlighted");
        });

        rankingWrap.appendChild(item);
      });

      if (restantes.length > 0) {
        const pctOtras = Math.max(10, Math.min(100, Math.round((sumaRestantes / Math.max(1, maxVal * 2)) * 95)));
        const itemOtras = document.createElement("div");
        itemOtras.className = "ranking-table-row ranking-table-row--otras";
        itemOtras.title = `Otros ${restantes.length} CSCs: ${sumaRestantes} tickets activos`;
        itemOtras.innerHTML = `
          <span class="r-col-rank"></span>
          <div class="ranking-iti-wrap">
            <span class="ranking-dot" style="background: #94a3b8;"></span>
            <span class="ranking-name">Otros CSCs</span>
          </div>
          <div class="ranking-track">
            <div class="ranking-fill" style="width: ${pctOtras}%; background: #94a3b8;"></div>
          </div>
          <span class="ranking-val">${sumaRestantes.toLocaleString()}</span>
        `;
        rankingWrap.appendChild(itemOtras);
      }
    }
  }

  function renderizarCscsIti(sedesIti, itiInfo) {
    const gridCards = $("grid-csc-cards");
    const tbody = $("tabla-csc-body");
    if (!gridCards && !tbody) return;

    const q = (busquedaCscActual || "").trim().toLowerCase();
    const cscsFiltrados = (sedesIti || []).filter(s => {
      if (!q) return true;
      return s.nombre.toLowerCase().includes(q) ||
             s.codigo.toLowerCase().includes(q) ||
             (s.departamento && s.departamento.toLowerCase().includes(q));
    });

    // 1. Grid de Tarjetas de CSC (3 Cards por fila, idénticas a la foto del usuario)
    if (gridCards) {
      gridCards.innerHTML = "";
      if (cscsFiltrados.length === 0) {
        gridCards.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center;">
            <i class="fa-solid fa-filter fa-2x" style="color: #94a3b8; margin-bottom: 8px;"></i>
            <p>No se encontraron Centros de Servicios con "${q}".</p>
          </div>
        `;
      } else {
        cscsFiltrados.forEach(s => {
          const res = s.resumen || {};
          const enAtencion = res.en_atencion || 0;
          const enCola = res.en_cola || 0;
          const slaVal = res.pct_espera_15m ?? 95.0;
          const slaNum = typeof slaVal === "number" ? slaVal.toFixed(1) : parseFloat(slaVal).toFixed(1);
          const ticketsTotal = (res.atendidos_hoy || 0) + enAtencion + enCola;

          let agentesSede = 0;
          const prod = s.produccion || [];
          if (prod.length > 0) agentesSede = prod.length;
          else if (enAtencion > 0) agentesSede = enAtencion + (res.suspendidos || 0);
          if (agentesSede === 0) agentesSede = enAtencion || 1;

          let minutosEspera = 8;
          if (res.espera_prom && String(res.espera_prom).includes(":")) {
            minutosEspera = parseInt(res.espera_prom.split(":")[0], 10) || 1;
          } else if (res.ta_prom && String(res.ta_prom).includes(":")) {
            minutosEspera = parseInt(res.ta_prom.split(":")[0], 10) || 1;
          }

          const isDemandaAlta = slaVal < 91 || enCola > 6;
          const statusText = isDemandaAlta ? "Demanda alta" : "En atención";
          const statusCls = isDemandaAlta ? "status--warning" : "status--online";
          const gaugeColor = isDemandaAlta ? "#f59e0b" : "#00b074";
          const gaugeBgColor = isDemandaAlta ? "#fef0e3" : "#e6f7ef";

          const radius = 31;
          const circumference = 2 * Math.PI * radius;
          const offset = circumference - (Math.min(100, Math.max(0, slaVal)) / 100) * circumference;

          const itiLabel = (s.intendencia_siglas || itiInfo?.siglas || itiInfo?.nombre || "INTENDENCIA").toUpperCase();

          const card = document.createElement("div");
          card.className = "iti-stat-card";
          card.setAttribute("data-csc-card", s.codigo);
          card.innerHTML = `
            <div class="iti-card-top">
              <span class="csc-card-loc-tag">
                <i class="fa-solid fa-location-dot"></i>
                <span>${itiLabel}</span>
              </span>
              <span class="iti-status-badge ${statusCls}">
                <span class="status-dot"></span>
                <span>${statusText}</span>
              </span>
            </div>
            <h3 class="csc-card-title-main">${s.nombre}</h3>
            <div class="iti-card-middle">
              <div class="gauge-ring-wrap">
                <svg width="76" height="76" viewBox="0 0 76 76">
                  <circle class="gauge-bg" cx="38" cy="38" r="31" stroke="${gaugeBgColor}"/>
                  <circle class="gauge-bar" cx="38" cy="38" r="31"
                    stroke="${gaugeColor}"
                    stroke-dasharray="${circumference.toFixed(2)}"
                    stroke-dashoffset="${offset.toFixed(2)}"/>
                </svg>
                <div class="gauge-val-wrap">
                  <span class="gauge-percent">${slaNum}%</span>
                  <span class="gauge-label">Atención</span>
                </div>
              </div>
              <div class="iti-metrics-list">
                <div class="iti-metric-row">
                  <span class="m-label"><i class="fa-regular fa-user icon--green"></i> En atención</span>
                  <span class="m-val">${enAtencion.toLocaleString()}</span>
                </div>
                <div class="iti-metric-row">
                  <span class="m-label"><i class="fa-regular fa-clock icon--amber"></i> En cola</span>
                  <span class="m-val">${enCola.toLocaleString()}</span>
                </div>
                <div class="iti-metric-row">
                  <span class="m-label"><i class="fa-solid fa-users icon--blue"></i> Agentes</span>
                  <span class="m-val">${agentesSede.toLocaleString()}</span>
                </div>
                <div class="iti-metric-row">
                  <span class="m-label"><i class="fa-regular fa-file-lines icon--blue"></i> Tickets</span>
                  <span class="m-val">${ticketsTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div class="iti-card-bottom">
              <div class="iti-wait-time">
                <i class="fa-regular fa-clock"></i>
                <span>Espera: <strong>${minutosEspera} min</strong></span>
              </div>
              <div class="iti-arrow-btn" title="Ver detalle de ${s.nombre}">
                <i class="fa-solid fa-chevron-right"></i>
              </div>
            </div>
          `;

          card.addEventListener("click", () => {
            window.location.href = `/sede/${s.codigo}`;
          });

          card.addEventListener("mouseenter", () => {
            const svgMap = $("svg-iti-choropleth");
            const pin = svgMap ? svgMap.querySelector(`[data-csc-pin="${s.codigo}"]`) : null;
            if (pin) pin.classList.add("pin-highlight");
            const lbl = svgMap ? svgMap.querySelector(`[data-csc-label="${s.codigo}"]`) : null;
            if (lbl) lbl.classList.add("pin-highlight");
            const rankingWrap = $("csc-ranking-bars-container");
            const rankItem = rankingWrap ? rankingWrap.querySelector(`[data-csc-rank="${s.codigo}"]`) : null;
            if (rankItem) rankItem.classList.add("ranking-bar-highlight");
          });

          card.addEventListener("mouseleave", () => {
            const svgMap = $("svg-iti-choropleth");
            const pin = svgMap ? svgMap.querySelector(`[data-csc-pin="${s.codigo}"]`) : null;
            if (pin) pin.classList.remove("pin-highlight");
            const lbl = svgMap ? svgMap.querySelector(`[data-csc-label="${s.codigo}"]`) : null;
            if (lbl) lbl.classList.remove("pin-highlight");
            const rankingWrap = $("csc-ranking-bars-container");
            const rankItem = rankingWrap ? rankingWrap.querySelector(`[data-csc-rank="${s.codigo}"]`) : null;
            if (rankItem) rankItem.classList.remove("ranking-bar-highlight");
          });

          gridCards.appendChild(card);
        });
      }
    }

    // 2. Tabla Ejecutiva de CSCs (cuando se conmuta a modo lista)
    if (tbody) {
      tbody.innerHTML = "";
      if (cscsFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No hay Centros de Servicios que coincidan con la búsqueda</td></tr>';
      } else {
        cscsFiltrados.forEach(s => {
          const res = s.resumen || {};
          const enAtencion = res.en_atencion || 0;
          const enCola = res.en_cola || 0;
          const slaVal = res.pct_espera_15m ?? 95.0;
          const slaNum = typeof slaVal === "number" ? slaVal.toFixed(1) : parseFloat(slaVal).toFixed(1);
          const ticketsTotal = (res.atendidos_hoy || 0) + enAtencion + enCola;

          let agentesSede = 0;
          const prod = s.produccion || [];
          if (prod.length > 0) agentesSede = prod.length;
          else if (enAtencion > 0) agentesSede = enAtencion + (res.suspendidos || 0);
          if (agentesSede === 0) agentesSede = enAtencion || 1;

          let minutosEspera = 8;
          if (res.espera_prom && String(res.espera_prom).includes(":")) {
            minutosEspera = parseInt(res.espera_prom.split(":")[0], 10) || 1;
          } else if (res.ta_prom && String(res.ta_prom).includes(":")) {
            minutosEspera = parseInt(res.ta_prom.split(":")[0], 10) || 1;
          }

          const isDemandaAlta = slaVal < 91 || enCola > 6;
          const statusText = isDemandaAlta ? "Demanda alta" : "En atención";
          const statusCls = isDemandaAlta ? "status--warning" : "status--online";
          const gaugeColor = isDemandaAlta ? "#f59e0b" : "#10b981";

          const tr = document.createElement("tr");
          tr.style.cursor = "pointer";
          tr.innerHTML = `
            <td>
              <div style="font-weight: 700; color: #0f172a;">${s.nombre}</div>
              <div style="font-size: 11px; color: #64748b;">${s.direccion || 'Atención Presencial SUNAT'}</div>
            </td>
            <td class="text-center">
              <span class="iti-status-badge ${statusCls}">
                <span class="status-dot"></span>
                <span>${statusText}</span>
              </span>
            </td>
            <td class="text-center" style="font-weight: 800; color: ${gaugeColor};">${slaNum}%</td>
            <td class="text-center num-cell" style="color: #059669;">${enAtencion.toLocaleString()}</td>
            <td class="text-center num-cell" style="color: #ea580c;">${enCola.toLocaleString()}</td>
            <td class="text-center num-cell" style="color: #475569;">${agentesSede.toLocaleString()}</td>
            <td class="text-center num-cell">${ticketsTotal.toLocaleString()}</td>
            <td class="text-center num-cell" style="color: #475569;">${minutosEspera} min</td>
            <td class="text-center">
              <a href="/sede/${s.codigo}" class="btn btn--subtle btn--sm" style="font-size: 11px; text-decoration: none;" onclick="event.stopPropagation();">
                <span>Ver Sede &rarr;</span>
              </a>
            </td>
          `;
          tr.addEventListener("click", () => {
            window.location.href = `/sede/${s.codigo}`;
          });
          tbody.appendChild(tr);
        });
      }
    }
  }

  // ====================================================================
  // 5. HERO STATS (5 TARJETAS VIBRANTES POR ITI)
  // ====================================================================
  function renderizarKpisRegionales(tot, sedes) {
    const totalCola = tot.en_cola || 0;
    const totalAtencion = tot.en_atencion || 0;
    const totalActivas = totalCola + totalAtencion;
    
    let totalAgentes = 0;
    sedes.forEach(s => {
      const prod = s.produccion || [];
      if (prod.length > 0) {
        totalAgentes += prod.length;
      } else if (s.resumen && s.resumen.en_atencion > 0) {
        totalAgentes += s.resumen.en_atencion;
      }
    });

    const tiempoProm = (tot.ta_prom && tot.ta_prom !== "00:00") ? tot.ta_prom : "00:00";

    if ($("reg-ac-total")) $("reg-ac-total").textContent = totalActivas;
    if ($("reg-en-cola")) $("reg-en-cola").textContent = totalCola;
    if ($("reg-en-atencion")) $("reg-en-atencion").textContent = totalAtencion;
    if ($("reg-agentes-activos")) $("reg-agentes-activos").textContent = totalAgentes;
    if ($("reg-ta-prom")) $("reg-ta-prom").textContent = tiempoProm;
  }

  // ====================================================================
  // 5. RENDERIZADOR DE CARDS GAMIFICADAS ("COMO JUGANDO")
  // ====================================================================
  function renderizarCardsGamificadas(sedes) {
    if (!wrapCards) return;
    wrapCards.innerHTML = "";

    if (!sedes || sedes.length === 0) {
      wrapCards.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 40px; text-align: center;">
          <i class="fa-solid fa-filter fa-2x" style="color: #94a3b8; margin-bottom: 8px;"></i>
          <p>No hay sedes que coincidan con el filtro actual.</p>
        </div>
      `;
      return;
    }

    sedes.forEach(s => {
      const r = s.resumen || {};
      const colaVal = r.en_cola || 0;
      const atencionVal = r.en_atencion || 0;
      const acVal = colaVal + atencionVal;
      const slaVal = r.pct_espera_15m ?? 100;
      const slaNum = typeof slaVal === "number" ? slaVal.toFixed(1) : parseFloat(slaVal).toFixed(1);
      const estadoOnline = Boolean(s.conectado);
      const esSim = Boolean(s.es_simulado);
      const taProm = r.ta_prom || "00:00";

      // Clase de intendencia dinámico (21 ITIs oficiales)
      let intCls = (s.intendencia_codigo || "iti_junin").replace("iti_", "");
      let intColor = s.color || "#0163ac";
      let intSiglas = s.intendencia_siglas || (s.intendencia_nombre ? s.intendencia_nombre.replace("Intendencia de Tributos Internos", "ITI").replace("Intendencia Regional", "ITI") : "ITI");

      // Achievement badge gamificado
      let achievementHtml = "";
      if (slaVal >= 96) {
        achievementHtml = `<span class="achievement-badge" title="Excelente cumplimiento de tiempos">🏆 Top SLA</span>`;
      } else if (colaVal === 0 && acVal > 0) {
        achievementHtml = `<span class="achievement-badge" style="background:#dcfce7; color:#15803d;">⚡ Sin Colas</span>`;
      } else if (acVal >= 10) {
        achievementHtml = `<span class="achievement-badge" style="background:#fee2e2; color:#b91c1c;">🔥 Alta Demanda</span>`;
      }

      // Cálculo del arco del medidor circular (perímetro = 2 * pi * 30 ≈ 188.5)
      const radio = 30;
      const perimetro = 2 * Math.PI * radio;
      const offset = perimetro - (Math.min(100, Math.max(0, slaVal)) / 100) * perimetro;
      const gaugeColor = slaVal >= 90 ? "#10b981" : (slaVal >= 80 ? "#f59e0b" : "#ef4444");

      // Gestor top con más atenciones
      let topGestorNombre = "Equipo Operativo";
      let topGestorAtenc = "";
      if (s.produccion && s.produccion.length > 0) {
        const sorted = [...s.produccion].sort((a,b) => (b.atenciones||0) - (a.atenciones||0));
        topGestorNombre = sorted[0].funcionario || "Gestor";
        topGestorAtenc = `${sorted[0].atenciones || 0} aten`;
      }

      const card = document.createElement("div");
      card.className = `game-card game-card--${intCls}`;
      card.innerHTML = `
        <div>
          <!-- Cabecera de la Card -->
          <div class="game-card__header">
            <div class="game-card__title-wrap">
              <span class="game-card__intendencia-tag game-card__intendencia-tag--${intCls}">
                <i class="fa-solid fa-location-dot"></i> ${intSiglas}
              </span>
              <a href="/sede/${s.codigo}" class="game-card__name" title="Ver monitoreo operativo en vivo">
                <span class="status-dot-vibrant status-dot-vibrant--${estadoOnline ? 'online' : 'offline'}"></span>
                <span>${s.nombre}</span>
              </a>
            </div>

            <!-- Badge Modo Real vs Simulado -->
            <span class="game-card__mode-badge game-card__mode-badge--${esSim ? 'sim' : 'real'}" title="${esSim ? 'Modo Simulado Activo' : 'Conexión Real SQL Server'}">
              <i class="fa-solid ${esSim ? 'fa-gamepad' : 'fa-database'}"></i>
              <span>${esSim ? 'Simulado' : 'Real SQL'}</span>
            </span>
          </div>

          <!-- Medidor Circular SLA + KPIs Clave -->
          <div class="game-card__metrics">
            <div class="circular-gauge-wrap">
              <svg width="74" height="74" viewBox="0 0 74 74">
                <circle cx="37" cy="37" r="${radio}" fill="none" stroke="#e2e8f0" stroke-width="6" />
                <circle cx="37" cy="37" r="${radio}" fill="none" stroke="${gaugeColor}" stroke-width="6"
                        stroke-dasharray="${perimetro}" stroke-dashoffset="${offset}" stroke-linecap="round" />
              </svg>
              <div class="gauge-pct-text">
                ${slaNum}%
                <div class="gauge-pct-sub">SLA</div>
              </div>
            </div>

            <div class="game-card__pills">
              <div class="game-pill-row">
                <span class="game-pill-label"><i class="fa-solid fa-phone" style="color:#0163ac;"></i> Active Calls</span>
                <span class="game-pill-val">${acVal}</span>
              </div>
              <div class="game-pill-row">
                <span class="game-pill-label"><i class="fa-regular fa-clock" style="color:#f59e0b;"></i> En Cola</span>
                <span class="game-pill-val ${colaVal > 3 ? 'game-pill-val--amber' : ''}">${colaVal}</span>
              </div>
              <div class="game-pill-row">
                <span class="game-pill-label"><i class="fa-solid fa-headset" style="color:#10b981;"></i> En Atención</span>
                <span class="game-pill-val">${atencionVal}</span>
              </div>
              <div class="game-pill-row">
                <span class="game-pill-label"><i class="fa-solid fa-stopwatch" style="color:#64748b;"></i> T. Espera</span>
                <span class="game-pill-val">${r.espera_prom || '00:00'}</span>
              </div>
            </div>
          </div>

          <!-- Funcionario Top & Achievement Badge -->
          <div class="game-card__extra">
            <div class="top-gestor-chip" title="Funcionario más activo hoy">
              <span class="top-gestor-avatar"><i class="fa-solid fa-user"></i></span>
              <span style="max-width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${topGestorNombre}</span>
              ${topGestorAtenc ? `<span style="color:#64748b; font-size:10px;">(${topGestorAtenc})</span>` : ''}
            </div>
            ${achievementHtml}
          </div>
        </div>

        <!-- Botones de Acción Gamificados -->
        <div class="game-card__footer">
          <button type="button" class="btn-card-action btn-test-ping-card" data-codigo="${s.codigo}" title="Probar conexión en tiempo real">
            <i class="fa-solid fa-bolt" style="color:#0163ac;"></i>
            <span>Test Ping</span>
          </button>

          <button type="button" class="btn-card-action btn-toggle-modo-card" data-codigo="${s.codigo}" title="Alternar entre conexión real y simulada">
            <i class="fa-solid fa-rotate" style="color:#64748b;"></i>
            <span>${esSim ? 'A Real' : 'A Sim'}</span>
          </button>

          <a href="/sede/${s.codigo}" class="btn-card-action btn-card-action--primary" title="Abrir pantalla TV de esta sede">
            <i class="fa-solid fa-desktop"></i>
            <span>Ver TV</span>
          </a>
        </div>
      `;

      // Eventos interactivos en la card
      const btnPing = card.querySelector(".btn-test-ping-card");
      if (btnPing) {
        btnPing.addEventListener("click", async () => {
          btnPing.disabled = true;
          btnPing.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Ping...`;
          try {
            const resp = await fetch(`/api/sedes/${s.codigo}/test-conexion`, { method: "POST" });
            const rData = await resp.json();
            if (rData.ok) {
              playChime();
              mostrarToast(`✓ ${s.nombre}: Conexión OK (${rData.latencia_ms} ms)`);
              btnPing.innerHTML = `✅ ${rData.latencia_ms}ms`;
            } else {
              playWarning();
              mostrarToast(`⚠️ ${s.nombre}: ${rData.mensaje || 'Sin respuesta'}`);
              btnPing.innerHTML = `⚠️ Error`;
            }
          } catch (e) {
            playWarning();
            btnPing.innerHTML = `⚠️ Falló`;
          } finally {
            setTimeout(() => {
              btnPing.disabled = false;
              btnPing.innerHTML = `<i class="fa-solid fa-bolt" style="color:#0163ac;"></i> Test Ping`;
            }, 3000);
          }
        });
      }

      const btnToggle = card.querySelector(".btn-toggle-modo-card");
      if (btnToggle) {
        btnToggle.addEventListener("click", async () => {
          playPop();
          btnToggle.disabled = true;
          try {
            const resp = await fetch(`/api/sedes/${s.codigo}/toggle-modo`, { method: "POST" });
            const rData = await resp.json();
            if (rData.ok) {
              playChime();
              mostrarToast(`✓ ${s.nombre} cambiado a modo: ${rData.sede.es_simulado ? 'Simulado' : 'Real SQL Server'}`);
              cargarDatosComparativos();
            }
          } catch (e) {
            mostrarToast("Error al alternar modo de sede");
          } finally {
            btnToggle.disabled = false;
          }
        });
      }

      wrapCards.appendChild(card);
    });
  }

  // ====================================================================
  // 6. RENDERIZADOR DE TABLA COMPARATIVA (LISTA)
  // ====================================================================
  function renderizarTablaComparativa(sedes) {
    if (!tbComp) return;
    tbComp.innerHTML = "";

    if (!sedes || sedes.length === 0) {
      tbComp.innerHTML = '<tr><td colspan="9" class="empty-state">No se recibieron datos de sedes</td></tr>';
      return;
    }

    sedes.forEach(s => {
      const tr = document.createElement("tr");
      const r = s.resumen || {};

      const colaVal = r.en_cola || 0;
      const atencionVal = r.en_atencion || 0;
      const acVal = colaVal + atencionVal;
      const agentesTotal = (s.produccion && s.produccion.length > 0) ? s.produccion.length : (atencionVal > 0 ? atencionVal : "-");
      const esperaVal = r.espera_prom || "00:00";
      const slaVal = r.pct_espera_15m ?? 100;
      const estadoOnline = Boolean(s.conectado);
      const esSim = Boolean(s.es_simulado);

      // Intendencia tag dinámico (21 ITIs)
      const intSiglas = s.intendencia_siglas || (s.intendencia_nombre ? s.intendencia_nombre.replace("Intendencia de Tributos Internos", "ITI").replace("Intendencia Regional", "ITI") : "ITI");
      const intCol = s.color || "#0163ac";
      let intPill = `<span style="font-size:10px; font-weight:700; color:${intCol}; background:${intCol}15; border: 1px solid ${intCol}35; padding:2px 6px; border-radius:4px;">${intSiglas}</span>`;

      // 1. CSC (Nombre con punto de conectividad)
      const dotCls = estadoOnline ? "csc-dot--green" : "csc-dot--red";
      const tdNom = document.createElement("td");
      tdNom.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:3px;">
          <a href="/sede/${s.codigo}" class="csc-row-name" title="Ver monitoreo operativo de ${s.nombre}">
            <span class="csc-dot ${dotCls}"></span>
            <span>${s.nombre}</span>
          </a>
          <div>${intPill}</div>
        </div>
      `;

      // 2. Modo
      const tdModo = document.createElement("td");
      tdModo.className = "text-center";
      tdModo.innerHTML = `
        <span class="game-card__mode-badge game-card__mode-badge--${esSim ? 'sim' : 'real'}" style="font-size:9.5px;">
          ${esSim ? 'Simulado' : 'Real SQL'}
        </span>
      `;

      // 3. Active Calls
      const tdAc = document.createElement("td");
      tdAc.className = "text-center";
      tdAc.innerHTML = `<strong>${acVal}</strong>`;

      // 4. En Cola
      const tdCola = document.createElement("td");
      tdCola.className = "text-center";
      tdCola.innerHTML = `<span>${colaVal}</span>`;

      // 5. En Atención
      const tdAt = document.createElement("td");
      tdAt.className = "text-center";
      tdAt.innerHTML = `<span>${atencionVal}</span>`;

      // 6. Agentes
      const tdAg = document.createElement("td");
      tdAg.className = "text-center";
      tdAg.innerHTML = `<span style="color: #64748b;">${agentesTotal}</span>`;

      // 7. T. Espera Promedio
      const tdEsp = document.createElement("td");
      tdEsp.className = "text-center";
      tdEsp.innerHTML = `<span>${esperaVal}</span>`;

      // 8. % SLA
      const barColor = slaVal >= 95 ? "sla-progress-bar--green" : (slaVal >= 90 ? "sla-progress-bar--amber" : "sla-progress-bar--red");
      const numColor = slaVal >= 95 ? "sla-pct-num--green" : (slaVal >= 90 ? "sla-pct-num--amber" : "sla-pct-num--red");
      const tdSla = document.createElement("td");
      tdSla.innerHTML = `
        <div class="sla-progress-cell">
          <div class="sla-progress-track">
            <div class="sla-progress-bar ${barColor}" style="width: ${Math.min(100, Math.max(0, slaVal))}%;"></div>
          </div>
          <span class="sla-pct-num ${numColor}">${typeof slaVal === 'number' ? slaVal.toFixed(1) : slaVal}%</span>
        </div>
      `;

      // 9. Acciones
      const tdAcc = document.createElement("td");
      tdAcc.className = "text-center";
      tdAcc.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
          <a href="/sede/${s.codigo}" class="btn btn--subtle btn--sm btn--icon" title="Abrir TV">
            <i class="fa-solid fa-desktop"></i>
          </a>
        </div>
      `;

      tr.append(tdNom, tdModo, tdAc, tdCola, tdAt, tdAg, tdEsp, tdSla, tdAcc);
      tbComp.appendChild(tr);
    });
  }

  // ====================================================================
  // 7. HISTOGRAMA REGIONAL DE DEMANDA
  // ====================================================================
  function renderizarHistogramaRegional(sedes) {
    const svgComp = $("svg-comp-demanda");
    if (!svgComp) return;

    const horasMap = {};
    for (let h = 8; h <= 18; h++) {
      const hh = String(h).padStart(2, "0") + ":00";
      horasMap[hh] = 0;
    }

    sedes.forEach(s => {
      (s.demanda || []).forEach(d => {
        const hKey = String(d.hora || d.intervalo?.substring(0,2) || "").padStart(2, "0") + ":00";
        if (horasMap[hKey] !== undefined) {
          horasMap[hKey] += (d.emitidos || 0);
        }
      });
    });

    const horasDemanda = Object.entries(horasMap).map(([hora, val]) => ({ hora, val }));
    const maxValReal = Math.max(...horasDemanda.map(h => h.val), 0);
    const maxVal = maxValReal > 0 ? (Math.ceil(maxValReal / 20) * 20) : 100;

    let maxHoraKey = null;
    if (maxValReal > 0) {
      const peakItem = horasDemanda.find(h => h.val === maxValReal);
      if (peakItem) maxHoraKey = peakItem.hora;
    }

    const chartW = 960;
    const paddingLeft = 40;
    const paddingRight = 30;
    const baseLineY = 135;
    const maxBarHeight = 100;
    const slotW = (chartW - paddingLeft - paddingRight) / horasDemanda.length;
    const barW = 46;

    let svgHtml = `
      <defs>
        <linearGradient id="comp-grad-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#60a5fa" />
          <stop offset="100%" stop-color="#3b82f6" />
        </linearGradient>
        <linearGradient id="comp-grad-peak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c084fc" />
          <stop offset="100%" stop-color="#9333ea" />
        </linearGradient>
      </defs>
    `;

    [maxVal, Math.round(maxVal / 2), 0].forEach(v => {
      const gy = Math.round(baseLineY - (v / maxVal) * maxBarHeight);
      svgHtml += `
        <line x1="${paddingLeft}" y1="${gy}" x2="${chartW - paddingRight}" y2="${gy}" stroke="#f1f5f9" stroke-width="1.2" />
        <text x="${paddingLeft - 8}" y="${gy + 3.5}" text-anchor="end" font-size="9" font-weight="600" fill="#94a3b8">${v}</text>
      `;
    });

    horasDemanda.forEach((h, i) => {
      const isPeak = (maxHoraKey && h.hora === maxHoraKey && h.val > 0);
      const cx = Math.round(paddingLeft + i * slotW + slotW / 2);
      const bx = Math.round(cx - barW / 2);
      const bH = maxVal > 0 ? Math.round((h.val / maxVal) * maxBarHeight) : 0;
      const by = baseLineY - bH;
      const fill = isPeak ? "url(#comp-grad-peak)" : "url(#comp-grad-blue)";
      const labelColor = isPeak ? "#9333ea" : "#1e293b";
      const valColor = isPeak ? "#9333ea" : "#1e293b";

      const textoValor = (h.val > 0 || isPeak) ? `
        <text x="${cx}" y="${by - 7}" text-anchor="middle" font-size="${isPeak ? '12' : '10.5'}" font-weight="700" fill="${valColor}">${h.val}</text>
      ` : "";

      svgHtml += `
        <g class="comp-bar-group">
          ${textoValor}
          <rect x="${bx}" y="${by}" width="${barW}" height="${bH}" rx="4" fill="${fill}">
            <title>${h.hora}: ${h.val} tickets emitidos</title>
          </rect>
          <text x="${cx}" y="${baseLineY + 16}" text-anchor="middle" font-size="10" font-weight="${isPeak ? '700' : '600'}" fill="${labelColor}">${h.hora}</text>
        </g>
      `;
    });

    svgComp.innerHTML = svgHtml;
  }

  // ====================================================================
  // 8. VISTA 2: MAPA INTERACTIVO DEL PERÚ Y REPORTE PRO
  // ====================================================================
  function renderizarMapaYReportePro() {
    if (!cacheComparativo) return;

    const data = cacheComparativo;
    const sedes = data.sedes || [];
    const intList = data.intendencias || [];
    const selIntCod = $("pro-select-intendencia")?.value || "todas";

    // Filtrar sedes para el reporte según el selector
    let sedesReporte = sedes;
    if (selIntCod !== "todas") {
      sedesReporte = sedes.filter(s => s.intendencia_codigo === selIntCod);
    }

    // 1. Métricas PRO de las Big Cards
    let totAtendidos = 0;
    let totCola = 0;
    let totMenor15 = 0;
    let totEval = 0;
    let sumTa = 0;

    sedesReporte.forEach(s => {
      const r = s.resumen || {};
      const at = r.atendidos_hoy || 0;
      const cola = r.en_cola || 0;
      const sla = r.pct_espera_15m ?? 100;
      const taSeg = r.ta_prom_segundos || 0;

      totAtendidos += at;
      totCola += cola;
      const ev = at + cola;
      if (ev > 0) {
        totEval += ev;
        totMenor15 += (sla / 100) * ev;
      }
      if (at > 0 && taSeg > 0) sumTa += (at * taSeg);
    });

    const slaFinal = totEval > 0 ? (totMenor15 / totEval * 100).toFixed(1) : "100.0";
    const taFinalSeg = totAtendidos > 0 ? Math.round(sumTa / totAtendidos) : 420;
    const taFinalMin = `${String(Math.floor(taFinalSeg / 60)).padStart(2, '0')}:${String(taFinalSeg % 60).padStart(2, '0')}`;

    if ($("pro-sla-val")) $("pro-sla-val").textContent = `${slaFinal}%`;
    if ($("pro-atendidos-val")) $("pro-atendidos-val").textContent = totAtendidos;
    if ($("pro-ta-val")) $("pro-ta-val").textContent = taFinalMin;

    // 2. Podio Gamificado (Ranking de Eficiencia)
    renderizarPodioGamificado(sedesReporte);

    // 3. Gráficos PRO
    renderizarGraficoProSla(sedesReporte);
    renderizarGraficoProTramites(sedesReporte);

    // 4. Actualizar Mapa Leaflet y Telemetría Lateral
    inicializarLeafletMapa();
    actualizarMarcadoresSedes();
    actualizarSideTelemetry(selIntCod === "todas" ? "iti_junin" : selIntCod);
  }

  function renderizarPodioGamificado(sedes) {
    if (!sedes || sedes.length === 0) return;

    // Ordenar de mayor % SLA y menor tiempo
    const ranked = [...sedes].sort((a, b) => {
      const slaA = a.resumen?.pct_espera_15m ?? 100;
      const slaB = b.resumen?.pct_espera_15m ?? 100;
      if (slaB !== slaA) return slaB - slaA;
      return (b.resumen?.atendidos_hoy || 0) - (a.resumen?.atendidos_hoy || 0);
    });

    const p1 = ranked[0];
    const p2 = ranked[1] || ranked[0];
    const p3 = ranked[2] || ranked[1] || ranked[0];

    if ($("podio-1-name")) $("podio-1-name").textContent = p1.nombre;
    if ($("podio-1-int")) $("podio-1-int").textContent = p1.intendencia_siglas || "ITI";
    if ($("podio-1-score")) $("podio-1-score").textContent = `${p1.resumen?.pct_espera_15m ?? 100}% SLA • ${p1.resumen?.espera_prom || '00:00'}`;

    if ($("podio-2-name")) $("podio-2-name").textContent = p2.nombre;
    if ($("podio-2-int")) $("podio-2-int").textContent = p2.intendencia_siglas || "ITI";
    if ($("podio-2-score")) $("podio-2-score").textContent = `${p2.resumen?.pct_espera_15m ?? 100}% SLA • ${p2.resumen?.espera_prom || '00:00'}`;

    if ($("podio-3-name")) $("podio-3-name").textContent = p3.nombre;
    if ($("podio-3-int")) $("podio-3-int").textContent = p3.intendencia_siglas || "ITI";
    if ($("podio-3-score")) $("podio-3-score").textContent = `${p3.resumen?.pct_espera_15m ?? 100}% SLA • ${p3.resumen?.espera_prom || '00:00'}`;
  }

  function renderizarGraficoProSla(sedes) {
    const svg = $("svg-pro-sla");
    if (!svg) return;

    const chartW = 460;
    const chartH = 220;
    const paddingLeft = 100;
    const paddingRight = 45;
    const paddingTop = 15;
    const maxBarW = chartW - paddingLeft - paddingRight;

    // Tomar hasta 6 sedes para legibilidad
    const sample = sedes.slice(0, 6);
    const rowH = Math.floor((chartH - paddingTop - 20) / Math.max(1, sample.length));

    let html = `
      <defs>
        <linearGradient id="pro-bar-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>
    `;

    // Línea meta al 90%
    const metaX = paddingLeft + (0.90 * maxBarW);
    html += `
      <line x1="${metaX}" y1="${paddingTop}" x2="${metaX}" y2="${chartH - 10}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="3 3" />
      <text x="${metaX}" y="${paddingTop - 3}" font-size="9" font-weight="700" fill="#dc2626" text-anchor="middle">Meta 90%</text>
    `;

    sample.forEach((s, idx) => {
      const y = paddingTop + idx * rowH;
      const nom = s.nombre.replace("CSC ", "").substring(0, 11);
      const sla = s.resumen?.pct_espera_15m ?? 100;
      const bW = Math.round((Math.min(100, Math.max(0, sla)) / 100) * maxBarW);
      const color = sla >= 90 ? "url(#pro-bar-grad)" : (sla >= 80 ? "#f59e0b" : "#ef4444");

      html += `
        <text x="${paddingLeft - 8}" y="${y + rowH/2 + 3}" font-size="10.5" font-weight="600" fill="#334155" text-anchor="end">${nom}</text>
        <rect x="${paddingLeft}" y="${y + 4}" width="${bW}" height="${rowH - 8}" rx="4" fill="${color}" />
        <text x="${paddingLeft + bW + 6}" y="${y + rowH/2 + 3}" font-size="10.5" font-weight="700" fill="#0f172a">${typeof sla === 'number' ? sla.toFixed(1) : sla}%</text>
      `;
    });

    svg.innerHTML = html;
  }

  function renderizarGraficoProTramites(sedes) {
    const svg = $("svg-pro-tramites");
    if (!svg) return;

    const totales = { "Orientación": 0, "Trámite": 0, "Mesa de Partes": 0, "Cabinas": 0 };
    sedes.forEach(s => {
      const serv = s.servicios || {};
      Object.keys(totales).forEach(k => {
        totales[k] += (serv[k] || 0);
      });
    });

    const entries = Object.entries(totales);
    const maxVal = Math.max(...entries.map(e => e[1]), 10);
    const chartW = 460;
    const paddingLeft = 30;
    const baseLineY = 165;
    const maxBarH = 120;
    const step = (chartW - 60) / entries.length;
    const barW = 44;
    const colors = ["#2563eb", "#059669", "#d97706", "#7c3aed"];

    let html = "";
    entries.forEach(([cat, val], idx) => {
      const cx = paddingLeft + idx * step + step / 2;
      const bx = cx - barW / 2;
      const bH = Math.round((val / maxVal) * maxBarH);
      const by = baseLineY - bH;
      const col = colors[idx % colors.length];

      html += `
        <rect x="${bx}" y="${by}" width="${barW}" height="${bH}" rx="5" fill="${col}" opacity="0.9" />
        <text x="${cx}" y="${by - 6}" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">${val}</text>
        <text x="${cx}" y="${baseLineY + 16}" font-size="10" font-weight="600" fill="#475569" text-anchor="middle">${cat.replace("Mesa de Partes", "Mesa Partes")}</text>
      `;
    });

    svg.innerHTML = html;
  }

  // ====================================================================
  // ====================================================================
  // 8. VISTA 2: MAPA TERRITORIAL OFICIAL SUNAT (21 ITIs & 94 CSCs)
  // Basado fielmente en: C:\Users\alets\OneDrive\Escritorio\PERU
  // ====================================================================
  let leafletMap = null;
  let capaPins = null;
  let capaProvs = null;
  let capaITI = null;
  let capaJurisdiccion = null;
  let capaDeps = null;
  let depActual = null;
  let intendenciaSeleccionadaMapa = "todas";
  const hoverITI = new Map();
  let capaHover = null, hoverActual = null, hoverTimer = null;

  const TILDES_PERU = { 
    Junin: 'Junín', Ancash: 'Áncash', Apurimac: 'Apurímac', Huanuco: 'Huánuco', Martin: 'Martín', Concepcion: 'Concepción',
    Convencion: 'Convención', Huaytara: 'Huaytará', Sanchez: 'Sánchez', Carrion: 'Carrión', Caceres: 'Cáceres', Ramon: 'Ramón',
    Marañon: 'Marañón', Julcan: 'Julcán', Chimu: 'Chimú', Viru: 'Virú', Jaen: 'Jaén', Rodriguez: 'Rodríguez', Maria: 'María',
    Asuncion: 'Asunción', Fermin: 'Fermín', Huarochiri: 'Huarochirí', Oyon: 'Oyón', Victor: 'Víctor', Huaman: 'Huamán',
    Camana: 'Camaná', Union: 'Unión', Huancane: 'Huancané', Roman: 'Román', Azangaro: 'Azángaro', Chepen: 'Chepén',
    Bolivar: 'Bolívar', Morropon: 'Morropón', Contumaza: 'Contumazá', Celendin: 'Celendín', Huamalies: 'Huamalíes',
    Lamas: 'Lamas', Nazca: 'Nasca', Fajardo: 'Fajardo', Cañete: 'Cañete', Perez: 'Pérez', Mendoza: 'Mendoza' 
  };
  const tituloPeru = s => s ? s.toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase()).replace(/\S+/g, w => TILDES_PERU[w] || w) : '';
  const normPeru = s => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() : '';

  const centroPeruCoords = [[-18.5, -81.5], [0.1, -68.5]];
  const AZUL_PERU = '#0163ac', GRANATE_PERU = '#ae0d41';
  const cortoIti = i => (i?.nombre || '').replace('Intendencia de Tributos Internos', 'ITI').replace('Intendencia Regional', 'ITI');
  const tipHtml = (a, b, c) => `<div class="tip-t">${a}</div>${b ? `<div class="tip-s">${b}</div>` : ''}${c ? `<div class="tip-x">${c}</div>` : ''}`;
  const TIP_OPTS = { sticky: true, className: 'tip', direction: 'top', offset: [0, -10], opacity: 1 };

  const getIntendenciasData = () => (typeof INTENDENCIAS !== "undefined" ? INTENDENCIAS : []);
  const getProvinciasData = () => (typeof PROVINCIAS !== "undefined" ? PROVINCIAS : null);
  const getDepartamentosData = () => (typeof DEPARTAMENTOS !== "undefined" ? DEPARTAMENTOS : null);

  const enJurisdiccion = (j, prov) => j.provincias === '*' ? !(j.excepto || []).includes(normPeru(prov)) : (j.provincias || []).includes(normPeru(prov));
  const intendenciaDeProv = (dep, prov) => getIntendenciasData().find(i => (i.jurisdiccion || []).some(j =>
    normPeru(j.departamento) === normPeru(dep) && enJurisdiccion(j, prov)));

  const oficinasDe = (dep, prov) => {
    const list = [];
    getIntendenciasData().forEach(i => {
      (i.oficinas || []).forEach(o => {
        if (normPeru(o.departamento) === normPeru(dep) && (!prov || normPeru(o.provincia) === normPeru(prov))) {
          list.push({ ...o, intendencia: i });
        }
      });
    });
    return list;
  };

  function contornos(features, ancho, colorRelleno) {
    const grupos = new Map();
    (features || []).forEach(f => {
      const i = intendenciaDeProv(f.properties.FIRST_NOMB, f.properties.NOMBPROV);
      if (i) {
        if (!grupos.has(i)) grupos.set(i, []);
        grupos.get(i).push(f);
      }
    });
    const out = [];
    grupos.forEach(fs => {
      try {
        if (typeof turf !== "undefined" && turf.union) {
          out.push(fs.length === 1 ? fs[0] : fs.reduce((a, b) => turf.union(a, b)));
        } else {
          out.push(...fs);
        }
      } catch (e) {
        out.push(...fs);
      }
    });
    const sinHuecos = f => {
      const g = f.geometry;
      if (!g) return f;
      if (g.type === 'Polygon') return { ...f, geometry: { type: 'Polygon', coordinates: [g.coordinates[0]] } };
      if (g.type === 'MultiPolygon') return { ...f, geometry: { type: 'MultiPolygon', coordinates: g.coordinates.map(p => [p[0]]) } };
      return f;
    };
    const limpios = out.map(sinHuecos);
    const capa = L.geoJSON(limpios, { pane: 'contornoITI', interactive: false, style: { color: '#ffffff', weight: ancho, fill: false } });
    capa.relleno = L.geoJSON(limpios, { interactive: false, style: { stroke: false, fillColor: colorRelleno, fillOpacity: 0.95 } });
    return capa;
  }

  function quitarHover(inmediato) {
    clearTimeout(hoverTimer);
    const salir = () => {
      if (!capaHover) return;
      const c = capaHover;
      capaHover = null;
      hoverActual = null;
      c.setStyle({ fillOpacity: 0, opacity: 0, weight: 2 });
      setTimeout(() => { if (leafletMap && leafletMap.hasLayer(c)) leafletMap.removeLayer(c); }, 380);
    };
    if (inmediato) salir(); else hoverTimer = setTimeout(salir, 70);
  }

  function ponerHover(i) {
    clearTimeout(hoverTimer);
    if (hoverActual === i && capaHover) return;
    quitarHover(true);
    const provs = getProvinciasData();
    if (!provs) return;
    if (!hoverITI.has(i)) {
      const fs = provs.features.filter(f => intendenciaDeProv(f.properties.FIRST_NOMB, f.properties.NOMBPROV) === i);
      hoverITI.set(i, contornos(fs, 1, GRANATE_PERU).toGeoJSON());
    }
    const capa = capaHover = L.geoJSON(hoverITI.get(i), {
      pane: 'contornoITI', interactive: false,
      style: { className: 'iti-hover', color: '#ffffff', weight: 2, opacity: 0, fillColor: GRANATE_PERU, fillOpacity: 0, lineJoin: 'round' }
    }).addTo(leafletMap);
    hoverActual = i;
    setTimeout(() => { if (capa) capa.setStyle({ weight: 3.5, opacity: 1, fillOpacity: 0.93 }); }, 20);
  }

  function ponerPin(latlng, texto, sub, ofi) {
    const gota = '<svg width="24" height="32" viewBox="0 0 24 32" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))">'
      + '<path d="M12 31C12 31 2 19 2 11a10 10 0 1 1 20 0c0 8-10 20-10 20z" fill="#ffd23f" stroke="#ffffff" stroke-width="2"/>'
      + '<circle cx="12" cy="11" r="3.6" fill="#7a5a00"/></svg>';
    const retardo = 150 + (capaPins ? capaPins.getLayers().length * 35 : 0);
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: '',
        html: `<div class="pin-in" style="animation-delay:${retardo}ms">${gota}</div>`,
        iconSize: [24, 32],
        iconAnchor: [12, 31],
        tooltipAnchor: [0, -30]
      })
    }).bindTooltip(tipHtml(texto, sub, 'CSC · SUNAT'), TIP_OPTS);

    if (ofi) {
      marker.bindPopup(`
        <div class="leaflet-custom-popup">
          <div class="popup-title">${ofi.nombre}</div>
          <div class="popup-sub">${ofi.tipo || 'CSC'} &bull; ${ofi.departamento} (${ofi.provincia})</div>
          <div style="font-size:11.5px; color:#475569; margin: 6px 0;">
            <i class="fa-solid fa-location-dot" style="color:#0163ac;"></i> ${ofi.direccion || 'Dirección registrada'}
          </div>
          ${ofi.horario ? `<div style="font-size:11px; color:#64748b; margin-bottom:8px;"><i class="fa-regular fa-clock"></i> ${ofi.horario}</div>` : ''}
          <a href="/intendencia/${ofi.intendencia?.codigo || 'iti_lima'}" class="popup-btn-link">
            <i class="fa-solid fa-landmark"></i> Ver Intendencia
          </a>
        </div>
      `, { maxWidth: 280 });
    }

    if (capaPins) marker.addTo(capaPins);
    return marker;
  }

  function vistaPais() {
    depActual = null;
    if (capaProvs) capaProvs.clearLayers();
    if (capaPins) capaPins.clearLayers();
    if (capaDeps) capaDeps.eachLayer(l => capaDeps.resetStyle(l));
    if (capaITI?.relleno && !leafletMap.hasLayer(capaITI.relleno)) capaITI.relleno.addTo(leafletMap);
    if (capaJurisdiccion && !leafletMap.hasLayer(capaJurisdiccion)) capaJurisdiccion.addTo(leafletMap);
    if (capaITI && !leafletMap.hasLayer(capaITI)) capaITI.addTo(leafletMap);
    if (capaPins && !leafletMap.hasLayer(capaPins)) capaPins.addTo(leafletMap);
    leafletMap.fitBounds(centroPeruCoords, { animate: true, duration: 0.55 });
    actualizarSideTelemetry("todas");
    if ($("select-iti-mapa-quick")) $("select-iti-mapa-quick").value = "todas";
    if ($("drawer-toggle-badge")) $("drawer-toggle-badge").textContent = "Nacional";
  }

  function seleccionarIntendencia(i) {
    if (!i) return;
    depActual = 'ITI';
    if (capaProvs) capaProvs.clearLayers();
    if (capaPins) capaPins.clearLayers();
    if (capaJurisdiccion && leafletMap.hasLayer(capaJurisdiccion)) leafletMap.removeLayer(capaJurisdiccion);
    if (capaITI && leafletMap.hasLayer(capaITI)) leafletMap.removeLayer(capaITI);
    if (capaITI?.relleno && leafletMap.hasLayer(capaITI.relleno)) leafletMap.removeLayer(capaITI.relleno);
    if (capaDeps) capaDeps.eachLayer(l => l.setStyle({ fillOpacity: 0.35 }));

    const provs = getProvinciasData();
    if (!provs) return;
    const feats = provs.features.filter(f => intendenciaDeProv(f.properties.FIRST_NOMB, f.properties.NOMBPROV) === i);
    const cont = contornos(feats, 3, GRANATE_PERU);
    cont.relleno.addTo(capaProvs);

    const geo = L.geoJSON(provs, {
      filter: f => intendenciaDeProv(f.properties.FIRST_NOMB, f.properties.NOMBPROV) === i,
      style: () => ({ color: '#ffffff', weight: 0.6, opacity: 0.8, fillColor: GRANATE_PERU, fillOpacity: 0.95 }),
      onEachFeature: (f, l) => {
        const p = f.properties;
        l.bindTooltip(tipHtml(tituloPeru(p.NOMBPROV), tituloPeru(p.FIRST_NOMB), 'Provincia · clic para enfocar'), TIP_OPTS);
        l.on('click', () => {
          leafletMap.fitBounds(l.getBounds(), { padding: [40, 40], animate: true });
        });
      }
    }).addTo(capaProvs);

    cont.addTo(capaProvs);

    // Pines de todas las oficinas de la ITI con dispersión en provincias con múltiples locales
    geo.eachLayer(l => {
      const p = l.feature.properties;
      const ofis = oficinasDe(p.FIRST_NOMB, p.NOMBPROV);
      ofis.forEach((o, idx) => {
        let center = l.getBounds().getCenter();
        if (idx > 0) {
          center = [center.lat + (idx * 0.04 - 0.02), center.lng + (idx * 0.04 - 0.02)];
        }
        ponerPin(center, o.nombre, o.direccion, o);
      });
    });

    leafletMap.fitBounds(geo.getBounds(), { padding: [35, 35], animate: true });
    intendenciaSeleccionadaMapa = i.codigo || "todas";
    actualizarSideTelemetry(i.codigo || "todas");
    abrirSlidebar(i.codigo || "todas");
    if ($("select-iti-mapa-quick")) $("select-iti-mapa-quick").value = i.codigo || "todas";
  }

  function inicializarLeafletMapa() {
    if (leafletMap || typeof L === "undefined") return;
    const mapContainer = $("mapa-peru-leaflet");
    if (!mapContainer) return;

    try {
      leafletMap = L.map("mapa-peru-leaflet", {
        zoomSnap: 0.25,
        minZoom: 4,
        maxZoom: 14,
        zoomControl: true,
        attributionControl: false
      });

      leafletMap.createPane('contornoITI').style.zIndex = 460;
      leafletMap.getPane('contornoITI').style.pointerEvents = 'none';

      leafletMap.createPane('limitesDep').style.zIndex = 450;
      leafletMap.getPane('limitesDep').style.pointerEvents = 'none';

      leafletMap.fitBounds(centroPeruCoords);

      capaPins = L.layerGroup().addTo(leafletMap);
      capaProvs = L.layerGroup().addTo(leafletMap);

      const provs = getProvinciasData();
      const deps = getDepartamentosData();

      if (provs && deps) {
        // Capa nacional de las 21 ITIs
        capaITI = contornos(provs.features.filter(f => !!intendenciaDeProv(f.properties.FIRST_NOMB, f.properties.NOMBPROV)), 2.2, AZUL_PERU);
        capaJurisdiccion = L.geoJSON(provs, {
          filter: f => !!intendenciaDeProv(f.properties.FIRST_NOMB, f.properties.NOMBPROV),
          style: () => ({ color: '#ffffff', weight: 0.5, opacity: 0.55, fillColor: AZUL_PERU, fillOpacity: 0.95 }),
          onEachFeature: (f, l) => {
            const p = f.properties;
            const i = intendenciaDeProv(p.FIRST_NOMB, p.NOMBPROV);
            if (i) {
              l.bindTooltip(tipHtml(cortoIti(i), 'Provincia de ' + tituloPeru(p.NOMBPROV) + ' · ' + tituloPeru(p.FIRST_NOMB), (i.oficinas || []).length + ' CSC en la ITI'), TIP_OPTS);
              l.on({
                mouseover: () => ponerHover(i),
                mouseout: () => quitarHover(),
                click: () => { quitarHover(true); seleccionarIntendencia(i); }
              });
            }
          }
        });

        capaDeps = L.geoJSON(deps, {
          style: () => ({ color: '#ffffff', weight: 1.2, fillColor: AZUL_PERU, fillOpacity: 0.95 }),
          onEachFeature: (f, l) => {
            l.bindTooltip(tipHtml(tituloPeru(f.properties.NOMBDEP), '', 'Departamento'), TIP_OPTS);
          }
        }).addTo(leafletMap);

        // Límites departamentales en línea de guiones
        (function () {
          const clave = c => c[0].toFixed(5) + ',' + c[1].toFixed(5);
          const arista = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
          const polis = f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
          const depsMap = new Map();
          provs.features.forEach(f => polis(f).forEach(p => p.forEach(anillo => {
            for (let k = 0; k < anillo.length - 1; k++) {
              const e = arista(clave(anillo[k]), clave(anillo[k + 1]));
              if (!depsMap.has(e)) depsMap.set(e, new Set());
              depsMap.get(e).add(f.properties.FIRST_NOMB);
            }
          })));
          const dibujadas = new Set(), lineas = [];
          provs.features.forEach(f => polis(f).forEach(p => p.forEach(anillo => {
            let tramo = [];
            const cerrar = () => { if (tramo.length > 1) lineas.push(tramo); tramo = []; };
            for (let k = 0; k < anillo.length - 1; k++) {
              const e = arista(clave(anillo[k]), clave(anillo[k + 1]));
              if (depsMap.get(e).size < 2 || dibujadas.has(e)) { cerrar(); continue; }
              dibujadas.add(e);
              if (!tramo.length) tramo.push([anillo[k][1], anillo[k][0]]);
              tramo.push([anillo[k + 1][1], anillo[k + 1][0]]);
            }
            cerrar();
          })));
          L.polyline(lineas, {
            pane: 'limitesDep', interactive: false,
            color: '#c3cad4', weight: 2, opacity: 0.9, dashArray: '9 7', lineCap: 'butt', fill: false
          }).addTo(leafletMap);
        })();

        vistaPais();
      }

      // Eventos de Navegación y Enfoque
      $("btn-focus-peru")?.addEventListener("click", () => {
        playPop();
        vistaPais();
      });

      $("select-iti-mapa-quick")?.addEventListener("change", (e) => {
        playPop();
        const cod = e.target.value;
        if (cod === "todas") {
          vistaPais();
        } else {
          const iti = getIntendenciasData().find(x => x.codigo === cod);
          if (iti) seleccionarIntendencia(iti);
        }
      });

      $("btn-volver-dashboard-mapa")?.addEventListener("click", () => {
        playPop();
        activarSegmentoVista("cards");
      });

    } catch (e) {
      console.warn("Error al inicializar Leaflet:", e);
    }
  }

  function actualizarSideTelemetry(intCod) {
    if (!cacheComparativo) return;
    const data = cacheComparativo;
    const itisLive = data.intendencias || [];
    const sedesLive = data.sedes || [];
    const intsCatalog = getIntendenciasData();

    const isNacional = (!intCod || intCod === "todas");

    if (isNacional) {
      const tot = data.totales_regionales || {};
      const slaTot = tot.pct_espera_15m ?? 95.0;
      const atTot = tot.atendidos_hoy || 0;
      const colTot = tot.en_cola || 0;
      const espTot = tot.ta_prom || '07:00';

      if ($("side-telemetry-badge")) $("side-telemetry-badge").textContent = "RED NACIONAL";
      if ($("side-telemetry-name")) $("side-telemetry-name").textContent = "Monitoreo Nacional SUNAT (21 ITIs)";
      if ($("drawer-toggle-badge")) $("drawer-toggle-badge").textContent = "Nacional";

      if ($("side-kpi-sla")) $("side-kpi-sla").textContent = `${typeof slaTot === "number" ? slaTot.toFixed(1) : slaTot}%`;
      if ($("side-kpi-atendidos")) $("side-kpi-atendidos").textContent = atTot.toLocaleString();
      if ($("side-kpi-espera")) $("side-kpi-espera").textContent = colTot.toLocaleString();
      if ($("side-kpi-tiempo")) $("side-kpi-tiempo").textContent = espTot;

      if ($("side-sedes-count")) $("side-sedes-count").textContent = "21 ITIs";

      const listWrap = $("side-sedes-items");
      if (listWrap) {
        listWrap.innerHTML = "";
        intsCatalog.forEach(i => {
          const itiLive = itisLive.find(x => x.codigo === i.codigo) || {};
          const totI = itiLive.totales || {};
          const sla = totI.pct_espera_15m ?? (i.indicadores?.sla ?? 95.0);
          const slaNum = typeof sla === "number" ? sla.toFixed(1) : parseFloat(sla).toFixed(1);
          const slaClass = sla >= 90 ? "background:#dcfce7; color:#15803d;" : "background:#fef3c7; color:#b45309;";

          const row = document.createElement("div");
          row.className = "side-sede-row";
          row.style.cursor = "pointer";
          row.innerHTML = `
            <div class="side-sede-name-col">
              <span class="side-sede-name">${cortoIti(i)}</span>
              <span class="side-sede-status">${(i.oficinas || []).length} CSCs &bull; ${totI.en_cola || 0} en cola</span>
            </div>
            <span class="side-sede-badge-sla" style="${slaClass}">${slaNum}% SLA</span>
          `;
          row.addEventListener("click", () => {
            playPop();
            seleccionarIntendencia(i);
          });
          listWrap.appendChild(row);
        });
      }
      return;
    }

    // Caso: ITI específica
    const itiInfo = intsCatalog.find(i => i.codigo === intCod) || { nombre: "Intendencia", codigo: intCod, oficinas: [] };
    const itiLive = itisLive.find(i => i.codigo === intCod) || {};
    const totI = itiLive.totales || {};

    const sla = totI.pct_espera_15m ?? (itiInfo.indicadores?.sla ?? 95.0);
    const slaNum = typeof sla === "number" ? sla.toFixed(1) : parseFloat(sla).toFixed(1);
    const at = totI.atendidos_hoy ?? (itiInfo.indicadores?.atendidos ?? 0);
    const cola = totI.en_cola ?? (itiInfo.indicadores?.enEspera ?? 0);
    const esp = totI.ta_prom ?? (itiInfo.indicadores?.esperaProm ?? '07:00');

    if ($("side-telemetry-badge")) $("side-telemetry-badge").textContent = itiLive.siglas || "ITI";
    if ($("side-telemetry-name")) $("side-telemetry-name").textContent = itiInfo.nombre;
    if ($("drawer-toggle-badge")) $("drawer-toggle-badge").textContent = cortoIti(itiInfo);

    if ($("side-kpi-sla")) $("side-kpi-sla").textContent = `${slaNum}%`;
    if ($("side-kpi-atendidos")) $("side-kpi-atendidos").textContent = at.toLocaleString();
    if ($("side-kpi-espera")) $("side-kpi-espera").textContent = cola.toLocaleString();
    if ($("side-kpi-tiempo")) $("side-kpi-tiempo").textContent = esp;

    const oficinas = itiInfo.oficinas || [];
    if ($("side-sedes-count")) $("side-sedes-count").textContent = oficinas.length;

    const listWrap = $("side-sedes-items");
    if (listWrap) {
      listWrap.innerHTML = "";
      oficinas.forEach(o => {
        const row = document.createElement("div");
        row.className = "side-sede-row";
        row.innerHTML = `
          <div class="side-sede-name-col">
            <span class="side-sede-name">${o.nombre}</span>
            <span class="side-sede-status"><i class="fa-solid fa-location-dot" style="color:#0163ac;"></i> ${o.direccion || o.provincia}</span>
            ${o.horario ? `<span class="side-sede-status" style="font-size:10px; color:#64748b;"><i class="fa-regular fa-clock"></i> ${o.horario}</span>` : ''}
          </div>
          <span class="side-sede-badge-sla" style="background:#e0f2fe; color:#0369a1;">${o.tipo || 'CSC'}</span>
        `;
        row.addEventListener("click", () => {
          playPop();
          if (capaPins) {
            capaPins.eachLayer(m => {
              const tooltip = m.getTooltip();
              if (tooltip && tooltip.getContent().includes(o.nombre)) {
                leafletMap.setView(m.getLatLng(), 12, { animate: true });
                m.openPopup();
              }
            });
          }
        });
        listWrap.appendChild(row);
      });
    }
  }

  // Impresión PDF del Reporte PRO
  const btnPrintPro = $("btn-imprimir-reporte-pro");
  if (btnPrintPro) {
    btnPrintPro.addEventListener("click", () => {
      playChime();
      const pFecha = $("print-fecha-hora");
      if (pFecha) pFecha.textContent = new Date().toLocaleString("es-PE");
      window.print();
    });
  }

  // Exportar CSV del Reporte PRO
  const btnCsvPro = $("btn-exportar-csv-pro");
  if (btnCsvPro) {
    btnCsvPro.addEventListener("click", () => {
      if (!cacheComparativo || !cacheComparativo.sedes) return;
      playChime();
      const cabeceras = ["Intendencia", "Centro de Servicios", "Modo", "Llamadas Activas", "En Cola", "En Atencion", "Total Atendidos", "Espera Promedio", "TA Promedio", "% SLA 15m"];
      const filas = [cabeceras.join(";")];

      cacheComparativo.sedes.forEach(s => {
        const r = s.resumen || {};
        filas.push([
          `"${s.intendencia_nombre || s.intendencia_codigo}"`,
          `"${s.nombre}"`,
          s.es_simulado ? "Simulado" : "Real SQL",
          (r.en_cola || 0) + (r.en_atencion || 0),
          r.en_cola || 0,
          r.en_atencion || 0,
          r.atendidos_hoy || 0,
          `"${r.espera_prom || '00:00'}"`,
          `"${r.ta_prom || '00:00'}"`,
          `"${r.pct_espera_15m || 100}%"`,
        ].join(";"));
      });

      const blob = new Blob(["\uFEFF" + filas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SITRA_Reporte_Multirregional_${new Date().toISOString().substring(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      mostrarToast("✓ Reporte PRO exportado exitosamente en CSV");
    });
  }

  // ====================================================================
  // 9. MODAL CRUD DE CONEXIONES E INTENDENCIAS
  // ====================================================================
  const modalCrudBackdrop = $("modal-crud-conexiones-backdrop");
  const btnAbrirCrud = $("btn-abrir-crud-conexiones");
  const btnCerrarCrud = $("btn-cerrar-modal-crud-conn");

  function abrirModalCrud() {
    playBloop();
    if (modalCrudBackdrop) {
      modalCrudBackdrop.hidden = false;
      cargarTablaCrudSedes();
      cargarTablaCrudIntendencias();
    }
  }

  function cerrarModalCrud() {
    if (modalCrudBackdrop) modalCrudBackdrop.hidden = true;
  }

  if (btnAbrirCrud) btnAbrirCrud.addEventListener("click", abrirModalCrud);
  if (btnCerrarCrud) btnCerrarCrud.addEventListener("click", cerrarModalCrud);

  // Tabs internas del Modal CRUD
  document.querySelectorAll(".crud-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      playPop();
      document.querySelectorAll(".crud-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".crud-tab-panel").forEach(p => p.style.display = "none");
      btn.classList.add("active");
      const targetId = btn.dataset.crudTab;
      if ($(targetId)) $(targetId).style.display = "block";
    });
  });

  async function cargarTablaCrudSedes() {
    const tb = $("tb-crud-sedes-body");
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="7" class="empty-state">Consultando sedes configuradas...</td></tr>';

    try {
      const res = await fetch("/api/sedes");
      const data = await res.json();
      const sedes = data.sedes || [];
      if ($("crud-count-sedes-tab")) $("crud-count-sedes-tab").textContent = sedes.length;

      tb.innerHTML = "";
      sedes.forEach(s => {
        const tr = document.createElement("tr");
        const esSim = Boolean(s.es_simulado);
        tr.innerHTML = `
          <td><strong>${s.nombre}</strong><br><span style="font-size:10px; color:#64748b;">${s.codigo}</span></td>
          <td><span style="font-size:11px; font-weight:700; color:#0163ac;">${s.intendencia_siglas || s.intendencia_codigo}</span></td>
          <td>${s.host}<br><span style="font-size:10px; color:#64748b;">${s.instancia || 'SQLEXPRESS'}</span></td>
          <td>${s.puerto || 1433}<br><span style="font-size:10px; color:#64748b;">${s.base_datos || 'bdtvmediasunat'}</span></td>
          <td class="text-center">
            <button type="button" class="btn btn--subtle btn--sm btn-toggle-modo-crud" data-codigo="${s.codigo}" title="Clic para alternar modo">
              <i class="fa-solid ${esSim ? 'fa-gamepad' : 'fa-database'}"></i>
              <span>${esSim ? 'Simulado' : 'Real'}</span>
            </button>
          </td>
          <td class="text-center">
            <button type="button" class="btn-test-ping btn-ping-crud" data-codigo="${s.codigo}">
              <i class="fa-solid fa-bolt"></i> Test
            </button>
          </td>
          <td class="text-right">
            <button type="button" class="btn btn--subtle btn--sm btn-eliminar-sede-crud" data-codigo="${s.codigo}" style="color:#dc2626;" title="Eliminar sede">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        `;

        // Test ping en CRUD
        const btnP = tr.querySelector(".btn-ping-crud");
        if (btnP) {
          btnP.addEventListener("click", async () => {
            btnP.disabled = true;
            btnP.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
            try {
              const resp = await fetch(`/api/sedes/${s.codigo}/test-conexion`, { method: "POST" });
              const rData = await resp.json();
              if (rData.ok) {
                playChime();
                btnP.outerHTML = `<span class="badge-test-result badge-test-result--ok">✓ ${rData.latencia_ms}ms</span>`;
              } else {
                playWarning();
                btnP.outerHTML = `<span class="badge-test-result badge-test-result--error" title="${rData.mensaje || ''}">✗ Timeout</span>`;
              }
            } catch (e) {
              btnP.disabled = false;
              btnP.textContent = "Error";
            }
          });
        }

        // Toggle modo en CRUD
        const btnM = tr.querySelector(".btn-toggle-modo-crud");
        if (btnM) {
          btnM.addEventListener("click", async () => {
            playPop();
            try {
              await fetch(`/api/sedes/${s.codigo}/toggle-modo`, { method: "POST" });
              cargarTablaCrudSedes();
              cargarDatosComparativos();
            } catch (e) {
              mostrarToast("Error al alternar modo");
            }
          });
        }

        // Eliminar sede en CRUD
        const btnDel = tr.querySelector(".btn-eliminar-sede-crud");
        if (btnDel) {
          btnDel.addEventListener("click", async () => {
            if (!confirm(`¿Desea eliminar la sede ${s.nombre} (${s.codigo})?`)) return;
            playWarning();
            try {
              const resp = await fetch(`/api/sedes/${s.codigo}`, { method: "DELETE" });
              if (resp.ok) {
                mostrarToast(`✓ Sede ${s.nombre} eliminada`);
                cargarTablaCrudSedes();
                cargarDatosComparativos();
              }
            } catch (e) {
              mostrarToast("Error al eliminar sede");
            }
          });
        }

        tb.appendChild(tr);
      });
    } catch (e) {
      tb.innerHTML = '<tr><td colspan="7" class="empty-state">Error al cargar sedes</td></tr>';
    }
  }

  async function cargarTablaCrudIntendencias() {
    const tb = $("tb-crud-intendencias-body");
    if (!tb) return;

    try {
      const res = await fetch("/api/intendencias");
      const data = await res.json();
      const ints = data.intendencias || [];
      tb.innerHTML = "";
      ints.forEach(i => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><code>${i.codigo}</code></td>
          <td><strong>${i.nombre}</strong></td>
          <td><span style="font-weight:700; color:${i.color || '#0163ac'}">${i.siglas}</span></td>
          <td>${i.region}</td>
          <td><span class="game-card__mode-badge game-card__mode-badge--${i.tipo_conexion === 'real' ? 'real' : 'sim'}">${i.tipo_conexion.toUpperCase()}</span></td>
          <td class="text-center"><strong>${i.total_sedes || 0}</strong> sedes</td>
        `;
        tb.appendChild(tr);
      });
    } catch (e) {
      tb.innerHTML = '<tr><td colspan="6" class="empty-state">Error al cargar intendencias</td></tr>';
    }
  }

  // Formulario para registrar nueva sede
  const formCrearSede = $("form-crear-sede");
  if (formCrearSede) {
    formCrearSede.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        codigo: $("sede-new-codigo")?.value,
        nombre: $("sede-new-nombre")?.value,
        intendencia_codigo: $("sede-new-intendencia")?.value,
        host: $("sede-new-host")?.value,
        puerto: parseInt($("sede-new-puerto")?.value || 1433),
        instancia: $("sede-new-instancia")?.value,
        base_datos: $("sede-new-bd")?.value,
        usuario: $("sede-new-usuario")?.value,
        clave: $("sede-new-clave")?.value,
        es_simulado: parseInt($("sede-new-modo")?.value || 0),
      };

      try {
        const res = await fetch("/api/sedes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Error al crear sede");
        }
        playChime();
        mostrarToast(`✓ Sede ${payload.nombre} conectada con éxito`);
        formCrearSede.reset();
        // Cambiar a pestaña de lista
        document.querySelector('[data-crud-tab="tab-sedes-lista"]')?.click();
        cargarDatosComparativos();
      } catch (err) {
        playWarning();
        mostrarToast(`Error: ${err.message}`);
      }
    });
  }

  // ====================================================================
  // 10. EXPORTACIÓN CSV
  // ====================================================================
  const btnExp = $("btn-exportar-comparativo");
  if (btnExp) {
    btnExp.addEventListener("click", () => {
        if (!cacheComparativo || !cacheComparativo.sedes) return;
        playChime();
        const cabeceras = ["Centro de Servicios", "Intendencia", "Modo", "En Cola", "En Atencion", "Atendidos Hoy", "Espera Promedio", "% Espera <= 15m"];
        const filas = [cabeceras.join(";")];

        cacheComparativo.sedes.forEach(s => {
          const r = s.resumen || {};
          filas.push([
            `"${s.nombre}"`,
            `"${s.intendencia_nombre || s.intendencia_codigo}"`,
            s.es_simulado ? "Simulado" : "Real SQL",
            r.en_cola || 0,
            r.en_atencion || 0,
            r.atendidos_hoy || 0,
            `"${r.espera_prom || '00:00'}"`,
            `"${r.pct_espera_15m || 100}%"`,
          ].join(";"));
        });

        const blob = new Blob(["\uFEFF" + filas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SITRA_Comparativa_${new Date().toISOString().substring(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        mostrarToast("✓ Reporte exportado en CSV");
      });
    }

    cargarDatosComparativos();
    setInterval(cargarDatosComparativos, intervalo);
  }

// ====================================================================
// INICIALIZACIÓN GLOBAL
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {
  detectarUsuarioActual();
  configurarAuth();
  configurarGestionUsuarios();
  configurarVistaComparativa();

  // Si no estamos en la página comparativa, ejecutar funciones operativas de la sede
  if (!$("tabla-comparativa-csc")) {
    const relojInit = $("reloj");
    if (relojInit) relojInit.textContent = new Date().toLocaleTimeString("es-PE", { hour12: false });
    traerDatos();
    actualizarEstadoSedes();
    configurarDrawer();
    configurarToggleDemo();
    configurarFaq();
    configurarPadrones();
    configurarCopiar();
    configurarModalReporte();
    configurarToggleFlujo();

    setInterval(traerDatos, intervalo);
    setInterval(actualizarEstadoSedes, intervalo * 3);
    setInterval(tickear, 1000);
  } else {
    // En comparativo también permitimos consultar la guía de preguntas
    const btnCompGuia = $("btn-comp-guia");
    if (btnCompGuia) {
      btnCompGuia.addEventListener("click", () => {
        window.location.href = "/#guia";
      });
    }
  }
});


