/* ===== INTERFAZ ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const RAMP = ['var(--r0)', 'var(--r1)', 'var(--r2)', 'var(--r3)', 'var(--r4)', 'var(--r5)'];
const CANAL_COLOR = { instagram: 'var(--c1)', facebook: 'var(--c2)', whatsapp: 'var(--c3)', otros: 'var(--c4)' };
const HOY = () => L.mx(Date.now()).di;
const PLANES = [
  { id: 'arranque', n: 'Arranque', mes: 199, para: 'Para empezar a medir con un negocio.', f: ['1 negocio', '20 publicaciones al mes', '2 canales', 'Hasta 10 productos por CSV', '100 mensajes registrados al mes', 'Historial de 30 días', 'Exportar a CSV', '1 usuario', 'Soporte por correo'] },
  { id: 'negocio', n: 'Negocio', mes: 399, para: 'Para vender todos los días por WhatsApp.', f: ['3 negocios', '80 publicaciones al mes', '5 canales', 'Hasta 50 productos por CSV', '1,000 mensajes registrados al mes', 'Historial de 12 meses', 'Exportar a CSV y Excel', '3 usuarios', 'Soporte por WhatsApp'] },
  { id: 'crece', n: 'Crece', mes: 799, para: 'Para varias sucursales o marcas.', f: ['10 negocios', 'Publicaciones sin límite', '5 canales', 'Hasta 50 productos por CSV', 'Mensajes registrados sin límite', 'Historial de 24 meses', 'Exportar a CSV y Excel', '10 usuarios', 'Soporte prioritario por WhatsApp'] }
];
const FOUNDER_MES = 219;
const descuentoFundador = () => Math.round((1 - FOUNDER_MES / PLANES[1].mes) * 100);

const S = { route: 'inicio', ws: 'demo', rango: '30', custom: null, canal: 'todos', comparar: true, metrica: 'msgs', open: null, tab: 'uno', anual: false, flash: null, nuevoId: null, keep: false, msgDraft: null };
let SEEDC = null; const REALS = {}; let GEN = null; let SC = null; let CHARTS = {};

/* ---- espacios ---- */
const seedDemo = () => { if (!SEEDC) { const posts = buildDemoPosts(); const msgs = buildDemoMsgs(posts, Math.max(L.keyIdx('2026-11-05'), HOY()), Date.now()); SEEDC = { posts, msgs, met: buildDemoMetricas(posts, msgs, HOY()) }; } return SEEDC; };
const getReal = id => REALS[id] || (REALS[id] = Store.cargarEspacio(id));
const guardar = () => Store.guardarEspacio(S.ws, getReal(S.ws));
const metaDe = id => id === 'demo' ? DEMO_META : (getReal(id).meta || { id, demo: false, nombre: 'Mi negocio', ciudad: '', tel: '' });
const getWS = id => {
  const R = getReal(id); const meta = metaDe(id);
  const base = id === 'demo' ? seedDemo().posts : [];
  const posts = [...base, ...R.posts].map(p => R.edits[p.id] ? Object.assign({}, p, R.edits[p.id]) : p);
  const msgs = id === 'demo' ? seedDemo().msgs.concat(R.msgs) : R.msgs;
  const met = Object.assign({}, id === 'demo' ? seedDemo().met : {}, R.metricas || {});
  return { id, meta, R, posts, msgs, met, byId: Object.fromEntries(posts.map(p => [p.id, p])) };
};
const evento = (tipo, campos) => { const R = getReal(S.ws); R.eventos = R.eventos || []; R.eventos.push(Object.assign({ tipo, ts: Date.now() }, campos)); if (R.eventos.length > 500) R.eventos.shift(); };

/* ---- agregados ---- */
const rango = () => { const fin = HOY(); if (S.rango === 'custom' && S.custom) return { a: S.custom.a, b: S.custom.b }; const n = +S.rango; return { a: fin - n + 1, b: fin }; };
const agregar = (w, a, b, canal) => {
  const dias = b - a + 1; const o = { n: 0, ventas: 0, nv: 0, porDia: new Array(dias).fill(0), vDia: new Array(dias).fill(0), canal: {}, estado: {}, pago: {}, heat: Array.from({ length: 7 }, () => new Array(24).fill(0)), post: {} };
  for (const m of w.msgs) {
    if (m.di < a || m.di > b || (canal !== 'todos' && m.canal !== canal)) continue;
    o.n++; o.porDia[m.di - a]++; o.heat[m.dow][m.h]++;
    o.canal[m.canal] = (o.canal[m.canal] || 0) + 1; o.estado[m.estado] = (o.estado[m.estado] || 0) + 1;
    const ps = o.post[m.postId] || (o.post[m.postId] = { n: 0, v: 0, nv: 0 }); ps.n++;
    if (m.venta > 0) { o.ventas += m.venta; o.nv++; o.vDia[m.di - a] += m.venta; o.pago[m.pago] = (o.pago[m.pago] || 0) + 1; ps.v += m.venta; ps.nv++; }
  }
  o.ticket = o.nv ? o.ventas / o.nv : 0; o.tasa = o.n ? o.nv / o.n * 100 : 0; return o;
};
const agregarRedes = (w, a, b, canal) => {
  const pc = {}; w.msgs.forEach(m => { const k = m.postId + '|' + m.canal; pc[k] = (pc[k] || 0) + 1; });
  const o = { n: 0, alcance: 0, inter: 0, clics: 0, msgs: 0, demo: true };
  for (const [k, m] of Object.entries(w.met)) { const [pid, c] = k.split('|'); const p = w.byId[pid]; if (!p) continue; const di = L.keyIdx(p.fecha); if (di < a || di > b || (canal !== 'todos' && c !== canal)) continue; o.n++; o.alcance += m.alcance || 0; o.inter += (m.likes || 0) + (m.comentarios || 0) + (m.guardados || 0); o.clics += m.clics || 0; o.msgs += pc[k] || 0; if (!m.demo) o.demo = false; }
  o.por1000 = o.alcance ? o.msgs / o.alcance * 1000 : 0; return o;
};
const kpiRedes = (c, p) => {
  const hay = c.n > 0; const nota = hay ? (c.demo ? 'Datos demo · ' : 'Capturado a mano · ') + c.n + ' resultados' : 'Captura los resultados en Publicaciones';
  const k = [['Alcance', L.fmtInt(c.alcance), delta(c.alcance, p.alcance)], ['Interacciones (me gusta, comentarios, guardados)', L.fmtInt(c.inter), delta(c.inter, p.inter)], ['Clics al enlace', L.fmtInt(c.clics), delta(c.clics, p.clics)], ['Mensajes por cada 1,000 de alcance', c.por1000.toFixed(1), delta(c.por1000, p.por1000)]];
  return '<div class="stack" style="gap:8px"><div class="grid g4">' + k.map(x => '<div class="panel kpi"><span class="muted">' + x[0] + '</span>' + (hay ? '<div class="v num">' + x[1] + '</div>' + (x[2] ? '<span class="delta ' + x[2].c + '">' + x[2].t + '</span>' : '') : '<div class="v" style="font-size:22px">No disponible</div>') + '<p class="hint">' + nota + '</p></div>').join('') + '</div><p class="hint">Resultados de las publicaciones hechas en el periodo. Alcance, me gusta y clics los copias tú de las estadísticas de cada red.</p></div>';
};
const top4 = (obj, nombre = x => x) => { const e = Object.entries(obj).sort((x, y) => y[1] - x[1]); const t = e.slice(0, 4).map(([k, v]) => [nombre(k), v]); const resto = e.slice(4).reduce((s, x) => s + x[1], 0); if (resto) t.push(['Otros', resto]); return t; };
const delta = (c, p) => { if (!S.comparar) return null; if (p === 0) return { t: c === 0 ? 'Sin cambio' : 'Sin periodo anterior', c: 'flat' }; const d = (c - p) / p * 100; return { t: (d >= 0 ? '▲ ' : '▼ ') + L.fmtPct(Math.abs(d)) + ' vs. periodo anterior', c: d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'flat' }; };

/* ---- miniaturas (ilustraciones SVG dentro del archivo) ---- */
const THUMBS = {
  jar: '<rect x="18" y="14" width="28" height="8" rx="3" fill="#A47C20"/><rect x="14" y="22" width="36" height="32" rx="8" fill="#6A3B1E"/><rect x="20" y="30" width="24" height="16" rx="4" fill="#F0DDB5"/><circle cx="32" cy="38" r="4" fill="#B5651D"/>',
  jar2: '<rect x="18" y="14" width="28" height="8" rx="3" fill="#7C8F87"/><rect x="14" y="22" width="36" height="32" rx="8" fill="#8A4B2A"/><rect x="20" y="30" width="24" height="16" rx="4" fill="#E8D3B0"/><path d="M26 42l6-8 6 8z" fill="#7a2e2e"/>',
  wafer: '<circle cx="32" cy="32" r="22" fill="#E7CFA0"/><circle cx="32" cy="32" r="16" fill="#C98F3C"/><path d="M18 24l28 16M18 32l28 16M18 40l14 8M32 16l14 8M20 18l26 14" stroke="#E7CFA0" stroke-width="2" fill="none"/>',
  candy: '<ellipse cx="32" cy="32" rx="14" ry="11" fill="#D6A02C"/><path d="M18 32L8 24v16zM46 32l10-8v16z" fill="#F2B53D"/><path d="M26 26l12 12" stroke="#FFE7A8" stroke-width="3"/>',
  coco: '<rect x="8" y="30" width="22" height="22" rx="6" fill="#F4EAD2"/><rect x="34" y="30" width="22" height="22" rx="6" fill="#E9D5A6"/><rect x="21" y="10" width="22" height="22" rx="6" fill="#FFF6E0"/>',
  ate: '<rect x="8" y="22" width="48" height="26" rx="6" fill="#8E2F3B"/><rect x="8" y="22" width="48" height="8" rx="4" fill="#B54555"/><path d="M14 38h36" stroke="#F7D9A1" stroke-width="4"/>',
  skull: '<path d="M32 8c-13 0-20 9-20 20 0 7 3 11 8 13v9h24v-9c5-2 8-6 8-13 0-11-7-20-20-20z" fill="#F4EAD2"/><circle cx="24" cy="30" r="5" fill="#3a2a1a"/><circle cx="40" cy="30" r="5" fill="#3a2a1a"/><path d="M26 50v-6M32 50v-6M38 50v-6" stroke="#3a2a1a" stroke-width="2"/><path d="M12 14l6 4M52 14l-6 4" stroke="#F2B53D" stroke-width="3"/>',
  pumpkin: '<ellipse cx="32" cy="38" rx="22" ry="17" fill="#D9731C"/><ellipse cx="32" cy="38" rx="9" ry="17" fill="#EE9333"/><path d="M32 21c0-6 3-9 8-10" stroke="#5E7A2A" stroke-width="4" fill="none"/>',
  box: '<rect x="10" y="26" width="44" height="28" rx="4" fill="#8A4B2A"/><rect x="8" y="18" width="48" height="12" rx="4" fill="#B5651D"/><rect x="28" y="18" width="8" height="36" fill="#F2B53D"/><path d="M32 18c-6-10-16-6-10 0M32 18c6-10 16-6 10 0" stroke="#F2B53D" stroke-width="3" fill="none"/>',
  truck: '<rect x="6" y="20" width="32" height="24" rx="3" fill="#8BA3F5"/><path d="M38 28h12l8 8v8H38z" fill="#5D78D8"/><circle cx="18" cy="48" r="6" fill="#0F1611" stroke="#E8EFE7" stroke-width="3"/><circle cx="48" cy="48" r="6" fill="#0F1611" stroke="#E8EFE7" stroke-width="3"/>',
  play: '<rect x="8" y="14" width="48" height="36" rx="8" fill="#4FC3A1"/><path d="M27 23l16 9-16 9z" fill="#0F1611"/>'
};
const thumb = (kind, cls = '') => '<svg class="thumb ' + cls + '" viewBox="0 0 64 64" role="img" aria-label="Ilustración del producto">' + (THUMBS[kind] || THUMBS.candy) + '</svg>';
const adivinaKind = t => { const s = L.sinAcentos(t.toLowerCase()); return /cajeta|miel|mermelada/.test(s) ? 'jar' : /oblea|galleta|pan/.test(s) ? 'wafer' : /calaver/.test(s) ? 'skull' : /calabaza/.test(s) ? 'pumpkin' : /caja|paquete|combo|regalo/.test(s) ? 'box' : /envio/.test(s) ? 'truck' : /video/.test(s) ? 'play' : /coco|jamoncillo/.test(s) ? 'coco' : 'candy'; };

