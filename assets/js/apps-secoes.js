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
  function base(app) {
    const cfg = app === 'qfd' ? CONFIG.urlQfd : CONFIG.urlConceitual, local = app === 'qfd' ? '../qfd/' : '../projetoconceitual/';
    try { const u = new URL(cfg, location.href); if (u.origin === location.origin) return new URL('./', u).href; } catch (e) { /* abaixo */ }
    return new URL(local, location.href).href;
  }
  const urlDe = (app, pag) => (app === 'qfd' ? `${base('qfd')}pages/${pag}.html?gp=1` : `${base('pc')}index.html?gp=1#/${pag}`);
  const faseDe = (app, pag) => (app === 'qfd' ? 'informacional' : PC_PRE.some(([p]) => p === pag) ? 'preliminar' : 'conceitual');

  // ---------------------------------------------------------------- seções na página
  /** Cartões das páginas de um sistema, numerados a partir de n0 (ex.: 5 → 5.1, 5.2…). */
  const listaDe = (app) => (app === 'qfd' ? QFD_PAGS : app === 'apoio' ? QFD_APOIO : app === 'pc-pre' ? PC_PRE : PC_CONC);
  /** Seções recolhidas: guardadas no projeto (config.secoesRecolhidas); as de apoio começam recolhidas. */
  const recolhidas = () => { const c = App.p.config || (App.p.config = {}); return c.secoesRecolhidas || (c.secoesRecolhidas = {}); };
  const estaRecolhida = (k, apoio) => { const r = recolhidas(); return k in r ? !!r[k] : !!apoio; };
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
        <button class="btn pequeno" data-acao="sec-todas" data-chaves="${chaves}" data-v="1">Recolher todas</button><button class="btn pequeno" data-acao="sec-todas" data-chaves="${chaves}" data-v="0">Abrir todas</button></div>
      <nav class="secoes-indice">${lista.map(([p, t], i) => `<a href="#" data-acao="sec-ir" data-chave="${ap}:${p}">${n0}.${i + 1} ${esc(t)}</a>`).join('')}</nav></div>`;
    h += lista.map(([p, t], i) => {
      const k = `${ap}:${p}`, f = S.frames[k], rec = estaRecolhida(k, apoio);
      return `<div class="cartao app-secao ${rec ? 'recolhida' : ''}" id="sec-${ap}-${p}">
        <div class="sec-topo"><button class="sec-alternar" data-acao="sec-alternar" data-chave="${k}" aria-expanded="${!rec}" title="${rec ? 'Abrir' : 'Recolher'}">${rec ? '▸' : '▾'}</button>
          <h3 data-acao="sec-alternar" data-chave="${k}">${n0}.${i + 1} ${esc(t)}</h3><span class="sec-direita">${estadoHtml(k)}${botaoConcluir(k)}</span></div>
        ${rec ? '' : `<div class="app-lugar" data-chave="${k}" style="height:${(f && f.altura) || (App.p.config.secoesAlturas || {})[k] || 640}px">${f && f.carregado ? '' : '<span class="muted app-carregando">Carregando…</span>'}</div>`}</div>`;
    }).join('');
    return h;
  };
  /** Recolher/abrir e concluir salvam o projeto sozinhos. */
  /** Salvamento rápido (só o JSON do projeto, sem nova versão no histórico, PDFs ou e-mails). */
  function salvarSozinho() {
    clearTimeout(S.timers.salvar);
    S.timers.salvar = setTimeout(async () => {
      if (!App.p || !App.arm || typeof App.arm.atualizarSemHistorico !== 'function') return;
      try {
        if (Nucleo.validar(App.p).length) return; // com erro de validação, fica para o Salvar
        try { await guardarZipPc(); } catch (e) { console.warn('ZIP do projeto conceitual', e); }
        await App.arm.atualizarSemHistorico(App.p, JSON.stringify(App.p, null, 2));
        App.marcarSujo(false); App.atualizarTopo && App.atualizarTopo();
      } catch (e) { console.error('salvar sozinho', e); App.toast('Não deu para salvar sozinho: ' + esc(e.message) + '. Use o botão Salvar.', 'aviso', 8000); }
    }, 300);
  }
  App.acoes['sec-alternar'] = (el) => {
    const k = el.dataset.chave, r = recolhidas(), apoio = QFD_APOIO.some(([p]) => `qfd:${p}` === k);
    r[k] = !estaRecolhida(k, apoio);
    App.marcarSujo(true); App.render(); salvarSozinho();
  };
  App.acoes['sec-todas'] = (el) => {
    const r = recolhidas(); el.dataset.chaves.split(',').forEach((k) => { r[k] = el.dataset.v === '1'; });
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
    const r = recolhidas(), k = `${app}:${pag}`;
    if (estaRecolhida(k, ehApoio)) { r[k] = false; App.marcarSujo(true); salvarSozinho(); }
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
  const podeCriar = (app) => (app === 'qfd' ? S.prep.qfd === projId() : S.prep.pc === projId() && (S.pcPronto || (S.pcInit && !S.pcInitFrame)));

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
      html.gp-emb .page-nav, html.gp-emb .proximo-passo-rodape, html.gp-emb .etapa-conclusao { display: none !important; }
      html.gp-emb, html.gp-emb body { background: transparent !important; overflow: hidden; }
      html.gp-emb .app-shell { display: block !important; min-height: 0 !important; }
      html.gp-emb .main-content { min-height: 0 !important; padding: 4px 0 8px !important; margin: 0 !important; }
      html.gp-emb .main-content .container { max-width: none !important; padding: 0 2px !important; }
      html.gp-emb.gp-modal, html.gp-emb.gp-modal body { overflow: auto; }`,
    pc: `html.gp-emb .topbar, html.gp-emb .sidebar, html.gp-emb .sidebar-toggle, html.gp-emb #etapa-nav, html.gp-emb .footer, html.gp-emb #aviso,
      html.gp-emb .card.comecar, html.gp-emb .cartao-nuvem, html.gp-emb .qfd-navegador, html.gp-emb [data-acao="baixar-zip"], html.gp-emb [data-acao="arm-salvar-completo"],
      html.gp-emb [data-acao="gestao-baixar"], html.gp-emb .titulo-num, html.gp-emb #etapa-conclusao { display: none !important; }
      html.gp-emb, html.gp-emb body { background: transparent !important; overflow: hidden; }
      html.gp-emb .app-corpo { display: block !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; }
      html.gp-emb .app-conteudo { margin: 0 !important; padding: 0 !important; min-height: 0 !important; }
      html.gp-emb .main-content { min-height: 0 !important; padding: 4px 2px 8px !important; margin: 0 !important; max-width: none !important; }
      html.gp-emb .etapa-cab, html.gp-emb .pagina-cab { margin-top: 0 !important; }
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
        if (!f.modal && Math.abs(a - f.altura) > 2) { f.altura = a; if (!f.oculto) { const c = App.p.config || (App.p.config = {}); (c.secoesAlturas || (c.secoesAlturas = {}))[`${f.app}:${f.pag}`] = a; } }
      } catch (e) { /* página trocando */ }
    };
    try { new w.ResizeObserver(medir).observe(doc.body); } catch (e) { /* sem ResizeObserver */ }
    f.medir = medir; medir();
    clearInterval(f.vigia);
    f.vigia = setInterval(() => { medir(); const tem = temModal(doc, w); if (tem !== f.modal) trocarModal(f, w, tem); }, 300);
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
    for (const el of doc.querySelectorAll('.modal, [role="dialog"], [aria-modal="true"], .tour, dialog[open], .esb-fundo')) {
      const cs = w.getComputedStyle(el);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length && (cs.position === 'fixed' || el.closest('[style*="fixed"]') || cs.position === 'absolute')) return true;
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
    const sx = window.scrollX, sy = window.scrollY;
    for (const k in S.frames) {
      const f = S.frames[k], l = lugares[k], st = f.el.style;
      if (!l || f.oculto) { if (st.display !== 'none') st.display = 'none'; continue; }
      if (f.altura && !f.modal && Math.abs(parseFloat(l.style.height) - f.altura) > 1) l.style.height = f.altura + 'px';
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
  (function laco() { try { tick(); seguirAlvo(); } catch (e) { console.error(e); } requestAnimationFrame(laco); })();

  // ---------------------------------------------------------------- QFD
  async function aoCarregarQfd(f, w) {
    const db = glob(w, 'qfdDB'); if (!db) return;
    if (S.qfdNovo) { S.qfdNovo = false; const d = db.loadData(); if (d) { d.projeto = Object.assign({}, d.projeto || {}, { nome: App.p.projeto.nome }); db.saveData(d); } }
    empurrarConsolidacao(w);
  }
  /** Requisitos de cliente que vêm da consolidação dos questionários entram no QFD (só acrescenta; nada é apagado). */
  function empurrarConsolidacao(w) {
    const e = App.p.produto && App.p.produto.etapas.informacional; if (!e || !window.nedipNecessidadesDaConsolidacao) return;
    const nec = nedipNecessidadesDaConsolidacao(e.consolidacao || []);
    const atuais = nec.map((n) => norm(n.descricao)).filter(Boolean);
    const antes = Array.isArray(e.consolidacaoNoQfd) ? e.consolidacaoNoQfd : null;
    if (antes && antes.length === atuais.length && antes.every((x, i) => x === atuais[i])) return;
    const db = glob(w, 'qfdDB'); if (!db) return;
    const d = db.loadData(); if (!d) return;
    const noQfd = (d.requisitosCliente || []).map((r) => norm(r.descricao)), tem = new Set(noQfd);
    // primeira vez com o QFD já preenchido: o que já está na consolidação é tomado como já considerado (evita duplicar com outras palavras)
    const base = antes || (noQfd.length ? atuais : []);
    const novos = nec.filter((x) => { const k = norm(x.descricao); return k && !base.includes(k) && !tem.has(k); });
    novos.forEach((x) => db.addRequisitoCliente(x.descricao, 'Da consolidação dos questionários'));
    e.consolidacaoNoQfd = atuais; App.marcarSujo(true);
    if (novos.length) { App.toast(`${novos.length} requisito(s) de cliente novo(s) da consolidação dos questionários entrou(aram) no QFD (seção 5.1). Faça a comparação (5.2) com eles.`, 'ok', 8000); try { w.location.reload(); } catch (er) { /* ok */ } }
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
    App.p.qfdOrigem = Object.assign({}, o, { arquivo: 'QFD do projeto (projeto informacional)', importadoEm: Nucleo.agoraIso(), requisitosProjeto: r.meta.requisitosProjeto, requisitosCliente: r.meta.requisitosCliente, schemaVersion: r.meta.schemaVersion });
    App.marcarSujo(true);
    if (App.agendarAnalise) App.agendarAnalise();
  }
  function syncQfd(forcar) {
    if (S.prep.qfd !== projId() || lerLS('gp_dono_qfd') !== projId()) return;
    const txt = lerLS('qfd_data'); if (!txt) return;
    const k = semMeta(txt); if (k === S.chave.qfd && !forcar) return;
    S.chave.qfd = k;
    let d; try { d = JSON.parse(txt); } catch (e) { return; }
    try { aplicarQfd(d); } catch (e) { console.error('QFD → Gestão', e); }
    Object.values(S.frames).filter((f) => f.app === 'qfd' && f.carregado && f.el !== document.activeElement).forEach((f) => { f.carregado = false; try { f.el.contentWindow.location.reload(); } catch (e) { /* ok */ } });
    qfdParaPc(d);
    setTimeout(() => atualizarStatus('qfd'), 1500);
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
    if (pc && pc.p && App.p.qfdDados && semMeta(pc.p.qfdBackup) !== semMeta(App.p.qfdDados) && !S.pcQfdFeito) { S.pcQfdFeito = true; qfdParaPc(App.p.qfdDados); }
    if (S.pcPendenteSync) syncPc(true);
  }
  function qfdParaPc(d) {
    const w = pcJanela(); if (!w) return;
    const pc = glob(w, 'PC'); if (!pc || !pc.p || !d) return;
    if (semMeta(pc.p.qfdBackup) === semMeta(d)) return;
    try { w.importarQFD(pc.p, w.JSON.parse(JSON.stringify(d)), 'QFD do projeto'); pc.salvar('qfd'); if (w.renderPagina) w.renderPagina(true); } catch (e) { console.error('QFD → projeto conceitual', e); }
  }
  function syncPc(forcar) {
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
      if (document.querySelector('.app-secao[id^="sec-qfd-"]') && S.prep.qfd !== projId()) prepararQfd();
      if (document.querySelector('.app-secao[id^="sec-pc-"]') && S.prep.pc !== projId()) prepararPc();
      // a consolidação dos questionários mudou: os novos requisitos de cliente vão para o QFD
      const fq = Object.values(S.frames).find((f) => f.app === 'qfd' && f.carregado);
      if (fq) empurrarConsolidacao(fq.el.contentWindow);
    } catch (e) { console.error('seções', e); }
  };
  App.secoesAtivas = ativa;
  window.SecoesApps = { QFD_PAGS, PC_CONC, PC_PRE, semMeta, mesmoQfd };
})();
