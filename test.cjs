const { autoverificar } = require('./src/logic.js');
const r = autoverificar();
for (const c of r.casos) { console.log(c.ok ? 'OK  ' : 'FALLA', c.tipo); if (!c.ok) { console.log('  esperado:', JSON.stringify(c.esperado)); console.log('  obtenido:', JSON.stringify(c.obtenido)); } }
console.log('Global:', r.ok);
