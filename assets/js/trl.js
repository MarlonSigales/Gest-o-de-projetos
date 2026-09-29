/* Aba TRL: importação da avaliação oficial de maturidade e visualização como TRL. */
'use strict';

App.mostrarOcultos = false;
App._arquivoTrl = null;

App.trlSel = null;
App.trlAbertos = new Map(); // níveis abertos/fechados pelo usuário (mantidos entre re-renderizações)

App.abas.trl = {
  render() {
    const t = App.p.trl;
    return `<h2>Maturidade tecnológica (TRL)</h2>
<div class="info-box">A avaliação é feita aqui mesmo: monte a estrutura do produto e responda aos critérios de cada nível para cada item.
  O TRL de um item é o maior nível em que todos os critérios dos níveis anteriores estão atendidos; o do sistema é o menor TRL entre as partes.
  <span class="muted">${esc(TRL_FONTE)}.</span><br>
  Se o financiador exigir a avaliação oficial da AEB (iMATEC, <a href="${esc(CONFIG.urlMaturidade)}" target="_blank" rel="noopener noreferrer">${esc(CONFIG.urlMaturidade)}</a>), use “Exportar JSON compatível” e, depois, “Importar JSON”.</div>
<div class="cartao"><div class="barra" style="margin-top:0">
  <button class="btn primario" data-acao="trl-add-raiz">+ Produto</button>
  <label class="btn">⬆ Importar JSON<input type="file" accept=".json,application/json" hidden id="arqTrl"></label>
  <button class="btn" data-acao="trl-exportar" ${t.arvore.length ? '' : 'disabled'}>⬇ Exportar JSON compatível</button>
  <span class="muted">${t.ultimaImportacao ? 'Última importação: ' + esc(t.ultimaImportacao.replace('T', ' ')) : ''}</span>
  <label class="muted" style="margin-left:auto"><input type="checkbox" id="chkOcultos" ${App.mostrarOcultos ? 'checked' : ''}> mostrar itens ocultos</label>
</div>
<div class="trl-editor">
  <div class="trl-arvore">${App.trlArvoreEditavel()}</div>
  <div class="trl-item">${App.trlEditorItem()}</div>
</div></div>
<div id="trlPainel"><p class="vazio">Calculando…</p></div>
${App.trlHistoricoHtml()}`;
  },
  depois() {
    $('#arqTrl').addEventListener('change', (ev) => { const f = ev.target.files[0]; if (f) App.previaTrl(f); ev.target.value = ''; });
    $('#chkOcultos').addEventListener('change', (ev) => { App.mostrarOcultos = ev.target.checked; App.render(); });
    $$('details.trl-nivel').forEach((d) => d.addEventListener('toggle', () => App.trlAbertos.set(d.dataset.ab, d.open)));
  },
  analise() {
    const el = $('#trlPainel');
    if (!el || !App.an) return;
    const t = App.an.trl;
    if (!t.temDados) { el.innerHTML = '<p class="vazio">Monte a estrutura do produto (+ Produto) e responda aos critérios para ver os indicadores de TRL.</p>'; return; }
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
        h += `<tr><td>${esc(n.titulo)} <span class="muted">${esc(n.chave)}</span>${n.falta && n.falta.nivel ? `<div class="muted">Para TRL ${n.falta.nivel} falta: ${n.falta.faltam.map((f) => esc(f.id + ' ' + f.texto)).join('; ')}</div>` : ''}</td><td>${esc(n.tipo)}</td><td>${App.trlBadge(n.trl)}</td><td>${esc(n.area || '—')}</td><td>${n.cobrar.map((r) => esc(r.nome) + (r.email ? ' &lt;' + esc(r.email) + '&gt;' : '')).join('; ')}</td></tr>`;
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

    el.innerHTML = h;
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
    const ant = Nucleo.achatar(App.p.trl.arvore || []);
    App.p.trl = Object.assign({}, App.p.trl, { ultimaImportacao: quando, arquivoOrigem, arvore: Nucleo.normalizarArvore(imp.arvore) });
    App.p.trl.historico = App.p.trl.historico || [];
    Object.values(Nucleo.achatar(App.p.trl.arvore)).forEach((n) => {
      const a = ant[n.chave];
      if (!a || a.trlInformado !== n.trlInformado) App.p.trl.historico.push({ dataHora: quando, chave: n.chave, titulo: n.titulo + ' (importação)', de: a ? a.trlInformado : null, para: n.trlInformado, usuario: App.cfg.usuario || '' });
    });
    App.p.areas = imp.areas;
    App._importTrl = null;
    App.fecharModal();
    App.marcarSujo(true);
    App.analisar();
    App.render();
    App.toast('Avaliação importada. Clique em Salvar para registrar no projeto.', 'ok');
  } catch (e) { App.toast('Importação: ' + esc(e.message), 'erro', 8000); el.disabled = false; }
};


