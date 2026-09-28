/* Núcleo da interface: estado, armazenamento (pasta ou navegador), vínculo de campos, listas, salvar. Sem servidor. */
'use strict';

const App = {
  p: null,            // projeto (JSON completo)
  an: null,           // análise calculada
  gantt: '',
  arm: null,          // ArmazemPasta | ArmazemNavegador
  sujo: false,
  aba: 'projeto',
  macroSel: 0,
  abas: {},
  acoes: {},
  figUrl: new Map(),  // caminho da figura -> objectURL (cache de exibição)
  cfg: null,
  _timer: null,
};

// ------------------------------------------------------------------ utilidades
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
const hojeISO = () => Nucleo.hoje();
const dataBR = Nucleo.dataBR;
const uid = Nucleo.uid;

App.get = (caminho, obj = App.p) => caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
App.set = function (caminho, valor, obj = App.p) {
  const ps = caminho.split('.'), ult = ps.pop();
  ps.reduce((o, k) => (o[k] ??= {}), obj)[ult] = valor;
};

App.toast = function (msg, tipo = '', ms = 5000) {
  const t = document.createElement('div');
  t.className = 'toast ' + tipo; t.innerHTML = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), ms);
};
App.modal = function (html, largo) { $('#modalCorpo').innerHTML = html; $('#modal').classList.remove('oculto'); $('.modal-caixa').style.maxWidth = largo ? '1000px' : ''; };
App.fecharModal = function () { $('#modal').classList.add('oculto'); $('#modalCorpo').innerHTML = ''; };

App.baixarBlob = function (blob, nome) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
};

// ------------------------------------------------------------------ configurações (por navegador)
App.CFG_PADRAO = { usuario: '', emailModo: 'mailto', emailjsServico: '', emailjsModelo: '', emailjsChave: '', baixarAoSalvar: 'auto' };
App.carregarCfg = function () {
  let c = {};
  try { c = JSON.parse(localStorage.getItem('gp-config') || '{}'); } catch (e) { c = {}; }
  App.cfg = Object.assign({}, App.CFG_PADRAO, c);
};
App.gravarCfg = function () { try { localStorage.setItem('gp-config', JSON.stringify(App.cfg)); } catch (e) { /* navegação privada */ } };
App.descricaoModoEmail = () => ({ emailjs: 'automático via EmailJS', mailto: 'abrir o programa de e-mail do computador', nenhum: 'desativado' }[App.cfg.emailModo] || '');

// ------------------------------------------------------------------ campos vinculados
App.campo = function (caminho, rotulo, op = {}) {
  const tipo = op.tipo || 'text';
  const v = App.get(caminho);
  const dados = `data-path="${esc(caminho)}" data-tipo="${tipo}"${op.render ? ' data-render="1"' : ''} ${op.attrs || ''}`;
  let inp;
  if (tipo === 'textarea') inp = `<textarea ${dados} rows="${op.linhas || 4}" placeholder="${esc(op.ph || '')}">${esc(v)}</textarea>`;
  else if (tipo === 'select') inp = `<select ${dados}>${App.opcoes(op.opcoes, v)}</select>`;
  else if (tipo === 'multi') inp = `<select multiple ${dados}>${App.opcoes(op.opcoes, v || [])}</select>`;
  else if (tipo === 'checkbox') return `<label class="campo ${op.classe || ''}" style="flex-direction:row;align-items:center;gap:8px;"><input type="checkbox" ${dados} ${v ? 'checked' : ''}> ${esc(rotulo)}</label>`;
  else inp = `<input type="${tipo}" ${dados} value="${esc(v)}" placeholder="${esc(op.ph || '')}"${op.min != null ? ` min="${op.min}"` : ''}${op.max != null ? ` max="${op.max}"` : ''}>`;
  if (!rotulo) return inp;
  return `<label class="campo ${op.classe || ''}">${esc(rotulo)}${op.dica ? ` <span class="dica">${esc(op.dica)}</span>` : ''}${inp}</label>`;
};
App.opcoes = function (opcoes, atual) {
  const sel = Array.isArray(atual) ? atual.map(String) : [String(atual ?? '')];
  return (opcoes || []).map(([val, rot]) => `<option value="${esc(val)}" ${sel.includes(String(val)) ? 'selected' : ''}>${esc(rot)}</option>`).join('');
};
App.lerValor = function (el) {
  const t = el.dataset.tipo;
  if (t === 'checkbox') return el.checked;
  if (t === 'number') return el.value === '' ? null : Number(el.value);
  if (t === 'multi') return Array.from(el.selectedOptions).map((o) => o.value);
  return el.value;
};

