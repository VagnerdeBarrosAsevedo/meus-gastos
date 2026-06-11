/* =============================================
   FinanAI — Transactions Module
   ============================================= */

const Transactions = (() => {
  const CATEGORIES = {
    income: [
      { name: 'Salário', icon: 'fa-money-bill-wave', color: '#00d68f' },
      { name: 'Freelance', icon: 'fa-laptop-code', color: '#0095ff' },
      { name: 'Comissões', icon: 'fa-handshake', color: '#a855f7' },
      { name: 'Dividendos', icon: 'fa-chart-line', color: '#7c5cfc' },
      { name: 'Aluguéis', icon: 'fa-building', color: '#ff6b35' },
      { name: 'Rendimentos', icon: 'fa-percent', color: '#06b6d4' },
      { name: 'Outros', icon: 'fa-ellipsis', color: '#64748b' },
    ],
    expense: [
      { name: 'Aluguel', icon: 'fa-house', color: '#ff6b9d', parent: 'Moradia' },
      { name: 'Condomínio', icon: 'fa-building', color: '#e04e80', parent: 'Moradia' },
      { name: 'IPTU', icon: 'fa-file-invoice', color: '#d63384', parent: 'Moradia' },
      { name: 'Energia', icon: 'fa-bolt', color: '#ffcc33', parent: 'Moradia' },
      { name: 'Internet', icon: 'fa-wifi', color: '#06b6d4', parent: 'Moradia' },
      { name: 'Mercado', icon: 'fa-cart-shopping', color: '#ffaa00', parent: 'Alimentação' },
      { name: 'Restaurante', icon: 'fa-utensils', color: '#ff6b35', parent: 'Alimentação' },
      { name: 'Delivery', icon: 'fa-motorcycle', color: '#ff8f40', parent: 'Alimentação' },
      { name: 'Combustível', icon: 'fa-gas-pump', color: '#06b6d4', parent: 'Transporte' },
      { name: 'Uber', icon: 'fa-car', color: '#64748b', parent: 'Transporte' },
      { name: 'Ônibus', icon: 'fa-bus', color: '#0095ff', parent: 'Transporte' },
      { name: 'Manutenção Auto', icon: 'fa-wrench', color: '#94a3b8', parent: 'Transporte' },
      { name: 'Plano de Saúde', icon: 'fa-heart-pulse', color: '#ff3d71', parent: 'Saúde' },
      { name: 'Consultas', icon: 'fa-stethoscope', color: '#e04e80', parent: 'Saúde' },
      { name: 'Medicamentos', icon: 'fa-pills', color: '#d63384', parent: 'Saúde' },
      { name: 'Academia', icon: 'fa-dumbbell', color: '#a855f7', parent: 'Saúde' },
      { name: 'Cursos', icon: 'fa-graduation-cap', color: '#0095ff', parent: 'Educação' },
      { name: 'Faculdade', icon: 'fa-university', color: '#7c5cfc', parent: 'Educação' },
      { name: 'Livros', icon: 'fa-book', color: '#06b6d4', parent: 'Educação' },
      { name: 'Viagens', icon: 'fa-plane', color: '#00d4aa', parent: 'Lazer' },
      { name: 'Streaming', icon: 'fa-tv', color: '#e04e80', parent: 'Lazer' },
      { name: 'Cinema', icon: 'fa-film', color: '#a855f7', parent: 'Lazer' },
      { name: 'Assinaturas', icon: 'fa-rotate', color: '#64748b', parent: 'Outros' },
      { name: 'Compras', icon: 'fa-bag-shopping', color: '#ffaa00', parent: 'Outros' },
    ]
  };

  const AUTO_CATEGORIES = {
    'posto': 'Combustível', 'shell': 'Combustível', 'ipiranga': 'Combustível', 'br distribuidora': 'Combustível',
    'ifood': 'Delivery', 'rappi': 'Delivery', 'uber eats': 'Delivery',
    'uber': 'Uber', '99': 'Uber',
    'mercado': 'Mercado', 'supermercado': 'Mercado', 'carrefour': 'Mercado', 'pão de açúcar': 'Mercado',
    'extra': 'Mercado', 'atacadão': 'Mercado',
    'restaurante': 'Restaurante', 'lanchonete': 'Restaurante', 'pizzaria': 'Restaurante',
    'farmácia': 'Medicamentos', 'drogaria': 'Medicamentos', 'droga': 'Medicamentos',
    'netflix': 'Streaming', 'spotify': 'Streaming', 'disney': 'Streaming', 'hbo': 'Streaming',
    'amazon prime': 'Streaming',
    'academia': 'Academia', 'smart fit': 'Academia', 'gym': 'Academia',
    'udemy': 'Cursos', 'coursera': 'Cursos', 'alura': 'Cursos',
  };

  function autoCategorizeName(description) {
    const lower = description.toLowerCase();
    for (const [keyword, category] of Object.entries(AUTO_CATEGORIES)) {
      if (lower.includes(keyword)) return category;
    }
    return null;
  }

  function getCategoryInfo(categoryName, type = 'expense') {
    const list = CATEGORIES[type] || CATEGORIES.expense;
    return list.find(c => c.name === categoryName) || { name: categoryName, icon: 'fa-receipt', color: '#64748b' };
  }

  async function adjustBalance(accountOrCardString, amount, type, operation) {
    if (!accountOrCardString) return;
    const [kind, id] = accountOrCardString.split(':');
    
    if (kind === 'account') {
      const acc = await FinanDB.getById('accounts', id);
      if (acc) {
        let multiplier = 1;
        if (type === 'expense') {
          multiplier = -1;
        }
        if (operation === 'revert') {
          multiplier *= -1;
        }
        acc.balance += amount * multiplier;
        await FinanDB.update('accounts', acc);
      }
    } else if (kind === 'card') {
      const card = await FinanDB.getById('cards', id);
      if (card) {
        let multiplier = 1; // expenses increase credit card 'used' limit
        if (type === 'income') {
          multiplier = -1; // income (refunds) decrease 'used' limit
        }
        if (operation === 'revert') {
          multiplier *= -1;
        }
        card.used += amount * multiplier;
        card.used = Math.max(0, card.used);
        await FinanDB.update('cards', card);
      }
    }
  }

  async function render() {
    const transactions = await FinanDB.getAll('transactions');
    const accounts = await FinanDB.getAll('accounts');
    const cards = await FinanDB.getAll('cards');

    const accountMap = {};
    accounts.forEach(a => { accountMap[`account:${a.id}`] = a.name; });
    cards.forEach(c => { accountMap[`card:${c.id}`] = c.name; });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const txCount = monthTx.length;

    const container = document.getElementById('page-transactions');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>Transações</h2>
          <p>Gerencie suas receitas e despesas</p>
        </div>
        <div class="flex gap-3">
          <button class="btn btn-success" onclick="Transactions.openForm('income')">
            <i class="fa-solid fa-plus"></i> Receita
          </button>
          <button class="btn btn-danger" onclick="Transactions.openForm('expense')">
            <i class="fa-solid fa-minus"></i> Despesa
          </button>
        </div>
      </div>

      <div class="transactions-summary">
        <div class="kpi-card" style="--kpi-accent: var(--color-success)">
          <div class="kpi-icon success"><i class="fa-solid fa-arrow-up"></i></div>
          <div class="kpi-label">Receitas do Mês</div>
          <div class="kpi-value">${App.currency(totalIncome)}</div>
        </div>
        <div class="kpi-card" style="--kpi-accent: var(--color-danger)">
          <div class="kpi-icon danger"><i class="fa-solid fa-arrow-down"></i></div>
          <div class="kpi-label">Despesas do Mês</div>
          <div class="kpi-value">${App.currency(totalExpense)}</div>
        </div>
        <div class="kpi-card" style="--kpi-accent: var(--brand-primary)">
          <div class="kpi-icon primary"><i class="fa-solid fa-list"></i></div>
          <div class="kpi-label">Total de Transações</div>
          <div class="kpi-value">${txCount}</div>
        </div>
      </div>

      <div class="filters-bar" id="tx-filters">
        <div class="filter-group">
          <i class="fa-solid fa-search"></i>
          <input type="text" class="filter-input" id="tx-search" placeholder="Buscar transação..." oninput="Transactions.applyFilters()">
        </div>
        <select class="filter-select" id="tx-type-filter" onchange="Transactions.applyFilters()">
          <option value="">Todos os tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
        <select class="filter-select" id="tx-category-filter" onchange="Transactions.applyFilters()">
          <option value="">Todas categorias</option>
          ${[...new Set(transactions.map(t => t.parentCategory || t.category))].sort().map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <input type="month" class="filter-date" id="tx-month-filter" value="${currentYear}-${String(currentMonth + 1).padStart(2, '0')}" onchange="Transactions.applyFilters()">
      </div>

      <div class="transactions-list" id="tx-list">
        <!-- Filled by applyFilters -->
      </div>
    `;

    applyFilters();
  }

  async function applyFilters() {
    const transactions = await FinanDB.getAll('transactions');
    const accounts = await FinanDB.getAll('accounts');
    const cards = await FinanDB.getAll('cards');

    const accountMap = {};
    accounts.forEach(a => { accountMap[`account:${a.id}`] = a.name; });
    cards.forEach(c => { accountMap[`card:${c.id}`] = c.name; });

    const search = document.getElementById('tx-search')?.value?.toLowerCase() || '';
    const typeFilter = document.getElementById('tx-type-filter')?.value || '';
    const catFilter = document.getElementById('tx-category-filter')?.value || '';
    const monthFilter = document.getElementById('tx-month-filter')?.value || '';

    let filtered = transactions;

    if (search) {
      filtered = filtered.filter(t => t.description.toLowerCase().includes(search) || t.category.toLowerCase().includes(search));
    }
    if (typeFilter) {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    if (catFilter) {
      filtered = filtered.filter(t => t.category === catFilter || t.parentCategory === catFilter);
    }
    if (monthFilter) {
      const [y, m] = monthFilter.split('-').map(Number);
      filtered = filtered.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === m - 1 && d.getFullYear() === y;
      });
    }

    filtered.sort((a, b) => b.date.localeCompare(a.date));

    const groups = {};
    filtered.forEach(t => {
      const dateKey = t.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    const listEl = document.getElementById('tx-list');
    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-receipt"></i></div>
          <div class="empty-state-title">Nenhuma transação encontrada</div>
          <div class="empty-state-text">Ajuste os filtros ou adicione uma nova transação</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="transactions-list-header">
        <h4>${filtered.length} transação(ões)</h4>
      </div>
      ${Object.entries(groups).map(([date, txs]) => `
        <div class="transactions-group">
          <div class="transactions-date-header">${App.fullDate(date)}</div>
          ${txs.map(tx => {
            const baseOrigin = accountMap[tx.account] || 'Conta Principal';
            let methodLabel = '';
            if (tx.paymentMethod === 'pix') methodLabel = ' (PIX)';
            else if (tx.paymentMethod === 'boleto') methodLabel = ' (Boleto)';
            else if (tx.paymentMethod === 'dinheiro') methodLabel = 'Dinheiro';
            else if (tx.paymentMethod === 'saldo') methodLabel = ' (Débito)';
            
            const originName = tx.paymentMethod === 'dinheiro' ? methodLabel : `${baseOrigin}${methodLabel}`;

            return `
              <div class="transaction-item" onclick="Transactions.openDetail('${tx.id}')">
                <div class="transaction-icon" style="background:${tx.categoryColor || '#64748b'}15; color:${tx.categoryColor || '#64748b'}">
                  <i class="fa-solid ${tx.categoryIcon || 'fa-receipt'}"></i>
                </div>
                <div class="transaction-info">
                  <div class="transaction-name">${tx.description}</div>
                  <div class="transaction-category">
                    ${tx.parentCategory ? tx.parentCategory + ' › ' : ''}${tx.category}
                    <span class="tag tag-secondary" style="padding: 1px 6px; font-size: 0.65rem; margin-left: 6px;">
                      ${originName}
                    </span>
                    ${tx.recurrent ? ' <i class="fa-solid fa-rotate" style="font-size:0.6rem;opacity:0.5;margin-left:4px"></i>' : ''}
                  </div>
                </div>
                <div>
                  <div class="transaction-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'} ${App.currency(tx.amount)}</div>
                  <div class="transaction-date">${App.shortDate(tx.date)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `).join('')}
    `;
  }

  async function openForm(type = 'expense') {
    const cats = CATEGORIES[type] || CATEGORIES.expense;
    const modal = document.getElementById('modal-transaction');
    const body = modal.querySelector('.modal-body');

    const accounts = await FinanDB.getAll('accounts');

    modal.querySelector('h3').innerHTML = `
      <i class="fa-solid ${type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down'}" style="color:${type === 'income' ? 'var(--color-success)' : 'var(--color-danger)'}"></i>
      Nova ${type === 'income' ? 'Receita' : 'Despesa'}
    `;

    body.innerHTML = `
      <input type="hidden" id="tx-form-type" value="${type}">
      <input type="hidden" id="tx-form-id" value="">
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input type="text" class="form-input" id="tx-form-desc" placeholder="Ex: Mercado, Salário..." oninput="Transactions.onDescInput()">
        <small id="tx-auto-cat" style="color:var(--brand-secondary);display:none;margin-top:4px"></small>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Valor (R$)</label>
          <input type="number" class="form-input" id="tx-form-amount" placeholder="0,00" step="0.01" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Data</label>
          <input type="date" class="form-input" id="tx-form-date" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select class="form-select" id="tx-form-category">
            ${cats.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Forma de Pagamento</label>
          <select class="form-select" id="tx-form-method" onchange="Transactions.onPaymentMethodChange()">
            ${type === 'expense' ? `
            <option value="pix">PIX</option>
            <option value="boleto">Boleto Bancário</option>
            <option value="saldo">Débito / Saldo em Conta</option>
            <option value="cartao">Cartão de Crédito</option>
            <option value="dinheiro">Dinheiro em Espécie</option>
            ` : `
            <option value="saldo">Saldo em Conta</option>
            <option value="pix">PIX</option>
            <option value="dinheiro">Dinheiro em Espécie</option>
            `}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" id="tx-form-source-group">
          <label class="form-label" id="tx-form-source-label">Conta de Débito</label>
          <select class="form-select" id="tx-form-source">
            <!-- Filled dynamically -->
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;gap:8px;margin-top:28px">
            <div class="toggle" id="tx-form-recurrent" onclick="this.classList.toggle('active')"></div>
            <span>Recorrente</span>
          </label>
        </div>
      </div>
    `;

    App.openModal('modal-transaction');
    
    // Trigger initial load for source dropdown
    onPaymentMethodChange();
  }

  function onPaymentMethodChange(selectedMethod = null, selectedSource = null) {
    const methodSelect = document.getElementById('tx-form-method');
    const sourceGroup = document.getElementById('tx-form-source-group');
    const sourceLabel = document.getElementById('tx-form-source-label');
    const sourceSelect = document.getElementById('tx-form-source');
    
    if (!methodSelect || !sourceGroup || !sourceSelect) return;
    
    const method = selectedMethod || methodSelect.value;
    if (selectedMethod) methodSelect.value = method;
    
    if (method === 'dinheiro') {
      sourceGroup.style.display = 'none';
      sourceSelect.innerHTML = '<option value="method:cash">Dinheiro</option>';
      return;
    }
    
    sourceGroup.style.display = 'block';
    
    FinanDB.getAll('accounts').then(accounts => {
      FinanDB.getAll('cards').then(cards => {
        if (method === 'cartao') {
          sourceLabel.textContent = 'Escolha o Cartão de Crédito';
          sourceSelect.innerHTML = cards.map(c => 
            `<option value="card:${c.id}">${c.bank} - ${c.name} (•••• ${c.lastDigits})</option>`
          ).join('');
        } else {
          sourceLabel.textContent = method === 'pix' ? 'Conta para Débito do PIX' : method === 'boleto' ? 'Conta para Débito do Boleto' : 'Conta Bancária';
          sourceSelect.innerHTML = accounts.map(a => 
            `<option value="account:${a.id}">${a.bank} - ${a.name}</option>`
          ).join('');
        }
        
        if (selectedSource) {
          sourceSelect.value = selectedSource;
        }
      });
    });
  }

  function onDescInput() {
    const desc = document.getElementById('tx-form-desc')?.value || '';
    const autoCat = autoCategorizeName(desc);
    const hint = document.getElementById('tx-auto-cat');
    if (autoCat && hint) {
      hint.style.display = 'block';
      hint.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Categoria sugerida: <strong>${autoCat}</strong>`;
      const select = document.getElementById('tx-form-category');
      if (select) {
        const option = [...select.options].find(o => o.value === autoCat);
        if (option) select.value = autoCat;
      }
    } else if (hint) {
      hint.style.display = 'none';
    }
  }

  async function saveTransaction() {
    const type = document.getElementById('tx-form-type').value;
    const id = document.getElementById('tx-form-id').value;
    const desc = document.getElementById('tx-form-desc').value.trim();
    const amount = parseFloat(document.getElementById('tx-form-amount').value);
    const date = document.getElementById('tx-form-date').value;
    const category = document.getElementById('tx-form-category').value;
    const recurrent = document.getElementById('tx-form-recurrent')?.classList.contains('active') || false;
    const method = document.getElementById('tx-form-method').value;
    const source = document.getElementById('tx-form-source').value;

    if (!desc || isNaN(amount) || amount <= 0 || !date || !category || !method || !source) {
      App.toast('warning', 'Campos obrigatórios', 'Preencha todos os campos corretamente');
      return;
    }

    const catInfo = getCategoryInfo(category, type);
    const catFull = CATEGORIES[type]?.find(c => c.name === category);

    const tx = {
      id: id || undefined,
      type,
      description: desc,
      amount,
      date,
      category,
      parentCategory: catFull?.parent || '',
      categoryIcon: catInfo.icon,
      categoryColor: catInfo.color,
      recurrent,
      account: source,
      paymentMethod: method,
    };

    if (id) {
      const oldTx = await FinanDB.getById('transactions', id);
      if (oldTx) {
        await adjustBalance(oldTx.account, oldTx.amount, oldTx.type, 'revert');
      }
      await adjustBalance(tx.account, tx.amount, tx.type, 'add');
      await FinanDB.update('transactions', tx);
      App.toast('success', 'Transação atualizada', desc);
    } else {
      await adjustBalance(tx.account, tx.amount, tx.type, 'add');
      await FinanDB.add('transactions', tx);
      App.toast('success', 'Transação adicionada', `${type === 'income' ? 'Receita' : 'Despesa'}: ${App.currency(amount)}`);
      checkAbnormalSpending(tx);
    }

    App.closeModal('modal-transaction');
    render();
  }

  async function checkAbnormalSpending(newTx) {
    if (newTx.type !== 'expense') return;

    const all = await FinanDB.getAll('transactions');
    const sameCat = all.filter(t => t.type === 'expense' && t.category === newTx.category && t.id !== newTx.id);

    if (sameCat.length < 2) return;

    const avg = sameCat.reduce((s, t) => s + t.amount, 0) / sameCat.length;

    if (newTx.amount > avg * 1.5) {
      setTimeout(() => {
        App.toast('warning', '⚠️ Gasto acima da média!',
          `${newTx.category}: ${App.currency(newTx.amount)} é ${((newTx.amount / avg - 1) * 100).toFixed(0)}% acima da sua média de ${App.currency(avg)}`,
          6000
        );
      }, 500);
    }
  }

  async function deleteTransaction(id) {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;
    const tx = await FinanDB.getById('transactions', id);
    if (tx) {
      await adjustBalance(tx.account, tx.amount, tx.type, 'revert');
    }
    await FinanDB.remove('transactions', id);
    App.toast('info', 'Transação excluída');
    App.closeModal('modal-transaction');
    render();
  }

  async function openDetail(id) {
    const tx = await FinanDB.getById('transactions', id);
    if (!tx) return;

    await openForm(tx.type);

    setTimeout(() => {
      document.getElementById('tx-form-id').value = tx.id;
      document.getElementById('tx-form-desc').value = tx.description;
      document.getElementById('tx-form-amount').value = tx.amount;
      document.getElementById('tx-form-date').value = tx.date;
      document.getElementById('tx-form-category').value = tx.category;
      if (tx.recurrent) document.getElementById('tx-form-recurrent')?.classList.add('active');

      let method = tx.paymentMethod;
      if (!method) {
        if (tx.account?.startsWith('card:')) {
          method = 'cartao';
        } else if (tx.account === 'method:cash') {
          method = 'dinheiro';
        } else {
          method = 'saldo';
        }
      }

      onPaymentMethodChange(method, tx.account);

      const modal = document.getElementById('modal-transaction');
      modal.querySelector('h3').innerHTML = `<i class="fa-solid fa-pen"></i> Editar Transação`;

      const footer = modal.querySelector('.modal-footer');
      const oldDelete = footer.querySelector('.btn-delete-extra');
      if (oldDelete) oldDelete.remove();

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-sm btn-delete-extra';
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Excluir';
      deleteBtn.onclick = () => deleteTransaction(id);
      footer.insertBefore(deleteBtn, footer.firstChild);
    }, 50);
  }

  return { render, openForm, saveTransaction, applyFilters, onDescInput, openDetail, CATEGORIES, getCategoryInfo, onPaymentMethodChange };
})();
