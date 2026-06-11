/* =============================================
   FinanAI — AI Assistant Module
   ============================================= */

const AIAssistant = (() => {
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    const messages = document.getElementById('ai-chat-messages');
    if (messages && messages.children.length === 0) {
      addBotMessage(`Olá! 👋 Sou o **FinBot**, seu assistente financeiro inteligente.

Posso te ajudar com:
• Analisar seus gastos e receitas
• Dar dicas de economia
• Simular investimentos
• Responder perguntas sobre suas finanças

Como posso te ajudar hoje?`);
    }
  }

  function addBotMessage(text) {
    const messages = document.getElementById('ai-chat-messages');
    if (!messages) return;

    const el = document.createElement('div');
    el.className = 'ai-message bot';
    el.innerHTML = `
      <div class="ai-message-label">🤖 FinBot</div>
      <div>${formatMessage(text)}</div>
    `;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function addUserMessage(text) {
    const messages = document.getElementById('ai-chat-messages');
    if (!messages) return;

    const el = document.createElement('div');
    el.className = 'ai-message user';
    el.innerHTML = `
      <div class="ai-message-label">Você</div>
      <div>${text}</div>
    `;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/• /g, '&bull; ');
  }

  async function sendMessage() {
    const input = document.getElementById('ai-chat-input');
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    addUserMessage(text);

    // Show typing indicator
    const typing = document.createElement('div');
    typing.className = 'ai-message bot';
    typing.id = 'ai-typing';
    typing.innerHTML = `
      <div class="ai-message-label">🤖 FinBot</div>
      <div class="animate-pulse">Analisando...</div>
    `;
    document.getElementById('ai-chat-messages').appendChild(typing);

    // Process with delay for effect
    setTimeout(async () => {
      typing.remove();
      const response = await processQuery(text);
      addBotMessage(response);
    }, 800 + Math.random() * 700);
  }

  async function processQuery(query) {
    const lower = query.toLowerCase();
    const transactions = await FinanDB.getAll('transactions');
    const investments = await FinanDB.getAll('investments');
    const accounts = await FinanDB.getAll('accounts');
    const goals = await FinanDB.getAll('goals');

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
    const totalInvested = investments.reduce((s, i) => s + (i.currentPrice * i.quantity), 0);

    // ── Query matching ──
    if (lower.includes('gastei') || lower.includes('gasto') || lower.includes('despesa')) {
      if (lower.includes('mercado') || lower.includes('alimentação')) {
        const food = monthTx.filter(t => t.type === 'expense' && (t.parentCategory === 'Alimentação' || t.category === 'Alimentação' || t.category === 'Mercado')).reduce((s, t) => s + t.amount, 0);
        const yearTx = transactions.filter(t => {
          const d = new Date(t.date);
          return d.getFullYear() === currentYear && t.type === 'expense' && (t.parentCategory === 'Alimentação' || t.category === 'Alimentação' || t.category === 'Mercado');
        });
        const yearTotal = yearTx.reduce((s, t) => s + t.amount, 0);
        return `📊 **Gastos com Alimentação**

• Este mês: **${App.currency(food)}**
• Este ano: **${App.currency(yearTotal)}**
• Média mensal: **${App.currency(yearTotal / (currentMonth + 1))}**

${food > yearTotal / (currentMonth + 1) * 1.2 ? '⚠️ Você está gastando **acima da média** este mês. Considere reduzir delivery e restaurantes.' : '✅ Seus gastos estão dentro da média. Continue assim!'}`;
      }

      // General expenses
      const byCategory = {};
      monthTx.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.parentCategory || t.category;
        byCategory[cat] = (byCategory[cat] || 0) + t.amount;
      });

      const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      const topCats = sorted.slice(0, 5).map(([cat, val]) => `• ${cat}: **${App.currency(val)}**`).join('\n');

      return `📊 **Resumo de Despesas do Mês**

Total: **${App.currency(totalExpense)}**

**Top categorias:**
${topCats}

${totalExpense > totalIncome ? '⚠️ **Atenção!** Suas despesas superaram suas receitas este mês.' : `✅ Você ainda tem **${App.currency(totalIncome - totalExpense)}** de margem positiva.`}`;
    }

    if (lower.includes('patrimônio') || lower.includes('patrimonio') || lower.includes('quanto tenho')) {
      return `💰 **Seu Patrimônio Total**

• Saldo em contas: **${App.currency(totalBalance)}**
• Investimentos: **${App.currency(totalInvested)}**
• **Total: ${App.currency(totalBalance + totalInvested)}**

${totalInvested > totalBalance ? '✅ Ótimo! Você tem mais investido do que em contas. Seu dinheiro está trabalhando para você!' : '💡 Dica: Considere investir mais. Seu saldo em contas é maior que seus investimentos.'}`;
    }

    if (lower.includes('investir') || lower.includes('investimento')) {
      if (lower.includes('r$') || lower.includes('por mês') || lower.includes('anos')) {
        // Try to extract values
        const amountMatch = lower.match(/r\$\s*([\d.,]+)/);
        const yearsMatch = lower.match(/(\d+)\s*anos?/);
        const monthlyMatch = lower.match(/([\d.,]+)\s*por\s*m[eê]s/);

        const monthly = monthlyMatch ? parseFloat(monthlyMatch[1].replace('.', '').replace(',', '.')) : amountMatch ? parseFloat(amountMatch[1].replace('.', '').replace(',', '.')) : 500;
        const years = yearsMatch ? parseInt(yearsMatch[1]) : 20;
        const rate = 0.10; // 10% annual
        const monthlyRate = Math.pow(1 + rate, 1 / 12) - 1;

        let balance = 0;
        for (let m = 0; m < years * 12; m++) {
          balance = balance * (1 + monthlyRate) + monthly;
        }

        return `📈 **Simulação de Investimento**

Aporte mensal: **${App.currency(monthly)}**
Período: **${years} anos**
Taxa: **10% ao ano** (estimativa conservadora)

**Resultado: ${App.currency(balance)}**

• Total investido: **${App.currency(monthly * years * 12)}**
• Juros ganhos: **${App.currency(balance - monthly * years * 12)}**

💡 Os juros compostos representam **${((balance / (monthly * years * 12) - 1) * 100).toFixed(0)}%** de ganho sobre o valor investido!`;
      }

      const profit = investments.reduce((s, i) => s + (i.currentPrice * i.quantity - i.avgPrice * i.quantity), 0);
      return `📈 **Seus Investimentos**

• Patrimônio investido: **${App.currency(totalInvested)}**
• Lucro total: **${App.currency(profit)}**
• Ativos na carteira: **${investments.length}**

💡 Dica: Diversifique sua carteira entre renda fixa, variável e alternativos para reduzir risco.`;
    }

    if (lower.includes('econôm') || lower.includes('econom') || lower.includes('melhor mês')) {
      const monthlyData = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[key] = (monthlyData[key] || 0) + t.amount;
      });

      const sorted = Object.entries(monthlyData).sort((a, b) => a[1] - b[1]);
      if (sorted.length > 0) {
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        return `📊 **Análise de Economia**

• Mês mais econômico: **${App.monthYear(best[0] + '-01')}** — ${App.currency(best[1])}
• Mês com mais gastos: **${App.monthYear(worst[0] + '-01')}** — ${App.currency(worst[1])}
• Taxa de economia atual: **${totalIncome > 0 ? ((1 - totalExpense / totalIncome) * 100).toFixed(1) : 0}%**

${totalIncome - totalExpense > 0 ? '✅ Parabéns! Você está economizando este mês.' : '⚠️ Atenção: suas despesas estão maiores que suas receitas.'}`;
      }
    }

    if (lower.includes('meta') || lower.includes('objetivo')) {
      const goalsSummary = goals.map(g => {
        const pct = g.target > 0 ? (g.current / g.target * 100) : 0;
        return `• ${g.emoji} ${g.name}: **${pct.toFixed(1)}%** (${App.currency(g.current)} de ${App.currency(g.target)})`;
      }).join('\n');

      return `🎯 **Suas Metas Financeiras**

${goalsSummary || 'Você ainda não definiu metas. Crie uma no menu Metas!'}

💡 Dica: Automatize seus aportes definindo transferências automáticas no dia do pagamento.`;
    }

    if (lower.includes('dica') || lower.includes('sugest') || lower.includes('recomend') || lower.includes('conselho')) {
      const tips = [];
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) : 0;

      if (savingsRate < 0.2) tips.push('📌 Tente economizar pelo menos 20% da sua renda mensal');
      if (totalInvested < totalBalance * 0.5) tips.push('📌 Considere investir mais — seu saldo parado perde valor com a inflação');
      if (goals.length === 0) tips.push('📌 Defina metas financeiras claras para se manter motivado');
      if (totalExpense > totalIncome) tips.push('📌 ⚠️ Urgente: suas despesas superam suas receitas. Revise seus gastos!');

      tips.push('📌 Revise seus gastos fixos — pequenas reduções fazem grande diferença');
      tips.push('📌 Monte uma reserva de emergência de 6-12 meses de despesas');
      tips.push('📌 Diversifique investimentos: renda fixa + variável + alternativos');

      return `💡 **Recomendações para Você**

${tips.slice(0, 5).join('\n')}

Quer que eu aprofunde alguma dessas recomendações?`;
    }

    // Default response
    return `Entendi sua pergunta! 🤔

Posso te ajudar com:
• **"Quanto gastei?"** — Resumo de despesas
• **"Quanto tenho?"** — Patrimônio total
• **"Meus investimentos"** — Análise de carteira
• **"Se investir R$500 por 20 anos"** — Simulação
• **"Meu melhor mês"** — Análise de economia
• **"Minhas metas"** — Status das metas
• **"Me dê dicas"** — Recomendações

Tente uma dessas perguntas! 😊`;
  }

  function useSuggestion(text) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.value = text;
      sendMessage();
    }
  }

  return { init, sendMessage, useSuggestion };
})();