/* ---- gráficas ---- */
const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
const panelGrafica = (id, titulo, sub, contenido, tabla) => '<section class="panel" aria-label="' + esc(titulo) + '"><div class="phead"><div><h2>' + esc(titulo) + '</h2>' + (sub ? '<p class="muted" style="font-size:14px">' + sub + '</p>' : '') + '</div><button class="btn sm tbl-toggle" data-act="tabla" data-for="' + id + '" aria-expanded="false">Ver la tabla</button></div><div id="v-' + id + '">' + contenido + '</div><div class="tw" id="t-' + id + '" hidden>' + tabla + '</div></section>';
const tablaHtml = (cols, filas) => '<table><thead><tr>' + cols.map((c, i) => '<th' + (i ? ' class="r"' : '') + '>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + filas.map(f => '<tr>' + f.map((c, i) => '<td' + (i ? ' class="r num"' : '') + '>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
const lineChart = (id, o) => {
  const W = 760, H = 270, ml = 54, mr = 14, mt = 14, mb = 30, iw = W - ml - mr, ih = H - mt - mb, n = o.labels.length;
  const max = niceMax(Math.max(1, ...o.series.flatMap(s => s.values)));
  const x = i => ml + (n < 2 ? iw / 2 : i * iw / (n - 1)), y = v => mt + ih - v / max * ih;
  let g = '';
  for (let t = 0; t <= 4; t++) { const v = max * t / 4; g += '<line class="grid-l" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="ax" x="' + (ml - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + o.yFmt(v) + '</text>'; }
  const paso = Math.max(1, Math.round(n / 6)); for (let i = 0; i < n; i += paso) g += '<text class="ax" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + o.labels[i].slice(0, 5) + '</text>';
  o.series.forEach(s => { const d = s.values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(''); g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"' + (s.dash ? ' stroke-dasharray="5 4"' : '') + '/>'; });
  let ann = '';
  (o.ann || []).forEach((a, k) => { const cx = x(a.i), cy = y(o.series[0].values[a.i]); ann += '<circle cx="' + cx + '" cy="' + cy + '" r="5" fill="var(--bg)" stroke="var(--accent)" stroke-width="2"/>'; if (a.label) { const ancho = 230, lx = Math.min(Math.max(cx - ancho / 2, ml), W - mr - ancho); ann += '<foreignObject x="' + lx + '" y="' + Math.max(0, cy - 66) + '" width="' + ancho + '" height="58"><div xmlns="http://www.w3.org/1999/xhtml" style="font:12px/1.35 var(--body);color:var(--text);background:var(--bg);border:1px solid var(--accent);border-radius:10px;padding:5px 8px">' + esc(a.label) + '</div></foreignObject>'; } });
  CHARTS[id] = { labels: o.labels, series: o.series, yFmt: o.yFmt, W, ml, mr, n, ann: o.ann || [] };
  return '<div class="chart" data-chart="' + id + '"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.alt) + '">' + g + ann + '<line class="hv" y1="' + mt + '" y2="' + (mt + ih) + '" x1="0" x2="0"/></svg></div>' +
    (o.series.length > 1 ? '<div class="legend">' + o.series.map(s => '<span><i class="sw" style="background:' + s.color + '"></i>' + esc(s.name) + '</span>').join('') + '</div>' : '');
};
const barras = (items, colores, fmt = L.fmtInt) => { const max = Math.max(1, ...items.map(i => i[1])); const tot = items.reduce((s, i) => s + i[1], 0); return '<div class="bars">' + items.map((it, k) => '<div class="bar" data-tip="' + esc(it[0] + ': ' + fmt(it[1]) + ' (' + (tot ? (it[1] / tot * 100).toFixed(1) : '0.0') + ' %)') + '"><span>' + esc(it[0]) + '</span><span class="track"><span class="fill" style="display:block;width:' + (it[1] / max * 100) + '%;background:' + (colores ? colores[k] : RAMP[5 - Math.min(4, k)]) + '"></span></span><span class="num">' + fmt(it[1]) + '</span></div>').join('') + '</div>' + '<p class="hint">Total: <span class="num">' + fmt(tot) + '</span></p>'; };

/* ---- componentes del dashboard (se reutilizan en el inicio) ---- */
const kpiTiles = (c, p) => {
  const k = [['Mensajes de WhatsApp', L.fmtInt(c.n), delta(c.n, p.n)], ['Ventas atribuidas', L.fmtMXN(c.ventas), delta(c.ventas, p.ventas)], ['Ticket promedio', L.fmtMXN(c.ticket), delta(c.ticket, p.ticket)], ['De mensaje a venta', L.fmtPct(c.tasa), delta(c.tasa, p.tasa)]];
  return '<div class="grid g4">' + k.map(x => '<div class="panel kpi"><span class="muted">' + x[0] + '</span><div class="v num">' + x[1] + '</div>' + (x[2] ? '<span class="delta ' + x[2].c + '">' + x[2].t + '</span>' : '<span class="delta flat">Comparación apagada</span>') + '</div>').join('') + '</div>';
};
const heatPanel = (ag, id, intro) => {
  const max = Math.max(1, ...ag.heat.flat()); const ord = [1, 2, 3, 4, 5, 6, 0]; let c = '<div class="heat' + (intro ? ' intro' : '') + '" role="img" aria-label="Mapa de calor de mensajes por día de la semana y hora"><span></span>';
  for (let h = 0; h < 24; h++) c += '<span class="hh' + (h % 3 ? ' skip' : '') + '">' + h + '</span>';
  ord.forEach(d => { c += '<span class="hl">' + L.DIAS[d].slice(0, 3) + '</span>'; for (let h = 0; h < 24; h++) { const v = ag.heat[d][h]; const k = v === 0 ? 0 : 1 + Math.min(4, Math.floor(v / max * 5)); c += '<span class="cell" data-dow="' + d + '" data-h="' + h + '" style="background:' + RAMP[k] + (intro ? ';animation-delay:' + ((d * 24 + h) * 6) + 'ms' : '') + '" data-tip="' + esc(L.DIAS[d][0].toUpperCase() + L.DIAS[d].slice(1) + ' de ' + L.pad(h) + ':00 a ' + L.pad(h) + ':59: ' + L.fmtInt(v) + ' mensajes') + '"></span>'; } });
  c += '</div><div class="ramp" style="margin-top:12px"><span>Menos</span>' + RAMP.map(r => '<i style="background:' + r + '"></i>').join('') + '<span>Más mensajes</span></div>';
  let mejor = null; ag.heat.forEach((fila, d) => fila.forEach((v, h) => { if (!mejor || v > mejor.v) mejor = { d, h, v }; }));
  const consejo = mejor && mejor.v ? 'Tus clientes escriben más los ' + L.DIAS[mejor.d] + ' entre las ' + L.pad(mejor.h) + ':00 y las ' + L.pad(mejor.h) + ':59. Publica una hora antes.' : 'Cuando registres mensajes, aquí verás en qué día y hora te escriben.';
  const filas = ord.map(d => [L.DIAS[d], ...ag.heat[d].map(v => L.fmtInt(v))]);
  return { c, consejo, tabla: tablaHtml(['Día', ...Array.from({ length: 24 }, (_, h) => String(h))], filas) };
};
const relLabel = (ts, real) => { const d = Date.now() - ts; if (real && d < 60e3) return 'Justo ahora'; if (d < 3600e3) return 'hace ' + Math.max(1, Math.round(d / 60e3)) + ' min'; if (d < 86400e3) return 'hace ' + Math.round(d / 3600e3) + ' h'; return L.fmtTime(ts); };
const feedItems = w => {
  const corte = Date.now() - 86400e3 * 4; const it = [];
  for (const m of w.msgs) if (m.ts >= corte && m.ts <= Date.now()) it.push({ ts: m.ts, real: m.real, m, p: w.byId[m.postId] });
  for (const p of w.posts) if (p.creado) it.push({ ts: p.creado, real: true, pub: p });
  return it.sort((a, b) => b.ts - a.ts).slice(0, 25);
};
const feedPanel = (w, accion) => {
  const items = feedItems(w);
  const li = items.map((x, k) => {
    const nuevo = S.nuevoId && ((x.m && x.m.id === S.nuevoId) || (x.pub && x.pub.id === S.nuevoId));
    if (x.pub) return '<li class="real' + (nuevo ? ' nuevo' : '') + '">' + thumb(x.pub.kind || 'candy') + '<div><b>Publicación creada</b><br><span class="muted">' + esc(x.pub.producto) + ' · ' + x.pub.canales.map(c => L.CANALES[c].nombre).join(', ') + '</span></div><span class="t" data-ts="' + x.ts + '" data-real="1">' + relLabel(x.ts, true) + '</span></li>';
    const m = x.m, cn = L.CANALES[m.canal].nombre;
    return '<li class="' + (m.real ? 'real' : '') + (nuevo ? ' nuevo' : '') + '">' + thumb(x.p ? x.p.kind : 'candy') + '<div>' + (m.venta > 0 ? '<b>Venta de ' + L.fmtMXN(m.venta) + '</b> · ' + esc(m.pago) : '<b>Mensaje nuevo</b>') + '<br><span class="muted">' + cn + ' · ' + esc(x.p ? x.p.producto : 'Publicación') + (m.estado ? ' · ' + esc(m.estado) : '') + '</span></div><span class="t" data-ts="' + x.ts + '" data-real="' + (m.real ? 1 : 0) + '">' + relLabel(x.ts, m.real) + '</span></li>';
  }).join('');
  return '<section class="panel" aria-label="Actividad en vivo"><div class="phead"><div><h2>Actividad en vivo</h2><p class="muted" style="font-size:14px">Mensajes y ventas de los últimos 4 días</p></div>' + (accion ? '<button class="btn sm pri" data-act="regMsg">Registrar un mensaje</button>' : '') + '</div><ul class="feed" id="feed" aria-live="polite">' + (li || '<li><span></span><span class="muted">Todavía no hay actividad. Registra tu primer mensaje.</span><span></span></li>') + '</ul></section>';
};
const rankingPanel = (w, ag) => {
  const rows = Object.entries(ag.post).filter(([id]) => w.byId[id]).sort((a, b) => b[1].v - a[1].v || b[1].n - a[1].n).slice(0, 6);
  const filas = rows.map(([id, s]) => { const p = w.byId[id]; return '<tr><td>' + thumb(p.kind || 'candy') + '</td><td><b>' + esc(p.producto) + '</b><br><span class="muted">' + esc(p.categoria || 'Producto') + ' · ' + esc(p.ref) + '</span></td><td class="r num">' + L.fmtInt(s.n) + '</td><td class="r num">' + L.fmtMXN(s.v) + '</td><td class="r num">' + (s.n ? L.fmtPct(s.nv / s.n * 100) : '0.0 %') + '</td></tr>'; }).join('');
  return '<section class="panel" aria-label="Ranking de publicaciones"><div class="phead"><div><h2>Las publicaciones que más venden</h2><p class="muted" style="font-size:14px">Según las ventas que llegaron con su código de referencia</p></div></div><div class="tw"><table><thead><tr><th></th><th>Publicación</th><th class="r">Mensajes</th><th class="r">Ventas</th><th class="r">Cierre</th></tr></thead><tbody>' + (filas || '<tr><td colspan="5" class="muted">Sin ventas en este periodo.</td></tr>') + '</tbody></table></div></section>';
};

/* ---- pie y navegación ---- */
const footer = () => '<footer><div class="wrap"><p><b>Pregón</b> es un producto en validación. Los datos del espacio demo son de un negocio ficticio y están marcados como demo. Pregón no publica por ti ni se conecta todavía con las redes: copias el texto o lo programas tú. Timbrado y facturación: no conectado. Pregón no tiene relación con el SAT, Meta, Google ni TikTok.</p><p><b>Aviso de privacidad (LFPDPPP).</b> Solo guardamos lo que escribes en los formularios y conteos de uso sin datos personales: no guardamos IP, CURP ni datos en bruto. Los teléfonos y RFC se muestran enmascarados. No vendemos datos. Para ejercer tus derechos de acceso, rectificación, cancelación y oposición, escríbenos por WhatsApp. Responsable: Pregón Pymes. Domicilio: por definir antes del lanzamiento.</p><p><a href="#metricas">Métricas (solo administración)</a></p></div></footer>';
const NAV = [['inicio', 'Inicio'], ['demo', 'Demo en vivo'], ['publicaciones', 'Publicaciones'], ['crear', 'Crear'], ['precios', 'Precios']];
const encabezado = () => {
  const enApp = ['demo', 'publicaciones', 'crear'].includes(S.route); const w = enApp ? getWS(S.ws) : null; const m = w && w.meta;
  const logo = '<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#F2B53D"/><path d="M7 17l13-6v12L7 19z" fill="#1A1405"/><rect x="5" y="15" width="4" height="6" rx="1.5" fill="#1A1405"/><path d="M23 12.5c2 1 2.800 2.500 2.800 3.500S25 18.500 23 19.500" stroke="#1A1405" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  let h = '<header class="top"><div class="wrap"><a class="brand" href="#inicio">' + logo + 'Pregón</a>' + (enApp ? (m.demo ? '<span class="chip acc">Espacio demo</span>' : '<span class="chip ok">Tu espacio privado</span>') : '') + '<nav class="nav" aria-label="Principal">' + NAV.map(([r, t]) => '<a href="#' + r + '"' + ((S.route === r && !(r === 'demo' && S.ws !== 'demo')) ? ' aria-current="page"' : '') + (r === 'demo' ? ' data-act="irDemo"' : '') + '>' + t + '</a>').join('') + (S.ws !== 'demo' ? '<a href="#e-' + S.ws + '"' + (S.route === 'demo' && S.ws !== 'demo' ? ' aria-current="page"' : '') + '>Mi espacio</a>' : '') + '</nav></div></header>';
  if (enApp) h += '<div class="subbar"><div class="wrap">' + (m.demo ? '<span>Estás viendo a <b>' + esc(m.nombre) + '</b>, ' + esc(m.ciudad) + ' <span class="muted">(cliente ficticio)</span></span><span class="push"></span><button class="btn sm pri" data-act="crearMio">Crear el mío</button>' : '<span>Espacio de <b>' + esc(m.nombre) + '</b></span><span class="push"></span><button class="btn sm" data-act="verEnlace">Ver mi enlace secreto</button>') + '</div></div>';
  return h;
};

/* ---- vistas ---- */
const filtros = () => '<div class="panel row" style="justify-content:space-between"><div class="row"><div class="seg" role="group" aria-label="Periodo">' + [['7', '7 días'], ['30', '30 días'], ['90', '90 días'], ['custom', 'Personalizado']].map(([v, t]) => '<button data-act="rango" data-v="' + v + '" aria-pressed="' + (S.rango === v) + '">' + t + '</button>').join('') + '</div>' +
  (S.rango === 'custom' ? '<div class="row"><div class="field"><label for="c-de">Desde (DD/MM/AAAA)</label><input id="c-de" value="' + L.fmtDate(L.idxKey(rango().a)) + '" inputmode="numeric" style="width:140px"></div><div class="field"><label for="c-a">Hasta (DD/MM/AAAA)</label><input id="c-a" value="' + L.fmtDate(L.idxKey(rango().b)) + '" inputmode="numeric" style="width:140px"></div><button class="btn sm" data-act="aplicarCustom" style="align-self:flex-end">Aplicar</button></div>' : '') + '</div>' +
  '<div class="row"><div class="field"><label for="f-canal">Canal</label><select id="f-canal" data-chg="canal" style="width:190px"><option value="todos">Todos los canales</option>' + Object.entries(L.CANALES).map(([k, c]) => '<option value="' + k + '"' + (S.canal === k ? ' selected' : '') + '>' + c.nombre + '</option>').join('') + '</select></div><label style="display:flex;gap:8px;align-items:center;margin:20px 0 0"><input type="checkbox" id="f-comp" data-chg="comparar"' + (S.comparar ? ' checked' : '') + '> Comparar con el periodo anterior</label></div></div><p id="aviso-custom" class="err"></p>';

const vistaDemo = () => {
  const w = getWS(S.ws); const { a, b } = rango(); const dias = b - a + 1; const c = agregar(w, a, b, S.canal); const p = agregar(w, a - dias, a - 1, S.canal); const rc = agregarRedes(w, a, b, S.canal), rp = agregarRedes(w, a - dias, a - 1, S.canal);
  const labels = Array.from({ length: dias }, (_, i) => L.fmtDate(L.idxKey(a + i)));
  const esMsg = S.metrica === 'msgs'; const vals = esMsg ? c.porDia : c.vDia.map(v => Math.round(v * 100) / 100); const prev = esMsg ? p.porDia : p.vDia.map(v => Math.round(v * 100) / 100);
  const fmtY = esMsg ? L.fmtInt : v => '$' + L.fmtInt(v);
  let ann = []; if (S.ws === 'demo') { const dentro = ANOTACIONES.filter(x => { const i = L.keyIdx(x.d); return i >= a && i <= b; }).map(x => ({ i: L.keyIdx(x.d) - a, t: x.t })); const mayor = dentro.sort((x, y) => vals[y.i] - vals[x.i])[0]; ann = dentro.map(x => Object.assign({}, x, { label: x === mayor ? x.t + ' (demo)' : '' })); }
  const series = [{ name: 'Este periodo', color: 'var(--c1)', values: vals }]; if (S.comparar) series.push({ name: 'Periodo anterior', color: 'var(--c4)', values: prev, dash: true });
  const graf = lineChart('main', { labels, series, yFmt: fmtY, ann, alt: (esMsg ? 'Mensajes' : 'Ventas') + ' por día, ' + labels[0] + ' al ' + labels[labels.length - 1] }) + (ann.length ? '<ul class="hint" style="margin:10px 0 0;padding-left:18px">' + ann.map(x => '<li>' + L.fmtDate(L.idxKey(a + x.i)) + ': ' + esc(x.t) + '</li>').join('') + '</ul>' : '');
  const tabla = tablaHtml(['Fecha', 'Este periodo', ...(S.comparar ? ['Periodo anterior'] : [])], labels.map((l, i) => [l, esMsg ? L.fmtInt(vals[i]) : L.fmtMXN(vals[i]), ...(S.comparar ? [esMsg ? L.fmtInt(prev[i]) : L.fmtMXN(prev[i])] : [])]));
  const cabeza = '<div class="seg" role="group" aria-label="Qué mostrar" style="margin-bottom:12px"><button data-act="metrica" data-v="msgs" aria-pressed="' + esMsg + '">Mensajes</button><button data-act="metrica" data-v="ventas" aria-pressed="' + !esMsg + '">Ventas (MXN)</button></div>';
  const hp = heatPanel(c, 'heat', false);
  const canales = top4(c.canal, k => L.CANALES[k].nombre); const ccol = canales.map((x, i) => [CANAL_COLOR.instagram, CANAL_COLOR.facebook, CANAL_COLOR.whatsapp, CANAL_COLOR.otros, CANAL_COLOR.otros][i]);
  const sec = (id, t, items, col, fmt, unidad = 'Mensajes') => panelGrafica(id, t, '', barras(items, col, fmt), tablaHtml([t, unidad], items.map(i => [i[0], L.fmtInt(i[1])])));
  const vacio = !w.posts.length ? '<div class="panel empty"><h2>Tu espacio está vacío</h2><p style="margin:8px 0 16px">Crea tu primera publicación con su enlace de WhatsApp y empieza a medir.</p><a class="btn pri" href="#crear">Crear mi primera publicación</a></div>' : '';
  return '<div class="wrap stack" style="padding-top:20px">' + vacio + filtros() + kpiTiles(c, p) + kpiRedes(rc, rp) +
    '<div class="grid main2">' + panelGrafica('main', 'Mensajes y ventas en el tiempo', 'Cada punto es un día. Los picos de quincena (días 15 y 30) son normales.', cabeza + graf, tabla) + feedPanel(w, true) + '</div>' +
    panelGrafica('heat', 'Cuándo te escriben', hp.consejo, hp.c, hp.tabla) +
    '<div class="grid g3">' + sec('b-canal', 'Por canal', canales, ccol) + sec('b-estado', 'Por estado de la República', top4(c.estado), null) + sec('b-pago', 'Por forma de pago (ventas)', top4(c.pago), null, undefined, 'Ventas') + '</div>' +
    rankingPanel(w, c) +
    '<div class="panel"><h3>Lo que Pregón no puede medir</h3><p class="muted" style="margin-top:6px">La lectura automática de alcance, “me gusta” y clics: <b>No disponible</b> todavía. Cada red solo los entrega con una conexión autorizada, y un enlace de WhatsApp no avisa cuántas personas lo tocan. Por eso los capturas tú (en Publicaciones, a mano o por CSV) y se muestran marcados como capturados. Los mensajes y ventas sí se miden con el código de referencia.' + (S.ws === 'demo' ? ' Los datos de este espacio son de demostración, generados con una semilla fija.' : '') + '</p></div></div>';
};

const alcDe = (w, p) => { const v = (p.canales || []).map(c => w.met[p.id + '|' + c]).filter(Boolean); return v.length ? L.fmtInt(v.reduce((s, m) => s + (m.alcance || 0), 0)) : 'No disponible'; };
const panelRes = (w, p) => '<h3 style="margin:16px 0 6px">Resultados en la red' + (w.meta.demo ? ' <span class="chip acc">Demo</span>' : '') + '</h3><p class="hint" style="margin-bottom:8px">Cópialos de las estadísticas de cada red. Déjalos vacíos si no los tienes: se mostrarán como “No disponible”.</p><div class="tw"><table><thead><tr><th>Canal</th>' + L.CAMPOS_RES.map(x => '<th>' + x[1] + '</th>').join('') + '</tr></thead><tbody>' + (p.canales || []).map(c => { const m = w.met[p.id + '|' + c] || {}; return '<tr><td>' + L.CANALES[c].nombre + '</td>' + L.CAMPOS_RES.map(([f, n]) => '<td><label class="sr" for="m-' + p.id + c + f + '">' + n + ' en ' + L.CANALES[c].nombre + '</label><input id="m-' + p.id + c + f + '" data-chg="res" data-id="' + p.id + '" data-c="' + c + '" data-f="' + f + '" value="' + (m[f] === null || m[f] === undefined ? '' : m[f]) + '" inputmode="numeric" style="width:96px" placeholder="—"></td>').join('') + '</tr>'; }).join('') + '</tbody></table></div>';
const vistaPublicaciones = () => {
  const w = getWS(S.ws); const ag = agregar(w, 0, HOY(), 'todos');
  const lista = [...w.posts].sort((x, y) => (y.fecha + (y.hora || '')).localeCompare(x.fecha + (x.hora || '')));
  const filas = lista.map(p => {
    const s = ag.post[p.id] || { n: 0, v: 0 }; const ab = S.open === p.id;
    let r = '<tr><td>' + thumb(p.kind || 'candy') + '</td><td style="min-width:200px"><label class="sr" for="e-t-' + p.id + '">Nombre</label><input id="e-t-' + p.id + '" data-chg="edit" data-id="' + p.id + '" data-f="producto" value="' + esc(p.producto) + '"></td><td style="min-width:90px"><label class="sr" for="e-p-' + p.id + '">Precio</label><input id="e-p-' + p.id + '" data-chg="edit" data-id="' + p.id + '" data-f="precio" value="' + (p.precio === null || p.precio === undefined ? '' : p.precio.toFixed(2)) + '" inputmode="decimal" placeholder="Sin precio"></td><td style="min-width:120px"><label class="sr" for="e-d-' + p.id + '">Fecha</label><input id="e-d-' + p.id + '" data-chg="edit" data-id="' + p.id + '" data-f="fecha" value="' + L.fmtDate(p.fecha) + '" inputmode="numeric"></td><td><label class="sr" for="e-s-' + p.id + '">Estado</label><select id="e-s-' + p.id + '" data-chg="edit" data-id="' + p.id + '" data-f="estado" style="min-width:170px">' + ['Borrador', 'Lista para publicar', 'Publicada'].map(o => '<option' + (p.estado === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></td><td class="mono">' + esc(p.ref) + '</td><td class="r num">' + alcDe(w, p) + '</td><td class="r num">' + L.fmtInt(s.n) + '</td><td class="r num">' + L.fmtMXN(s.v) + '</td><td><button class="btn sm" data-act="abrirFila" data-id="' + p.id + '" aria-expanded="' + ab + '">Textos</button></td></tr>';
    if (ab) {
      const wa = L.waLink(w.meta.tel || '0000000000', p.producto, p.ref);
      r += '<tr><td colspan="10"><div class="grid g2">' + (p.canales || []).map(c => { const t = (p.textos || {})[c] || ''; const max = L.CANALES[c].max; return '<div class="field"><label for="tx-' + p.id + c + '">' + L.CANALES[c].nombre + '</label><textarea id="tx-' + p.id + c + '" rows="6" data-chg="texto" data-id="' + p.id + '" data-c="' + c + '">' + esc(t) + '</textarea><span class="counter' + (t.length > max ? ' bad' : '') + '">' + L.fmtInt(t.length) + ' de ' + L.fmtInt(max) + ' letras</span></div>'; }).join('') + '</div><div class="row" style="margin-top:12px">' + (w.meta.tel ? '<a class="btn sm" href="' + wa + '" target="_blank" rel="noopener" data-act="clicWa">Abrir enlace de WhatsApp</a><button class="btn sm" data-act="copiarWa" data-wa="' + esc(wa) + '" data-id="' + p.id + '">Copiar enlace</button>' : '') + '<button class="btn sm" data-act="regenerar" data-id="' + p.id + '">Regenerar textos con estos datos</button><button class="btn sm pri" data-act="regMsg" data-id="' + p.id + '">Registrar un mensaje de esta publicación</button></div>' + panelRes(w, p) + '</td></tr>';
    }
    return r;
  }).join('');
  const evs = (w.R.eventos || []).slice(-8).reverse();
  return '<div class="wrap stack" style="padding-top:20px"><section class="panel"><div class="phead"><div><h2>Publicaciones</h2><p class="muted" style="font-size:14px">' + L.fmtInt(lista.length) + ' publicaciones. Edita cualquier campo y se guarda al salir de la casilla. Precios con IVA incluido.</p></div><a class="btn pri" href="#crear">Crear publicación</a></div><div class="tw"><table><thead><tr><th></th><th>Publicación</th><th>Precio MXN</th><th>Fecha</th><th>Estado</th><th>Referencia</th><th class="r">Alcance</th><th class="r">Mensajes</th><th class="r">Ventas</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="10" class="empty">Aún no hay publicaciones.</td></tr>') + '</tbody></table></div></section>' +
    '<section class="panel"><h2>Importar resultados de las redes (CSV)</h2><p class="muted" style="margin:6px 0 12px">Columnas: referencia, canal, alcance, me_gusta, comentarios, guardados, clics (las últimas cinco son opcionales). Sirve para pegar lo que exportas de las estadísticas de cada red.</p><div class="field"><label for="imp-res">Pega tu CSV</label><textarea id="imp-res" rows="4" class="mono" placeholder="referencia,canal,alcance,me_gusta&#10;DD-100,Instagram,1250,87"></textarea><p class="err" id="er-imp" role="alert"></p></div><div class="row" style="margin-top:8px"><button class="btn pri" data-act="importarRes">Importar resultados</button><input type="file" id="imp-arch" accept=".csv,text/csv" data-chg="archivoRes" style="width:auto"></div></section>' +
    '<section class="panel"><h2>Eventos que registra Pregón</h2><p class="muted" style="margin:6px 0 12px">Solo lo necesario, sin IP ni datos personales. Los teléfonos y RFC se enmascaran.</p><div class="tw">' + tablaHtml(['Evento', 'Campos que guarda'], [['publicacion_creada', 'fecha y hora, publicación, canales, origen (formulario o CSV)'], ['enlace_wa_copiado', 'fecha y hora, publicación'], ['mensaje_recibido', 'fecha y hora, publicación, canal, estado de la República (opcional)'], ['venta_registrada', 'fecha y hora, publicación, monto MXN, forma de pago'], ['resultados_capturados', 'fecha y hora, publicación, canal (los números van en la propia publicación)']]) + '</div><h3 style="margin:16px 0 8px">Tus últimos eventos en este espacio</h3>' + (evs.length ? '<div class="tw">' + tablaHtml(['Cuándo', 'Evento', 'Detalle'], evs.map(e => [L.fmtTime(e.ts), e.tipo, [e.producto, e.canal, e.monto ? L.fmtMXN(e.monto) : '', e.pago].filter(Boolean).join(' · ')])) + '</div>' : '<p class="muted">Todavía no hay eventos tuyos. Crea una publicación o registra un mensaje.</p>') + '</section></div>';
};

/* ---- crear ---- */
const mañana = () => L.fmtDate(L.idxKey(HOY() + 1));
const FORM = () => {
  const m = metaDe(S.ws);
  return S.form || (S.form = { negocio: m.demo ? m.nombre : (m.nombre === 'Mi negocio' ? '' : m.nombre), ciudad: m.ciudad || '', tel: m.tel ? L.fmtTel(m.tel) : '', producto: 'Cajeta quemada 250 g', precio: '89.50', descripcion: 'Cajeta artesanal de Celaya, hecha con leche de cabra y cocida a fuego lento.', oferta: '', ocasion: 'quincena', tono: 'cercano', canales: ['instagram', 'whatsapp'], fecha: mañana(), hora: '12:00', spei: false, clabe: '', csv: 'producto,precio,descripcion\nCajeta envinada 250 g,118.90,Con un toque de vino\n"Obleas, caja de 12",145,\nGlorias de nuez,98.50,Nuez de la región' });
};
const campoErr = k => '<p class="err" id="er-' + k + '" role="alert"></p>';
const vistaCrear = () => {
  const f = FORM(); SC = SC || autoverificar();
  const inp = (id, label, val, extra = '') => '<div class="field"><label for="f-' + id + '">' + label + '</label><input id="f-' + id + '" value="' + esc(val) + '" ' + extra + '>' + campoErr(id) + '</div>';
  const panelSC = '<section class="panel" aria-label="Autoverificación"><div class="phead"><div><h2>Autoverificación</h2><p class="muted" style="font-size:14px">Prueba cada tipo de entrada con un ejemplo real y compara contra el resultado esperado.</p></div><div class="row"><span id="sc-badge">' + badgeSC() + '</span><button class="btn sm" data-act="reverificar">Volver a verificar</button></div></div><div id="sc-lista">' + listaSC() + '</div></section>';
  return '<div class="wrap stack" style="padding-top:20px"><div class="phead" style="margin-bottom:0"><div><h1 class="disp" style="font-size:32px">Crear publicaciones con enlace de WhatsApp</h1><p class="muted">Aceptamos: un producto por formulario, o hasta 50 productos pegando o subiendo un CSV (UTF-8, columnas producto y precio; opcionales descripcion y oferta; separado por comas o punto y coma).</p></div></div><div class="grid g2" style="align-items:start"><section class="panel stack"><div class="seg" role="group" aria-label="Tipo de entrada"><button data-act="tab" data-v="uno" aria-pressed="' + (S.tab === 'uno') + '">Un producto</button><button data-act="tab" data-v="csv" aria-pressed="' + (S.tab === 'csv') + '">Varios productos (CSV)</button></div>' +
    '<div class="grid g2">' + inp('negocio', 'Nombre de tu negocio', f.negocio) + inp('ciudad', 'Ciudad y estado (opcional)', f.ciudad, 'placeholder="Celaya, Guanajuato"') + inp('tel', 'WhatsApp del negocio (10 dígitos)', f.tel, 'inputmode="tel" placeholder="461 000 0123"') + '</div>' +
    (S.tab === 'uno' ? '<div class="grid g2">' + inp('producto', 'Producto o promoción', f.producto) + inp('precio', 'Precio en MXN, IVA incluido (opcional)', f.precio, 'inputmode="decimal"') + '</div><div class="field"><label for="f-descripcion">Descripción (opcional)</label><textarea id="f-descripcion" rows="2">' + esc(f.descripcion) + '</textarea>' + campoErr('descripcion') + '</div>' + inp('oferta', 'Oferta (opcional)', f.oferta, 'placeholder="Lleva 2 por $149.00"')
      : '<div class="field"><label for="f-csv">Pega tu CSV aquí</label><textarea id="f-csv" rows="7" class="mono">' + esc(f.csv) + '</textarea>' + campoErr('csv') + '</div><div class="field"><label for="f-archivo">…o elige un archivo .csv</label><input type="file" id="f-archivo" accept=".csv,text/csv" data-chg="archivo"></div>') +
    '<div class="grid g2"><div class="field"><label for="f-ocasion">Fecha especial</label><select id="f-ocasion">' + L.OCASIONES.map(o => '<option value="' + o.id + '"' + (f.ocasion === o.id ? ' selected' : '') + '>' + o.n + '</option>').join('') + '</select></div><div class="field"><label for="f-tono">Tono</label><select id="f-tono">' + [['cercano', 'Cercano'], ['formal', 'Formal'], ['divertido', 'Divertido']].map(([v, t]) => '<option value="' + v + '"' + (f.tono === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>' + inp('fecha', 'Fecha de publicación (DD/MM/AAAA)', f.fecha, 'inputmode="numeric"') + inp('hora', 'Hora (24 h, hora de la Ciudad de México)', f.hora, 'inputmode="numeric"') + '</div>' +
    '<fieldset style="border:1px solid var(--line);border-radius:10px;padding:10px 14px"><legend class="muted" style="font-size:14px">Canales</legend><div class="row">' + Object.entries(L.CANALES).map(([k, c]) => '<label style="display:flex;gap:8px;align-items:center;margin:0;color:var(--text)"><input type="checkbox" class="f-canal" value="' + k + '"' + (f.canales.includes(k) ? ' checked' : '') + '> ' + c.nombre + '</label>').join('') + '</div>' + campoErr('canales') + '</fieldset>' +
    '<label style="display:flex;gap:8px;align-items:center;margin:0;color:var(--text)"><input type="checkbox" id="f-spei"' + (f.spei ? ' checked' : '') + '> Incluir mi CLABE para pagos por transferencia SPEI</label><div id="bloque-clabe"' + (f.spei ? '' : ' hidden') + '>' + inp('clabe', 'CLABE (18 dígitos)', f.clabe, 'inputmode="numeric"') + '<p class="hint">Se escribe completa en el texto de la publicación para que te paguen; en pantalla la mostramos enmascarada.</p></div>' +
    '<div class="row"><button class="btn pri" data-act="generar">Generar vista previa</button></div></section>' +
    '<div class="stack"><section class="panel" aria-label="Vista previa"><div class="phead"><div><h2>Vista previa</h2><p class="muted" style="font-size:14px">Así quedarían tus textos en cada canal</p></div></div><div id="prev">' + prevHtml() + '</div></section>' + panelSC + '</div></div></div>';
};
const badgeSC = () => SC.ok ? '<span class="badge-ok">✓ Funciona</span>' : '<span class="badge-ok badge-no">✗ No pasa: ' + SC.casos.filter(c => !c.ok).length + ' prueba(s)</span>';
const listaSC = () => '<div class="tw"><table><thead><tr><th>Tipo</th><th>Resultado</th></tr></thead><tbody>' + SC.casos.map(c => '<tr><td>' + esc(c.tipo) + '</td><td class="' + (c.ok ? 'pass' : 'fail') + '"><b>' + (c.ok ? 'Aprobado' : 'Falló') + '</b>' + (c.ok ? '' : '<br><span class="muted">Esperado: ' + esc(JSON.stringify(c.esperado)) + '<br>Obtenido: ' + esc(JSON.stringify(c.obtenido)) + '</span>') + '</td></tr>').join('') + '</tbody></table></div>' + (SC.ok ? '' : '<p class="err">Las exportaciones están bloqueadas hasta que pasen todas las pruebas. Corrige las entradas marcadas como “Falló”.</p>');
const prevHtml = () => {
  if (!GEN) return '<p class="muted">Llena el formulario y toca “Generar vista previa”.</p>';
  const it = GEN.items[0]; const r = it.res;
  return '<p class="muted" style="margin-bottom:10px">' + (GEN.items.length > 1 ? 'Mostrando la primera de ' + GEN.items.length + ' publicaciones. ' : '') + 'Referencia <span class="mono">' + esc(r.ref) + '</span></p><div class="stack">' + r.resultados.map(x => '<div><div class="row" style="justify-content:space-between"><b>' + x.nombre + '</b><span class="counter' + (x.ok ? '' : ' bad') + '">' + L.fmtInt(x.largo) + ' de ' + L.fmtInt(x.max) + ' letras</span></div><div class="post-prev">' + esc(x.texto) + '</div><div class="row" style="margin-top:6px"><button class="btn sm" data-act="copiarTexto" data-c="' + x.canal + '">Copiar texto</button></div></div>').join('') + '</div><div class="row" style="margin-top:14px"><a class="btn sm" href="' + r.wa + '" target="_blank" rel="noopener" data-act="clicWa">Probar el enlace de WhatsApp</a><button class="btn sm" data-act="copiarWa" data-wa="' + esc(r.wa) + '">Copiar enlace</button>' + (Store.caps.sample ? '<button class="btn sm" data-act="ia">Reescribir con IA</button>' : '') + '</div>' +
    (GEN.items.length > 1 ? '<div class="tw" style="margin-top:12px">' + tablaHtml(['Producto', 'Precio', 'Referencia', 'Fecha'], GEN.items.map(x => [x.res.datos.producto, x.res.datos.precio === null ? 'Sin precio' : L.fmtMXN(x.res.datos.precio), x.res.ref, L.fmtDate(x.res.datos.fecha)])) + '</div>' : '') +
    '<div class="row" style="margin-top:14px"><button class="btn pri" data-act="guardarGen">Guardar en mi calendario</button></div><hr style="border:0;border-top:1px solid var(--line);margin:16px 0"><h3>Exportar</h3><p class="muted" style="font-size:14px;margin:4px 0 10px">' + (SC.ok ? 'CSV para tu calendario y Excel para tu contador (ventas con IVA desglosado de forma referencial).' : 'Bloqueada: la autoverificación no pasó.') + '</p><div class="row"><button class="btn sm" data-act="exp" data-t="csv"' + (SC.ok ? '' : ' disabled') + '>Calendario (CSV)</button><button class="btn sm" data-act="exp" data-t="xls"' + (SC.ok ? '' : ' disabled') + '>Para el contador (Excel)</button></div>';
};

/* ---- inicio ---- */
const vistaInicio = () => {
  SC = SC || autoverificar(); const w = getWS('demo'); const fin = HOY(); const c = agregar(w, fin - 29, fin, 'todos'); const p = agregar(w, fin - 59, fin - 30, 'todos'); const hp = heatPanel(c, 'h0', true);
  const ej = L.generar({ negocio: DEMO_META.nombre, ciudad: DEMO_META.ciudad, tel: DEMO_META.tel, producto: 'Cajeta quemada 250 g', precio: 89.5, descripcion: 'Cajeta artesanal de Celaya, hecha con leche de cabra.', ocasion: 'quincena', tono: 'cercano', canales: ['instagram'], fecha: '20/11/2026', hora: '12:00', ref: 'DD-100' });
  const r = ej.resultados[0];
  const pasos = [['1', 'Crea tu publicación', 'Escribes el producto y el precio. Pregón arma el texto para cada red y un enlace de WhatsApp con un código propio.'], ['2', 'Registra lo que llega', 'Cuando alguien escribe con tu código, lo anotas en dos toques: canal, estado y si compró.'], ['3', 'Mira qué te vende', 'El mapa de calor te dice cuándo te escriben y el ranking, qué publicación trae el dinero.']];
  const prec = PLANES.map(pl => '<div class="panel plan"><h3>' + pl.n + '</h3><div class="pr num">' + L.fmtMXN(pl.mes) + '<span class="muted" style="font:400 15px var(--body)"> al mes</span></div><span class="muted" style="font-size:13px">IVA incluido · Disponible pronto</span><p class="muted" style="font-size:14px">' + pl.para + '</p></div>').join('');
  return '<div class="wrap"><section class="hero"><div><span class="chip acc">Para negocios que venden por WhatsApp</span><h1 style="margin-top:14px">Sabe qué publicación te trae las ventas por WhatsApp</h1><p class="sub">Crea tus textos para Instagram, Facebook, TikTok y WhatsApp Estado con un enlace que identifica cada publicación, y mira cuándo te escriben tus clientes.</p><div class="row"><a class="btn pri" href="#demo" data-act="irDemo">Abrir el demo en vivo</a><a class="btn" href="#crear">Crear una publicación gratis</a></div><p class="hint" style="margin-top:12px">Sin registro y sin tarjeta. Los datos del demo son de un negocio ficticio.</p></div>' +
    '<div class="stack"><section class="panel" aria-label="Mapa de calor de ejemplo"><div class="phead"><div><h2>Cuándo te escriben</h2><p class="muted" style="font-size:14px">Ejemplo con datos demo, últimos 30 días</p></div><span class="chip acc">Demo</span></div>' + hp.c + '</section>' +
    '<section class="panel" aria-label="Ejemplo que funciona"><div class="phead"><h3>Ejemplo que funciona</h3><span>' + badgeSC() + '</span></div><div class="post-prev">' + esc(r.texto) + '</div><p class="hint">' + L.fmtInt(r.largo) + ' de ' + L.fmtInt(r.max) + ' letras en Instagram. Enlace de WhatsApp: <a href="' + ej.wa + '" target="_blank" rel="noopener" data-act="clicWa">probarlo</a></p></section></div></section>' +
    '<section class="sec"><h2>Qué hace</h2><p class="lead">Pregón no promete alcance ni “viralidad”. Te dice, con tus propios registros, qué publicaciones se convierten en mensajes y ventas.</p><div class="grid g3">' + pasos.map(x => '<div class="panel step"><b>' + x[0] + '</b><h3 style="margin:6px 0">' + x[1] + '</h3><p class="muted">' + x[2] + '</p></div>').join('') + '</div></section>' +
    '<section class="sec"><h2>Vista previa del tablero</h2><p class="lead">Son los mismos componentes del demo, con datos ficticios de Cajetas y Dulces Doña Chela.</p><div class="stack">' + kpiTiles(c, p) + '<div class="grid main2">' + rankingPanel(w, c) + feedPanel(w, false) + '</div><div><a class="btn pri" href="#demo" data-act="irDemo">Abrir el demo en vivo</a></div></div></section>' +
    '<section class="sec"><h2>Precios</h2><p class="lead">Tres planes con IVA incluido. Hoy abrimos un Plan Fundador de 20 lugares.</p><div class="grid g3">' + prec + '</div><p style="margin-top:16px"><a class="btn" href="#precios">Ver precios y Plan Fundador</a></p></section></div>' + footer();
};

/* ---- precios ---- */
const fundadorUrl = () => Store.getConfig().FOUNDER_PAYMENT_URL || '';
const vistaPrecios = () => {
  const cfg = Store.getConfig(); const rest = Math.max(0, cfg.FOUNDER_SEATS - cfg.FOUNDER_SOLD); const url = fundadorUrl();
  const ok = url && /^https:\/\/wa\.me\//.test(url);
  const precio = pl => S.anual ? pl.mes * 10 : pl.mes;
  const tablaC = [['Negocios', '1', '3', '10'], ['Publicaciones al mes', '20', '80', 'Sin límite'], ['Canales', '2', '5', '5'], ['Productos por CSV', '10', '50', '50'], ['Mensajes registrados al mes', '100', '1,000', 'Sin límite'], ['Historial', '30 días', '12 meses', '24 meses'], ['Mapa de calor por hora', 'Sí', 'Sí', 'Sí'], ['Plantillas de WhatsApp editables', '3', 'Sin límite', 'Sin límite'], ['Exportar', 'CSV', 'CSV y Excel', 'CSV y Excel'], ['Usuarios', '1', '3', '10'], ['Soporte', 'Correo', 'WhatsApp', 'WhatsApp prioritario']];
  const faq = [['¿Me dan factura de la suscripción?', 'Sí. Cuando lancemos emitiremos tu factura (CFDI) con tu RFC y régimen fiscal. Hoy el timbrado no está conectado, por eso el Plan Fundador es un apartado con garantía de reembolso y todavía no se factura.'], ['¿Qué métodos de pago aceptan?', 'Por ahora, transferencia bancaria (SPEI), que cerramos por chat. Más adelante agregaremos pago con tarjeta.'], ['¿Qué incluye el Plan Fundador?', 'El plan Negocio completo a ' + L.fmtMXN(FOUNDER_MES) + ' al mes, IVA incluido, mientras mantengas tu suscripción, y acceso antes que nadie. Son ' + cfg.FOUNDER_SEATS + ' lugares.'], ['¿Cómo cancelo?', 'Cuando quieras, escribiéndonos por WhatsApp. Conservas tu acceso hasta el fin del periodo pagado y puedes exportar tus datos en CSV y Excel.']];
  return '<div class="wrap" style="padding-top:28px"><h1 class="disp" style="font-size:clamp(30px,4.5vw,44px)">Precios en pesos, con IVA incluido</h1><p class="muted" style="margin:8px 0 22px">Los planes regulares todavía no están disponibles. El Plan Fundador sí.</p>' +
    '<section class="panel founder stack" aria-label="Plan Fundador"><div class="row" style="justify-content:space-between"><div><span class="chip acc">Plan Fundador</span><h2 style="margin-top:10px;font-size:28px">' + L.fmtMXN(FOUNDER_MES) + ' al mes, de por vida</h2><p class="muted">IVA incluido. Es el plan Negocio con ' + descuentoFundador() + ' % de descuento sobre ' + L.fmtMXN(PLANES[1].mes) + ' al mes.</p></div><div style="text-align:right"><div class="disp num" style="font-size:40px;color:var(--accent)" id="lugares">' + rest + '</div><span class="muted">de ' + cfg.FOUNDER_SEATS + ' lugares disponibles</span></div></div>' +
    '<div><a class="btn pri" id="btn-fundador" ' + (ok ? 'href="' + esc(url) + '" target="_blank" rel="noopener" data-act="clicPago"' : 'aria-disabled="true" data-act="nada" role="button"') + '>' + (ok ? 'Apartar mi lugar por WhatsApp' : 'Enlace pendiente') + '</a><p class="hint" style="margin-top:8px">Te respondemos en horario laboral y cobramos por transferencia bancaria</p></div><p><b>Si no lanzamos en 60 días, te devolvemos el 100 %.</b></p><p class="hint">El contador baja solo cuando se confirma un pago: lo actualiza una persona, no un temporizador.</p></section>' +
    '<div class="row" style="margin:26px 0 14px;justify-content:center"><div class="seg" role="group" aria-label="Periodo de cobro"><button data-act="ciclo" data-v="mes" aria-pressed="' + !S.anual + '">Mensual</button><button data-act="ciclo" data-v="anual" aria-pressed="' + S.anual + '">Anual: 2 meses gratis</button></div></div>' +
    '<div class="grid g3">' + PLANES.map(pl => '<div class="panel plan"><h2>' + pl.n + '</h2><div class="pr num">' + L.fmtMXN(precio(pl)) + '<span class="muted" style="font:400 15px var(--body)"> ' + (S.anual ? 'al año' : 'al mes') + '</span></div><span class="muted" style="font-size:13px">IVA incluido' + (S.anual ? ' · ' + L.fmtMXN(pl.mes * 10 / 12) + ' al mes' : '') + '</span><p class="muted">' + pl.para + '</p><ul>' + pl.f.slice(0, 5).map(x => '<li>· ' + x + '</li>').join('') + '</ul><a class="btn" href="#demo" data-act="irDemo">Disponible pronto</a></div>').join('') + '</div>' +
    '<section class="panel" style="margin-top:16px"><h2 style="margin-bottom:12px">Compara los planes</h2><div class="tw">' + tablaHtml(['', 'Arranque', 'Negocio', 'Crece'], tablaC) + '</div></section>' +
    '<section class="panel" style="margin-top:16px"><h2 style="margin-bottom:6px">Preguntas frecuentes</h2>' + faq.map(([q, a]) => '<details class="faq"><summary>' + q + '</summary><p>' + a + '</p></details>').join('') + '<p class="muted" style="margin-top:14px">Si cancelas, pierdes el precio de fundador y el acceso al terminar el periodo pagado. No hay cobros después.</p></section></div>' + footer();
};

/* ---- métricas ---- */
const MET = { filas: null, fuente: '' };
const vistaMetricas = () => {
  const permitido = Store.caps.owner || !Store.caps.platform;
  if (!permitido) return '<div class="wrap" style="padding-top:28px"><div class="panel empty"><h2>Acceso restringido</h2><p style="margin-top:8px">Esta página es solo para quien administra Pregón. ' + (Store.caps.listo ? 'Entra con la cuenta dueña del artefacto.' : 'Verificando tu acceso…') + '</p></div></div>' + footer();
  if (!MET.filas) { Store.leerMetricas().then(r => { MET.filas = r.filas; MET.fuente = r.fuente; if (S.route === 'metricas') render(); }); return '<div class="wrap" style="padding-top:28px"><p class="muted">Cargando métricas…</p></div>'; }
  const dias = {}; const T = { visita: 0, demo: 0, uso: 0, pago: 0, wa: 0 }; const orig = {};
  MET.filas.forEach(f => { const d = L.idxKey(L.mx(f.t).di); const o = dias[d] || (dias[d] = { visita: 0, demo: 0, uso: 0, pago: 0, wa: 0 }); if (o[f.tipo] !== undefined) { o[f.tipo]++; T[f.tipo]++; } if (f.tipo === 'visita') { const k = (f.src || 'directo / no disponible') + ' · ' + (f.camp || '—'); orig[k] = (orig[k] || 0) + 1; } });
  const lista = Object.keys(dias).sort().reverse(); const cfg = Store.getConfig();
  const pct = (a, b) => b ? L.fmtPct(a / b * 100) : 'No disponible';
  return '<div class="wrap stack" style="padding-top:20px"><h1 class="disp" style="font-size:32px">Métricas de validación</h1><p class="muted">Fuente: ' + esc(MET.fuente) + '. Sin IP ni datos personales.' + (Store.caps.platform ? '' : ' (Modo local, sin plataforma: solo ves los registros de este navegador.)') + '</p>' +
    '<div class="grid g4">' + [['Visitas', T.visita], ['Aperturas del demo', T.demo], ['Usos completados', T.uso], ['Clics al Plan Fundador', T.pago], ['Clics a WhatsApp', T.wa]].map(x => '<div class="panel kpi"><span class="muted">' + x[0] + '</span><div class="v num">' + L.fmtInt(x[1]) + '</div></div>').join('') + '</div>' +
    '<div class="grid g2"><section class="panel"><h2>Embudo</h2>' + barras([['Visitas', T.visita], ['Usos de la herramienta', T.uso], ['Clics al Plan Fundador', T.pago]], null) + '<p class="hint">Visita → uso: ' + pct(T.uso, T.visita) + ' · uso → clic en pago: ' + pct(T.pago, T.uso) + '</p></section>' +
    '<section class="panel stack"><h2>Plan Fundador</h2><div class="field"><label for="m-vend">Lugares vendidos (los actualizas a mano)</label><input id="m-vend" inputmode="numeric" value="' + cfg.FOUNDER_SOLD + '"></div><div class="field"><label for="m-url">Enlace de WhatsApp (https://wa.me/52…?text=…)</label><input id="m-url" value="' + esc(cfg.FOUNDER_PAYMENT_URL || '') + '" placeholder="https://wa.me/52XXXXXXXXXX?text=Quiero%20apartar%20mi%20lugar"></div><button class="btn pri" data-act="guardarCfg">Guardar</button><p class="err" id="er-cfg"></p></section></div>' +
    '<section class="panel"><h2>Por día</h2><div class="tw">' + tablaHtml(['Fecha', 'Visitas', 'Demo', 'Usos', 'Clic Fundador', 'Clic WhatsApp'], lista.map(d => [L.fmtDate(d), dias[d].visita, dias[d].demo, dias[d].uso, dias[d].pago, dias[d].wa])) + '</div></section>' +
    '<section class="panel"><h2>Origen de las visitas</h2><div class="tw">' + tablaHtml(['utm_source · utm_campaign', 'Visitas'], Object.entries(orig).sort((a, b) => b[1] - a[1]).slice(0, 15)) + '</div></section></div>' + footer();
};

/* ---- enrutador y eventos ---- */
const VIEWS = { inicio: vistaInicio, demo: vistaDemo, publicaciones: vistaPublicaciones, crear: vistaCrear, precios: vistaPrecios, metricas: vistaMetricas };
const UTM = (() => { try { const q = new URLSearchParams(location.search); return { src: q.get('utm_source') || '', camp: q.get('utm_campaign') || '' }; } catch (e) { return { src: '', camp: '' }; } })();
const toast = (t, ms = 3200) => { const e = $('#toast'); e.textContent = t; e.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => e.style.display = 'none', ms); };
const render = () => {
  const y = S.keep ? scrollY : 0; CHARTS = {};
  const v = VIEWS[S.route] || vistaInicio;
  $('#app').innerHTML = encabezado() + '<main id="main">' + v() + '</main>';
  document.title = 'Pregón';
  if (S.flash) { const c = document.querySelector('.heat [data-dow="' + S.flash.dow + '"][data-h="' + S.flash.h + '"]'); if (c) c.classList.add('flash'); S.flash = null; }
  S.nuevoId = null; scrollTo(0, y); S.keep = false;
};
const ruta = () => {
  const h = (location.hash || '#inicio').slice(1) || 'inicio';
  if (h.startsWith('e-')) { S.ws = h.slice(2); S.route = 'demo'; Store.traerEspacioRemoto(S.ws).then(r => { if (r && !getReal(S.ws).posts.length && !getReal(S.ws).meta) { REALS[S.ws] = Object.assign(Store.vacio(), r); Store.ls.set('pregon:v1:ws:' + S.ws, REALS[S.ws]); render(); } }); }
  else { S.route = VIEWS[h] ? h : 'inicio'; if (h === 'demo') S.ws = 'demo'; }
  S.form = S.form; render();
  Store.track({ tipo: 'visita', pagina: S.route, src: UTM.src, camp: UTM.camp });
  if (S.route === 'demo') Store.track({ tipo: 'demo', pagina: S.route, src: UTM.src, camp: UTM.camp });
};

const leerForm = () => {
  const f = FORM(); const g = id => { const e = $('#f-' + id); return e ? e.value : f[id]; };
  ['negocio', 'ciudad', 'tel', 'producto', 'precio', 'descripcion', 'oferta', 'ocasion', 'tono', 'fecha', 'hora', 'clabe', 'csv'].forEach(k => { const e = $('#f-' + k); if (e) f[k] = e.value; });
  f.canales = [...document.querySelectorAll('.f-canal:checked')].map(e => e.value); const sp = $('#f-spei'); if (sp) f.spei = sp.checked;
  return f;
};
const mostrarErrores = errs => { document.querySelectorAll('[id^="er-"]').forEach(e => e.textContent = ''); Object.entries(errs).forEach(([k, m]) => { const e = $('#er-' + k); if (e) e.textContent = m; }); const p = document.querySelector('.err:not(:empty)'); if (p) p.scrollIntoView({ block: 'center' }); };
const copiar = async (t, ok = 'Copiado.') => { try { await navigator.clipboard.writeText(t); toast(ok); } catch (e) { modal('<h2>Copia el texto</h2><textarea rows="6" id="m-copia" readonly>' + esc(t) + '</textarea><div class="row" style="margin-top:12px"><button class="btn" data-act="cerrar">Cerrar</button></div>'); const x = $('#m-copia'); if (x) { x.focus(); x.select(); } } };
const modal = html => { cerrar(); const d = document.createElement('div'); d.className = 'veil'; d.id = 'veil'; d.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>'; document.body.appendChild(d); const f = d.querySelector('input,select,textarea,button'); if (f) f.focus(); };
const cerrar = () => { const v = $('#veil'); if (v) v.remove(); };

const generarDesdeForm = () => {
  const f = leerForm(); const base = { negocio: f.negocio, ciudad: f.ciudad, tel: f.tel, ocasion: f.ocasion, tono: f.tono, canales: f.canales, hora: f.hora, spei: f.spei, clabe: f.clabe };
  let prods;
  if (S.tab === 'csv') { const r = L.importarCSV(f.csv); if (!r.ok) { mostrarErrores({ csv: r.errores.join(' ') }); return; } prods = r.productos; }
  else prods = [{ producto: f.producto, precio: f.precio, descripcion: f.descripcion, oferta: f.oferta }];
  const f0 = L.parseDate(f.fecha); const items = [];
  for (let i = 0; i < prods.length; i++) {
    const fecha = f0 ? L.idxKey(L.keyIdx(f0) + i) : f.fecha;
    const res = L.generar(Object.assign({}, base, prods[i], { fecha, precio: prods[i].precio === null ? '' : prods[i].precio }));
    if (!res.ok) { mostrarErrores(S.tab === 'csv' ? { csv: 'Producto ' + (i + 1) + ': ' + Object.values(res.errores).join(' ') } : res.errores); return; }
    items.push({ res, input: Object.assign({}, base, prods[i], { fecha }) });
  }
  mostrarErrores({}); GEN = { items, origen: S.tab === 'csv' ? 'csv' : 'formulario' }; $('#prev').innerHTML = prevHtml();
  Store.track({ tipo: 'uso', pagina: 'crear', src: UTM.src, camp: UTM.camp });
  const largo = items.some(x => !x.res.todoOk); if (largo) toast('Un texto pasa el límite de su red. Acorta la descripción.');
};

const ACT = {
  nada: () => toast('Todavía no hay enlace de pago. Vuelve pronto.'),
  irDemo: () => { S.ws = 'demo'; },
  rango: t => { S.rango = t.dataset.v; if (S.rango === 'custom' && !S.custom) { const f = HOY(); S.custom = { a: f - 13, b: f }; } S.keep = true; render(); },
  metrica: t => { S.metrica = t.dataset.v; S.keep = true; render(); },
  aplicarCustom: () => { const a = L.parseDate($('#c-de').value), b = L.parseDate($('#c-a').value); const er = $('#aviso-custom'); if (!a || !b) { er.textContent = 'Escribe las fechas como DD/MM/AAAA, por ejemplo 01/10/2026.'; return; } const ia = L.keyIdx(a), ib = L.keyIdx(b); if (ia > ib) { er.textContent = 'La fecha “Desde” debe ser anterior a “Hasta”.'; return; } if (ib - ia > 365) { er.textContent = 'El periodo máximo es de 366 días.'; return; } S.custom = { a: ia, b: ib }; S.keep = true; render(); },
  tabla: t => { const id = t.dataset.for, tb = $('#t-' + id), v = $('#v-' + id); const abre = tb.hidden; tb.hidden = !abre; v.hidden = abre; t.textContent = abre ? 'Ver la gráfica' : 'Ver la tabla'; t.setAttribute('aria-expanded', String(abre)); },
  tab: t => { S.tab = t.dataset.v; leerForm(); S.keep = true; render(); },
  generar: generarDesdeForm,
  reverificar: () => { SC = autoverificar(); $('#sc-badge').innerHTML = badgeSC(); $('#sc-lista').innerHTML = listaSC(); if (GEN) $('#prev').innerHTML = prevHtml(); toast(SC.ok ? 'Funciona: todas las pruebas pasaron.' : 'Hay pruebas que fallaron.'); },
  copiarTexto: t => { const x = GEN.items[0].res.resultados.find(r => r.canal === t.dataset.c); copiar(x.texto, 'Texto copiado.'); },
  copiarWa: t => { Store.track({ tipo: 'wa', pagina: S.route }); if (t.dataset.id) { evento('enlace_wa_copiado', { postId: t.dataset.id }); guardar(); } copiar(t.dataset.wa, 'Enlace copiado.'); },
  clicWa: () => Store.track({ tipo: 'wa', pagina: S.route }),
  clicPago: () => Store.track({ tipo: 'pago', pagina: 'precios', src: UTM.src, camp: UTM.camp }),
  ciclo: t => { S.anual = t.dataset.v === 'anual'; S.keep = true; render(); },
  abrirFila: t => { S.open = S.open === t.dataset.id ? null : t.dataset.id; S.keep = true; render(); },
  guardarGen: () => {
    if (!GEN) return; const R = getReal(S.ws); const f = leerForm();
    if (S.ws !== 'demo') R.meta = Object.assign({ id: S.ws, demo: false }, R.meta, { nombre: f.negocio, ciudad: f.ciudad, tel: GEN.items[0].res.datos.tel });
    GEN.items.forEach((it, i) => { const d = it.res.datos; const textos = {}; it.res.resultados.forEach(x => textos[x.canal] = x.texto); const id = 'r' + Date.now().toString(36) + i; R.posts.push({ id, producto: d.producto, categoria: d.ocasion === 'ninguna' ? 'Producto' : 'Temporada', precio: d.precio, canales: d.canales, fecha: d.fecha, hora: d.hora, kind: adivinaKind(d.producto), ref: it.res.ref, estado: 'Lista para publicar', textos, creado: Date.now() + i, origen: GEN.origen }); S.nuevoId = id; evento('publicacion_creada', { postId: id, producto: d.producto, canal: d.canales.join(','), origen: GEN.origen }); });
    guardar(); toast('Guardada. Ya aparece en la actividad en vivo y en Publicaciones.'); GEN = null; $('#prev').innerHTML = prevHtml(); S.pendienteFeed = true;
  },
  exp: async t => {
    if (!SC.ok) return toast('Exportación bloqueada: la autoverificación no pasó.'); const w = getWS(S.ws); const tipo = t.dataset.t;
    const cal = []; w.posts.forEach(p => (p.canales || []).forEach(c => cal.push(L.filaCalendario(p, L.CANALES[c].nombre, (p.textos || {})[c] || ''))));
    let nombre, cont, mime;
    if (tipo === 'csv') { nombre = 'pregon-calendario.csv'; cont = L.aCSV(L.COLS_CAL, cal); mime = 'text/csv;charset=utf-8'; }
    else { const fin = HOY(); const ventas = w.msgs.filter(m => m.venta > 0 && m.di > fin - 90).sort((a, b) => a.ts - b.ts).map(m => L.filaVenta(Object.assign({}, m, { canal: L.CANALES[m.canal].nombre }), w.byId[m.postId])); nombre = 'pregon-contador.xls'; cont = L.aExcel([{ nombre: 'Calendario', cols: L.COLS_CAL, filas: cal }, { nombre: 'Ventas (90 días)', cols: L.COLS_VENTAS, filas: ventas, dinero: [4, 5, 6] }]); mime = 'application/vnd.ms-excel'; }
    const r = await Store.descargar(nombre, cont, mime);
    if (r !== 'guardado') copiar(cont, 'Tu navegador no permite descargar aquí. Copié el contenido: pégalo en un archivo ' + nombre.split('.').pop() + '.'); else toast('Archivo listo: ' + nombre);
  },
  ia: async () => {
    const s = Store.caps.sample; if (!s || !GEN) return; const it = GEN.items[0]; const orig = it.res.resultados; toast('Reescribiendo…', 8000);
    try {
      const pedido = 'Reescribe estas publicaciones de redes sociales en español de México, con tono ' + it.input.tono + ', sin inventar precios ni datos. Conserva exactamente los enlaces, el código de referencia ' + it.res.ref + ' y los precios. Devuelve solo JSON con las llaves ' + JSON.stringify(orig.map(x => x.canal)) + ' y el texto de cada una. Límites de letras: ' + JSON.stringify(Object.fromEntries(orig.map(x => [x.canal, x.max]))) + '. Textos: ' + JSON.stringify(Object.fromEntries(orig.map(x => [x.canal, x.texto])));
      const j = await s.json(pedido, { modelTier: 'quick' }); let cambios = 0;
      orig.forEach(x => { const n = j && j[x.canal]; if (typeof n === 'string' && n.length <= x.max && n.includes(it.res.ref) && (!it.res.datos.precio || n.includes(L.fmtMXN(it.res.datos.precio)))) { x.texto = n; x.largo = n.length; x.ok = true; cambios++; } });
      $('#prev').innerHTML = prevHtml(); toast(cambios ? 'Listo: reescribí ' + cambios + ' texto(s) y verifiqué límites, precio y referencia.' : 'La IA no devolvió textos válidos. Dejé los originales.');
    } catch (e) { toast('No pude usar la IA ahora. Dejé los textos originales.'); }
  },
  regenerar: t => {
    const w = getWS(S.ws); const p = w.byId[t.dataset.id]; if (!w.meta.tel) return toast('Primero guarda una publicación con tu WhatsApp en “Crear”.');
    const g = L.generar({ negocio: w.meta.nombre, ciudad: w.meta.ciudad, tel: w.meta.tel, producto: p.producto, precio: p.precio === null ? '' : p.precio, ocasion: OCASION_DE[p.producto] || 'ninguna', tono: 'cercano', canales: p.canales, fecha: p.fecha, hora: p.hora || '12:00', ref: p.ref });
    if (!g.ok) return toast(Object.values(g.errores)[0]); const textos = {}; g.resultados.forEach(x => textos[x.canal] = x.texto); setCampo(p.id, 'textos', textos); S.keep = true; render(); toast('Textos regenerados.');
  },
  regMsg: t => {
    const w = getWS(S.ws); if (!w.posts.length) return toast('Primero crea una publicación.'); const sel = t.dataset.id || w.posts.slice().sort((a, b) => b.fecha.localeCompare(a.fecha))[0].id;
    modal('<h2>Registrar un mensaje</h2><p class="muted" style="margin:4px 0 12px">Sin teléfono ni nombre del cliente. Solo lo necesario para medir.</p><div class="stack"><div class="field"><label for="r-post">Publicación</label><select id="r-post">' + w.posts.map(p => '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.producto) + ' (' + esc(p.ref) + ')</option>').join('') + '</select></div><div class="field"><label for="r-canal">Canal</label><select id="r-canal">' + Object.entries(L.CANALES).map(([k, c]) => '<option value="' + k + '">' + c.nombre + '</option>').join('') + '</select></div><div class="field"><label for="r-estado">Estado de la República (opcional)</label><select id="r-estado"><option value="">No sé</option>' + L.ESTADOS.map(e => '<option>' + e + '</option>').join('') + '</select></div><label style="display:flex;gap:8px;align-items:center;margin:0;color:var(--text)"><input type="checkbox" id="r-venta"> Hubo venta</label><div id="r-vbloque" hidden class="stack"><div class="field"><label for="r-monto">Monto en MXN, IVA incluido</label><input id="r-monto" inputmode="decimal" placeholder="277.50"></div><div class="field"><label for="r-pago">Forma de pago</label><select id="r-pago"><option>SPEI</option><option>Tarjeta (enlace de pago)</option><option>Depósito en tienda</option><option>Contra entrega</option></select></div></div><p class="err" id="r-err" role="alert"></p><div class="row"><button class="btn pri" data-act="guardarMsg">Guardar</button><button class="btn" data-act="cerrar">Cancelar</button></div></div>');
  },
  guardarMsg: () => {
    const w = getWS(S.ws); const postId = $('#r-post').value; const canal = $('#r-canal').value; const hay = $('#r-venta').checked; let monto = 0;
    if (hay) { monto = L.parseMoney($('#r-monto').value); if (!monto || monto <= 0) { $('#r-err').textContent = 'El monto no es válido. Escribe solo números, por ejemplo 277.50.'; return; } }
    const now = Date.now(), t = L.mx(now); const m = { id: 'x' + now.toString(36), postId, canal, ts: now, di: t.di, h: t.h, dow: t.dow, estado: $('#r-estado').value, venta: monto, pago: hay ? $('#r-pago').value : '', real: true };
    w.R.msgs.push(m); evento('mensaje_recibido', { postId, canal, producto: w.byId[postId].producto }); if (hay) evento('venta_registrada', { postId, monto, pago: m.pago, producto: w.byId[postId].producto }); guardar();
    cerrar(); S.flash = { dow: t.dow, h: t.h }; S.nuevoId = m.id; S.keep = true; render(); toast(hay ? 'Venta registrada. Ya está en la actividad en vivo.' : 'Mensaje registrado. Ya está en la actividad en vivo.');
  },
  cerrar,
  importarRes: () => {
    const w = getWS(S.ws); const refs = w.posts.map(p => p.ref); const r = L.importarResultadosCSV($('#imp-res').value, refs); const er = $('#er-imp');
    const errs = [...r.errores]; const ok = [];
    r.filas.forEach(f => { const p = w.posts.find(x => x.ref === f.ref); if (!p.canales.includes(f.canal)) errs.push('La publicación ' + f.ref + ' no se publicó en ' + L.CANALES[f.canal].nombre + '.'); else ok.push([p, f]); });
    if (errs.length) { er.textContent = errs.slice(0, 4).join(' ') + (errs.length > 4 ? ' (y ' + (errs.length - 4) + ' más)' : ''); return; }
    if (!ok.length) { er.textContent = 'No hay filas para importar.'; return; }
    er.textContent = ''; const R = getReal(S.ws); ok.forEach(([p, f]) => { const k = p.id + '|' + f.canal; const ex = w.met[k] || {}; R.metricas[k] = Object.assign({}, ex, { alcance: f.alcance, likes: f.likes, comentarios: f.comentarios, guardados: f.guardados, clics: f.clics }, { demo: false }); evento('resultados_capturados', { postId: p.id, canal: f.canal, producto: p.producto }); }); guardar(); S.keep = true; render(); toast('Importé ' + ok.length + ' resultado(s).');
  },
  crearMio: () => {
    const b = new Uint8Array(10); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => b[i] = Math.random() * 256); const A = 'abcdefghjkmnpqrstuvwxyz23456789'; const tok = [...b].map(x => A[x % A.length]).join('');
    const R = Store.cargarEspacio(tok); R.meta = { id: tok, demo: false, nombre: 'Mi negocio', ciudad: '', tel: '' }; REALS[tok] = R; Store.guardarEspacio(tok, R); location.hash = 'e-' + tok; setTimeout(() => ACT.verEnlace(), 50);
  },
  verEnlace: () => {
    const url = location.href.split('#')[0] + '#e-' + S.ws; const wa = 'https://wa.me/?text=' + encodeURIComponent('Mi espacio privado en Pregón: ' + url);
    modal('<h2>Tu enlace secreto</h2><p class="muted" style="margin:6px 0 12px">Quien tenga este enlace entra a tu espacio, sin contraseña. Guárdalo o mándalo a tu WhatsApp. ' + (Store.caps.db ? '' : 'Ojo: sin base de datos, tus datos viven solo en este navegador.') + '</p><input readonly id="m-url" value="' + esc(url) + '"><div class="row" style="margin-top:12px"><button class="btn pri" data-act="copiarUrl" data-u="' + esc(url) + '">Copiar enlace</button><a class="btn" href="' + wa + '" target="_blank" rel="noopener" data-act="clicWa">Enviarlo por WhatsApp</a><button class="btn" data-act="cerrar">Cerrar</button></div>');
  },
  copiarUrl: t => copiar(t.dataset.u, 'Enlace copiado.'),
  guardarCfg: async () => {
    const v = parseInt($('#m-vend').value, 10); const u = $('#m-url').value.trim(); const er = $('#er-cfg');
    if (!(v >= 0 && v <= CONFIG.FOUNDER_SEATS)) { er.textContent = 'Los lugares vendidos deben ser un número entre 0 y ' + CONFIG.FOUNDER_SEATS + '.'; return; }
    if (u && !/^https:\/\/wa\.me\/\d+/.test(u)) { er.textContent = 'El enlace debe empezar con https://wa.me/ y el número con lada, por ejemplo https://wa.me/52XXXXXXXXXX?text=…'; return; }
    er.textContent = ''; const ok = await Store.guardarConfig({ FOUNDER_SOLD: v, FOUNDER_PAYMENT_URL: u }); toast(ok ? 'Guardado.' : 'No pude guardar en la base de datos.');
  }
};
const setCampo = (id, campo, valor) => { const R = getReal(S.ws); const p = R.posts.find(x => x.id === id); if (p) p[campo] = valor; else (R.edits[id] = R.edits[id] || {})[campo] = valor; guardar(); };
const CHG = {
  canal: t => { S.canal = t.value; S.keep = true; render(); },
  comparar: t => { S.comparar = t.checked; S.keep = true; render(); },
  archivo: t => { const f = t.files[0]; if (!f) return; if (f.size > 500000) return toast('El archivo es muy grande. El máximo es 500 KB.'); const r = new FileReader(); r.onload = () => { FORM().csv = String(r.result); S.keep = true; render(); toast('Archivo cargado: ' + f.name); }; r.readAsText(f, 'utf-8'); },
  edit: t => {
    const id = t.dataset.id, f = t.dataset.f, v = t.value.trim(); let val = v;
    if (f === 'precio') { val = v === '' ? null : L.parseMoney(v); if (v !== '' && (val === null || val <= 0)) { toast('El precio no es válido. Escribe solo números, por ejemplo 120 o 120.50.'); S.keep = true; return render(); } }
    if (f === 'fecha') { val = L.parseDate(v); if (!val) { toast('La fecha debe ir como DD/MM/AAAA, por ejemplo 20/11/2026.'); S.keep = true; return render(); } }
    if (f === 'producto' && (v.length < 2 || v.length > 80)) { toast('El nombre debe tener entre 2 y 80 letras.'); S.keep = true; return render(); }
    setCampo(id, f, val); toast('Guardado.');
  },
  archivoRes: t => { const f = t.files[0]; if (!f) return; if (f.size > 500000) return toast('El archivo es muy grande. El máximo es 500 KB.'); const r = new FileReader(); r.onload = () => { $('#imp-res').value = String(r.result); toast('Archivo cargado: ' + f.name + '. Toca “Importar resultados”.'); }; r.readAsText(f, 'utf-8'); },
  res: t => {
    const p = L.parseEntero(t.value); if (!p.ok) { toast('Escribe solo un número entero, por ejemplo 1250, o deja la casilla vacía.'); S.keep = true; return render(); }
    const w = getWS(S.ws); const R = getReal(S.ws); const k = t.dataset.id + '|' + t.dataset.c; const ex = w.met[k] || {};
    R.metricas[k] = Object.assign({}, ex, { [t.dataset.f]: p.v, demo: false }); evento('resultados_capturados', { postId: t.dataset.id, canal: t.dataset.c, producto: w.byId[t.dataset.id].producto }); guardar(); toast('Resultado guardado.');
  },
  texto: t => { const w = getWS(S.ws); const p = w.byId[t.dataset.id]; const c = t.dataset.c; const max = L.CANALES[c].max; if (t.value.length > max) { toast('El texto pasa el límite de ' + L.CANALES[c].nombre + ' (' + L.fmtInt(max) + ' letras). Acórtalo.'); return; } setCampo(p.id, 'textos', Object.assign({}, p.textos, { [c]: t.value })); toast('Texto guardado.'); }
};
document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (!t) return; const fn = ACT[t.dataset.act]; if (fn) { if (t.tagName === 'A' && ['irDemo'].includes(t.dataset.act) === false && t.dataset.act !== 'clicWa' && t.dataset.act !== 'clicPago') e.preventDefault(); fn(t, e); } });
document.addEventListener('change', e => { const t = e.target.closest('[data-chg]'); if (t && CHG[t.dataset.chg]) CHG[t.dataset.chg](t); if (e.target.id === 'f-spei') $('#bloque-clabe').hidden = !e.target.checked; if (e.target.id === 'r-venta') $('#r-vbloque').hidden = !e.target.checked; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });

// tooltips: el número exacto de cada punto, barra o celda
const tip = () => $('#tip');
document.addEventListener('pointermove', e => {
  const tp = tip(); let txt = null; const el = e.target.closest ? e.target.closest('[data-tip]') : null; const ch = e.target.closest ? e.target.closest('.chart') : null;
  document.querySelectorAll('.hv').forEach(l => l.style.opacity = 0);
  if (ch && CHARTS[ch.dataset.chart]) {
    const C = CHARTS[ch.dataset.chart]; const svg = ch.querySelector('svg'); const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * C.W; const iw = C.W - C.ml - C.mr; const i = Math.max(0, Math.min(C.n - 1, Math.round((x - C.ml) / iw * (C.n - 1))));
    const hv = svg.querySelector('.hv'); const px = C.ml + (C.n < 2 ? iw / 2 : i * iw / (C.n - 1)); hv.setAttribute('x1', px); hv.setAttribute('x2', px); hv.style.opacity = 1;
    txt = C.labels[i] + '\n' + C.series.map(s => s.name + ': ' + C.yFmt(s.values[i]).replace(/^\$(\d)/, '$$$1')).join('\n'); if (C.yFmt(1).startsWith('$')) txt = C.labels[i] + '\n' + C.series.map(s => s.name + ': ' + L.fmtMXN(s.values[i])).join('\n'); else txt = C.labels[i] + '\n' + C.series.map(s => s.name + ': ' + L.fmtInt(s.values[i]) + ' mensajes').join('\n');
  } else if (el) txt = el.dataset.tip;
  if (txt) { tp.textContent = txt; tp.style.display = 'block'; tp.style.left = Math.min(e.clientX + 14, innerWidth - 290) + 'px'; tp.style.top = (e.clientY + 14) + 'px'; } else tp.style.display = 'none';
});
setInterval(() => document.querySelectorAll('[data-ts]').forEach(e => { e.textContent = relLabel(+e.dataset.ts, e.dataset.real === '1'); }), 5000);
window.addEventListener('hashchange', ruta);
Store.init().then(async () => { await Store.cargarConfig(); if (S.route === 'metricas' || S.route === 'precios') render(); });
ruta();
