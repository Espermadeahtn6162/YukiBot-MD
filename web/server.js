import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import db from '#db';
import { getSettings, setSettings, getChat, setChat, getUser, getChatUser } from '#db';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
// Puerto aleatorio si no se especifica (0 = SO elige uno libre)
const PORT = process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : 0;
const JWT_SECRET = process.env.JWT_SECRET || 'yuki-secret-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Aquino2002';

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('close', () => { wsClients.delete(ws); });
  // Send initial status
  ws.send(JSON.stringify({ type: 'status', data: global.botStatus || { connected: false } }));
});

// Heartbeat to detect dead connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      wsClients.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wsClients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(message);
  });
}

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones, intenta más tarde' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de login' }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// JWT helper
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Token inválido' });

  req.user = decoded;
  next();
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
      const token = generateToken({ admin: true, loginAt: Date.now() });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      return res.json({ success: true, message: 'Login exitoso' });
    }

    return res.status(401).json({ error: 'Contraseña incorrecta' });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ admin: true });
});

// ==================== BOT STATUS ====================

app.get('/api/status', authMiddleware, (req, res) => {
  try {
    // This will be populated by the main bot
    global.botStatus = global.botStatus || { connected: false };
    res.json(global.botStatus);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SETTINGS API ====================

app.get('/api/settings', authMiddleware, (req, res) => {
  try {
    const botId = global.botId || 'unknown';
    const settings = getSettings(botId);
    res.json(settings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings', authMiddleware, (req, res) => {
  try {
    const botId = global.botId || 'unknown';
    const { field, value } = req.body;

    if (!field) return res.status(400).json({ error: 'Campo requerido' });

    const result = setSettings(botId, field, value);
    if (result) {
      // Update global bot status if connected
      if (global.botStatus) {
        global.botStatus.settings = { ...global.botStatus.settings, [field]: value };
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'No se pudo actualizar' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== CHATS API ====================

app.get('/api/chats', authMiddleware, (req, res) => {
  try {
    const chats = getChat();
    // Transform for frontend
    const formatted = chats.map(c => ({
      id: c.id,
      isBanned: Boolean(c.isBanned),
      welcome: Boolean(c.welcome),
      goodbye: Boolean(c.goodbye),
      economy: Boolean(c.economy),
      gacha: Boolean(c.gacha),
      adminonly: Boolean(c.adminonly),
      antilinks: Boolean(c.antilinks),
      antistatus: Boolean(c.antistatus),
      primaryBot: c.primaryBot
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/chats/:id', authMiddleware, (req, res) => {
  try {
    const chat = getChat(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
    res.json(chat);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/chats/:id', authMiddleware, (req, res) => {
  try {
    const { field, value } = req.body;
    if (!field) return res.status(400).json({ error: 'Campo requerido' });

    const result = setChat(req.params.id, field, value);
    res.json({ success: !!result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== USERS API ====================

app.get('/api/users', authMiddleware, (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    let users = getUser();

    console.log(`[API] /api/users - Total users in DB: ${users.length}`);

    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u =>
        u.name?.toLowerCase().includes(s) ||
        u.id?.includes(s)
      );
    }

    // Sort by exp desc
    users.sort((a, b) => (b.exp || 0) - (a.exp || 0));

    const start = (page - 1) * limit;
    const paginated = users.slice(start, start + parseInt(limit));

    res.json({
      users: paginated,
      total: users.length,
      page: parseInt(page),
      totalPages: Math.ceil(users.length / limit)
    });
  } catch (e) {
    console.error('[API] /api/users error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id', authMiddleware, (req, res) => {
  try {
    const user = getUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', authMiddleware, (req, res) => {
  try {
    const { field, value } = req.body;
    const result = setUser(req.params.id, field, value);
    res.json({ success: !!result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== CHAT USERS (ECONOMY) API ====================

app.get('/api/chat-users', authMiddleware, (req, res) => {
  try {
    const { chatId, page = 1, limit = 50, sort = 'coins', order = 'desc' } = req.query;

    if (!chatId) return res.status(400).json({ error: 'chatId requerido' });

    let users = getChatUser(chatId);
    if (!users || users.length === 0) {
      return res.json({
        users: [],
        total: 0,
        page: parseInt(page),
        totalPages: 0
      });
    }
    users = users.map(u => ({ ...u, characters: JSON.parse(u.characters || '[]'), stats: JSON.parse(u.stats || '{}') }));

    // Sort
    users.sort((a, b) => {
      const dir = order === 'desc' ? -1 : 1;
      return dir * ((a[sort] || 0) - (b[sort] || 0));
    });

    const start = (page - 1) * limit;
    const paginated = users.slice(start, start + parseInt(limit));

    res.json({
      users: paginated,
      total: users.length,
      page: parseInt(page),
      totalPages: Math.ceil(users.length / limit)
    });
  } catch (e) {
    console.error('[API] /api/chat-users error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/chat-users/:chatId/:userId', authMiddleware, (req, res) => {
  try {
    const { field, value } = req.body;
    const result = setChatUser(req.params.chatId, req.params.userId, field, value);
    res.json({ success: !!result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== STATS API ====================

app.get('/api/stats', authMiddleware, (req, res) => {
  try {
    const users = getUser();
    const chats = getChat();

    const totalUsers = users.length;
    const totalChats = chats.length;
    const totalExp = users.reduce((sum, u) => sum + (u.exp || 0), 0);
    const totalCoins = users.reduce((sum, u) => sum + (u.coins || 0), 0);
    const totalBank = users.reduce((sum, u) => sum + (u.bank || 0), 0);
    const totalCommands = users.reduce((sum, u) => sum + (u.usedcommands || 0), 0);

    // Top users by exp
    const topExp = users
      .filter(u => u.exp > 0)
      .sort((a, b) => b.exp - a.exp)
      .slice(0, 10)
      .map(u => ({ id: u.id, name: u.name, exp: u.exp, level: u.level }));

    // Top users by coins
    const topCoins = users
      .filter(u => u.coins > 0)
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 10)
      .map(u => ({ id: u.id, name: u.name, coins: u.coins, bank: u.bank }));

    // Banned chats
    const bannedChats = chats.filter(c => c.isBanned).length;

    res.json({
      totalUsers,
      totalChats,
      totalExp,
      totalCoins,
      totalBank,
      totalCommands,
      bannedChats,
      topExp,
      topCoins,
      uptime: global.botStatus?.uptime || 0,
      connected: global.botStatus?.connected || false
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== COMMANDS API ====================

app.get('/api/commands', authMiddleware, (req, res) => {
  try {
    const commands = Array.from(global.comandos?.entries() || []).map(([name, data]) => ({
      name,
      ...data
    }));
    res.json(commands);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== BOT CONTROL API ====================

app.post('/api/bot/restart', authMiddleware, async (req, res) => {
  try {
    broadcast('bot:restarting', { message: 'Reiniciando bot...' });
    res.json({ success: true, message: 'Bot reiniciándose...' });
    setTimeout(() => process.exit(0), 1000);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/bot/stop', authMiddleware, async (req, res) => {
  try {
    broadcast('bot:stopping', { message: 'Deteniendo bot...' });
    res.json({ success: true, message: 'Bot detenido' });
    setTimeout(() => process.exit(0), 1000);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/bot/qr', authMiddleware, async (req, res) => {
  try {
    // This will be populated by the main bot when QR is generated
    const qr = global.botStatus?.qr || null;
    if (qr) {
      res.json({ qr, timestamp: Date.now() });
    } else {
      res.json({ qr: null, message: 'No hay QR disponible. El bot ya está conectado o no se ha generado.' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/bot/pairing', authMiddleware, async (req, res) => {
  try {
    const code = global.botStatus?.pairingCode || null;
    if (code) {
      res.json({ code, timestamp: Date.now() });
    } else {
      res.json({ code: null, message: 'No hay código de emparejamiento disponible.' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== SYSTEM INFO API ====================

app.get('/api/system', authMiddleware, (req, res) => {
  try {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    res.json({
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024)
      },
      cpu: {
        user: cpu.user,
        system: cpu.system
      },
      loadAvg: os.loadavg(),
      freeMem: Math.round(os.freemem() / 1024 / 1024),
      totalMem: Math.round(os.totalmem() / 1024 / 1024),
      cpus: os.cpus().length
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== CHARTS DATA API ====================

app.get('/api/charts/users-growth', authMiddleware, (req, res) => {
  try {
    const users = getUser();
    // Simulate growth data (in real app, you'd track this historically)
    const now = Date.now();
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toISOString().split('T')[0],
        users: Math.max(0, users.length - Math.floor(Math.random() * 5))
      });
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/charts/commands-usage', authMiddleware, (req, res) => {
  try {
    const commands = Array.from(global.comandos?.entries() || []);
    const usage = commands
      .map(([name, data]) => ({
        command: name,
        category: data.category || 'general',
        count: Math.floor(Math.random() * 1000) // Simulated
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    res.json(usage);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/charts/economy-distribution', authMiddleware, (req, res) => {
  try {
    const users = getUser();
    const ranges = [
      { label: '0-1K', min: 0, max: 1000 },
      { label: '1K-10K', min: 1000, max: 10000 },
      { label: '10K-100K', min: 10000, max: 100000 },
      { label: '100K-1M', min: 100000, max: 1000000 },
      { label: '1M+', min: 1000000, max: Infinity }
    ];
    const distribution = ranges.map(r => ({
      range: r.label,
      count: users.filter(u => (u.coins || 0) + (u.bank || 0) >= r.min && (u.coins || 0) + (u.bank || 0) < r.max).length
    }));
    res.json(distribution);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/charts/commands-by-category', authMiddleware, (req, res) => {
  try {
    const commands = Array.from(global.comandos?.entries() || []);
    const categoryCounts = {};
    commands.forEach(([name, data]) => {
      const cat = data.category || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const data = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count
    })).sort((a, b) => b.count - a.count);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== BACKUP/RESTORE API ====================

app.post('/api/backup/create', authMiddleware, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.json`;
    const backupDir = path.join(__dirname, '..', '..', 'backups');

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const users = getUser();
    const chats = getChat();
    const settings = getSettings(global.botId || 'unknown');
    const commands = Array.from(global.comandos?.entries() || []).map(([name, data]) => ({ name, ...data }));

    const backup = {
      timestamp: new Date().toISOString(),
      version: '3.2',
      users,
      chats,
      settings,
      commands
    };

    const backupPath = path.join(backupDir, backupName);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

    // Keep only last 10 backups
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (backups.length > 10) {
      backups.slice(10).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
    }

    broadcast('backup:created', { name: backupName, path: backupPath });
    res.json({ success: true, name: backupName, path: backupPath });
  } catch (e) {
    console.error('Backup error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/backup/list', authMiddleware, (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) return res.json([]);

    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          size: stats.size,
          created: stats.birthtime,
          path: path.join(backupDir, f)
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json(backups);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/backup/restore', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre de backup requerido' });

    const backupDir = path.join(__dirname, '..', '..', 'backups');
    const backupPath = path.join(backupDir, name);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup no encontrado' });
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    // This would require restarting the bot to fully apply
    // For now, just return the backup data
    broadcast('backup:restoring', { name });
    res.json({ success: true, message: 'Backup listo para restaurar. Reinicia el bot para aplicar.', data: backup });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/backup/:name', authMiddleware, (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    const backupPath = path.join(backupDir, req.params.name);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup no encontrado' });
    }

    fs.unlinkSync(backupPath);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== LOGS API ====================

app.get('/api/logs', authMiddleware, (req, res) => {
  try {
    const logDir = path.join(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(logDir)) return res.json([]);

    const files = fs.readdirSync(logDir)
      .filter(f => f.endsWith('.log') || f.endsWith('.txt'))
      .map(f => {
        const stats = fs.statSync(path.join(logDir, f));
        return {
          name: f,
          size: stats.size,
          modified: stats.mtime,
          path: path.join(logDir, f)
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json(files);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/logs/:name', authMiddleware, (req, res) => {
  try {
    const logDir = path.join(__dirname, '..', '..', 'logs');
    const filePath = path.join(logDir, req.params.name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Log no encontrado' });
    }

    const lines = parseInt(req.query.lines) || 100;
    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n');
    const lastLines = allLines.slice(-lines).join('\n');

    res.json({ name: req.params.name, content: lastLines, totalLines: allLines.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== THEME API ====================

app.get('/api/theme', authMiddleware, (req, res) => {
  try {
    const theme = global.userTheme || 'light';
    res.json({ theme });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/theme', authMiddleware, (req, res) => {
  try {
    const { theme } = req.body;
    if (!['light', 'dark'].includes(theme)) {
      return res.status(400).json({ error: 'Tema inválido' });
    }
    global.userTheme = theme;
    broadcast('theme:changed', { theme });
    res.json({ success: true, theme });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== FRONTEND ====================

// SPA fallback - Express 5 compatible
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export function startWebServer(botId, botStatus) {
  global.botId = botId;
  global.botStatus = botStatus;

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      const actualPort = server.address().port;
      const url = `http://localhost:${actualPort}`;
      console.log(`\n🌐 Panel web iniciado en: ${url}`);
      console.log(`   (Puerto aleatorio asignado: ${actualPort})\n`);
      // Guardar URL global para acceso desde el bot
      global.botStatus = { ...global.botStatus, webUrl: url, webPort: actualPort };
      resolve({ server, url, port: actualPort });
    });
  });
}

export default app;