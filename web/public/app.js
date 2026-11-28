// YukiBot Admin Panel - Frontend Logic

const API_BASE = '/api';
let currentPage = 'dashboard';
let usersPage = 1;
let usersTotalPages = 1;
let currentChatId = null;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuBtn = document.getElementById('menuBtn');
const logoutBtn = document.getElementById('logoutBtn');
const pageTitle = document.getElementById('pageTitle');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const modalClose = document.getElementById('modalClose');
const toastContainer = document.getElementById('toastContainer');

// Initialize - setup listeners FIRST, then check auth
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkAuth();
  startStatusPolling();
});

// Auth Check
async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) {
      showLoginModal();
      return;
    }
    // Authenticated
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
  });
}

// Navigation
function navigateTo(page) {
  // Update active link
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-purple-50', 'text-purple-600'));
  const activeLink = document.querySelector(`[data-page="${page}"]`);
  if (activeLink) activeLink.classList.add('bg-purple-50', 'text-purple-600');

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`)?.classList.remove('hidden');

  // Update title
  const titles = {
    dashboard: 'Dashboard',
    settings: 'Configuración',
    chats: 'Chats',
    users: 'Usuarios',
    economy: 'Economía',
    commands: 'Comandos',
    logs: 'Logs'
  };
  pageTitle.textContent = titles[page] || 'Dashboard';
  currentPage = page;

  // Close mobile sidebar
  sidebar.classList.remove('open');
  overlay.classList.add('hidden');

  // Load page data
  loadPage(page);
}

// Page Loaders
async function loadPage(page) {
  try {
    switch (page) {
      case 'dashboard': await loadDashboard(); break;
      case 'settings': await loadSettings(); break;
      case 'chats': await loadChats(); break;
      case 'users': await loadUsers(); break;
      case 'economy': await loadEconomy(); break;
      case 'commands': await loadCommands(); break;
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

    // Update bot status
    updateBotStatus(data.connected);
  } catch (e) {
    console.error('Dashboard error:', e);
  }
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

    document.getElementById('settingsForm').innerHTML = fields.map(f => {
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

    // Save handler
    document.getElementById('settingsForm').addEventListener('change', async (e) => {
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
      // Revert UI
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

    // Pagination
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

// Logs
async function loadLogs() {
  // In a real implementation, this would fetch from a log file or API
  document.getElementById('logsContent').textContent = 'Logs en tiempo real aparecerían aquí.\nRequiere integración con el sistema de logs del bot.';
}

// Bot Status Polling
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

function updateBotStatus(connected) {
  statusDot.className = `w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`;
  statusText.textContent = connected ? 'Conectado' : 'Desconectado';
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast px-4 py-3 rounded-lg shadow-lg text-white ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function renderPagination(containerId, currentPage, totalPages, callback) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `px-3 py-1 rounded ${i === currentPage ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;
    btn.onclick = () => callback(i);
    container.appendChild(btn);
  }
}

// Modal Functions
function openChatModal(chatId) {
  // Implementation for editing chat settings
  showToast('Función en desarrollo', 'info');
}

function openUserModal(userId, name) {
  modalTitle.textContent = `Editar Usuario: ${name}`;
  modalContent.innerHTML = `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Coins</label>
        <input type="number" id="editCoins" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Banco</label>
        <input type="number" id="editBank" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Salud</label>
        <input type="number" id="editHealth" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Stamina</label>
        <input type="number" id="editStamina" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
      </div>
    </div>
    <div class="p-4 border-t border-gray-200 flex justify-end gap-2">
      <button onclick="modalClose.click()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
      <button onclick="saveUserFromModal()" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Guardar</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function saveUser(name) {
  showToast('Función en desarrollo', 'info');
  modalClose.click();
}

function saveUserFromModal() {
  // Get the user ID from the modal title
  const title = modalTitle.textContent;
  const name = title.replace('Editar Usuario: ', '');
  showToast('Función en desarrollo', 'info');
  modalClose.click();
}

function openEconomyModal(chatId, userId, name) {
  modalTitle.textContent = `Economía: ${name}`;
  modalContent.innerHTML = `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Coins</label>
        <input type="number" id="ecoCoins" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Banco</label>
        <input type="number" id="ecoBank" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Salud</label>
        <input type="number" id="ecoHealth" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">Stamina</label>
        <input type="number" id="ecoStamina" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">
      </div>
    </div>
    <div class="p-4 border-t border-gray-200 flex justify-end gap-2">
      <button onclick="modalClose.click()" class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded">Cancelar</button>
      <button onclick="saveEconomy('${escapeHtml(chatId)}', '${escapeHtml(userId)}')" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Guardar</button>
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
  } catch (e) {
    showToast('Error guardando', 'error');
  }
}