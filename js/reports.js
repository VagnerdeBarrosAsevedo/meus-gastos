/* =============================================
   FinanAI — Reports Module
   ============================================= */

const Reports = (() => {

  async function render() {
    const transactions = await FinanDB.getAll('transactions');
    const investments = await FinanDB.getAll('investments');

    const container = document.getElementById('page-reports');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>Relatórios</h2>
          <p>Exporte e analise seus dados financeiros</p>
        </div>
      </div>

      <div class="report-options">
        <div class="card report-option animate-fade-in-up" onclick="Reports.generateCSV('monthly')">
          <i class="fa-solid fa-file-csv"></i>
          <h4>Relatório Mensal</h4>
          <p>Exportar transações do mês atual em CSV</p>
        </div>
        <div class="card report-option animate-fade-in-up stagger-1" onclick="Reports.generateCSV('all')">
          <i class="fa-solid fa-file-lines"></i>
          <h4>Todas as Transações</h4>
          <p>Exportar histórico completo em CSV</p>
        </div>
        <div class="card report-option animate-fade-in-up stagger-2" onclick="Reports.exportJSON()">
          <i class="fa-solid fa-database"></i>
          <h4>Backup Completo</h4>
          <p>Exportar todos os dados em JSON</p>
        </div>
      </div>

      <!-- Import Section -->
      <div class="card animate-fade-in-up" style="margin-bottom:var(--space-8)">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-upload" style="margin-right:8px"></i>Importar Dados</div>
        </div>
        <p style="margin-bottom:var(--space-4)">Restaure um backup JSON anteriormente exportado</p>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="Reports.importJSON(event)">
        <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">
          <i class="fa-solid fa-upload"></i> Selecionar Arquivo JSON
        </button>
      </div>

      <!-- Danger Zone Section -->
      <div class="card animate-fade-in-up" style="margin-bottom:var(--space-8); border-color: rgba(255, 61, 113, 0.3)">
        <div class="card-header">
          <div class="card-title" style="color:var(--color-danger)">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right:8px"></i>Zona de Perigo
          </div>
        </div>
        <p style="margin-bottom:var(--space-4)">Apague permanentemente todos os seus dados cadastrados nesta aplicação (transações, contas, investimentos, cartões e configurações) para começar do zero.</p>
        <button class="btn btn-danger" onclick="Reports.clearAllData()">
          <i class="fa-solid fa-trash-can"></i> Limpar Todos os Dados e Começar do Zero
        </button>
      </div>

      <!-- Analysis Section -->
      <div class="card animate-fade-in-up">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-chart-line" style="margin-right:8px"></i>Análise Preditiva</div>
        </div>
        <div id="predictive-analysis"></div>
      </div>
    `;

    renderPredictiveAnalysis(transactions);
  }

  function renderPredictiveAnalysis(transactions) {
    const now = new Date();
    const monthlyExpenses = {};

    transactions.filter(t => t.type === 'expense').forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyExpenses[key] = (monthlyExpenses[key] || 0) + t.amount;
    });

    const sorted = Object.entries(monthlyExpenses).sort((a, b) => a[0].localeCompare(b[0]));
    const values = sorted.map(s => s[1]);

    if (values.length < 2) {
      document.getElementById('predictive-analysis').innerHTML = `
        <p style="color:var(--text-tertiary)">São necessários pelo menos 2 meses de dados para gerar previsões.</p>
      `;
      return;
    }

    // Simple moving average prediction
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const lastTwo = values.slice(-2);
    const trend = lastTwo[1] - lastTwo[0];
    const prediction = Math.max(0, lastTwo[1] + trend * 0.5);

    const min = Math.min(...values);
    const max = Math.max(...values);

    document.getElementById('predictive-analysis').innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:var(--space-5);margin-top:var(--space-4)">
        <div class="quick-stat-card">
          <div class="quick-stat-label">Média Mensal de Gastos</div>
          <div class="quick-stat-value">${App.currency(avg)}</div>
        </div>
        <div class="quick-stat-card">
          <div class="quick-stat-label">Previsão Próximo Mês</div>
          <div class="quick-stat-value" style="color:var(--brand-primary)">${App.currency(prediction)}</div>
        </div>
        <div class="quick-stat-card">
          <div class="quick-stat-label">Menor Gasto Mensal</div>
          <div class="quick-stat-value" style="color:var(--color-success)">${App.currency(min)}</div>
        </div>
        <div class="quick-stat-card">
          <div class="quick-stat-label">Maior Gasto Mensal</div>
          <div class="quick-stat-value" style="color:var(--color-danger)">${App.currency(max)}</div>
        </div>
      </div>

      <div style="margin-top:var(--space-6);padding:var(--space-4);background:var(--bg-tertiary);border-radius:var(--radius-md)">
        <p style="font-size:var(--font-size-sm);color:var(--text-secondary)">
          <i class="fa-solid fa-lightbulb" style="color:var(--color-warning);margin-right:8px"></i>
          <strong>Tendência:</strong>
          ${trend > 0
            ? `Seus gastos estão <span style="color:var(--color-danger)">aumentando</span> (~${App.currency(Math.abs(trend))}/mês). Revise suas despesas variáveis.`
            : trend < 0
            ? `Seus gastos estão <span style="color:var(--color-success)">diminuindo</span> (~${App.currency(Math.abs(trend))}/mês). Excelente trabalho!`
            : 'Seus gastos estão estáveis. Continue monitorando.'
          }
        </p>
      </div>
    `;
  }

  async function generateCSV(scope) {
    const transactions = await FinanDB.getAll('transactions');
    const now = new Date();
    let filtered = transactions;

    if (scope === 'monthly') {
      filtered = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }

    filtered.sort((a, b) => a.date.localeCompare(b.date));

    const header = 'Data,Tipo,Descrição,Categoria,Categoria Pai,Valor,Recorrente\n';
    const rows = filtered.map(t =>
      `${t.date},${t.type === 'income' ? 'Receita' : 'Despesa'},"${t.description}","${t.category}","${t.parentCategory || ''}",${t.amount},${t.recurrent ? 'Sim' : 'Não'}`
    ).join('\n');

    const csv = '\ufeff' + header + rows; // BOM for UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanai_${scope}_${now.toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    App.toast('success', 'CSV Exportado!', `${filtered.length} transações exportadas`);
  }

  async function exportJSON() {
    const data = await FinanDB.exportAll();
    FinanDB.downloadJSON(data, `finanai_backup_${new Date().toISOString().split('T')[0]}.json`);
    App.toast('success', 'Backup Exportado!', 'Todos os dados foram salvos em JSON');
  }

  async function clearAllData() {
    if (!confirm('🚨 ATENÇÃO: Isso apagará permanentemente todos os seus registros locais (transações, contas, cartões, metas, etc.). Esta ação não pode ser desfeita!\n\nDeseja prosseguir?')) {
      return;
    }
    
    if (!confirm('Tem certeza absoluta de que deseja limpar tudo e começar com a aplicação vazia?')) {
      return;
    }

    try {
      const stores = ['transactions', 'accounts', 'cards', 'investments', 'goals', 'budgets', 'achievements', 'settings'];
      for (const store of stores) {
        await FinanDB.clearStore(store);
      }
      
      // Re-initialize achievements as locked so they exist but are not unlocked
      await FinanDB.initAchievements();
      
      // Set local storage flag to prevent automatic seeding on load
      localStorage.setItem('finanai-db-cleared', 'true');
      
      // Refresh achievements badge
      if (typeof App !== 'undefined') {
        await App.updateAchievementsBadge();
      }
      
      App.toast('success', 'Dados Removidos!', 'Todos os dados foram excluídos com sucesso. Iniciando do zero.');
      App.navigate('dashboard');
    } catch (e) {
      App.toast('error', 'Erro ao limpar dados', e.message);
    }
  }

  async function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data._version) {
        App.toast('error', 'Arquivo inválido', 'Este arquivo não é um backup do FinanAI');
        return;
      }

      if (!confirm('Isso substituirá todos os seus dados atuais. Deseja continuar?')) return;

      await FinanDB.importAll(data);
      
      // Remove cleared flag since we imported a backup
      localStorage.removeItem('finanai-db-cleared');
      
      App.toast('success', 'Dados Importados!', `Backup de ${new Date(data._exportDate).toLocaleDateString('pt-BR')} restaurado`);

      // Refresh
      App.navigate('dashboard');
    } catch (e) {
      App.toast('error', 'Erro na importação', e.message);
    }
  }

  return { render, generateCSV, exportJSON, importJSON, clearAllData };
})();
