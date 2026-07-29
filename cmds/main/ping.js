import db from '#db';
export default {
  command: ['ping', 'p'],
  category: 'main',
  run: async ({ msg, sock }) => {
    const start = Date.now()
    const sent = await sock.sendMessage(msg.chat, { text: '`❏ ¡Pong!`' + `\n> *${db.getSettings(sock.user.id.split(':')[0] + "@s.whatsapp.net").namebot}*`}, { quoted: msg })
    const latency = Date.now() - start
    
    // Le agregamos la línea del ID abajo para copiarlo directo en WhatsApp
    await sock.sendMessage(msg.chat, { 
      text: `✿ *Pong!*\n> Tiempo ⴵ ${latency.toFixed(4).split(".")[0]}ms\n\n🆔 *ID de este grupo:*\n\`\`\`${msg.chat}\`\`\``, 
      edit: sent.key 
    }, { quoted: msg })
  },
};
