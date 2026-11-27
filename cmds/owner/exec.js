import syntaxerror from 'syntax-error';
import { format } from 'util';
import { createRequire } from 'module';

const EXEC_TIMEOUT = 10000;      // 10 segundos
const MAX_OUTPUT = 4000;         // chars máximos en respuesta
const BLOCKED_GLOBALS = new Set([
  'process.exit',
  'process.kill',
  'process.abort',
  'global.sock.end',
  'global.sock.ws.close',
  'global.sock.ev.removeAllListeners',
  'require.cache',
  'module.constructor',
  'Function.constructor',
]);

function checkBlockedAccess(code) {
  for (const blocked of BLOCKED_GLOBALS) {
    const pattern = new RegExp(`\\b${blocked.replace(/\./g, '\\.')}\\b`);
    if (pattern.test(code)) {
      throw new Error(`🚫 Acceso bloqueado: \`${blocked}\` no está permitido`);
    }
  }
}

function truncateOutput(text) {
  if (text.length <= MAX_OUTPUT) return text;
  return text.slice(0, MAX_OUTPUT) + `\n\n... [TRUNCADO: ${text.length} chars, máx ${MAX_OUTPUT}]`;
}

export default {
  command: ['ex', 'e'],
  category: 'owner',
  description: 'Ejecutar código JavaScript en el bot (con timeout y límites).',
  isOwner: true,
  run: async ({ msg, sock, args, command, text, __dirname }) => {
    const require = createRequire(__dirname);
    if (!text.trim()) {
      return sock.reply(msg.chat, '《✧》 Debes escribir un código a ejecutar.', msg);
    }

    // Validar código antes de ejecutar
    try {
      checkBlockedAccess(text);
    } catch (e) {
      return sock.reply(msg.chat, `《✧》 ${e.message}`, msg);
    }

    let _text = (command === 'e' ? 'return ' : '') + text;
    let _return, _syntax = '';
    const startTime = Date.now();

    try {
      await msg.react('🕒');
      let i = 15;
      let f = { exports: {} };
      let execFn = new (async () => {}).constructor(
        'print', 'msg', 'sock', 'require', 'Array', 'process', 'args', 'module', 'exports', 'argument', _text
      );

      // Promise con timeout
      const execPromise = execFn.call(sock, (...args) => {
        if (--i < 1) return;
        return sock.reply(msg.chat, format(...args), msg);
      }, msg, sock, require, Array, process, args, f, f.exports, [sock]);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('⏱️ Timeout: ejecución excedió 10s')), EXEC_TIMEOUT)
      );

      _return = await Promise.race([execPromise, timeoutPromise]);
      await msg.react('✔️');
    } catch (e) {
      let err = syntaxerror(_text, 'Execution Function', { allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true, sourceType: 'module' });
      if (err) _syntax = '```' + err + '```\n\n';
      _return = e;
      await msg.react('✖️');
    } finally {
      const elapsed = Date.now() - startTime;
      const output = typeof _return === 'object' && _return !== null
        ? (_return.stack || _return.message || format(_return))
        : format(_return);
      const finalOutput = truncateOutput(_syntax + output + `\n\n⏱️ ${elapsed}ms`);
      sock.reply(msg.chat, finalOutput, msg);
    }
  }
};