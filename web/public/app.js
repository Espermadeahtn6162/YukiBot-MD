// YukiBot Admin Panel - Frontend Logic

const API_BASE = '/api';
const WS_BASE = 'ws://' + window.location.host + '/ws';

let currentPage = 'dashboard';
let usersPage = 1;
let usersTotalPages = 1;
let currentChatId = null;
let ws = null;
let charts = {};

// DOM Elements
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuBtn = document.getElementById('menuBtn');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');
const themeThumb = document.getElementById('themeThumb');
const pageTitle = document.getElementById('pageTitle');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');
const toastContainer = document.getElementById('toastContainer');

// Chart instances
let usersGrowthChart = null;
let economyDistributionChart = null;
let commandsUsageChart = null;
let categoryChart = null;

// Initialize - setup listeners FIRST, then check auth
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initTheme();
  connectWebSocket();
  checkAuth();
  startStatusPolling();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  updateThemeToggle(savedTheme === 'dark');
}

function updateThemeToggle(isDark) {
  if (themeThumb) {
    themeThumb.style.transform = isDark ? 'translateX(1.25rem)' : 'translateX(0.5rem)';
    themeToggle.style.backgroundColor = isDark ? '#8b5cf6' : '#e5e7eb';
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateThemeToggle(isDark);
  fetch(`${API_BASE}/theme`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ theme: isDark ? 'dark' : 'light' })
  }).catch(() => {});
}

// WebSocket Connection
function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(WS_BASE);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWebSocketMessage(msg);
    } catch (e) {
      console.error('WS message error:', e);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected, reconnecting in 5s...');
    setTimeout(connectWebSocket, 5000);
  };

  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
  };
}

function handleWebSocketMessage(msg) {
  switch (msg.type) {
    case 'status':
      updateBotStatus(msg.data.connected);
      break;
    case 'bot:restarting':
      showToast(msg.data.message, 'info');
      break;
    case 'bot:stopping':
      showToast(msg.data.message, 'warning');
      break;
    case 'backup:created':
      showToast(`Backup creado: ${msg.data.name}`, 'success');
      if (currentPage === 'backup') loadBackups();
      break;
    case 'backup:restoring':
      showToast('Restaurando backup...', 'info');
      break;
    case 'theme:changed':
      document.documentElement.classList.toggle('dark', msg.data.theme === 'dark');
      updateThemeToggle(msg.data.theme === 'dark');
      break;
    case 'log':
      if (currentPage === 'logs') appendLog(msg.data);
      break;
  }
}

// Auth Check
async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) {
      showLoginModal();
      return;
    }
    loadPage(currentPage);
  } catch (e) {
    console.error('Auth check error:', e);
    showLoginModal();
  }
}

