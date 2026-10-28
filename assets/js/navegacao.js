/**
 * Botão para avançar para a próxima etapa no fim de cada fase (todoQA 49).
 * No fim de cada aba e de cada fase do projeto de produto: "← Voltar" e "Avançar para <próxima> →", com o que ainda falta na
 * tela atual logo acima (só informa; não impede de avançar). Só acrescenta ao fim da tela; não muda o resto.
 */
(function () {
  'use strict';
  const txt = (x) => String(x ?? '').trim();

  /** Sequência das telas: abas visíveis na ordem do menu; a aba do projeto de produto se abre nas fases usadas. */
  function sequencia() {
    const out = [];
    $$('#abas button').forEach((b) => {
      const aba = b.dataset.aba;
      if (!aba || b.hidden || !App.abaVisivel(aba)) return;
      const nome = b.textContent.replace(/^[^\p{L}\p{N}]+/u, '').trim();
      if (aba === 'produto' && window.nedipEtapasAtivas) window.nedipEtapasAtivas(App.p).forEach((et) => out.push({ aba, etapa: et.id, nome: `${et.nome} (projeto de produto)` }));
      else out.push({ aba, etapa: '', nome });
    });
    return out;
  }

  /** O que ainda falta na tela atual (avisos simples, sem bloquear). */
  function falta(aba, etapa) {
    const p = App.p, f = [];
    try {
      if (aba === 'projeto') {
        if (!txt(p.projeto.nome)) f.push('nome do projeto');
        if (!txt((p.projeto.coordenador || {}).nome)) f.push('coordenador');
        if (!p.projeto.dataInicio || !p.projeto.dataFimPrevista) f.push('datas de início e fim');
      } else if (aba === 'equipe') {
        if (!((p.projeto || {}).equipe || []).some((x) => txt(x.nome))) f.push('membros da equipe');
      } else if (aba === 'areas') {
        const sem = (p.areas || []).filter((a) => !(a.responsaveis || []).some((r) => txt(r.nome)));
        if (sem.length) f.push(`${sem.length} área(s) sem responsável`);
        const semNo = (p.areas || []).filter((a) => !txt(a.noImatec));
        if (semNo.length) f.push(`${semNo.length} área(s) sem item da árvore TRL`);
      } else if (aba === 'macros') {
        const sem = (p.macroentregas || []).filter((m) => !m.dataPrevista);
        if (sem.length) f.push(`${sem.length} macroentrega(s) sem data prevista`);
      } else if (aba === 'cronograma') {
        const sem = (p.macroentregas || []).filter((m) => !(m.atividades || []).length);
        if (sem.length) f.push(`${sem.length} macroentrega(s) sem atividades`);
      } else if (aba === 'trl') {
        const flat = Object.values(Nucleo.achatar(p.trl.arvore || []));
        if (!flat.length) f.push('árvore TRL');
        else { const n = flat.filter((x) => x.trlInformado === null || x.trlInformado === undefined).length; if (n) f.push(`${n} item(ns) sem TRL avaliado`); }
      } else if (aba === 'qualidade') {
        const n = (p.qualidade || []).filter((q) => !q.status || q.status === 'pendente').length;
        if (n) f.push(`${n} especificação(ões) ainda pendente(s)`);
      } else if (aba === 'especificacoes') {
        const fs = (((p.produto || {}).etapas || {}).conceitual || {}).funcoes || [];
        if (!fs.some((x) => txt(x.nome))) f.push('funções do produto');
        if (!(p.qualidade || []).length) f.push('especificações');
      } else if (aba === 'produto' && etapa) {
        const et = (window.NEDIP_ETAPAS || []).find((x) => x.id === etapa), e = p.produto.etapas[etapa] || {};
        if (et) {
          const nao = et.recomendacoes.filter(([id]) => !(e.recomendacoes || {})[id]).length;
          if (nao) f.push(`${nao} de ${et.recomendacoes.length} recomendação(ões) da fase não marcadas`);
          if (e.status !== 'concluída' && e.status !== 'não se aplica') f.push(`situação da fase: ${e.status || 'não iniciada'}`);
        }
      }
    } catch (er) { /* aviso é só ajuda: se algo faltar no projeto, não mostra */ }
    return f;
  }

  function htmlNavegacao() {
    const seq = sequencia();
    const i = seq.findIndex((x) => x.aba === App.aba && (!x.etapa || x.etapa === App.etapaSel));
    if (i < 0) return '';
    const ant = seq[i - 1], pos = seq[i + 1], fl = falta(App.aba, App.aba === 'produto' ? App.etapaSel : '');
    const botao = (x, rot, cls) => `<button class="btn ${cls}" data-acao="ir-aba" data-aba="${x.aba}"${x.etapa ? ` data-etapa="${x.etapa}"` : ''}>${rot}</button>`;
    return `<div class="nav-etapas" id="nav-etapas">
      ${pos && fl.length ? `<p class="nav-falta">Ainda falta nesta etapa: ${fl.map(esc).join('; ')}. Você pode avançar e voltar depois.</p>` : ''}
      <div class="nav-botoes">${ant ? botao(ant, `← Voltar: ${esc(ant.nome)}`, '') : '<span></span>'}${pos ? botao(pos, `Avançar para ${esc(pos.nome)} →`, 'primario') : ''}</div>
    </div>`;
  }

  const renderBase = App.render;
  App.render = function () {
    renderBase.apply(this, arguments);
    try {
      const c = $('#conteudo');
      if (c && App.p && !$('#nav-etapas')) c.insertAdjacentHTML('beforeend', htmlNavegacao());
    } catch (e) { console.error('navegação', e); }
  };
  window.NavEtapas = { sequencia, falta };
})();