// ================================================================== editor da estrutura e dos critérios
App.TIPOS_FILHO = { product: 'subsystem', subsystem: 'assembly', assembly: 'component', component: 'component' };
App.trlCaminhoPorChave = function (chave, nos = App.p.trl.arvore, base = 'trl.arvore') {
  for (let i = 0; i < nos.length; i++) {
    const c = `${base}.${i}`;
    if (nos[i].chave === chave) return c;
    const r = App.trlCaminhoPorChave(chave, nos[i].filhos || [], c + '.filhos');
    if (r) return r;
  }
  return null;
};

App.trlArvoreEditavel = function () {
  const arv = App.p.trl.arvore;
  if (!arv.length) return '<p class="vazio">Nenhum item. Clique em “+ Produto”.</p>';
  const efet = Nucleo.achatar(Nucleo.calcularTrl(arv));
  const rec = (nos) => '<ul class="arvore">' + nos.filter((n) => App.mostrarOcultos || n.visivel !== false).map((n) => {
    const e = efet[n.chave] || {};
    const sel = App.trlSel === n.chave;
    const orig = n.avaliacao && n.avaliacao.origem === 'interno' ? '' : '<span class="muted" title="TRL declarado na importação, sem critérios respondidos">importado</span>';
    return `<li><div class="no ${sel ? 'sel' : ''} ${n.visivel === false ? 'oculto-no' : ''}" data-acao="trl-sel" data-chave="${esc(n.chave)}">
      ${App.trlBadge(e.trlEfetivo)} <b>${esc(n.titulo || '(sem título)')}</b> <span class="tipo">${esc(App.nomeTipo[n.tipo] || n.tipo)}</span> ${orig}
      ${e.divergente ? `<span class="div" title="TRL do item difere do menor TRL dos subelementos">item ${e.trlInformado ?? '—'} · partes ${e.trlMinFilhos}</span>` : ''}
    </div>${(n.filhos || []).length ? rec(n.filhos) : ''}</li>`;
  }).join('') + '</ul>';
  return rec(arv).replace('<ul class="arvore">', '<ul class="arvore raiz">');
};