App.tabela = function (caminho, colunas, op = {}) {
  const lista = App.get(caminho) || [];
  let h = `<div class="rolagem"><table class="tab-edit"><thead><tr>${colunas.map((c) => `<th${c.largura ? ` style="width:${c.largura}"` : ''}>${esc(c.rotulo)}</th>`).join('')}<th class="acoes"></th></tr></thead><tbody>`;
  if (!lista.length) h += `<tr><td colspan="${colunas.length + 1}" class="vazio">${esc(op.vazio || 'Nenhum item.')}</td></tr>`;
  lista.forEach((item, i) => {
    h += '<tr>' + colunas.map((c) => {
      const opc = typeof c.opcoes === 'function' ? c.opcoes(item, i) : c.opcoes;
      return `<td>${App.campo(`${caminho}.${i}.${c.campo}`, '', { tipo: c.tipo, opcoes: opc, ph: c.ph, render: c.render, min: c.min, max: c.max, linhas: 2 })}</td>`;
    }).join('') + `<td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${esc(caminho)}" data-i="${i}" title="Remover">✕</button></td></tr>`;
  });
  h += '</tbody></table></div>';
  return h + `<div class="barra"><button class="btn pequeno" data-acao="add-linha" data-lista="${esc(caminho)}" data-novo="${esc(op.novo || '')}">+ ${esc(op.botao || 'Adicionar')}</button></div>`;
};

App.novos = {
  pessoa: () => ({ nome: '', email: '' }),
  membro: () => ({ nome: '', email: '', funcao: '', areas: [] }),
  interessado: () => ({ nome: '', email: '', papel: '' }),
  area: () => ({ id: App.proximoId(App.p.areas, 'A'), nome: '', noImatec: '', noImatecTitulo: '', responsaveis: [{ nome: '', email: '' }], trlEsperado: 4 }),
  atividade: () => ({ id: uid('at'), nome: '', responsavel: '', inicio: '', fim: '', dependeDe: [], percentual: 0, area: '' }),
  risco: () => ({ id: App.proximoId(App.p.riscos, 'R'), descricao: '', categoria: '', probabilidade: 3, impacto: 3, resposta: 'mitigar', planoAcao: '', responsavel: '', status: 'aberto', macroUid: '' }),
  qualidade: () => ({ requisito: '', criterioAceite: '', metodoVerificacao: '', status: 'pendente', pdca: { planejar: '', executar: '', verificar: '', agir: '' } }),
  licao: () => ({ data: hojeISO(), macroUid: '', descricao: '', recomendacao: '' }),
  texto: () => '',
};
App.proximoId = function (lista, pref) {
  let n = 0;
  (lista || []).forEach((x) => { const m = String(x.id || '').match(/(\d+)$/); if (m) n = Math.max(n, +m[1]); });
  return pref + (n + 1);
};

