import db from '#db';

const COOLDOWNS = {
  work: 30000,
  daily: 86400000,
  weekly: 604800000,
  monthly: 2592000000,
  coinflip: 10000,
  crime: 60000,
  deposit: 2000,
  withdraw: 2000,
  givecoins: 5000,
  steal: 120000,
  casino: 10000,
  roulette: 10000,
  aventura: 60000,
  cazar: 30000,
  pescar: 30000,
  minar: 45000,
  mazmorra: 120000,
  curar: 10000,
  heal: 10000,
  rollwaifu: 10000,
  claim: 5000,
  harem: 3000,
  buychar: 5000,
  sell: 5000,
  trade: 10000,
  givechar: 5000,
  vote: 30000,
  play: 15000,
  play2: 15000,
  tiktok: 15000,
  instagram: 15000,
  twitter: 15000,
  facebook: 15000,
  mediafire: 15000,
  drive: 15000,
  imagen: 10000,
  aptoide: 15000,
  ia: 10000,
  trad: 5000,
  hd: 20000,
  gitclone: 30000,
  sticker: 5000,
  audiosticker: 10000,
  brat: 5000,
  ppt: 60000,
  slut: 300000,
};

const ALIASES = {
  w: 'work', chambear: 'work', trabajar: 'work',
  diario: 'daily', semanal: 'weekly', mensual: 'monthly',
  cf: 'coinflip', flip: 'coinflip',
  dep: 'deposit', d: 'deposit', depositar: 'deposit',
  with: 'withdraw', retirar: 'withdraw',
  pay: 'givecoins', coinsgive: 'givecoins',
  robar: 'steal', rob: 'steal',
  apostar: 'casino', slot: 'casino',
  rt: 'roulette', ruleta: 'roulette',
  aventura: 'aventura',
  cazar: 'cazar', hunt: 'cazar',
  pescar: 'pescar', fish: 'pescar',
  minar: 'minar', mine: 'minar',
  mazmorra: 'mazmorra', dungeon: 'mazmorra',
  curar: 'curar', heal: 'curar', pocion: 'curar', potion: 'curar',
  rw: 'rollwaifu', roll: 'rollwaifu',
  c: 'claim', reclamar: 'claim',
  harem: 'harem', waifus: 'harem', claims: 'harem',
  buyc: 'buychar', buychar: 'buychar',
  vender: 'sell', sell: 'sell',
  intercambiar: 'trade', trade: 'trade',
  regalar: 'givechar', givewaifu: 'givechar', givechar: 'givechar',
  votar: 'vote', vote: 'vote',
  play: 'play', mp3: 'play', playaudio: 'play', ytaudio: 'play', ytmp3: 'play',
  play2: 'play2', mp4: 'play2', playvideo: 'play2', ytvideo: 'play2', ytmp4: 'play2',
  tt: 'tiktok', tiktok: 'tiktok',
  ig: 'instagram', reel: 'instagram', instagram: 'instagram',
  x: 'twitter', twitter: 'twitter',
  fb: 'facebook', facebook: 'facebook',
  mf: 'mediafire', mediafire: 'mediafire',
  gdrive: 'drive', drive: 'drive',
  img: 'imagen', imagen: 'imagen', image: 'imagen',
  apk: 'aptoide', aptoide: 'aptoide',
  ia: 'ia', chatgpt: 'ia',
  trad: 'trad', traducir: 'trad', translate: 'trad',
  hd: 'hd', enhance: 'hd', remini: 'hd',
  git: 'gitclone', gitclone: 'gitclone',
  s: 'sticker', sticker: 'sticker',
  asticker: 'audiosticker', saudio: 'audiosticker', 's audio': 'audiosticker',
  brat: 'brat', bratv: 'brat', qc: 'brat', emojimix: 'brat',
  ppt: 'ppt',
  slut: 'slut', prostituirse: 'slut',
};

function getPrimary(command) {
  return ALIASES[command.toLowerCase()] || command.toLowerCase();
}

function getCooldownMs(command) {
  const primary = getPrimary(command);
  return COOLDOWNS[primary] || 0;
}

function getDbField(command) {
  const map = {
    work: 'lastwork', daily: 'lastdaily', weekly: 'lastweekly', monthly: 'lastmonthly',
    coinflip: 'lastcoinflip', crime: 'lastcrime', deposit: 'lastdeposit', withdraw: 'lastwithdraw',
    givecoins: 'lastgivecoins', steal: 'laststeal', casino: 'lastApuesta', roulette: 'lastroulette',
    aventura: 'lastadventure', cazar: 'lasthunt', pescar: 'lastfish', minar: 'lastmine',
    mazmorra: 'lastdungeon', curar: 'lastheal', heal: 'lastheal',
    rollwaifu: 'lastRoll', claim: 'lastclaim', harem: 'lastharem', buychar: 'lastbuychar',
    sell: 'lastsell', trade: 'lasttrade', givechar: 'lastgivechar', vote: 'lastvote',
    play: 'lastplay', play2: 'lastplay2', tiktok: 'lasttiktok', instagram: 'lastinstagram',
    twitter: 'lasttwitter', facebook: 'lastfacebook', mediafire: 'lastmediafire',
    drive: 'lastdrive', imagen: 'lastimagen', aptoide: 'lastaptoide',
    ia: 'lastia', trad: 'lasttrad', hd: 'lasthd', gitclone: 'lastgitclone',
    sticker: 'laststicker', audiosticker: 'lastaudiosticker', brat: 'lastbrat',
    ppt: 'lastppt', slut: 'lastslut',
  };
  const primary = getPrimary(command);
  return map[primary] || `last${primary}`;
}

export function checkCooldown(command, userId) {
  const cooldownMs = getCooldownMs(command);
  if (!cooldownMs) return { allowed: true, remaining: 0 };

  const field = getDbField(command);
  const now = Date.now();

  try {
    const userGlobal = db.getUser(userId);
    if (userGlobal && userGlobal[field] && now < userGlobal[field]) {
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

  try {
    const userGlobal = db.getUser(userId);
    if (userGlobal && Object.prototype.hasOwnProperty.call(userGlobal, field)) {
      db.setUser(userId, field, now + cooldownMs);
    }
  } catch {}
}

export function getCooldownRemaining(command, userId) {
  const cooldownMs = getCooldownMs(command);
  if (!cooldownMs) return 0;

  const field = getDbField(command);
  const now = Date.now();

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
  return COOLDOWNS;
}