App.trlEditorItem = function () {
  const cam = App.trlSel && App.trlCaminhoPorChave(App.trlSel);
  if (!cam) return '<p class="vazio">Selecione um item da estrutura para editar e avaliar.</p>';
  const n = App.get(cam);
  const av = n.avaliacao || { origem: 'importado', criterios: {} };
  const trlCrit = trlPorCriterios(av);
  const falta = trlFaltaProximo(av);
  const figs = [];
  App.p.macroentregas.forEach((m, mi) => (m.figuras || []).forEach((f) => figs.push([f.id, `ME${mi + 1} · ${f.id} · ${String(f.titulo || '').slice(0, 60)}`])));
  const opFig = [['', '— figura de evidência —']].concat(figs);
  let h = `<div class="barra" style="margin-top:0;justify-content:space-between">
    <h3 style="margin:0">${esc(n.titulo || '(sem título)')} ${App.trlBadge(n.trlInformado)}</h3>
    <div class="barra" style="margin:0">
      <button class="btn pequeno" data-acao="trl-add-filho">+ ${esc(App.nomeTipo[App.TIPOS_FILHO[n.tipo]] || 'item')}</button>
      <button class="btn pequeno" data-acao="trl-mover" data-d="-1" title="Subir">↑</button>
      <button class="btn pequeno" data-acao="trl-mover" data-d="1" title="Descer">↓</button>
      <button class="btn pequeno perigo" data-acao="trl-remover">Remover</button></div></div>
  <div class="grade-campos">
    ${App.campo(cam + '.titulo', 'Nome do item', { render: true })}
    ${App.campo(cam + '.tipo', 'Tipo', { tipo: 'select', render: true, opcoes: Object.entries(App.nomeTipo) })}
    ${App.campo(cam + '.keyTechItems', 'Itens tecnológicos-chave')}
    ${App.campo(cam + '.implementationMethod', 'Método de implementação')}
    ${App.campo(cam + '.supplier', 'Fornecedor')}
    ${App.campo(cam + '.visivel', 'Visível', { tipo: 'checkbox', render: true })}
    ${App.campo(cam + '.justification', 'Justificativa geral', { tipo: 'textarea', classe: 'largo', linhas: 2 })}
  </div>`;
  if (av.origem !== 'interno') {
    h += `<div class="aviso-box">TRL ${n.trlInformado ?? '—'} declarado na importação, sem critérios respondidos.
      <button class="btn pequeno" data-acao="trl-avaliar">Avaliar por critérios</button>
      <span class="muted">(os critérios até o nível declarado são pré-marcados como “sim”, para você confirmar as evidências)</span></div>`;
    return h;
  }
  h += `<div class="ok-box"><b>TRL pelos critérios: ${trlCrit ?? '—'}</b>${falta.nivel ? ` · para TRL ${falta.nivel} falta: ${falta.faltam.map((f) => esc(f.id)).join(', ')}` : ''}${av.atualizado ? ` <span class="muted">· atualizado em ${esc(av.atualizado.replace('T', ' ').slice(0, 16))}</span>` : ''}</div>`;
  TRL_NIVEIS.forEach((lv) => {
    const atendido = lv.criterios.every(([id]) => av.criterios[id] && ['sim', 'na'].includes(av.criterios[id].r));
    const chaveAb = App.trlSel + '|' + lv.n;
    const aberto = App.trlAbertos.has(chaveAb) ? App.trlAbertos.get(chaveAb) : (lv.n === (trlCrit || 0) + 1);
    h += `<details class="trl-nivel ${atendido ? 'ok' : ''}" data-ab="${esc(chaveAb)}" ${aberto ? 'open' : ''}>
      <summary><b>TRL ${lv.n}</b> — ${esc(lv.nome)} ${atendido ? '✔' : ''}</summary>`;
    lv.criterios.forEach(([id, texto]) => {
      const base = `${cam}.avaliacao.criterios.${id}`;
      if (!av.criterios[id]) av.criterios[id] = { r: '', ev: '', fig: '' };
      h += `<div class="trl-crit"><div class="t"><b>${id}</b> ${esc(texto)}</div>
        ${App.campo(base + '.r', '', { tipo: 'select', render: true, opcoes: [['', '—'], ['sim', 'Sim'], ['nao', 'Não'], ['na', 'Não se aplica']] })}
        ${App.campo(base + '.ev', '', { ph: 'Evidência (ensaio, documento, seção da tese…)' })}
        ${App.campo(base + '.fig', '', { tipo: 'select', opcoes: opFig })}</div>`;
    });
    h += '</details>';
  });
  return h;
};

App.trlHistoricoHtml = function () {
  const hs = (App.p.trl.historico || []).slice(-50).reverse();
  if (!hs.length) return '';
  return `<div class="cartao"><h3 style="margin-top:0">Histórico da avaliação</h3><div class="rolagem" style="max-height:240px;overflow:auto"><table class="tab-edit"><thead><tr><th>Data/hora</th><th>Item</th><th>TRL</th><th>Usuário</th></tr></thead><tbody>
    ${hs.map((x) => `<tr><td>${esc(x.dataHora.replace('T', ' '))}</td><td>${esc(x.titulo)} <span class="muted">${esc(x.chave)}</span></td><td>${x.de ?? '—'} → <b>${x.para ?? '—'}</b></td><td>${esc(x.usuario || '')}</td></tr>`).join('')}</tbody></table></div></div>`;
};

