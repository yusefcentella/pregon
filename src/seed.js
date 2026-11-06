/* ===== DATOS DEL ESPACIO DEMO (ficticios, semilla fija) =====
   Cada día usa su propia semilla: los números no cambian al recargar. */
const SEED = 20261105;
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const DEMO_META = {
  id: 'demo', demo: true, nombre: 'Cajetas y Dulces Doña Chela', ciudad: 'Celaya, Guanajuato', tel: '4610000123',
  rfc: L.conDigitoRFC('ROOC850312K7'), cp: '38010', regimen: '626', clabe: L.conDigitoCLABE('01218000012345678')
};

// kind = ilustración de la miniatura. q = qué tanto rinde la publicación.
const DEMO_POSTS_RAW = [
  ['Cajeta quemada 250 g', 'Producto', 89.5, ['instagram', 'facebook', 'whatsapp'], '2026-05-12', 1.0, 'jar'],
  ['Cajeta envinada 250 g', 'Producto', 118.9, ['instagram', 'facebook'], '2026-06-03', 0.8, 'jar2'],
  ['Obleas con cajeta, caja de 12', 'Producto', 145, ['instagram', 'whatsapp', 'tiktok'], '2026-06-21', 1.1, 'wafer'],
  ['Glorias de nuez', 'Producto', 98.5, ['facebook', 'whatsapp'], '2026-07-08', 0.7, 'candy'],
  ['Envíos a todo México: cómo pedir', 'Convivencia', null, ['instagram', 'facebook', 'google'], '2026-07-15', 0.5, 'truck'],
  ['Cocadas de coco rallado', 'Producto', 76.9, ['instagram', 'whatsapp'], '2026-07-22', 0.6, 'coco'],
  ['Jamoncillo de leche', 'Producto', 82.5, ['facebook', 'google'], '2026-08-04', 0.6, 'coco'],
  ['Ate de membrillo con queso', 'Producto', 118, ['instagram', 'facebook'], '2026-08-12', 0.7, 'ate'],
  ['Así hacemos la cajeta (video)', 'Convivencia', null, ['tiktok', 'instagram'], '2026-08-18', 0.9, 'play'],
  ['Combo regreso a clases', 'Promoción', 169, ['instagram', 'facebook', 'whatsapp'], '2026-08-24', 0.9, 'wafer'],
  ['Paquete Noche Mexicana, 1 kg', 'Temporada', 249.9, ['instagram', 'facebook', 'whatsapp'], '2026-09-03', 1.6, 'box'],
  ['Dulces típicos para tu fiesta, 2 kg', 'Temporada', 429, ['instagram', 'whatsapp', 'facebook'], '2026-09-09', 1.4, 'box'],
  ['Mazapán artesanal, paquete de 10', 'Producto', 99.5, ['facebook', 'tiktok'], '2026-09-18', 0.8, 'candy'],
  ['Quincena: 2 cajetas por $149', 'Promoción', 149, ['instagram', 'whatsapp'], '2026-09-29', 1.0, 'jar'],
  ['Calaveritas de amaranto', 'Temporada', 65.5, ['instagram', 'tiktok', 'whatsapp'], '2026-10-10', 1.2, 'skull'],
  ['Dulce de calabaza en tacha', 'Temporada', 135, ['facebook', 'whatsapp'], '2026-10-20', 1.3, 'pumpkin'],
  ['Caja regalo Día de Muertos', 'Temporada', 329.9, ['instagram', 'facebook', 'whatsapp'], '2026-10-24', 1.5, 'box'],
  ['Preventa Buen Fin: cajas de Navidad', 'Promoción', 389, ['instagram', 'facebook', 'whatsapp'], '2026-11-02', 1.1, 'box']
];
const OCASION_DE = { 'Combo regreso a clases': 'regreso_clases', 'Paquete Noche Mexicana, 1 kg': 'fiestas_patrias', 'Dulces típicos para tu fiesta, 2 kg': 'fiestas_patrias', 'Quincena: 2 cajetas por $149': 'quincena', 'Calaveritas de amaranto': 'dia_muertos', 'Dulce de calabaza en tacha': 'dia_muertos', 'Caja regalo Día de Muertos': 'dia_muertos', 'Preventa Buen Fin: cajas de Navidad': 'buen_fin' };

const ANOTACIONES = [
  { d: '2026-08-31', t: 'Regreso a clases: suben los pedidos de obleas y combos para la lonchera.' },
  { d: '2026-09-15', t: 'Fiestas patrias: pedidos de dulces típicos para la noche del 15 de septiembre.' },
  { d: '2026-10-31', t: 'Día de Muertos: calaveritas de amaranto y dulce de calabaza para el altar.' }
];

const buildDemoPosts = () => DEMO_POSTS_RAW.map((r, i) => {
  const [producto, categoria, precio, canales, fecha, q, kind] = r;
  const g = L.generar({ negocio: DEMO_META.nombre, ciudad: DEMO_META.ciudad, tel: DEMO_META.tel, producto, precio: precio === null ? '' : precio, ocasion: OCASION_DE[producto] || 'ninguna', tono: 'cercano', canales, fecha, hora: '12:00', ref: 'DD-' + String(100 + i * 7).padStart(3, '0') });
  const textos = {}; g.resultados.forEach(x => textos[x.canal] = x.texto);
  return { id: 'd' + (i + 1), producto, categoria, precio, canales, fecha, hora: '12:00', q, kind, ref: g.ref, estado: fecha > '2026-11-05' ? 'Lista para publicar' : 'Publicada', textos, demo: true };
});

