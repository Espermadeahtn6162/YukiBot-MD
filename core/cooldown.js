import db from '#db';

const DEFAULT_COOLDOWNS = {
  economy: {
    work: 30000, daily: 86400000, weekly: 604800000, monthly: 2592000000,
    coinflip: 5000, crime: 60000, deposit: 2000, withdraw: 2000,
    givecoins: 5000, steal: 120000, casino: 10000, roulette: 10000,
    aventura: 60000, cazar: 30000, pescar: 30000, minar: 45000,
    mazmorra: 120000, curar: 10000,
  },
  gacha: { rollwaifu: 10000, claim: 5000, harem: 3000, buychar: 5000, sell: 5000, trade: 10000, givechar: 5000, vote: 30000 },
  downloads: { play: 15000, play2: 15000, tiktok: 15000, instagram: 15000, twitter: 15000, facebook: 15000, mediafire: 15000, drive: 15000, imagen: 10000, aptoide: 15000 },
  utils: { ia: 10000, trad: 5000, hd: 20000, gitclone: 30000 },
  stickers: { sticker: 5000, audiosticker: 10000, brat: 5000 },
};

// Alias resolution cache
let aliasToPrimary = new Map();
let lastCommandRevision = -1;

function buildAliasMap() {
  if (!global.comandos) return;
  const currentRevision = global.commandRevision || 0;
  if (aliasToPrimary.size > 0 && currentRevision === lastCommandRevision) return;

  aliasToPrimary.clear();
  const seen = new Map();

  for (const [alias, data] of global.comandos) {
    const primary = seen.get(data.pluginKey) || alias;
    seen.set(data.pluginKey, primary);
    aliasToPrimary.set(alias, primary);
  }
  lastCommandRevision = currentRevision;
}

function getPrimaryCommand(command) {
  buildAliasMap();
  return aliasToPrimary.get(command) || command;
}

function getCategoryFromCommand(command) {
  const primary = getPrimaryCommand(command);
  for (const [cat, cmds] of Object.entries(DEFAULT_COOLDOWNS)) {
    if (cmds[primary]) return cat;
  }
  return null;
}

function getCooldownMs(command) {
  const primary = getPrimaryCommand(command);
  const category = getCategoryFromCommand(command);
  if (!category) return 0;
  return DEFAULT_COOLDOWNS[category][primary] || 0;
}

function getDbField(command) {
  // Map comando -> campo DB existente
  const map = {
    work: 'lastwork', daily: 'lastdaily', weekly: 'lastweekly', monthly: 'lastmonthly',
    coinflip: 'lastcoinflip', crime: 'lastcrime', deposit: 'lastdeposit', withdraw: 'lastwithdraw',
    givecoins: 'lastgivecoins', steal: 'laststeal', casino: 'lastApuesta', roulette: 'lastroulette',
    aventura: 'lastadventure', cazar: 'lasthunt', pescar: 'lastfish', minar: 'lastmine',
    mazmorra: 'lastdungeon', curar: 'lastheal', heal: 'lastheal', curar: 'lastheal', pocion: 'lastheal', potion: 'lastheal',
    rollwaifu: 'lastRoll', claim: 'lastclaim', harem: 'lastharem', buychar: 'lastbuychar',
    sell: 'lastsell', trade: 'lasttrade', givechar: 'lastgivechar', vote: 'lastvote',
    play: 'lastplay', play2: 'lastplay2', tiktok: 'lasttiktok', instagram: 'lastinstagram',
    twitter: 'lasttwitter', facebook: 'lastfacebook', mediafire: 'lastmediafire',
    drive: 'lastdrive', imagen: 'lastimagen', aptoide: 'lastaptoide',
    ia: 'lastia', trad: 'lasttrad', hd: 'lasthd', gitclone: 'lastgitclone',
    sticker: 'laststicker', audiosticker: 'lastaudiosticker', brat: 'lastbrat',
    ppt: 'lastppt', slut: 'lastslut',
  };
  const primary = getPrimaryCommand(command);
  return map[primary] || `last${primary}`;
}

export function checkCooldown(command, userId) {
  const cooldownMs = getCooldownMs(command);
  if (!cooldownMs) return { allowed: true, remaining: 0 };

  const field = getDbField(command);
  const user = db.getChatUser('', userId); // chat_id vacío para buscar solo por user_id? No, getChatUser requiere chat_id
  // Usar getUser para campos globales, getChatUser para por chat
  // Los cooldowns de economy son por chat, otros globales
  // Simplificación: usar campo en users table si existe, sino chat_users
  // Por ahora leer de la tabla users si el campo existe ahí
  // Fallback: usar memoria + DB híbrido

  const cacheKey = `cooldown:${command}:${userId}`;
  const now = Date.now();

  // 1. Check memoria primero (rápido)
  if (global.cooldownCache?.has(cacheKey)) {
    const lastUsed = global.cooldownCache.get(cacheKey);
    if (now - lastUsed < cooldownMs) {
      return { allowed: false, remaining: cooldownMs - (now - lastUsed), cooldownMs };
    }
  }

  // 2. Check DB para comandos con campo conocido
  try {
    const userGlobal = db.getUser(userId);
    if (userGlobal && userGlobal[field] && now < userGlobal[field]) {
      global.cooldownCache = global.cooldownCache || new Map();
      global.cooldownCache.set(cacheKey, userGlobal[field] - cooldownMs); // approx
      return { allowed: false, remaining: userGlobal[field] - now, cooldownMs };
    }
  } catch {}

  return { allowed: true, remaining: 0, cooldownMs };
}

export function setCooldown(command, userId) {
  const cooldownMs = getCooldownMs(command);
  if (!cooldownMs) return;

  const field = getDbField(command);
  const now = Date.now();
  const expiry = now + cooldownMs;

  // 1. Memoria
  const cacheKey = `cooldown:${command}:${userId}`;
  global.cooldownCache = global.cooldownCache || new Map();
  global.cooldownCache.set(cacheKey, now);

  // 2. DB (persistente)
  try {
    // Intentar actualizar en users table
    const userGlobal = db.getUser(userId);
    if (userGlobal && Object.prototype.hasOwnProperty.call(userGlobal, field)) {
      db.setUser(userId, field, expiry);
      return;
    }
    // Si no existe en users, intentar chat_users (necesita chat_id - no disponible aquí)
    // Para comandos globales, usar users. Para por chat, el comando debe manejar su propio campo DB
  } catch {}
}

export function getCooldownRemaining(command, userId) {
  const cooldownMs = getCooldownMs(command);
  if (!cooldownMs) return 0;

  const field = getDbField(command);
  const now = Date.now();

  const cacheKey = `cooldown:${command}:${userId}`;
  if (global.cooldownCache?.has(cacheKey)) {
    const lastUsed = global.cooldownCache.get(cacheKey);
    return Math.max(0, cooldownMs - (now - lastUsed));
  }

  try {
    const userGlobal = db.getUser(userId);
    if (userGlobal && userGlobal[field] && now < userGlobal[field]) {
      return userGlobal[field] - now;
    }
  } catch {}

  return 0;
}

export function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.ceil(m / 60);
  return `${h}h`;
}

export function getAllCooldowns() {
  return DEFAULT_COOLDOWNS;
}

// Export para debug
export function getDebugInfo() {
  buildAliasMap();
  return {
    aliasMap: Object.fromEntries(aliasToPrimary),
    cache: global.cooldownCache ? Object.fromEntries(global.cooldownCache) : {},
    revision: global.commandRevision || 0,
  };
}