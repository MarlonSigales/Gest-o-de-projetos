/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/**
 * Apps integrados (todoQA 47): o Sistema QFD e o Sistema de Projeto Conceitual (conceitual + preliminar) abrem DENTRO do
 * Gestão, numa área de trabalho em tela cheia. São os próprios aplicativos (nada é refeito), então nenhuma função se perde.
 * Os três ficam em marlonsigales.github.io (mesma origem): o Gestão lê e escreve os dados do app aberto diretamente.
 *
 * - Ao abrir, o app recebe o projeto todo: o QFD deste projeto (ou um QFD novo) e o projeto conceitual anexo à fase (ou
 *   um novo, montado a partir do QFD). O que estava aberto no navegador fica guardado como reserva e pode voltar.
 * - "Trazer para o Gestão" atualiza o projeto: QFD → requisitos, especificações e qualidade; conceitual → funções,
 *   concepções, desdobramento, FMEA e lições, e o ZIP do projeto conceitual fica anexo à fase.
 * - Com um app aberto, a barra lateral do Gestão vira uma barra flutuante estreita (abre ao passar o mouse ou no ☰), para
 *   trabalhar com as duas barras laterais.
 * Só acrescenta: os botões antigos (abrir em outra aba, importar arquivo) continuam iguais.
 */