App.opcoesAreas = (vazio = true) => (vazio ? [['', '—']] : []).concat((App.p.areas || []).map((a) => [a.id, `${a.id} · ${a.nome || '(sem nome)'}`]));
App.opcoesMacros = (vazio = true) => (vazio ? [['', '—']] : []).concat(App.p.macroentregas.map((m, i) => [m.uid, `${i + 1} · ${m.titulo || '(sem título)'}`]));
App.opcoesPessoas = () => {
  const nomes = new Set(), pj = App.p.projeto;
  [pj.coordenador, pj.coordenadorAdjunto, ...(pj.equipe || [])].forEach((x) => { if (x && x.nome) nomes.add(x.nome); });
  (App.p.areas || []).forEach((a) => (a.responsaveis || []).forEach((r) => r.nome && nomes.add(r.nome)));
  return [['', '—']].concat([...nomes].map((n) => [n, n]));
};
App.trlBadge = (v) => {
  if (v === null || v === undefined || v === '') return '<span class="trl na">n/a</span>';
  return `<span class="trl ${v <= 3 ? 'b1' : v <= 6 ? 'b2' : 'b3'}">TRL ${v}</span>`;
};
App.opcoesTrl = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [n, String(n)]);

// ------------------------------------------------------------------ renderização e análise
App.marcarSujo = function (sujo = true) {
  App.sujo = sujo;
  const e = $('#estadoSalvo');
  e.textContent = sujo ? '● alterações não salvas' : '✓ salvo';
  e.classList.toggle('sujo', sujo);
};

App.atualizarTopo = function () {
  const l = $('#localProjeto');
  if (!App.arm) { l.innerHTML = ''; return; }
  l.innerHTML = App.arm.tipo === 'pasta'
    ? `<span class="local pasta" title="Arquivos gravados diretamente nesta pasta do computador">📁 pasta: <b>${esc(App.arm.nome)}</b></span>`
    : '<span class="local nav" title="Guardado no navegador deste computador. Exporte o ZIP para levar a outra máquina.">🌐 guardado no navegador</span>';
};

App.render = function () {
  $$('#abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === App.aba));
  const aba = App.abas[App.aba];
  const y = window.scrollY;
  $('#conteudo').innerHTML = (aba && App.p) ? aba.render() : '';
  if (aba && App.p && aba.depois) aba.depois();
  if (aba && App.p && aba.analise && App.an) aba.analise();
  App.carregarFiguras();
  window.scrollTo(0, y);
};

App.agendarAnalise = function (ms = 400) { clearTimeout(App._timer); App._timer = setTimeout(App.analisar, ms); };
App.analisar = function () {
  if (!App.p) return;
  try {
    App.an = Nucleo.analisar(App.p);
    App.gantt = Nucleo.ganttSvg(App.an, 1100);
    const aba = App.abas[App.aba];
    if (aba && aba.analise) aba.analise();
  } catch (e) { console.error(e); App.toast('Erro no cálculo: ' + esc(e.message), 'erro'); }
};

/** Mostra as imagens das figuras (lidas da pasta ou do navegador). */
App.urlFigura = (arq) => App.figUrl.get(arq) || '';
App.carregarFiguras = async function () {
  for (const img of $$('img[data-fig]')) {
    const arq = img.dataset.fig;
    if (!App.figUrl.has(arq) && App.arm) {
      const b = await App.arm.lerArquivo(arq);
      App.figUrl.set(arq, b ? URL.createObjectURL(b) : '');
    }
    const u = App.figUrl.get(arq);
    if (u) img.src = u; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'gap-neg', textContent: 'arquivo não encontrado: ' + arq }));
  }
};
App.limparFiguras = function () { App.figUrl.forEach((u) => u && URL.revokeObjectURL(u)); App.figUrl.clear(); };

// ------------------------------------------------------------------ abrir / criar projetos
App.confirmarDescartar = () => !App.sujo || confirm('Há alterações não salvas. Descartar e continuar?');

App.carregarEstado = function (p, arm) {
  App.limparFiguras();
  App.arm = arm;
  App.p = Nucleo.normalizar(p);
  App.macroSel = 0;
  App.aba = 'projeto';
  App.fecharModal();
  App.atualizarTopo();
  App.marcarSujo(false);
  App.analisar();
  App.render();
  const falta = [];
  (async () => {
    for (const f of Nucleo.figurasReferenciadas(App.p)) if (!(await arm.lerArquivo(f.arquivo))) falta.push(`Macroentrega ${f.macro}: ${f.arquivo}`);
    if (falta.length) App.toast('Figuras não encontradas junto ao JSON:<br>' + falta.map(esc).join('<br>'), 'aviso', 10000);
  })();
};

