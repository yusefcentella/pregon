// Uso: node scripts/fundador.cjs <lugares vendidos>
// Actualiza docs/fundadores.json, que la página lee sola cada minuto.
const fs = require('fs');
const p = 'docs/fundadores.json';
const cur = JSON.parse(fs.readFileSync(p, 'utf8'));
const n = Number(process.argv[2]);
if (!Number.isInteger(n) || n < 0 || n > cur.total) { console.error('Uso: node scripts/fundador.cjs <vendidos, de 0 a ' + cur.total + '>'); process.exit(1); }
const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
fs.writeFileSync(p, JSON.stringify({ total: cur.total, vendidos: n, actualizado: hoy }, null, 2) + '\n');
if (fs.existsSync('dist')) fs.copyFileSync(p, 'dist/fundadores.json');
console.log('Listo: ' + n + ' de ' + cur.total + ' lugares vendidos (' + (cur.total - n) + ' disponibles). Actualizado: ' + hoy);
