import chalk from 'chalk';

export default {
  command: ['cooldownstatus', 'cdstatus', 'debugcd'],
  category: 'owner',
  description: 'Ver estado del sistema de cooldown (solo terminal)',
  isOwner: true,
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    const cache = global.cooldownCache || new Map();
    const aliasMap = global.aliasToPrimary || new Map();
    const revision = global.commandRevision || 0;

    console.log(chalk.bgCyan.black.bold('\n ⏱️ COOLDOWN DEBUG '));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow(`commandRevision: ${revision}`));
    console.log(chalk.yellow(`cooldownCache size: ${cache.size}`));
    console.log(chalk.yellow(`aliasToPrimary size: ${aliasMap.size}`));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(chalk.cyan.bold('📋 ALIAS MAP (alias → primary):'));
    if (aliasMap.size === 0) {
      console.log(chalk.gray('   (vacío - se construye al primer checkCooldown)'));
    } else {
      for (const [alias, primary] of aliasMap) {
        console.log(chalk.gray(`   ${alias} → ${primary}`));
      }
    }

    console.log(chalk.cyan.bold('\n💾 COOLDOWN CACHE (key → timestamp):'));
    if (cache.size === 0) {
      console.log(chalk.gray('   (vacío)'));
    } else {
      const now = Date.now();
      for (const [key, timestamp] of cache) {
        const elapsed = now - timestamp;
        const [_, category, cmd, userId] = key.split(':');
        const remaining = Math.max(0, (global.DEFAULT_COOLDOWNS?.[category]?.[cmd] || 0) - elapsed);
        console.log(chalk.gray(`   ${category}:${cmd}:${userId.slice(-6)}`));
        console.log(chalk.gray(`      elapsed: ${(elapsed/1000).toFixed(1)}s | remaining: ${(remaining/1000).toFixed(1)}s`));
      }
    }

    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    // Silencioso en WhatsApp
  }
};