/* =============================================
   FinanAI — Investments Module
   ============================================= */

const Investments = (() => {
  let allocationChart = null;
  let performanceChart = null;

  async function render() {
    const investments = await FinanDB.getAll('investments');

    const totalInvested = investments.reduce((s, i) => s + (i.avgPrice * i.quantity), 0);
    const totalCurrent = investments.reduce((s, i) => s + (i.currentPrice * i.quantity), 0);
    const totalProfit = totalCurrent - totalInvested;
    const profitPct = totalInvested > 0 ? (totalProfit / totalInvested * 100) : 0;

    // Group by category
    const byCategory = {};
    investments.forEach(i => {
      if (!byCategory[i.category]) byCategory[i.category] = { total: 0, cost: 0, items: [] };
      byCategory[i.category].total += i.currentPrice * i.quantity;
      byCategory[i.category].cost += i.avgPrice * i.quantity;
      byCategory[i.category].items.push(i);
    });

    const container = document.getElementById('page-investments');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>Investimentos</h2>
          <p>Gerencie sua carteira de investimentos</p>
        </div>
        <div class="flex gap-3">
          <button class="btn btn-primary" onclick="Investments.openForm()">
            <i class="fa-solid fa-plus"></i> Novo Ativo
          </button>
          <button class="btn btn-secondary" onclick="Investments.openSimulator()">
            <i class="fa-solid fa-calculator"></i> Simulador
          </button>
          <button class="btn btn-secondary" onclick="Investments.openFIRE()">
            <i class="fa-solid fa-fire"></i> FIRE
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="investment-kpis">
        <div class="kpi-card animate-fade-in-up" style="--kpi-accent: var(--brand-primary)">
          <div class="kpi-icon primary"><i class="fa-solid fa-chart-pie"></i></div>
          <div class="kpi-label">Patrimônio Investido</div>
          <div class="kpi-value">${App.currency(totalCurrent)}</div>
        </div>
        <div class="kpi-card animate-fade-in-up stagger-1" style="--kpi-accent: var(--color-success)">
          <div class="kpi-icon ${totalProfit >= 0 ? 'success' : 'danger'}"><i class="fa-solid fa-${totalProfit >= 0 ? 'arrow-trend-up' : 'arrow-trend-down'}"></i></div>
          <div class="kpi-label">Lucro / Prejuízo</div>
          <div class="kpi-value" style="color:${totalProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${App.currency(totalProfit)}</div>
          <span class="kpi-change ${totalProfit >= 0 ? 'positive' : 'negative'}">
            <i class="fa-solid fa-arrow-${totalProfit >= 0 ? 'up' : 'down'}"></i> ${Math.abs(profitPct).toFixed(2)}%
          </span>
        </div>
        <div class="kpi-card animate-fade-in-up stagger-2" style="--kpi-accent: var(--brand-secondary)">
          <div class="kpi-icon info"><i class="fa-solid fa-coins"></i></div>
          <div class="kpi-label">Total Investido (Custo)</div>
          <div class="kpi-value">${App.currency(totalInvested)}</div>
        </div>
        <div class="kpi-card animate-fade-in-up stagger-3" style="--kpi-accent: var(--color-warning)">
          <div class="kpi-icon warning"><i class="fa-solid fa-layer-group"></i></div>
          <div class="kpi-label">Ativos na Carteira</div>
          <div class="kpi-value">${investments.length}</div>
        </div>
      </div>

      <!-- Allocation Chart + Legend -->
      <div class="allocation-grid">
        <div class="card animate-fade-in-up">
          <div class="card-header">
            <div class="card-title">Alocação da Carteira</div>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-6)">
            <div class="chart-container" style="width:220px;height:220px;flex-shrink:0">
              <canvas id="allocation-chart"></canvas>
            </div>
            <div class="allocation-legend" id="allocation-legend"></div>
          </div>
        </div>

        <div class="card animate-fade-in-up stagger-1">
          <div class="card-header">
            <div class="card-title">Performance vs Benchmarks</div>
          </div>
          <div class="chart-container" style="height:220px">
            <canvas id="performance-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Assets List -->
      <div class="card animate-fade-in-up" style="padding:0">
        <div class="card-header" style="padding:var(--space-5)">
          <div class="card-title">Meus Ativos</div>
          <div class="tabs" id="asset-type-tabs">
            <button class="tab active" onclick="Investments.filterAssets('all', this)">Todos</button>
            <button class="tab" onclick="Investments.filterAssets('stock', this)">Ações</button>
            <button class="tab" onclick="Investments.filterAssets('fii', this)">FIIs</button>
            <button class="tab" onclick="Investments.filterAssets('etf', this)">ETFs</button>
            <button class="tab" onclick="Investments.filterAssets('fixed', this)">Renda Fixa</button>
            <button class="tab" onclick="Investments.filterAssets('crypto', this)">Cripto</button>
          </div>
        </div>

        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ativo</th>
                <th style="text-align:right">Qtd</th>
                <th style="text-align:right">P.M.</th>
                <th style="text-align:right">Preço Atual</th>
                <th style="text-align:right">Total</th>
                <th style="text-align:right">Lucro/Prejuízo</th>
                <th style="text-align:right">Rentabilidade</th>
              </tr>
            </thead>
            <tbody id="assets-tbody">
              ${renderAssetsRows(investments)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderAllocationChart(byCategory, totalCurrent);
    renderPerformanceChart();
  }

  function renderAssetsRows(investments, typeFilter = 'all') {
    const filtered = typeFilter === 'all' ? investments : investments.filter(i => i.type === typeFilter);

    return filtered.map(inv => {
      const total = inv.currentPrice * inv.quantity;
      const cost = inv.avgPrice * inv.quantity;
      const profit = total - cost;
      const pct = cost > 0 ? ((profit / cost) * 100) : 0;

      return `
        <tr class="asset-row-data" data-type="${inv.type}">
          <td>
            <div style="display:flex;align-items:center;gap:var(--space-3)">
              <div class="asset-icon ${inv.icon}">
                ${inv.ticker.substring(0, 2)}
              </div>
              <div>
                <div class="asset-ticker">${inv.ticker}</div>
                <div class="asset-full-name">${inv.name}</div>
              </div>
            </div>
          </td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">${inv.quantity}</td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">${App.currency(inv.avgPrice)}</td>
          <td style="text-align:right;font-variant-numeric:tabular-nums">${App.currency(inv.currentPrice)}</td>
          <td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${App.currency(total)}</td>
          <td style="text-align:right;font-weight:600;color:${profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};font-variant-numeric:tabular-nums">
            ${profit >= 0 ? '+' : ''}${App.currency(profit)}
          </td>
          <td style="text-align:right">
            <span class="tag ${pct >= 0 ? 'tag-success' : 'tag-danger'}">
              ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function filterAssets(type, btn) {
    document.querySelectorAll('#asset-type-tabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    const investments = await FinanDB.getAll('investments');
    document.getElementById('assets-tbody').innerHTML = renderAssetsRows(investments, type);
  }

  function renderAllocationChart(byCategory, total) {
    const ctx = document.getElementById('allocation-chart');
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const labels = Object.keys(byCategory);
    const data = labels.map(l => byCategory[l].total);
    const colors = ['#7c5cfc', '#00d4aa', '#ff6b9d', '#ffaa00', '#0095ff', '#ff6b35', '#a855f7'];

    // Legend
    const legendEl = document.getElementById('allocation-legend');
    if (legendEl) {
      legendEl.innerHTML = labels.map((label, i) => {
        const pct = total > 0 ? (data[i] / total * 100) : 0;
        return `
          <div class="legend-item">
            <div class="legend-dot" style="background:${colors[i]}"></div>
            <span class="legend-label">${label}</span>
            <span class="legend-value">${App.currency(data[i])}</span>
            <span class="legend-percent">${pct.toFixed(1)}%</span>
          </div>
        `;
      }).join('');
    }

    if (allocationChart) allocationChart.destroy();

    allocationChart = new Chart(ctx, {
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
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? '#1e2641' : '#fff',
            titleColor: isDark ? '#f1f5f9' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            cornerRadius: 10,
            padding: 12,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${App.currency(ctx.raw)} (${(ctx.raw / total * 100).toFixed(1)}%)`
            }
          }
        }
      }
    });
  }

  function renderPerformanceChart() {
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];

    // Simulated performance data
    const portfolioData = [100, 102.5, 101.8, 105.2, 107.1, 108.9];
    const cdiData = [100, 100.9, 101.8, 102.7, 103.6, 104.5];
    const ibovData = [100, 101.2, 99.5, 103.8, 105.2, 106.7];

    if (performanceChart) performanceChart.destroy();

    performanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Minha Carteira',
            data: portfolioData,
            borderColor: '#7c5cfc',
            backgroundColor: 'rgba(124, 92, 252, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#7c5cfc',
          },
          {
            label: 'CDI',
            data: cdiData,
            borderColor: '#00d4aa',
            borderDash: [5, 5],
            tension: 0.4,
            borderWidth: 1.5,
            pointRadius: 0,
          },
          {
            label: 'IBOVESPA',
            data: ibovData,
            borderColor: '#ffaa00',
            borderDash: [5, 5],
            tension: 0.4,
            borderWidth: 1.5,
            pointRadius: 0,
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
              pointStyle: 'line',
              padding: 12,
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
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(2)}%`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
          y: {
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: textColor, font: { size: 11 }, callback: (v) => v + '%' },
            border: { display: false }
          }
        }
      }
    });
  }

  function openForm() {
    const modal = document.getElementById('modal-investment');
    modal.querySelector('h3').innerHTML = '<i class="fa-solid fa-chart-line" style="color:var(--brand-primary)"></i> Novo Investimento';
    modal.querySelector('.modal-body').innerHTML = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Ticker / Nome</label>
          <input type="text" class="form-input" id="inv-form-ticker" placeholder="Ex: PETR4, BTC">
        </div>
        <div class="form-group">
          <label class="form-label">Nome Completo</label>
          <input type="text" class="form-input" id="inv-form-name" placeholder="Ex: Petrobras PN">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo</label>
          <select class="form-select" id="inv-form-type">
            <option value="stock">Ação</option>
            <option value="fii">FII</option>
            <option value="etf">ETF</option>
            <option value="fixed">Renda Fixa</option>
            <option value="crypto">Criptoativo</option>
            <option value="intl">Internacional</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Categoria</label>
          <select class="form-select" id="inv-form-category">
            <option value="Ações">Ações</option>
            <option value="FIIs">FIIs</option>
            <option value="ETFs">ETFs</option>
            <option value="Renda Fixa">Renda Fixa</option>
            <option value="Cripto">Cripto</option>
            <option value="Internacional">Internacional</option>
          </select>
        </div>
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Quantidade</label>
          <input type="number" class="form-input" id="inv-form-qty" placeholder="0" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Preço Médio (R$)</label>
          <input type="number" class="form-input" id="inv-form-avg" placeholder="0,00" step="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Preço Atual (R$)</label>
          <input type="number" class="form-input" id="inv-form-current" placeholder="0,00" step="0.01">
        </div>
      </div>
    `;
    App.openModal('modal-investment');
  }

  async function saveInvestment() {
    const ticker = document.getElementById('inv-form-ticker').value.trim().toUpperCase();
    const name = document.getElementById('inv-form-name').value.trim();
    const type = document.getElementById('inv-form-type').value;
    const category = document.getElementById('inv-form-category').value;
    const quantity = parseFloat(document.getElementById('inv-form-qty').value) || 0;
    const avgPrice = parseFloat(document.getElementById('inv-form-avg').value) || 0;
    const currentPrice = parseFloat(document.getElementById('inv-form-current').value) || avgPrice;

    if (!ticker || !quantity || !avgPrice) {
      App.toast('warning', 'Campos obrigatórios', 'Preencha ticker, quantidade e preço médio');
      return;
    }

    await FinanDB.add('investments', {
      ticker, name: name || ticker, type, category,
      quantity, avgPrice, currentPrice,
      icon: type
    });

    App.closeModal('modal-investment');
    App.toast('success', 'Investimento adicionado', `${ticker} - ${quantity} unidades`);
    render();
  }

  // ── Simulator ──
  function openSimulator() {
    const modal = document.getElementById('modal-simulator');
    modal.querySelector('.modal-body').innerHTML = `
      <div class="simulator-form">
        <div class="form-group">
          <label class="form-label">Aporte Inicial (R$)</label>
          <input type="number" class="form-input" id="sim-initial" value="10000" step="100">
        </div>
        <div class="form-group">
          <label class="form-label">Aporte Mensal (R$)</label>
          <input type="number" class="form-input" id="sim-monthly" value="1000" step="100">
        </div>
        <div class="form-group">
          <label class="form-label">Taxa de Juros Anual (%)</label>
          <input type="number" class="form-input" id="sim-rate" value="12" step="0.1">
        </div>
        <div class="form-group">
          <label class="form-label">Período (anos)</label>
          <input type="number" class="form-input" id="sim-years" value="20" min="1" max="50">
        </div>
      </div>
      <button class="btn btn-primary btn-lg w-full" onclick="Investments.runSimulation()">
        <i class="fa-solid fa-calculator"></i> Calcular
      </button>
      <div id="sim-results" style="margin-top:var(--space-6)"></div>
    `;
    App.openModal('modal-simulator');
  }

  function runSimulation() {
    const initial = parseFloat(document.getElementById('sim-initial').value) || 0;
    const monthly = parseFloat(document.getElementById('sim-monthly').value) || 0;
    const annualRate = parseFloat(document.getElementById('sim-rate').value) || 0;
    const years = parseInt(document.getElementById('sim-years').value) || 1;

    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    const totalMonths = years * 12;
    let balance = initial;
    let totalContributed = initial;

    for (let m = 0; m < totalMonths; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
      totalContributed += monthly;
    }

    const totalInterest = balance - totalContributed;

    document.getElementById('sim-results').innerHTML = `
      <div class="simulator-result animate-scale-in">
        <div class="simulator-result-label">Patrimônio em ${years} anos</div>
        <div class="simulator-result-value">${App.currency(balance)}</div>
        <div class="simulator-result-breakdown">
          <div class="breakdown-item">
            <div class="breakdown-item-value">${App.currency(totalContributed)}</div>
            <div class="breakdown-item-label">Total Investido</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-item-value" style="color:var(--color-success)">${App.currency(totalInterest)}</div>
            <div class="breakdown-item-label">Juros Ganhos</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-item-value" style="color:var(--brand-primary)">${((totalInterest / totalContributed) * 100).toFixed(1)}%</div>
            <div class="breakdown-item-label">Retorno Total</div>
          </div>
        </div>
      </div>
    `;
  }

  // ── FIRE Calculator ──
  function openFIRE() {
    const modal = document.getElementById('modal-fire');
    modal.querySelector('.modal-body').innerHTML = `
      <div class="simulator-form">
        <div class="form-group">
          <label class="form-label">Despesa Mensal Desejada (R$)</label>
          <input type="number" class="form-input" id="fire-expense" value="8000" step="100">
        </div>
        <div class="form-group">
          <label class="form-label">Patrimônio Atual (R$)</label>
          <input type="number" class="form-input" id="fire-current" value="50000" step="1000">
        </div>
        <div class="form-group">
          <label class="form-label">Aporte Mensal (R$)</label>
          <input type="number" class="form-input" id="fire-monthly" value="3000" step="100">
        </div>
        <div class="form-group">
          <label class="form-label">Retorno Anual Esperado (%)</label>
          <input type="number" class="form-input" id="fire-return" value="10" step="0.5">
        </div>
      </div>
      <button class="btn btn-primary btn-lg w-full" onclick="Investments.calcFIRE()">
        <i class="fa-solid fa-fire"></i> Calcular Independência Financeira
      </button>
      <div id="fire-results" style="margin-top:var(--space-6)"></div>
    `;
    App.openModal('modal-fire');
  }

  function calcFIRE() {
    const monthlyExpense = parseFloat(document.getElementById('fire-expense').value) || 0;
    const currentPatrimony = parseFloat(document.getElementById('fire-current').value) || 0;
    const monthlyContrib = parseFloat(document.getElementById('fire-monthly').value) || 0;
    const annualReturn = parseFloat(document.getElementById('fire-return').value) || 0;

    // FIRE target = annual expenses / safe withdrawal rate (4%)
    const annualExpense = monthlyExpense * 12;
    const fireTarget = annualExpense / 0.04;

    // Calculate months to reach FIRE
    const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
    let balance = currentPatrimony;
    let months = 0;
    const maxMonths = 600; // 50 years max

    while (balance < fireTarget && months < maxMonths) {
      balance = balance * (1 + monthlyRate) + monthlyContrib;
      months++;
    }

    const yearsToFIRE = (months / 12).toFixed(1);
    const fireDate = new Date();
    fireDate.setMonth(fireDate.getMonth() + months);
    const passiveIncome = fireTarget * 0.04 / 12;

    document.getElementById('fire-results').innerHTML = `
      <div class="simulator-result animate-scale-in">
        <div class="simulator-result-label">Patrimônio Alvo (Regra dos 4%)</div>
        <div class="simulator-result-value">${App.currency(fireTarget)}</div>
      </div>

      <div class="fire-timeline animate-fade-in-up">
        <div class="fire-milestone">
          <div class="fire-milestone-icon" style="background:var(--color-info-bg);color:var(--color-info)">
            <i class="fa-solid fa-location-dot"></i>
          </div>
          <div class="fire-milestone-label">Hoje</div>
          <div class="fire-milestone-value">${App.currency(currentPatrimony)}</div>
        </div>
        <div class="fire-connector"></div>
        <div class="fire-milestone">
          <div class="fire-milestone-icon" style="background:var(--color-warning-bg);color:var(--color-warning)">
            <i class="fa-solid fa-chart-line"></i>
          </div>
          <div class="fire-milestone-label">${yearsToFIRE} anos</div>
          <div class="fire-milestone-value">Acumulando...</div>
        </div>
        <div class="fire-connector"></div>
        <div class="fire-milestone">
          <div class="fire-milestone-icon" style="background:var(--color-success-bg);color:var(--color-success)">
            <i class="fa-solid fa-flag-checkered"></i>
          </div>
          <div class="fire-milestone-label">FIRE! 🔥</div>
          <div class="fire-milestone-value">${fireDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</div>
        </div>
      </div>

      <div class="simulator-result-breakdown" style="margin-top:var(--space-6)">
        <div class="breakdown-item">
          <div class="breakdown-item-value">${App.currency(passiveIncome)}</div>
          <div class="breakdown-item-label">Renda Passiva / mês</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-item-value">${yearsToFIRE} anos</div>
          <div class="breakdown-item-label">Tempo até FIRE</div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-item-value">${App.currency(monthlyContrib)}</div>
          <div class="breakdown-item-label">Aporte Mensal</div>
        </div>
      </div>
    `;
  }

  function updateChartColors() {
    render();
  }

  return { render, openForm, saveInvestment, filterAssets, openSimulator, runSimulation, openFIRE, calcFIRE, updateChartColors };
})();