App.abrirPasta = async function (handle) {
  if (!App.confirmarDescartar()) return;
  try {
    if (!handle) handle = await window.showDirectoryPicker({ id: 'gestao-projetos', mode: 'readwrite' });
    const arm = new ArmazemPasta(handle);
    if (!(await arm.permissao(true))) { App.toast('Permissão para a pasta negada.', 'erro'); return; }
    let p = await arm.lerProjeto();
    let novo = false;
    if (!p) {
      if (!confirm(`A pasta "${handle.name}" não tem um projeto. Criar um projeto novo nela?`)) return;
      p = Nucleo.novo(handle.name); novo = true;
    }
    await Recentes.lembrar(handle, p.projeto.nome);
    App.carregarEstado(p, arm);
    if (novo) { App.marcarSujo(true); App.toast('Projeto novo na pasta. Preencha nome, código e um interessado e clique em Salvar.'); }
  } catch (e) {
    if (e.name !== 'AbortError') App.toast('Não foi possível abrir a pasta: ' + esc(e.message), 'erro', 8000);
  }
};

App.abrirNavegador = async function (id) {
  if (!App.confirmarDescartar()) return;
  const arm = new ArmazemNavegador(id);
  const p = await arm.lerProjeto();
  if (!p) { App.toast('Projeto não encontrado no navegador.', 'erro'); return; }
  arm.nome = p.projeto.nome;
  try { localStorage.setItem('gp-ultimo', JSON.stringify({ tipo: 'navegador', id })); } catch (e) { /* ignora */ }
  App.carregarEstado(p, arm);
};

App.novoNavegador = function () {
  if (!App.confirmarDescartar()) return;
  const p = Nucleo.novo();
  App.carregarEstado(p, new ArmazemNavegador(p.id, ''));
  App.marcarSujo(true);
  App.aba = 'projeto'; App.render();
  App.toast('Projeto novo (guardado no navegador). Preencha nome, código e um interessado e clique em Salvar.');
};

/** Tela inicial: pastas recentes, projetos do navegador, criar, importar, exemplo. */
App.telaProjetos = async function () {
  const suporta = ArmazemPasta.suportado();
  const recentes = suporta ? await Recentes.listar() : [];
  const nav = await ArmazemNavegador.listar();
  App.modal(`<h2>Projetos</h2>
  <div class="grade-campos" style="grid-template-columns:1fr 1fr">
    <div class="cartao" style="margin:0"><h3 style="margin-top:0">📁 Pasta do computador <span class="muted">(recomendado)</span></h3>
      <p class="muted">O JSON e a pasta <b>figuras/</b> ficam juntos na pasta que você escolher. ${suporta ? '' : '<br><b class="gap-neg">Este navegador não permite gravar em pastas. Use Chrome ou Edge no computador, ou guarde no navegador.</b>'}</p>
      <div class="barra"><button class="btn primario" data-acao="abrir-pasta" ${suporta ? '' : 'disabled'}>Abrir ou criar em uma pasta…</button></div>
      ${recentes.length ? '<h4>Recentes</h4>' + recentes.map((r) => `<div class="barra" style="margin:4px 0"><button class="btn" data-acao="abrir-recente" data-id="${esc(r.id)}">📁 ${esc(r.nome)}${r.projeto ? ' — ' + esc(r.projeto) : ''}</button><button class="btn pequeno" data-acao="esquecer-recente" data-id="${esc(r.id)}" title="Remover da lista">✕</button></div>`).join('') : ''}
    </div>
    <div class="cartao" style="margin:0"><h3 style="margin-top:0">🌐 Guardados no navegador</h3>
      <p class="muted">Ficam só neste navegador/computador. Exporte o ZIP para guardar ou levar a outra máquina.</p>
      <div class="barra"><button class="btn" data-acao="novo-navegador">+ Novo projeto no navegador</button></div>
      ${nav.length ? nav.map((r) => `<div class="barra" style="margin:4px 0"><button class="btn" data-acao="abrir-navegador" data-id="${esc(r.id)}">${esc(r.nome || '(sem nome)')}${r.codigo ? ' · ' + esc(r.codigo) : ''} <span class="muted">(${esc(r.atualizado)})</span></button></div>`).join('') : '<p class="vazio">Nenhum projeto guardado no navegador.</p>'}
    </div>
  </div>
  <div class="cartao" style="margin:14px 0 0"><h3 style="margin-top:0">Importar ou experimentar</h3>
    <div class="barra"><button class="btn" data-acao="ir-importar">Importar ZIP ou JSON + imagens…</button>
    <button class="btn" data-acao="carregar-exemplo">Abrir o projeto de exemplo</button></div>
  </div>`, true);
};

