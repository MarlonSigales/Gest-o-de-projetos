/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/**
 * QFD, projeto conceitual e projeto preliminar como SEÇÕES das fases do Gestão (todoQA 61).
 *
 * Cada página do Sistema QFD e do Sistema de Projeto Conceitual vira um cartão na fase correspondente, em sequência, com a
 * altura do próprio conteúdo (a página do Gestão rola; a seção não tem rolagem própria). É o código dos próprios sistemas,
 * sem cabeçalho, menu e rodapé deles: nenhuma função se perde.
 *
 * Um só projeto: os dados do QFD e do projeto conceitual/preliminar ficam no JSON do Gestão (qfdDados e produto.pcDados).
 * Ao abrir a fase, o Gestão entrega esses dados aos sistemas; cada mudança feita numa seção volta sozinha ao Gestão
 * (critérios de qualidade, requisitos de cliente, funções, concepções, FMEA, lições) e às outras seções. Não há importar.
 * Os três sistemas ficam em marlonsigales.github.io (mesma origem), por isso dividem o armazenamento do navegador.
 */
(function () {
  'use strict';
  const QFD_PAGS = [
    ['requisitos-cliente', 'Requisitos de cliente'], ['comparacao-cliente', 'Comparação dos requisitos de cliente (Mudge)'],
    ['requisitos-projeto', 'Requisitos de projeto'], ['correlacao-projeto', 'Correlação entre requisitos de projeto (telhado)'],
    ['matriz-qfd', 'Matriz QFD (casa da qualidade)'], ['especificacoes', 'Especificações de projeto'],
    ['avaliacao-competitiva', 'Avaliação competitiva'], ['atendimento-requisitos', 'Atendimento aos requisitos'],
    ['fechamento', 'Fechamento: abstração, formulação e função global']]; // o relatório do QFD sai no PDF do Gestão (botão no topo)
  /** Páginas de apoio do QFD (fora do fluxo, valem para todas as fases): no início do projeto de produto. */
  const QFD_APOIO = [['ideias', 'Caderno de ideias'], ['referencias', 'Estado da técnica (normas, produtos, patentes, artigos)']];
  const PC_CONC = [
    ['inicio', 'Início: tipo de projeto e preenchimento automático'], ['escopo', 'Escopo do problema'], ['funcao-global', 'Função global'],
    ['estrutura', 'Estrutura funcional'], ['principios', 'Princípios de solução'], ['matriz', 'Matriz morfológica'],
    ['selecao', 'Seleção da concepção'], ['concepcao', 'Concepção selecionada'], ['analises', 'Análises e TRL'], ['relatorio', 'Relatório do projeto conceitual']];
  const PC_PRE = [
    ['p-requisitos', 'Requisitos e restrições'], ['p-leiautes', 'Portadores e leiautes'], ['p-detalhes', 'Funções auxiliares e diretrizes'],
    ['p-verificacoes', 'Verificações e lista de partes'], ['p-prototipo', 'Protótipo e testes'], ['p-adequacao', 'Adequação às especificações'],
    ['p-fechamento', 'Leiaute definitivo e relatório do preliminar']];
  const S = App.secoes = { frames: {}, prep: { qfd: '', pc: '' }, chave: { qfd: '', pc: '' }, projeto: '', timers: {}, pcInit: '', pcInitFrame: '', pcPronto: false, criando: false, st: {} };
  const norm = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const lerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const tirarLS = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ok */ } };
  const projId = () => (App.p && App.p.id) || '';
  const glob = (w, nome) => { try { return w && w.eval(`typeof ${nome} !== 'undefined' ? ${nome} : undefined`); } catch (e) { return undefined; } };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  /** Conteúdo sem os metadados (data de modificação), para saber se algo mudou de fato. */
  const semMeta = (txt) => { try { const d = typeof txt === 'string' ? JSON.parse(txt) : txt; if (!d || typeof d !== 'object') return ''; const c = Object.assign({}, d); delete c.metadata; return JSON.stringify(c); } catch (e) { return ''; } };
  const quando = (txt, campo) => { try { const d = typeof txt === 'string' ? JSON.parse(txt) : txt; return String(((d || {}).metadata || {})[campo] || ''); } catch (e) { return ''; } };
  const ativa = () => !!(App.p && !Nucleo.simplificado(App.p) && App.abaVisivel('produto'));

  // ---------------------------------------------------------------- endereços
  /**
   * Os sistemas são as pastas vizinhas do Gestão no mesmo site (marlonsigales.github.io/qfd/ e /projetoconceitual/,
   * com o nome exato dos repositórios). Só aberto do disco (file:) usa o endereço das configurações.
   */
  function base(app) {
    const local = app === 'qfd' ? '../qfd/' : '../projetoconceitual/';
    if (location.protocol !== 'file:') return new URL(local, location.href).href;
    const cfg = app === 'qfd' ? CONFIG.urlQfd : CONFIG.urlConceitual;
    try { return new URL('./', new URL(cfg, location.href)).href; } catch (e) { return new URL(local, location.href).href; }
  }
  const urlDe = (app, pag) => (app === 'qfd' ? `${base('qfd')}pages/${pag}.html?gp=1` : `${base('pc')}index.html?gp=1#/${pag}`);
  const faseDe = (app, pag) => (app === 'qfd' ? 'informacional' : PC_PRE.some(([p]) => p === pag) ? 'preliminar' : 'conceitual');

  // ---------------------------------------------------------------- seções na página
  /** Cartões das páginas de um sistema, numerados a partir de n0 (ex.: 5 → 5.1, 5.2…). */
  const listaDe = (app) => (app === 'qfd' ? QFD_PAGS : app === 'apoio' ? QFD_APOIO : app === 'pc-pre' ? PC_PRE : PC_CONC);
  /** Seções recolhidas: guardadas no projeto (config.secoesRecolhidas); as de apoio começam recolhidas. */
  const recolhidas = () => { const c = App.p.config || (App.p.config = {}); return c.secoesRecolhidas || (c.secoesRecolhidas = {}); };
  // ao abrir o projeto, todas as seções começam recolhidas; abrem só as que a pessoa abrir nesta sessão
  S.abertas = new Set();
  const estaRecolhida = (k) => !S.abertas.has(projId() + '|' + k);
  const abrirOuFechar = (k, abrir) => { const id = projId() + '|' + k; if (abrir) S.abertas.add(id); else S.abertas.delete(id); recolhidas()[k] = !abrir; };
  function estadoHtml(k) {
    const st = S.st[k]; if (!st) return '';
    const cls = st.feito ? 'ok' : st.pct ? 'meio' : 'vazio';
    const txt = st.feito && !st.marcada ? '100%' : st.pct !== null ? `${st.pct}%` : st.estado === 'andamento' ? 'em andamento' : '0%';
    return `<span class="sec-pct ${cls}" title="${esc(st.resumo || '')}">${txt}${st.feito ? (st.marcada ? ' · ✓ marcada como concluída' : ' · ✓ concluída') : ''}</span>`;
  }
  function botaoConcluir(k) {
    const st = S.st[k]; if (!st || st.semConclusao) return '';
    if (st.feito && !st.marcada) return '';
    return st.marcada ? `<button class="btn pequeno" data-acao="sec-concluir" data-chave="${k}" data-v="0" title="Desfazer a marcação">Desfazer</button>`
      : `<button class="btn pequeno" data-acao="sec-concluir" data-chave="${k}" data-v="1" title="Use quando esta etapa não precisar ser preenchida por completo">✓ Marcar como concluída</button>`;
  }
  /** Cartões das páginas de um sistema, numerados a partir de n0 (ex.: 5 → 5.1, 5.2…). */
  App.secoesHtml = function (app, n0, intro) {
    const lista = listaDe(app), ap = app === 'pc' || app === 'pc-pre' ? 'pc' : 'qfd', apoio = app === 'apoio';
    const nome = { qfd: 'QFD (casa da qualidade)', apoio: 'Apoio ao projeto (todas as fases)', pc: 'Projeto conceitual', 'pc-pre': 'Projeto preliminar' }[app];
    const chaves = lista.map(([p]) => `${ap}:${p}`).join(',');
    let h = `<div class="cartao secoes-cab ${apoio ? 'apoio' : ''}"><h3 style="margin-top:0">${n0}. ${nome}</h3><p class="muted" style="margin:0">${intro}</p>
      <div class="barra">${app === 'qfd' ? `<button class="btn primario" data-acao="qfd-pdf">📄 PDF da análise QFD</button>
        <label class="btn" title="Para projetos antigos: traz um backup JSON do Sistema QFD para o QFD deste projeto">⬆ Importar JSON do QFD (legado)<input type="file" hidden data-sec-json="1" accept=".json,.zip,application/json,application/zip"></label>` : ''}
        <input type="search" class="sec-busca" data-sec-busca="${chaves}" placeholder="Buscar nestas seções (Enter)" aria-label="Buscar nas seções">
        <button class="btn pequeno" data-acao="sec-todas" data-chaves="${chaves}" data-v="1">Recolher todas</button><button class="btn pequeno" data-acao="sec-todas" data-chaves="${chaves}" data-v="0">Abrir todas</button></div>
      ${avisoTrava()}${app === 'qfd' ? avisoConsolidacao() : ''}
      <nav class="secoes-indice">${lista.map(([p, t], i) => `<a href="#" data-acao="sec-ir" data-chave="${ap}:${p}">${n0}.${i + 1} ${esc(t)}</a>`).join('')}</nav></div>`;
    h += lista.map(([p, t], i) => {
      const k = `${ap}:${p}`, f = S.frames[k], rec = estaRecolhida(k);
      return `<div class="cartao app-secao ${rec ? 'recolhida' : ''}" id="sec-${ap}-${p}">
        <div class="sec-topo"><button class="sec-alternar" data-acao="sec-alternar" data-chave="${k}" aria-expanded="${!rec}" title="${rec ? 'Abrir' : 'Recolher'}">${rec ? '▸' : '▾'}</button>
          <h3 data-acao="sec-alternar" data-chave="${k}">${n0}.${i + 1} ${esc(t)}</h3><span class="sec-direita">${estadoHtml(k)}${botaoConcluir(k)}</span></div>
        ${rec ? '' : `<div class="app-lugar" data-chave="${k}" style="height:${(f && f.altura) || (App.p.config.secoesAlturas || {})[k] || alturaVista(k) || 640}px">${f && f.carregado ? '' : '<span class="muted app-carregando">Carregando…</span>'}</div>
        <div class="sec-fim"><button class="btn pequeno" data-acao="sec-alternar" data-chave="${k}" data-fim="1">▴ Recolher ${n0}.${i + 1}</button></div>`}</div>`;
    }).join('');
    return h;
  };
  const alturaVista = (k) => { try { return (JSON.parse(lerLS('gp_secoes_alturas') || '{}'))[k] || 0; } catch (e) { return 0; } };
  const guardarAlturaVista = (k, a) => { try { const o = JSON.parse(lerLS('gp_secoes_alturas') || '{}'); if (o[k] !== a) { o[k] = a; gravarLS('gp_secoes_alturas', JSON.stringify(o)); } } catch (e) { /* ok */ } };
  /** Recolher/abrir e concluir salvam o projeto sozinhos. */
  /** Salvamento rápido (só o JSON do projeto, sem nova versão no histórico, PDFs ou e-mails). */
  function salvarSozinho(ms = 300, comZip = true) {
    clearTimeout(S.timers.salvar);
    S.timers.salvar = setTimeout(async () => {
      if (!App.p || !App.arm || typeof App.arm.atualizarSemHistorico !== 'function') return;
      try {
        if (Nucleo.validar(App.p).length) return; // com erro de validação, fica para o Salvar
        if (comZip) { try { await guardarZipPc(); } catch (e) { console.warn('ZIP do projeto conceitual', e); } }
        await App.arm.atualizarSemHistorico(App.p, JSON.stringify(App.p, null, 2));
        App.marcarSujo(false); App.atualizarTopo && App.atualizarTopo();
      } catch (e) { console.error('salvar sozinho', e); App.toast('Não deu para salvar sozinho: ' + esc(e.message) + '. Use o botão Salvar.', 'aviso', 8000); }
    }, ms);
  }
  App.acoes['sec-alternar'] = (el) => {
    const k = el.dataset.chave, doFim = el.dataset.fim === '1';
    abrirOuFechar(k, estaRecolhida(k));
    App.marcarSujo(true); App.render(); salvarSozinho();
    if (doFim) { const [ap, pg] = k.split(':'), c = document.getElementById(`sec-${ap}-${pg}`); if (c) window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - 66 }); } // recolhida pelo fim: a tela volta ao título
  };
  App.acoes['sec-todas'] = (el) => {
    el.dataset.chaves.split(',').forEach((k) => abrirOuFechar(k, el.dataset.v !== '1'));
    App.marcarSujo(true); App.render(); salvarSozinho();
  };
  App.acoes['sec-concluir'] = (el) => {
    const k = el.dataset.chave, [app, pag] = k.split(':'), v = el.dataset.v === '1';
    try {
      if (app === 'qfd') { const w = janelaDe('qfd'); const db = w && glob(w, 'qfdDB'); if (!db) throw new Error('o QFD ainda está carregando'); db.setEtapaConcluida(pag, v); }
      else {
        const w = janelaDe('pc'), pc = w && glob(w, 'PC'); if (!pc || !pc.p) throw new Error('o projeto conceitual ainda está carregando');
        pc.p.etapasConcluidas = pc.p.etapasConcluidas.filter((x) => x !== pag).concat(v ? [pag] : []); pc.salvar('concluir');
        if (w.renderPagina) w.renderPagina(true);
      }
      setTimeout(() => { atualizarStatus(app); if (app === 'qfd') syncQfd(); else syncPc(true); salvarSozinho(); }, 150);
    } catch (e) { App.toast('Não deu para marcar: ' + esc(e.message), 'erro'); }
  };
  // busca dentro das seções abertas (o Ctrl+F do navegador não entra nelas): Enter vai para a próxima ocorrência
  document.addEventListener('keydown', (ev) => {
    const inp = ev.target; if (!inp || !inp.matches || !inp.matches('input[data-sec-busca]') || ev.key !== 'Enter') return;
    ev.preventDefault();
    const termo = inp.value.trim(); if (!termo) return;
    const chaves = inp.dataset.secBusca.split(',');
    if (S.busca && S.busca.termo !== termo) S.busca = null;
    const ini = S.busca ? S.busca.i : -1;
    const ordem = chaves.map((k, i) => ({ k, i })).filter(({ i }) => i > ini).concat(chaves.map((k, i) => ({ k, i })).filter(({ i }) => i <= ini));
    const alvo = termo.toLowerCase();
    for (const { k, i } of ordem) {
      const f = S.frames[k]; if (!f || !f.carregado) continue;
      let doc; try { doc = f.el.contentWindow.document; } catch (e) { continue; }
      if (!String(doc.body.innerText || '').toLowerCase().includes(alvo)) continue;
      S.busca = { termo, i };
      const w = f.el.contentWindow;
      try { w.getSelection().removeAllRanges(); w.find(termo, false, false, true); } catch (e) { /* sem find */ }
      let y = 0; try { const r = w.getSelection().getRangeAt(0).getBoundingClientRect(); y = r.top; } catch (e) { y = 0; }
      const l = document.querySelector(`.app-lugar[data-chave="${k}"]`);
      if (l) window.scrollTo({ top: l.getBoundingClientRect().top + window.scrollY + y - 140 });
      return;
    }
    const naoAbertas = chaves.filter((k) => !(S.frames[k] && S.frames[k].carregado)).length;
    App.toast(`"${esc(termo)}" não foi encontrado nas seções abertas${naoAbertas ? ` (${naoAbertas} seção(ões) recolhida(s) ou ainda não carregada(s) não entram na busca)` : ''}.`, 'aviso', 7000);
    S.busca = null;
  });
  // importar um backup JSON do Sistema QFD (projetos antigos)
  document.addEventListener('change', async (ev) => {
    const inp = ev.target; if (!inp || !inp.matches || !inp.matches('input[data-sec-json]')) return;
    const arq = inp.files && inp.files[0]; inp.value = ''; if (!arq) return;
    try {
      let texto;
      if (/\.zip$/i.test(arq.name)) {
        const z = await JSZip.loadAsync(arq);
        for (const n of Object.keys(z.files).filter((x) => /\.json$/i.test(x) && !z.files[x].dir)) { const t = await z.file(n).async('string'); try { const d = JSON.parse(t); if (d && Array.isArray(d.requisitosProjeto)) { texto = t; break; } } catch (e) { /* outro */ } }
        if (!texto) throw new Error('o ZIP não tem o backup JSON do QFD');
      } else texto = await arq.text();
      const d = JSON.parse(texto.replace(/^\uFEFF/, ''));
      if (!d || !Array.isArray(d.requisitosProjeto) || !Array.isArray(d.requisitosCliente)) throw new Error('o arquivo não é um backup do Sistema QFD');
      if (App.p.qfdDados && (App.p.qfdDados.requisitosProjeto || []).length && !confirm(`Trocar o QFD deste projeto pelo do arquivo "${arq.name}"? O PDCA, os valores medidos e os requisitos cadastrados à mão na Qualidade são mantidos.`)) return;
      if (!d.metadata) d.metadata = { schemaVersion: 1 };
      if (App.arm) { try { await App.arm.gravarArquivo(`qfd/qfd_${Nucleo.agoraIso().replace('T', '_').replace(/:/g, '')}.json`, new Blob([texto], { type: 'application/json' })); } catch (e) { /* cópia opcional */ } }
      const w = janelaDe('qfd'), db = w && glob(w, 'qfdDB');
      if (db) { if (!db.importData(d)) throw new Error(db.lastImportError || 'o QFD recusou o arquivo'); }
      else { gravarLS('qfd_data', JSON.stringify(d)); gravarLS('gp_dono_qfd', projId()); }
      S.chave.qfd = ''; syncQfd(true);
      App.toast(`QFD do arquivo "${esc(arq.name)}" trazido para este projeto.`, 'ok', 7000);
    } catch (e) { App.toast('Importar JSON do QFD: ' + esc(e.message), 'erro', 9000); }
  });

  App.acoes['sec-ir'] = (el, ev) => { if (ev) ev.preventDefault(); const [a, p] = el.dataset.chave.split(':'); irParaSecao(a, p); };

  function irParaSecao(app, pag) {
    if (app === 'qfd' && pag === 'relatorio' && App.acoes['qfd-pdf']) { App.acoes['qfd-pdf'](); return; } // relatório do QFD = PDF do Gestão
    const ehApoio = app === 'qfd' && QFD_APOIO.some(([p]) => p === pag);
    if (app === 'qfd' && !ehApoio && !QFD_PAGS.some(([p]) => p === pag)) pag = QFD_PAGS[0][0];
    const k = `${app}:${pag}`;
    if (estaRecolhida(k)) { abrirOuFechar(k, true); App.marcarSujo(true); salvarSozinho(); }
    if (app === 'pc' && !PC_CONC.concat(PC_PRE).some(([p]) => p === pag)) pag = 'inicio';
    const fase = ehApoio ? App.etapaSel : faseDe(app, pag);
    if (App.aba !== 'produto' || App.etapaSel !== fase) { App.aba = 'produto'; App.etapaSel = fase; }
    App.render();
    S.alvo = { id: `sec-${app}-${pag}`, ate: Date.now() + 6000 };
    setTimeout(() => { const l = document.getElementById(S.alvo ? S.alvo.id : ''); if (l) window.scrollTo({ top: l.getBoundingClientRect().top + window.scrollY - 66 }); }, 60);
  }
  App.irParaSecao = irParaSecao;

  // ---------------------------------------------------------------- preparar os dados do projeto para os sistemas
  function reservar(app, txt) {
    if (!txt) return;
    gravarLS('gp_reserva_' + app, JSON.stringify({ em: Nucleo.agoraIso(), texto: txt, modo: app === 'pc' ? lerLS('pc_modo') || '' : '' }));
    App.toast(`O ${app === 'qfd' ? 'QFD' : 'projeto conceitual'} que estava aberto neste navegador (de fora deste projeto) foi guardado à parte. <button class="btn pequeno" data-acao="sec-reserva" data-app="${app}">Baixar uma cópia</button>`, 'aviso', 15000);
  }
  App.acoes['sec-reserva'] = (el) => {
    try { const r = JSON.parse(lerLS('gp_reserva_' + el.dataset.app) || 'null'); if (!r) return App.toast('Não há cópia guardada.', 'aviso');
      App.baixarBlob(new Blob([r.texto], { type: 'application/json' }), `${el.dataset.app === 'qfd' ? 'qfd' : 'projeto-conceitual'}-guardado-${r.em.slice(0, 10)}.json`);
    } catch (e) { App.toast('Não deu para baixar: ' + esc(e.message), 'erro'); }
  };
  const idsQfd = (d) => new Set(((d && d.requisitosProjeto) || []).map((r) => r.id).filter(Boolean));
  function mesmoQfd(a, b) { const x = idsQfd(a), y = idsQfd(b); if (!x.size || !y.size) return false; let n = 0; x.forEach((i) => { if (y.has(i)) n++; }); return n >= Math.min(x.size, y.size) * 0.5; }

  // ---------------------------------------------------------------- uma aba por vez (todoQA 64)
  S.aba = Math.random().toString(36).slice(2, 10);
  const TRAVA = 'gp_secoes_trava';
  function travaDeOutra() {
    try { const t = JSON.parse(lerLS(TRAVA) || 'null'); return t && t.aba !== S.aba && Date.now() - t.em < 12000 ? t : null; } catch (e) { return null; }
  }
  function ocupar() { gravarLS(TRAVA, JSON.stringify({ aba: S.aba, proj: projId(), nome: (App.p && App.p.projeto.nome) || '', em: Date.now() })); }
  setInterval(() => {
    if (S.bloqueado) { if (!travaDeOutra()) { S.bloqueado = null; destruirTudo(); S.projeto = projId(); redesenhar(); } return; } // a outra aba fechou
    if ((S.prep.qfd || S.prep.pc) && App.p) ocupar();
  }, 4000);
  window.addEventListener('pagehide', () => { try { const t = JSON.parse(lerLS(TRAVA) || 'null'); if (t && t.aba === S.aba) tirarLS(TRAVA); } catch (e) { /* ok */ } });
  /** Antes de entregar os dados aos sistemas: se outra aba já usa as seções, esta fica parada até a pessoa escolher. */
  function podeUsar() {
    if (S.bloqueado) return false;
    const t = travaDeOutra();
    if (t) { S.bloqueado = t; redesenhar(); return false; }
    ocupar(); return true;
  }
  function avisoTrava() {
    const t = S.bloqueado; if (!t) return '';
    return `<div class="aviso-box" style="margin-top:8px"><b>O QFD e o projeto conceitual estão abertos em outra aba</b>${t.nome ? ` (projeto “${esc(t.nome)}”)` : ''}. Para os dados não se misturarem, as seções desta aba ficam paradas. <button class="btn pequeno primario" data-acao="sec-usar-aqui">Usar nesta aba</button></div>`;
  }
  App.acoes['sec-usar-aqui'] = () => { S.bloqueado = null; ocupar(); destruirTudo(); S.projeto = projId(); App.render(); };

  function prepararQfd() {
    const id = projId(); S.prep.qfd = id;
    const atual = lerLS('qfd_data'), dono = lerLS('gp_dono_qfd'), d = App.p.qfdDados;
    let atualD = null; try { atualD = JSON.parse(atual || 'null'); } catch (e) { atualD = null; }
    if (d) {
      const dd = clone(d); if (!dd.metadata) dd.metadata = { schemaVersion: 1 };
      if (!dd.projeto || !dd.projeto.nome) dd.projeto = Object.assign({}, dd.projeto || {}, { nome: App.p.projeto.nome });
      const txt = JSON.stringify(dd);
      if (semMeta(atual) !== semMeta(txt)) {
        // o do navegador é deste projeto e mais novo (mudanças feitas aqui e não salvas no Gestão): fica e entra no Gestão
        if (atualD && (dono === id || mesmoQfd(atualD, d)) && quando(atual, 'lastModified') > quando(txt, 'lastModified')) aplicarQfd(atualD);
        else { if (atual && dono !== id && !mesmoQfd(atualD, d)) reservar('qfd', atual); gravarLS('qfd_data', txt); }
      }
    } else if (atualD && dono === id) aplicarQfd(atualD);
    else { if (atual) reservar('qfd', atual); tirarLS('qfd_data'); S.qfdNovo = true; }
    gravarLS('gp_dono_qfd', id);
    S.chave.qfd = semMeta(lerLS('qfd_data'));
  }

  function anexoPc() {
    const et = App.p.produto && App.p.produto.etapas; if (!et) return null;
    return ['conceitual', 'preliminar'].flatMap((k) => ((et[k] || {}).anexos || [])).filter((a) => /\.zip$/i.test(a.arquivo || '') && /conceitual/i.test(a.arquivo + ' ' + (a.descricao || '')))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)))[0] || null;
  }
  function prepararPc() {
    const id = projId(); S.prep.pc = id; S.pcPronto = false; S.pcInit = ''; S.pcInitFrame = '';
    const atual = lerLS('pc_projeto'), dono = lerLS('gp_dono_pc'), modo = lerLS('pc_modo'), d = App.p.produto.pcDados;
    let atualD = null; try { atualD = JSON.parse(atual || 'null'); } catch (e) { atualD = null; }
    const doProjeto = (x) => !!x && x.projeto && (dono === id || norm(x.projeto.nome) === norm(App.p.projeto.nome));
    const guardar = () => { if (dono !== id && (atual || modo === 'nuvem') && !doProjeto(atualD)) reservar('pc', atual || JSON.stringify({ aviso: 'O projeto estava salvo no MEGA.' })); };
    gravarLS('pc_tour_visto', '1');
    if (modo !== 'pc') { guardar(); gravarLS('pc_modo', 'pc'); } // o Gestão é quem guarda o projeto
    if (d) {
      const txt = JSON.stringify(d);
      if (semMeta(atual) !== semMeta(txt)) {
        if (doProjeto(atualD) && quando(atual, 'modificado') > quando(txt, 'modificado')) { App.p.produto.pcDados = atualD; S.pcPendenteSync = true; }
        else { if (modo === 'pc') guardar(); gravarLS('pc_projeto', txt); }
      }
      S.pcImagens = !!anexoPc(); S.pcPronto = true;
    } else if (doProjeto(atualD) && dono === id) { App.p.produto.pcDados = atualD; S.pcPendenteSync = true; S.pcPronto = true; }
    else {
      if (modo === 'pc') guardar();
      tirarLS('pc_projeto');
      S.pcInit = anexoPc() ? 'zip' : App.p.qfdDados ? 'qfd' : '';
      if (!S.pcInit) S.pcPronto = true;
    }
    gravarLS('gp_dono_pc', id);
    S.chave.pc = semMeta(lerLS('pc_projeto'));
  }
  const podeCriar = (app) => !S.bloqueado && (app === 'qfd' ? S.prep.qfd === projId() : S.prep.pc === projId() && (S.pcPronto || (S.pcInit && !S.pcInitFrame)));

  // ---------------------------------------------------------------- iframes (fora do conteúdo, que é redesenhado a cada mudança)
  function camada() {
    let c = document.getElementById('appCamada');
    if (!c) { c = document.createElement('div'); c.id = 'appCamada'; document.body.appendChild(c); }
    return c;
  }
  const REAL_ST = { qfd: 'ideias', pc: 'inicio' };
  function criar(k) {
    const [app, pag] = k.split(':'), real = pag === '__st' ? REAL_ST[app] : pag;
    const el = document.createElement('iframe');
    el.className = 'app-frame'; el.setAttribute('aria-label', (app === 'qfd' ? 'QFD: ' : 'Projeto conceitual: ') + pag); el.src = urlDe(app, real);
    el.setAttribute('scrolling', 'no');
    camada().appendChild(el);
    S.frames[k] = { el, app, pag, real, altura: 0, carregado: false, modal: false, oculto: pag === '__st' };
    if (app === 'pc' && S.pcInit && !S.pcInitFrame) S.pcInitFrame = k;
    el.addEventListener('load', () => aoCarregar(k));
    S.criando = true; setTimeout(() => { S.criando = false; }, 200);
  }
  function destruirTudo() {
    Object.values(S.frames).forEach((f) => f.el.remove());
    S.frames = {}; S.prep = { qfd: '', pc: '' }; S.pcInit = ''; S.pcInitFrame = ''; S.pcPronto = false;
  }

  const CSS = {
    qfd: `html.gp-emb .topbar, html.gp-emb .sidebar, html.gp-emb .sidebar-toggle, html.gp-emb .sidebar-overlay, html.gp-emb .footer, html.gp-emb .nav-page-actions,
      html.gp-emb .page-nav, html.gp-emb .proximo-passo-rodape, html.gp-emb .etapa-conclusao, html.gp-emb .page-titulo h1 { display: none !important; }
      html.gp-emb, html.gp-emb body { background: transparent !important; overflow: hidden; }
      html.gp-emb .app-shell { display: block !important; min-height: 0 !important; }
      html.gp-emb .main-content { min-height: 0 !important; padding: 4px 0 8px !important; margin: 0 !important; }
      html.gp-emb .main-content .container { max-width: none !important; padding: 0 2px !important; }
      html.gp-emb body { font-family: "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif !important; }
      html.gp-emb.gp-modal, html.gp-emb.gp-modal body { overflow: auto; }`,
    pc: `html.gp-emb .topbar, html.gp-emb .sidebar, html.gp-emb .sidebar-toggle, html.gp-emb #etapa-nav, html.gp-emb .footer, html.gp-emb #aviso,
      html.gp-emb .card.comecar, html.gp-emb .cartao-nuvem, html.gp-emb .qfd-navegador, html.gp-emb [data-acao="baixar-zip"], html.gp-emb [data-acao="arm-salvar-completo"],
      html.gp-emb [data-acao="gestao-baixar"], html.gp-emb .titulo-num, html.gp-emb #etapa-conclusao, html.gp-emb .page-titulo h1 { display: none !important; }
      html.gp-emb, html.gp-emb body { background: transparent !important; overflow: hidden; }
      html.gp-emb .app-corpo { display: block !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; }
      html.gp-emb .app-conteudo { margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
      html.gp-emb .main-content { min-height: 0 !important; padding: 4px 2px 8px !important; margin: 0 !important; max-width: none !important; }
      html.gp-emb .etapa-cab, html.gp-emb .pagina-cab { margin-top: 0 !important; }
      html.gp-emb body { font-family: "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif !important; }
      html.gp-emb.gp-modal, html.gp-emb.gp-modal body { overflow: auto; }`,
  };

  async function aoCarregar(k) {
    const f = S.frames[k]; if (!f) return;
    let w, doc;
    try { w = f.el.contentWindow; doc = w.document; if (!doc) throw new Error(); } catch (e) { f.carregado = true; f.altura = 640; return; }
    // um link levou a outra página: volta à página da seção e mostra a seção certa
    const caminho = norm(w.location.pathname);
    if (f.app === 'qfd' && !caminho.endsWith(`/pages/${f.real}.html`)) {
      const m = caminho.match(/\/pages\/([a-z0-9-]+)\.html$/);
      f.el.src = urlDe('qfd', f.real); if (m && m[1] !== f.real && !f.oculto) irParaSecao('qfd', m[1]); return;
    }
    if (f.app === 'pc' && !/projetoconceitual|index\.html$|\/$/.test(caminho)) { f.el.src = urlDe('pc', f.real); return; }
    doc.documentElement.classList.add('gp-emb');
    const st = doc.createElement('style'); st.textContent = CSS[f.app]; doc.head.appendChild(st);
    const toast = (m, t) => App.toast(String(m), /erro|danger|error/.test(t || '') ? 'erro' : /aviso|warn/.test(t || '') ? 'aviso' : 'ok');
    if (f.app === 'pc') w.avisar = (m, t) => toast(m, t);
    else { w.showAlert = (m, t) => toast(m, t); if (typeof w.showToast === 'function') w.showToast = (m, t) => toast(m, t); }
    doc.addEventListener('click', (ev) => interceptar(ev, f, w), true);
    if (f.app === 'pc') w.addEventListener('hashchange', () => {
      const h = w.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (h && h !== f.real) { w.location.hash = '#/' + f.real; if (!f.oculto) irParaSecao('pc', h); }
    });
    const medir = () => {
      try {
        if (f.el.style.display === 'none' || !doc.body || !doc.body.clientWidth) return; // seção fora da tela atual: mantém a altura
        const m = doc.querySelector('.main-content') || doc.body;
        const extra = f.app === 'pc' ? 0 : 0;
        const a = Math.max(160, Math.ceil(m.getBoundingClientRect().bottom + (f.modal ? w.scrollY : 0) + 12 + extra));
        if (!f.modal && Math.abs(a - f.altura) > 2) { f.altura = a; if (!f.oculto) { const c = App.p.config || (App.p.config = {}); (c.secoesAlturas || (c.secoesAlturas = {}))[`${f.app}:${f.pag}`] = a; guardarAlturaVista(`${f.app}:${f.pag}`, a); } }
      } catch (e) { /* página trocando */ }
    };
    try { new w.ResizeObserver(medir).observe(doc.body); } catch (e) { /* sem ResizeObserver */ }
    f.medir = medir; medir();
    clearInterval(f.vigia);
    const verModal = () => { const tem = temModal(doc, w); if (tem !== f.modal) trocarModal(f, w, tem); };
    try { new w.MutationObserver(() => { if (!f.agModal) { f.agModal = true; w.requestAnimationFrame(() => { f.agModal = false; verModal(); }); } }).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'open', 'hidden'] }); } catch (e) { /* sem MutationObserver */ }
    f.vigia = setInterval(() => { medir(); verModal(); }, 1000);
    f.carregado = true;
    const lugar = document.querySelector(`.app-lugar[data-chave="${k}"] .app-carregando`); if (lugar) lugar.remove();
    try {
      if (f.app === 'qfd') await aoCarregarQfd(f, w);
      else await aoCarregarPc(f, w);
      atualizarStatus(f.app);
    } catch (e) { console.error('seção', k, e); App.toast(`Seção ${esc(f.pag)}: ${esc(e.message)}`, 'erro', 9000); }
  }

  function interceptar(ev, f, w) {
    const a = ev.target.closest && ev.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    const href = a.getAttribute('href') || '';
    if (f.app === 'pc') {
      if (href.startsWith('#/')) { const p = href.slice(2).split('?')[0]; if (p !== f.pag) { ev.preventDefault(); ev.stopPropagation(); irParaSecao('pc', p); } }
      else if (/qfd/i.test(href) && !/^https?:/i.test(href.replace(location.origin, ''))) { ev.preventDefault(); irParaSecao('qfd', QFD_PAGS[0][0]); }
      return;
    }
    if (href === '#' || href.startsWith('#') || /^javascript:/i.test(href)) return;
    let u; try { u = new URL(a.href); } catch (e) { return; }
    if (u.origin !== location.origin) return;
    const p = norm(u.pathname);
    if (/projetoconceitual/.test(p)) { ev.preventDefault(); ev.stopPropagation(); irParaSecao('pc', (u.hash.replace(/^#\/?/, '').split('?')[0]) || 'inicio'); return; }
    const m = p.match(/\/pages\/([a-z0-9-]+)\.html$/);
    if (m) { ev.preventDefault(); ev.stopPropagation(); irParaSecao('qfd', m[1]); return; }
    if (/\/index\.html$|\/qfd\/?$/.test(p)) { ev.preventDefault(); ev.stopPropagation(); irParaSecao('qfd', QFD_PAGS[0][0]); }
  }

  /** Janela, caixa de diálogo ou guia aberta dentro da seção. */
  function temModal(doc, w) {
    const vw = w.innerWidth || 1;
    for (const el of doc.querySelectorAll('[class*="modal"], [class*="overlay"], [class*="popup"], [role="dialog"], [aria-modal="true"], .tour, dialog[open], .esb-fundo')) {
      const cs = w.getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) continue;
      if (cs.position !== 'fixed' && !(el.matches('[role="dialog"], [aria-modal="true"], dialog[open]') && el.closest('[style*="fixed"], .esb-fundo, .tour'))) continue;
      if (el.getBoundingClientRect().width >= vw * 0.4) return true;
    }
    return false;
  }
  /**
   * Com uma janela aberta na seção, a seção passa a ocupar a parte visível da tela (com rolagem própria), para a janela
   * aparecer onde se está olhando; ao fechar, volta a ter a altura do conteúdo.
   */
  function trocarModal(f, w, on) {
    const l = document.querySelector(`.app-lugar[data-chave="${f.app}:${f.pag}"]`);
    f.modal = on;
    w.document.documentElement.classList.toggle('gp-modal', on);
    if (on && l) {
      const r = l.getBoundingClientRect(), topo = topoAltura();
      f.el.style.position = 'fixed'; f.el.style.top = topo + 'px'; f.el.style.left = r.left + 'px'; f.el.style.width = r.width + 'px'; f.el.style.height = (window.innerHeight - topo) + 'px';
      f.el.style.zIndex = '60';
      w.scrollTo(0, Math.max(0, topo - r.top));
    } else { w.scrollTo(0, 0); f.el.style.zIndex = ''; }
  }
  const topoAltura = () => { const t = document.querySelector('.topo'); return t ? Math.max(0, t.getBoundingClientRect().bottom) : 0; };

  // ---------------------------------------------------------------- laço: cria as seções perto da tela e põe cada iframe no seu lugar
  function tick() {
    if (!App.p) return;
    if (S.projeto !== projId()) { destruirTudo(); S.projeto = projId(); }
    const lugares = {};
    document.querySelectorAll('.app-lugar').forEach((l) => { lugares[l.dataset.chave] = l; });
    if (!S.criando) ['qfd', 'pc'].forEach((app) => {
      if (S.criando || !podeCriar(app) || S.frames[`${app}:__st`] || !document.querySelector(`.app-secao[id^="sec-${app}-"]`)) return;
      if (app === 'pc' && !S.pcPronto) return;
      if (!Object.values(S.frames).some((f) => f.app === app)) criar(`${app}:__st`);
    });
    if (!S.criando) {
      const vh = window.innerHeight;
      for (const k in lugares) {
        if (S.frames[k] || !podeCriar(k.split(':')[0])) continue;
        const r = lugares[k].getBoundingClientRect();
        if (r.top < vh * 2.5 && r.bottom > -vh * 1.5) { criar(k); break; }
      }
    }
    descarregarLonge(lugares);
    const sx = window.scrollX, sy = window.scrollY;
    for (const k in S.frames) {
      const f = S.frames[k], l = lugares[k], st = f.el.style;
      if (!l || f.oculto) { if (st.display !== 'none') st.display = 'none'; continue; }
      if (f.altura && !f.modal && Math.abs(parseFloat(l.style.height) - f.altura) > 1) {
        const antes = parseFloat(l.style.height) || 0, topoL = l.getBoundingClientRect().bottom; // seção inteira acima da tela
        l.style.height = f.altura + 'px';
        if (!S.alvo && topoL < topoAltura() && antes) window.scrollBy(0, f.altura - antes); // compensa a rolagem
      }
      const r = l.getBoundingClientRect();
      if (f.modal) { const topo = topoAltura(); st.position = 'fixed'; st.top = topo + 'px'; st.left = r.left + 'px'; st.width = r.width + 'px'; st.height = (window.innerHeight - topo) + 'px'; }
      else { st.position = 'absolute'; st.top = (r.top + sy) + 'px'; st.left = (r.left + sx) + 'px'; st.width = r.width + 'px'; st.height = r.height + 'px'; }
      if (st.display === 'none') st.display = '';
    }
  }
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((t) => window.addEventListener(t, () => { S.alvo = null; }, { passive: true }));
  function seguirAlvo() {
    if (!S.alvo) return;
    if (Date.now() > S.alvo.ate) { S.alvo = null; return; }
    const l = document.getElementById(S.alvo.id); if (!l) return;
    const t = l.getBoundingClientRect().top - 66;
    if (Math.abs(t) > 4) window.scrollTo({ top: window.scrollY + t });
  }
  /**
   * Peso (todoQA 68): cada seção carrega o sistema inteiro. Acima do limite (8; 3 no celular), descarrega a seção mais
   * longe da tela (guarda a altura) — primeiro as de outras fases; ela volta a carregar quando se chega perto.
   */
  function descarregarLonge(lugares) {
    const agora = Date.now(); if (agora - (S.ultDescarga || 0) < 800) return;
    const limite = window.innerWidth < 860 ? 3 : 8, vh = window.innerHeight;
    const vivos = Object.entries(S.frames).filter(([, f]) => !f.oculto);
    if (vivos.length <= limite) return;
    const cand = vivos.filter(([k, f]) => !f.modal && f.el !== document.activeElement && k !== S.pcInitFrame && (f.carregado || !lugares[k]))
      .map(([k, f]) => { const l = lugares[k]; if (!l) return { k, d: Infinity }; const r = l.getBoundingClientRect(); return { k, d: r.bottom < 0 ? -r.bottom : r.top > vh ? r.top - vh : 0 }; })
      .filter((x) => x.d > vh * 3).sort((a, b) => b.d - a.d); // fora da faixa em que as seções são criadas (sem vaivém)
    if (!cand.length) return;
    const k = cand[0].k, f = S.frames[k];
    clearInterval(f.vigia); f.el.remove(); delete S.frames[k]; S.ultDescarga = agora;
  }
  (function laco() { try { tick(); seguirAlvo(); } catch (e) { console.error(e); } requestAnimationFrame(laco); })();

  // ---------------------------------------------------------------- QFD
  async function aoCarregarQfd(f, w) {
    const db = glob(w, 'qfdDB'); if (!db) return;
    if (S.qfdNovo) { S.qfdNovo = false; const d = db.loadData(); if (d) { d.projeto = Object.assign({}, d.projeto || {}, { nome: App.p.projeto.nome }); db.saveData(d); } }
    empurrarConsolidacao(w);
  }
  /** Requisitos de cliente que vêm da consolidação dos questionários entram no QFD (só acrescenta; nada é apagado). */
  /** Semelhança simples entre dois textos (palavras de 4+ letras com o mesmo começo), de 0 a 1. */
  function parecido(a, b) {
    const t = (x) => [...new Set(norm(x).split(/[^a-z0-9]+/).filter((w) => w.length >= 4))];
    const A = t(a), B = t(b); if (!A.length || !B.length) return 0;
    const n = A.filter((w) => B.some((v) => v.slice(0, 5) === w.slice(0, 5))).length;
    return n / Math.min(A.length, B.length);
  }
  /**
   * Necessidades da consolidação dos questionários → requisitos de cliente do QFD. As claramente novas entram sozinhas;
   * as parecidas com um requisito que já está no QFD esperam a equipe decidir (aviso no topo das seções do QFD);
   * as que saíram da consolidação mas continuam no QFD são avisadas (nada é apagado sozinho).
   */
  function empurrarConsolidacao(w) {
    const e = App.p.produto && App.p.produto.etapas.informacional; if (!e || !window.nedipNecessidadesDaConsolidacao) return;
    const db = glob(w, 'qfdDB'); if (!db) return;
    const d = db.loadData(); if (!d) return;
    const nec = nedipNecessidadesDaConsolidacao(e.consolidacao || []).filter((x) => norm(x.descricao));
    const atuais = nec.map((n) => norm(n.descricao));
    const rcs = d.requisitosCliente || [], noQfd = rcs.map((r) => norm(r.descricao)), tem = new Set(noQfd);
    // primeira vez com o QFD já preenchido: o que já está na consolidação é tomado como já considerado
    if (!Array.isArray(e.consolidacaoNoQfd)) e.consolidacaoNoQfd = noQfd.length ? atuais.slice() : [];
    const feitos = new Set(e.consolidacaoNoQfd);
    const novos = nec.filter((x) => !feitos.has(norm(x.descricao)) && !tem.has(norm(x.descricao)));
    let entraram = 0; const pendentes = [];
    novos.forEach((x) => {
      const melhor = rcs.map((r) => ({ r, k: parecido(x.descricao, r.descricao) })).sort((a, b) => b.k - a.k)[0];
      if (melhor && melhor.k >= 0.5) pendentes.push({ descricao: x.descricao, parecido: melhor.r.descricao });
      else { db.addRequisitoCliente(x.descricao, 'Da consolidação dos questionários'); e.consolidacaoNoQfd.push(norm(x.descricao)); entraram++; }
    });
    S.consolPendentes = pendentes;
    S.consolSairam = rcs.filter((r) => /consolida/i.test(r.observacao || '') && !atuais.includes(norm(r.descricao))).map((r) => r.descricao);
    if (entraram) {
      App.marcarSujo(true);
      App.toast(`${entraram} requisito(s) de cliente novo(s) da consolidação dos questionários entrou(aram) no QFD (seção 5.1). Faça a comparação (5.2) com eles.`, 'ok', 8000);
      // as seções do QFD se atualizam pelo aviso de mudança (syncQfd)
    }
  }
  function avisoConsolidacao() {
    const p = S.consolPendentes || [], s2 = S.consolSairam || [];
    if (!p.length && !s2.length) return '';
    return `<div class="aviso-box" style="margin-top:8px">${p.length ? `<b>${p.length}</b> necessidade(s) nova(s) da consolidação dos questionários parece(m) com requisitos que já estão no QFD. ` : ''}${s2.length ? `<b>${s2.length}</b> requisito(s) que vieram da consolidação não estão mais nela (continuam no QFD). ` : ''}<button class="btn pequeno" data-acao="sec-consol">Revisar</button></div>`;
  }
  App.acoes['sec-consol'] = () => {
    const p = S.consolPendentes || [], s2 = S.consolSairam || [];
    App.modal(`<h2>Consolidação dos questionários → QFD</h2>
      ${p.length ? `<p>Marque as que são necessidades diferentes e devem entrar no QFD como requisitos de cliente novos. As não marcadas ficam de fora (já estão representadas no QFD).</p>
      <table class="tab-edit"><thead><tr><th style="width:60px">Entra</th><th>Necessidade da consolidação</th><th>Parecida no QFD</th></tr></thead><tbody>
      ${p.map((x, i) => `<tr><td class="centro"><input type="checkbox" data-consol="${i}"></td><td>${esc(x.descricao)}</td><td class="muted">${esc(x.parecido)}</td></tr>`).join('')}</tbody></table>` : ''}
      ${s2.length ? `<h3>Saíram da consolidação</h3><p class="muted">Continuam no QFD. Se não valem mais, apague na seção 5.1 (Requisitos de cliente).</p><ul>${s2.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="barra">${p.length ? '<button class="btn primario" data-acao="sec-consol-ok">Aplicar</button>' : ''}<button class="btn" data-acao="sec-consol-fechar">${p.length ? 'Decidir depois' : 'Fechar'}</button></div>`, true);
  };
  App.acoes['sec-consol-fechar'] = () => App.fecharModal();
  App.acoes['sec-consol-ok'] = () => {
    const p = S.consolPendentes || [], e = App.p.produto.etapas.informacional;
    const w = janelaDe('qfd'), db = w && glob(w, 'qfdDB'); if (!db) { App.toast('O QFD ainda está carregando.', 'aviso'); return; }
    let n = 0;
    $$('#modalCorpo input[data-consol]').forEach((c) => { const x = p[+c.dataset.consol]; if (!x) return; if (c.checked) { db.addRequisitoCliente(x.descricao, 'Da consolidação dos questionários'); n++; } e.consolidacaoNoQfd.push(norm(x.descricao)); });
    S.consolPendentes = []; App.fecharModal(); App.marcarSujo(true);
    App.toast(n ? `${n} requisito(s) de cliente entrou(aram) no QFD.` : 'Nenhuma entrou; as parecidas ficaram de fora.', 'ok');
    syncQfd(true); salvarSozinho(); App.render();
  };
  /**
   * Estado da técnica (todoQA 83): a aba Pesquisa do Gestão e o estado da técnica do QFD (A.2) se alimentam, sem
   * repetir (pela identificação): patentes de relevância alta/média e referências da Pesquisa vão ao QFD; patentes do
   * QFD que não estão na Pesquisa entram lá. Nada é apagado sozinho.
   */
  const idRef = (x) => norm(x).replace(/[^a-z0-9]/g, '');
  function empurrarPesquisa(w) {
    const pq = App.p.pesquisa; if (!pq) return;
    const db = glob(w, 'qfdDB'); if (!db || typeof db.addReferencia !== 'function') return;
    const d = db.loadData(); if (!d) return;
    const noQfd = new Set((d.referencias || []).map((r) => idRef(r.identificacao || r.titulo)));
    const feitos = new Set(pq.noQfd || []);
    let n = 0;
    (pq.patentes || []).filter((x) => x.numero && x.relevancia !== 'baixa').forEach((x) => {
      const k = idRef(x.numero); if (!k || feitos.has(k) || noQfd.has(k)) return;
      db.addReferencia({ tipo: 'patente', identificacao: x.numero, titulo: x.titulo || x.numero, link: x.link || '', resumo: [x.titular && 'Titular: ' + x.titular, x.fto && x.fto !== 'verificar' && 'Liberdade de operação: ' + x.fto, x.observacao].filter(Boolean).join('; ') });
      feitos.add(k); n++;
    });
    const tipoQfd = { norma: 'norma', patente: 'patente', site: 'site', artigo: 'artigo', livro: 'artigo', capitulo: 'artigo', evento: 'artigo', tese: 'artigo' };
    (pq.referencias || []).filter((r) => r.titulo).forEach((r) => {
      const k = idRef(r.id + ' ' + r.titulo); if (feitos.has(k) || noQfd.has(idRef(r.titulo))) return;
      db.addReferencia({ tipo: tipoQfd[r.tipo] || 'outro', identificacao: r.id, titulo: r.titulo, link: r.url || r.link || '', resumo: [r.autores, r.ano, r.veiculo].filter(Boolean).join(' · ') });
      feitos.add(k); n++;
    });
    pq.noQfd = [...feitos];
    if (n) { App.marcarSujo(true); App.toast(`${n} item(ns) da aba Pesquisa entrou(aram) no estado da técnica do QFD (A.2).`, 'ok', 6000); }
  }
  function pesquisaDoQfd(dados) {
    const pq = App.p.pesquisa; if (!pq || !window.Pesquisa) return;
    const tem = new Set((pq.patentes || []).map((x) => idRef(x.numero)));
    let n = 0;
    (dados.referencias || []).filter((r) => r.tipo === 'patente' && (r.identificacao || '').trim()).forEach((r) => {
      const k = idRef(r.identificacao); if (tem.has(k)) return;
      pq.patentes.push(Object.assign(Pesquisa.novaPatente(), { numero: r.identificacao, titulo: r.titulo || '', link: r.link || '', observacao: 'Do estado da técnica do QFD' + (r.resumo ? ': ' + r.resumo : '') }));
      tem.add(k); (pq.noQfd || (pq.noQfd = [])).push(k); n++;
    });
    return n;
  }
  /** O QFD mudou numa seção: critérios de qualidade e requisitos de cliente do Gestão acompanham (o que a importação fazia). */
  function aplicarQfd(dados) {
    const r = Nucleo.importarQfd(dados), m = Nucleo.mesclarQfd(App.p.qualidade, r.itens);
    App.p.qualidade = m.itens;
    const primeiraVez = !App.p.qfdDados;
    App.p.qfdDados = dados;
    if (primeiraVez && window.Qfd && r.itens.length) {
      const a = Qfd.analisar(dados), disp = Qfd.SECOES.map(([s]) => s).filter((s) => Qfd.disponivel(a, s).ok);
      (App.p.produto ? App.p.produto.etapas.informacional.macros : []).forEach((uid) => { const mm = App.p.macroentregas.find((x) => x.uid === uid); if (mm && !App.qfdBlocoDaMacro(mm)) disp.forEach((s) => App.qfdAlternar(uid, s, true)); });
    }
    if (App.p.produto) {
      const inf = App.p.produto.etapas.informacional;
      if (r.clientes.length) inf.necessidades = r.clientes.map((c) => Object.assign(c, { peso: Math.round(c.peso * 1e4) / 1e4, origem: 'QFD' }));
      if (r.itens.length) inf.recomendacoes.inf_qfd = true;
      if (inf.status === 'não iniciada' && r.itens.length) inf.status = 'em andamento';
    }
    const o = App.p.qfdOrigem || {};
    try { pesquisaDoQfd(dados); } catch (e) { console.warn('QFD → Pesquisa', e); }
    App.p.qfdOrigem = Object.assign({}, o, { arquivo: 'QFD do projeto (projeto informacional)', importadoEm: Nucleo.agoraIso(), requisitosProjeto: r.meta.requisitosProjeto, requisitosCliente: r.meta.requisitosCliente, schemaVersion: r.meta.schemaVersion });
    App.marcarSujo(true);
    if (App.agendarAnalise) App.agendarAnalise();
  }
  /**
   * Atualiza uma seção do QFD com os dados novos SEM recarregar (todoQA 66): chama as funções de desenho da própria
   * página (as mesmas da abertura, sem religar eventos). Se a página não tiver, recarrega.
   */
  const REDESENHO_QFD = {
    'requisitos-cliente': ['loadRequisitos'], 'comparacao-cliente': ['loadRequisitos', 'setupComparison', 'updateStatus'],
    'requisitos-projeto': ['loadRequisitos'], 'correlacao-projeto': ['loadRequisitos', 'setupCorrelation', 'updateStatus'],
    'matriz-qfd': ['loadData', 'setupMatrix'], especificacoes: ['loadPage'], 'avaliacao-competitiva': ['loadPage'],
    'atendimento-requisitos': ['loadPage'], fechamento: ['loadPage', 'renderListaRequisitos'], ideias: ['loadPage'], referencias: ['loadPage'] };
  function redesenharQfd(f) {
    const w = f.el.contentWindow, fns = REDESENHO_QFD[f.real] || [];
    try {
      if (!fns.length || fns.some((n) => typeof w[n] !== 'function')) throw new Error('sem redesenho');
      fns.forEach((n) => w[n]());
      if (typeof w.atualizarBotaoConcluir === 'function') w.atualizarBotaoConcluir();
    } catch (e) { f.carregado = false; try { w.location.reload(); } catch (er) { /* ok */ } }
  }
  function syncQfd(forcar) {
    if (S.bloqueado) return;
    if (S.prep.qfd !== projId() || lerLS('gp_dono_qfd') !== projId()) return;
    const txt = lerLS('qfd_data'); if (!txt) return;
    const k = semMeta(txt); if (k === S.chave.qfd && !forcar) return;
    S.chave.qfd = k;
    let d; try { d = JSON.parse(txt); } catch (e) { return; }
    try { aplicarQfd(d); } catch (e) { console.error('QFD → Gestão', e); }
    Object.values(S.frames).filter((f) => f.app === 'qfd' && f.carregado && f.el !== document.activeElement).forEach(redesenharQfd);
    if (App.p.produto && App.p.produto.pcDados && !pcJanela()) {
      // o conceitual não está aberto: abre-o escondido só para receber o QFD (todoQA 74)
      if (S.prep.pc !== projId() && podeUsar()) prepararPc();
      if (!S.frames['pc:__st'] && podeCriar('pc')) criar('pc:__st');
    } else qfdParaPc(d, true);
    setTimeout(() => atualizarStatus('qfd'), 1500);
    salvarSozinho(3000, false);
    redesenhar();
  }

  // ---------------------------------------------------------------- projeto conceitual e preliminar
  function janelaDe(app) {
    if (app === 'pc') return pcJanela();
    const fs = Object.values(S.frames).filter((f) => f.app === 'qfd' && f.carregado), at = fs.find((f) => f.el === document.activeElement) || fs[0];
    try { const w = at && at.el.contentWindow; return w && glob(w, 'qfdDB') ? w : null; } catch (e) { return null; }
  }
  /** Situação de cada etapa (percentual, concluída, marcada) com as contas dos próprios sistemas. */
  function atualizarStatus(app) {
    const w = janelaDe(app); if (!w) return;
    const novo = {};
    const pctDe = (x) => { const m = String(x.resumo || '').match(/(\d+(?:[.,]\d+)?)\s*%/); return m ? Math.round(parseFloat(m[1].replace(',', '.'))) : x.estado === 'feito' ? 100 : x.estado === 'vazio' ? 0 : null; };
    try {
      if (app === 'qfd') {
        const st = w.statusEtapasQFD(), db = glob(w, 'qfdDB');
        QFD_PAGS.forEach(([p]) => { const x = st[p]; if (!x) return; const marcada = db.isEtapaConcluida(p) && !!x.marcada;
          novo['qfd:' + p] = { estado: x.estado, resumo: x.resumo, feito: x.estado === 'feito', marcada, pct: marcada ? pctDe(Object.assign({}, x, { estado: 'andamento' })) : pctDe(x) }; });
      } else {
        const pc = glob(w, 'PC'), st = w.statusEtapas(pc.p);
        PC_CONC.concat(PC_PRE).forEach(([p]) => { const x = st[p]; if (!x) return; const marcada = (pc.p.etapasConcluidas || []).includes(p) && !!x.marcada;
          novo['pc:' + p] = { estado: x.estado, resumo: x.resumo, feito: x.estado === 'feito', marcada, pct: pctDe(marcada ? Object.assign({}, x, { estado: 'andamento' }) : x), semConclusao: p === 'relatorio' }; });
      }
    } catch (e) { console.warn('situação das etapas', e); return; }
    const antes = JSON.stringify(Object.fromEntries(Object.entries(S.st).filter(([k]) => k.startsWith(app + ':'))));
    Object.keys(S.st).filter((k) => k.startsWith(app + ':')).forEach((k) => delete S.st[k]);
    Object.assign(S.st, novo);
    if (JSON.stringify(novo) !== antes) redesenhar();
  }
  const pcFrames = () => Object.values(S.frames).filter((f) => f.app === 'pc' && f.carregado);
  function pcJanela() {
    const fs = pcFrames(), at = fs.find((f) => f.el === document.activeElement) || fs[0];
    try { const w = at && at.el.contentWindow; return w && glob(w, 'PC') && glob(w, 'PC').p ? w : null; } catch (e) { return null; }
  }
  async function aoCarregarPc(f, w) {
    const pc = glob(w, 'PC');
    if (S.pcInitFrame === `pc:${f.pag}` && !S.pcPronto) {
      await esperar(() => glob(w, 'PC') && glob(w, 'PC').p && w.lerZipOuJson);
      if (S.pcInit === 'zip') {
        const anx = anexoPc(), b = anx ? await App.arm.lerArquivo(anx.arquivo) : null;
        if (!b) throw new Error('o projeto conceitual anexo não foi encontrado na pasta do projeto');
        const arq = new w.File([new w.Uint8Array(await b.arrayBuffer())], anx.nome || 'projeto-conceitual.zip', { type: 'application/zip' });
        const { dados } = await w.lerZipOuJson(arq);
        pc.substituir(w.normalizarProjeto(dados));
      } else if (S.pcInit === 'qfd') {
        pc.substituir(w.criarProjetoVazio());
        pc.p.projeto.nome = App.p.projeto.nome;
        w.importarQFD(pc.p, w.JSON.parse(JSON.stringify(App.p.qfdDados)), 'QFD do projeto');
        if (typeof w.preencherTudo === 'function') w.preencherTudo(pc.p);
        pc.salvar('qfd');
      }
      if (w.location.hash !== '#/' + f.real) w.location.hash = '#/' + f.real;
      if (w.renderPagina) w.renderPagina();
      S.pcPronto = true; S.pcInit = '';
      syncPc(true);
      return;
    }
    if (S.pcImagens) { // outro computador: as fotos do projeto vêm do ZIP anexo
      S.pcImagens = false;
      const anx = anexoPc(), b = anx ? await App.arm.lerArquivo(anx.arquivo) : null;
      if (b) { try { await w.lerZipOuJson(new w.File([new w.Uint8Array(await b.arrayBuffer())], anx.nome, { type: 'application/zip' })); if (w.renderPagina) w.renderPagina(true); } catch (e) { console.warn('fotos do projeto conceitual', e); } }
    }
    // o QFD do projeto mudou desde a última vez: o projeto conceitual recebe (mantém o que já foi feito)
    if (pc && pc.p && App.p.qfdDados && semMeta(pc.p.qfdBackup) !== semMeta(App.p.qfdDados)) qfdParaPc(App.p.qfdDados);
    if (S.pcPendenteSync) syncPc(true);
  }
  function qfdParaPc(d, avisar) {
    const w = pcJanela(); if (!w) return;
    const pc = glob(w, 'PC'); if (!pc || !pc.p || !d) return;
    if (semMeta(pc.p.qfdBackup) === semMeta(d)) return;
    try { w.importarQFD(pc.p, w.JSON.parse(JSON.stringify(d)), 'QFD do projeto'); pc.salvar('qfd'); if (w.renderPagina) w.renderPagina(true);
      if (avisar) { clearTimeout(S.timers.avisoPc); S.timers.avisoPc = setTimeout(() => App.toast('O projeto conceitual recebeu as mudanças do QFD (especificações e necessidades).', 'ok', 5000), 800); }
    } catch (e) { console.error('QFD → projeto conceitual', e); }
  }
  function syncPc(forcar) {
    if (S.bloqueado) return;
    if (S.prep.pc !== projId() || lerLS('gp_dono_pc') !== projId()) return;
    const txt = lerLS('pc_projeto'); if (!txt) return;
    const k = semMeta(txt); if (k === S.chave.pc && !forcar && !S.pcPendenteSync) return;
    S.chave.pc = k;
    let d; try { d = JSON.parse(txt); } catch (e) { return; }
    App.p.produto.pcDados = d; S.pcZipSujo = true;
    const w = pcJanela();
    if (w) {
      try {
        const pc = glob(w, 'PC');
        if ((pc.p.estruturas || []).length && typeof w.exportarParaGestao === 'function') Nucleo.importarConceitual(App.p, clone(w.exportarParaGestao(pc.p)));
        S.pcPendenteSync = false;
      } catch (e) { console.error('projeto conceitual → Gestão', e); }
    } else S.pcPendenteSync = true;
    App.marcarSujo(true);
    atualizarStatus('pc');
    salvarSozinho(3000, false);
    redesenhar();
  }
  /** Ao salvar o Gestão: o ZIP do projeto conceitual (com as fotos) vai para a pasta do projeto, anexo à fase conceitual. */
  async function guardarZipPc() {
    if (!S.pcZipSujo || !App.arm || !App.p.produto.pcDados) return;
    const w = pcJanela(); if (!w || typeof w.gerarZipDoProjeto !== 'function') return;
    const b0 = await w.gerarZipDoProjeto(glob(w, 'PC').p), blob = new Blob([await b0.arrayBuffer()], { type: 'application/zip' });
    const anx = anexoPc(), cam = anx && /^produto\/conceitual\//.test(anx.arquivo) ? anx.arquivo : 'produto/conceitual/projeto-conceitual.zip';
    await App.arm.gravarArquivo(cam, blob);
    const e = App.p.produto.etapas.conceitual;
    e.anexos = (e.anexos || []).filter((a) => a.arquivo !== cam);
    e.anexos.push({ arquivo: cam, nome: cam.split('/').pop(), descricao: 'Projeto conceitual e preliminar completo, com fotos e diagramas (abre também no Sistema de Projeto Conceitual)', data: hojeISO(), tamanho: blob.size });
    S.pcZipSujo = false;
  }
  const salvarBase = App.salvar;
  App.salvar = async function () { try { await guardarZipPc(); } catch (e) { console.error('ZIP do projeto conceitual', e); } return salvarBase.apply(this, arguments); };

  function esperar(cond, ms = 10000) {
    return new Promise((ok, falha) => { const t0 = Date.now(); (function v() { let r = false; try { r = cond(); } catch (e) { r = false; } if (r) ok(r); else if (Date.now() - t0 > ms) falha(new Error('o sistema demorou a carregar')); else setTimeout(v, 120); })(); });
  }
  /** Redesenha o Gestão sem atrapalhar quem está digitando num campo do próprio Gestão. */
  function redesenhar() {
    const a = document.activeElement;
    if (a && a.closest && a.closest('#conteudo') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { S.redesenharDepois = true; return; }
    App.render();
  }
  document.addEventListener('focusout', () => { if (S.redesenharDepois) { S.redesenharDepois = false; setTimeout(() => { const a = document.activeElement; if (!(a && a.closest && a.closest('#conteudo') && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) App.render(); else S.redesenharDepois = true; }, 50); } });

  window.addEventListener('storage', (ev) => {
    if (!App.p) return;
    if (ev.key === TRAVA && !S.bloqueado && (S.prep.qfd || S.prep.pc)) { // outra aba passou a usar as seções
      const t = travaDeOutra(); if (t) { S.bloqueado = t; destruirTudo(); S.projeto = projId(); redesenhar(); }
      return;
    }
    if (ev.key === 'qfd_data') { clearTimeout(S.timers.qfd); S.timers.qfd = setTimeout(syncQfd, 700); }
    if (ev.key === 'pc_projeto') { clearTimeout(S.timers.pc); S.timers.pc = setTimeout(() => syncPc(false), 1200); }
  });

  // ---------------------------------------------------------------- ao desenhar: prepara os dados quando a fase mostra seções
  const renderBase = App.render;
  App.render = function () {
    renderBase.apply(this, arguments);
    try {
      if (!App.p) return;
      if (S.projeto !== projId()) { destruirTudo(); S.projeto = projId(); }
      if (document.querySelector('.app-secao[id^="sec-qfd-"]') && S.prep.qfd !== projId() && podeUsar()) prepararQfd();
      if (document.querySelector('.app-secao[id^="sec-pc-"]') && S.prep.pc !== projId() && podeUsar()) prepararPc();
      // a consolidação dos questionários mudou: os novos requisitos de cliente vão para o QFD
      const fq = Object.values(S.frames).find((f) => f.app === 'qfd' && f.carregado);
      if (fq) { empurrarConsolidacao(fq.el.contentWindow); empurrarPesquisa(fq.el.contentWindow); }
      aplicarSoLeitura();
    } catch (e) { console.error('seções', e); }
  };
  /**
   * Quadros do Gestão alimentados pelas seções ficam só para leitura (todoQA 65): o dado é editado num lugar só.
   * Ficam editáveis os campos que são só do Gestão (responsável e risco da FMEA, PDCA, valor medido, matriz de decisão…).
   */
  const SO_LEITURA = {
    informacional: [['Requisitos de cliente', 'qfd:requisitos-cliente', () => !!(App.p.qfdDados && (App.p.qfdDados.requisitosCliente || []).length)]],
    conceitual: [['Função global', 'pc:funcao-global'], ['Estrutura de funções e princípios de solução', 'pc:estrutura'],
      ['Desdobramento das especificações em funções', 'pc:analises'], ['Concepções alternativas', 'pc:selecao']],
  };
  function soLeitura(card, chave) {
    if (card.classList.contains('so-leitura')) return;
    card.classList.add('so-leitura');
    card.querySelectorAll('input, textarea, select').forEach((x) => { if (x.type === 'checkbox' || x.tagName === 'SELECT') x.disabled = true; else x.readOnly = true; });
    card.querySelectorAll('[data-acao="add-linha"], [data-acao="rem-linha"], [data-acao="mover"]').forEach((x) => { x.hidden = true; });
    const [app, pag] = chave.split(':'), lista = app === 'qfd' ? QFD_PAGS : PC_CONC.concat(PC_PRE);
    const i = lista.findIndex(([p]) => p === pag), n = app === 'qfd' ? `5.${i + 1}` : `1.${PC_CONC.findIndex(([p]) => p === pag) + 1}`;
    const h = card.querySelector('h3');
    if (h) h.insertAdjacentHTML('afterend', `<p class="so-leitura-aviso">Preenchido sozinho pela seção ${n} (${esc((lista[i] || [, ''])[1])}). <a href="#" data-acao="sec-ir" data-chave="${chave}">Editar lá</a>.</p>`);
  }
  function aplicarSoLeitura() {
    if (!ativa() || App.aba !== 'produto') return;
    const regras = SO_LEITURA[App.etapaSel] || [];
    if (regras.length) $$('#conteudo .cartao').forEach((card) => {
      const t = (card.querySelector('h3') || {}).textContent || '';
      const r = regras.find(([titulo, , cond]) => t.trim().startsWith(titulo) && (!cond || cond()));
      if (r && (App.etapaSel !== 'conceitual' || App.p.produto.pcDados)) soLeitura(card, r[1]);
    });
    if (App.etapaSel === 'preliminar') { // FMEA: linhas vindas do conceitual (pc_) só para leitura, menos responsável e risco
      const fm = App.p.produto.etapas.preliminar.fmea || [];
      $$('#conteudo [data-path^="produto.etapas.preliminar.fmea."]').forEach((x) => {
        const m = x.dataset.path.match(/fmea\.(\d+)\.([a-zA-Z]+)$/); if (!m) return;
        const l = fm[+m[1]]; if (!l || !String(l.id).startsWith('pc_') || /^(responsavel|riscoId)$/.test(m[2])) return;
        if (x.tagName === 'SELECT') x.disabled = true; else x.readOnly = true;
        x.title = 'Vem do projeto conceitual/preliminar (seções acima): edite lá';
        const tr = x.closest('tr'); if (tr) { tr.classList.add('linha-so-leitura'); tr.querySelectorAll('[data-acao="rem-linha"]').forEach((b) => { b.hidden = true; }); }
      });
    }
  }
  // aba Pesquisa: mostra a ligação com o estado da técnica do QFD
  if (App.abas.pesquisa) {
    const rPesq = App.abas.pesquisa.render;
    App.abas.pesquisa.render = function () {
      const h = rPesq.apply(this, arguments);
      if (!ativa()) return h;
      const n = ((App.p.qfdDados || {}).referencias || []).length;
      return `<div class="info-box">Patentes (relevância alta ou média) e referências daqui entram sozinhas no <b>estado da técnica do QFD</b>, onde são ligadas aos requisitos; patentes cadastradas lá aparecem aqui. ${n ? `O QFD tem ${n} referência(s).` : ''} <button class="btn pequeno" data-acao="sec-ir" data-chave="qfd:referencias">Ver no projeto de produto (A.2)</button></div>` + h;
    };
  }
  App.secoesAtivas = ativa;
  window.SecoesApps = { QFD_PAGS, PC_CONC, PC_PRE, semMeta, mesmoQfd };
})();