function showLoginModal() {
  modalTitle.textContent = 'Iniciar Sesión';
  modalContent.innerHTML = `
    <form id="loginForm" class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Contraseña</label>
        <input type="password" id="password" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="Ingresa la contraseña" autocomplete="current-password">
      </div>
      <button type="submit" class="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition">Entrar</button>
    </form>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    await login(password);
  });
}

async function login(password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (data.success) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      showToast('Login exitoso', 'success');
      loadPage(currentPage);
    } else {
      showToast(data.error || 'Error de login', 'error');
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
}

async function logout() {
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  showToast('Sesión cerrada', 'success');
  setTimeout(() => location.reload(), 500);
}

// Event Listeners
function setupEventListeners() {
  // Sidebar navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigateTo(page);
    });
  });

  // Theme toggle
  themeToggle?.addEventListener('click', toggleTheme);

  // Mobile menu
  menuBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('hidden');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
  });

  // Logout
  logoutBtn?.addEventListener('click', logout);

  // Modal close
  modalClose?.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modalClose.click();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modalClose?.click();
    if (e.key === 'd' && e.metaKey) toggleTheme(); // Cmd+D for theme
  });
}

// Navigation
function navigateTo(page) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-600'));
  const activeLink = document.querySelector(`[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add('bg-purple-50', 'text-purple-600');

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`)?.classList.remove('hidden');

  const titles = {
    dashboard: 'Dashboard',
    analytics: 'Analíticas',
    settings: 'Configuración',
    chats: 'Chats',
    users: 'Usuarios',
    economy: 'Economía',
    commands: 'Comandos',
    botControl: 'Control Bot',
    backup: 'Backups',
    logs: 'Logs'
  };
  pageTitle.textContent = titles[page] || 'Dashboard';
  currentPage = page;

  sidebar.classList.remove('open');
  overlay.classList.add('hidden');

  loadPage(page);
}

// Page Loaders
async function loadPage(page) {
  try {
    switch (page) {
      case 'dashboard': await loadDashboard(); break;
      case 'analytics': await loadAnalytics(); break;
      case 'settings': await loadSettings(); break;
      case 'chats': await loadChats(); break;
      case 'users': await loadUsers(); break;
      case 'economy': await loadEconomy(); break;
      case 'commands': await loadCommands(); break;
      case 'botControl': await loadBotControl(); break;
      case 'backup': await loadBackups(); break;
      case 'logs': await loadLogs(); break;
    }
  } catch (e) {
    console.error('Error loading page:', e);
    showToast('Error cargando la página', 'error');
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/stats`, { credentials: 'include' });
    const data = await res.json();

    document.getElementById('statUsers').textContent = data.totalUsers.toLocaleString();
    document.getElementById('statChats').textContent = data.totalChats.toLocaleString();
    document.getElementById('statCoins').textContent = (data.totalCoins + data.totalBank).toLocaleString();
    document.getElementById('statCommands').textContent = data.totalCommands.toLocaleString();

    // Top Exp
    const topExpTable = document.getElementById('topExpTable');
    topExpTable.innerHTML = data.topExp.map((u, i) => `
      <tr class="hover:bg-gray-50">
        <td class="p-3">${i + 1}</td>
        <td class="p-3 font-medium">${escapeHtml(u.name || 'Sin nombre')}</td>
        <td class="p-3">${u.exp.toLocaleString()}</td>
        <td class="p-3">${u.level}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="p-3 text-center text-gray-500">Sin datos</td></tr>';

    // Top Coins
    const topCoinsTable = document.getElementById('topCoinsTable');
    topCoinsTable.innerHTML = data.topCoins.map((u, i) => `
      <tr class="hover:bg-gray-50">
        <td class="p-3">${i + 1}</td>
        <td class="p-3 font-medium">${escapeHtml(u.name || 'Sin nombre')}</td>
        <td class="p-3">${u.coins.toLocaleString()}</td>
        <td class="p-3">${u.bank.toLocaleString()}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="p-3 text-center text-gray-500">Sin datos</td></tr>';

    updateBotStatus(data.connected);
  } catch (e) {
    console.error('Dashboard error:', e);
  }
}

// Analytics Page
async function loadAnalytics() {
  destroyCharts();

  try {
    // Users Growth
    const growthRes = await fetch(`${API_BASE}/charts/users-growth`, { credentials: 'include' });
    const growthData = await growthRes.json();
    createUsersGrowthChart(growthData);

    // Economy Distribution
    const ecoRes = await fetch(`${API_BASE}/charts/economy-distribution`, { credentials: 'include' });
    const ecoData = await ecoRes.json();
    createEconomyDistributionChart(ecoData);

    // Commands Usage
    const cmdRes = await fetch(`${API_BASE}/charts/commands-usage`, { credentials: 'include' });
    const cmdData = await cmdRes.json();
    createCommandsUsageChart(cmdData);

    // Category Distribution (new endpoint)
    const catRes = await fetch(`${API_BASE}/charts/commands-by-category`, { credentials: 'include' });
    const catData = await catRes.json();
    createCategoryChart(catData);

  } catch (e) {
    console.error('Analytics error:', e);
    showToast('Error cargando analíticas', 'error');
  }
}

