/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
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
App.fecharModal = function () { if (App._identOk) return; $('#modal').classList.add('oculto'); $('#modalCorpo').innerHTML = ''; };

App.baixarBlob = function (blob, nome) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000); // Safari lê o blob depois do clique: revogar cedo cancela o download
};

// ------------------------------------------------------------------ configurações
// Só o nome de quem está usando fica neste navegador; as configurações do projeto (e-mail etc.) vão para o JSON.
App.carregarCfg = function () {
  let c = {};
  try { c = JSON.parse(localStorage.getItem('gp-config') || '{}'); } catch (e) { c = {}; }
  App.cfg = { usuario: c.usuario || '', email: c.email || '', semDicas: !!c.semDicas };
};
App.gravarCfg = function () { try { localStorage.setItem('gp-config', JSON.stringify(App.cfg)); } catch (e) { /* navegação privada */ } };
/** Primeira abertura: nome (para o log) e e-mail são obrigatórios. */
App.exigirIdentificacao = function () {
  return new Promise((ok) => {
    App._identOk = ok;
    App.modal(`<h2>Identificação</h2>
      <p>Na primeira vez que o sistema é aberto neste navegador, informe seu <b>nome</b> (registrado no log de alterações) e seu <b>e-mail</b>.
      O e-mail entra automaticamente no <b>grupo de gestão</b> dos projetos que ainda não tiverem ninguém na gestão.</p>
      <div class="grade-campos"><label class="campo">Nome *<input id="idNome" autocomplete="name" value="${esc(App.cfg.usuario)}"></label>
      <label class="campo">E-mail *<input id="idEmail" type="email" autocomplete="email" value="${esc(App.cfg.email)}"></label></div>
      <p id="idErro" class="gap-neg"></p>
      <div class="barra"><button class="btn primario" data-acao="ident-ok">Continuar</button></div>`);
    $('.modal-fechar').style.display = 'none';
    setTimeout(() => { const e = $('#idNome'); if (e) e.focus(); }, 50);
  });
};
App.acoes['ident-ok'] = () => {
  const nome = $('#idNome').value.trim(), email = $('#idEmail').value.trim();
  if (!nome || !Nucleo.emailValido(email)) { $('#idErro').textContent = 'Preencha o nome e um e-mail válido.'; return; }
  App.cfg.usuario = nome; App.cfg.email = email; App.gravarCfg();
  $('.modal-fechar').style.display = '';
  const ok = App._identOk; App._identOk = null;
  App.fecharModal();
  if (ok) ok();
};

/** Se o projeto não tem ninguém no grupo de gestão, inclui o e-mail de quem está usando. */
App.garantirGestao = function () {
  if (!App.p || !Nucleo.emailValido(App.cfg.email)) return false;
  if (Nucleo.destinatarios(App.p).gestao.length) return false;
  let g = App.p.gruposEmail.find((x) => x.gestao);
  if (!g) { g = { id: 'gestao', nome: 'Gestão', gestao: true }; App.p.gruposEmail.unshift(g); }
  const em = App.cfg.email.toLowerCase();
  const ex = App.p.interessados.find((i) => String(i.email || '').trim().toLowerCase() === em);
  if (ex) { if (!ex.grupos.includes(g.id)) ex.grupos.push(g.id); }
  else App.p.interessados.push({ nome: App.cfg.usuario, email: App.cfg.email, papel: 'Gestão', grupos: [g.id] });
  App.marcarSujo(true);
  App.toast(`Seu e-mail (${esc(App.cfg.email)}) foi incluído no grupo de gestão deste projeto, que não tinha ninguém na gestão.`, 'aviso', 8000);
  return true;
};

