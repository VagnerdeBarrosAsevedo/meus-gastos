/* =============================================
   FinanAI — Accounts & Cards Module
   ============================================= */

const Accounts = (() => {
  let editingAccountId = null;

  async function render() {
    const accounts = await FinanDB.getAll('accounts');
    const cards = await FinanDB.getAll('cards');
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    const container = document.getElementById('page-accounts');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>Contas & Cartões</h2>
          <p>Gerencie suas contas bancárias e cartões de crédito</p>
        </div>
        <div class="flex gap-3">
          <button class="btn btn-primary" onclick="Accounts.openAccountForm()">
            <i class="fa-solid fa-plus"></i> Nova Conta
          </button>
          <button class="btn btn-secondary" onclick="Accounts.openCardForm()">
            <i class="fa-solid fa-credit-card"></i> Novo Cartão
          </button>
        </div>
      </div>

      <!-- Accounts -->
      <h3 style="margin-bottom:var(--space-4)">
        <i class="fa-solid fa-building-columns" style="color:var(--brand-primary)"></i>
        Contas Bancárias
        <span style="font-size:var(--font-size-sm);color:var(--text-tertiary);font-weight:400;margin-left:8px">
          Total: ${App.currency(totalBalance)}
        </span>
      </h3>
      <div class="accounts-grid">
        ${accounts.map(acc => {
          const typeLabels = { checking: 'Conta Corrente', savings: 'Poupança', cofrinho: 'Cofrinho', business: 'Conta PJ', international: 'Conta Internacional' };
          const typeText = typeLabels[acc.type] || acc.type;
          const cdiText = acc.type === 'cofrinho' && acc.cdiRate ? ` (${acc.cdiRate}% CDI)` : '';
          return `
            <div class="account-card card animate-fade-in-up">
              <div class="account-card-header">
                <div class="account-card-icon" style="background:${acc.color}18; color:${acc.color}">
                  <i class="fa-solid ${acc.icon || 'fa-building-columns'}"></i>
                </div>
                <div>
                  <div class="account-card-name">${acc.name}</div>
                  <div class="account-card-type">${acc.bank} · ${typeText}${cdiText}</div>
                </div>
              </div>
              <div class="account-card-balance">${App.currency(acc.balance)}</div>
              <div class="account-card-actions">
                <button class="btn btn-ghost btn-sm" onclick="Accounts.openTransfer('${acc.id}')" title="Transferir">
                  <i class="fa-solid fa-arrow-right-arrow-left"></i> Transferir
                </button>
                <button class="btn btn-ghost btn-sm" onclick="Accounts.editAccount('${acc.id}')" title="Editar">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="Accounts.deleteAccount('${acc.id}')" style="color:var(--color-danger)" title="Excluir">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Credit Cards -->
      <h3 style="margin: var(--space-8) 0 var(--space-4)">
        <i class="fa-solid fa-credit-card" style="color:var(--brand-accent)"></i>
        Cartões de Crédito
      </h3>
      <div class="accounts-grid">
        ${cards.map(card => {
          const pctUsed = (card.used / card.limit) * 100;
          const available = card.limit - card.used;
          return `
            <div class="card animate-fade-in-up" style="padding:0;overflow:hidden">
              <div class="credit-card-visual" style="background:linear-gradient(135deg, ${card.color}dd, ${card.color}88, #0f3460)">
                <button class="card-delete-btn" onclick="Accounts.deleteCard('${card.id}')" title="Excluir Cartão">
                  <i class="fa-solid fa-trash"></i>
                </button>
                <div class="credit-card-bank">${card.bank}</div>
                <div class="credit-card-number">•••• •••• •••• ${card.lastDigits}</div>
                <div class="credit-card-bottom">
                  <div>
                    <div class="credit-card-label">Nome</div>
                    <div class="credit-card-value">${card.name}</div>
                  </div>
                  <div>
                    <div class="credit-card-label">Vencimento</div>
                    <div class="credit-card-value">Dia ${card.dueDate}</div>
                  </div>
                </div>
              </div>
              <div style="padding:var(--space-5)">
                <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
                  <span style="font-size:var(--font-size-sm);color:var(--text-secondary)">Fatura Atual</span>
                  <span style="font-size:var(--font-size-sm);font-weight:600;color:var(--color-danger)">${App.currency(card.used)}</span>
                </div>
                <div class="progress progress-sm" style="margin-bottom:var(--space-3)">
                  <div class="progress-bar ${pctUsed >= 80 ? 'danger' : pctUsed >= 50 ? 'warning' : 'success'}" style="width:${pctUsed}%"></div>
                </div>
                <div class="credit-card-limit-info">
                  <span>Disponível: <strong style="color:var(--color-success)">${App.currency(available)}</strong></span>
                  <span>Limite: ${App.currency(card.limit)}</span>
                </div>
                <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">
                  <span class="tag tag-secondary"><i class="fa-solid fa-calendar"></i> Fecha dia ${card.closing}</span>
                  <span class="tag tag-secondary"><i class="fa-solid fa-clock"></i> Vence dia ${card.dueDate}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function openAccountForm() {
    editingAccountId = null; // Reset editing state
    const modal = document.getElementById('modal-account');
    modal.querySelector('h3').textContent = 'Nova Conta Bancária';
    modal.querySelector('.modal-body').innerHTML = `
      <div class="form-group">
        <label class="form-label">Nome da Conta / Cofrinho</label>
        <input type="text" class="form-input" id="acc-form-name" placeholder="Ex: Conta Corrente Nubank ou Cofrinho Reserva">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Banco</label>
          <input type="text" class="form-input" id="acc-form-bank" placeholder="Ex: Nubank">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="acc-form-type" onchange="Accounts.toggleCdiField()">
            <option value="checking">Conta Corrente</option>
            <option value="savings">Poupança</option>
            <option value="cofrinho">Cofrinho</option>
            <option value="business">Conta PJ</option>
            <option value="international">Conta Internacional</option>
          </select>
        </div>
      </div>
      <div class="form-group" id="cdi-rate-group" style="display: none;">
        <label class="form-label">Taxa do CDI (%)</label>
        <input type="number" class="form-input" id="acc-form-cdi" placeholder="100" value="100" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Saldo Atual (R$)</label>
        <input type="number" class="form-input" id="acc-form-balance" placeholder="0,00" step="0.01">
      </div>
    `;
    App.openModal('modal-account');
  }

  function toggleCdiField() {
    const typeSelect = document.getElementById('acc-form-type');
    const cdiGroup = document.getElementById('cdi-rate-group');
    if (typeSelect && cdiGroup) {
      cdiGroup.style.display = typeSelect.value === 'cofrinho' ? 'block' : 'none';
    }
  }

  async function saveAccount() {
    const name = document.getElementById('acc-form-name').value.trim();
    const bank = document.getElementById('acc-form-bank').value.trim();
    const type = document.getElementById('acc-form-type').value;
    const balance = parseFloat(document.getElementById('acc-form-balance').value) || 0;
    const cdiRate = type === 'cofrinho' ? (parseFloat(document.getElementById('acc-form-cdi').value) || 100) : null;

    if (!name || !bank) {
      App.toast('warning', 'Campos obrigatórios', 'Preencha nome e banco');
      return;
    }

    const colors = ['#7c5cfc', '#00d4aa', '#ff6b9d', '#0095ff', '#ffaa00', '#a855f7'];
    const icons = { checking: 'fa-building-columns', savings: 'fa-piggy-bank', cofrinho: 'fa-piggy-bank', business: 'fa-briefcase', international: 'fa-globe' };

    if (editingAccountId) {
      const existing = await FinanDB.getById('accounts', editingAccountId);
      if (existing) {
        existing.name = name;
        existing.bank = bank;
        existing.type = type;
        existing.balance = balance;
        existing.cdiRate = cdiRate;
        existing.icon = icons[type] || 'fa-building-columns';
        await FinanDB.update('accounts', existing);
        App.toast('success', 'Conta atualizada', name);
      }
    } else {
      await FinanDB.add('accounts', {
        name, bank, type, balance, cdiRate,
        color: colors[Math.floor(Math.random() * colors.length)],
        icon: icons[type] || 'fa-building-columns'
      });
      App.toast('success', 'Conta adicionada', name);
    }

    editingAccountId = null;
    App.closeModal('modal-account');
    render();
  }

  function openCardForm() {
    const modal = document.getElementById('modal-card');
    modal.querySelector('h3').textContent = 'Novo Cartão de Crédito';
    modal.querySelector('.modal-body').innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome do Cartão</label>
          <input type="text" class="form-input" id="card-form-name" placeholder="Ex: Nubank Ultravioleta">
        </div>
        <div class="form-group">
          <label class="form-label">Banco</label>
          <input type="text" class="form-input" id="card-form-bank" placeholder="Ex: Nubank">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Limite (R$)</label>
          <input type="number" class="form-input" id="card-form-limit" placeholder="0,00" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Últimos 4 dígitos</label>
          <input type="text" class="form-input" id="card-form-digits" placeholder="1234" maxlength="4">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Dia de Fechamento</label>
          <input type="number" class="form-input" id="card-form-closing" placeholder="15" min="1" max="31">
        </div>
        <div class="form-group">
          <label class="form-label">Dia de Vencimento</label>
          <input type="number" class="form-input" id="card-form-due" placeholder="22" min="1" max="31">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Cor de Fundo do Cartão</label>
        <input type="color" class="form-input" id="card-form-color" value="#7c5cfc" style="padding:0;width:100%;height:42px;cursor:pointer;border:none;background:none">
      </div>
    `;
    App.openModal('modal-card');
  }

  async function saveCard() {
    const name = document.getElementById('card-form-name').value.trim();
    const bank = document.getElementById('card-form-bank').value.trim();
    const limit = parseFloat(document.getElementById('card-form-limit').value) || 0;
    const lastDigits = document.getElementById('card-form-digits').value.trim();
    const closing = parseInt(document.getElementById('card-form-closing').value) || 15;
    const dueDate = parseInt(document.getElementById('card-form-due').value) || 22;
    const color = document.getElementById('card-form-color').value;

    if (!name || !bank || !limit) {
      App.toast('warning', 'Campos obrigatórios', 'Preencha nome, banco e limite');
      return;
    }

    await FinanDB.add('cards', {
      name, bank, limit, used: 0, lastDigits: lastDigits || '0000',
      closing, dueDate,
      color: color || '#7c5cfc'
    });

    App.closeModal('modal-card');
    App.toast('success', 'Cartão adicionado', name);
    render();
  }

  async function editAccount(id) {
    const acc = await FinanDB.getById('accounts', id);
    if (!acc) return;
    editingAccountId = id;
    openAccountForm();
    const modal = document.getElementById('modal-account');
    modal.querySelector('h3').textContent = 'Editar Conta Bancária';
    setTimeout(() => {
      document.getElementById('acc-form-name').value = acc.name;
      document.getElementById('acc-form-bank').value = acc.bank;
      document.getElementById('acc-form-type').value = acc.type;
      Accounts.toggleCdiField();
      if (acc.type === 'cofrinho') {
        document.getElementById('acc-form-cdi').value = acc.cdiRate || 100;
      }
      document.getElementById('acc-form-balance').value = acc.balance;
    }, 50);
  }

  async function deleteAccount(id) {
    const acc = await FinanDB.getById('accounts', id);
    if (!acc) return;
    if (confirm(`Tem certeza que deseja excluir a conta "${acc.name}"?`)) {
      await FinanDB.remove('accounts', id);
      App.toast('success', 'Conta excluída', acc.name);
      render();
    }
  }

  async function deleteCard(id) {
    const card = await FinanDB.getById('cards', id);
    if (!card) return;
    if (confirm(`Tem certeza que deseja excluir o cartão "${card.name}"?`)) {
      await FinanDB.remove('cards', id);
      App.toast('success', 'Cartão excluído', card.name);
      render();
    }
  }

  function openTransfer(fromId) {
    App.toast('info', 'Em breve', 'Transferências entre contas em desenvolvimento');
  }

  return { 
    render, 
    openAccountForm, 
    saveAccount, 
    openCardForm, 
    saveCard, 
    editAccount, 
    deleteAccount,
    deleteCard,
    openTransfer, 
    toggleCdiField 
  };
})();

