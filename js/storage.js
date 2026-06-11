/* =============================================
   FinanAI — Storage Layer (IndexedDB + LocalStorage)
   ============================================= */

const FinanDB = (() => {
  const supabase = window.supabaseClient;
  const DB_NAME = 'FinanAI';
  const DB_VERSION = 1;
  let db = null;

  const STORES = {
    transactions: { keyPath: 'id', indexes: ['type', 'category', 'date', 'account'] },
    accounts: { keyPath: 'id', indexes: ['type'] },
    cards: { keyPath: 'id', indexes: [] },
    investments: { keyPath: 'id', indexes: ['type', 'category'] },
    goals: { keyPath: 'id', indexes: [] },
    budgets: { keyPath: 'id', indexes: ['category'] },
    achievements: { keyPath: 'id', indexes: [] },
    settings: { keyPath: 'key', indexes: [] }
  };

  // ── Initialize DB ──
  function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        for (const [name, config] of Object.entries(STORES)) {
          if (!database.objectStoreNames.contains(name)) {
            const store = database.createObjectStore(name, { keyPath: config.keyPath });
            config.indexes.forEach(idx => store.createIndex(idx, idx, { unique: false }));
          }
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('DB Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // ── Generic CRUD ──
  function _getStore(storeName, mode = 'readonly') {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  function getAllLocal(storeName) {
    return new Promise((resolve, reject) => {
      const store = _getStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function getByIdLocal(storeName, id) {
    return new Promise((resolve, reject) => {
      const store = _getStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function addLocal(storeName, data) {
    return new Promise((resolve, reject) => {
      const store = _getStore(storeName, 'readwrite');
      if (!data.id && storeName !== 'settings') data.id = generateId();
      if (!data.createdAt) data.createdAt = new Date().toISOString();
      const request = store.add(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  function updateLocal(storeName, data) {
    return new Promise((resolve, reject) => {
      const store = _getStore(storeName, 'readwrite');
      data.updatedAt = new Date().toISOString();
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  function removeLocal(storeName, id) {
    return new Promise((resolve, reject) => {
      const store = _getStore(storeName, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async function getActiveUser() {
    if (!window.supabase || !supabase) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.user || null;
    } catch (e) {
      console.warn("Failed to get active Supabase session:", e);
      return null;
    }
  }

  async function getAll(storeName) {
    const user = await getActiveUser();
    if (user) {
      try {
        const { data, error } = await supabase.from(storeName).select('*');
        if (!error && data) {
          // Clear local and reload from cloud
          await clearStore(storeName);
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          for (const item of data) {
            const { user_id, ...localItem } = item;
            store.put(localItem);
          }
          return data.map(item => {
            const { user_id, ...localItem } = item;
            return localItem;
          });
        } else if (error) {
          console.error(`Supabase error fetching ${storeName}:`, error);
        }
      } catch (e) {
        console.warn(`Failed to sync ${storeName} from Supabase, returning local:`, e);
      }
    }
    return getAllLocal(storeName);
  }

  async function getById(storeName, id) {
    const user = await getActiveUser();
    if (user) {
      try {
        const query = supabase.from(storeName);
        let data, error;
        if (storeName === 'settings') {
          const { data: d, error: err } = await query.select('*').eq('key', id).maybeSingle();
          data = d;
          error = err;
        } else {
          const { data: d, error: err } = await query.select('*').eq('id', id).maybeSingle();
          data = d;
          error = err;
        }
        if (!error && data) {
          const { user_id, ...localItem } = data;
          await updateLocal(storeName, localItem);
          return localItem;
        }
      } catch (e) {
        console.warn(`Failed to sync ${storeName} ID ${id} from Supabase, returning local:`, e);
      }
    }
    return getByIdLocal(storeName, id);
  }

  async function add(storeName, data) {
    if (!data.id && storeName !== 'settings') data.id = generateId();
    if (!data.createdAt) data.createdAt = new Date().toISOString();

    const saved = await addLocal(storeName, data);

    const user = await getActiveUser();
    if (user) {
      try {
        const supabaseData = { ...data, user_id: user.id };
        const { error } = await supabase.from(storeName).insert([supabaseData]);
        if (error) {
          console.error(`Supabase error adding to ${storeName}:`, error);
        }
      } catch (e) {
        console.warn(`Failed to push add for ${storeName} to Supabase:`, e);
      }
    }
    return saved;
  }

  async function update(storeName, data) {
    data.updatedAt = new Date().toISOString();

    const saved = await updateLocal(storeName, data);

    const user = await getActiveUser();
    if (user) {
      try {
        const supabaseData = { ...data, user_id: user.id };
        let error;
        if (storeName === 'settings') {
          const { error: err } = await supabase.from(storeName).upsert([supabaseData]);
          error = err;
        } else {
          const { error: err } = await supabase.from(storeName).update(supabaseData).eq('id', data.id);
          error = err;
        }
        if (error) {
          console.error(`Supabase error updating in ${storeName}:`, error);
        }
      } catch (e) {
        console.warn(`Failed to push update for ${storeName} to Supabase:`, e);
      }
    }
    return saved;
  }

  async function remove(storeName, id) {
    const deletedId = await removeLocal(storeName, id);

    const user = await getActiveUser();
    if (user) {
      try {
        let error;
        if (storeName === 'settings') {
          const { error: err } = await supabase.from(storeName).delete().eq('key', id).eq('user_id', user.id);
          error = err;
        } else {
          const { error: err } = await supabase.from(storeName).delete().eq('id', id);
          error = err;
        }
        if (error) {
          console.error(`Supabase error deleting from ${storeName}:`, error);
        }
      } catch (e) {
        console.warn(`Failed to push delete for ${storeName} to Supabase:`, e);
      }
    }
    return deletedId;
  }

  function clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const store = _getStore(storeName, 'readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const store = _getStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function migrateLocalToCloud(userId) {
    if (!window.supabase || !supabase) return;
    console.log("✈️ Starting local database migration to Supabase for user:", userId);
    for (const storeName of Object.keys(STORES)) {
      try {
        const localItems = await getAllLocal(storeName);
        if (localItems.length === 0) continue;
        console.log(`Migrating ${localItems.length} items from store ${storeName}...`);
        const recordsToUpload = localItems.map(item => {
          return { ...item, user_id: userId };
        });
        const { error } = await supabase.from(storeName).upsert(recordsToUpload);
        if (error) {
          console.error(`Failed to migrate ${storeName}:`, error);
        } else {
          console.log(`Successfully migrated ${storeName}`);
        }
      } catch (e) {
        console.error(`Error migrating ${storeName}:`, e);
      }
    }
    console.log("☁️ Data migration to cloud completed.");
  }

  async function syncFromCloud() {
    const user = await getActiveUser();
    if (!user) return;
    console.log("☁️ Syncing all data from Supabase...");
    for (const storeName of Object.keys(STORES)) {
      try {
        const { data, error } = await supabase.from(storeName).select('*');
        if (!error && data) {
          await clearStore(storeName);
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          for (const item of data) {
            const { user_id, ...localItem } = item;
            store.put(localItem);
          }
        }
      } catch (e) {
        console.error(`Error syncing ${storeName} from cloud:`, e);
      }
    }
    console.log("☁️ Sync complete.");
  }

  async function clearAllLocal() {
    for (const storeName of Object.keys(STORES)) {
      await clearStore(storeName);
    }
  }

  // ── Settings helpers ──
  function getSetting(key, defaultValue = null) {
    return new Promise(async (resolve) => {
      try {
        const result = await getById('settings', key);
        resolve(result ? result.value : defaultValue);
      } catch {
        resolve(defaultValue);
      }
    });
  }

  function setSetting(key, value) {
    return update('settings', { key, value });
  }

  // ── Utility ──
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  // ── Export / Import ──
  async function exportAll() {
    const data = {};
    for (const storeName of Object.keys(STORES)) {
      data[storeName] = await getAll(storeName);
    }
    data._exportDate = new Date().toISOString();
    data._version = DB_VERSION;
    return data;
  }

  async function importAll(data) {
    for (const storeName of Object.keys(STORES)) {
      if (data[storeName] && Array.isArray(data[storeName])) {
        await clearStore(storeName);
        for (const item of data[storeName]) {
          await add(storeName, item);
        }
      }
    }
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Seed Demo Data ──
  async function seedDemoData() {
    if (localStorage.getItem('finanai-db-cleared') === 'true') return;
    const existing = await getAll('transactions');
    if (existing.length > 0) return; // Already has data

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Accounts
    const accounts = [
      { id: 'acc1', name: 'Conta Corrente', type: 'checking', bank: 'Nubank', balance: 8450.00, color: '#7c5cfc', icon: 'fa-building-columns' },
      { id: 'acc2', name: 'Poupança', type: 'savings', bank: 'Itaú', balance: 15000.00, color: '#00d4aa', icon: 'fa-piggy-bank' },
      { id: 'acc3', name: 'Conta PJ', type: 'business', bank: 'Inter', balance: 12300.00, color: '#ff6b9d', icon: 'fa-briefcase' },
    ];

    // Credit Cards
    const cards = [
      { id: 'card1', name: 'Nubank Ultravioleta', bank: 'Nubank', limit: 15000, used: 3250, closing: 15, dueDate: 22, lastDigits: '4589', color: '#7c5cfc' },
      { id: 'card2', name: 'Inter Gold', bank: 'Inter', limit: 8000, used: 1800, closing: 10, dueDate: 17, lastDigits: '7823', color: '#ff6b35' },
    ];

    // Transactions (last 3 months)
    const categories = {
      income: [
        { name: 'Salário', icon: 'fa-money-bill-wave', color: '#00d68f' },
        { name: 'Freelance', icon: 'fa-laptop-code', color: '#0095ff' },
        { name: 'Dividendos', icon: 'fa-chart-line', color: '#7c5cfc' },
      ],
      expense: [
        { name: 'Aluguel', icon: 'fa-house', color: '#ff6b9d', parent: 'Moradia' },
        { name: 'Mercado', icon: 'fa-cart-shopping', color: '#ffaa00', parent: 'Alimentação' },
        { name: 'Restaurante', icon: 'fa-utensils', color: '#ff6b35', parent: 'Alimentação' },
        { name: 'Combustível', icon: 'fa-gas-pump', color: '#06b6d4', parent: 'Transporte' },
        { name: 'Uber', icon: 'fa-car', color: '#64748b', parent: 'Transporte' },
        { name: 'Plano de Saúde', icon: 'fa-heart-pulse', color: '#ff3d71', parent: 'Saúde' },
        { name: 'Academia', icon: 'fa-dumbbell', color: '#a855f7', parent: 'Saúde' },
        { name: 'Streaming', icon: 'fa-tv', color: '#e04e80', parent: 'Lazer' },
        { name: 'Cursos', icon: 'fa-graduation-cap', color: '#0095ff', parent: 'Educação' },
        { name: 'Energia', icon: 'fa-bolt', color: '#ffcc33', parent: 'Moradia' },
        { name: 'Internet', icon: 'fa-wifi', color: '#06b6d4', parent: 'Moradia' },
        { name: 'Delivery', icon: 'fa-motorcycle', color: '#ff6b35', parent: 'Alimentação' },
      ]
    };

    const transactions = [];
    const incomeAmounts = { 'Salário': 8500, 'Freelance': 2500, 'Dividendos': 450 };
    const expenseRanges = {
      'Aluguel': [2200, 2200], 'Mercado': [800, 1400], 'Restaurante': [200, 600],
      'Combustível': [300, 500], 'Uber': [80, 200], 'Plano de Saúde': [450, 450],
      'Academia': [120, 120], 'Streaming': [80, 80], 'Cursos': [150, 400],
      'Energia': [150, 280], 'Internet': [120, 120], 'Delivery': [150, 400],
    };

    for (let m = 2; m >= 0; m--) {
      const txMonth = month - m;
      const txYear = txMonth < 0 ? year - 1 : year;
      const actualMonth = txMonth < 0 ? txMonth + 12 : txMonth;

      // Income
      for (const cat of categories.income) {
        const baseAmount = incomeAmounts[cat.name] || 1000;
        const variation = 1 + (Math.random() * 0.1 - 0.05);
        transactions.push({
          id: generateId(),
          type: 'income',
          description: cat.name,
          category: cat.name,
          categoryIcon: cat.icon,
          categoryColor: cat.color,
          amount: Math.round(baseAmount * variation * 100) / 100,
          date: new Date(txYear, actualMonth, cat.name === 'Salário' ? 5 : Math.floor(Math.random() * 25) + 1).toISOString().split('T')[0],
          account: 'acc1',
          recurrent: cat.name === 'Salário',
          createdAt: new Date().toISOString()
        });
      }

      // Expenses
      for (const cat of categories.expense) {
        const [min, max] = expenseRanges[cat.name] || [100, 300];
        const amount = min === max ? min : Math.round((min + Math.random() * (max - min)) * 100) / 100;
        const day = cat.name === 'Aluguel' ? 10 : Math.floor(Math.random() * 28) + 1;
        transactions.push({
          id: generateId(),
          type: 'expense',
          description: cat.name,
          category: cat.name,
          parentCategory: cat.parent,
          categoryIcon: cat.icon,
          categoryColor: cat.color,
          amount: amount,
          date: new Date(txYear, actualMonth, day).toISOString().split('T')[0],
          account: 'acc1',
          recurrent: ['Aluguel', 'Plano de Saúde', 'Academia', 'Streaming', 'Internet'].includes(cat.name),
          createdAt: new Date().toISOString()
        });
      }
    }

    // Investments
    const investments = [
      { id: 'inv1', ticker: 'PETR4', name: 'Petrobras PN', type: 'stock', category: 'Ações', quantity: 100, avgPrice: 28.50, currentPrice: 35.80, icon: 'stock' },
      { id: 'inv2', ticker: 'VALE3', name: 'Vale ON', type: 'stock', category: 'Ações', quantity: 50, avgPrice: 68.00, currentPrice: 72.45, icon: 'stock' },
      { id: 'inv3', ticker: 'XPML11', name: 'XP Malls FII', type: 'fii', category: 'FIIs', quantity: 80, avgPrice: 95.00, currentPrice: 102.30, icon: 'fii' },
      { id: 'inv4', ticker: 'HGLG11', name: 'CSHG Logística', type: 'fii', category: 'FIIs', quantity: 40, avgPrice: 160.00, currentPrice: 168.50, icon: 'fii' },
      { id: 'inv5', ticker: 'IVVB11', name: 'iShares S&P500', type: 'etf', category: 'ETFs', quantity: 30, avgPrice: 250.00, currentPrice: 278.90, icon: 'etf' },
      { id: 'inv6', ticker: 'Tesouro IPCA+', name: 'Tesouro IPCA+ 2035', type: 'fixed', category: 'Renda Fixa', quantity: 1, avgPrice: 3500.00, currentPrice: 3820.00, icon: 'fixed' },
      { id: 'inv7', ticker: 'CDB Inter', name: 'CDB 120% CDI', type: 'fixed', category: 'Renda Fixa', quantity: 1, avgPrice: 10000.00, currentPrice: 10650.00, icon: 'fixed' },
      { id: 'inv8', ticker: 'BTC', name: 'Bitcoin', type: 'crypto', category: 'Cripto', quantity: 0.05, avgPrice: 180000.00, currentPrice: 320000.00, icon: 'crypto' },
      { id: 'inv9', ticker: 'ETH', name: 'Ethereum', type: 'crypto', category: 'Cripto', quantity: 0.8, avgPrice: 12000.00, currentPrice: 14500.00, icon: 'crypto' },
    ];

    // Goals
    const goals = [
      { id: 'goal1', name: 'Reserva de Emergência', emoji: '🛡️', target: 50000, current: 35750, deadline: '2026-12-31', monthlyContribution: 2000 },
      { id: 'goal2', name: 'Viagem Internacional', emoji: '✈️', target: 25000, current: 8500, deadline: '2027-06-30', monthlyContribution: 1500 },
      { id: 'goal3', name: 'Entrada Apartamento', emoji: '🏠', target: 150000, current: 42000, deadline: '2029-12-31', monthlyContribution: 3000 },
      { id: 'goal4', name: 'Novo Carro', emoji: '🚗', target: 80000, current: 15000, deadline: '2028-06-30', monthlyContribution: 2500 },
    ];

    // Budgets
    const budgets = [
      { id: 'bud1', category: 'Alimentação', limit: 2000, icon: 'fa-utensils', color: '#ffaa00' },
      { id: 'bud2', category: 'Transporte', limit: 800, icon: 'fa-car', color: '#06b6d4' },
      { id: 'bud3', category: 'Moradia', limit: 3000, icon: 'fa-house', color: '#ff6b9d' },
      { id: 'bud4', category: 'Saúde', limit: 700, icon: 'fa-heart-pulse', color: '#ff3d71' },
      { id: 'bud5', category: 'Lazer', limit: 500, icon: 'fa-gamepad', color: '#a855f7' },
      { id: 'bud6', category: 'Educação', limit: 600, icon: 'fa-graduation-cap', color: '#0095ff' },
    ];

    // Achievements
    const achievements = [
      { id: 'ach1', name: 'Primeiro Passo', description: 'Registrou sua primeira transação', icon: '🚀', unlocked: true, date: '2025-01-15' },
      { id: 'ach2', name: 'Investidor Iniciante', description: 'Fez seu primeiro investimento', icon: '📈', unlocked: true, date: '2025-02-20' },
      { id: 'ach3', name: 'Poupador Dedicado', description: '3 meses consecutivos economizando', icon: '💰', unlocked: true, date: '2025-04-01' },
      { id: 'ach4', name: 'Diversificador', description: '5 tipos de investimentos diferentes', icon: '🎯', unlocked: true, date: '2025-06-10' },
      { id: 'ach5', name: 'Meta Concluída', description: 'Concluiu sua primeira meta', icon: '🏆', unlocked: false, date: null },
      { id: 'ach6', name: 'Patrimônio 100K', description: 'Patrimônio acima de R$100.000', icon: '💎', unlocked: false, date: null },
      { id: 'ach7', name: 'Orçamento Master', description: '6 meses dentro do orçamento', icon: '📊', unlocked: false, date: null },
      { id: 'ach8', name: 'Reserva Completa', description: 'Reserva de emergência completa', icon: '🛡️', unlocked: false, date: null },
    ];

    // Save all
    for (const acc of accounts) await add('accounts', acc);
    for (const card of cards) await add('cards', card);
    for (const tx of transactions) await add('transactions', tx);
    for (const inv of investments) await add('investments', inv);
    for (const goal of goals) await add('goals', goal);
    for (const bud of budgets) await add('budgets', bud);
    for (const ach of achievements) await add('achievements', ach);

    console.log('✅ Demo data seeded successfully');
  }

  async function initAchievements() {
    const existing = await getAll('achievements');
    if (existing.length > 0) return;

    const achievements = [
      { id: 'ach1', name: 'Primeiro Passo', description: 'Registrou sua primeira transação', icon: '🚀', unlocked: false, date: null },
      { id: 'ach2', name: 'Investidor Iniciante', description: 'Fez seu primeiro investimento', icon: '📈', unlocked: false, date: null },
      { id: 'ach3', name: 'Poupador Dedicado', description: '3 meses consecutivos economizando', icon: '💰', unlocked: false, date: null },
      { id: 'ach4', name: 'Diversificador', description: '5 tipos de investimentos diferentes', icon: '🎯', unlocked: false, date: null },
      { id: 'ach5', name: 'Meta Concluída', description: 'Concluiu sua primeira meta', icon: '🏆', unlocked: false, date: null },
      { id: 'ach6', name: 'Patrimônio 100K', description: 'Patrimônio acima de R$100.000', icon: '💎', unlocked: false, date: null },
      { id: 'ach7', name: 'Orçamento Master', description: '6 meses dentro do orçamento', icon: '📊', unlocked: false, date: null },
      { id: 'ach8', name: 'Reserva Completa', description: 'Reserva de emergência completa', icon: '🛡️', unlocked: false, date: null },
    ];

    for (const ach of achievements) {
      await add('achievements', ach);
    }
    console.log('✅ Initial empty achievements created');
  }

  return {
    init, getAll, getById, add, update, remove, clearStore, getByIndex,
    getSetting, setSetting, generateId, exportAll, importAll, downloadJSON,
    seedDemoData, initAchievements, migrateLocalToCloud, syncFromCloud, clearAllLocal, getActiveUser
  };
})();
