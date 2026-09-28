/* Aba TRL: importação da avaliação oficial de maturidade e visualização como TRL. */
'use strict';

App.mostrarOcultos = false;
App._arquivoTrl = null;

App.abas.trl = {
  render() {
    const t = App.p.trl;
    return `<h2>Maturidade tecnológica (TRL)</h2>
<div class="info-box">A avaliação de maturidade deve ser feita na ferramenta oficial do governo, iMATEC (Agência Espacial Brasileira):
  <a href="${esc(CONFIG.urlMaturidade)}" target="_blank" rel="noopener noreferrer">${esc(CONFIG.urlMaturidade)}</a>.
  Após avaliar, exporte o JSON do produto e importe-o aqui.</div>
<div class="cartao"><div class="barra" style="margin-top:0">
  <label class="btn primario">⬆ Importar JSON da avaliação<input type="file" accept=".json,application/json" hidden id="arqTrl"></label>
  <span class="muted">${t.ultimaImportacao ? 'Última importação: ' + esc(t.ultimaImportacao.replace('T', ' ')) + (t.arquivoOrigem ? ' · arquivo original guardado na pasta do projeto' : '') : 'Nenhuma avaliação importada.'}</span>
  <label class="muted" style="margin-left:auto"><input type="checkbox" id="chkOcultos" ${App.mostrarOcultos ? 'checked' : ''}> mostrar itens ocultos</label>
</div></div>
<div id="trlPainel"><p class="vazio">Calculando…</p></div>`;
  },
  depois() {
    $('#arqTrl').addEventListener('change', (ev) => { const f = ev.target.files[0]; if (f) App.previaTrl(f); ev.target.value = ''; });
    $('#chkOcultos').addEventListener('change', (ev) => { App.mostrarOcultos = ev.target.checked; App.abas.trl.analise(); });
  },
  analise() {
    const el = $('#trlPainel');
    if (!el || !App.an) return;
    const t = App.an.trl;
    if (!t.temDados) { el.innerHTML = '<p class="vazio">Importe o JSON exportado da avaliação de maturidade para ver a árvore de TRL.</p>'; return; }
    const abaixo = t.sistema !== null && t.esperadoEtapa && t.sistema < t.esperadoEtapa;
    let h = `<div class="kpis">
      <div class="kpi ${abaixo ? 'alerta' : ''}"><div class="r">TRL atual do sistema</div><div class="v">${t.sistema ?? '—'}</div><div class="r">menor TRL entre os subelementos</div></div>
      <div class="kpi"><div class="r">TRL esperado na etapa atual</div><div class="v">${t.esperadoEtapa ?? '—'}</div><div class="r">${App.an.macroAtual ? 'Macroentrega ' + App.an.macroAtual.numero : ''}</div></div>
      <div class="kpi"><div class="r">TRL esperado ao final</div><div class="v">${t.esperadoFinal ?? '—'}</div></div></div>`;

    h += '<div class="cartao"><h3 style="margin-top:0">Pontos de verificação — TRL mais baixo</h3>';
    if (t.pontosVerificacao.length) {
      t.pontosVerificacao.forEach((p) => {
        h += `<div class="alerta-box"><b>${esc(p.nome)}</b> ${App.trlBadge(p.trlAtual)} ${p.trlEsperado ? '· esperado ' + p.trlEsperado : ''} · item: ${esc(p.noTitulo)}<br>
          <b>Cobrar:</b> ${p.cobrar.map((r) => `${esc(r.nome)}${r.email ? ' &lt;' + esc(r.email) + '&gt;' : ''}${r.observacao ? ' <span class="muted">(' + esc(r.observacao) + ')</span>' : ''}`).join('; ')}</div>`;
      });
    } else h += '<p class="muted">Nenhuma área vinculada à árvore. Vincule as áreas na aba Áreas / Responsáveis.</p>';
    if (t.nosMaisBaixos.length) {
      h += '<h4>Itens da estrutura com menor TRL (origem do gargalo)</h4><div class="rolagem"><table class="tab-edit"><thead><tr><th>Item</th><th>Tipo</th><th>TRL</th><th>Área</th><th>Cobrar</th></tr></thead><tbody>';
      t.nosMaisBaixos.forEach((n) => {
        h += `<tr><td>${esc(n.titulo)} <span class="muted">${esc(n.chave)}</span></td><td>${esc(n.tipo)}</td><td>${App.trlBadge(n.trl)}</td><td>${esc(n.area || '—')}</td><td>${n.cobrar.map((r) => esc(r.nome) + (r.email ? ' &lt;' + esc(r.email) + '&gt;' : '')).join('; ')}</td></tr>`;
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    if (t.areas.length) {
      h += '<div class="cartao"><h3 style="margin-top:0">TRL atual × esperado por área</h3><div class="barras-trl">';
      t.areas.forEach((a) => {
        h += `<div class="linha"><div><b>${esc(a.nome || a.id)}</b><br><span class="muted">atual ${a.trlAtual ?? '—'} · esperado ${a.trlEsperado ?? '—'}${a.gap > 0 ? ' · <span class="gap-neg">faltam ' + a.gap + '</span>' : ''}</span></div>
          <div class="trilho">${a.trlEsperado ? `<div class="esp" style="width:${a.trlEsperado / 9 * 100}%"></div>` : ''}${a.trlAtual !== null ? `<div class="atu ${a.gap > 0 ? 'abaixo' : ''}" style="width:${a.trlAtual / 9 * 100}%"></div>` : ''}</div></div>`;
      });
      h += '</div><p class="muted">Faixa clara = esperado · faixa escura = atual (vermelha quando abaixo do esperado). Escala de 1 a 9.</p></div>';
    }

    if (t.divergentes.length) {
      h += '<div class="cartao"><h3 style="margin-top:0">Divergências de avaliação</h3><p class="muted">O TRL informado no item difere do menor TRL dos seus subelementos. O sistema considera o menor valor.</p><ul>'
        + t.divergentes.map((d) => `<li>${esc(d.titulo)}: informado ${d.informado}, subelementos ${d.minFilhos}</li>`).join('') + '</ul></div>';
    }

    // árvore
    const areaPorNo = {};
    t.areas.forEach((a) => { if (a.vinculado) (areaPorNo[a.no] ??= []).push(a); });
    const minNo = Math.min(...t.nosMaisBaixos.map((n) => n.trl));
    const rec = (nos) => '<ul class="arvore">' + nos.filter((n) => App.mostrarOcultos || n.visivel).map((n) => {
      const ar = areaPorNo[n.chave] || [];
      return `<li><div class="no ${n.trlInformado === minNo ? 'baixo' : ''} ${n.visivel ? '' : 'oculto-no'}">
        <span class="alternar">${n.filhos.length ? '▾' : ''}</span>
        ${App.trlBadge(n.trlEfetivo)} <b>${esc(n.titulo)}</b> <span class="tipo">${esc(App.nomeTipo[n.tipo] || n.tipo)}</span> <span class="chave">${esc(n.chave)}</span>
        ${n.divergente ? `<span class="div">informado ${n.trlInformado} ≠ subelementos ${n.trlMinFilhos}</span>` : ''}
        ${ar.map((a) => `<span class="resp">· ${esc(a.nome)}: ${esc(a.responsaveis.map((r) => r.nome).join(', ') || 'sem responsável')}</span>`).join('')}
        ${n.keyTechItems && n.keyTechItems !== 'Nenhum' ? `<span class="muted">· itens-chave: ${esc(n.keyTechItems)}</span>` : ''}
      </div>${n.filhos.length ? rec(n.filhos) : ''}</li>`;
    }).join('') + '</ul>';
    h += `<div class="cartao"><h3 style="margin-top:0">Estrutura avaliada</h3>${rec(t.arvore).replace('<ul class="arvore">', '<ul class="arvore raiz">')}</div>`;
    el.innerHTML = h;
    $$('.no .alternar', el).forEach((s) => s.addEventListener('click', () => {
      const ul = s.closest('li').querySelector(':scope > ul');
      if (!ul) return;
      ul.classList.toggle('oculto');
      s.textContent = ul.classList.contains('oculto') ? '▸' : '▾';
    }));
  },
};

App.previaTrl = async function (arquivo) {
  try {
    const texto = (await arquivo.text()).replace(/^\uFEFF/, '');
    let dados;
    try { dados = JSON.parse(texto); } catch (e) { throw new Error('O arquivo não é um JSON válido: ' + e.message); }
    const { arvore, alertas } = Nucleo.importarTrl(dados);
    const df = Nucleo.diffTrl(App.p.trl.arvore || [], arvore);
    const areas = Nucleo.revincularAreas(App.p.areas, arvore);
    App._importTrl = { texto, arvore, areas };
    const primeira = !(App.p.trl.arvore || []).length;
    const nos = Object.keys(Nucleo.achatar(arvore)).length;
    let h = `<h2>Importar avaliação de maturidade</h2><p><b>${nos}</b> item(ns) encontrados em <b>${arvore.length}</b> produto(s).</p>`;
    if (alertas.length) h += '<div class="aviso-box"><b>Alertas:</b><ul>' + alertas.map((a) => `<li>${esc(a)}</li>`).join('') + '</ul></div>';
    if (!primeira) {
      h += '<h3>Diferenças em relação à avaliação atual</h3>';
      if (!df.novos.length && !df.removidos.length && !df.alterados.length) h += '<p class="ok-box">Nenhuma diferença.</p>';
      if (df.alterados.length) h += '<h4>TRL alterado</h4><ul>' + df.alterados.map((x) => `<li>${esc(x.titulo)} <span class="muted">${esc(x.chave)}</span>: ${x.de ?? 'n/a'} → <b>${x.para ?? 'n/a'}</b> (${x.sentido === 'subiu' ? '▲ subiu' : '<span class="gap-neg">▼ caiu</span>'})</li>`).join('') + '</ul>';
      if (df.novos.length) h += '<h4>Itens novos</h4><ul>' + df.novos.map((x) => `<li>${esc(x.titulo)} <span class="muted">${esc(x.chave)}</span> · TRL ${x.trl ?? 'n/a'}</li>`).join('') + '</ul>';
      if (df.removidos.length) h += '<h4>Itens removidos</h4><ul>' + df.removidos.map((x) => `<li>${esc(x.titulo)} <span class="muted">${esc(x.chave)}</span></li>`).join('') + '</ul>';
    }
    const perdidos = areas.filter((a) => a.vinculoPerdido);
    if (perdidos.length) h += '<div class="aviso-box">Áreas que perderão o vínculo (revise na aba Áreas): ' + perdidos.map((a) => esc(a.nome)).join(', ') + '</div>';
    h += `<div class="barra"><button class="btn primario" data-acao="trl-confirmar">Confirmar importação</button><button class="btn" data-acao="fechar-modal">Cancelar</button></div>`;
    App.modal(h);
  } catch (e) { App.toast('Importação: ' + esc(e.message), 'erro', 8000); }
};

App.acoes['fechar-modal'] = () => App.fecharModal();
App.acoes['trl-confirmar'] = async (el) => {
  const imp = App._importTrl;
  if (!imp) return;
  el.disabled = true;
  try {
    const quando = Nucleo.agoraIso();
    const arquivoOrigem = `imatec/imatec_${quando.replace('T', '_').replace(/:/g, '')}.json`;
    await App.arm.gravarArquivo(arquivoOrigem, new Blob([imp.texto], { type: 'application/json' }));
    App.p.trl = { ultimaImportacao: quando, arquivoOrigem, arvore: imp.arvore };
    App.p.areas = imp.areas;
    App._importTrl = null;
    App.fecharModal();
    App.marcarSujo(true);
    App.analisar();
    App.render();
    App.toast('Avaliação importada. Clique em Salvar para registrar no projeto.', 'ok');
  } catch (e) { App.toast('Importação: ' + esc(e.message), 'erro', 8000); el.disabled = false; }
};