App.acoes['abrir-pasta'] = () => App.abrirPasta();
App.acoes['abrir-recente'] = async (el) => {
  const r = (await Recentes.listar()).find((x) => x.id === el.dataset.id);
  if (r) App.abrirPasta(r.handle);
};
App.acoes['esquecer-recente'] = async (el) => { await Recentes.esquecer(el.dataset.id); App.telaProjetos(); };
App.acoes['abrir-navegador'] = (el) => App.abrirNavegador(el.dataset.id);
App.acoes['novo-navegador'] = () => App.novoNavegador();
App.acoes['ir-importar'] = () => App.telaImportar();
App.acoes['carregar-exemplo'] = async () => {
  if (!App.confirmarDescartar()) return;
  const ex = structuredClone(window.EXEMPLO.projeto);
  ex.id = uid('prj');
  const arm = new ArmazemNavegador(ex.id, ex.projeto.nome);
  for (const [cam, dataUrl] of Object.entries(window.EXEMPLO.arquivos)) await arm.gravarArquivo(cam, await (await fetch(dataUrl)).blob());
  const txt = JSON.stringify(Nucleo.normalizar(ex), null, 2);
  await arm.gravarProjeto(ex, txt);
  await App.abrirNavegador(ex.id);
  App.toast('Projeto de exemplo copiado para o navegador. Os textos são ilustrativos.', 'ok');
};

