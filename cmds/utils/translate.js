import { translate } from '@vitalets/google-translate-api';

export default {
  command: ['translate', 'trad', 'traducir'],
  category: 'utils',
  description: 'Traducir texto al idioma especificado usando formato texto/idioma.',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    const defaultLang = 'es';
    
    // Mapeo de idiomas soportados (soporta el código de 2 letras y nombres comunes)
    const languageMap = {
      // Español
      'es': 'es', 'spanish': 'es', 'español': 'es', 'espanol': 'es',
      // Inglés
      'en': 'en', 'english': 'en', 'ingles': 'en', 'inglés': 'en',
      // Portugués
      'pt': 'pt', 'portuguese': 'pt', 'portugues': 'pt', 'portugués': 'pt',
      // Alemán
      'de': 'de', 'german': 'de', 'aleman': 'de', 'alemán': 'de',
      // Italiano
      'it': 'it', 'italian': 'it', 'italiano': 'it'
    };

    let fullInput = '';

    // Si respondió a un mensaje
    if (msg.quoted) {
      fullInput = msg.quoted.text || msg.quoted.caption || msg.quoted.body || '';
      // Si además de responder escribió algo en el comando (ej: .trad /it)
      if (args.length > 0) {
        fullInput = fullInput + ' ' + args.join(' ');
      }
    } else {
      fullInput = args.join(' ');
    }

    if (!fullInput.trim()) {
      return msg.reply('《✧》 Ingresa el texto a traducir. Ejemplo: *.trad Hola/it* o responde a un mensaje con *.trad /it*');
    }

    let textToTranslate = fullInput.trim();
    let targetLang = defaultLang;

    // Verificar si el texto contiene '/' para separar el texto del idioma
    if (fullInput.includes('/')) {
      const parts = fullInput.split('/');
      // Lo que está después del último '/' es el idioma objetivo
      const rawLang = parts.pop().trim().toLowerCase();
      const possibleText = parts.join('/').trim();

      if (rawLang && languageMap[rawLang]) {
        targetLang = languageMap[rawLang];
        textToTranslate = possibleText || (msg.quoted ? (msg.quoted.text || msg.quoted.caption || msg.quoted.body) : '');
      } else if (rawLang.length === 2) {
        // Si puso un código ISO de 2 letras que no está en el mapa, intentar usarlo directo
        targetLang = rawLang;
        textToTranslate = possibleText || (msg.quoted ? (msg.quoted.text || msg.quoted.caption || msg.quoted.body) : '');
      }
    }

    if (!textToTranslate || !textToTranslate.trim()) {
      return msg.reply('《✧》 No hay texto para traducir.');
    }

    try {
      await msg.react('🕒');
      const result = await translate(textToTranslate, { to: targetLang, autoCorrect: true });
      
      await sock.sendMessage(msg.chat, { text: result.text }, { quoted: msg });
      await msg.react('✔️');
    } catch (e) {
      await msg.react('✖️');
      await msg.reply(`> Un error inesperado ocurrió al ejecutar el comando *${usedPrefix + command}*.\n> [Error: *${e.message}*]`);
    }
  },
};
