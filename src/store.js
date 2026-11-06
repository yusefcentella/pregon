/* ===== ACCESO A DATOS =====
   Única capa que toca localStorage y las capacidades de la plataforma (db, user, sample, downloads).
   Al migrar fuera de Claude, solo hay que reemplazar este archivo (ver README). */
const CONFIG = {
  FOUNDER_PAYMENT_URL: 'https://wa.me/529621058115?text=Hola%2C%20quiero%20apartar%20mi%20lugar%20en%20el%20Plan%20Fundador%20de%20Preg%C3%B3n',  // enlace wa.me con mensaje prellenado. Vacío = el botón dice «Enlace pendiente»
  FOUNDER_SEATS: 20,
  FOUNDER_SOLD: 0           // se puede actualizar a mano desde /metricas
};

const Store = (() => {
  const mem = {};
  const ls = {
    get(k) { try { const v = localStorage.getItem(k); return v === null ? (mem[k] ?? null) : JSON.parse(v); } catch (e) { return mem[k] ?? null; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: queda en memoria */ } }
  };
  const caps = { db: null, user: null, sample: null, downloads: null, owner: false, platform: false, listo: false };
  const rows = snap => (snap && snap.docs ? snap.docs : Array.isArray(snap) ? snap : []).map(d => (d && typeof d.data === 'function' ? d.data() : d));

  const init = async () => {
    caps.platform = !!(window.claude && window.claude.use);
    if (caps.platform) {
      const pide = async n => { try { return await window.claude.use(n); } catch (e) { return null; } };
      [caps.db, caps.user, caps.sample, caps.downloads] = await Promise.all([pide('db'), pide('user'), pide('sample'), pide('downloads')]);
      try { caps.owner = !!(caps.user && caps.user.isOwner && caps.user.isOwner()); } catch (e) { caps.owner = false; }
    }
    caps.listo = true;
  };

  // Espacios (demo = solo lo real que hace el visitante; los demás son privados por enlace secreto)
  const vacio = () => ({ posts: [], msgs: [], clicks: [], edits: {}, metricas: {}, meta: null });
  const cargarEspacio = id => Object.assign(vacio(), ls.get('pregon:v1:ws:' + id) || {});
  let pendiente = null;
  const guardarEspacio = (id, data) => {
    ls.set('pregon:v1:ws:' + id, data);
    if (id !== 'demo' && caps.db) {
      clearTimeout(pendiente);
      pendiente = setTimeout(async () => { try { await caps.db.doc('espacios/' + id).set({ json: JSON.stringify(data), t: Date.now() }); } catch (e) { /* se queda en este navegador */ } }, 600);
    }
  };
  const traerEspacioRemoto = async id => {
    if (!caps.db || id === 'demo') return null;
    try { const d = await caps.db.doc('espacios/' + id).get(); const v = d && (typeof d.data === 'function' ? d.data() : d); return v && v.json ? JSON.parse(v.json) : null; } catch (e) { return null; }
  };

  // Medición de validación: sin datos personales (ni IP). Solo tipo, día, página y origen.
  const idRand = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const track = ev => {
    const fila = Object.assign({ t: Date.now() }, ev);
    const cola = ls.get('pregon:v1:metricas') || []; cola.push(fila); if (cola.length > 3000) cola.shift(); ls.set('pregon:v1:metricas', cola);
    if (caps.db) { try { caps.db.collection('metricas').doc(idRand()).set(fila).catch(() => {}); } catch (e) { /* sin base: queda local */ } }
  };
  const leerMetricas = async () => {
    if (caps.db) { try { const s = await caps.db.collection('metricas').limit(20000).get(); const r = rows(s); if (r.length || caps.owner) return { filas: r, fuente: 'base de datos' }; } catch (e) { /* cae a local */ } }
    return { filas: ls.get('pregon:v1:metricas') || [], fuente: 'este navegador (sin base de datos)' };
  };

  // Configuración editable por el dueño (reemplaza variables de entorno en Claude)
  let cfg = Object.assign({}, CONFIG, ls.get('pregon:v1:cfg') || {});
  // Contador del Plan Fundador: lee fundadores.json (mismo sitio). Lo actualiza una persona al confirmar cada pago.
  const leerFundadores = async () => {
    try {
      const r = await fetch('fundadores.json?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return false; const j = await r.json();
      const total = Number(j.total), vend = Number(j.vendidos);
      if (!Number.isInteger(total) || total < 1 || total > 1000 || !Number.isInteger(vend) || vend < 0 || vend > total) return false;
      cfg = Object.assign({}, cfg, { FOUNDER_SEATS: total, FOUNDER_SOLD: vend, FOUNDER_UPDATED: typeof j.actualizado === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j.actualizado) ? j.actualizado : '' });
      return true;
    } catch (e) { return false; }
  };
  const cargarConfig = async () => {
    if (caps.db) { try { const d = await caps.db.doc('config/app').get(); const v = d && (typeof d.data === 'function' ? d.data() : d); if (v) { cfg = Object.assign({}, CONFIG, v); ls.set('pregon:v1:cfg', v); } } catch (e) { /* usa lo local */ } }
    await leerFundadores();
    return cfg;
  };
  const guardarConfig = async nuevo => {
    cfg = Object.assign({}, cfg, nuevo); ls.set('pregon:v1:cfg', cfg);
    if (caps.db) { try { await caps.db.doc('config/app').set(cfg); return true; } catch (e) { return false; } }
    return !caps.platform; // fuera de Claude se guarda en este navegador
  };

  // Descargas
  const descargar = async (nombre, contenido, mime) => {
    const blob = new Blob([contenido], { type: mime });
    if (caps.downloads) { try { await caps.downloads.save({ filename: nombre, data: blob }); return 'guardado'; } catch (e) { /* intenta otra vía */ } }
    if (!caps.platform) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); return 'guardado'; }
    return 'no';
  };

  return { caps, ls, init, cargarEspacio, guardarEspacio, traerEspacioRemoto, track, leerMetricas, getConfig: () => cfg, cargarConfig, leerFundadores, guardarConfig, descargar, vacio };
})();