// ------------------------------------------------------------------ salvar
App.salvar = async function () {
  if (!App.p) return;
  const erros = Nucleo.validar(App.p);
  if (erros.length) { App.modal('<h2>Não foi possível salvar</h2><p>Corrija os itens abaixo:</p><ul>' + erros.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>'); return; }
  const b = $('#btnSalvar');
  b.disabled = true; b.textContent = 'Salvando…';
  try {
    App.p = Nucleo.normalizar(App.p);
    App.p.log.push({ dataHora: Nucleo.agoraIso(), acao: 'Salvamento', usuario: App.cfg.usuario || '' });
    if (App.p.log.length > 500) App.p.log = App.p.log.slice(-500);
    let texto = JSON.stringify(App.p, null, 2);
    const nome = await App.arm.gravarProjeto(App.p, texto);
    App.marcarSujo(false);
    App.atualizarTopo();
    if (App.arm.tipo === 'pasta') await Recentes.lembrar(App.arm.h, App.p.projeto.nome);
    else try { localStorage.setItem('gp-ultimo', JSON.stringify({ tipo: 'navegador', id: App.arm.id })); } catch (e) { /* ignora */ }

    const baixar = App.cfg.baixarAoSalvar === 'sempre' || (App.cfg.baixarAoSalvar === 'auto' && App.arm.tipo === 'navegador') || App.cfg.emailModo === 'mailto';
    if (baixar) App.baixarBlob(new Blob([texto], { type: 'application/json' }), nome);
    App.toast(App.arm.tipo === 'pasta' ? `Salvo na pasta <b>${esc(App.arm.nome)}</b>: ${esc(nome)}` : `Salvo no navegador: ${esc(nome)}`, 'ok');

    App.analisar();
    const r = await Email.enviar(App.p, App.an, texto, App.cfg);
    App.toast((r.enviado ? '✉ ' : '⚠ ') + esc(r.mensagem), r.enviado ? 'ok' : 'aviso', 9000);
    App.p.log.push({ dataHora: Nucleo.agoraIso(), acao: 'E-mail: ' + r.mensagem, usuario: App.cfg.usuario || '' });
    texto = JSON.stringify(App.p, null, 2);
    await App.arm.atualizarSemHistorico(App.p, texto);
    if (App.aba === 'relatorios') App.render();
  } catch (e) {
    console.error(e);
    App.toast('Erro ao salvar: ' + esc(e.message), 'erro', 10000);
  } finally {
    b.disabled = false; b.textContent = '💾 Salvar';
  }
};

// ------------------------------------------------------------------ PDFs
App.gerarPdf = async function (tipo, mi) {
  const doc = tipo === 'macro' ? await Pdf.macroentrega(App.p, mi, App.arm) : await Pdf.andamento(App.p, App.arm);
  const blob = await Pdf.gerar(doc);
  const nomeProj = Nucleo.nomeSeguro(App.p.projeto.nome);
  const nome = tipo === 'macro' ? `Macroentrega ${String(mi + 1).padStart(2, '0')} - ${nomeProj}.pdf` : `Relatório de andamento - ${nomeProj} - ${hojeISO()}.pdf`;
  App.baixarBlob(blob, nome);
  if (App.arm && App.arm.tipo === 'pasta') {
    try { await App.arm.gravarArquivo('relatorios/' + (tipo === 'macro' ? `macroentrega_${String(mi + 1).padStart(2, '0')}.pdf` : `relatorio_andamento_${hojeISO()}.pdf`), blob); } catch (e) { /* opcional */ }
  }
};

// ------------------------------------------------------------------ configurações
App.telaConfig = function () {
  const c = App.cfg;
  App.modal(`<h2>⚙ Configurações (deste navegador)</h2>
  <div class="grade-campos">
    <label class="campo">Seu nome (registrado no log)<input id="cfgUsuario" value="${esc(c.usuario)}"></label>
    <label class="campo">Ao salvar, baixar uma cópia do JSON
      <select id="cfgBaixar">${App.opcoes([['auto', 'automático (só quando guardado no navegador)'], ['sempre', 'sempre'], ['nunca', 'nunca']], c.baixarAoSalvar)}</select></label>
  </div>
  <h3>E-mail de andamento (a cada salvamento)</h3>
  <label class="campo">Modo de envio<select id="cfgModo">${App.opcoes([['mailto', 'Abrir meu programa de e-mail (anexo manual do JSON)'], ['emailjs', 'Automático pelo EmailJS (JSON anexado)'], ['nenhum', 'Não enviar']], c.emailModo)}</select></label>
  <div class="info-box" style="margin-top:10px"><b>Sem servidor, o navegador não envia e-mail sozinho.</b> Opções:<br>
    • <b>Programa de e-mail</b>: abre o Outlook/Thunderbird/Gmail padrão com destinatários, assunto e resumo prontos; o JSON é baixado para você anexar.<br>
    • <b>EmailJS</b> (serviço gratuito com limites): envia automaticamente, com o JSON anexado (até ~${CONFIG.emailjsLimiteAnexoKb} KB no plano gratuito). Veja o passo a passo no README.</div>
  <div class="grade-campos">
    <label class="campo">EmailJS – Service ID<input id="cfgServ" value="${esc(c.emailjsServico)}" placeholder="service_xxxxxxx"></label>
    <label class="campo">EmailJS – Template ID<input id="cfgModelo" value="${esc(c.emailjsModelo)}" placeholder="template_xxxxxxx"></label>
    <label class="campo">EmailJS – Public Key<input id="cfgChave" value="${esc(c.emailjsChave)}" placeholder="chave pública"></label>
  </div>
  <div class="barra"><button class="btn primario" data-acao="cfg-salvar">Guardar configurações</button></div>`);
};
App.acoes['cfg-salvar'] = () => {
  Object.assign(App.cfg, {
    usuario: $('#cfgUsuario').value.trim(), baixarAoSalvar: $('#cfgBaixar').value, emailModo: $('#cfgModo').value,
    emailjsServico: $('#cfgServ').value.trim(), emailjsModelo: $('#cfgModelo').value.trim(), emailjsChave: $('#cfgChave').value.trim(),
  });
  App.gravarCfg(); App.fecharModal(); App.render();
  App.toast('Configurações guardadas neste navegador.', 'ok');
};

// ------------------------------------------------------------------ eventos
App.ligarEventos = function () {
  const cont = $('#conteudo');
  const aoMudar = (ev) => {
    const el = ev.target.closest('[data-path]');
    if (!el || !App.p) return;
    if (ev.type === 'input' && ['select', 'multi', 'checkbox'].includes(el.dataset.tipo)) return;
    App.set(el.dataset.path, App.lerValor(el));
    if (el.dataset.tipo === 'email') el.classList.toggle('invalido', el.value !== '' && !el.checkValidity());
    App.marcarSujo(true);
    if (el.dataset.render && ev.type === 'change') App.render();
    App.agendarAnalise();
  };
  cont.addEventListener('input', aoMudar);
  cont.addEventListener('change', aoMudar);
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-acao]');
    if (!el) return;
    const fn = App.acoes[el.dataset.acao];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });
  $('#abas').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-aba]');
    if (!b || !App.p) return;
    App.aba = b.dataset.aba; App.render();
  });
  $('#btnSalvar').addEventListener('click', App.salvar);
  $('#btnProjetos').addEventListener('click', App.telaProjetos);
  $('#btnConfig').addEventListener('click', App.telaConfig);
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); App.salvar(); }
    if (ev.key === 'Escape' && App.p) App.fecharModal();
  });
  $('#modal').addEventListener('click', (ev) => {
    if ((ev.target.id === 'modal' || ev.target.classList.contains('modal-fechar')) && App.p) App.fecharModal();
  });
  window.addEventListener('beforeunload', (ev) => { if (App.sujo) { ev.preventDefault(); ev.returnValue = ''; } });
};

