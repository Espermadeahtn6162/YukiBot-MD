import db from '#db';

const DEFAULT_COOLDOWNS = {
  economy: {
    work: 30000,        // 30s
    daily: 86400000,    // 24h (manejado por BD)
    weekly: 604800000,  // 7d
    monthly: 2592000000, // 30d
    coinflip: 5000,     // 5s
    crime: 60000,       // 1min
    deposit: 2000,      // 2s
    withdraw: 2000,     // 2s
    givecoins: 5000,    // 5s
    steal: 120000,      // 2min
    casino: 10000,      // 10s
    roulette: 10000,    // 10s
    aventura: 60000,    // 1min
    cazar: 30000,       // 30s
    pescar: 30000,      // 30s
    minar: 45000,       // 45s
    mazmorra: 120000,   // 2min
    curar: 10000,       // 10s
  },
  gacha: {
    rollwaifu: 10000,   // 10s
    claim: 5000,        // 5s
    harem: 3000,        // 3s
    buychar: 5000,      // 5s
    sell: 5000,         // 5s
    trade: 10000,       // 10s
    givechar: 5000,     // 5s
    vote: 30000,        // 30s
  },
  downloads: {
    play: 15000,        // 15s
    play2: 15000,       // 15s
    tiktok: 15000,
    instagram: 15000,
    twitter: 15000,
    facebook: 15000,
    mediafire: 15000,
    drive: 15000,
    imagen: 10000,
    aptoide: 15000,
  },
  utils: {
    ia: 10000,          // 10s
    trad: 5000,
    hd: 20000,
    gitclone: 30000,
  },
  stickers: {
    sticker: 5000,
    audiosticker: 10000,
    brat: 5000,
  },
};

function getCooldownKey(category, command, userId) {
  return `cooldown:${category}:${command}:${userId}`;
}

function getCategoryFromCommand(command) {
  for (const [cat, cmds] of Object.entries(DEFAULT_COOLDOWNS)) {
    if (cmds[command]) return cat;
  }
  return null;
}

export function checkCooldown(command, userId) {
  const category = getCategoryFromCommand(command);
  if (!category) return { allowed: true, remaining: 0 };

  const cooldownMs = DEFAULT_COOLDOWNS[category][command];
  if (!cooldownMs) return { allowed: true, remaining: 0 };

  const key = getCooldownKey(category, command, userId);
  const now = Date.now();
  const lastUsed = global.cooldownCache?.get(key) || 0;

  if (now - lastUsed < cooldownMs) {
    const remaining = cooldownMs - (now - lastUsed);
    return { allowed: false, remaining, cooldownMs };
  }

  return { allowed: true, remaining: 0, cooldownMs };
}

export function setCooldown(command, userId) {
  const category = getCategoryFromCommand(command);
  if (!category) return;

  const key = getCooldownKey(category, command, userId);
  if (!global.cooldownCache) global.cooldownCache = new Map();
  global.cooldownCache.set(key, Date.now());
}

export function getCooldownRemaining(command, userId) {
  const category = getCategoryFromCommand(command);
  if (!category) return 0;

  const cooldownMs = DEFAULT_COOLDOWNS[category][command];
  if (!cooldownMs) return 0;

  const key = getCooldownKey(category, command, userId);
  const lastUsed = global.cooldownCache?.get(key) || 0;
  const remaining = cooldownMs - (Date.now() - lastUsed);
  return Math.max(0, remaining);
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