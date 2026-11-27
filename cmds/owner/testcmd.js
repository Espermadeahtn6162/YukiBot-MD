import { format } from 'util';
import chalk from 'chalk';
import db from '#db';

const EMOJI = {
  ok: '✅',
  no: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  rocket: '🚀',
  box: '📦',
  mail: '📨',
  sync: '🔄',
  db: '💾',
  lock: '🔐',
  users: '👥',
  plug: '🔌',
  chart: '📊',
  time: '⏱️',
  spark: '✨',
  line: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
};

function section(title, emoji) {
  console.log(chalk.cyan.bold(`\n${emoji}  ${title}`));
  console.log(chalk.gray(EMOJI.line));
}

function kv(label, value, color = 'gray') {
  const val = value === undefined || value === null ? '—' : String(value);
  console.log(chalk[color](`   ${label}: ${val}`));
}

function kvBool(label, value) {
  kv(label, value ? `${EMOJI.ok} Sí` : `${EMOJI.no} No`, value ? 'green' : 'red');
}

function kvBlock(label, blocked) {
  kv(label, blocked ? `${EMOJI.no} BLOQUEA` : `${EMOJI.ok} Pasa`, blocked ? 'red' : 'green');
}

export default {
  command: ['testcmd', 'test', 'debugcmd'],
  category: 'owner',
  description: 'Debug bonito de un comando (solo terminal, para niños 🧒)',
  isOwner: true,
  run: async ({ msg, sock, args, usedPrefix, command, text, groupMetadata, participants, isAdmins, isBotAdmins, isOwner, __dirname }) => {
    const targetCmd = args[0]?.toLowerCase();
    if (!targetCmd) {
      return sock.reply(msg.chat, `《✧》 Uso: *${usedPrefix}testcmd <comando>*\nEjemplo: *${usedPrefix}testcmd menu*`, msg);
    }

    const cmdData = global.comandos.get(targetCmd);
    const startTime = Date.now();

    console.log(chalk.bgMagenta.black.bold(`\n ${EMOJI.rocket} TESTCMD — Debug divertido `));
    console.log(chalk.gray(EMOJI.line));
    kv('Comando', targetCmd, 'yellow');
    console.log(chalk.gray(EMOJI.line));

    // 1. COMANDO
    section('COMANDO REGISTRADO', EMOJI.box);
    if (cmdData) {
      kvBool('¿Existe?', true);
      kv('Categoría', cmdData.category);
      kv('Descripción', cmdData.description || 'sin descripción');
      kv('Plugin', cmdData.pluginKey);
      kvBool('Solo Owner', cmdData.isOwner);
      kvBool('Solo Admins', cmdData.isAdmin);
      kvBool('Bot Admin req.', cmdData.botAdmin);
      kv('Prefix custom', cmdData.customPrefix ? 'Sí' : 'No');
    } else {
      kvBool('¿Existe?', false);
      kv('Buscado', `"${targetCmd}"`);
      kv('Total en bot', global.comandos.size);
    }

    // 2. MENSAJE ORIGINAL
    section('MENSAJE ORIGINAL (lo que llegó de WA)', EMOJI.mail);
    kv('ID', msg.key?.id);
    kv('Chat', msg.key?.remoteJid);
    kv('¿De mí?', msg.key?.fromMe ? 'Sí 🤖' : 'No 👤');
    kv('Participante', msg.key?.participant || 'N/A');

    // 3. MENSAJE SERIALIZADO
    section('MENSAJE PROCESADO (lo que usa el bot)', EMOJI.sync);
    kv('Chat', msg.chat);
    kv('Tu ID', msg.sender);
    kv('Tu nombre', msg.pushName || 'sin nombre');
    kvBool('Es grupo', msg.isGroup);
    kvBool('Es comando', msg.isCommands);
    kv('Prefijo usado', msg.usedPrefix || 'ninguno');
    kv('Comando detectado', msg.command || 'ninguno');
    kv('Argumentos', JSON.stringify(msg.args));
    kv('Texto completo', msg.text ? msg.text.slice(0, 80) : 'vacío');
    kv('Body', msg.body ? msg.body.slice(0, 80) : 'vacío');
    kv('Tipo', msg.type);
    kvBool('Tiene media', msg.isMedia);
    if (msg.isMedia) {
      kv('Mime', msg.mime);
      kv('Tamaño', msg.size ? `${(msg.size/1024).toFixed(1)} KB` : '?');
    }
    kv('Menciones', msg.mentionedJid?.length || 0);
    kv('Dispositivo', msg.device);
    kv('Timestamp', msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '?');
    kv('Expiración', msg.expiration || 'ninguna');

    // 4. BASE DE DATOS
    section('BASE DE DATOS (lo que sabe el bot)', EMOJI.db);
    const botId = sock?.user?.id.split(':')[0] + '@s.whatsapp.net';
    const chatDB = db.getChat(msg.chat);
    const userDB = db.getUser(msg.sender);
    const chatUserDB = db.getChatUser(msg.chat, msg.sender);
    const settingsDB = db.getSettings(botId);

    console.log(chalk.yellow('   📝 CHAT:'));
    kvBool('  Baneado', chatDB?.isBanned);
    kvBool('  Welcome', chatDB?.welcome);
    kvBool('  Economy', chatDB?.economy);
    kvBool('  Gacha', chatDB?.gacha);
    kvBool('  Solo admins', chatDB?.adminonly);
    kv('  Bot primario', chatDB?.primaryBot || 'ninguno');

    console.log(chalk.yellow('\n   👤 TU USER:'));
    kv('  Nombre', userDB?.name || 'sin nombre');
    kv('  XP', userDB?.exp?.toLocaleString() || 0);
    kv('  Nivel', userDB?.level || 0);
    kv('  Comandos usados', userDB?.usedcommands?.toLocaleString() || 0);

    console.log(chalk.yellow('\n   💰 EN ESTE CHAT:'));
    kv('  Coins', chatUserDB?.coins?.toLocaleString() || 0);
    kv('  Banco', chatUserDB?.bank?.toLocaleString() || 0);
    kv('  Salud', chatUserDB?.health || 100);
    kv('  AFK', chatUserDB?.afk > 0 ? 'Sí' : 'No');

    console.log(chalk.yellow('\n   ⚙️ SETTINGS DEL BOT:'));
    kv('  Prefijos', JSON.stringify(settingsDB?.prefix));
    kv('  Nombre bot', settingsDB?.namebot);
    kvBool('  Modo privado', settingsDB?.self);

    // 5. PERMISOS
    section('PERMISOS (¿te deja pasar?)', EMOJI.lock);
    kvBool('Eres Owner', isOwner);
    kvBool('Eres Admin', isAdmins);
    kvBool('Bot es Admin', isBotAdmins);
    kvBool('Es grupo', msg.isGroup);

    if (cmdData) {
      const ownerBlock = cmdData.isOwner && !isOwner;
      const adminBlock = cmdData.isAdmin && !isAdmins;
      const botAdminBlock = cmdData.botAdmin && !isBotAdmins;
      const selfBlock = settingsDB?.self && !isOwner;
      const bannedBlock = chatDB?.isBanned && !isOwner;
      const adminOnlyBlock = chatDB?.adminonly && !isAdmins;

      console.log(chalk.yellow('\n   🚦 ¿TE BLOQUEA ALGO?'));
      kvBlock('  Solo Owner', ownerBlock);
      kvBlock('  Solo Admins', adminBlock);
      kvBlock('  Bot Admin req.', botAdminBlock);
      kvBlock('  Modo privado', selfBlock);
      kvBlock('  Chat baneado', bannedBlock);
      kvBlock('  Solo admins chat', adminOnlyBlock);

      const anyBlock = ownerBlock || adminBlock || botAdminBlock || selfBlock || bannedBlock || adminOnlyBlock;
      if (anyBlock) {
        console.log(chalk.red.bold('\n   ⛠️ RESULTADO: NO EJECUTARÍA (bloqueado arriba)'));
      } else {
        console.log(chalk.green.bold('\n   ✨ RESULTADO: EJECUTARÍA BIEN'));
      }
    }

    // 6. GRUPO
    if (msg.isGroup && groupMetadata) {
      section('INFO DEL GRUPO', EMOJI.users);
      kv('Nombre', groupMetadata.subject);
      kv('Miembros', groupMetadata.participants?.length || 0);
      kv('Admins', participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0);
      kv('Descripción', groupMetadata.desc?.slice(0, 50) || 'sin descripción');
    }

    // 7. SOCKET
    section('ESTADO DE CONEXIÓN', EMOJI.plug);
    kv('Bot ID', sock?.user?.id);
    kv('Bot nombre', sock?.user?.name);
    kv('Uptime', sock?.uptime ? `${((Date.now() - sock.uptime)/1000/60).toFixed(1)} min` : 'N/A');
    kv('WS Estado', sock?.ws?.readyState === 1 ? '🟢 Conectado' : '🔴 Desconectado');
    kv('Event listeners', Object.keys(sock?.ev?.listeners || {}).length);

    // 8. PLUGIN
    if (cmdData && global.plugins[cmdData.pluginKey]) {
      const plugin = global.plugins[cmdData.pluginKey];
      section('PLUGIN (archivo)', EMOJI.plug);
      kv('Carpeta', plugin.dirname);
      kvBool('Tiene run()', typeof plugin.default?.run === 'function');
      kvBool('Tiene all()', typeof plugin.all === 'function');
      kvBool('Tiene before()', typeof plugin.before === 'function');
    }

    // 9. STATS
    section('ESTADÍSTICAS GLOBALES', EMOJI.chart);
    kv('Comandos totales', global.comandos.size.toLocaleString());
    kv('Plugins (all/before)', global.cmdsExecute?.length || 0);
    kv('Archivos plugin', Object.keys(global.plugins || {}).length);
    kv('Sub-bots', global.conns?.length || 0);
    kv('Msg en cache', global.msgStore?.size || 0);

    // FIN
    const elapsed = Date.now() - startTime;
    console.log(chalk.gray(`\n${EMOJI.line}`));
    console.log(chalk.bgGreen.black.bold(` ${EMOJI.spark} LISTO EN ${elapsed}ms ${EMOJI.spark} `));
    console.log(chalk.gray(`${EMOJI.line}\n`));

    // Silencioso en WhatsApp
  }
};