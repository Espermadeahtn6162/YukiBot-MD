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
  console.log(`[COOLDOWN] Alias map built: ${aliasToPrimary.size} entries, revision ${lastCommandRevision}`);
}

function getPrimaryCommand(command) {
  buildAliasMap();
  const primary = aliasToPrimary.get(command) || command;
  return primary;
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
  console.log(`[COOLDOWN] checkCooldown(${command}, ${userId}) -> cooldownMs: ${cooldownMs}`);
  if (!cooldownMs) return { allowed: true, remaining: 0 };

  const field = getDbField(command);
  const now = Date.now();

  const cacheKey = `cooldown:${command}:${userId}`;
  if (global.cooldownCache?.has(cacheKey)) {
    const lastUsed = global.cooldownCache.get(cacheKey);
    if (now - lastUsed < getCooldownMs(command)) {
      const remaining = getCooldownMs(command) - (now - lastUsed);
      console.log(`[COOLDOWN] BLOCKED by memory cache, remaining: ${remaining}ms`);
      return { allowed: false, remaining, cooldownMs: getCooldownMs(command) };
    }
  }

  try {
    const userGlobal = db.getUser(userId);
    const field = getDbField(command);
    if (userGlobal && userGlobal[field] && now < userGlobal[field]) {
      if (!global.cooldownCache) global.cooldownCache = new Map();
      global.cooldownCache.set(`cooldown:${command}:${userId}`, userGlobal[field] - getCooldownMs(command));
      const remaining = userGlobal[field] - now;
      console.log(`[COOLDOWN] BLOCKED by DB (${field}=${userGlobal[field]}), remaining: ${remaining}ms`);
      return { allowed: false, remaining, cooldownMs: getCooldownMs(command) };
    }
  } catch (e) {
    console.log(`[COOLDOWN] DB check error: ${e.message}`);
  }

  console.log(`[COOLDOWN] ALLOWED`);
  return { allowed: true, remaining: 0, cooldownMs: getCooldownMs(command) };
}

export function setCooldown(command, userId) {
  const cooldownMs = getCooldownMs(command);
  console.log(`[COOLDOWN] setCooldown(${command}, ${userId}) -> cooldownMs: ${cooldownMs}`);
  if (!cooldownMs) return;

  const field = getDbField(command);
  const now = Date.now();
  const expiry = now + cooldownMs;

  const cacheKey = `cooldown:${command}:${userId}`;
  global.cooldownCache = global.cooldownCache || new Map();
  global.cooldownCache.set(cacheKey, now);
  console.log(`[COOLDOWN] Memory cache SET: ${cacheKey} = ${now}`);

  try {
    const userGlobal = db.getUser(userId);
    const field = getDbField(command);
    if (userGlobal && Object.prototype.hasOwnProperty.call(userGlobal, field)) {
      db.setUser(userId, field, now + cooldownMs);
      console.log(`[COOLDOWN] DB SET: ${field} = ${now + cooldownMs} for user ${userId}`);
    } else {
      console.log(`[COOLDOWN] Field ${field} not found in userGlobal, skipping DB`);
    }
  } catch (e) {
    console.log(`[COOLDOWN] DB set error: ${e.message}`);
  }
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

export function getDebugInfo() {
  buildAliasMap();
  return {
    aliasMap: Object.fromEntries(aliasToPrimary),
    cache: global.cooldownCache ? Object.fromEntries(global.cooldownCache) : {},
    revision: global.commandRevision || 0,
  };
}