/** Após qualquer alteração de critério: recalcula o TRL do item e registra no histórico. */
App.aposSet = function (caminho) {
  if (!caminho.startsWith('trl.arvore.') || !caminho.includes('.avaliacao.criterios.')) return;
  const n = App.get(caminho.split('.avaliacao.criterios.')[0]);
  if (!n || !n.avaliacao) return;
  const antes = n.trlInformado;
  n.avaliacao.origem = 'interno';
  n.avaliacao.atualizado = Nucleo.agoraIso();
  n.trlInformado = trlPorCriterios(n.avaliacao);
  if (antes !== n.trlInformado) App.p.trl.historico.push({ dataHora: Nucleo.agoraIso(), chave: n.chave, titulo: n.titulo, de: antes, para: n.trlInformado, usuario: App.cfg.usuario || '' });
};

App.trlAposEstrutura = function () {
  const mapa = Nucleo.rechavear(App.p.trl.arvore);
  App.p.areas.forEach((a) => { if (a.noImatec && mapa[a.noImatec]) a.noImatec = mapa[a.noImatec]; });
  if (App.trlSel && mapa[App.trlSel]) App.trlSel = mapa[App.trlSel];
  App.marcarSujo(true); App.analisar(); App.render();
};
const novoNo = (tipo, titulo) => ({ chave: '', idOriginal: null, stringId: '', titulo, tipo, nivel: 0, visivel: true, keyTechItems: '', justification: '', implementationMethod: '', supplier: '', trlInformado: null, filhos: [], avaliacao: { origem: 'interno', criterios: {}, atualizado: '' } });

App.acoes['trl-sel'] = (el) => { App.trlSel = el.dataset.chave; App.render(); };
App.acoes['trl-add-raiz'] = () => {
  App.p.trl.arvore.push(novoNo('product', 'Novo produto'));
  App.trlAposEstrutura();
  App.trlSel = App.p.trl.arvore[App.p.trl.arvore.length - 1].chave; App.render();
};
App.acoes['trl-add-filho'] = () => {
  const n = App.get(App.trlCaminhoPorChave(App.trlSel));
  const tipo = App.TIPOS_FILHO[n.tipo] || 'component';
  n.filhos.push(novoNo(tipo, 'Novo ' + (App.nomeTipo[tipo] || 'item').toLowerCase()));
  App.trlAposEstrutura();
  App.trlSel = n.filhos[n.filhos.length - 1].chave; App.render();
};
App.acoes['trl-remover'] = () => {
  const cam = App.trlCaminhoPorChave(App.trlSel);
  const n = App.get(cam);
  if (!confirm(`Remover "${n.titulo}"${n.filhos.length ? ' e seus ' + n.filhos.length + ' subitem(ns)' : ''}?`)) return;
  const ps = cam.split('.'); const i = +ps.pop(); App.get(ps.join('.')).splice(i, 1);
  App.p.areas.forEach((a) => { if (a.noImatec && (a.noImatec === n.chave || a.noImatec.startsWith(n.chave + '/'))) { a.vinculoPerdido = true; } });
  App.trlSel = null; App.trlAposEstrutura();
};
App.acoes['trl-mover'] = (el) => {
  const cam = App.trlCaminhoPorChave(App.trlSel);
  const ps = cam.split('.'); const i = +ps.pop(); const l = App.get(ps.join('.')); const j = i + (+el.dataset.d);
  if (j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]];
  App.trlSel = null; App.trlAposEstrutura();
  App.trlSel = l[j].chave; App.render();
};
App.acoes['trl-avaliar'] = () => {
  const n = App.get(App.trlCaminhoPorChave(App.trlSel));
  const decl = n.trlInformado || 0;
  n.avaliacao = { origem: 'interno', criterios: {}, atualizado: Nucleo.agoraIso() };
  TRL_NIVEIS.forEach((lv) => lv.criterios.forEach(([id]) => { n.avaliacao.criterios[id] = { r: lv.n <= decl ? 'sim' : '', ev: lv.n <= decl ? `Declarado na importação (TRL ${decl}) — confirmar evidência` : '', fig: '' }; }));
  n.trlInformado = trlPorCriterios(n.avaliacao);
  App.marcarSujo(true); App.analisar(); App.render();
};
App.acoes['trl-exportar'] = () => {
  const txt = JSON.stringify(Nucleo.exportarImatec(App.p.trl.arvore), null, 2);
  App.baixarBlob(new Blob([txt], { type: 'application/json' }), 'TRL - ' + Nucleo.nomeSeguro(App.p.projeto.nome) + '.json');
};
