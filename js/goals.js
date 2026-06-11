/* =============================================
   FinanAI — Goals & Achievements Module
   ============================================= */

const Goals = (() => {

  async function render() {
    const goals = await FinanDB.getAll('goals');

    const container = document.getElementById('page-goals');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>Metas Financeiras</h2>
          <p>Acompanhe o progresso das suas metas</p>
        </div>
        <button class="btn btn-primary" onclick="Goals.openForm()">
          <i class="fa-solid fa-plus"></i> Nova Meta
        </button>
      </div>

      <div class="goals-grid">
        ${goals.map(goal => {
          const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
          const remaining = goal.target - goal.current;
          const deadline = new Date(goal.deadline + 'T12:00:00');
          const now = new Date();
          const monthsLeft = Math.max(0, (deadline.getFullYear() - now.getFullYear()) * 12 + deadline.getMonth() - now.getMonth());
          const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : remaining;
          const status = pct >= 100 ? 'success' : pct >= 60 ? '' : 'warning';

          return `
            <div class="goal-card card animate-fade-in-up">
              <div class="goal-card-header">
                <div>
                  <div class="goal-emoji">${goal.emoji || '🎯'}</div>
                  <div class="goal-name">${goal.name}</div>
                  <div class="goal-deadline">
                    <i class="fa-solid fa-calendar"></i>
                    Prazo: ${deadline.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    ${monthsLeft > 0 ? `(${monthsLeft} meses)` : ''}
                  </div>
                </div>
                <button class="btn btn-ghost btn-icon btn-sm" onclick="Goals.editGoal('${goal.id}')">
                  <i class="fa-solid fa-pen"></i>
                </button>
              </div>

              <div class="goal-amounts">
                <span class="goal-current">${App.currency(goal.current)}</span>
                <span class="goal-target">de ${App.currency(goal.target)}</span>
              </div>

              <div class="goal-progress-container">
                <div class="goal-percent">${pct.toFixed(1)}%</div>
                <div class="progress">
                  <div class="progress-bar ${status}" style="width:${pct}%"></div>
                </div>
              </div>

              ${pct < 100 ? `
                <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--border-primary)">
                  <div style="display:flex;justify-content:space-between;font-size:var(--font-size-xs);color:var(--text-tertiary)">
                    <span>Faltam: ${App.currency(remaining)}</span>
                    <span>~${App.currency(monthlyNeeded)}/mês</span>
                  </div>
                </div>
              ` : `
                <div style="margin-top:var(--space-4);text-align:center;padding:var(--space-3);background:var(--color-success-bg);border-radius:var(--radius-md)">
                  <span style="color:var(--color-success);font-weight:600;font-size:var(--font-size-sm)">
                    🎉 Meta Concluída!
                  </span>
                </div>
              `}
            </div>
          `;
        }).join('')}

        ${goals.length === 0 ? `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-state-icon"><i class="fa-solid fa-bullseye"></i></div>
            <div class="empty-state-title">Nenhuma meta definida</div>
            <div class="empty-state-text">Crie sua primeira meta financeira e acompanhe seu progresso</div>
            <button class="btn btn-primary" onclick="Goals.openForm()">
              <i class="fa-solid fa-plus"></i> Criar Meta
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  function openForm() {
    const modal = document.getElementById('modal-goal');
    modal.querySelector('h3').innerHTML = '<i class="fa-solid fa-bullseye" style="color:var(--brand-primary)"></i> Nova Meta';
    modal.querySelector('.modal-body').innerHTML = `
      <div class="form-group">
        <label class="form-label">Nome da Meta</label>
        <input type="text" class="form-input" id="goal-form-name" placeholder="Ex: Reserva de Emergência">
      </div>
      <div class="form-group">
        <label class="form-label">Emoji</label>
        <input type="text" class="form-input" id="goal-form-emoji" value="🎯" maxlength="4" style="width:80px;text-align:center;font-size:1.5rem">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Valor Alvo (R$)</label>
          <input type="number" class="form-input" id="goal-form-target" placeholder="0,00" step="100">
        </div>
        <div class="form-group">
          <label class="form-label">Valor Atual (R$)</label>
          <input type="number" class="form-input" id="goal-form-current" placeholder="0,00" step="100" value="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Prazo</label>
          <input type="date" class="form-input" id="goal-form-deadline">
        </div>
        <div class="form-group">
          <label class="form-label">Aporte Mensal (R$)</label>
          <input type="number" class="form-input" id="goal-form-monthly" placeholder="0,00" step="100">
        </div>
      </div>
    `;
    App.openModal('modal-goal');
  }

  async function saveGoal() {
    const name = document.getElementById('goal-form-name').value.trim();
    const emoji = document.getElementById('goal-form-emoji').value || '🎯';
    const target = parseFloat(document.getElementById('goal-form-target').value) || 0;
    const current = parseFloat(document.getElementById('goal-form-current').value) || 0;
    const deadline = document.getElementById('goal-form-deadline').value;
    const monthlyContribution = parseFloat(document.getElementById('goal-form-monthly').value) || 0;

    if (!name || !target) {
      App.toast('warning', 'Campos obrigatórios', 'Preencha nome e valor alvo');
      return;
    }

    await FinanDB.add('goals', { name, emoji, target, current, deadline, monthlyContribution });
    App.closeModal('modal-goal');
    App.toast('success', 'Meta criada!', name);
    render();
  }

  async function editGoal(id) {
    const goal = await FinanDB.getById('goals', id);
    if (!goal) return;

    openForm();
    setTimeout(() => {
      document.getElementById('goal-form-name').value = goal.name;
      document.getElementById('goal-form-emoji').value = goal.emoji;
      document.getElementById('goal-form-target').value = goal.target;
      document.getElementById('goal-form-current').value = goal.current;
      document.getElementById('goal-form-deadline').value = goal.deadline;
      document.getElementById('goal-form-monthly').value = goal.monthlyContribution || 0;

      const modal = document.getElementById('modal-goal');
      modal.querySelector('h3').innerHTML = '<i class="fa-solid fa-pen"></i> Editar Meta';
    }, 50);
  }

  // ── Achievements Page ──
  async function renderAchievements() {
    const achievements = await FinanDB.getAll('achievements');
    const unlocked = achievements.filter(a => a.unlocked).length;

    if (typeof App !== 'undefined') {
      App.updateAchievementsBadge();
    }

    const container = document.getElementById('page-achievements');
    container.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>Conquistas</h2>
          <p>${unlocked} de ${achievements.length} conquistas desbloqueadas</p>
        </div>
      </div>

      <div class="progress" style="margin-bottom:var(--space-8);height:12px">
        <div class="progress-bar" style="width:${(unlocked / achievements.length) * 100}%"></div>
      </div>

      <div class="achievements-grid">
        ${achievements.map(ach => `
          <div class="achievement animate-fade-in-up ${ach.unlocked ? '' : 'opacity-50'}" style="${!ach.unlocked ? 'opacity:0.5' : ''}">
            <div class="achievement-icon ${ach.unlocked ? 'unlocked' : 'locked'}">
              ${ach.icon}
            </div>
            <div class="achievement-info">
              <h4>${ach.name}</h4>
              <p>${ach.description}</p>
              ${ach.unlocked && ach.date ? `<small style="color:var(--brand-secondary)">Desbloqueado em ${new Date(ach.date).toLocaleDateString('pt-BR')}</small>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  return { render, openForm, saveGoal, editGoal, renderAchievements };
})();
