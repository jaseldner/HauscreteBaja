// Sube la base LOCAL de Baja (baja.sqlite) a la NUBE (hauscrete-baja-erp.fly.dev).
// Se usa UNA vez, justo después del primer despliegue, para que la nube arranque
// con lo que ya se capturó en la computadora. Después de esto la NUBE es la
// fuente de verdad y el local se refresca desde ella (Respaldar Nube.bat).
//
// Uso:  node subir-base-a-nube.mjs
//
// Protección: si la nube YA tiene proyectos/cotizaciones/clientes, se detiene
// (para no pisar trabajo real). Para forzar:  node subir-base-a-nube.mjs --forzar

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDB, reassemble } from './db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORZAR = process.argv.includes('--forzar');

const CLOUD = 'https://hauscrete-baja-erp.fly.dev/api/storage';
const USER = 'hausbaja';
const PASS = process.env.ACCESO_PASS || 'HausBaja';   // igual que en backup-nube.mjs
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const H = { Authorization: AUTH, 'Content-Type': 'application/json' };

// --- Leer local ----------------------------------------------------------------
const db = openDB(path.join(__dirname, 'baja.sqlite'));
const state = reassemble(db);
const kv = db.prepare('SELECT key, value FROM kv').all();
const adjuntos = kv.filter((r) => /^(arch|fact|rem)-/.test(r.key));
db.close();
const n = (k) => (Array.isArray(state[k]) ? state[k].length : 0);
console.log(`  Local: ${n('projects')} proyectos, ${n('cotizaciones')} cotizaciones, ${n('productos')} productos, ${n('proveedores')} proveedores, ${adjuntos.length} adjuntos`);

// --- Revisar la nube ------------------------------------------------------------
const rGet = await fetch(`${CLOUD}/get?key=modulo-proyectos-v1`, { headers: H });
if (rGet.status === 401) { console.error('  ⛔ Contraseña de acceso incorrecta (ACCESO_PASS).'); process.exit(1); }
if (!rGet.ok) { console.error('  ⛔ La nube respondió HTTP ' + rGet.status + '. ¿Ya se desplegó?'); process.exit(1); }
const nube = await rGet.json();
if (nube.value && !FORZAR) {
  const s = JSON.parse(nube.value);
  const ocupada = (s.projects || []).length + (s.cotizaciones || []).length + (s.clientes || []).length;
  if (ocupada > 0) {
    console.error(`\n  ⛔ La nube YA tiene datos (${(s.projects||[]).length} proyectos, ${(s.cotizaciones||[]).length} cotizaciones, ${(s.clientes||[]).length} clientes).`);
    console.error('     No se subió nada. Si de verdad quieres reemplazarlos:  node subir-base-a-nube.mjs --forzar\n');
    process.exit(1);
  }
}

// --- Subir -----------------------------------------------------------------------
console.log('  Subiendo el estado...');
let r = await fetch(`${CLOUD}/set`, { method: 'POST', headers: H, body: JSON.stringify({ key: 'modulo-proyectos-v1', value: JSON.stringify(state) }) });
if (!r.ok) { console.error('  ⛔ Falló al subir el estado: HTTP ' + r.status); process.exit(1); }
let subidos = 0;
for (const a of adjuntos) {
  r = await fetch(`${CLOUD}/set`, { method: 'POST', headers: H, body: JSON.stringify({ key: a.key, value: a.value }) });
  if (r.ok) subidos++; else console.warn('   ⚠ adjunto no subido:', a.key, r.status);
}
console.log(`\n  ✔ Nube sembrada: estado + ${subidos}/${adjuntos.length} adjuntos.`);
console.log('  A partir de ahora la NUBE es la fuente de verdad: https://hauscrete-baja-erp.fly.dev\n');
