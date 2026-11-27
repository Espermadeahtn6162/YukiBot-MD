# Plan de Mejoras - YukiBot-MD

> Estado: **En progreso** | Última actualización: 2026-11-26

---

## ✅ COMPLETADO (2026-11-26)

### 🔴 CRÍTICO - Seguridad (Owner-only)
- [x] **`exec.js`** — Timeout 10s, maxOutput 4000 chars, blocked globals (`process.exit`, `global.sock.end`, `require.cache`, `Function.constructor`)
- [x] **`exec2.js`** — Timeout 15s, maxOutput 4000, allow-list shell (30+ binarios), blocked patterns (15+ patrones peligrosos)
- [x] **`Audiosticker.js`** — Sanitizar `packname`/`author` (solo alfanum, emojis, -, _, max 30 chars)

### 🟡 ALTO - Performance / DB
- [x] **`database.js`** — Índices SQLite: `users(exp, level)`, `chat_users(chat_id, coins, lastCmd)`, `settings(id)`

### 🟢 MEDIO - Cooldowns (Anti-spam)
- [x] **`core/cooldown.js`** — Sistema centralizado con cooldowns por categoría/comando
- [x] **`cmds/economy/work.js`** — Usa cooldown centralizado (30s)
- [x] **`cmds/gacha/rollwaifu.js`** — Usa cooldown centralizado (10s)

### 📝 DOCS
- [x] **`PLAN.md`** — Este documento
- [x] **`ISSUES_FOUND.md`** — Auditoría de issues

---

## 🔄 PENDIENTE (Próxima sesión)

### 🟡 ALTO - Cooldowns restantes
- [ ] Aplicar cooldown a: `daily`, `weekly`, `monthly`, `coinflip`, `crime`, `steal`, `casino`, `roulette`, `aventura`, `cazar`, `pescar`, `minar`, `mazmorra`, `curar` (economy)
- [ ] Aplicar cooldown a: `claim`, `harem`, `buychar`, `sell`, `trade`, `givechar`, `vote` (gacha)
- [ ] Aplicar cooldown a: `play`, `play2`, `tiktok`, `instagram`, `twitter`, `facebook`, `mediafire`, `drive`, `imagen`, `aptoide` (downloads)
- [ ] Aplicar cooldown a: `ia`, `trad`, `hd`, `gitclone` (utils)
- [ ] Aplicar cooldown a: `sticker`, `audiosticker`, `brat` (stickers)

### 🟡 ALTO - Refactor main.js
- [ ] Extraer `checkPermissions()` helper
- [ ] Separar `prefixHandler`, `permissionChecker`, `commandExecutor`, `logger`
- [ ] Eliminar código duplicado en validaciones

### 🟢 MEDIO - Performance
- [ ] `cmdsLoader.js` — Lazy load por categorías habilitadas
- [ ] `serialize.js` — Cache `downloadMediaMessage` (LRU 50)
- [ ] `database.js` — Transacciones explícitas en más operaciones

### 🟢 MEDIO - Tests
- [ ] Jest/Vitest para `database.js`, `serialize.js`, `cooldown.js`
- [ ] Test de integración para comandos owner

### 🔵 BAJO - DX / Docs
- [ ] `ARCHITECTURE.md` — Flujo mensaje, DI, middlewares
- [ ] `COMMANDS.md` — Cómo crear comandos (patrón @Command)
- [ ] `DATABASE.md` — Esquema, migraciones, queries
- [ ] `DEPLOY.md` — Docker, PM2, env vars, healthcheck
- [ ] TypeScript migration plan

---

## 📊 COMANDOS MODIFICADOS (2026-11-26)

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `cmds/owner/exec.js` | Security | Timeout, maxOutput, blocked globals |
| `cmds/owner/exec2.js` | Security | Timeout, maxOutput, allow-list, blocked patterns |
| `cmds/stickers/Audiosticker.js` | Security | Sanitización input usuario |
| `core/system/database.js` | Performance | 6 índices SQLite |
| `core/cooldown.js` | Feature | Sistema cooldown centralizado |
| `cmds/economy/work.js` | Feature | Usa cooldown centralizado |
| `cmds/gacha/rollwaifu.js` | Feature | Usa cooldown centralizado |

---

## 🧪 TESTING CHECKLIST (antes de merge)

- [ ] `/ex` y `/e` — timeout 10s, output truncado, blocked globals rechazados
- [ ] `/r` — timeout 15s, allow-list funciona, patrones bloqueados rechazados
- [ ] `/audiosticker` — packname/author sanitizados (sin chars raros)
- [ ] `/work` — cooldown 30s respetado, mensaje claro
- [ ] `/rw` — cooldown 10s respetado, mensaje claro
- [ ] DB queries — `EXPLAIN QUERY PLAN` usa índices
- [ ] Bot arranca sin errores, carga comandos OK

---

## 📝 NOTAS

- Todos los cambios son **backwards-compatible**
- Solo tocan archivos owner/economy/gacha/stickers
- Core flow (`index.js`, `main.js`, `serialize.js`) **intacto**
- Cooldowns en memoria (se pierden al reiniciar) — OK para anti-spam básico