/* =============================================
   FinanAI — Main Application Controller
   ============================================= */

const App = (() => {
  let currentPage = 'dashboard';
  let sidebarCollapsed = false;

  // ── Currency Formatter ──
  const currency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL'
    }).format(value || 0);
  };

  const percent = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1
    }).format((value || 0) / 100);
  };

  const shortDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const fullDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const monthYear = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // ── Toast Notifications ──
  function toast(type, title, message, duration = 4000) {
    const container = document.getElementById('toast-container');
    const icons = { success: 'fa-check', warning: 'fa-exclamation', error: 'fa-xmark', info: 'fa-info' };

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${icons[type]}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.parentElement.classList.add('closing'); setTimeout(() => this.parentElement.remove(), 300)">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    container.appendChild(el);
    setTimeout(() => {
      if (el.parentElement) {
        el.classList.add('closing');
        setTimeout(() => el.remove(), 300);
      }
    }, duration);
  }

  // ── Theme ──
  function initTheme() {
    const saved = localStorage.getItem('finanai-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('finanai-theme', next);
    updateThemeIcon(next);

    // Re-render charts with new colors
    if (typeof Dashboard !== 'undefined') Dashboard.updateChartColors();
    if (typeof Investments !== 'undefined' && currentPage === 'investments') Investments.updateChartColors();
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.innerHTML = theme === 'dark'
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
    }
  }

  // ── Sidebar ──
  function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    localStorage.setItem('finanai-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
  }

  function initSidebar() {
    const saved = localStorage.getItem('finanai-sidebar');
    if (saved === 'collapsed') {
      sidebarCollapsed = true;
      document.querySelector('.sidebar').classList.add('collapsed');
    }
  }

  // ── Navigation / Routing ──
  function navigate(page) {
    currentPage = page;

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Update active page
    document.querySelectorAll('.page').forEach(el => {
      el.classList.toggle('active', el.id === `page-${page}`);
    });

    // Update header
    const titles = {
      dashboard: 'Dashboard',
      transactions: 'Transações',
      accounts: 'Contas & Cartões',
      investments: 'Investimentos',
      goals: 'Metas Financeiras',
      budget: 'Orçamento',
      reports: 'Relatórios',
      achievements: 'Conquistas',
      settings: 'Configurações'
    };

    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

    // Render page content
    switch (page) {
      case 'dashboard': Dashboard.render(); break;
      case 'transactions': Transactions.render(); break;
      case 'accounts': Accounts.render(); break;
      case 'investments': Investments.render(); break;
      case 'goals': Goals.render(); break;
      case 'budget': Budget.render(); break;
      case 'reports': Reports.render(); break;
      case 'achievements': Goals.renderAchievements(); break;
    }

    // Close mobile sidebar
    document.querySelector('.sidebar').classList.remove('mobile-open');

    // Update hash
    window.location.hash = page;
  }

  // ── Modal System ──
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  }

  // ── AI Chat Panel ──
  function toggleAIChat() {
    const panel = document.getElementById('ai-chat-panel');
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && typeof AIAssistant !== 'undefined') {
      AIAssistant.init();
    }
  }

  // ── Keyboard Shortcuts ──
  function initKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Escape closes modals
      if (e.key === 'Escape') {
        closeAllModals();
        document.getElementById('ai-chat-panel')?.classList.remove('open');
      }

      // Ctrl+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.header-search input')?.focus();
      }
    });
  }

  // ── Click outside modal to close ──
  function initModalClicks() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  }

  async function updateAchievementsBadge() {
    try {
      const achievements = await FinanDB.getAll('achievements');
      const unlockedCount = achievements.filter(a => a.unlocked).length;
      const badge = document.getElementById('achievements-badge');
      if (badge) {
        badge.textContent = unlockedCount;
        badge.style.display = unlockedCount > 0 ? 'inline-block' : 'none';
      }
    } catch (e) {
      console.error('Failed to update achievements badge:', e);
    }
  }

  // ── Initialize ──
  async function init() {
    try {
      // Init DB
      await FinanDB.init();
      await FinanDB.initAchievements();
      await FinanDB.seedDemoData();

      // Init UI
      initTheme();
      initSidebar();
      initKeyboard();

      // Setup navigation
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => navigate(item.dataset.page));
      });

      // Init modals
      setTimeout(initModalClicks, 100);

      // Navigate to initial page
      const hash = window.location.hash.slice(1);
      navigate(hash || 'dashboard');

      // Listen for hash changes
      window.addEventListener('hashchange', () => {
        const page = window.location.hash.slice(1);
        if (page && page !== currentPage) navigate(page);
      });

      await updateAchievementsBadge();

      console.log('🚀 FinanAI initialized');
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  }

  return {
    init, navigate, toggleTheme, toggleSidebar, toggleAIChat,
    openModal, closeModal, closeAllModals,
    toast, currency, percent, shortDate, fullDate, monthYear,
    updateAchievementsBadge,
    get currentPage() { return currentPage; }
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
