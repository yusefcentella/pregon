const fs=require('fs');const r=f=>fs.readFileSync('src/'+f,'utf8');
const logic=r('logic.js').replace(/if \(typeof module[^\n]*\n/,'');
const html=`<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pregón</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${r('styles.css')}
</style>
</head>
<body>
<a class="sr" href="#main">Saltar al contenido</a>
<div id="app"></div>
<div id="tip" role="tooltip"></div>
<div id="toast" role="status" aria-live="polite"></div>
<script>
${logic}
${r('seed.js')}
${r('store.js')}
${r('ui.js')}
</script>
</body>
</html>`;
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html',html);fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/index.html',html);fs.writeFileSync('docs/.nojekyll','');console.log('dist/index.html y docs/index.html',html.length,'bytes');
