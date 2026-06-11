/* =============================================
   FinanAI — Budget Module
   ============================================= */

const Budget = (() => {

  async function render() {
    const budgets = await FinanDB.getAll('budgets');
    const transactions = await FinanDB.getAll('transactions');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.type === 'expense';
    });

    const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = monthTx.reduce((s, t) => s + t.amount, 0);
    const overBudget = budgets.filter(b => {
      const spent = monthTx.filter(t => t.parentCategory === b.category || t.category === b.category).reduce((s, t) => s + t.amount, 0);
      return spent > b.limit;
    }).length;

    const container = document.getElementById('page-budget');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>Orçamento</h2>
          <p>Controle seus limites de gastos por categoria</p>
        </div>
        <button class="btn btn-primary" onclick="Budget.openForm()">
          <i class="fa-solid fa-plus"></i> Novo Limite
        </button>
      </div>

      <div class="transactions-summary">
        <div class="kpi-card" style="--kpi-accent: var(--brand-primary)">
          <div class="kpi-icon primary"><i class="fa-solid fa-wallet"></i></div>
          <div class="kpi-label">Orçamento Total</div>
          <div class="kpi-value">${App.currency(totalBudget)}</div>
        </div>
        <div class="kpi-card" style="--kpi-accent: ${totalSpent <= totalBudget ? 'var(--color-success)' : 'var(--color-danger)'}">
          <div class="kpi-icon ${totalSpent <= totalBudget ? 'success' : 'danger'}"><i class="fa-solid fa-receipt"></i></div>
          <div class="kpi-label">Gasto no Mês</div>
          <div class="kpi-value">${App.currency(totalSpent)}</div>
          <span class="kpi-change ${totalSpent <= totalBudget ? 'positive' : 'negative'}">
            ${((totalSpent / totalBudget) * 100).toFixed(0)}% do orçamento
          </span>
        </div>
        <div class="kpi-card" style="--kpi-accent: ${overBudget === 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
          <div class="kpi-icon ${overBudget === 0 ? 'success' : 'danger'}"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div class="kpi-label">Categorias Excedidas</div>
          <div class="kpi-value">${overBudget}</div>
        </div>
      </div>

      <div class="budget-grid">
        ${budgets.map(b => {
          const spent = monthTx.filter(t => t.parentCategory === b.category || t.category === b.category).reduce((s, t) => s + t.amount, 0);
          const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
          const remaining = b.limit - spent;
          const status = pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : '';
          const barStatus = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success';
          const statusLabel = pct >= 100 ? '⚠️ Excedido!' : pct >= 80 ? '⚡ Atenção' : '✅ No limite';

          return `
            <div class="budget-card card ${status} animate-fade-in-up">
              <div class="budget-card-header">
                <div class="budget-card-icon" style="background:${b.color}18; color:${b.color}">
                  <i class="fa-solid ${b.icon}"></i>
                </div>
                <div>
                  <div class="budget-card-title">${b.category}</div>
                </div>
              </div>
              <div class="budget-card-amounts">
                <span class="budget-card-spent" style="color:${pct >= 100 ? 'var(--color-danger)' : 'var(--text-primary)'}">
                  ${App.currency(spent)}
                </span>
                <span class="budget-card-limit">de ${App.currency(b.limit)}</span>
              </div>
              <div class="budget-card-progress">
                <div class="progress">
                  <div class="progress-bar ${barStatus}" style="width:${Math.min(pct, 100)}%"></div>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span class="budget-card-status" style="color:${pct >= 100 ? 'var(--color-danger)' : pct >= 80 ? 'var(--color-warning)' : 'var(--color-success)'}">
                  ${statusLabel}
                </span>
                <span style="font-size:var(--font-size-xs);color:var(--text-tertiary)">
                  ${remaining >= 0 ? `Restam ${App.currency(remaining)}` : `Excedeu ${App.currency(-remaining)}`}
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function openForm() {
    const modal = document.getElementById('modal-budget');
    modal.querySelector('h3').innerHTML = '<i class="fa-solid fa-chart-bar" style="color:var(--brand-primary)"></i> Novo Limite de Orçamento';
    modal.querySelector('.modal-body').innerHTML = `
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-select" id="budget-form-cat">
          <option value="Alimentação">Alimentação</option>
          <option value="Transporte">Transporte</option>
          <option value="Moradia">Moradia</option>
          <option value="Saúde">Saúde</option>
          <option value="Educação">Educação</option>
          <option value="Lazer">Lazer</option>
          <option value="Outros">Outros</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Limite Mensal (R$)</label>
        <input type="number" class="form-input" id="budget-form-limit" placeholder="0,00" step="100">
      </div>
    `;
    App.openModal('modal-budget');
  }

  async function saveBudget() {
    const category = document.getElementById('budget-form-cat').value;
    const limit = parseFloat(document.getElementById('budget-form-limit').value) || 0;

    if (!limit) {
      App.toast('warning', 'Campo obrigatório', 'Defina o limite mensal');
      return;
    }

    const icons = {
      'Alimentação': 'fa-utensils', 'Transporte': 'fa-car', 'Moradia': 'fa-house',
      'Saúde': 'fa-heart-pulse', 'Educação': 'fa-graduation-cap', 'Lazer': 'fa-gamepad', 'Outros': 'fa-ellipsis'
    };
    const colors = {
      'Alimentação': '#ffaa00', 'Transporte': '#06b6d4', 'Moradia': '#ff6b9d',
      'Saúde': '#ff3d71', 'Educação': '#0095ff', 'Lazer': '#a855f7', 'Outros': '#64748b'
    };

    await FinanDB.add('budgets', {
      category, limit,
      icon: icons[category] || 'fa-receipt',
      color: colors[category] || '#64748b'
    });

    App.closeModal('modal-budget');
    App.toast('success', 'Limite definido', `${category}: ${App.currency(limit)}/mês`);
    render();
  }

  return { render, openForm, saveBudget };
})();