function destroyCharts() {
  [usersGrowthChart, economyDistributionChart, commandsUsageChart, categoryChart].forEach(c => {
    if (c) { c.destroy(); }
  });
  usersGrowthChart = economyDistributionChart = commandsUsageChart = categoryChart = null;
}

function createUsersGrowthChart(data) {
  const ctx = document.getElementById('usersGrowthChart');
  if (!ctx) return;
  usersGrowthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'Usuarios',
        data: data.map(d => d.users),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function createEconomyDistributionChart(data) {
  const ctx = document.getElementById('economyDistributionChart');
  if (!ctx) return;
  economyDistributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.range),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'],
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function createCommandsUsageChart(data) {
  const ctx = document.getElementById('commandsUsageChart');
  if (!ctx) return;
  commandsUsageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.command),
      datasets: [{
        label: 'Usos',
        data: data.map(d => d.count),
        backgroundColor: '#8b5cf6'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function createCategoryChart(data) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  const cats = [...new Set(data.map(d => d.category))];
  const catCounts = cats.map(c => data.filter(d => d.category === c).length);
  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: cats,
      datasets: [{
        data: catCounts,
        backgroundColor: ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// Settings
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`, { credentials: 'include' });
    const settings = await res.json();

    const form = document.getElementById('settingsForm');
    const fields = [
      { key: 'namebot', label: 'Nombre Corto', type: 'text' },
      { key: 'botname', label: 'Nombre Completo', type: 'text' },
      { key: 'prefix', label: 'Prefijos (JSON)', type: 'text' },
      { key: 'currency', label: 'Moneda', type: 'text' },
      { key: 'type', label: 'Tipo', type: 'text' },
      { key: 'link', label: 'Link API', type: 'url' },
      { key: 'banner', label: 'Banner URL', type: 'url' },
      { key: 'icon', label: 'Icon URL', type: 'url' },
      { key: 'newsletter_id', label: 'Newsletter ID', type: 'text' },
      { key: 'nameid', label: 'Nombre Canal', type: 'text' },
      { key: 'owner', label: 'Owner Number', type: 'text' },
      { key: 'self', label: 'Modo Privado', type: 'checkbox' },
    ];

    form.innerHTML = fields.map(f => {
      const val = settings[f.key] ?? '';
      if (f.type === 'checkbox') {
        return `<div class="flex items-center gap-3">
          <input type="checkbox" id="set-${f.key}" name="${f.key}" ${val ? 'checked' : ''} class="w-5 h-5 text-purple-600 rounded">
          <label for="set-${f.key}" class="text-sm">${f.label}</label>
        </div>`;
      }
      return `<div>
        <label class="block text-sm font-medium mb-1">${f.label}</label>
        <input type="${f.type}" id="set-${f.key}" name="${f.key}" value="${escapeHtml(String(val))}" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
      </div>`;
    }).join('');

    // Remove old listener
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.addEventListener('change', async (e) => {
      const target = e.target;
      const field = target.name;
      let value = target.type === 'checkbox' ? target.checked : target.value;
      await saveSetting(field, value);
    });
  } catch (e) {
    console.error('Settings error:', e);
    showToast('Error cargando configuración', 'error');
  }
}

async function saveSetting(field, value) {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ field, value })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Configuración ${field} actualizada`, 'success');
    } else {
      showToast(data.error || 'Error guardando', 'error');
      loadSettings();
    }
  } catch (e) {
    showToast('Error de conexión', 'error');
  }
}

// Chats
async function loadChats() {
  try {
    const res = await fetch(`${API_BASE}/chats`, { credentials: 'include' });
    const chats = await res.json();

    const tbody = document.getElementById('chatsTable');
    tbody.innerHTML = chats.map(c => `
      <tr class="hover:bg-gray-50">
        <td class="p-3 font-mono text-xs">${escapeHtml(c.id)}</td>
        <td class="p-3">${c.id.endsWith('@g.us') ? '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Grupo</span>' : '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Privado</span>'}</td>
        <td class="p-3 text-center">${c.economy ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>'}</td>
        <td class="p-3 text-center">${c.gacha ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>'}</td>
        <td class="p-3 text-center">${c.nsfw ? '<i class="fas fa-check text-red-500"></i>' : '<i class="fas fa-times text-gray-400"></i>'}</td>
        <td class="p-3 text-center">${c.antilinks ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>'}</td>
        <td class="p-3 text-center">${c.isBanned ? '<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">Sí</span>' : '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">No</span>'}</td>
        <td class="p-3">
          <button onclick="openChatModal('${escapeHtml(c.id)}')" class="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">Editar</button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Chats error:', e);
    showToast('Error cargando chats', 'error');
  }
}

// Users
async function loadUsers(page = 1) {
  try {
    usersPage = page;
    const res = await fetch(`${API_BASE}/users?page=${page}&limit=50`, { credentials: 'include' });
    const data = await res.json();
    usersTotalPages = data.totalPages;

    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = data.users.map((u, i) => `
      <tr class="hover:bg-gray-50">
        <td class="p-3">${(page - 1) * 50 + i + 1}</td>
        <td class="p-3">
          <div class="font-medium">${escapeHtml(u.name || 'Sin nombre')}</div>
          <div class="text-xs text-gray-500 font-mono">${escapeHtml(u.id)}</div>
        </td>
        <td class="p-3">${(u.exp || 0).toLocaleString()}</td>
        <td class="p-3">${u.level || 0}</td>
        <td class="p-3">${(u.coins || 0).toLocaleString()}</td>
        <td class="p-3">${(u.bank || 0).toLocaleString()}</td>
        <td class="p-3">${(u.usedcommands || 0).toLocaleString()}</td>
        <td class="p-3">
          <button onclick="openUserModal('${escapeHtml(u.id)}', '${escapeHtml(u.name || 'Sin nombre')}')" class="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">Editar</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="p-3 text-center text-gray-500">Sin usuarios</td></tr>';

    document.getElementById('usersInfo').textContent = `Página ${page} de ${data.totalPages} (${data.total} usuarios)`;
    renderPagination('usersPagination', page, data.totalPages, loadUsers);
  } catch (e) {
    console.error('Users error:', e);
    showToast('Error cargando usuarios', 'error');
  }
}

// Economy
async function loadEconomy() {
  try {
    const res = await fetch(`${API_BASE}/chats`, { credentials: 'include' });
    const chats = await res.json();

    const select = document.getElementById('economyChatSelect');
    select.innerHTML = '<option value="">Seleccionar chat...</option>' + chats
      .filter(c => c.id.endsWith('@g.us'))
      .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.id)}</option>`).join('');

    select.onchange = async () => {
      currentChatId = select.value;
      if (currentChatId) await loadEconomyTable(currentChatId);
    };
  } catch (e) {
    console.error('Economy chats error:', e);
  }
}

async function loadEconomyTable(chatId) {
  try {
    const res = await fetch(`${API_BASE}/chat-users?chatId=${chatId}&limit=100`, { credentials: 'include' });
    const data = await res.json();

    const tbody = document.getElementById('economyTable');
    tbody.innerHTML = data.users.map((u, i) => `
      <tr class="hover:bg-gray-50">
        <td class="p-3">${i + 1}</td>
        <td class="p-3 font-medium">${escapeHtml(u.name || 'Sin nombre')}</td>
        <td class="p-3">${(u.coins || 0).toLocaleString()}</td>
        <td class="p-3">${(u.bank || 0).toLocaleString()}</td>
        <td class="p-3">${u.health || 100}</td>
        <td class="p-3">${u.stamina || 100}</td>
        <td class="p-3">${u.afk > 0 ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">AFK</span>' : '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Activo</span>'}</td>
        <td class="p-3">
          <button onclick="openEconomyModal('${escapeHtml(chatId)}', '${escapeHtml(u.id)}', '${escapeHtml(u.name || 'Sin nombre')}')" class="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200">Editar</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="8" class="p-3 text-center text-gray-500">Sin usuarios en este chat</td></tr>';
  } catch (e) {
    console.error('Economy table error:', e);
    showToast('Error cargando economía', 'error');
  }
}

// Commands
async function loadCommands() {
  try {
    const res = await fetch(`${API_BASE}/commands`, { credentials: 'include' });
    const commands = await res.json();

    const tbody = document.getElementById('commandsTable');
    tbody.innerHTML = commands.map(c => `
      <tr class="hover:bg-gray-50">
        <td class="p-3 font-mono">${escapeHtml(c.name)}</td>
        <td class="p-3">${Array.isArray(c.command) ? c.command.join(', ') : (c.command || '—')}</td>
        <td class="p-3"><span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">${escapeHtml(c.category || 'general')}</span></td>
        <td class="p-3 text-gray-600">${escapeHtml(c.description || 'Sin descripción')}</td>
        <td class="p-3 text-center">${c.isOwner ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>'}</td>
        <td class="p-3 text-center">${c.isAdmin ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>'}</td>
        <td class="p-3 text-center">${c.botAdmin ? '<i class="fas fa-check text-green-500"></i>' : '<i class="fas fa-times text-red-500"></i>'}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Commands error:', e);
    showToast('Error cargando comandos', 'error');
  }
}

// Bot Control
async function loadBotControl() {
  loadSystemInfo();
}

async function loadSystemInfo() {
  try {
    const res = await fetch(`${API_BASE}/system`, { credentials: 'include' });
    const data = await res.json();

    const container = document.getElementById('systemInfo');
    container.innerHTML = `
      <div class="bg-gray-50 p-3 rounded-lg">
        <p class="text-xs text-gray-500">Plataforma</p>
        <p class="font-mono">${data.platform} ${data.arch}</p>
      </div>
      <div class="bg-gray-50 p-3 rounded-lg">
        <p class="text-xs text-gray-500">Node.js</p>
        <p class="font-mono">${data.nodeVersion}</p>
      </div>
      <div class="bg-gray-50 p-3 rounded-lg">
        <p class="text-xs text-gray-500">Uptime</p>
        <p class="font-mono">${formatUptime(data.uptime)}</p>
      </div>
      <div class="bg-gray-50 p-3 rounded-lg">
        <p class="text-xs text-gray-500">Memoria</p>
        <p class="font-mono">${data.memory.heapUsed} MB / ${data.memory.heapTotal} MB</p>
      </div>
    `;
  } catch (e) {
    console.error('System info error:', e);
  }
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

async function restartBot() {
  if (!confirm('¿Seguro que quieres reiniciar el bot?')) return;
  try {
    await fetch(`${API_BASE}/bot/restart`, { method: 'POST', credentials: 'include' });
    showToast('Reiniciando bot...', 'info');
  } catch (e) {
    showToast('Error reiniciando', 'error');
  }
}

async function stopBot() {
  if (!confirm('¿Seguro que quieres detener el bot?')) return;
  try {
    await fetch(`${API_BASE}/bot/stop`, { method: 'POST', credentials: 'include' });
    showToast('Deteniendo bot...', 'info');
  } catch (e) {
    showToast('Error deteniendo', 'error');
  }
}

async function loadQR() {
  try {
    const res = await fetch(`${API_BASE}/bot/qr`, { credentials: 'include' });
    const data = await res.json();
    if (data.qr) {
      showQRModal(data.qr);
    } else {
      showToast(data.message || 'No hay QR disponible', 'info');
    }
  } catch (e) {
    showToast('Error cargando QR', 'error');
  }
}

function showQRModal(qr) {
  modalTitle.textContent = 'Código QR - Escanea con WhatsApp';
  modalContent.innerHTML = `
    <div class="text-center">
      <img src="${qr}" alt="QR Code" class="mx-auto max-w-xs border rounded-lg p-2">
      <p class="mt-3 text-sm text-gray-500">Escanea con WhatsApp > Dispositivos vinculados > Vincular dispositivo</p>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

async function loadPairingCode() {
  try {
    const res = await fetch(`${API_BASE}/bot/pairing`, { credentials: 'include' });
    const data = await res.json();
    const display = document.getElementById('pairingCodeDisplay');
    const copyBtn = document.getElementById('copyPairingBtn');
    if (data.code) {
      display.innerHTML = `<span class="text-2xl font-mono tracking-widest">${data.code}</span>`;
      copyBtn.disabled = false;
      copyBtn.onclick = () => copyToClipboard(data.code);
    } else {
      display.textContent = data.message || 'No hay código disponible';
      copyBtn.disabled = true;
    }
  } catch (e) {
    showToast('Error cargando código', 'error');
  }
}

function copyPairingCode() {
  const display = document.getElementById('pairingCodeDisplay');
  const text = display.textContent.trim();
  if (text && text !== 'No hay código disponible') {
    copyToClipboard(text);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado al portapapeles', 'success');
  });
}

// Backup Management
async function loadBackups() {
  try {
    const res = await fetch(`${API_BASE}/backup/list`, { credentials: 'include' });
    const backups = await res.json();

    const tbody = document.getElementById('backupsTable');
    tbody.innerHTML = backups.map(b => `
      <tr class="hover:bg-gray-50">
        <td class="p-3 font-mono text-sm">${escapeHtml(b.name)}</td>
        <td class="p-3">${formatBytes(b.size)}</td>
        <td class="p-3">${new Date(b.created).toLocaleString()}</td>
        <td class="p-3">
          <button onclick="restoreBackup('${escapeHtml(b.name)}')" class="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Restaurar</button>
          <button onclick="deleteBackup('${escapeHtml(b.name)}')" class="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 ml-1">Eliminar</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="p-3 text-center text-gray-500">Sin backups</td></tr>';
  } catch (e) {
    console.error('Backups error:', e);
    showToast('Error cargando backups', 'error');
  }
}

async function createBackup() {
  try {
    const res = await fetch(`${API_BASE}/backup/create`, { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      showToast(`Backup creado: ${data.name}`, 'success');
      loadBackups();
    } else {
      showToast(data.error || 'Error creando backup', 'error');
    }
  } catch (e) {
    showToast('Error creando backup', 'error');
  }
}

async function restoreBackup(name) {
  if (!confirm(`¿Restaurar backup ${name}? Se reiniciará el bot.`)) return;
  try {
    const res = await fetch(`${API_BASE}/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) showToast(data.message, 'success');
    else showToast(data.error || 'Error restaurando', 'error');
  } catch (e) {
    showToast('Error restaurando', 'error');
  }
}

async function deleteBackup(name) {
  if (!confirm(`¿Eliminar backup ${name}?`)) return;
  try {
    await fetch(`${API_BASE}/backup/${name}`, { method: 'DELETE', credentials: 'include' });
    showToast('Backup eliminado', 'success');
    loadBackups();
  } catch (e) {
    showToast('Error eliminando', 'error');
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Logs
async function loadLogs() {
  try {
    const res = await fetch(`${API_BASE}/logs`, { credentials: 'include' });
    const logs = await res.json();

    const select = document.createElement('select');
    select.className = 'px-3 py-2 border rounded-lg text-sm mb-4';
    select.innerHTML = '<option value="">Seleccionar log...</option>' + logs.map(l => `<option value="${l.name}">${l.name} (${formatBytes(l.size)})</option>`).join('');
    select.onchange = async () => {
      if (select.value) await loadLogContent(select.value);
    };

    const container = document.getElementById('logsContent');
    container.innerHTML = '';
    container.appendChild(select);
    container.appendChild(document.createElement('pre')).id = 'logContent';
    document.getElementById('logContent').className = 'p-5 bg-gray-900 text-green-300 text-sm font-mono max-h-[500px] overflow-auto font-mono whitespace-pre-wrap';
  } catch (e) {
    console.error('Logs error:', e);
    showToast('Error cargando logs', 'error');
  }
}

async function loadLogContent(name) {
  try {
    const res = await fetch(`${API_BASE}/logs/${name}`, { credentials: 'include' });
    const data = await res.json();
    document.getElementById('logContent').textContent = data.content;
  } catch (e) {
    showToast('Error cargando log', 'error');
  }
}

// Utility Functions
function updateBotStatus(connected) {
  if (statusDot) statusDot.className = `w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`;
  if (statusText) statusText.textContent = connected ? 'Conectado' : 'Desconectado';
}

function startStatusPolling() {
  setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`, { credentials: 'include' });
      const data = await res.json();
      updateBotStatus(data.connected);
    } catch (e) {
      updateBotStatus(false);
    }
  }, 5000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast px-4 py-3 rounded-lg shadow-lg text-white ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function renderPagination(containerId, currentPage, totalPages, callback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `px-3 py-1 rounded ${i === currentPage ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;
    btn.onclick = () => callback(i);
    container.appendChild(btn);
  }
}

// Modal functions
function openChatModal(chatId) { showToast('Función en desarrollo', 'info'); }
function openUserModal(userId, name) {
  modalTitle.textContent = `Editar Usuario: ${name}`;
  modalContent.innerHTML = `
    <div class="space-y-4">
      <div><label class="block text-sm font-medium mb-1">Coins</label><input type="number" id="editCoins" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"></div>
      <div><label class="block text-sm font-medium mb-1">Banco</label><input type="number" id="editBank" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"></div>
      <div><label class="block text-sm font-medium mb-1">Salud</label><input type="number" id="editHealth" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"></div>
      <div><label class="block text-sm font-medium mb-1">Stamina</label><input type="number" id="editStamina" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"></div>
    </div>
    <div class="p-4 border-t border-gray-200 flex justify-end gap-2">
      <button onclick="modalClose.click()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
      <button onclick="saveUserFromModal()" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Guardar</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
function saveUserFromModal() { showToast('Función en desarrollo', 'info'); modalClose.click(); }
function openEconomyModal(chatId, userId, name) {
  modalTitle.textContent = `Economía: ${name}`;
  modalContent.innerHTML = `
    <div class="space-y-4">
      <div><label class="block text-sm font-medium mb-1">Coins</label><input type="number" id="ecoCoins" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"></div>
      <div><label class="block text-sm font-medium mb-1">Banco</label><input type="number" id="ecoBank" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"></div>
      <div><label class="block text-sm font-medium mb-1">Salud</label><input type="number" id="ecoHealth" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"></div>
      <div><label class="block text-sm font-medium mb-1">Stamina</label><input type="number" id="ecoStamina" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"></div>
    </div>
    <div class="p-4 border-t border-gray-200 flex justify-end gap-2">
      <button onclick="modalClose.click()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
      <button onclick="saveEconomy('${chatId}', '${userId}')" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Guardar</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}
async function saveEconomy(chatId, userId) {
  try {
    const fields = {
      coins: parseInt(document.getElementById('ecoCoins').value) || 0,
      bank: parseInt(document.getElementById('ecoBank').value) || 0,
      health: parseInt(document.getElementById('ecoHealth').value) || 100,
      stamina: parseInt(document.getElementById('ecoStamina').value) || 100
    };
    for (const [field, value] of Object.entries(fields)) {
      await fetch(`${API_BASE}/chat-users/${chatId}/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ field, value })
      });
    }
    showToast('Economía actualizada', 'success');
    modalClose.click();
    if (currentChatId) loadEconomyTable(currentChatId);
  } catch (e) { showToast('Error guardando', 'error'); }
}

// Modal close handlers
modalClose?.addEventListener('click', () => {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
});
modal?.addEventListener('click', (e) => {
  if (e.target === modal) modalClose.click();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modalClose?.click();
  if (e.key === 'd' && e.metaKey) toggleTheme();
});