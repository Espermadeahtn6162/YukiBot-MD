export default {
  name: 'id',
  description: 'Muestra el ID del chat actual',
  async execute(sock, m) {
    const chatId = m.chat || m.key.remoteJid;
    
    await sock.sendMessage(chatId, { 
      text: `🆔 *ID de este chat:*\n\`\`\`${chatId}\`\`\`` 
    }, { quoted: m });
  }
};
