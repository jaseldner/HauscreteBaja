// Siembra la base de Hauscrete Baja con una COPIA de la base de Hauscrete (nube).
// Se usa UNA sola vez, al arrancar el sistema. No modifica nada de Hauscrete:
// solo lee la nube y escribe en baja.sqlite de esta carpeta.
//
// Uso:  node sembrar-desde-hauscrete.mjs
//
// Protección: si baja.sqlite ya tiene datos, se detiene. Para forzar de todos
// modos (perdiendo lo que haya en Baja):  node sembrar-desde-hauscrete.mjs --forzar

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDB, decompose, reassemble, tablesPopulated } from './db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'baja.sqlite');
const FORZAR = process.argv.includes('--forzar');

// Origen: la nube de Hauscrete (fuente de verdad de ese sistema).
const CLOUD = 'https://hauscrete-crm.fly.dev/api/storage';
const AUTH = 'Basic ' + Buffer.from('hauscrete:Hauscrete2026').toString('base64');

async function get(key) {
  const r = await fetch(`${CLOUD}/get?key=${encodeURIComponent(key)}`, { headers: { Authorization: AUTH } });
  if (r.status === 401) throw new Error('Contraseña de Hauscrete incorrecta.');
  if (!r.ok) throw new Error('La nube de Hauscrete respondió HTTP ' + r.status);
  return r.json();
}

// --- Comprobación de seguridad ------------------------------------------------
const dbPrueba = openDB(DB_FILE);
if (tablesPopulated(dbPrueba) && !FORZAR) {
  const actual = reassemble(dbPrueba);
  dbPrueba.close();
  console.error('\n  ⛔ baja.sqlite YA tiene datos (' +
    (actual.projects?.length || 0) + ' proyectos, ' +
    (actual.cotizaciones?.length || 0) + ' cotizaciones).');
  console.error('     No se sembró nada. Si de verdad quieres reemplazarlos:');
  console.error('     node sembrar-desde-hauscrete.mjs --forzar\n');
  process.exit(1);
}
dbPrueba.close();

// --- Descarga -----------------------------------------------------------------
console.log('  Descargando la base de Hauscrete desde la nube...');
const main = await get('modulo-proyectos-v1');
if (!main.value) throw new Error('La nube de Hauscrete no devolvió datos.');
const state = JSON.parse(main.value);

const keys = (await (await fetch(`${CLOUD}/list`, { headers: { Authorization: AUTH } })).json()).keys || [];
const adjuntos = {};
for (const k of keys) {
  if (k === 'modulo-proyectos-v1') continue;
  const v = await get(k);
  if (v.value !== undefined) adjuntos[k] = v.value;
}

// --- Copia de seguridad del origen, por si acaso ------------------------------
const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const sello = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
await mkdir(path.join(__dirname, 'backups'), { recursive: true });
await writeFile(
  path.join(__dirname, 'backups', `semilla_HAUSCRETE_${sello}.json`),
  JSON.stringify({ app: 'modulo-proyectos', version: 1, origen: 'nube-hauscrete', datos: state, adjuntos }, null, 2),
  'utf8'
);

// --- Escritura en la base de Baja ---------------------------------------------
const db = openDB(DB_FILE);
decompose(db, state);
const setKv = db.prepare(`INSERT INTO kv(key,value,updated_at) VALUES(?,?,datetime('now'))
                          ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`);
setKv.run('modulo-proyectos-v1', main.value);
for (const [k, v] of Object.entries(adjuntos)) setKv.run(k, v);
db.close();

const n = (k) => (Array.isArray(state[k]) ? state[k].length : 0);
console.log('\n  ✔ baja.sqlite sembrada con la copia de Hauscrete:');
console.log('    proyectos    ', n('projects'));
console.log('    productos    ', n('productos'));
console.log('    cotizaciones ', n('cotizaciones'));
console.log('    proveedores  ', n('proveedores'));
console.log('    clientes     ', n('clientes'));
console.log('    adjuntos     ', Object.keys(adjuntos).length);
console.log('\n  Abre el sistema con "Iniciar Baja.bat"  ->  http://localhost:3200\n');
