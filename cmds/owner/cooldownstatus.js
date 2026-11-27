import chalk from 'chalk';
import { getDebugInfo } from '#core/cooldown';

export default {
  command: ['cooldownstatus', 'cdstatus', 'debugcd'],
  category: 'owner',
  description: 'Ver estado del sistema de cooldown (solo terminal)',
  isOwner: true,
  run: async ({ msg, sock, args, usedPrefix, command }) => {
    const info = getDebugInfo();

    console.log(chalk.bgCyan.black.bold('\n ⏱️ COOLDOWN DEBUG '));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow(`commandRevision: ${info.revision}`));
    console.log(chalk.yellow(`aliasMap size: ${Object.keys(info.aliasMap).length}`));
    console.log(chalk.yellow(`cooldownCache size: ${Object.keys(info.cache).length}`));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(chalk.cyan.bold('📋 ALIAS MAP (alias → primary):'));
    if (Object.keys(info.aliasMap).length === 0) {
      console.log(chalk.gray('   (vacío)'));
    } else {
      for (const [alias, primary] of Object.entries(info.aliasMap)) {
        console.log(chalk.gray(`   ${alias} → ${primary}`));
      }
    }

    console.log(chalk.cyan.bold('\n💾 COOLDOWN CACHE (key → timestamp):'));
    if (Object.keys(info.cache).length === 0) {
      console.log(chalk.gray('   (vacío)'));
    } else {
      const now = Date.now();
      for (const [key, timestamp] of Object.entries(info.cache)) {
        const elapsed = now - timestamp;
        console.log(chalk.gray(`   ${key}`));
        console.log(chalk.gray(`      elapsed: ${(elapsed/1000).toFixed(1)}s ago`));
      }
    }

    console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  }
};