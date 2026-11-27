import cp, { exec as _exec } from 'child_process';
import { promisify } from 'util';

const exec = promisify(_exec).bind(cp);

const SHELL_TIMEOUT = 15000;       // 15 segundos
const MAX_OUTPUT = 4000;           // chars máximos

// Allow-list: solo estos binarios permitidos (primer token del comando)
const ALLOWED_COMMANDS = new Set([
  'git', 'npm', 'npx', 'node', 'ls', 'cat', 'head', 'tail', 'grep', 'find',
  'pm2', 'df', 'free', 'htop', 'top', 'ps', 'uptime', 'whoami', 'pwd',
  'mkdir', 'touch', 'cp', 'mv', 'rm', 'chmod', 'chown',
  'systemctl', 'service', 'journalctl',
  'curl', 'wget', 'ping', 'nslookup', 'dig',
  'tar', 'zip', 'unzip', 'gzip', 'gunzip',
  'python3', 'python', 'pip', 'pip3',
  'sqlite3', 'redis-cli', 'mongo', 'psql',
]);

// Blocked patterns: denegar si match (peligrosos)
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,           // rm -rf /
  /rm\s+-rf\s+\*/,           // rm -rf *
  /shutdown/,                // shutdown
  /reboot/,                  // reboot
  /halt/,                    // halt
  /poweroff/,                // poweroff
  /mkfs/,                    // mkfs
  /dd\s+if=/,                // dd if=
  />\s*\/dev\//,             // redirección a /dev/
  /curl.*\|\s*(bash|sh)/,    // curl | bash
  /wget.*\|\s*(bash|sh)/,    // wget | bash
  /:\s*\(\s*\)\s*\{/,        // fork bomb :(){ :|:& };:
  /chmod\s+777\s+\//,        // chmod 777 /
  /chown\s+.*:\s*\//,        // chown : /
  /echo\s+.*>\s*\/etc\//,    // escribir /etc/
  /crontab\s+-r/,            // crontab -r
  /history\s+-c/,            // history -c
];

function validateCommand(cmd) {
  const trimmed = cmd.trim();
  if (!trimmed) throw new Error('Comando vacío');

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error(`🚫 Comando bloqueado: patrón peligroso detectado`);
    }
  }

  // Check allow-list (primer token)
  const firstToken = trimmed.split(/\s+/)[0].replace(/^.\//, '').split('/').pop();
  if (!ALLOWED_COMMANDS.has(firstToken)) {
    throw new Error(`🚫 Comando no permitido: \`${firstToken}\`\n✅ Permitidos: ${Array.from(ALLOWED_COMMANDS).sort().join(', ')}`);
  }

  return trimmed;
}

function truncateOutput(text) {
  if (!text) return '';
  if (text.length <= MAX_OUTPUT) return text;
  return text.slice(0, MAX_OUTPUT) + `\n\n... [TRUNCADO: ${text.length} chars, máx ${MAX_OUTPUT}]`;
}

export default {
  command: ['r'],
  category: 'owner',
  description: 'Ejecutar comandos del sistema (allow-list + timeout).',
  isOwner: true,
  run: async ({ msg, sock, text }) => {
    if (!text.trim()) {
      return sock.reply(msg.chat, '《✧》 Debes escribir un comando a ejecutar.', msg);
    }

    let validatedCmd;
    try {
      validatedCmd = validateCommand(text.trim());
    } catch (e) {
      return sock.reply(msg.chat, `《✧》 ${e.message}`, msg);
    }

    let output;
    try {
      await msg.react('🕒');
      const { stdout, stderr } = await Promise.race([
        exec(validatedCmd, { cwd: process.cwd(), maxBuffer: 1024 * 1024 }), // 1MB buffer
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('⏱️ Timeout: comando excedió 15s')), SHELL_TIMEOUT)
        )
      ]);
      output = { stdout, stderr };
      await msg.react('✔️');
    } catch (e) {
      output = e;
      await msg.react('✖️');
    } finally {
      let result = '';
      if (output?.stdout?.trim()) result += `📤 *stdout:*\n\`\`\`\n${truncateOutput(output.stdout.trim())}\n\`\`\`\n`;
      if (output?.stderr?.trim()) result += `📥 *stderr:*\n\`\`\`\n${truncateOutput(output.stderr.trim())}\n\`\`\`\n`;
      if (output?.message) result += `❌ *Error:* ${output.message}`;
      if (!result) result = '✅ Comando ejecutado (sin output)';
      sock.reply(msg.chat, result.trim(), msg);
    }
  }
};