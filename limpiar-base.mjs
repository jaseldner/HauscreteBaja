// Deja la base de Baja SIN información operativa: solo productos con sus precios
// y el proveedor Litecrete (PR-001). Se corre con el servidor APAGADO.
//
// Uso:  node limpiar-base.mjs
//
// Antes de tocar nada guarda un respaldo completo en backups/.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDB, decompose, reassemble } from './db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'baja.sqlite');
const PROV_QUE_SE_QUEDA = 'PR-001'; // Litecrete S.A. de C.V. (Hebel)

// Colecciones de información operativa que se vacían por completo.
const VACIAR = ['projects', 'cotizaciones', 'ocs', 'clientes', 'pagosSemanas',
                'prefacturas', 'planDemanda', 'segmentaciones'];

// Contadores que vuelven a empezar. nextProveedor arranca en 2 porque PR-001 existe.
const CONTADORES = { nextFolio: 1, nextCot: 1, nextOC: 1, nextIN: 1, nextSeg: 1,
                     nextPagoSemana: 1, nextPrefactura: 1, nextCliente: 1, nextProveedor: 2 };

const db = openDB(DB_FILE);
const state = reassemble(db);

// --- Respaldo previo ----------------------------------------------------------
const listaKv = db.prepare('SELECT key, value FROM kv').all();
const adjuntos = Object.fromEntries(listaKv.filter((r) => /^(arch|fact)-/.test(r.key)).map((r) => [r.key, r.value]));
const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const sello = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
await mkdir(path.join(__dirname, 'backups'), { recursive: true });
const respaldo = path.join(__dirname, 'backups', `respaldo_ANTES_limpiar_${sello}.json`);
await writeFile(respaldo, JSON.stringify({ app: 'modulo-proyectos', version: 1, origen: 'baja', datos: state, adjuntos }, null, 2), 'utf8');

const antes = Object.fromEntries(Object.entries(state).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]));

// --- Limpieza -----------------------------------------------------------------
for (const col of VACIAR) if (Array.isArray(state[col])) state[col] = [];

// Solo Litecrete
state.proveedores = (state.proveedores || []).filter((x) => x && x.clave === PROV_QUE_SE_QUEDA);

// Quitar de los productos las referencias a proveedores que ya no existen
let refsLimpiadas = 0;
for (const prod of state.productos || []) {
  if (!Array.isArray(prod.provClaves)) continue;
  const antesN = prod.provClaves.length;
  prod.provClaves = prod.provClaves.filter((c) => c === PROV_QUE_SE_QUEDA);
  refsLimpiadas += antesN - prod.provClaves.length;
}

Object.assign(state, CONTADORES);

// --- Escritura ----------------------------------------------------------------
decompose(db, state);
const raw = JSON.stringify(state);
const setKv = db.prepare(`INSERT INTO kv(key,value,updated_at) VALUES(?,?,datetime('now'))
                          ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`);
setKv.run('modulo-proyectos-v1', raw);
// Los adjuntos pertenecían a proyectos/facturas que ya no existen
const delKv = db.prepare('DELETE FROM kv WHERE key = ?');
for (const k of Object.keys(adjuntos)) delKv.run(k);
db.close();

// --- Informe ------------------------------------------------------------------
const despues = Object.fromEntries(Object.entries(state).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]));
console.log('\n  Respaldo previo:', respaldo);
console.log('\n  Colección          antes  ->  después');
for (const k of Object.keys(antes)) {
  const cambio = antes[k] !== despues[k] ? '   <—' : '';
  console.log('   ' + k.padEnd(18) + String(antes[k]).padStart(4) + '  ->  ' + String(despues[k]).padStart(4) + cambio);
}
console.log('\n   adjuntos borrados ', Object.keys(adjuntos).length);
console.log('   refs de proveedor quitadas de productos ', refsLimpiadas);
console.log('   contadores reiniciados  ', Object.entries(CONTADORES).map(([k, v]) => k + '=' + v).join('  '));
console.log('');
