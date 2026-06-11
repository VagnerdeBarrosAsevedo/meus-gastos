/* =============================================
   FinanAI — Dashboard Module
   ============================================= */

const Dashboard = (() => {
  let cashflowChart = null;
  let categoryChart = null;

  async function render() {
    const transactions = await FinanDB.getAll('transactions');
    const investments = await FinanDB.getAll('investments');
    const accounts = await FinanDB.getAll('accounts');
    const budgets = await FinanDB.getAll('budgets');
    const cards = await FinanDB.getAll('cards');

    const accountMap = {};
    accounts.forEach(a => { accountMap[`account:${a.id}`] = a.name; });
    cards.forEach(c => { accountMap[`card:${c.id}`] = c.name; });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Current month transactions
    const monthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const cashflow = totalIncome - totalExpense;

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const totalInvested = investments.reduce((s, i) => s + (i.currentPrice * i.quantity), 0);
    const totalPatrimony = totalBalance + totalInvested;

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0;
    const investmentRate = totalIncome > 0 ? (totalInvested / totalPatrimony * 100) : 0;

    // Financial Score (0-1000)
    let score = 500;
    if (savingsRate > 30) score += 150;
    else if (savingsRate > 20) score += 100;
    else if (savingsRate > 10) score += 50;
    else if (savingsRate < 0) score -= 200;

    if (totalInvested > 0) score += 100;
    if (totalInvested > totalBalance) score += 50;
    if (cashflow > 0) score += 100;
    score = Math.max(0, Math.min(1000, score));

    const scoreColor = score >= 800 ? 'var(--color-success)' : score >= 600 ? 'var(--brand-primary)' : score >= 400 ? 'var(--color-warning)' : 'var(--color-danger)';
    const scoreLabel = score >= 800 ? 'Excelente' : score >= 600 ? 'Bom' : score >= 400 ? 'Regular' : 'Atenção';

    // Previous month for comparison
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });
    const prevIncome = prevMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome * 100) : 0;
    const expenseChange = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense * 100) : 0;

    // Render KPIs
    document.getElementById('dashboard-kpis').innerHTML = `
      <div class="kpi-card animate-fade-in-up stagger-1" style="--kpi-accent: var(--brand-primary)">
        <div class="kpi-icon primary"><i class="fa-solid fa-wallet"></i></div>
        <div class="kpi-label">Patrimônio Total</div>
        <div class="kpi-value">${App.currency(totalPatrimony)}</div>
        <span class="kpi-change positive"><i class="fa-solid fa-arrow-up"></i> Consolidado</span>
      </div>
      <div class="kpi-card animate-fade-in-up stagger-2" style="--kpi-accent: var(--color-success)">
        <div class="kpi-icon success"><i class="fa-solid fa-arrow-trend-up"></i></div>
        <div class="kpi-label">Receita Mensal</div>
        <div class="kpi-value">${App.currency(totalIncome)}</div>
        <span class="kpi-change ${incomeChange >= 0 ? 'positive' : 'negative'}">
          <i class="fa-solid fa-arrow-${incomeChange >= 0 ? 'up' : 'down'}"></i> ${Math.abs(incomeChange).toFixed(1)}%
        </span>
      </div>
      <div class="kpi-card animate-fade-in-up stagger-3" style="--kpi-accent: var(--color-danger)">
        <div class="kpi-icon danger"><i class="fa-solid fa-arrow-trend-down"></i></div>
        <div class="kpi-label">Despesa Mensal</div>
        <div class="kpi-value">${App.currency(totalExpense)}</div>
        <span class="kpi-change ${expenseChange <= 0 ? 'positive' : 'negative'}">
          <i class="fa-solid fa-arrow-${expenseChange <= 0 ? 'down' : 'up'}"></i> ${Math.abs(expenseChange).toFixed(1)}%
        </span>
      </div>
      <div class="kpi-card animate-fade-in-up stagger-4" style="--kpi-accent: ${cashflow >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
        <div class="kpi-icon ${cashflow >= 0 ? 'success' : 'danger'}"><i class="fa-solid fa-scale-balanced"></i></div>
        <div class="kpi-label">Fluxo de Caixa</div>
        <div class="kpi-value">${App.currency(cashflow)}</div>
        <span class="kpi-change ${cashflow >= 0 ? 'positive' : 'negative'}">
          <i class="fa-solid fa-${cashflow >= 0 ? 'check' : 'exclamation'}"></i> ${cashflow >= 0 ? 'Positivo' : 'Negativo'}
        </span>
      </div>
    `;

    // Score + Quick Stats
    const circumference = 2 * Math.PI * 68;
    const offset = circumference - (score / 1000) * circumference;

    document.getElementById('dashboard-score-row').innerHTML = `
      <div class="card score-card animate-fade-in-up">
        <div class="score-title">Score Financeiro</div>
        <div class="score-gauge">
          <div class="score-gauge-ring">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle class="bg" cx="80" cy="80" r="68"/>
              <circle class="fill" cx="80" cy="80" r="68"
                stroke="${scoreColor}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
              />
            </svg>
            <div class="score-gauge-value">
              <div class="score-gauge-number" style="color:${scoreColor}">${score}</div>
              <div class="score-gauge-label">de 1000</div>
            </div>
          </div>
        </div>
        <div class="score-status" style="color:${scoreColor}">${scoreLabel}</div>
        <div class="score-tips">
          <div class="score-tip"><i class="fa-solid fa-check-circle"></i> Taxa de economia: ${savingsRate.toFixed(1)}%</div>
          <div class="score-tip"><i class="fa-solid fa-check-circle"></i> Investimentos: ${investmentRate.toFixed(1)}% do patrimônio</div>
          <div class="score-tip"><i class="fa-solid fa-check-circle"></i> Fluxo de caixa ${cashflow >= 0 ? 'positivo' : 'negativo'}</div>
        </div>
      </div>

      <div class="quick-stats animate-fade-in-up stagger-2">
        <div class="quick-stat-card">
          <div class="quick-stat-header">
            <span class="quick-stat-label">Saldo em Contas</span>
            <i class="fa-solid fa-building-columns"></i>
          </div>
          <div class="quick-stat-value">${App.currency(totalBalance)}</div>
        </div>
        <div class="quick-stat-card">
          <div class="quick-stat-header">
            <span class="quick-stat-label">Valor Investido</span>
            <i class="fa-solid fa-chart-pie"></i>
          </div>
          <div class="quick-stat-value">${App.currency(totalInvested)}</div>
        </div>
        <div class="quick-stat-card">
          <div class="quick-stat-header">
            <span class="quick-stat-label">Taxa de Economia</span>
            <i class="fa-solid fa-piggy-bank"></i>
          </div>
          <div class="quick-stat-value" style="color:${savingsRate >= 20 ? 'var(--color-success)' : 'var(--color-warning)'}">${savingsRate.toFixed(1)}%</div>
          <div class="quick-stat-bar">
            <div class="progress progress-sm">
              <div class="progress-bar ${savingsRate >= 20 ? 'success' : 'warning'}" style="width:${Math.min(savingsRate, 100)}%"></div>
            </div>
          </div>
        </div>
        <div class="quick-stat-card">
          <div class="quick-stat-header">
            <span class="quick-stat-label">Taxa de Investimento</span>
            <i class="fa-solid fa-rocket"></i>
          </div>
          <div class="quick-stat-value" style="color:var(--brand-primary)">${investmentRate.toFixed(1)}%</div>
          <div class="quick-stat-bar">
            <div class="progress progress-sm">
              <div class="progress-bar" style="width:${Math.min(investmentRate, 100)}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Charts
    renderCashflowChart(transactions);
    renderCategoryChart(monthTx);

    // Bottom: Recent transactions + Budget overview
    const recentTx = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

    document.getElementById('dashboard-bottom').innerHTML = `
      <div class="card animate-fade-in-up">
        <div class="card-header">
          <div class="card-title">Transações Recentes</div>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('transactions')">Ver Todas <i class="fa-solid fa-arrow-right"></i></button>
        </div>
        <div class="recent-transactions">
          ${recentTx.map(tx => {
            const baseOrigin = accountMap[tx.account] || 'Conta Principal';
            let methodLabel = '';
            if (tx.paymentMethod === 'pix') methodLabel = ' (PIX)';
            else if (tx.paymentMethod === 'boleto') methodLabel = ' (Boleto)';
            else if (tx.paymentMethod === 'dinheiro') methodLabel = 'Dinheiro';
            else if (tx.paymentMethod === 'saldo') methodLabel = ' (Débito)';
            
            const originName = tx.paymentMethod === 'dinheiro' ? methodLabel : `${baseOrigin}${methodLabel}`;
            return `
              <div class="transaction-item">
                <div class="transaction-icon" style="background:${tx.categoryColor}15; color:${tx.categoryColor}">
                  <i class="fa-solid ${tx.categoryIcon || 'fa-receipt'}"></i>
                </div>
                <div class="transaction-info">
                  <div class="transaction-name">${tx.description}</div>
                  <div class="transaction-category">
                    ${tx.parentCategory || tx.category}
                    <span class="tag tag-secondary" style="padding: 1px 6px; font-size: 0.65rem; margin-left: 6px;">
                      ${originName}
                    </span>
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
      </div>

      <div class="card animate-fade-in-up stagger-2">
        <div class="card-header">
          <div class="card-title">Orçamento do Mês</div>
          <button class="btn btn-ghost btn-sm" onclick="App.navigate('budget')">Gerenciar <i class="fa-solid fa-arrow-right"></i></button>
        </div>
        <div>
          ${budgets.map(b => {
            const spent = monthTx
              .filter(t => t.type === 'expense' && (t.parentCategory === b.category || t.category === b.category))
              .reduce((s, t) => s + t.amount, 0);
            const pct = b.limit > 0 ? (spent / b.limit * 100) : 0;
            const status = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'success';
            return `
              <div class="budget-item">
                <div class="budget-category-icon" style="background:${b.color}15; color:${b.color}">
                  <i class="fa-solid ${b.icon}"></i>
                </div>
                <div class="budget-info">
                  <div class="budget-category-name">${b.category}</div>
                  <div class="budget-amounts">
                    <span>${App.currency(spent)}</span>
                    <span>de ${App.currency(b.limit)}</span>
                  </div>
                  <div class="budget-progress">
                    <div class="progress progress-sm">
                      <div class="progress-bar ${status}" style="width:${Math.min(pct, 100)}%"></div>
                    </div>
                  </div>
                </div>
                <div class="budget-percent" style="color:var(--color-${status})">${pct.toFixed(0)}%</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderCashflowChart(transactions) {
    const ctx = document.getElementById('cashflow-chart');
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const months = [];
    const incomeData = [];
    const expenseData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      months.push(label.charAt(0).toUpperCase() + label.slice(1));

      const m = d.getMonth();
      const y = d.getFullYear();
      const monthTx = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === m && td.getFullYear() === y;
      });

      incomeData.push(monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
      expenseData.push(monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
    }

    if (cashflowChart) cashflowChart.destroy();

    cashflowChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Receitas',
            data: incomeData,
            backgroundColor: 'rgba(0, 214, 143, 0.7)',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
          {
            label: 'Despesas',
            data: expenseData,
            backgroundColor: 'rgba(255, 61, 113, 0.7)',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: textColor,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { family: "'Inter', sans-serif", size: 12 }
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#1e2641' : '#fff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            titleFont: { family: "'Inter', sans-serif", weight: 600 },
            bodyFont: { family: "'Inter', sans-serif" },
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${App.currency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 12 } }
          },
          y: {
            grid: { color: gridColor, drawBorder: false },
            ticks: {
              color: textColor,
              font: { family: "'Inter', sans-serif", size: 11 },
              callback: (v) => App.currency(v)
            },
            border: { display: false }
          }
        }
      }
    });
  }

  function renderCategoryChart(monthTx) {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f1f5f9' : '#0f172a';

    // Group expenses by parent category
    const categoryTotals = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.parentCategory || t.category;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = ['#7c5cfc', '#00d4aa', '#ff6b9d', '#ffaa00', '#0095ff', '#ff6b35', '#a855f7', '#06b6d4'];

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 8,
          spacing: 3,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 14,
              font: { family: "'Inter', sans-serif", size: 11 }
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#1e2641' : '#fff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${App.currency(ctx.raw)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  function updateChartColors() {
    // Re-render charts when theme changes
    render();
  }

  return { render, updateChartColors };
})();