const SEMANA = [1.05, 0.85, 0.88, 0.92, 0.98, 1.12, 1.18]; // dom..sáb
const HORAS = [0.2, 0.1, 0.05, 0.04, 0.04, 0.1, 0.3, 0.7, 1.2, 1.8, 2.3, 2.6, 2.7, 2.9, 2.6, 2.2, 2.0, 2.1, 2.5, 3.0, 3.3, 3.1, 1.9, 0.8];
const CANAL_PESO = { instagram: 1.0, facebook: 0.75, whatsapp: 0.85, tiktok: 0.4, google: 0.3 };
const ESTADOS_PESO = [['Guanajuato', 22], ['Ciudad de México', 17], ['Jalisco', 11], ['Estado de México', 10], ['Nuevo León', 8], ['Querétaro', 7], ['Puebla', 5], ['Michoacán', 4], ['Veracruz', 4], ['San Luis Potosí', 3], ['Yucatán', 2.5], ['Chihuahua', 2.5], ['Sonora', 2], ['Tamaulipas', 2]];
const PAGOS = [['SPEI', 46], ['Tarjeta (enlace de pago)', 28], ['Depósito en tienda', 14], ['Contra entrega', 12]];
const pick = (rng, tabla) => { const t = tabla.reduce((a, x) => a + x[1], 0); let r = rng() * t; for (const x of tabla) { r -= x[1]; if (r <= 0) return x[0]; } return tabla[0][0]; };
const gauss = (di, centro, ancho, amp) => amp * Math.exp(-0.5 * Math.pow((di - L.keyIdx(centro)) / ancho, 2));

const factorFecha = (di, d, dim) => {
  let f = 1;
  if (d === 15) f *= 1.38; else if (d === 14 || d === 16) f *= 1.14;
  if (d === dim || d === 30) f *= 1.35; else if (d === dim - 1 || d === 29) f *= 1.12; else if (d === 1) f *= 1.1;
  if (d >= dim - 2) f *= 1.06; // cierre de mes fiscal: pedidos con factura
  f *= 1 + gauss(di, '2026-08-31', 2.5, 0.25) + gauss(di, '2026-09-14', 3.2, 1.3) + gauss(di, '2026-10-31', 2.8, 0.75) + gauss(di, '2026-11-14', 5, 0.2);
  return f;
};

const buildDemoMsgs = (posts, finIdx, ahora) => {
  const ini = L.keyIdx('2026-05-10'); const out = [];
  const pDi = posts.map(p => L.keyIdx(p.fecha));
  for (let di = ini; di <= finIdx; di++) {
    const rng = mulberry32(((di * 2654435761) ^ SEED) >>> 0);
    const dt = new Date(di * 864e5); const d = dt.getUTCDate(), dow = dt.getUTCDay();
    const dim = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
    const base = 22 * (1 + 0.0019 * (di - ini)) * SEMANA[dow] * factorFecha(di, d, dim) * (1 + (rng() - 0.5) * 0.36);
    const n = Math.round(base);
    const w = posts.map((p, i) => di >= pDi[i] ? p.q * (Math.exp(-(di - pDi[i]) / 10) + 0.07) : 0);
    const wt = w.reduce((a, b) => a + b, 0); if (!wt) continue;
    for (let k = 0; k < n; k++) {
      let r = rng() * wt, pi = 0; for (; pi < w.length - 1; pi++) { r -= w[pi]; if (r <= 0) break; }
      const p = posts[pi];
      const canal = pick(rng, p.canales.map(c => [c, CANAL_PESO[c]]));
      const h = Number(pick(rng, HORAS.map((x, i) => [i, x]))); const mi = Math.floor(rng() * 60);
      const ts = L.msOf(L.idxKey(di), h, mi); if (ts > ahora) continue;
      const estado = pick(rng, ESTADOS_PESO);
      let venta = 0, pago = '';
      if (rng() < 0.31 + (p.precio ? 0.04 : 0)) {
        const qty = [1, 1, 1, 2, 2, 3, 4][Math.floor(rng() * 7)]; const unit = p.precio || 118.5;
        const sub = unit * qty; venta = Math.round((sub + (sub >= 299 ? 0 : 89)) * 100) / 100; pago = pick(rng, PAGOS);
      }
      out.push({ id: 's' + di + '-' + k, postId: p.id, canal, ts, di, h, dow, estado, venta, pago, real: false });
    }
  }
  return out;
};

// Resultados demo por publicación y canal (alcance, interacciones, clics). Ficticios, semilla fija.
const buildDemoMetricas = (posts, msgs, hoyIdx) => {
  const cnt = {}; msgs.forEach(m => { const k = m.postId + '|' + m.canal; cnt[k] = (cnt[k] || 0) + 1; });
  const base = { instagram: 9000, facebook: 6500, whatsapp: 1800, tiktok: 14000, google: 2600 }; const out = {};
  posts.forEach((p, i) => { if (L.keyIdx(p.fecha) > hoyIdx) return; p.canales.forEach((c, j) => {
    const rng = mulberry32((SEED + i * 131 + j * 17) >>> 0); const alc = Math.round(base[c] * p.q * (0.6 + rng() * 0.9) + rng() * 97); const msg = cnt[p.id + '|' + c] || 0;
    const social = c === 'instagram' || c === 'facebook' || c === 'tiktok';
    out[p.id + '|' + c] = { alcance: alc, likes: social ? Math.round(alc * (0.025 + rng() * 0.04)) : null, comentarios: social ? Math.round(alc * (0.002 + rng() * 0.004)) : null, guardados: c === 'instagram' || c === 'tiktok' ? Math.round(alc * (0.005 + rng() * 0.01)) : null, clics: Math.max(msg, Math.round(msg / (0.42 + rng() * 0.2)) + Math.round(rng() * 7)), demo: true };
  }); });
  return out;
};