(function () {
  'use strict';
  const RESERVA = { qfd: 'gp_reserva_qfd', conceitual: 'gp_reserva_pc' };
  const APPS = {
    qfd: { nome: 'Sistema QFD', curto: 'QFD', url: () => CONFIG.urlQfd, local: '../qfd/index.html', chave: 'qfd_data' },
    conceitual: { nome: 'Sistema de Projeto Conceitual', curto: 'Projeto Conceitual', url: () => CONFIG.urlConceitual, local: '../projetoconceitual/index.html', chave: 'pc_projeto' },
  };
  const I = App.integrado = { app: '', etapa: '', visivel: false, assinatura: '', carregou: false, pendente: null };
  const norm = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const lerLS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravarLS = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };

  /** Endereço do app: o oficial, se estiver na mesma origem do Gestão; senão a pasta vizinha (cópia local/testes). */
  function enderecoApp(id, hash) {
    const a = APPS[id];
    let u;
    try { u = new URL(a.url(), location.href); if (u.origin !== location.origin) u = null; } catch (e) { u = null; }
    if (!u) u = new URL(a.local, location.href);
    if (hash) u.hash = hash;
    return u.href;
  }
  /** Variável global do app (const/let de topo não viram propriedade de window). */
  const glob = (w, nome) => { try { return w && w.eval(`typeof ${nome} !== 'undefined' ? ${nome} : undefined`); } catch (e) { return undefined; } };
  const janela = () => { const f = $('#integradoFrame'); try { return f && f.contentWindow && f.contentWindow.document ? f.contentWindow : null; } catch (e) { return null; } };

  // ---------------------------------------------------------------- dados do app aberto
  function qfdDoNavegador() { try { const d = JSON.parse(lerLS('qfd_data') || 'null'); return d && Array.isArray(d.requisitosProjeto) ? d : null; } catch (e) { return null; } }
  const idsQfd = (d) => new Set(((d && d.requisitosProjeto) || []).map((r) => r.id).filter(Boolean));
  /** O QFD do navegador é o deste projeto? (mesmos requisitos de projeto, pelo id) */
  function mesmoQfd(a, b) {
    const x = idsQfd(a), y = idsQfd(b);
    if (!x.size || !y.size) return false;
    let n = 0; x.forEach((id) => { if (y.has(id)) n++; });
    return n >= Math.min(x.size, y.size) * 0.5;
  }
  function pcDoNavegador() { try { const d = JSON.parse(lerLS('pc_projeto') || 'null'); return d && d.projeto ? d : null; } catch (e) { return null; } }
  function mesmoPc(pc) {
    if (!pc) return false;
    if (norm(pc.projeto.nome) && norm(pc.projeto.nome) === norm(App.p.projeto.nome)) return true;
    const q = idsQfd(App.p.qfdDados);
    return q.size > 0 && (pc.especificacoes || []).some((e) => q.has(e.idQFD));
  }
  /** Projeto conceitual anexo às fases conceitual/preliminar deste projeto (o mais recente). */
  function anexoPc() {
    const et = App.p.produto && App.p.produto.etapas;
    if (!et) return null;
    const todos = ['conceitual', 'preliminar'].flatMap((k) => ((et[k] || {}).anexos || []).map((a) => Object.assign({ etapa: k }, a)));
    return todos.filter((a) => /\.zip$/i.test(a.arquivo || '') && /conceitual/i.test(a.arquivo + ' ' + (a.descricao || ''))).sort((a, b) => String(b.data).localeCompare(String(a.data)))[0] || null;
  }
  function assinatura() {
    const w = janela();
    try {
      if (I.app === 'qfd') return (w && w.localStorage.getItem('qfd_data')) || lerLS('qfd_data') || '';
      if (w && glob(w, 'PC') && glob(w, 'PC').p) return JSON.stringify(glob(w, 'PC').p).length + '|' + ((glob(w, 'PC').p.metadata || {}).modificado || '');
    } catch (e) { /* app ainda carregando */ }
    return '';
  }
  const mudou = () => I.carregou && I.assinatura !== '' && assinatura() !== I.assinatura;

  // ---------------------------------------------------------------- abrir
  App.abrirIntegrado = function (id, etapa) {
    if (!App.p) return;
    if (I.app && I.app !== id && mudou()) {
      App.toast(`Há mudanças no ${APPS[I.app].curto} ainda não trazidas. <button class="btn pequeno" data-acao="int-trazer">Trazer para o Gestão</button>`, 'aviso', 12000);
    }
    I.etapa = etapa || (id === 'qfd' ? 'informacional' : 'conceitual');
    if (I.app === id && $('#integradoFrame')) { mostrar(true); if (id === 'conceitual') irPara(I.etapa); return; }
    // escolher o projeto que o app recebe
    if (id === 'qfd' && lugarQfdDisponivel()) { App.aba = 'produto'; App.etapaSel = 'informacional'; App.render(); return; } // o QFD fica na página do projeto informacional
    if (id === 'qfd') {
      const d = decisaoQfd();
      if (d.opcoes) return perguntar(id, d.texto, d.opcoes);
      return abrir(id, d.carga);
    }
    const nav = pcDoNavegador(), anx = anexoPc(), modoNuvem = lerLS('pc_modo') === 'nuvem';
    if (!mesmoPc(nav) || modoNuvem) {
      const opc = [];
      if (anx) opc.push(['int-carregar', `Abrir o projeto conceitual deste projeto (${esc(anx.nome)})`, 'primario']);
      if (App.p.qfdDados) opc.push(['int-novo', 'Começar um projeto conceitual novo a partir do QFD deste projeto', anx ? '' : 'primario']);
      if (nav || modoNuvem) opc.push(['int-manter', modoNuvem ? 'Continuar com o projeto que está no MEGA' : `Continuar com o do navegador (${esc(nav.projeto.nome || 'sem nome')})`]);
      if (opc.length > 1 || (opc.length === 1 && opc[0][0] !== 'int-manter')) return perguntar(id, `<p>${modoNuvem ? 'O Projeto Conceitual deste navegador está salvando no MEGA.' : nav ? `O projeto conceitual aberto neste navegador é outro (<b>${esc(nav.projeto.nome || 'sem nome')}</b>).` : 'Não há projeto conceitual aberto neste navegador.'} Qual abrir?</p>`, opc);
    }
    abrir(id, null);
  };

  /** Qual QFD abrir: o deste projeto, o que está no navegador ou um novo. Devolve {carga} (sem perguntar) ou {texto, opcoes}. */
  function decisaoQfd() {
    const nav = qfdDoNavegador(), proj = App.p.qfdDados, nomeNav = esc((nav && nav.projeto && nav.projeto.nome) || 'sem nome');
    if (proj && nav && mesmoQfd(nav, proj)) return { carga: null };
    if (proj && !nav) return { carga: 'projeto' };
    if (proj) return { texto: `<p>O QFD aberto neste navegador é de outro projeto (<b>${nomeNav}</b>). Abrir o QFD <b>deste projeto</b>${App.p.qfdOrigem && App.p.qfdOrigem.importadoEm ? ` (importado em ${esc(App.quandoCurto(App.p.qfdOrigem.importadoEm))})` : ''}?</p>`,
      opcoes: [['int-carregar', 'Abrir o QFD deste projeto', 'primario'], ['int-manter', `Continuar com o do navegador (${nomeNav})`]] };
    if (!nav) return { carga: 'novo' };
    if (!(nav.projeto || {}).nome || norm(nav.projeto.nome) === norm(App.p.projeto.nome)) return { carga: null };
    return { texto: `<p>Este projeto ainda não tem QFD. O QFD aberto neste navegador é <b>${nomeNav}</b>.</p>`,
      opcoes: [['int-novo', 'Começar um QFD novo para este projeto', 'primario'], ['int-manter', `Usar o QFD do navegador (${nomeNav})`]] };
  }
  const lugarQfdDisponivel = () => !!(App.p && App.p.produto && App.p.produto.fases && App.p.produto.fases.informacional !== false && window.nedipEtapasAtivas && nedipEtapasAtivas(App.p).some((x) => x.id === 'informacional'));
  const modoDe = (id) => (id === 'qfd' && $('#qfdLugar') ? 'embutido' : 'tela');

  function perguntar(id, texto, opcoes) {
    I.pedido = id;
    App.modal(`<h2>Abrir o ${esc(APPS[id].nome)} aqui</h2>${texto}
      <p class="muted">O que estiver aberto no ${esc(APPS[id].curto)} deste navegador e for trocado fica guardado como reserva; dá para voltar a ele no botão “Reserva” da barra do app.</p>
      <div class="barra" style="flex-direction:column;align-items:stretch">${opcoes.filter(Boolean).map(([a, r, c]) => `<button class="btn ${c || ''}" data-acao="${a}">${r}</button>`).join('')}
      <button class="btn" data-acao="fechar-modal-int">Cancelar</button></div>`);
  }
  App.acoes['fechar-modal-int'] = () => App.fecharModal();
  App.acoes['int-manter'] = (el) => { if (el && el.dataset.app) I.pedido = el.dataset.app; App.fecharModal(); abrir(I.pedido, null, modoDe(I.pedido)); };
  App.acoes['int-carregar'] = (el) => { if (el && el.dataset.app) I.pedido = el.dataset.app; App.fecharModal(); abrir(I.pedido, 'projeto', modoDe(I.pedido)); };
  App.acoes['int-novo'] = (el) => { if (el && el.dataset.app) I.pedido = el.dataset.app; App.fecharModal(); abrir(I.pedido, 'novo', modoDe(I.pedido)); };

  /** Guarda o que estava no app (para voltar depois). */
  function guardarReserva(id) {
    const atual = lerLS(APPS[id].chave);
    if (!atual) return;
    if (!gravarLS(RESERVA[id], JSON.stringify({ em: Nucleo.agoraIso(), texto: atual }))) App.toast('Sem espaço no navegador para a reserva: baixe o backup do app antes de trocar, se precisar dele.', 'aviso', 9000);
  }

  function abrir(id, carga, modo = 'tela') {
    I.modo = modo; I.app = id; I.anexo = ''; I.carregou = false; I.assinatura = ''; I.pendente = carga;
    if (carga && !(id === 'conceitual' && lerLS('pc_modo') === 'nuvem')) guardarReserva(id);
    let area = $('#integrado');
    if (!area) { document.body.insertAdjacentHTML('beforeend', '<section id="integrado" class="integrado oculto" aria-label="Aplicativo integrado"></section>'); area = $('#integrado'); }
    const hash = id === 'conceitual' && I.etapa === 'preliminar' ? '#/p-requisitos' : '';
    area.innerHTML = `<div class="int-barra">
        <span class="int-titulo"><b>${esc(APPS[id].nome)}</b> <span class="muted">· ${esc(App.p.projeto.nome || 'projeto')}</span></span>
        <span class="int-estado" id="intEstado"></span>
        <button class="btn primario" data-acao="int-trazer" title="Atualiza este projeto com o que foi feito no app">⬇ Trazer para o Gestão</button>
        ${lerLS(RESERVA[id]) ? '<button class="btn" data-acao="int-reserva" title="Volta ao que estava aberto no app antes de trocar">↺ Reserva</button>' : ''}
        <button class="btn" data-acao="int-aba" title="Abre o app em outra aba do navegador">↗ Outra aba</button>
        <button class="btn" data-acao="int-fechar" title="Volta às telas do Gestão (o app continua aberto)">✕ ${id === 'qfd' && lugarQfdDisponivel() ? 'Sair da tela cheia' : 'Voltar ao Gestão'}</button>
      </div>
      <iframe id="integradoFrame" title="${esc(APPS[id].nome)}" src="${esc(enderecoApp(id, hash))}"></iframe>`;
    $('#integradoFrame').addEventListener('load', aoCarregar);
    if (modo === 'embutido') { area.classList.add('embutido'); mostrar(false); posicionar(); } else { area.classList.remove('embutido'); limparPosicao(area); mostrar(true); }
    App.render();
  }

  async function aoCarregar() {
    const w = janela();
    if (!w) { estado('O app abriu em outro endereço: os dados não passam sozinhos. Use “Outra aba” e o backup.', 'aviso'); return; }
    // um link dentro do app levou ao outro app (ex.: "Seguir para o projeto conceitual" no QFD): a barra acompanha
    const caminho = norm(w.location.pathname), outro = I.app === 'qfd' ? 'conceitual' : 'qfd';
    if (/projetoconceitual/.test(caminho) ? outro === 'conceitual' : /\/qfd\//.test(caminho) && outro === 'qfd') {
      I.app = outro; I.pendente = null;
      const t = $('#integrado .int-titulo b'); if (t) t.textContent = APPS[outro].nome;
      const r = $('#integrado [data-acao="int-reserva"]'); if (r) r.remove();
    }
    const carga = I.pendente; I.pendente = null;
    try {
      if (carga && I.app === 'qfd') {
        await esperar(() => glob(w, 'qfdDB'));
        if (carga === 'projeto') { const dq = JSON.parse(JSON.stringify(App.p.qfdDados)); dq.projeto = Object.assign({ nome: App.p.projeto.nome }, dq.projeto || {}); if (!dq.projeto.nome) dq.projeto.nome = App.p.projeto.nome; if (!glob(w, 'qfdDB').importData(dq)) throw new Error(glob(w, 'qfdDB').lastImportError || 'o QFD recusou o arquivo'); }
        else { glob(w, 'qfdDB').clearAllData(); const d = glob(w, 'qfdDB').loadData(); d.projeto = Object.assign({}, d.projeto || {}, { nome: App.p.projeto.nome, cliente: App.p.projeto.empresaParceira || '' }); glob(w, 'qfdDB').saveData(d); }
        I.pendente = null; w.location.reload(); return; // o QFD relê os dados na carga da página
      }
      if (carga && I.app === 'conceitual') {
        await esperar(() => glob(w, 'PC') && glob(w, 'PC').p && w.lerZipOuJson);
        if (carga === 'projeto') {
          const anx = anexoPc(), b = anx ? await App.arm.lerArquivo(anx.arquivo) : null;
          if (!b) throw new Error('o arquivo anexo não foi encontrado na pasta do projeto');
          const f = new w.File([new w.Uint8Array(await b.arrayBuffer())], anx.nome || 'projeto-conceitual.zip', { type: 'application/zip' });
          const { dados } = await w.lerZipOuJson(f);
          I.anexo = anx.arquivo; // ao trazer de volta, o ZIP atualizado substitui este anexo
          glob(w, 'PC').substituir(w.normalizarProjeto(dados));
        } else {
          glob(w, 'PC').substituir(w.criarProjetoVazio());
          glob(w, 'PC').p.projeto.nome = App.p.projeto.nome;
          w.importarArquivoQFD({ name: 'QFD do Gestão de Projetos.json' }, w.JSON.parse(JSON.stringify(App.p.qfdDados)));
        }
        if (glob(w, 'App')) glob(w, 'App').salvoEm = new Date();
        w.location.hash = I.etapa === 'preliminar' ? '#/p-requisitos' : '#/inicio';
        if (w.renderPagina) w.renderPagina();
      }
      await esperar(() => (I.app === 'qfd' ? glob(w, 'qfdDB') : glob(w, 'PC') && glob(w, 'PC').p), 8000);
      I.carregou = true; I.assinatura = assinatura();
      estado('');
    } catch (e) { console.error('app integrado', e); estado('Não deu para passar o projeto ao app: ' + e.message, 'erro'); I.carregou = true; I.assinatura = assinatura(); }
  }
  function esperar(cond, ms = 10000) {
    return new Promise((ok, falha) => { const t0 = Date.now(); (function v() { let r = false; try { r = cond(); } catch (e) { r = false; } if (r) ok(r); else if (Date.now() - t0 > ms) falha(new Error('o app demorou a carregar')); else setTimeout(v, 120); })(); });
  }
  function estado(t, tipo) { I.estadoTxt = [t, tipo]; $$('#intEstado, #intEstadoCard').forEach((s) => { s.textContent = t; s.className = 'int-estado ' + (tipo || ''); }); }
  function irPara(etapa) { const w = janela(); if (I.app === 'conceitual' && w) { w.location.hash = etapa === 'preliminar' ? '#/p-requisitos' : '#/inicio'; } }

  function mostrar(sim) {
    I.visivel = sim;
    const area = $('#integrado');
    if (area) area.classList.toggle('oculto', !sim);
    document.body.classList.toggle('modo-integrado', sim);
    if (!sim) $('.lateral') && $('.lateral').classList.remove('aberta');
    chip();
  }
  /** Botão flutuante para voltar ao app que ficou aberto. */
  function chip() {
    let c = $('#intVoltar');
    if (!I.app || I.visivel || !$('#integradoFrame') || (I.modo === 'embutido' && $('#qfdLugar'))) { if (c) c.remove(); return; }
    if (!c) { document.body.insertAdjacentHTML('beforeend', '<button id="intVoltar" class="int-voltar" data-acao="int-voltar"></button>'); c = $('#intVoltar'); }
    c.textContent = `◧ Voltar ao ${APPS[I.app].curto}${mudou() ? ' (mudanças não trazidas)' : ''}`;
  }
  App.acoes['int-voltar'] = () => { if (I.app === 'qfd' && lugarQfdDisponivel()) { App.aba = 'produto'; App.etapaSel = 'informacional'; App.render(); setTimeout(() => { const l = $('#qfdLugar'); if (l) l.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 50); } else mostrar(true); };
  App.acoes['int-tela'] = () => { const a = $('#integrado'); if (!a || !$('#integradoFrame')) return; I.modo = 'tela'; a.classList.remove('embutido'); limparPosicao(a); mostrar(true); };
  App.acoes['int-fechar'] = () => {
    if (I.app === 'qfd' && lugarQfdDisponivel()) { I.modo = 'embutido'; const a = $('#integrado'); if (a) a.classList.add('embutido'); mostrar(false); App.render(); return; }
    mostrar(false);
    if (mudou()) App.toast(`Há mudanças no ${APPS[I.app].curto} ainda não trazidas para o Gestão. <button class="btn pequeno" data-acao="int-trazer">Trazer agora</button>`, 'aviso', 12000);
  };
  App.acoes['int-aba'] = () => { const w = window.open(enderecoApp(I.app), '_blank'); if (!w) App.toast('O navegador bloqueou a nova aba.', 'aviso'); };
  App.acoes['int-reserva'] = () => {
    const id = I.app;
    App.modal(`<h2>Voltar à reserva do ${esc(APPS[id].curto)}</h2><p>Troca o que está aberto no ${esc(APPS[id].curto)} pelo que estava lá antes de abrir este projeto. O que está aberto agora sai do app (traga para o Gestão antes, se quiser guardar).</p>
      <div class="barra"><button class="btn primario" data-acao="int-reserva-ok">Voltar à reserva</button><button class="btn" data-acao="fechar-modal-int">Cancelar</button></div>`);
  };
  App.acoes['int-reserva-ok'] = () => {
    App.fecharModal();
    const id = I.app;
    try {
      const r = JSON.parse(lerLS(RESERVA[id]) || 'null');
      if (!r || !r.texto) { App.toast('Não há reserva.', 'aviso'); return; }
      gravarLS(APPS[id].chave, r.texto);
      if (id === 'conceitual') gravarLS('pc_modo', 'pc');
      localStorage.removeItem(RESERVA[id]);
      const w = janela(); if (w) w.location.reload();
      I.carregou = false; setTimeout(() => { I.carregou = true; I.assinatura = assinatura(); }, 2500);
      App.toast(`${APPS[id].curto} voltou ao que estava aberto antes.`, 'ok');
    } catch (e) { App.toast('Não deu para voltar à reserva: ' + esc(e.message), 'erro'); }
  };

  // ---------------------------------------------------------------- trazer para o Gestão
  App.acoes['int-trazer'] = async () => {
    const w = janela();
    if (!w) { App.toast('O app não está aberto aqui.', 'aviso'); return; }
    try {
      if (I.app === 'qfd') {
        if (!glob(w, 'qfdDB')) throw new Error('o QFD ainda está carregando');
        const d = glob(w, 'qfdDB').exportData();
        if (!d || !(d.requisitosProjeto || []).length) { App.toast('O QFD ainda não tem requisitos de projeto.', 'aviso'); return; }
        const texto = JSON.stringify(d, null, 2), nome = (d.projeto && d.projeto.nome) || App.p.projeto.nome || 'projeto';
        await App.importarQfd(new File([texto], `QFD integrado (${nome}).json`, { type: 'application/json' }));
      } else {
        if (!glob(w, 'PC') || !glob(w, 'PC').p || typeof w.exportarParaGestao !== 'function') throw new Error('o Projeto Conceitual ainda está carregando');
        if (!(glob(w, 'PC').p.estruturas || []).length) { App.toast('O projeto conceitual ainda não tem estrutura de funções.', 'aviso'); return; }
        const d = JSON.parse(JSON.stringify(w.exportarParaGestao(glob(w, 'PC').p)));
        await anexarZipPc(w);
        await App.importarConceitual(d, 'Sistema de Projeto Conceitual (integrado)');
      }
      I.assinatura = assinatura(); chip();
      estado('Trazido para o Gestão às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '. Salve o projeto.', 'ok');
    } catch (e) { console.error(e); App.toast('Não deu para trazer: ' + esc(e.message), 'erro', 9000); }
  };
  /** O ZIP completo do projeto conceitual fica anexo à fase conceitual (substitui o anterior de mesmo nome). */
  async function anexarZipPc(w) {
    if (typeof w.gerarZipDoProjeto !== 'function' || !App.arm) return;
    const b0 = await w.gerarZipDoProjeto(glob(w, 'PC').p);
    const blob = new Blob([await b0.arrayBuffer()], { type: 'application/zip' });
    const nome = `projeto-conceitual-${Nucleo.nomeSeguro(glob(w, 'PC').p.projeto.nome || App.p.projeto.nome || 'projeto').toLowerCase().replace(/\s+/g, '-')}.zip`;
    const cam = I.anexo && /^produto\/conceitual\//.test(I.anexo) ? I.anexo : 'produto/conceitual/' + nome;
    await App.arm.gravarArquivo(cam, blob);
    const e = App.p.produto.etapas.conceitual;
    e.anexos = (e.anexos || []).filter((a) => a.arquivo !== cam);
    e.anexos.push({ arquivo: cam, nome: cam.split('/').pop(), descricao: 'Projeto conceitual e preliminar completo (abre no Sistema de Projeto Conceitual)', data: hojeISO(), tamanho: blob.size });
  }

  // ---------------------------------------------------------------- avisos de mudança (o app grava no mesmo armazenamento)
  window.addEventListener('storage', (ev) => {
    if (!I.app || !I.carregou) return;
    if ((I.app === 'qfd' && ev.key === 'qfd_data') || (I.app === 'conceitual' && ev.key === 'pc_projeto')) {
      if (mudou()) estado('Há mudanças ainda não trazidas para o Gestão.', 'aviso');
      chip();
    }
  });
  // ao clicar numa aba do Gestão com o app na frente, volta às telas do Gestão (o app continua aberto)
  document.addEventListener('click', (ev) => {
    if (!I.visivel) return;
    const b = ev.target.closest('#abas button[data-aba], .lateral .inserir .btn');
    if (b) setTimeout(() => App.acoes['int-fechar'](), 0);
    if (ev.target.closest('[data-acao="int-menu"]')) $('.lateral').classList.toggle('aberta');
  }, true);
  // botão ☰ da barra flutuante
  {
    const l = $('.lateral');
    if (l && !$('#intMenu')) l.insertAdjacentHTML('afterbegin', '<button id="intMenu" class="int-menu" data-acao="int-menu" title="Mostrar/ocultar o menu do Gestão" aria-label="Menu do Gestão">☰</button>');
  }
  App.acoes['int-menu'] = () => {};
  const renderBase = App.render;
  App.render = function () {
    renderBase.apply(this, arguments); chip();
    if (I.modo === 'embutido' && I.app === 'qfd' && !$('#qfdLugar') && $('#integrado')) $('#integrado').classList.add('oculto');
    try { iniciarSePreciso(); } catch (e) { console.error(e); }
  };

  /** Botões "Abrir aqui" nas entradas das fases informacional, conceitual e preliminar. */
  const entradaBase = App.nedipEntradaHtml;
  App.nedipEntradaHtml = function (et, e, b) {
    const html = entradaBase.apply(this, arguments);
    const id = et.id === 'informacional' ? 'qfd' : (et.id === 'conceitual' || et.id === 'preliminar') ? 'conceitual' : '';
    if (!id) return html;
    const botao = `<button class="btn primario" data-acao="int-abrir" data-app="${id}" data-etapa="${et.id}" title="Abre o ${esc(APPS[id].nome)} dentro do Gestão, já com este projeto">▣ Abrir o ${esc(APPS[id].curto)} aqui${et.id === 'preliminar' ? ' (preliminar)' : ''}</button>`;
    return html.replace('<div class="barra">', `<div class="barra">${botao}`);
  };
  App.acoes['int-abrir'] = (el) => App.abrirIntegrado(el.dataset.app, el.dataset.etapa);
  // ---------------------------------------------------------------- QFD embutido na página do projeto informacional
  function limparPosicao(a) { ['top', 'left', 'width', 'height'].forEach((k) => { a.style[k] = ''; }); }
  /** O iframe fica fora do conteúdo (que é redesenhado a cada mudança) e é posto sobre o lugar reservado na página. */
  function posicionar() {
    const a = $('#integrado');
    if (!a || I.modo !== 'embutido') return;
    const l = $('#qfdLugar');
    if (l && I.app === 'qfd' && l.dataset.pronto === '1') {
      const r = l.getBoundingClientRect();
      a.style.top = (r.top + window.scrollY) + 'px'; a.style.left = (r.left + window.scrollX) + 'px';
      a.style.width = r.width + 'px'; a.style.height = r.height + 'px';
      a.classList.remove('oculto');
    } else a.classList.add('oculto');
  }
  (function laco() { try { if (I.modo === 'embutido') posicionar(); } catch (e) { /* segue */ } requestAnimationFrame(laco); })();

  App.qfdEmbutidoHtml = function () {
    const o = App.p.qfdOrigem || {}, aberto = I.app === 'qfd' && !!$('#integradoFrame');
    let painel = '';
    if (!aberto) {
      const d = decisaoQfd();
      painel = d.opcoes ? `<div class="int-escolha">${d.texto}<div class="barra">${d.opcoes.map(([a, r, c]) => `<button class="btn ${c || ''}" data-acao="${a}" data-app="qfd">${r}</button>`).join('')}</div>
        <p class="muted">O QFD que sair do navegador fica guardado como reserva (botão “↺ Reserva”).</p></div>`
        : `<div class="int-escolha"><p class="muted">Abrindo o Sistema QFD…</p><button class="btn" data-acao="int-manter" data-app="qfd">Abrir o QFD</button></div>`;
    }
    const est = I.estadoTxt && aberto ? I.estadoTxt : (aberto && mudou() ? ['Há mudanças ainda não trazidas para o Gestão.', 'aviso'] : ['', '']);
    return `<div class="cartao qfd-embutido"><h3 style="margin-top:0">5. Sistema QFD (casa da qualidade)</h3>
  <p class="muted" style="margin-top:0">O QFD funciona aqui mesmo, completo. Ao terminar uma etapa, use <b>Trazer para o Gestão</b>: requisitos de cliente, especificações e critérios de qualidade deste projeto são atualizados.
  ${o.importadoEm ? `Última vez trazido em ${esc(o.importadoEm.replace('T', ' ').slice(0, 16))}.` : 'Ainda não trazido.'}</p>
  <div class="barra"><button class="btn primario" data-acao="int-trazer" ${aberto ? '' : 'disabled'}>⬇ Trazer para o Gestão</button>
    <span class="int-estado ${est[1]}" id="intEstadoCard">${esc(est[0])}</span>
    <span style="margin-left:auto"></span>
    <button class="btn" data-acao="int-tela" ${aberto ? '' : 'disabled'} title="Abre o QFD em tela cheia; o menu do Gestão vira barra flutuante">⛶ Tela cheia</button>
    ${lerLS(RESERVA.qfd) && aberto ? '<button class="btn" data-acao="int-reserva" title="Volta ao QFD que estava no navegador antes">↺ Reserva</button>' : ''}
    <button class="btn" data-acao="int-aba-qfd" title="Abre o QFD em outra aba do navegador">↗ Outra aba</button>
    <label class="btn" title="Importar um backup JSON do QFD feito em outro computador">⬆ Importar backup JSON<input type="file" hidden id="arqQfdInf" accept=".json,.zip,application/json,application/zip"></label></div>
  <div id="qfdLugar" class="int-lugar" data-pronto="${aberto ? '1' : '0'}">${painel}</div></div>`;
  };
  App.acoes['int-aba-qfd'] = () => { const w = window.open(enderecoApp('qfd'), '_blank'); if (!w) App.toast('O navegador bloqueou a nova aba.', 'aviso'); };
  /** Na página do informacional, o QFD abre sozinho quando não há dúvida de qual projeto abrir. */
  function iniciarSePreciso() {
    const l = $('#qfdLugar');
    if (!l || l.dataset.pronto === '1' || I.iniciando) return;
    if (I.app && I.app !== 'qfd' && mudou()) return; // o Projeto Conceitual aberto tem mudanças não trazidas: espera o clique
    const d = decisaoQfd();
    if (d.opcoes) return;
    I.iniciando = true;
    setTimeout(() => { I.iniciando = false; if ($('#qfdLugar') && !(I.app === 'qfd' && $('#integradoFrame'))) abrir('qfd', d.carga, 'embutido'); }, 0);
  }

  window.Integrado = { enderecoApp, mesmoQfd, mesmoPc, anexoPc };
})();
