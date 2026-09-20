# Hauscrete Baja ERP ("Baja") — sesión dedicada

## Regla de sesiones (decisión del usuario, 25/08/2026)
**Esta sesión trabaja SOLO Baja.** Hauscrete, A2M y Bucas tienen cada uno su propia sesión en su carpeta. Si el usuario pide algo de otro sistema, avisarle que le toca a la sesión de ese sistema.

**EXCEPCIÓN importante:** Baja es **gemelo exacto de Hauscrete** (`C:\Negocios\Hauscrete\CRM Hauscrete`). Todo cambio de código que llegue a uno debe llegar al otro. Coordinar con la sesión de Hauscrete (`SendMessage`/`ListAgents`) antes de tocar código compartido, para acordar quién aplica el cambio en ambos y no pisarse. Las divergencias intencionales de Baja son solo: letrero "BAJA" del login y color de marca gris oscuro (`--navy:#343A40`, `--navy-2:#23272B`).

## Qué es este sistema
- ERP clon de Hauscrete. Razón social distinta (administración de Mexicali). Base `baja.sqlite`, puerto local **3200**, un solo archivo `modulo-proyectos.html` + `server.mjs` (node:sqlite). App móvil en `entregas.html` (`/movil`).
- **Nube: https://hauscrete-baja-erp.fly.dev** (usuario `hausbaja` / `HausBaja`). La nube es la fuente de verdad; el local es para pruebas. Cuenta de Fly **SEPARADA** (org `hauscrete-baja-248`); token de org en `fly-token.txt`.
- Cambios se registran en `REQUERIMIENTOS.md` (marcadores RF-###).

## PENDIENTES al 25/08/2026 (traspaso de la sesión anterior)
1. **URGENTE — token de Fly VENCIDO** (`fly-token.txt` da "You must be authenticated"). El usuario debe renovarlo (dashboard Fly, cuenta Mexicali → org Hauscrete Baja → Tokens → org token). Con el token nuevo:
   - `flyctl deploy --now` — la nube está **ATRASADA**: todo el código de RF-382 a RF-395 (proyección clicable, fotos móvil, roles/perfiles RF-386, prepago ligado RF-387, cancelar factura RF-388, guardado con acuse RF-389, margen RF-393, guardarraíl RF-394/395) está SOLO en este disco.
   - `flyctl scale memory 512 -a hauscrete-baja-erp` — las otras 3 apps ya corren con 512 MB tras un incidente OOM que vació la nube de Hauscrete el 25/08; Baja sigue en 256. El `fly.toml` local ya dice 512mb.
2. **Guardarraíl anti-vaciado (RF-394)** ya está en `server.mjs` local (GUARD_MIN=8, rechaza con HTTP 409 un guardado que vaciaría projects/clientes/cotizaciones; override `{"force":true}`). Al hacer scripts de migración/restauración, mandar `force:true` o darán 409.
3. Pendientes de negocio heredados: datos fiscales reales de Baja en Ajustes (hoy salen los de Hauscrete), e.firma de Baja para el SAT, token del bot de Telegram propio (`telegram-token.txt`), altas de usuarios de Mexicali.

## Cómo desplegar (cuando haya token)
```bash
cd "C:\Negocios\Hauscrete BAJA ERP"
export FLY_API_TOKEN=$(cat fly-token.txt)
flyctl deploy --now
```
Verificar después: `curl -u hausbaja:HausBaja https://hauscrete-baja-erp.fly.dev/ | grep -c RF-395` (debe ser >0).

## Reglas de trabajo heredadas
- Nunca borrar/reiniciar datos en la base viva al probar; probar con una COPIA del .sqlite en el scratchpad (`PORT=32XX DB_FILE=<copia> node server.mjs`).
- OneDrive ya no se usa: todo vive en `C:\Negocios\...`. No escribir nada bajo `C:\Users\jasel\OneDrive`.
- Todo permiso que se dé al rol super usuario se le da también al rol `programador` (JAST es programador en los 4 sistemas; su ficha no la ve nadie más).
- Tras editar, verificar con `grep -c RF-###` que los marcadores quedaron en el archivo.
