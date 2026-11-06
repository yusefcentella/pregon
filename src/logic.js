/* ===== LÓGICA DE NEGOCIO DE PREGÓN =====
   Sin acceso a datos, sin DOM y sin red: solo funciones puras.
   Se puede probar en Node (ver test.mjs) y se reutiliza igual al migrar. */
const L = (() => {
  const pad = n => String(n).padStart(2, '0');
  const commas = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fmtInt = n => commas(String(Math.round(n)));
  const fmtMXN = n => { const s = Math.abs(n).toFixed(2).split('.'); return (n < 0 ? '-' : '') + '$' + commas(s[0]) + '.' + s[1]; };
  const fmtPct = (n, d = 1) => n.toFixed(d) + ' %';

  // ---- Fechas (DD/MM/AAAA) y zona America/Mexico_City (UTC-6 todo el año desde 2022) ----
  const OFF = 6 * 3600e3;
  const dayIdx = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 864e5);
  const idxKey = i => { const dt = new Date(i * 864e5); return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); };
  const keyIdx = k => { const [y, m, d] = k.split('-').map(Number); return dayIdx(y, m, d); };
  const fmtDate = k => { const [y, m, d] = k.split('-'); return d + '/' + m + '/' + y; };
  const fmtShort = k => { const [, m, d] = k.split('-'); return d + '/' + m; };
  const parseDate = s => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s).trim()); if (!m) return null;
    const d = +m[1], mo = +m[2], y = +m[3]; const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return y + '-' + pad(mo) + '-' + pad(d);
  };
  const parseHour = s => { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s).trim()); return m ? { h: +m[1], mi: +m[2] } : null; };
  const mx = ms => { const dt = new Date(ms - OFF); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes(), dow: dt.getUTCDay(), di: Math.floor((ms - OFF) / 864e5) }; };
  const msOf = (key, h = 0, mi = 0) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d, h, mi) + OFF; };
  const fmtTime = ms => { const t = mx(ms); return pad(t.d) + '/' + pad(t.m) + '/' + t.y + ' ' + pad(t.h) + ':' + pad(t.mi); };
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  // ---- Dinero ----
  const parseMoney = s => {
    const t = String(s).trim().replace(/\s/g, '');
    if (!/^\$?(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(t)) return null;
    return Number(t.replace(/[$,]/g, ''));
  };

  // ---- Datos mexicanos ----
  const RFC_TABLA = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';
  const rfcDigito = base => { // base: 11 (moral) o 12 (física) caracteres
    const s = base.length === 11 ? ' ' + base : base; let suma = 0;
    for (let i = 0; i < 12; i++) { const v = RFC_TABLA.indexOf(s[i]); if (v < 0) return null; suma += v * (13 - i); }
    const r = 11 - (suma % 11); return r === 11 ? '0' : r === 10 ? 'A' : String(r);
  };
  const validarRFC = raw => {
    const s = String(raw || '').trim().toUpperCase();
    if (!s) return { ok: false, error: 'Escribe el RFC.' };
    if (s.length !== 12 && s.length !== 13) return { ok: false, error: 'El RFC tiene 12 caracteres (persona moral) o 13 (persona física). El tuyo tiene ' + s.length + '.' };
    const fisica = s.length === 13;
    const re = fisica ? /^[A-ZÑ&]{4}(\d{2})(\d{2})(\d{2})[A-Z0-9]{3}$/ : /^[A-ZÑ&]{3}(\d{2})(\d{2})(\d{2})[A-Z0-9]{3}$/;
    const m = re.exec(s);
    if (!m) return { ok: false, error: fisica ? 'Un RFC de persona física lleva 4 letras, 6 números de fecha y 3 caracteres finales.' : 'Un RFC de persona moral lleva 3 letras, 6 números de fecha y 3 caracteres finales.' };
    const mes = +m[2], dia = +m[3];
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return { ok: false, error: 'La fecha dentro del RFC no existe. Revisa los 6 números después de las letras.' };
    if (s === 'XAXX010101000' || s === 'XEXX010101000') return { ok: true, tipo: 'fisica', valor: s, generico: true };
    if (rfcDigito(s.slice(0, -1)) !== s.slice(-1)) return { ok: false, error: 'El último carácter del RFC no coincide. Revisa que no falte o sobre una letra o número.' };
    return { ok: true, tipo: fisica ? 'fisica' : 'moral', valor: s };
  };
  const conDigitoRFC = base => base + rfcDigito(base);
  const BANCOS = { '002': 'Banamex', '012': 'BBVA México', '014': 'Santander', '021': 'HSBC', '044': 'Scotiabank', '072': 'Banorte', '127': 'Azteca', '137': 'BanCoppel', '138': 'Ualá', '646': 'STP' };
  const clabeDigito = c17 => { const w = [3, 7, 1]; let s = 0; for (let i = 0; i < 17; i++) s += (Number(c17[i]) * w[i % 3]) % 10; return String((10 - (s % 10)) % 10); };
  const validarCLABE = raw => {
    const s = String(raw || '').replace(/[\s-]/g, '');
    if (!s) return { ok: false, error: 'Escribe la CLABE.' };
    if (!/^\d+$/.test(s)) return { ok: false, error: 'La CLABE solo lleva números.' };
    if (s.length !== 18) return { ok: false, error: 'La CLABE tiene 18 dígitos. La tuya tiene ' + s.length + '.' };
    if (clabeDigito(s.slice(0, 17)) !== s[17]) return { ok: false, error: 'El último dígito de la CLABE no coincide. Revisa que no haya un número cambiado.' };
    return { ok: true, valor: s, banco: BANCOS[s.slice(0, 3)] || 'Banco no listado' };
  };
  const conDigitoCLABE = c17 => c17 + clabeDigito(c17);
  const validarTel = raw => {
    let s = String(raw || '').replace(/[\s().-]/g, '');
    if (!s) return { ok: false, error: 'Escribe el teléfono de WhatsApp.' };
    s = s.replace(/^\+?52/, '').replace(/^1(?=\d{10}$)/, '');
    if (!/^\d+$/.test(s)) return { ok: false, error: 'El teléfono solo lleva números.' };
    if (s.length !== 10) return { ok: false, error: 'El teléfono debe tener 10 dígitos, sin +52 ni 044. El tuyo tiene ' + s.length + '.' };
    return { ok: true, valor: s };
  };
  const validarCP = raw => {
    const s = String(raw || '').trim();
    if (!/^\d{5}$/.test(s)) return { ok: false, error: 'El código postal tiene 5 números.' };
    if (s === '00000') return { ok: false, error: 'Ese código postal no existe.' };
    return { ok: true, valor: s };
  };
  const REGIMENES = { '601': 'General de Ley Personas Morales', '603': 'Personas Morales con Fines no Lucrativos', '605': 'Sueldos y Salarios', '606': 'Arrendamiento', '612': 'Personas Físicas con Actividades Empresariales y Profesionales', '621': 'Incorporación Fiscal', '625': 'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', '626': 'Régimen Simplificado de Confianza (RESICO)' };
  const maskRFC = r => r ? r.slice(0, 3) + '•'.repeat(Math.max(0, r.length - 5)) + r.slice(-2) : '';
  const maskTel = t => t && t.length === 10 ? t.slice(0, 3) + ' ••• ••' + t.slice(-2) : '';
  const maskCLABE = c => c ? c.slice(0, 3) + ' •••••••••••• ' + c.slice(-3) : '';
  const fmtTel = t => t.slice(0, 3) + ' ' + t.slice(3, 6) + ' ' + t.slice(6);

  // ---- Estados de la República (Otros se agrupa al mostrar) ----
  const ESTADOS = ['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'];
  const CANALES = {
    instagram: { nombre: 'Instagram', max: 2200, tags: 8 },
    facebook: { nombre: 'Facebook', max: 63206, tags: 0 },
    whatsapp: { nombre: 'WhatsApp Estado', max: 700, tags: 0 },
    tiktok: { nombre: 'TikTok', max: 2200, tags: 5 },
    google: { nombre: 'Google Business', max: 1500, tags: 0 }
  };
  const OCASIONES = [
    { id: 'ninguna', n: 'Sin fecha especial', linea: '', tags: [] },
    { id: 'buen_fin', n: 'Buen Fin', linea: 'Aprovecha las ofertas del Buen Fin.', tags: ['BuenFin'] },
    { id: 'dia_muertos', n: 'Día de Muertos', linea: 'Para el altar y la mesa de Día de Muertos.', tags: ['DiaDeMuertos'] },
    { id: 'fiestas_patrias', n: 'Fiestas patrias (15 de septiembre)', linea: 'Para tu noche mexicana del 15 de septiembre.', tags: ['NocheMexicana', 'VivaMexico'] },
    { id: 'posadas', n: 'Posadas y Navidad', linea: 'Para tus posadas y la cena de Navidad.', tags: ['Posadas', 'Navidad'] },
    { id: 'regreso_clases', n: 'Regreso a clases', linea: 'Listo para el regreso a clases.', tags: ['RegresoAClases'] },
    { id: 'dia_madres', n: 'Día de las Madres (10 de mayo)', linea: 'El detalle perfecto para mamá el 10 de mayo.', tags: ['DiaDeLasMadres'] },
    { id: 'quincena', n: 'Quincena', linea: 'Es quincena: date un gusto.', tags: ['Quincena'] }
  ];
  const TONOS = {
    cercano: { ap: p => '¡Hola! Ya llegó ' + p + '.', cta: 'Escríbenos y pide el tuyo' },
    formal: { ap: p => 'Presentamos ' + p + '.', cta: 'Para hacer tu pedido, escríbenos' },
    divertido: { ap: p => '¡Aguas! ' + p + ' ya está aquí y no va a durar.', cta: 'Mándanos mensaje antes de que se acabe' }
  };

  const sinAcentos = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hashtags = (producto, ciudad, ocasionId, max) => {
    const oc = OCASIONES.find(o => o.id === ocasionId) || OCASIONES[0];
    const palabras = sinAcentos(producto).split(/[^A-Za-z0-9]+/).filter(w => w.length > 3 && !/^\d+$/.test(w)).slice(0, 2).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase());
    const ciudadTag = sinAcentos(String(ciudad || '').split(',')[0]).replace(/[^A-Za-z0-9]/g, '');
    const lista = [...palabras, ...oc.tags, 'HechoEnMexico', ...(ciudadTag.length > 2 ? [ciudadTag] : [])];
    return [...new Set(lista)].slice(0, max).map(t => '#' + t);
  };
  const waLink = (tel10, producto, ref) => 'https://wa.me/52' + tel10 + '?text=' + encodeURIComponent('Hola, vi su publicación de ' + producto + ' (ref ' + ref + ')');
  const refCode = (semilla, prefijo) => { // código corto estable a partir de un texto
    let h = 2166136261; for (const c of String(semilla)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; s += A[h % A.length]; }
    return (prefijo || 'PG') + '-' + s;
  };

  // ---- Validación de la entrada del formulario ----
  const validarEntrada = i => {
    const e = {}; const o = {};
    o.negocio = String(i.negocio || '').trim(); if (o.negocio.length < 2 || o.negocio.length > 60) e.negocio = 'Escribe el nombre de tu negocio (entre 2 y 60 letras).';
    o.ciudad = String(i.ciudad || '').trim();
    o.producto = String(i.producto || '').trim(); if (o.producto.length < 2 || o.producto.length > 80) e.producto = 'Escribe el nombre del producto (entre 2 y 80 letras).';
    if (String(i.precio ?? '').trim() === '') o.precio = null; else {
      const p = typeof i.precio === 'number' ? i.precio : parseMoney(i.precio);
      if (p === null || !(p > 0) || p > 1000000) e.precio = 'El precio no es válido. Escribe solo números, por ejemplo 120 o 120.50.'; else o.precio = p;
    }
    o.descripcion = String(i.descripcion || '').trim(); if (o.descripcion.length > 300) e.descripcion = 'La descripción puede tener hasta 300 letras.';
    o.oferta = String(i.oferta || '').trim(); if (o.oferta.length > 120) e.oferta = 'La oferta puede tener hasta 120 letras.';
    const t = validarTel(i.tel); if (!t.ok) e.tel = t.error; else o.tel = t.valor;
    o.ocasion = i.ocasion || 'ninguna'; o.tono = TONOS[i.tono] ? i.tono : 'cercano';
    o.canales = (i.canales || []).filter(c => CANALES[c]); if (!o.canales.length) e.canales = 'Elige al menos un canal.';
    const f = i.fecha ? (/^\d{4}-\d{2}-\d{2}$/.test(i.fecha) ? i.fecha : parseDate(i.fecha)) : null;
    if (!f) e.fecha = 'La fecha debe ir como DD/MM/AAAA, por ejemplo 20/11/2026.'; else o.fecha = f;
    const hr = parseHour(i.hora || '12:00'); if (!hr) e.hora = 'La hora debe ir como HH:MM en formato de 24 horas, por ejemplo 18:30.'; else o.hora = pad(hr.h) + ':' + pad(hr.mi);
    o.ref = i.ref || refCode(o.negocio + '|' + o.producto + '|' + (o.fecha || ''), (o.negocio.match(/[A-ZÁÉÍÓÚÑ]/g) || ['P']).slice(0, 2).join('') || 'PG');
    if (i.spei) { const c = validarCLABE(i.clabe); if (!c.ok) e.clabe = c.error; else o.clabe = c.valor; }
    return { ok: !Object.keys(e).length, errores: e, datos: o };
  };

  // ---- Generador de textos (reglas, sin IA; la IA es opcional y se valida igual) ----
  const generar = input => {
    const v = validarEntrada(input); if (!v.ok) return { ok: false, errores: v.errores };
    const d = v.datos; const tono = TONOS[d.tono]; const oc = OCASIONES.find(x => x.id === d.ocasion) || OCASIONES[0];
    const wa = waLink(d.tel, d.producto, d.ref);
    const precio = d.precio !== null ? 'Solo ' + fmtMXN(d.precio) + ' (IVA incluido).' : '';
    const spei = d.clabe ? 'Pago por transferencia SPEI. CLABE: ' + d.clabe + '.' : '';
    const resultados = d.canales.map(c => {
      const cfg = CANALES[c]; const tags = cfg.tags ? hashtags(d.producto, d.ciudad, d.ocasion, cfg.tags).join(' ') : '';
      const armar = desc => {
        const partes = {
          whatsapp: [tono.ap(d.producto), desc, d.oferta, oc.linea, precio, tono.cta + ': ' + wa, spei, '— ' + d.negocio],
          facebook: [tono.ap(d.producto), desc, d.oferta, oc.linea, precio, tono.cta + ': ' + wa, spei, '— ' + d.negocio],
          instagram: [tono.ap(d.producto), desc, d.oferta, oc.linea, precio, tono.cta + ' por WhatsApp al ' + fmtTel(d.tel) + ' y menciona ' + d.ref + '.', spei, tags],
          tiktok: [tono.ap(d.producto), d.oferta, precio, tono.cta + ' por WhatsApp (liga en el perfil). Ref ' + d.ref + '.', tags],
          google: [tono.ap(d.producto), desc, d.oferta, oc.linea, precio, 'Toca «Mensaje» en nuestro perfil y menciona ' + d.ref + '.']
        }[c];
        return partes.filter(Boolean).join('\n');
      };
      let texto = armar(d.descripcion);
      if (texto.length > cfg.max && d.descripcion) { const sobra = texto.length - cfg.max; const corta = d.descripcion.slice(0, Math.max(0, d.descripcion.length - sobra - 1)).trimEnd(); texto = armar(corta ? corta + '…' : ''); }
      return { canal: c, nombre: cfg.nombre, texto, largo: texto.length, max: cfg.max, ok: texto.length <= cfg.max };
    });
    return { ok: true, datos: d, wa, ref: d.ref, resultados, todoOk: resultados.every(r => r.ok) };
  };

  // ---- Guion para reel / video corto (reglas, sin IA) ----
  const guionReel = input => {
    const v = validarEntrada(input); if (!v.ok) return { ok: false, errores: v.errores };
    const d = v.datos; const tono = TONOS[d.tono]; const oc = OCASIONES.find(x => x.id === d.ocasion) || OCASIONES[0];
    const tel = fmtTel(d.tel); const precio = d.precio !== null ? 'Cuesta solo ' + fmtMXN(d.precio) + ', IVA incluido.' : '';
    const ganchos = [tono.ap(d.producto), '¿Buscas ' + d.producto + '? Mira esto.', oc.linea || 'Esto es lo que tenemos hoy: ' + d.producto + '.'];
    const escenas = [
      { tiempo: '0 a 3 s', nombre: 'Gancho', imagen: 'Primer plano del producto, bien iluminado y sin nada que estorbe.', pantalla: d.producto, voz: ganchos[0] },
      { tiempo: '3 a 10 s', nombre: 'El producto', imagen: 'Tres tomas cortas: de cerca, en tu mano y cómo se usa o se prepara.', pantalla: d.descripcion ? d.descripcion.slice(0, 60) : 'Hecho en ' + (String(d.ciudad).split(',')[0] || 'México'), voz: [d.descripcion || 'Mira cómo se ve de cerca.', oc.linea].filter(Boolean).join(' ') },
      { tiempo: '10 a 18 s', nombre: 'Precio y oferta', imagen: 'El producto en cuadro y el precio escrito grande, bien legible.', pantalla: [d.precio !== null ? fmtMXN(d.precio) + ' IVA incluido' : '', d.oferta].filter(Boolean).join(' · ') || 'Pregunta por precio', voz: [precio, d.oferta].filter(Boolean).join(' ') || 'Pregúntanos por el precio y la disponibilidad.' },
      { tiempo: '18 a 25 s', nombre: 'Cierre', imagen: 'Tú o tu producto mirando a la cámara. Deja la pantalla quieta 2 segundos para que se alcance a leer.', pantalla: 'WhatsApp ' + tel + ' · ref ' + d.ref, voz: tono.cta + ' por WhatsApp al ' + tel + ' y menciona ' + d.ref + '.' }
    ];
    const tags = hashtags(d.producto, d.ciudad, d.ocasion, 5).join(' ');
    const pie = [ganchos[0], d.descripcion, d.oferta, oc.linea, d.precio !== null ? 'Solo ' + fmtMXN(d.precio) + ' (IVA incluido).' : '', tono.cta + ' por WhatsApp al ' + tel + ' y menciona ' + d.ref + '.', d.clabe ? 'Pago por transferencia SPEI. CLABE: ' + d.clabe + '.' : '', tags].filter(Boolean).join('\n');
    const consejos = ['Graba en vertical (9:16) y que dure entre 15 y 30 segundos.', 'Activa los subtítulos: mucha gente ve los videos sin sonido.', 'Graba cerca de una ventana con luz natural y limpia el lente.', 'Usa música de la biblioteca de la propia red para evitar problemas de derechos.', 'Pon el mismo código ' + d.ref + ' en el video y en el pie: así sabrás qué video vende.', 'Publícalo en el horario en que más te escriben (mira el mapa “Cuándo te escriben”).'];
    const texto = ['GUION DE REEL: ' + d.producto + ' (ref ' + d.ref + ')', '', 'Ganchos para elegir:'].concat(ganchos.map((g, i) => (i + 1) + '. ' + g), ['']).concat(escenas.map(e => e.tiempo + ' · ' + e.nombre + '\n  Graba: ' + e.imagen + '\n  Pantalla: ' + e.pantalla + '\n  Di: ' + e.voz), ['', 'PIE DEL VIDEO:', pie, '', 'CONSEJOS:'], consejos.map(c => '- ' + c)).join('\n');
    return { ok: true, ref: d.ref, ganchos, escenas, pie, pieMax: 2200, pieOk: pie.length <= 2200, consejos, texto };
  };
  const FOTO_MAX = 150000;
  const fotoValida = s => typeof s === 'string' && s.length <= FOTO_MAX && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(s);

  // ---- CSV de catálogo ----
  const parseCSVFilas = (texto, delim) => {
    const filas = []; let fila = [], cel = '', q = false;
    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (q) { if (ch === '"') { if (texto[i + 1] === '"') { cel += '"'; i++; } else q = false; } else cel += ch; }
      else if (ch === '"') q = true;
      else if (ch === delim) { fila.push(cel); cel = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && texto[i + 1] === '\n') i++; fila.push(cel); cel = ''; if (fila.some(x => x.trim() !== '')) filas.push(fila); fila = []; }
      else cel += ch;
    }
    fila.push(cel); if (fila.some(x => x.trim() !== '')) filas.push(fila);
    return filas;
  };
  const importarCSV = texto => {
    const t = String(texto || '').replace(/^﻿/, '');
    if (!t.trim()) return { ok: false, errores: ['Pega el contenido del CSV o elige un archivo.'], productos: [] };
    const primera = t.split(/\r?\n/)[0]; const delim = primera.includes(';') && !primera.includes(',') ? ';' : ',';
    const filas = parseCSVFilas(t, delim);
    const enc = filas[0].map(h => sinAcentos(h.trim().toLowerCase()));
    const ip = enc.indexOf('producto'), ipr = enc.indexOf('precio'), id = enc.indexOf('descripcion'), io = enc.indexOf('oferta');
    if (ip < 0 || ipr < 0) return { ok: false, errores: ['La primera fila debe tener las columnas «producto» y «precio». Opcionales: «descripcion» y «oferta».'], productos: [] };
    const errores = [], productos = [];
    if (filas.length - 1 > 50) errores.push('El archivo tiene ' + (filas.length - 1) + ' productos. El máximo es 50 por carga.');
    filas.slice(1, 51).forEach((f, k) => {
      const n = k + 2; const prod = (f[ip] || '').trim(); const pr = (f[ipr] || '').trim();
      if (prod.length < 2 || prod.length > 80) { errores.push('Fila ' + n + ': el nombre del producto debe tener entre 2 y 80 letras.'); return; }
      const precio = pr === '' ? null : parseMoney(pr);
      if (pr !== '' && (precio === null || precio <= 0)) { errores.push('Fila ' + n + ': el precio «' + pr + '» no es válido. Escribe solo números, por ejemplo 120 o 120.50.'); return; }
      productos.push({ producto: prod, precio, descripcion: id >= 0 ? (f[id] || '').trim() : '', oferta: io >= 0 ? (f[io] || '').trim() : '' });
    });
    return { ok: !errores.length && productos.length > 0, errores, productos };
  };


  // ---- Resultados de las redes (alcance, me gusta, etc.): captura a mano o CSV ----
  const CAMPOS_RES = [['alcance', 'Alcance'], ['likes', 'Me gusta'], ['comentarios', 'Comentarios'], ['guardados', 'Guardados'], ['clics', 'Clics al enlace']];
  const parseEntero = s => { const t = String(s ?? '').trim(); if (t === '') return { ok: true, v: null }; return /^(\d{1,3}(,\d{3})+|\d+)$/.test(t) ? { ok: true, v: Number(t.replace(/,/g, '')) } : { ok: false }; };
  const canalDe = s => { const t = sinAcentos(String(s || '').trim().toLowerCase()); const m = { instagram: 'instagram', facebook: 'facebook', 'whatsapp estado': 'whatsapp', whatsapp: 'whatsapp', tiktok: 'tiktok', 'google business': 'google', google: 'google' }; return m[t] || null; };
  const importarResultadosCSV = (texto, refs) => {
    const t = String(texto || '').replace(/^\uFEFF/, ''); if (!t.trim()) return { ok: false, errores: ['Pega el contenido del CSV o elige un archivo.'], filas: [] };
    const primera = t.split(/\r?\n/)[0]; const delim = primera.includes(';') && !primera.includes(',') ? ';' : ',';
    const filas = parseCSVFilas(t, delim); const enc = filas[0].map(h => sinAcentos(h.trim().toLowerCase()).replace(/[\s-]+/g, '_'));
    const ix = n => enc.indexOf(n); const iRef = ix('referencia'), iCan = ix('canal');
    if (iRef < 0 || iCan < 0) return { ok: false, errores: ['La primera fila debe tener las columnas «referencia» y «canal». Opcionales: alcance, me_gusta, comentarios, guardados, clics.'], filas: [] };
    const cols = { alcance: ix('alcance'), likes: Math.max(ix('me_gusta'), ix('likes')), comentarios: ix('comentarios'), guardados: ix('guardados'), clics: ix('clics') };
    const errores = [], out = [];
    if (filas.length - 1 > 300) errores.push('El archivo tiene ' + (filas.length - 1) + ' filas. El máximo es 300 por carga.');
    filas.slice(1, 301).forEach((f, k) => {
      const n = k + 2; const ref = (f[iRef] || '').trim().toUpperCase(); const canal = canalDe(f[iCan]);
      if (!refs.includes(ref)) { errores.push('Fila ' + n + ': la referencia «' + (f[iRef] || '').trim() + '» no existe en tus publicaciones.'); return; }
      if (!canal) { errores.push('Fila ' + n + ': el canal «' + (f[iCan] || '').trim() + '» no es válido. Usa Instagram, Facebook, WhatsApp Estado, TikTok o Google Business.'); return; }
      const r = { ref, canal }; let malo = false;
      for (const [campo, i] of Object.entries(cols)) { const p = i < 0 ? { ok: true, v: null } : parseEntero(f[i]); if (!p.ok) { errores.push('Fila ' + n + ': «' + campo + '» debe ser un número entero, por ejemplo 1250.'); malo = true; break; } r[campo] = p.v; }
      if (!malo) out.push(r);
    });
    return { ok: !errores.length && out.length > 0, errores, filas: out };
  };

  // ---- Exportaciones ----
  const celdaSegura = v => { let s = v === null || v === undefined ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return s; };
  const aCSV = (cols, filas) => '﻿' + [cols, ...filas].map(f => f.map(c => '"' + celdaSegura(c).replace(/"/g, '""') + '"').join(',')).join('\r\n') + '\r\n';
  const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const aExcel = hojas => '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style><Style ss:ID="m"><NumberFormat ss:Format="&quot;$&quot;#,##0.00"/></Style></Styles>' +
    hojas.map(h => '<Worksheet ss:Name="' + xmlEsc(h.nombre) + '"><Table><Row>' + h.cols.map(c => '<Cell ss:StyleID="h"><Data ss:Type="String">' + xmlEsc(c) + '</Data></Cell>').join('') + '</Row>' +
      h.filas.map(f => '<Row>' + f.map((c, k) => (typeof c === 'number' ? '<Cell' + (h.dinero && h.dinero.includes(k) ? ' ss:StyleID="m"' : '') + '><Data ss:Type="Number">' + c + '</Data></Cell>' : '<Cell><Data ss:Type="String">' + xmlEsc(celdaSegura(c)) + '</Data></Cell>')).join('') + '</Row>').join('') + '</Table></Worksheet>').join('') + '</Workbook>';
  const COLS_CAL = ['Fecha', 'Hora', 'Canal', 'Publicación', 'Precio MXN (IVA incluido)', 'Referencia', 'Estado', 'Texto'];
  const filaCalendario = (p, canal, texto) => [fmtDate(p.fecha), p.hora || '12:00', canal, p.producto, p.precio === null || p.precio === undefined ? '' : fmtMXN(p.precio), p.ref, p.estado || '', texto];
  const COLS_VENTAS = ['Fecha', 'Canal', 'Publicación', 'Referencia', 'Total MXN (IVA incluido)', 'Subtotal sin IVA (referencial 16 %)', 'IVA (referencial 16 %)', 'Forma de pago', 'Estado de la República'];
  const filaVenta = (m, p) => { const sub = Math.round(m.venta / 1.16 * 100) / 100; return [fmtDate(idxKey(m.di)), m.canal, p ? p.producto : '', p ? p.ref : '', m.venta, sub, Math.round((m.venta - sub) * 100) / 100, m.pago || '', m.estado || '']; };

  return { pad, fmtInt, fmtMXN, fmtPct, dayIdx, idxKey, keyIdx, fmtDate, fmtShort, parseDate, parseHour, mx, msOf, fmtTime, DIAS, parseMoney, rfcDigito, validarRFC, conDigitoRFC, clabeDigito, validarCLABE, conDigitoCLABE, validarTel, validarCP, REGIMENES, maskRFC, maskTel, maskCLABE, fmtTel, ESTADOS, CANALES, OCASIONES, TONOS, hashtags, waLink, refCode, validarEntrada, generar, guionReel, fotoValida, FOTO_MAX, importarCSV, CAMPOS_RES, parseEntero, canalDe, importarResultadosCSV, aCSV, aExcel, COLS_CAL, filaCalendario, COLS_VENTAS, filaVenta, sinAcentos };
})();

/* ===== AUTOVERIFICACIÓN =====
   Ejecuta la acción principal con un ejemplo real de cada tipo y compara contra un resultado escrito a mano. */
const autoverificar = () => {
  const casos = [];
  const caso = (tipo, esperado, fn) => {
    let obtenido, ok = false;
    try { obtenido = fn(); ok = JSON.stringify(obtenido) === JSON.stringify(esperado); } catch (e) { obtenido = 'Error: ' + e.message; }
    casos.push({ tipo, ok, esperado, obtenido });
  };
  const base = { negocio: 'Dulces Doña Chela', ciudad: 'Celaya, Guanajuato', tel: '(461) 000-0123', producto: 'Cajeta quemada 250 g', precio: '89.50', descripcion: '', oferta: '', ocasion: 'ninguna', tono: 'cercano', canales: ['whatsapp'], fecha: '20/11/2026', hora: '18:00', ref: 'DD-7K2M' };

  caso('Formulario de un producto (texto para WhatsApp Estado)',
    '¡Hola! Ya llegó Cajeta quemada 250 g.\nSolo $89.50 (IVA incluido).\nEscríbenos y pide el tuyo: https://wa.me/524610000123?text=Hola%2C%20vi%20su%20publicaci%C3%B3n%20de%20Cajeta%20quemada%20250%20g%20(ref%20DD-7K2M)\n— Dulces Doña Chela',
    () => L.generar(base).resultados[0].texto);

  caso('Formulario: límites de cada red con texto largo',
    { instagram: true, facebook: true, whatsapp: true, tiktok: true, google: true },
    () => { const r = L.generar({ ...base, descripcion: 'Dulce artesanal '.repeat(18).slice(0, 300), oferta: 'Lleva 2 y paga 1 solo esta semana'.slice(0, 120), ocasion: 'dia_muertos', canales: ['instagram', 'facebook', 'whatsapp', 'tiktok', 'google'] }); const o = {}; r.resultados.forEach(x => o[x.canal] = x.largo <= x.max); return o; });

  caso('Importar CSV con comas, comillas y punto y coma',
    { ok: true, productos: [['Cajeta quemada 250 g', 89.5], ['Obleas, caja con 12', 145], ['Jamoncillo', 1234.5]] },
    () => { const a = L.importarCSV('producto,precio,descripcion\r\nCajeta quemada 250 g,$89.50,Con leche de cabra\r\n"Obleas, caja con 12",145,\r\n'); const b = L.importarCSV('producto;precio\nJamoncillo;"1,234.50"\n'); return { ok: a.ok && b.ok, productos: [...a.productos, ...b.productos].map(p => [p.producto, p.precio]) }; });

  caso('Importar CSV con un error: dice la fila y qué corregir',
    ['Fila 3: el precio «abc» no es válido. Escribe solo números, por ejemplo 120 o 120.50.'],
    () => L.importarCSV('producto,precio\nCajeta,89.50\nGlorias,abc\n').errores);

  caso('RFC, CLABE, teléfono y código postal',
    { rfcGenerico: true, rfcPruebaMoral: true, rfcPruebaFisica: true, rfcMal: false, rfcMoral: true, clabe: true, clabeMal: false, tel: '4610000123', telMal: false, cp: true, cpMal: false },
    () => ({ rfcGenerico: L.validarRFC('XAXX010101000').ok, rfcPruebaMoral: L.validarRFC('EKU9003173C9').ok, rfcPruebaFisica: L.validarRFC('XIQB891116QE4').ok, rfcMal: L.validarRFC('XAXX010101001').ok, rfcMoral: L.validarRFC('ABC850312' + 'K7' + L.rfcDigito('ABC850312K7')).ok, clabe: L.validarCLABE('002010077777777771').ok, clabeMal: L.validarCLABE('002010077777777772').ok, tel: L.validarTel('+52 (461) 000-0123').valor, telMal: L.validarTel('461 000 012').ok, cp: L.validarCP('38000').ok, cpMal: L.validarCP('3800').ok }));


  caso('Importar resultados de las redes (CSV)',
    { ok: true, filas: [{ ref: 'DD-100', canal: 'instagram', alcance: 1250, likes: 87, comentarios: 6, guardados: 12, clics: null }, { ref: 'DD-100', canal: 'whatsapp', alcance: 430, likes: null, comentarios: null, guardados: null, clics: 9 }], error: 'Fila 2: la referencia «ZZ-1» no existe en tus publicaciones.' },
    () => { const a = L.importarResultadosCSV('referencia,canal,alcance,me_gusta,comentarios,guardados,clics\r\nDD-100,Instagram,"1,250",87,6,12,\r\nDD-100,WhatsApp Estado,430,,,,9\r\n', ['DD-100']); const b = L.importarResultadosCSV('referencia,canal,alcance\nZZ-1,Instagram,10\n', ['DD-100']); return { ok: a.ok, filas: a.filas, error: b.errores[0] }; });

  caso('Guion para reel',
    { escenas: 4, ganchos: 3, ref: true, precio: true, cta: true, pieOk: true, sinPrecio: false },
    () => { const g = L.guionReel({ ...base, oferta: 'Lleva 2 por $149.00', canales: ['instagram'] }); const h = L.guionReel({ ...base, precio: '' }); return { escenas: g.escenas.length, ganchos: g.ganchos.length, ref: g.texto.includes('DD-7K2M') && g.pie.includes('DD-7K2M'), precio: g.pie.includes('$89.50') && g.escenas[2].voz.includes('$89.50'), cta: g.escenas[3].voz.includes('(461) 000 0123') || g.escenas[3].voz.includes('461'), pieOk: g.pieOk, sinPrecio: h.pie.includes('$') }; });

  caso('Foto del producto (formato y tamaño)',
    { ok: true, png: false, grande: false, texto: false, nulo: false },
    () => ({ ok: L.fotoValida('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), png: L.fotoValida('data:image/png;base64,iVBORw0KGgo='), grande: L.fotoValida('data:image/jpeg;base64,' + 'A'.repeat(L.FOTO_MAX)), texto: L.fotoValida('http://sitio.com/foto.jpg'), nulo: L.fotoValida(null) }));

  caso('Código de referencia automático',
    { formato: true, estable: true, distinto: true },
    () => { const a = L.refCode('Dulces|Cajeta|2026-11-20', 'DD'), b = L.refCode('Dulces|Cajeta|2026-11-20', 'DD'), c = L.refCode('Dulces|Glorias|2026-11-20', 'DD'); return { formato: /^DD-[2-9A-HJ-KM-NP-Z]{4}$/.test(a), estable: a === b, distinto: a !== c }; });

  caso('Moneda MXN y fechas DD/MM/AAAA',
    { a: '$1,234.50', b: '$0.99', c: '05/11/2026', d: '2026-02-28', e: null },
    () => ({ a: L.fmtMXN(1234.5), b: L.fmtMXN(0.99), c: L.fmtDate('2026-11-05'), d: L.parseDate('28/02/2026'), e: L.parseDate('31/02/2026') }));

  caso('Exportar a CSV y Excel',
    { csv: '﻿"Fecha","Hora","Canal","Publicación","Precio MXN (IVA incluido)","Referencia","Estado","Texto"\r\n"20/11/2026","18:00","WhatsApp Estado","Cajeta ""quemada""","$89.50","DD-7K2M","Programada","\'=SUMA(1)"\r\n', hojas: 1, filas: 1, xmlValido: true },
    () => { const p = { fecha: '2026-11-20', hora: '18:00', producto: 'Cajeta "quemada"', precio: 89.5, ref: 'DD-7K2M', estado: 'Programada' }; const fila = L.filaCalendario(p, 'WhatsApp Estado', '=SUMA(1)'); const csv = L.aCSV(L.COLS_CAL, [fila]); const x = L.aExcel([{ nombre: 'Calendario', cols: L.COLS_CAL, filas: [fila] }]); return { csv, hojas: (x.match(/<Worksheet /g) || []).length, filas: (x.match(/<Row>/g) || []).length - 1, xmlValido: x.endsWith('</Workbook>') && x.includes("'=SUMA(1)") }; });

  return { ok: casos.every(c => c.ok), casos };
};

if (typeof module !== 'undefined') module.exports = { L, autoverificar };
