import { format } from 'util';
import chalk from 'chalk';
import db from '#db';

export default {
  command: ['testcmd', 'test', 'debugcmd'],
  category: 'owner',
  description: 'Debug completo de un comando (solo terminal)',
  isOwner: true,
  run: async ({ msg, sock, args, usedPrefix, command, text, groupMetadata, participants, isAdmins, isBotAdmins, isOwner, __dirname }) => {
    const targetCmd = args[0]?.toLowerCase();
    if (!targetCmd) {
      return sock.reply(msg.chat, `《✧》 Uso: *${usedPrefix}testcmd <comando>*\nEjemplo: *${usedPrefix}testcmd menu*`, msg);
    }

    const cmdData = global.comandos.get(targetCmd);
    const startTime = Date.now();

    console.log(chalk.bgMagenta.black.bold('\n 🔬 TESTCMD DEBUG '));
    console.log(chalk.gray(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.yellow(`Comando objetivo: ${targetCmd}`));
    console.log(chalk.gray(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));

    // 1. COMANDO ENCONTRADO
    console.log(chalk.cyan.bold('📦 1. COMANDO REGISTRADO:'));
    if (cmdData) {
      console.log(chalk.green('   ✅ ENCONTRADO'));
      console.log(chalk.gray(`      pluginKey: ${cmdData.pluginKey}`));
      console.log(chalk.gray(`      category: ${cmdData.category}`));
      console.log(chalk.gray(`      description: ${cmdData.description}`));
      console.log(chalk.gray(`      isOwner: ${cmdData.isOwner}`));
      console.log(chalk.gray(`      isAdmin: ${cmdData.isAdmin}`));
      console.log(chalk.gray(`      botAdmin: ${cmdData.botAdmin}`));
      console.log(chalk.gray(`      customPrefix: ${cmdData.customPrefix}`));
    } else {
      console.log(chalk.red('   ❌ NO ENCONTRADO en global.comandos'));
      console.log(chalk.gray(`      Buscado: "${targetCmd}"`));
      console.log(chalk.gray(`      Total comandos: ${global.comandos.size}`));
    }

    // 2. MENSAJE ORIGINAL (raw)
    console.log(chalk.cyan.bold('\n📨 2. MENSAJE ORIGINAL (msg.key):'));
    console.log(chalk.gray(`   id: ${msg.key?.id}`));
    console.log(chalk.gray(`   remoteJid: ${msg.key?.remoteJid}`));
    console.log(chalk.gray(`   fromMe: ${msg.key?.fromMe}`));
    console.log(chalk.gray(`   participant: ${msg.key?.participant || 'N/A'}`));

    // 3. MENSAJE SERIALIZADO (smsg)
    console.log(chalk.cyan.bold('\n🔄 3. MENSAJE SERIALIZADO (m):'));
    console.log(chalk.gray(`   chat: ${msg.chat}`));
    console.log(chalk.gray(`   sender: ${msg.sender}`));
    console.log(chalk.gray(`   pushName: ${msg.pushName}`));
    console.log(chalk.gray(`   isGroup: ${msg.isGroup}`));
    console.log(chalk.gray(`   isCommands: ${msg.isCommands}`));
    console.log(chalk.gray(`   usedPrefix: ${msg.usedPrefix}`));
    console.log(chalk.gray(`   command: ${msg.command}`));
    console.log(chalk.gray(`   args: ${JSON.stringify(msg.args)}`));
    console.log(chalk.gray(`   text: ${msg.text}`));
    console.log(chalk.gray(`   body: ${msg.body}`));
    console.log(chalk.gray(`   type: ${msg.type}`));
    console.log(chalk.gray(`   isMedia: ${msg.isMedia}`));
    if (msg.isMedia) {
      console.log(chalk.gray(`   mime: ${msg.mime}`));
      console.log(chalk.gray(`   size: ${msg.size}`));
    }
    console.log(chalk.gray(`   mentionedJid: ${JSON.stringify(msg.mentionedJid)}`));
    console.log(chalk.gray(`   device: ${msg.device}`));
    console.log(chalk.gray(`   timestamp: ${msg.timestamp}`));
    console.log(chalk.gray(`   expiration: ${msg.expiration}`));

    // 4. CONTEXTO CHAT/USER
    console.log(chalk.cyan.bold('\n💾 4. BASE DE DATOS:'));
    const botId = sock?.user?.id.split(':')[0] + '@s.whatsapp.net';
    const chatDB = db.getChat(msg.chat);
    const userDB = db.getUser(msg.sender);
    const chatUserDB = db.getChatUser(msg.chat, msg.sender);
    const settingsDB = db.getSettings(botId);

    console.log(chalk.gray(`   Chat DB:`));
    console.log(chalk.gray(`      isBanned: ${chatDB?.isBanned}`));
    console.log(chalk.gray(`      welcome: ${chatDB?.welcome}`));
    console.log(chalk.gray(`      economy: ${chatDB?.economy}`));
    console.log(chalk.gray(`      gacha: ${chatDB?.gacha}`));
    console.log(chalk.gray(`      adminonly: ${chatDB?.adminonly}`));
    console.log(chalk.gray(`      primaryBot: ${chatDB?.primaryBot}`));

    console.log(chalk.gray(`   User DB:`));
    console.log(chalk.gray(`      name: ${userDB?.name}`));
    console.log(chalk.gray(`      exp: ${userDB?.exp}`));
    console.log(chalk.gray(`      level: ${userDB?.level}`));
    console.log(chalk.gray(`      usedcommands: ${userDB?.usedcommands}`));

    console.log(chalk.gray(`   ChatUser DB:`));
    console.log(chalk.gray(`      coins: ${chatUserDB?.coins}`));
    console.log(chalk.gray(`      bank: ${chatUserDB?.bank}`));
    console.log(chalk.gray(`      health: ${chatUserDB?.health}`));
    console.log(chalk.gray(`      afk: ${chatUserDB?.afk}`));

    console.log(chalk.gray(`   Settings DB:`));
    console.log(chalk.gray(`      prefix: ${JSON.stringify(settingsDB?.prefix)}`));
    console.log(chalk.gray(`      namebot: ${settingsDB?.namebot}`));
    console.log(chalk.gray(`      self: ${settingsDB?.self}`));

    // 5. PERMISOS
    console.log(chalk.cyan.bold('\n🔐 5. PERMISOS:'));
    console.log(chalk.gray(`   isOwner: ${isOwner}`));
    console.log(chalk.gray(`   isAdmins: ${isAdmins}`));
    console.log(chalk.gray(`   isBotAdmins: ${isBotAdmins}`));
    console.log(chalk.gray(`   msg.isGroup: ${msg.isGroup}`));
    if (cmdData) {
      const ownerCheck = cmdData.isOwner && !isOwner;
      const adminCheck = cmdData.isAdmin && !isAdmins;
      const botAdminCheck = cmdData.botAdmin && !isBotAdmins;
      console.log(chalk.gray(`   Bloqueado por isOwner: ${ownerCheck ? '❌ SÍ' : '✅ No'}`));
      console.log(chalk.gray(`   Bloqueado por isAdmin: ${adminCheck ? '❌ SÍ' : '✅ No'}`));
      console.log(chalk.gray(`   Bloqueado por botAdmin: ${botAdminCheck ? '❌ SÍ' : '✅ No'}`));
      console.log(chalk.gray(`   self-mode active: ${settingsDB?.self && !isOwner ? '❌ SÍ (bloquea)' : '✅ No'}`));
      console.log(chalk.gray(`   chat banned: ${chatDB?.isBanned && !isOwner ? '❌ SÍ (bloquea)' : '✅ No'}`));
      console.log(chalk.gray(`   adminonly: ${chatDB?.adminonly && !isAdmins ? '❌ SÍ (bloquea)' : '✅ No'}`));
    }

    // 6. GRUPO
    if (msg.isGroup && groupMetadata) {
      console.log(chalk.cyan.bold('\n👥 6. GRUPO:'));
      console.log(chalk.gray(`   subject: ${groupMetadata.subject}`));
      console.log(chalk.gray(`   participants: ${groupMetadata.participants?.length}`));
      console.log(chalk.gray(`   admins: ${participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0}`));
      console.log(chalk.gray(`   desc: ${groupMetadata.desc?.slice(0, 50) || 'sin desc'}`));
    }

    // 7. SOCKET STATE
    console.log(chalk.cyan.bold('\n🔌 7. SOCKET STATE:'));
    console.log(chalk.gray(`   user.id: ${sock?.user?.id}`));
    console.log(chalk.gray(`   user.name: ${sock?.user?.name}`));
    console.log(chalk.gray(`   uptime: ${sock?.uptime ? Date.now() - sock.uptime : 'N/A'}ms`));
    console.log(chalk.gray(`   ws.readyState: ${sock?.ws?.readyState}`));
    console.log(chalk.gray(`   ev.listeners: ${Object.keys(sock?.ev?.listeners || {}).length}`));

    // 8. PLUGIN INFO
    if (cmdData && global.plugins[cmdData.pluginKey]) {
      const plugin = global.plugins[cmdData.pluginKey];
      console.log(chalk.cyan.bold('\n🔌 8. PLUGIN:'));
      console.log(chalk.gray(`   dirname: ${plugin.dirname}`));
      console.log(chalk.gray(`   has run: ${typeof plugin.default?.run === 'function'}`));
      console.log(chalk.gray(`   has all: ${typeof plugin.all === 'function'}`));
      console.log(chalk.gray(`   has before: ${typeof plugin.before === 'function'}`));
    }

    // 9. COMANDOS GLOBALES
    console.log(chalk.cyan.bold('\n📊 9. ESTADÍSTICAS GLOBALES:'));
    console.log(chalk.gray(`   global.comandos.size: ${global.comandos.size}`));
    console.log(chalk.gray(`   global.cmdsExecute.length: ${global.cmdsExecute?.length}`));
    console.log(chalk.gray(`   global.plugins keys: ${Object.keys(global.plugins || {}).length}`));
    console.log(chalk.gray(`   global.conns.length: ${global.conns?.length || 0}`));
    console.log(chalk.gray(`   msgStore.size: ${global.msgStore?.size || 0}`));

    const elapsed = Date.now() - startTime;
    console.log(chalk.gray(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
    console.log(chalk.bgGreen.black.bold(` ✅ DEBUG COMPLETO EN ${elapsed}ms `));
    console.log(chalk.gray(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`));

    // Silencioso en WhatsApp
  }
};