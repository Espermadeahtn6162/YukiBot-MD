import fs from 'fs';
import { spawn } from 'child_process';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';
import db from '#db';

const runFfmpegArgs = (ffmpegArgs, errorMessage) => {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => {
      err += d.toString();
    });
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${errorMessage}: ${err}`));
    });
  });
};

const videoToWebpBuffer = async (inputPath) => {
  const outputPath = `./tmp/audsticker-vid-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  try {
    await runFfmpegArgs([
      '-y',
      '-i', inputPath,
      '-vf', 'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba',
      '-c:v', 'libwebp_anim',
      '-lossless', '0',
      '-q:v', '75',
      '-loop', '0',
      '-an',
      outputPath
    ], 'Error convirtiendo video a webp');
    return fs.readFileSync(outputPath);
  } finally {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
};

const imageToWebpBuffer = async (inputPath) => {
  const outputPath = `./tmp/audsticker-img-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  try {
    await runFfmpegArgs([
      '-y',
      '-i', inputPath,
      '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba',
      '-c:v', 'libwebp',
      '-lossless', '0',
      '-q:v', '80',
      outputPath
    ], 'Error convirtiendo imagen a webp');
    return fs.readFileSync(outputPath);
  } finally {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
};

const audioToOpusBuffer = async (inputPath) => {
  const outputPath = `./tmp/audsticker-snd-${Date.now()}-${Math.random().toString(36).slice(2)}.ogg`;
  try {
    await runFfmpegArgs([
      '-y',
      '-i', inputPath,
      '-vn',
      '-c:a', 'libopus',
      '-b:a', '64k',
      '-ac', '1',
      '-f', 'ogg',
      outputPath
    ], 'Error convirtiendo audio a ogg/opus');
    return fs.readFileSync(outputPath);
  } finally {
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
};

export default {
  command: ['audiosticker', 'asticker', 's audio', 'saudio'],
  category: 'stickers',
  description: 'Crear un sticker con audio a partir de un video o combinando imagen/sticker + audio.',
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    const tempFiles = [];
    const cleanup = () => {
      for (const file of tempFiles) {
        if (file && fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch {}
        }
      }
    };

    try {
      if (!fs.existsSync('./tmp')) {
        fs.mkdirSync('./tmp', { recursive: true });
      }

      const quoted = msg.quoted || msg;
      const quotedMime = (quoted.msg || quoted).mimetype || '';
      const mainMime = (msg.msg || msg).mimetype || '';

      let user = db.getUser(msg.sender);
      const name = user?.name || 'Usuario';
      const meta1 = user?.metadatos ? String(user.metadatos).trim() : '';
      const meta2 = user?.metadatos2 ? String(user.metadatos2).trim() : '';
      const texto1 = meta1 ? meta1 : 'ʏᴜᴋɪ 🧠 Wᴀʙᴏᴛ';
      const texto2 = meta1 ? (meta2 ? meta2 : '') : `@${name}`;

      const cleanText = args.join(' ').trim();
      const parts = cleanText.split(/[\u2022|]/).map((p) => p.trim());
      const packname = parts[0] || texto1;
      const author = parts.length > 1 ? parts[1] : (cleanText ? (meta1 ? texto2 : '') : texto2);

      let webpBuffer = null;
      let opusBuffer = null;

      // Caso 1: Video directo o citado (extrae el video como sticker animado y el audio como opus)
      if (/video/.test(quotedMime)) {
        const duration = (quoted.msg || quoted).seconds || 0;
        if (duration > 15) {
          cleanup();
          return msg.reply('《✧》 El video no puede ser muy largo (máximo 15 segundos).');
        }
        const vidBuf = await quoted.download();
        const vidPath = `./tmp/in-vid-${Date.now()}.mp4`;
        tempFiles.push(vidPath);
        fs.writeFileSync(vidPath, vidBuf);

        webpBuffer = await videoToWebpBuffer(vidPath);
        opusBuffer = await audioToOpusBuffer(vidPath);
      }
      // Caso 2: Audio citado y el mensaje principal tiene imagen o sticker (o viceversa)
      else if (/audio/.test(quotedMime) && (/image|webp/.test(mainMime))) {
        const audBuf = await quoted.download();
        const audPath = `./tmp/in-aud-${Date.now()}.ogg`;
        tempFiles.push(audPath);
        fs.writeFileSync(audPath, audBuf);
        opusBuffer = await audioToOpusBuffer(audPath);

        const visBuf = await msg.download();
        if (/webp/.test(mainMime)) {
          webpBuffer = visBuf;
        } else {
          const imgPath = `./tmp/in-img-${Date.now()}.img`;
          tempFiles.push(imgPath);
          fs.writeFileSync(imgPath, visBuf);
          webpBuffer = await imageToWebpBuffer(imgPath);
        }
      }
      // Caso 3: El mensaje citado es imagen/sticker y el mensaje actual es un audio
      else if (/image|webp/.test(quotedMime) && /audio/.test(mainMime)) {
        const visBuf = await quoted.download();
        if (/webp/.test(quotedMime)) {
          webpBuffer = visBuf;
        } else {
          const imgPath = `./tmp/in-img-${Date.now()}.img`;
          tempFiles.push(imgPath);
          fs.writeFileSync(imgPath, visBuf);
          webpBuffer = await imageToWebpBuffer(imgPath);
        }

        const audBuf = await msg.download();
        const audPath = `./tmp/in-aud-${Date.now()}.ogg`;
        tempFiles.push(audPath);
        fs.writeFileSync(audPath, audBuf);
        opusBuffer = await audioToOpusBuffer(audPath);
      } else {
        cleanup();
        return sock.reply(
          msg.chat,
          `《✧》 Responde a un *video* (con audio), o envía una *imagen/sticker* junto con un *audio*.\n> Ejemplo: *${usedPrefix + command} Pack | Autor*`,
          msg
        );
      }

      if (!webpBuffer || !opusBuffer) {
        cleanup();
        return msg.reply('《✧》 No se pudo generar el sticker o procesar el audio.');
      }

      const [stickerMedia, soundMedia] = await Promise.all([
        prepareWAMessageMedia(
          {
            sticker: webpBuffer,
            isAnimated: true,
            mimetype: 'image/webp'
          },
          { upload: sock.waUploadToServer }
        ),
        prepareWAMessageMedia(
          {
            audio: opusBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: false
          },
          { upload: sock.waUploadToServer }
        )
      ]);

      const stickerMsg = stickerMedia.stickerMessage;
      stickerMsg.stickerSentTs ??= Date.now();
      stickerMsg.audioMessage = soundMedia.audioMessage;

      const content = {
        audioStickerMessage: {
          message: {
            stickerMessage: stickerMsg
          }
        }
      };

      const fullMsg = generateWAMessageFromContent(msg.chat, content, {
        userJid: sock.user.id,
        quoted: msg
      });

      await sock.relayMessage(msg.chat, fullMsg.message, {
        messageId: fullMsg.key.id
      });

      cleanup();
    } catch (e) {
      cleanup();
      return msg.reply(
        `> An unexpected error occurred while executing command *${usedPrefix + command}*.\n> [Error: *${e.message}*]`
      );
    }
  }
};