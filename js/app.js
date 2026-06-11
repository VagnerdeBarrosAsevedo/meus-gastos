/* =============================================
   FinanAI — Main Application Controller
   ============================================= */

const App = (() => {
  const supabase = window.supabaseClient;
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

  // ── Authentication & Sync System ──
  let authMode = 'login';

  function showAuthPage() {
    const authPage = document.getElementById('auth-page');
    if (authPage) authPage.style.display = 'flex';
  }

  function hideAuthPage() {
    const authPage = document.getElementById('auth-page');
    if (authPage) authPage.style.display = 'none';
  }

  function toggleAuthMode() {
    authMode = authMode === 'login' ? 'signup' : 'login';
    const title = document.getElementById('auth-card-title');
    const subtitle = document.getElementById('auth-card-subtitle');
    const submitText = document.getElementById('auth-submit-text');
    const switchText = document.getElementById('auth-switch-text');
    const switchLink = document.getElementById('auth-switch-link');
    const errDiv = document.getElementById('auth-error');
    
    if (errDiv) errDiv.style.display = 'none';
    
    if (authMode === 'login') {
      if (title) title.textContent = 'Acessar FinanAI';
      if (subtitle) subtitle.textContent = 'Sincronize seus gastos entre celular e computador';
      if (submitText) submitText.textContent = 'Entrar';
      if (switchText) switchText.textContent = 'Não tem uma conta?';
      if (switchLink) switchLink.textContent = 'Cadastre-se';
    } else {
      if (title) title.textContent = 'Criar Conta';
      if (subtitle) subtitle.textContent = 'Comece a sincronizar seus dados na nuvem';
      if (submitText) submitText.textContent = 'Cadastrar';
      if (switchText) switchText.textContent = 'Já tem uma conta?';
      if (switchLink) switchLink.textContent = 'Faça login';
    }
  }

  function updateUserUI(user) {
    const nameEl = document.getElementById('sidebar-user-name');
    const emailEl = document.getElementById('sidebar-user-email');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    
    if (user) {
      const email = user.email;
      const username = email.split('@')[0];
      if (nameEl) nameEl.textContent = username.charAt(0).toUpperCase() + username.slice(1);
      if (emailEl) emailEl.textContent = email;
      if (avatarEl) avatarEl.textContent = username.slice(0, 2).toUpperCase();
    } else {
      if (nameEl) nameEl.textContent = 'Usuário';
      if (emailEl) emailEl.textContent = 'Sincronizado';
      if (avatarEl) avatarEl.textContent = 'US';
    }
  }

  function initRealtimeSync() {
    if (!window.supabase || !supabase) return;
    
    try {
      supabase.removeAllChannels();
    } catch (e) {
      console.warn("Error clearing channels:", e);
    }

    const tables = ['transactions', 'accounts', 'cards', 'goals', 'budgets', 'achievements', 'settings'];
    tables.forEach(table => {
      supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, async (payload) => {
          console.log(`⚡ Realtime update for ${table}:`, payload);
          await FinanDB.syncFromCloud();
          await updateAchievementsBadge();
          navigate(currentPage);
        })
        .subscribe();
    });
  }

  async function handleAuthSubmit() {
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const submitBtn = document.getElementById('auth-submit-btn');
    const spinner = document.getElementById('auth-spinner');
    const submitText = document.getElementById('auth-submit-text');
    const errDiv = document.getElementById('auth-error');
    const errMsg = document.getElementById('auth-error-msg');
    
    if (!emailInput || !passwordInput || !supabase) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      toast('warning', 'Campos vazios', 'Preencha o e-mail e a senha.');
      return;
    }
    
    submitBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (submitText) submitText.textContent = authMode === 'login' ? 'Entrando...' : 'Cadastrando...';
    if (errDiv) errDiv.style.display = 'none';
    
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data.user) {
          toast('success', 'Sucesso', 'Login realizado com sucesso!');
          
          await FinanDB.clearAllLocal();
          await FinanDB.syncFromCloud();
          initRealtimeSync();
          
          hideAuthPage();
          updateUserUI(data.user);
          
          emailInput.value = '';
          passwordInput.value = '';
          
          const hash = window.location.hash.slice(1);
          navigate(hash || 'dashboard');
          await updateAchievementsBadge();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
          if (data.session) {
            toast('success', 'Sucesso', 'Conta criada e dados sincronizados!');
            
            await FinanDB.migrateLocalToCloud(data.user.id);
            initRealtimeSync();
            
            hideAuthPage();
            updateUserUI(data.user);
            
            emailInput.value = '';
            passwordInput.value = '';
            
            const hash = window.location.hash.slice(1);
            navigate(hash || 'dashboard');
            await updateAchievementsBadge();
          } else {
            toast('info', 'Confirme seu e-mail', 'Cadastro realizado! Verifique sua caixa de entrada.');
            if (errDiv && errMsg) {
              errDiv.style.display = 'flex';
              errDiv.style.borderColor = 'rgba(0, 212, 170, 0.2)';
              errDiv.style.background = 'rgba(0, 212, 170, 0.1)';
              errDiv.style.color = 'var(--color-success)';
              errMsg.textContent = 'Cadastro realizado com sucesso! Por favor, clique no link enviado para o seu e-mail para ativar sua conta e iniciar a sincronização.';
            }
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      let friendlyMsg = err.message || 'Erro ao processar autenticação';
      if (err.message === 'Failed to fetch' || (err.message && err.message.toLowerCase().includes('fetch'))) {
        if (window.location.protocol === 'file:') {
          friendlyMsg = 'Erro de Rede (file://): Você abriu o arquivo HTML diretamente no navegador. Por segurança, os navegadores bloqueiam conexões de nuvem a partir de arquivos locais (protocolo file://). Hospede no GitHub Pages ou use um servidor local para testar.';
        } else {
          friendlyMsg = 'Erro de Conexão: Não foi possível conectar ao servidor do Supabase. Verifique seu acesso à internet ou se a rede da sua empresa está bloqueando conexões ao banco de dados.';
        }
      }
      toast('error', 'Falha na Conexão', friendlyMsg);
      if (errDiv && errMsg) {
        errDiv.style.display = 'flex';
        errDiv.style.borderColor = 'rgba(255, 61, 113, 0.2)';
        errDiv.style.background = 'rgba(255, 61, 113, 0.1)';
        errDiv.style.color = 'var(--color-danger)';
        errMsg.textContent = friendlyMsg;
      }
    } finally {
      submitBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (submitText) submitText.textContent = authMode === 'login' ? 'Entrar' : 'Cadastrar';
    }
  }

  async function logout() {
    if (supabase) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        try {
          supabase.removeAllChannels();
        } catch (e) {
          console.warn("Error clearing channels on logout:", e);
        }

        await FinanDB.clearAllLocal();
        localStorage.removeItem('finanai-db-cleared');
        await FinanDB.seedDemoData();
        
        updateUserUI(null);
        showAuthPage();
        toast('success', 'Sessão encerrada', 'Você saiu com sucesso.');
      } catch (e) {
        console.error('Error signing out:', e);
        toast('error', 'Erro ao sair', e.message);
      }
    }
  }

  // ── Initialize ──
  async function init() {
    try {
      // Init DB
      await FinanDB.init();
      await FinanDB.initAchievements();

      const user = await FinanDB.getActiveUser();
      
      if (!user) {
        showAuthPage();
        await FinanDB.seedDemoData();
      } else {
        hideAuthPage();
        updateUserUI(user);
        await FinanDB.syncFromCloud();
        initRealtimeSync();
      }

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
      if (user) {
        const hash = window.location.hash.slice(1);
        navigate(hash || 'dashboard');
      }

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
    updateAchievementsBadge, handleAuthSubmit, toggleAuthMode, logout,
    get currentPage() { return currentPage; }
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