App.cfgEmail = () => (App.p && App.p.config && App.p.config.email) || { modo: 'mailto' };
App.descricaoModoEmail = () => ({ emailjs: 'automático via EmailJS', mailto: 'abrir o programa de e-mail (anexos manuais)', nenhum: 'desativado' }[App.cfgEmail().modo] || '');

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
  interessado: () => ({ nome: '', email: '', papel: '', grupos: [] }),
  grupo: () => ({ id: uid('grp'), nome: '', gestao: false }),
  area: () => ({ id: App.proximoId(App.p.areas, 'A'), nome: '', noImatec: '', noImatecTitulo: '', responsaveis: [{ nome: '', email: '' }], trlEsperado: 4 }),
  atividade: () => ({ id: uid('at'), nome: '', responsavel: '', inicio: '', fim: '', dependeDe: [], percentual: 0, area: '' }),
  risco: () => ({ id: App.proximoId(App.p.riscos, 'R'), descricao: '', categoria: '', probabilidade: 3, impacto: 3, resposta: 'mitigar', planoAcao: '', responsavel: '', status: 'aberto', macroUid: '' }),
  qualidade: () => ({ id: uid('q'), requisito: '', criterioAceite: '', metodoVerificacao: '', status: 'pendente', pdca: { planejar: '', executar: '', verificar: '', agir: '' } }),
  licao: () => ({ data: hojeISO(), macroUid: '', descricao: '', recomendacao: '' }),
  texto: () => '',
  aditivo: () => ({ id: uid('ad'), tipo: 'aditivo', quantidade: 6, unidade: 'meses', numero: '', dataTermo: hojeISO(), justificativa: '' }),
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
  App.relAberto = null; if (App.blocoEdit) App.blocoEdit.clear(); // estado da tela não passa de um projeto para outro
  App.fecharModal();
  App.atualizarTopo();
  App.marcarSujo(false);
  App.garantirGestao();
  App.analisar();
  App.render();
  const falta = [];
  (async () => {
    // projetos de versões anteriores: o backup do QFD ficou só em qfd/; recupera-o para o relatório da casa da qualidade
    const o = App.p.qfdOrigem || {};
    if (!App.p.qfdDados && o.guardadoEm) {
      try { const b = await arm.lerArquivo(o.guardadoEm); const d = b ? JSON.parse((await b.text()).replace(/^﻿/, '')) : null; if (d && Array.isArray(d.requisitosProjeto) && App.arm === arm) { App.p.qfdDados = d; if (App.aba === 'produto') App.render(); } } catch (e) { /* segue sem o relatório do QFD */ }
    }
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
  App.modal(`<h2>Criar ou carregar projeto</h2>
  <div class="grade-campos" style="grid-template-columns:1fr 1fr">
    <div class="cartao" style="margin:0"><h3 style="margin-top:0">📁 Pasta do computador <span class="muted">(recomendado)</span></h3>
      <p class="muted">O JSON e a pasta <b>figuras/</b> ficam juntos na pasta que você escolher. ${suporta ? '' : '<br><b class="gap-neg">Este navegador (Safari, Firefox ou celular) não permite gravar em pastas. Guarde no navegador e exporte o ZIP com frequência — ou use Chrome/Edge no computador.</b>'}</p>
      <div class="barra"><button class="btn primario" data-acao="abrir-pasta" ${suporta ? '' : 'disabled'}>Abrir ou criar em uma pasta…</button></div>
      ${recentes.length ? '<h4>Recentes</h4>' + recentes.map((r) => `<div class="barra" style="margin:4px 0"><button class="btn" data-acao="abrir-recente" data-id="${esc(r.id)}">📁 ${esc(r.nome)}${r.projeto ? ' — ' + esc(r.projeto) : ''}</button><button class="btn pequeno" data-acao="esquecer-recente" data-id="${esc(r.id)}" title="Remover da lista">✕</button></div>`).join('') : ''}
    </div>
    <div class="cartao" style="margin:0"><h3 style="margin-top:0">🌐 Guardados no navegador</h3>
      <p class="muted">Ficam só neste navegador/computador. Exporte o ZIP para guardar ou levar a outra máquina.${/Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\//.test(navigator.userAgent) ? ' <b>No Safari, dados de sites sem uso por 7 dias podem ser apagados:</b> em ⚙ Configurações, escolha baixar o ZIP completo a cada salvamento.' : ''}</p>
      <div class="barra"><button class="btn" data-acao="novo-navegador">+ Novo projeto no navegador</button></div>
      ${nav.length ? nav.map((r) => `<div class="barra" style="margin:4px 0"><button class="btn" data-acao="abrir-navegador" data-id="${esc(r.id)}">${esc(r.nome || '(sem nome)')}${r.codigo ? ' · ' + esc(r.codigo) : ''} <span class="muted">(${esc(r.atualizado)})</span></button></div>`).join('') : '<p class="vazio">Nenhum projeto guardado no navegador.</p>'}
    </div>
  </div>
  <div class="cartao" style="margin:14px 0 0"><h3 style="margin-top:0">Importar ou experimentar</h3>
    <div class="barra"><button class="btn" data-acao="ir-importar">Importar ZIP ou JSON + imagens…</button>
    <button class="btn" data-acao="carregar-exemplo">Abrir o exemplo (roda de bicicleta)</button></div>
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
  const ex = Nucleo.clonar(window.EXEMPLO.projeto);
  ex.id = uid('prj');
  const arm = new ArmazemNavegador(ex.id, ex.projeto.nome);
  for (const [cam, dataUrl] of Object.entries(window.EXEMPLO.arquivos)) await arm.gravarArquivo(cam, await (await fetch(dataUrl)).blob());
  const txt = JSON.stringify(Nucleo.normalizar(ex), null, 2);
  await arm.gravarProjeto(ex, txt);
  await App.abrirNavegador(ex.id);
  App.toast('Exemplo fictício (roda de bicicleta 700c) copiado para o navegador. Pessoas, empresa e resultados são ilustrativos. Siga o “Guia do exemplo” na aba Projeto.', 'ok', 9000);
};

// ------------------------------------------------------------------ salvar
App.progresso = function (msg) { App.modal(`<h2>Salvando…</h2><p class="muted">${esc(msg)}</p><div class="barra-prog"><i style="width:100%;animation:pulso 1s infinite alternate"></i></div>`); };

/** Gera todos os PDFs (relatório geral + uma por macroentrega). */
App.gerarTodosPdfs = async function () {
  const out = [];
  const nomeProj = Nucleo.nomeSeguro(App.p.projeto.nome);
  out.push({ nome: `Relatório de andamento - ${nomeProj} - ${hojeISO()}.pdf`, arq: `relatorios/relatorio_andamento_${hojeISO()}.pdf`, blob: await Pdf.gerar(await Pdf.andamento(App.p, App.arm)) });
  for (let i = 0; i < App.p.macroentregas.length; i++) {
    App.progresso(`Gerando PDF da macroentrega ${i + 1} de ${App.p.macroentregas.length}…`);
    const m = App.p.macroentregas[i], nn = String(i + 1).padStart(2, '0');
    if (m.finalizada) out.push({ nome: `Macroentrega ${nn} - ${nomeProj}.pdf`, arq: `relatorios/macroentrega_${nn}.pdf`, blob: await Pdf.gerar(await Pdf.macroentrega(App.p, i, App.arm)) });
    else if (m.status !== 'planejada' || m.blocos.length) // em andamento: relatório de andamento com o texto atual
      out.push({ nome: `Macroentrega ${nn} - andamento - ${nomeProj}.pdf`, arq: `relatorios/macroentrega_${nn}_andamento_atual.pdf`, blob: await Pdf.gerar(await Pdf.relatorioIntermediario(App.p, i, App.relAtual(m), App.arm)) });
  }
  return out;
};

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
    const modoBaixar = App.p.config.baixarAoSalvar || 'auto';
    if (modoBaixar === 'zip') App.baixarBlob(await Zip.exportar(App.arm), 'gestão do projeto ' + Nucleo.nomeSeguro(App.p.projeto.nome) + '.zip');
    else if (modoBaixar === 'sempre' || (modoBaixar === 'auto' && App.arm.tipo === 'navegador')) App.baixarBlob(new Blob([texto], { type: 'application/json' }), nome);
    App.toast(App.arm.tipo === 'pasta' ? `Salvo na pasta <b>${esc(App.arm.nome)}</b>: ${esc(nome)}` : `Salvo no navegador: ${esc(nome)}`, 'ok');
    App.analisar();

    const r = await App.dispararEmails(texto, nome);
    App.p.log.push({ dataHora: Nucleo.agoraIso(), acao: 'E-mail: ' + r.mensagem, usuario: App.cfg.usuario || '' });
    texto = JSON.stringify(App.p, null, 2);
    await App.arm.atualizarSemHistorico(App.p, texto);
    if (App.aba === 'relatorios') App.render();
  } catch (e) {
    console.error(e);
    App.fecharModal();
    App.toast('Erro ao salvar: ' + esc(e.message), 'erro', 10000);
  } finally {
    b.disabled = false; b.textContent = '💾 Salvar';
  }
};

/** Prepara anexos por grupo e envia (ou abre a tela de envio manual). */
App.dispararEmails = async function (texto, nome) {
  const cfgE = App.cfgEmail();
    // ---- e-mail por grupo: gestão = ZIP completo; demais = PDFs + JSON
  const dest = Nucleo.destinatarios(App.p);
  let r = { grupos: [], manual: false, mensagem: 'Nenhum interessado com e-mail válido.' };
  if (cfgE.modo !== 'nenhum' && (dest.gestao.length || dest.demais.length)) {
    App.progresso('Gerando os PDFs dos relatórios…');
    const pdfs = await App.gerarTodosPdfs();
    for (const pdf of pdfs) await App.arm.gravarArquivo(pdf.arq, pdf.blob);   // entram no ZIP completo
    const jsonAnexo = { nome, blob: new Blob([texto], { type: 'application/json' }) };
    const anexos = { gestao: [], demais: [] };
    if (dest.gestao.length) {
      App.progresso('Compactando o projeto completo (ZIP)…');
      anexos.gestao.push({ nome: 'gestão do projeto ' + Nucleo.nomeSeguro(App.p.projeto.nome) + '.zip', blob: await Zip.exportar(App.arm) });
    }
    if (dest.demais.length) anexos.demais = pdfs.map((x) => ({ nome: x.nome, blob: x.blob })).concat(jsonAnexo);
    let pastaEnvio = '';
    if (App.arm.tipo === 'pasta') { // deixa os anexos prontos na pasta do projeto
      pastaEnvio = 'envio/' + Nucleo.agoraIso().replace('T', '_').replace(/:/g, '');
      for (const g of ['gestao', 'demais']) for (const a of anexos[g]) await App.arm.gravarArquivo(`${pastaEnvio}/${g}/${a.nome}`, a.blob);
    }
    App.progresso('Preparando o envio…');
    r = await Email.enviar(App.p, App.an, anexos, cfgE, App.cfg.usuario);
    App.fecharModal();
    if (r.manual) App.telaEnvio(r, anexos, pastaEnvio);
    else App.toast('✉ ' + esc(r.mensagem), 'ok', 9000);
  } else if (cfgE.modo === 'nenhum') App.toast('Envio de e-mail desativado.', 'aviso');
  return r;
};

/** Tela de envio manual: por grupo, baixar anexos e abrir o rascunho do e-mail. */
App.telaEnvio = function (r, anexos, pastaEnvio) {
  App._anexos = anexos;
  let h = `<h2>Enviar e-mails de andamento</h2>
  <p class="muted">${esc(r.mensagem)}${pastaEnvio ? `<br>Os anexos também foram gravados na pasta do projeto, em <b>${esc(pastaEnvio)}/</b>.` : ''}</p>`;
  r.grupos.forEach((g) => {
    h += `<div class="cartao"><h3 style="margin-top:0">${g.grupo === 'gestao' ? 'Gestão — ZIP completo' : 'Demais — PDFs e JSON'}</h3>
      <p><b>Para:</b> ${esc(g.emails.join(', '))}<br><b>Anexos:</b> ${g.anexos.map((a) => esc(a.nome) + ` <span class="muted">(${Math.round(a.blob.size / 1024)} KB)</span>`).join('; ')}<br><span class="muted">${esc(g.mensagem)}</span></p>
      <div class="barra"><button class="btn" data-acao="baixar-anexos" data-g="${g.grupo}">1. Baixar anexos</button>
      <a class="btn primario" href="${g.link || Email.mailto(App.p, Email.corpo(App.p, App.an, App.cfg.usuario).texto, g.emails, g.anexos)}">2. Abrir e-mail</a>
      <span class="muted">3. anexe os arquivos e envie</span></div></div>`;
  });
  h += '<p class="muted">O navegador não consegue anexar arquivos em e-mails sozinho. Para envio 100% automático com anexos grandes é preciso um servidor (versão PHP).</p>';
  App.modal(h);
};
App.acoes['baixar-anexos'] = (el) => {
  (App._anexos[el.dataset.g] || []).forEach((a, i) => setTimeout(() => App.baixarBlob(a.blob, a.nome), i * 400));
};

// ------------------------------------------------------------------ PDFs
/** Relatório de andamento com o texto atual da macroentrega (sem guardar no histórico). */
App.relAtual = (m) => Object.assign(Nucleo.novoRelatorio(m.relatorios.length + 1), { titulo: `Relatório de andamento (${dataBR(hojeISO())})`,
  periodoInicio: m.andamento.periodoInicio || '', periodoFim: m.andamento.periodoFim || hojeISO(), blocos: m.blocos, etapasFuturas: m.etapasFuturas });
App.gerarPdf = async function (tipo, mi) {
  const m = tipo === 'macro' ? App.p.macroentregas[mi] : null, andamento = m && !m.finalizada;
  const doc = !m ? await Pdf.andamento(App.p, App.arm) : andamento ? await Pdf.relatorioIntermediario(App.p, mi, App.relAtual(m), App.arm) : await Pdf.macroentrega(App.p, mi, App.arm);
  const blob = await Pdf.gerar(doc);
  const nomeProj = Nucleo.nomeSeguro(App.p.projeto.nome);
  const nome = m ? `Macroentrega ${String(mi + 1).padStart(2, '0')}${andamento ? ' - andamento' : ''} - ${nomeProj}.pdf` : `Relatório de andamento - ${nomeProj} - ${hojeISO()}.pdf`;
  App.baixarBlob(blob, nome);
  if (App.arm && App.arm.tipo === 'pasta') {
    try { await App.arm.gravarArquivo('relatorios/' + (m ? `macroentrega_${String(mi + 1).padStart(2, '0')}${andamento ? '_andamento_atual' : ''}.pdf` : `relatorio_andamento_${hojeISO()}.pdf`), blob); } catch (e) { /* opcional */ }
  }
};

// ------------------------------------------------------------------ configurações (tela)
App.telaConfig = function () {
  if (!App.p) { App.toast('Abra um projeto primeiro.'); return; }
  const e = App.cfgEmail();
  App.modal(`<h2>⚙ Configurações</h2>
  <h3>Deste navegador</h3>
  <div class="grade-campos"><label class="campo">Seu nome (registrado no log)<input id="cfgUsuario" value="${esc(App.cfg.usuario)}"></label>
    <label class="campo">Seu e-mail (entra na gestão de projetos sem gestão)<input id="cfgEmailUsuario" type="email" value="${esc(App.cfg.email)}"></label>
    <label class="campo" style="flex-direction:row;align-items:center;gap:8px;"><input type="checkbox" id="cfgDicas" ${App.cfg.semDicas ? '' : 'checked'}> Mostrar balões explicativos ao parar o mouse sobre botões, abas e campos</label></div>
  <h3>Do projeto (salvas no JSON)</h3>
  <div class="grade-campos">
    <label class="campo">Ao salvar, baixar uma cópia do JSON
      <select id="cfgBaixar">${App.opcoes([['auto', 'JSON, automático (só quando guardado no navegador)'], ['sempre', 'JSON, sempre'], ['zip', 'ZIP completo (JSON + figuras + documentos) — recomendado no Safari/Firefox'], ['nunca', 'nunca']], App.p.config.baixarAoSalvar)}</select></label>
    <label class="campo">Envio do e-mail de andamento<select id="cfgModo">${App.opcoes([['mailto', 'Programa de e-mail do computador (anexos manuais)'], ['emailjs', 'Automático pelo EmailJS'], ['nenhum', 'Não enviar']], e.modo)}</select></label>
  </div>
  <div class="info-box" style="margin-top:10px">A cada salvamento o sistema prepara: <b>gestão</b> → ZIP completo do projeto; <b>demais</b> → PDFs (relatório geral + cada macroentrega) e o JSON.<br>
  • <b>Programa de e-mail</b>: abre um rascunho por grupo; você baixa e anexa os arquivos (em pastas do computador eles também ficam em <i>envio/</i>).<br>
  • <b>EmailJS</b>: envia sozinho, mas o anexo precisa caber no limite do seu plano (os PDFs têm ~1 MB cada). Acima do limite o e-mail vai sem anexo e a tela de envio manual é aberta.</div>
  <div class="grade-campos">
    <label class="campo">EmailJS – Service ID<input id="cfgServ" value="${esc(e.emailjsServico)}" placeholder="service_xxxxxxx"></label>
    <label class="campo">EmailJS – Template ID<input id="cfgModelo" value="${esc(e.emailjsModelo)}" placeholder="template_xxxxxxx"></label>
    <label class="campo">EmailJS – Public Key<input id="cfgChave" value="${esc(e.emailjsChave)}" placeholder="chave pública"></label>
    <label class="campo">Limite de anexo do plano (KB)<input id="cfgLimite" type="number" min="1" value="${esc(e.limiteAnexoKb || 45)}"></label>
  </div>
  <div class="barra"><button class="btn primario" data-acao="cfg-salvar">Aplicar</button><span class="muted">As configurações do projeto só ficam no JSON depois de Salvar.</span></div>`);
};
App.acoes['cfg-salvar'] = () => {
  App.cfg.usuario = $('#cfgUsuario').value.trim() || App.cfg.usuario;
  const em = $('#cfgEmailUsuario').value.trim();
  if (Nucleo.emailValido(em)) App.cfg.email = em;
  App.cfg.semDicas = !$('#cfgDicas').checked;
  App.gravarCfg();
  App.p.config.baixarAoSalvar = $('#cfgBaixar').value;
  Object.assign(App.p.config.email, { modo: $('#cfgModo').value, emailjsServico: $('#cfgServ').value.trim(), emailjsModelo: $('#cfgModelo').value.trim(),
    emailjsChave: $('#cfgChave').value.trim(), limiteAnexoKb: +$('#cfgLimite').value || 45 });
  App.marcarSujo(true); App.fecharModal(); App.render();
  App.toast('Configurações aplicadas. Clique em Salvar para gravá-las no JSON.', 'ok');
};

// ------------------------------------------------------------------ eventos
App.ligarEventos = function () {
  const cont = $('#conteudo');
  const aoMudar = (ev) => {
    const el = ev.target.closest('[data-path]');
    if (!el || !App.p) return;
    if (ev.type === 'input' && ['select', 'multi', 'checkbox'].includes(el.dataset.tipo)) return;
    App.set(el.dataset.path, App.lerValor(el));
    if (App.aposSet) App.aposSet(el.dataset.path, ev.type);
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
  if (!App.cfg.usuario || !Nucleo.emailValido(App.cfg.email)) await App.exigirIdentificacao();
  if (!window.indexedDB) { App.toast('Este navegador não oferece armazenamento local (IndexedDB).', 'erro', 15000); }
  // reabre o último projeto do navegador; pastas exigem um clique (permissão do navegador)
  let ultimo = null;
  try { ultimo = JSON.parse(localStorage.getItem('gp-ultimo') || 'null'); } catch (e) { /* ignora */ }
  if (ultimo && ultimo.tipo === 'navegador' && (await ArmazemNavegador.listar()).some((r) => r.id === ultimo.id)) { await App.abrirNavegador(ultimo.id); return; }
  App.telaProjetos();
};