App.acoes['add-linha'] = (el) => {
  const lista = App.get(el.dataset.lista);
  const fab = App.novos[el.dataset.novo];
  const item = fab ? fab() : {};
  if (Array.isArray(lista)) lista.push(item); else App.set(el.dataset.lista, [item]);
  App.marcarSujo(true); App.render(); App.agendarAnalise();
};
App.acoes['rem-linha'] = (el) => {
  const lista = App.get(el.dataset.lista);
  if (!Array.isArray(lista) || !confirm('Remover este item?')) return;
  lista.splice(+el.dataset.i, 1);
  App.marcarSujo(true); App.render(); App.agendarAnalise();
};
App.acoes['copiar'] = (el) => { navigator.clipboard?.writeText(el.dataset.texto).then(() => App.toast('Copiado: ' + esc(el.dataset.texto))); };

App.iniciar = async function () {
  App.carregarCfg();
  App.ligarEventos();
  if (!window.indexedDB) { App.toast('Este navegador não oferece armazenamento local (IndexedDB).', 'erro', 15000); }
  // reabre o último projeto do navegador; pastas exigem um clique (permissão do navegador)
  let ultimo = null;
  try { ultimo = JSON.parse(localStorage.getItem('gp-ultimo') || 'null'); } catch (e) { /* ignora */ }
  if (ultimo && ultimo.tipo === 'navegador' && (await ArmazemNavegador.listar()).some((r) => r.id === ultimo.id)) { await App.abrirNavegador(ultimo.id); return; }
  App.telaProjetos();
};
