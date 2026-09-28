/* Aba Riscos: registro e matriz probabilidade × impacto 5×5. */
'use strict';

App.nivelRisco = function (p, i) {
  const n = Math.max(1, Math.min(5, +p || 1)) * Math.max(1, Math.min(5, +i || 1));
  const classe = n >= 15 ? 'vermelho' : n >= 10 ? 'laranja' : n >= 5 ? 'amarelo' : 'verde';
  return { n, classe, rotulo: { vermelho: 'Crítico', laranja: 'Alto', amarelo: 'Moderado', verde: 'Baixo' }[classe] };
};

App.abas.riscos = {
  render() {
    const escala = [[1, '1 – muito baixa'], [2, '2 – baixa'], [3, '3 – média'], [4, '4 – alta'], [5, '5 – muito alta']];
    return `<h2>Gerenciamento de riscos</h2>
<div class="cartao"><h3 style="margin-top:0">Matriz probabilidade × impacto</h3><div id="matrizBox"></div>
<p class="muted">Nível = P × I · verde ≤ 4 · amarelo 5–9 · laranja 10–14 · vermelho ≥ 15. Riscos fechados não aparecem na matriz.</p></div>
<div class="cartao"><h3 style="margin-top:0">Registro de riscos</h3>
${App.tabela('riscos', [
    { campo: 'id', rotulo: 'ID', largura: '60px' },
    { campo: 'descricao', rotulo: 'Descrição do risco', tipo: 'textarea', largura: '22%' },
    { campo: 'categoria', rotulo: 'Categoria' },
    { campo: 'probabilidade', rotulo: 'Probabilidade', tipo: 'select', opcoes: escala, render: true },
    { campo: 'impacto', rotulo: 'Impacto', tipo: 'select', opcoes: escala, render: true },
    { campo: 'resposta', rotulo: 'Resposta', tipo: 'select', opcoes: [['evitar', 'evitar'], ['mitigar', 'mitigar'], ['transferir', 'transferir'], ['aceitar', 'aceitar']] },
    { campo: 'planoAcao', rotulo: 'Plano de ação', tipo: 'textarea', largura: '20%' },
    { campo: 'responsavel', rotulo: 'Responsável', tipo: 'select', opcoes: App.opcoesPessoas() },
    { campo: 'status', rotulo: 'Situação', tipo: 'select', render: true, opcoes: [['aberto', 'aberto'], ['monitorado', 'monitorado'], ['fechado', 'fechado']] },
    { campo: 'macroUid', rotulo: 'Macroentrega', tipo: 'select', opcoes: App.opcoesMacros() },
  ], { novo: 'risco', botao: 'Adicionar risco', vazio: 'Nenhum risco registrado.' })}</div>`;
  },
  depois() {
    const cont = {};
    App.p.riscos.forEach((r) => {
      if (r.status === 'fechado') return;
      const k = (+r.probabilidade || 1) + '-' + (+r.impacto || 1);
      (cont[k] ??= []).push(r.id || '?');
    });
    let h = '<div class="matriz">';
    for (let p = 5; p >= 1; p--) {
      h += `<div class="eixo">${p}</div>`;
      for (let i = 1; i <= 5; i++) {
        const nv = App.nivelRisco(p, i);
        const ids = cont[p + '-' + i] || [];
        h += `<div class="cel c-${nv.classe}" title="P${p} × I${i} = ${nv.n} (${nv.rotulo})">${ids.length ? ids.map((x) => `<span class="chip">${esc(x)}</span>`).join('') : `<span class="muted">${nv.n}</span>`}</div>`;
      }
    }
    h += '<div></div>' + [1, 2, 3, 4, 5].map((i) => `<div class="eixo">${i}</div>`).join('') + '</div>';
    h += '<div class="muted" style="max-width:640px;display:flex;justify-content:space-between;margin-top:4px"><span>↑ Probabilidade</span><span>Impacto →</span></div>';
    $('#matrizBox').innerHTML = h;
    // nível ao lado de cada linha
    $$('#conteudo table.tab-edit tbody tr').forEach((tr, k) => {
      const r = App.p.riscos[k];
      if (!r) return;
      const nv = App.nivelRisco(r.probabilidade, r.impacto);
      const td = tr.querySelector('td');
      if (td) td.insertAdjacentHTML('beforeend', `<div style="margin-top:4px"><span class="nivel c-${nv.classe}">${nv.n}</span></div>`);
    });
  },
};
