import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '#db';
import { getSettings, setSettings, getChat, getUser, getChatUser } from '#db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Puerto aleatorio si no se especifica (0 = SO elige uno libre)
const PORT = process.env.WEB_PORT ? parseInt(process.env.WEB_PORT) : 0;
const JWT_SECRET = process.env.JWT_SECRET || 'yuki-secret-change-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

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

// ==================== FRONTEND ====================

app.get('*', (req, res) => {
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