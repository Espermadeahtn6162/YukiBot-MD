# Issues Encontrados - Auditoría YukiBot-MD

> Fecha: 2026-11-26 | Auditoría: Código completo (cmds/, core/, index.js, main.js)

---

## 🔴 CRÍTICO (Seguridad / Estabilidad)

### 1. **Ejecución arbitraria sin límites** (`cmds/owner/exec.js`)
- **Problema**: `/ex` y `/e` permiten código JS sin timeout, sin límite de output, acceso a `process.exit()`, `global.sock.end()`, `require.cache`
- **Impacto**: Owner puede (accidental o maliciosamente) matar el bot, colgarlo en bucle infinito, exfiltrar datos
- **Fix aplicado**: ✅ Timeout 10s, maxOutput 4000, blocked globals

### 2. **Shell injection sin restricciones** (`cmds/owner/exec2.js`)
- **Problema**: `/r` ejecuta cualquier comando shell (`rm -rf /`, `shutdown`, `curl | bash`, fork bombs)
- **Impacto**: Control total del servidor host
- **Fix aplicado**: ✅ Allow-list 30 binarios, 15 patrones bloqueados, timeout 15s

### 3. **Input sin sanitizar en spawn** (`cmds/stickers/Audiosticker.js`)
- **Problema**: `packname` y `author` del usuario pasan a metadata EXIF; aunque no van a shell directo, defensa en profundidad
- **Fix aplicado**: ✅ Sanitización (solo alfanum, emojis, -, _, max 30 chars)

---

## 🟡 ALTO (Performance / Arquitectura)

### 4. **main.js monolítico** (380+ líneas)
- **Problema**: Prefix parsing, permission checks, command execution, logging todo en una función
- **Impacto**: Difícil de mantener, testear, debuggear; código duplicado en validaciones
- **Ejemplo**: Líneas 91-120 (plugins all/before) + 134-180 (command routing) + 130-132 (chat stats)

### 5. **Faltan índices SQLite** (`core/system/database.js`)
- **Problema**: Queries frecuentes sin índices: `users ORDER BY exp/level`, `chat_users WHERE chat_id`, `chat_users ORDER BY coins/lastCmd`
- **Impacto**: Escaneos full-table en tablas que crecen (users, chat_users)
- **Fix aplicado**: ✅ 6 índices creados

### 6. **Sin cooldowns centralizados** (economy/gacha/downloads)
- **Problema**: Cada comando implementa su propio cooldown (DB, Map local, variables), inconsistente
- **Impacto**: Spam posible, UX inconsistente, código duplicado
- **Fix parcial**: ✅ `core/cooldown.js` + work.js + rollwaifu.js

### 7. **CmdsLoader carga todo secuencial** (`core/system/cmdsLoader.js`)
- **Problema**: `Promise.allSettled` pero `importModule` await secuencial dentro del map
- **Fix previo**: ✅ Carga paralela real (imports todos → registers todos)

### 8. **Warmup bloquea ready** (`index.js`)
- **Problema**: `warmupGroups` await en `connection.update` antes de `botReady = true`
- **Fix previo**: ✅ Fire-and-forget

---

## 🟢 MEDIO (Código / DX)

### 9. **Magia de strings en message handling** (`core/serialize.js`)
- **Problema**: `smsg` tiene 480 líneas, lógica compleja de JID resolution, media parsing, quoted messages
- **Riesgo**: Bugs sutiles en edge cases (lid, ephemeral, viewOnce, reactions)

### 10. **Config hardcodeada** (`settings.js`, `database.js`)
- **Problema**: Owner numbers, API keys, timezones, prefixes en código
- **Mejorable**: `.env` + `config.json` + validación schema (Zod/Valibot)

### 11. **Error handling inconsistente**
- **Problema**: Unos comandos `try/catch` + `msg.reply`, otros `sock.reply`, otros `console.error` only
- **Mejorable**: Helper `handleError(msg, err, usedPrefix, command)`

### 12. **Sin tests**
- **Problema**: 0 tests unitarios, 0 integración
- **Riesgo**: Regresiones silenciosas al refactor

### 13. **TypeScript ausente**
- **Problema**: 100% JS, sin tipos → bugs de runtime (undefined, tipos incorrectos)
- **Mejorable**: Migración gradual a TS

---

## 🔵 BAJO (Nice to have)

### 14. **Logs estructurados**
- **Actual**: `console.log` con chalk (colors), sin levels, sin JSON
- **Mejorable**: Pino ya instalado, usar `logger.info/warn/error` con metadata

### 15. **Rate limiting global**
- **Falta**: Límite msg/seg por usuario/chat global (anti-spam general)

### 16. **Health check endpoint**
- **Falta**: `/health` para PM2/Docker/K8s

### 17. **Backup DB automático**
- **Falta**: Export periódico SQLite → JSON/Drive/GitHub

### 18. **Web dashboard**
- **Falta**: Panel admin para stats, gestor grupos, bots, settings

---

## 📊 RESUMEN POR ARCHIVO

| Archivo | Críticos | Altos | Medios | Bajos | Estado |
|---------|----------|-------|--------|-------|--------|
| `exec.js` | 1 | - | - | - | ✅ Fixed |
| `exec2.js` | 1 | - | - | - | ✅ Fixed |
| `Audiosticker.js` | 1 | - | - | - | ✅ Fixed |
| `database.js` | - | 1 | - | - | ✅ Fixed (índices) |
| `main.js` | - | 1 | 2 | - | ⏳ Pendiente |
| `index.js` | - | 1 | - | - | ✅ Fixed (warmup) |
| `cmdsLoader.js` | - | 1 | - | - | ✅ Fixed (paralelo) |
| `serialize.js` | - | 1 | 1 | - | ⏳ Pendiente |
| `cooldown.js` | - | - | 1 | - | ✅ Nuevo |
| `work.js` | - | - | 1 | - | ✅ Usa cooldown |
| `rollwaifu.js` | - | - | 1 | - | ✅ Usa cooldown |
| Economía (27 cmds) | - | 1 | - | - | ⏳ 2/27 |
| Gacha (25 cmds) | - | 1 | - | - | ⏳ 1/25 |
| Descargas (14 cmds) | - | 1 | - | - | ⏳ 0/14 |
| Utils (10 cmds) | - | 1 | - | - | ⏳ 0/10 |

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

1. **Completar cooldowns** (economy 25, gacha 24, downloads 14, utils 10, stickers 3) — ~2h
2. **Refactor main.js** en módulos — ~3h
3. **Tests unitarios** (db, cooldown, serialize) — ~4h
4. **TypeScript migration** — ~8h
5. **Config externa + validación** — ~2h