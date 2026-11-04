// Datos de SUNAT (jerarquía tributaria). Para agregar o editar una intendencia, copia un bloque y cambia los datos.
// FUENTES:
//  - Jurisdicción: Anexo de la RS N.° 000103-2023/SUNAT (ámbito geográfico de la Intendencia Lima e Intendencias de
//    Tributos Internos, por distrito). Ojo: el "Anexo 5" de la RS 000149-2024 es de soporte ADMINISTRATIVO, no de competencia tributaria.
//  - Oficinas: directorios oficiales de Centros de Servicios al Contribuyente de SUNAT (provincias y Lima), 94 locales.
// Nombres de departamento y provincia en MAYÚSCULAS y sin tildes (como en el mapa).
// jurisdiccion: { departamento, provincias: '*' | [lista], excepto: [lista] }  ('*' = todo el departamento menos "excepto")
// indicadores (opcional, por intendencia): { sla: 96.1, atendidos: 431, enEspera: 20, esperaProm: '00:00' }
//   Si falta un dato, el panel muestra "—". Nunca se inventan valores.
// El mapa trabaja por provincia. Si una provincia se reparte entre dos intendencias por distritos, se pinta con la mayoritaria
// (o la de su capital) y el detalle queda en "notas".
const INTENDENCIAS = [
  {
    nombre: 'Intendencia Lima',
    codigo: 'iti_lima',
    tipo: 'Tributos Internos',
    color: '#e6194b',
    jurisdiccion: [
      { departamento: 'CALLAO', provincias: '*' },
      { departamento: 'LIMA', provincias: ['CANETE', 'CANTA', 'HUAROCHIRI', 'LIMA', 'YAUYOS'] }
    ],
    oficinas: [
      { nombre: 'CSC Cañete', departamento: 'LIMA', provincia: 'CANETE', tipo: 'CSC',
        direccion: 'Jr. 2 de Mayo N° 450 - San Vicente de Cañete',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Ate', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Av. Metropolitana Nº 749',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Barranco', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Av. Almirante Miguel Grau Nº 627 - 627A- Barranco',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Callao', departamento: 'CALLAO', provincia: 'CALLAO', tipo: 'CSC',
        direccion: 'Av. Saenz Peña 1251, 1263 – Urb. Santa Marina – Callao (Frente a Plaza Vea Hiper Callao -puerta posterior)',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Gamarra', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Jr, Agustin Gamarra Cuadra 12 - Centro Comercial Gama - Tercer piso',
        horario: 'Solo orientación (marcado con (*) en el directorio)' },
      { nombre: 'CSC La Victoria', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Av. Iquitos Nº 1101 cruce con Calle Italia.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Arenales', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Av. Arenales Nº 335 – 357 - Cercado – LIMA (Costado del Fuero Militar Policial)',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Los Olivos', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Av. Alfredo Mendiola N° 6163 Cruce con Av. Central',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Pueblo Libre', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Av. Simón Bolívar N° 1853 - Urb. Santa Maria - Frente a la facultad de Ingeniería de Sistemas de la UIGV.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Puente Piedra', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Sublote 4 B, Autopista Lima-Ancón Km. 31.5 - Altura Grifo El Norteño.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC San Isidro', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Jr. Juan de Arona N° 887',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC San Juan de Lurigancho', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Av. Santa Rosa de Lima Sur, Mz.X Lote 9-A Urb. Canto Grande.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Surco', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Av. Benavides N° 3828 - 3866 - Urb. Chama.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Villa El Salvador', departamento: 'LIMA', provincia: 'LIMA', tipo: 'CSC',
        direccion: 'Av. Pachacútec - Esq. con Av. 200 Millas',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Arequipa',
    codigo: 'iti_arequipa',
    tipo: 'Tributos Internos',
    color: '#3cb44b',
    jurisdiccion: [
      { departamento: 'AREQUIPA', provincias: '*' },
      { departamento: 'MOQUEGUA', provincias: ['GENERAL SANCHEZ CERRO'] }
    ],
    notas: ['General Sanchez Cerro (Moquegua) figura completa en el mapa, pero los distritos Chojata, Ichuna, Lloque, Quinistaquillas, Yunga los atiende otra intendencia (Intendencia de Tributos Internos Tacna).'],
    oficinas: [
      { nombre: 'CSC Arequipa', departamento: 'AREQUIPA', provincia: 'AREQUIPA', tipo: 'CSC',
        direccion: 'Calle Jerusalén N° 100 -102 - Esquina con Mercaderes N° 201',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC La Tomilla', departamento: 'AREQUIPA', provincia: 'AREQUIPA', tipo: 'CSC',
        direccion: 'Av. Ramón Castilla S/N - Estadio La Tomilla Nro. 12',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Paucarpata', departamento: 'AREQUIPA', provincia: 'AREQUIPA', tipo: 'CSC',
        direccion: 'Av. Pizarro N° 160 A - Frente al Reservorio de Guardia Civil - Paucarpata',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Camaná', departamento: 'AREQUIPA', provincia: 'CAMANA', tipo: 'CSC',
        direccion: 'Av. Mariscal Castilla N° 305',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC El Pedregal', departamento: 'AREQUIPA', provincia: 'CAYLLOMA', tipo: 'CSC',
        direccion: 'Mz. D Lote 3 - Av. Condesuyos S/N Sector Pedregal Centro - Distrito de Majes',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Mollendo', departamento: 'AREQUIPA', provincia: 'ISLAY', tipo: 'CSC',
        direccion: 'Av. Túpac Amaru N° 102 Urbanización Miramar',
        horario: 'Lunes a viernes de 8:30 a 13:00 y de 14:00 a 17:00 (marcado con (*) en el directorio; confirmar)' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos La Libertad',
    codigo: 'iti_lalibertad',
    tipo: 'Tributos Internos',
    color: '#4363d8',
    jurisdiccion: [
      { departamento: 'LA LIBERTAD', provincias: '*' }
    ],
    oficinas: [
      { nombre: 'CSC Casa Grande', departamento: 'LA LIBERTAD', provincia: 'ASCOPE', tipo: 'CSC',
        direccion: 'Av. Central N° 116 - 124 - Mz. H1 Lt. 2',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Chepén', departamento: 'LA LIBERTAD', provincia: 'CHEPEN', tipo: 'CSC',
        direccion: 'Calle Lima N° 434 a media cuadra del cruce con la calle Atahualpa.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Huamachuco', departamento: 'LA LIBERTAD', provincia: 'SANCHEZ CARRION', tipo: 'CSC',
        direccion: 'Jr. Sucre N.º 664 - Mza. 52 Lote 13A - Distrito de Huamachuco.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Trujillo', departamento: 'LA LIBERTAD', provincia: 'TRUJILLO', tipo: 'CSC',
        direccion: 'Jr. Agustín Gamarra N° 484',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Unión', departamento: 'LA LIBERTAD', provincia: 'TRUJILLO', tipo: 'CSC',
        direccion: 'Av. Prolongación La Unión N° 2108 - 2110',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Las Quintanas', departamento: 'LA LIBERTAD', provincia: 'TRUJILLO', tipo: 'CSC',
        direccion: 'Av. Manuel Vera Enrique N° 470 - 472 Urb. Las Quintanas',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Pacasmayo', departamento: 'LA LIBERTAD', provincia: 'PACASMAYO', tipo: 'CSC',
        direccion: 'Jr. Silva Santisteban N° 175 A',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Ayacucho',
    codigo: 'iti_ayacucho',
    tipo: 'Tributos Internos',
    color: '#f58231',
    jurisdiccion: [
      { departamento: 'AYACUCHO', provincias: '*' }
    ],
    notas: ['Solo atiende los distritos Kimbiri, Pichari de La Convencion (Cusco); en el mapa esa provincia se pinta con Intendencia de Tributos Internos Cusco.'],
    oficinas: [
      { nombre: 'CSC Ayacucho', departamento: 'AYACUCHO', provincia: 'HUAMANGA', tipo: 'CSC',
        direccion: 'Jr. 28 de Julio N° 657',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Huanta', departamento: 'AYACUCHO', provincia: 'HUANTA', tipo: 'CSC',
        direccion: 'Jr. Gervacio Santillana N° 133 -137 Distr. Huanta',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Kimbiri', departamento: 'CUSCO', provincia: 'LA CONVENCION', tipo: 'CSC',
        direccion: 'Plaza de Armas de Kimbiri - Jr. José Olaya S/N - interior del Centro Cívico - Local de la Municipalidad Distrital de Kimbiri.',
        horario: 'Lunes a viernes de 8:30 a 13:00 y de 14:00 a 17:00 (marcado con (*) en el directorio; confirmar)' },
      { nombre: 'CSC Pichari', departamento: 'CUSCO', provincia: 'LA CONVENCION', tipo: 'CSC',
        direccion: 'Av. Arriba Perú S/N - Pichari - Local de Organizaciones Sociales de Base',
        horario: 'Lunes a viernes de 8:30 a 13:00 y de 14:00 a 17:00 (marcado con (*) en el directorio; confirmar)' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Cajamarca',
    codigo: 'iti_cajamarca',
    tipo: 'Tributos Internos',
    color: '#911eb4',
    jurisdiccion: [
      { departamento: 'CAJAMARCA', provincias: '*' }
    ],
    oficinas: [
      { nombre: 'CSC Cajamarca', departamento: 'CAJAMARCA', provincia: 'CAJAMARCA', tipo: 'CSC',
        direccion: 'Av. Vía de Evitamiento Norte N° 978 - 996 - Esquina con Jr. Sta. Teresa de Journet - Urb. La Alameda',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Jaén', departamento: 'CAJAMARCA', provincia: 'JAEN', tipo: 'CSC',
        direccion: 'Calle Huamantanga N° 1418',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Chota', departamento: 'CAJAMARCA', provincia: 'CHOTA', tipo: 'CSC',
        direccion: 'Jr. Ezequiel Montoya N° 349',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Chimbote',
    codigo: 'iti_chimbote',
    tipo: 'Tributos Internos',
    color: '#46a2b8',
    jurisdiccion: [
      { departamento: 'ANCASH', provincias: ['CASMA', 'CORONGO', 'HUARMEY', 'PALLASCA', 'SANTA', 'SIHUAS'] }
    ],
    oficinas: [
      { nombre: 'CSC Nuevo Chimbote', departamento: 'ANCASH', provincia: 'SANTA', tipo: 'CSC',
        direccion: 'Urb. Mariscal Luzuriaga Mz C Lote 13 – Distrito de Nuevo Chimbote',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Chimbote', departamento: 'ANCASH', provincia: 'SANTA', tipo: 'CSC',
        direccion: 'Av. Bolognesi N° 855',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Cusco',
    codigo: 'iti_cusco',
    tipo: 'Tributos Internos',
    color: '#bcbd22',
    jurisdiccion: [
      { departamento: 'CUSCO', provincias: '*' },
      { departamento: 'APURIMAC', provincias: '*' }
    ],
    notas: ['La Convencion (Cusco) figura completa en el mapa, pero los distritos Kimbiri, Pichari los atiende otra intendencia (Intendencia de Tributos Internos Ayacucho).'],
    oficinas: [
      { nombre: 'CSC Abancay', departamento: 'APURIMAC', provincia: 'ABANCAY', tipo: 'CSC',
        direccion: 'Av. Nuñez N° 507',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Andahuaylas', departamento: 'APURIMAC', provincia: 'ANDAHUAYLAS', tipo: 'CSC',
        direccion: 'Jr. Juan Antonio Trelles N° 441',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Cusco', departamento: 'CUSCO', provincia: 'CUSCO', tipo: 'CSC',
        direccion: 'Calle Santa Teresa N° 370',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Quillabamba', departamento: 'CUSCO', provincia: 'LA CONVENCION', tipo: 'CSC',
        direccion: 'Av. Bolognesi A-19 - Referencia Alameda - Santa Ana',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Sicuani', departamento: 'CUSCO', provincia: 'CANCHIS', tipo: 'CSC',
        direccion: 'Av. Manuel Callo Zevallos N° 729 - Dist. Sicuani',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC San Sebastian', departamento: 'CUSCO', provincia: 'CUSCO', tipo: 'CSC',
        direccion: 'Prolong. Av. de la Cultura N° 3060- San Sebastian',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Urubamba', departamento: 'CUSCO', provincia: 'URUBAMBA', tipo: 'CSC',
        direccion: 'Av. 9 de Noviembre S/N Mz. C3 - Lt. 4 A',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Espinar', departamento: 'CUSCO', provincia: 'ESPINAR', tipo: 'CSC',
        direccion: 'Calle San Pedro N° 303 Mz. T Lote 11 - Sector Cercado del Centro Poblado de Espinar - Yauri',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Huacho',
    codigo: 'iti_huacho',
    tipo: 'Tributos Internos',
    color: '#c0392b',
    jurisdiccion: [
      { departamento: 'LIMA', provincias: ['BARRANCA', 'CAJATAMBO', 'HUARAL', 'HUAURA', 'OYON'] }
    ],
    oficinas: [
      { nombre: 'CSC Barranca', departamento: 'LIMA', provincia: 'BARRANCA', tipo: 'CSC',
        direccion: 'Av. Manco Capac N° 399',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Huaral', departamento: 'LIMA', provincia: 'HUARAL', tipo: 'CSC',
        direccion: 'Calle Morales Bermudez N° 561 – Huaral',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Huacho', departamento: 'LIMA', provincia: 'HUAURA', tipo: 'CSC',
        direccion: 'Av. 28 de Julio N° 286',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Huánuco',
    codigo: 'iti_huanuco',
    tipo: 'Tributos Internos',
    color: '#e377c2',
    jurisdiccion: [
      { departamento: 'HUANUCO', provincias: '*' },
      { departamento: 'PASCO', provincias: '*', excepto: ['OXAPAMPA'] }
    ],
    oficinas: [
      { nombre: 'CSC Huánuco', departamento: 'HUANUCO', provincia: 'HUANUCO', tipo: 'CSC',
        direccion: 'Jr. Libertad N° 664',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Tingo María', departamento: 'HUANUCO', provincia: 'LEONCIO PRADO', tipo: 'CSC',
        direccion: 'Av. Alameda Perú N° 307 - Rupa Rupa',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Pasco', departamento: 'PASCO', provincia: 'PASCO', tipo: 'CSC',
        direccion: 'AAHH Columna Pasco Sector A - Mz.18 - Lt.7 - Sector 4 - Distrito de Yanacancha, Ref.: Cuadra 18 de la Av. Perú',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Huaraz',
    codigo: 'iti_huaraz',
    tipo: 'Tributos Internos',
    color: '#17becf',
    jurisdiccion: [
      { departamento: 'ANCASH', provincias: '*', excepto: ['CASMA', 'CORONGO', 'HUARMEY', 'PALLASCA', 'SANTA', 'SIHUAS'] }
    ],
    oficinas: [
      { nombre: 'CSC Huaraz', departamento: 'ANCASH', provincia: 'HUARAZ', tipo: 'CSC',
        direccion: 'Jr. Simón Bolivar N° 664',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Caraz', departamento: 'ANCASH', provincia: 'HUAYLAS', tipo: 'CSC',
        direccion: 'Jr. Sucre N° 1010 -1012 Barrio La Esperanza Mz. P2 Sub Lote 1',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Huari', departamento: 'ANCASH', provincia: 'HUARI', tipo: 'CSC',
        direccion: 'Jr. Ancash N° 920',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Ica',
    codigo: 'iti_ica',
    tipo: 'Tributos Internos',
    color: '#7f7f7f',
    jurisdiccion: [
      { departamento: 'HUANCAVELICA', provincias: ['HUAYTARA'] },
      { departamento: 'ICA', provincias: '*' }
    ],
    oficinas: [
      { nombre: 'CSC Chincha', departamento: 'ICA', provincia: 'CHINCHA', tipo: 'CSC',
        direccion: 'Calle El Carmen N° 114 - Chincha Alta.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Ica', departamento: 'ICA', provincia: 'ICA', tipo: 'CSC',
        direccion: 'Av. Ayabaca S/N - Sector San José',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Pisco', departamento: 'ICA', provincia: 'PISCO', tipo: 'CSC',
        direccion: 'Calle Pérez Figuerola N° 112 -118 - Plaza de Armas de Pisco.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Nasca', departamento: 'ICA', provincia: 'NAZCA', tipo: 'CSC',
        direccion: 'Calle Los Heraldos N.º 125',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Juliaca',
    codigo: 'iti_juliaca',
    tipo: 'Tributos Internos',
    color: '#ff7f0e',
    jurisdiccion: [
      { departamento: 'PUNO', provincias: '*' }
    ],
    oficinas: [
      { nombre: 'CSC Juliaca', departamento: 'PUNO', provincia: 'SAN ROMAN', tipo: 'CSC',
        direccion: 'Jr. 7 de Junio N° 575',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Puno', departamento: 'PUNO', provincia: 'PUNO', tipo: 'CSC',
        direccion: 'Jr. Arequipa N° 126',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Desaguadero', departamento: 'PUNO', provincia: 'CHUCUITO', tipo: 'CSC',
        direccion: 'Av. Panamericana N° 302 - Desaguadero',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Junín',
    codigo: 'iti_junin',
    tipo: 'Tributos Internos',
    color: '#2ca02c',
    intendente: 'Paul Ernesto Rodríguez Jara', // dato dado por el usuario; sin verificar con fuente oficial
    jurisdiccion: [
      { departamento: 'HUANCAVELICA', provincias: '*', excepto: ['HUAYTARA'] },
      { departamento: 'JUNIN', provincias: '*' },
      { departamento: 'PASCO', provincias: ['OXAPAMPA'] }
    ],
    oficinas: [
      { nombre: 'CSC Huancavelica', departamento: 'HUANCAVELICA', provincia: 'HUANCAVELICA', tipo: 'CSC',
        direccion: 'Calle 28 de abril N° 465',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Chanchamayo', departamento: 'JUNIN', provincia: 'CHANCHAMAYO', tipo: 'CSC',
        direccion: 'Jr. Arica N° 536 Urb. La Merced',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Huancayo', departamento: 'JUNIN', provincia: 'HUANCAYO', tipo: 'CSC',
        direccion: 'Calle Real N° 325 - 329 - 333 - 337',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC La Oroya', departamento: 'JUNIN', provincia: 'YAULI', tipo: 'CSC',
        direccion: 'Centro Cívico de la Municipalidad Provincial de Yauli: 1er Piso - Av. Horacio Zevallos Gamez N° 313 - 315.',
        horario: 'Lunes a viernes de 8:30 a 13:00 y de 14:00 a 17:00 (marcado con (*) en el directorio; confirmar)' },
      { nombre: 'CSC Satipo', departamento: 'JUNIN', provincia: 'SATIPO', tipo: 'CSC',
        direccion: 'Jr. San Martín N° 462 - Frente al Colegio Parroquial San Francisco de Asís',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Tarma', departamento: 'JUNIN', provincia: 'TARMA', tipo: 'CSC',
        direccion: 'Jr. Huaraz N° 431 - Distrito de Tarma',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Oxapampa', departamento: 'PASCO', provincia: 'OXAPAMPA', tipo: 'CSC',
        direccion: 'Jr. Gustavson N.° 468 - 472',
        horario: 'Lunes a viernes de 8:30 a 13:00 y de 14:00 a 17:00 (marcado con (*) en el directorio; confirmar)' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Lambayeque',
    codigo: 'iti_lambayeque',
    tipo: 'Tributos Internos',
    color: '#d62728',
    jurisdiccion: [
      { departamento: 'AMAZONAS', provincias: '*' },
      { departamento: 'LAMBAYEQUE', provincias: '*' }
    ],
    oficinas: [
      { nombre: 'CSC Chachapoyas', departamento: 'AMAZONAS', provincia: 'CHACHAPOYAS', tipo: 'CSC',
        direccion: 'Jr. Grau N° 969 Chachapoyas',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Bagua Grande', departamento: 'AMAZONAS', provincia: 'UTCUBAMBA', tipo: 'CSC',
        direccion: 'Jr. Higos Urco N° 580 Sector Visaloc Bajo Distrito Bagua Grande',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Balta', departamento: 'LAMBAYEQUE', provincia: 'CHICLAYO', tipo: 'CSC',
        direccion: 'Av. Balta N° 665 - Distrito de Chiclayo',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC José Leonardo Ortíz', departamento: 'LAMBAYEQUE', provincia: 'CHICLAYO', tipo: 'CSC',
        direccion: 'Av. El Dorado No. 930 esquina con Av. Bolívar',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Loreto',
    codigo: 'iti_loreto',
    tipo: 'Tributos Internos',
    color: '#9467bd',
    jurisdiccion: [
      { departamento: 'LORETO', provincias: '*', excepto: ['ALTO AMAZONAS', 'UCAYALI'] }
    ],
    notas: ['Solo atiende los distritos Jeberos, Lagunas, Santa Cruz, Teniente Cesar Lopez Rojas de Alto Amazonas (Loreto); en el mapa esa provincia se pinta con Intendencia de Tributos Internos San Martín.'],
    oficinas: [
      { nombre: 'CSC Punchana', departamento: 'LORETO', provincia: 'MAYNAS', tipo: 'CSC',
        direccion: 'Av. 28 de Julio N° 810',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Iquitos', departamento: 'LORETO', provincia: 'MAYNAS', tipo: 'CSC',
        direccion: 'Jr. Putumayo N° 160',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Madre de Dios',
    codigo: 'iti_madrededios',
    tipo: 'Tributos Internos',
    color: '#8c564b',
    jurisdiccion: [
      { departamento: 'MADRE DE DIOS', provincias: '*' }
    ],
    oficinas: [
      { nombre: 'CSC Madre de Dios', departamento: 'MADRE DE DIOS', provincia: 'TAMBOPATA', tipo: 'CSC',
        direccion: 'Av. 26 de Diciembre N° 157 - Puerto Maldonado',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Piura',
    codigo: 'iti_piura',
    tipo: 'Tributos Internos',
    color: '#1f77b4',
    jurisdiccion: [
      { departamento: 'PIURA', provincias: '*' }
    ],
    oficinas: [
      { nombre: 'CSC Chulucanas', departamento: 'PIURA', provincia: 'MORROPON', tipo: 'CSC',
        direccion: 'Jr. Cuzco N° 700',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Paita', departamento: 'PIURA', provincia: 'PAITA', tipo: 'CSC',
        direccion: 'Zona Industrial II, Mz. X, Lt 2 - Altura del Km. 2 de la Carretera de Paita a Sullana.',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Piura', departamento: 'PIURA', provincia: 'PIURA', tipo: 'CSC',
        direccion: 'Av. Grau N° 1006, esquina con la Av San Martín N° 336 - 386 Sub Lote A',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Sullana', departamento: 'PIURA', provincia: 'SULLANA', tipo: 'CSC',
        direccion: 'Av. José de Lama N° 494',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Talara', departamento: 'PIURA', provincia: 'TALARA', tipo: 'CSC',
        direccion: 'Av. Bolognesi S/N, ex Edificio SEMOR, Oficina N° 101 - Pariñas',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Sechura', departamento: 'PIURA', provincia: 'SECHURA', tipo: 'CSC',
        direccion: 'Calle Simón Bolivar N° 819',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos San Martín',
    codigo: 'iti_sanmartin',
    tipo: 'Tributos Internos',
    color: '#808000',
    jurisdiccion: [
      { departamento: 'LORETO', provincias: ['ALTO AMAZONAS'] },
      { departamento: 'SAN MARTIN', provincias: '*' }
    ],
    notas: ['Alto Amazonas (Loreto) figura completa en el mapa, pero los distritos Jeberos, Lagunas, Santa Cruz, Teniente Cesar Lopez Rojas los atiende otra intendencia (Intendencia de Tributos Internos Loreto).'],
    oficinas: [
      { nombre: 'CSC Yurimaguas', departamento: 'LORETO', provincia: 'ALTO AMAZONAS', tipo: 'CSC',
        direccion: 'Jr. Tacna N° 126 A',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Moyobamba', departamento: 'SAN MARTIN', provincia: 'MOYOBAMBA', tipo: 'CSC',
        direccion: 'Jr José de San Martín N° 353 - 357 - Barrio Zaragoza distrito de Moyobamba',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Tarapoto', departamento: 'SAN MARTIN', provincia: 'SAN MARTIN', tipo: 'CSC',
        direccion: 'Jr. Ramírez Hurtado N° 301 - Tarapoto',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Tocache', departamento: 'SAN MARTIN', provincia: 'TOCACHE', tipo: 'CSC',
        direccion: 'Jr. Progreso N.° 449 Cercado de Tocache',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Juanjui', departamento: 'SAN MARTIN', provincia: 'MARISCAL CACERES', tipo: 'CSC',
        direccion: 'Jr. La Merced N° 569-575',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Nueva Cajamarca', departamento: 'SAN MARTIN', provincia: 'RIOJA', tipo: 'CSC',
        direccion: 'Av. Cajamarca Sur N° 554 - 560 Mz. 21 Lt 17',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Tacna',
    codigo: 'iti_tacna',
    tipo: 'Tributos Internos',
    color: '#008080',
    jurisdiccion: [
      { departamento: 'MOQUEGUA', provincias: '*', excepto: ['GENERAL SANCHEZ CERRO'] },
      { departamento: 'TACNA', provincias: '*' }
    ],
    notas: ['Solo atiende los distritos Chojata, Ichuna, Lloque, Quinistaquillas, Yunga de General Sanchez Cerro (Moquegua); en el mapa esa provincia se pinta con Intendencia de Tributos Internos Arequipa.'],
    oficinas: [
      { nombre: 'CSC Ilo', departamento: 'MOQUEGUA', provincia: 'ILO', tipo: 'CSC',
        direccion: 'Av. Venecia S/N - Costado del ingreso vehicular de ENAPU - Distrito de Ilo',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Moquegua', departamento: 'MOQUEGUA', provincia: 'MARISCAL NIETO', tipo: 'CSC',
        direccion: 'Jr. Moquegua N° 924',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Tacna', departamento: 'TACNA', provincia: 'TACNA', tipo: 'CSC',
        direccion: 'Av. Augusto B. Leguía N° 1549 - Tacna',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Tumbes',
    codigo: 'iti_tumbes',
    tipo: 'Tributos Internos',
    color: '#9a6324',
    jurisdiccion: [
      { departamento: 'TUMBES', provincias: '*' }
    ],
    oficinas: [
      { nombre: 'CSC Aguas Verdes', departamento: 'TUMBES', provincia: 'ZARUMILLA', tipo: 'CSC',
        direccion: 'Av. República del Perú N° 209',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Tumbes', departamento: 'TUMBES', provincia: 'TUMBES', tipo: 'CSC',
        direccion: 'Jr. Bolívar N° 226 - Paseo Los Libertadores',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  },
  {
    nombre: 'Intendencia de Tributos Internos Ucayali',
    codigo: 'iti_ucayali',
    tipo: 'Tributos Internos',
    color: '#800000',
    jurisdiccion: [
      { departamento: 'LORETO', provincias: ['UCAYALI'] },
      { departamento: 'UCAYALI', provincias: '*' }
    ],
    oficinas: [
      { nombre: 'CSC Raymondi', departamento: 'UCAYALI', provincia: 'CORONEL PORTILLO', tipo: 'CSC',
        direccion: 'Jr. Raymondi N° 599 - Pucallpa',
        horario: 'Lunes a viernes de 8:30 a 17:00' },
      { nombre: 'CSC Salvador Allende', departamento: 'UCAYALI', provincia: 'CORONEL PORTILLO', tipo: 'CSC',
        direccion: 'Jr. Salvador Allende N° 130 - Pucallpa',
        horario: 'Lunes a viernes de 8:30 a 17:00' }
    ]
  }
];
