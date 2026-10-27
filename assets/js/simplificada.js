/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Versão simplificada: feita para o gestor preencher o mínimo. Ele só escreve o que o produto faz, as funções
 * (uma por linha, com o responsável) e as especificações com a meta. O resto o sistema monta sozinho:
 * - cronograma: uma etapa por função + "Integração do sistema" e "Testes e verificação das especificações";
 * - árvore TRL: produto (o que ele faz) → uma função por subsistema + integração (as avaliações são mantidas);
 * - áreas e responsáveis: uma por função, ligada ao item da árvore TRL (para saber quem cobrar);
 * - desdobramento especificação → função, para os relatórios.
 * Ao criar o projeto, já vêm o coordenador (quem está usando), as datas (hoje a 12 meses) e o grupo de gestão.
 */
'use strict';

const Simples = {};
window.Simples = Simples;
Simples.INTEGRACAO = [['__integracao', 'Integração do sistema'], ['__testes', 'Testes e verificação das especificações']];
Simples.FRACAO_FUNCOES = 0.6;   // as funções ocupam os primeiros 60 % do prazo
Simples.FRACAO_INTEGRACAO = 0.85; // integração até 85 %; testes até o fim

const smTxt = (x) => String(x ?? '').trim();
const smSomarDias = (iso, d) => { const x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const SM_GERADO = 'Gerado das funções (versão simplificada)';
const smNo = (tipo, titulo, origem) => ({ chave: '', idOriginal: null, stringId: '', titulo, tipo, nivel: 0, visivel: true, keyTechItems: '', justification: SM_GERADO,
  implementationMethod: '', supplier: '', trlInformado: null, filhos: [], avaliacao: { origem: 'interno', criterios: {}, atualizado: '' }, origemFuncao: origem });

/** Dados pré-preenchidos de um projeto simplificado novo. */
Simples.preencher = function (p, usuario = {}) {
  const pj = p.projeto, hoje = Nucleo.hoje();
  if (!pj.dataInicio) pj.dataInicio = hoje;
  if (!pj.dataFimPrevista) { const d = new Date(hoje + 'T12:00:00'); d.setMonth(d.getMonth() + 12); pj.dataFimPrevista = d.toISOString().slice(0, 10); }
  if (!pj.coordenador.nome && usuario.nome) pj.coordenador = { nome: usuario.nome, email: usuario.email || '' };
  const ms = p.macroentregas; if (ms.length > 1) ms[ms.length - 1].trlEsperado = +pj.trlEsperadoFinal || 6; // a última entrega cobra o TRL final
  if (!pj.objetivoGeral) pj.objetivoGeral = '';
  return p;
};

/** Especificação → função principal (a 1ª função do desdobramento; subfunção conta como a função-mãe; integração pelo marcador). */
Simples.OBS_INTEG = 'Atendida pelo sistema integrado';
Simples.funcaoDaEspec = function (p, q) {
  const c = p.produto.etapas.conceitual, d = c.desdobramento[nedipIdEspec(q)];
  if (!d) return '';
  for (const id of d.funcoes) {
    if (c.funcoes.some((f) => f.id === id)) return id;
    const mae = c.funcoes.find((f) => f.subfuncoes.some((s) => s.id === id));
    if (mae) return mae.id;
  }
  return d.obs === Simples.OBS_INTEG ? '__integracao' : '';
};
/** Troca a função principal da especificação sem apagar as outras ligações feitas na versão completa. */
Simples.definirFuncao = function (p, q, fid) {
  const c = p.produto.etapas.conceitual, id = nedipIdEspec(q);
  if (!id) return;
  const d = c.desdobramento[id] || { funcoes: [], obs: '' }, atual = Simples.funcaoDaEspec(p, q);
  let l = d.funcoes.filter((x) => x !== atual);
  if (fid && fid !== '__integracao') l = [fid].concat(l.filter((x) => x !== fid));
  d.funcoes = l;
  if (fid === '__integracao') d.obs = d.obs || Simples.OBS_INTEG; else if (d.obs === Simples.OBS_INTEG) d.obs = '';
  c.desdobramento[id] = d;
};

const smIgual = (a, b) => smTxt(a).toLowerCase() === smTxt(b).toLowerCase() && smTxt(a) !== '';
const smAtivManuais = (p) => p.macroentregas.some((m) => m.atividades.some((a) => !a.funcaoId));
/** Raiz da árvore TRL ligada às funções: a gerada pela simplificada ou a exportada do projeto conceitual (versão completa). */
Simples.raizFuncoes = function (p) {
  const c = p.produto.etapas.conceitual, arv = p.trl.arvore;
  let r = arv.find((n) => n.origemFuncao === '__raiz');
  if (r) return r;
  r = arv.find((n) => /estrutura de funções/i.test(n.justification || '') || (smIgual(n.titulo, c.funcaoGlobal.nome) && n.filhos.some((f) => c.funcoes.some((fn) => smIgual(fn.nome, f.titulo)))));
  if (r) r.origemFuncao = '__raiz'; // adotada: as avaliações e os subitens continuam
  return r || null;
};

/**
 * Versão simplificada: monta a partir das funções o que ainda não existe e reaproveita o que já existe.
 * - Projeto novo (sem árvore TRL e sem cronograma): gera cronograma (uma etapa por função + integração e testes),
 *   árvore TRL (produto → funções + integração) e uma área por função.
 * - Projeto vindo da versão completa: a árvore TRL já avaliada, as áreas e o cronograma continuam valendo; só
 *   entram etapas/itens para funções que ainda não têm correspondente (pelo nome ou pela exportação do conceitual).
 *   Gerar as etapas do cronograma pelas funções, nesse caso, é uma escolha (botão na aba Funções e especificações).
 * Nada criado à mão é apagado; datas, percentuais, avaliações TRL e responsáveis já preenchidos são mantidos.
 */
Simples.sincronizar = function (p) {
  if (!Nucleo.simplificado(p)) return false;
  const c = p.produto.etapas.conceitual, foto = () => JSON.stringify([p.trl.arvore, p.areas, p.macroentregas.map((m) => [m.atividades, m.dataInicio, m.dataPrevista]), c.desdobramento, c.funcoes, p.config.simples]);
  const antes = foto();
  const pj = p.projeto, coord = pj.coordenador || {};
  const fs = c.funcoes.filter((f) => smTxt(f.nome));
  // projetos de 24/10/2026 guardavam a função na especificação: passa para o desdobramento (fonte única)
  p.qualidade.forEach((q) => { if (q.funcao !== undefined) { if (q.funcao) Simples.definirFuncao(p, q, q.funcao); delete q.funcao; } });
  // o que gerar: decidido uma vez por projeto (o usuário pode ligar a geração do cronograma depois)
  const cfg = p.config.simples = Object.assign({}, p.config.simples);
  const raizAntiga = Simples.raizFuncoes(p);
  if (cfg.trl === undefined) cfg.trl = !p.trl.arvore.length || !!raizAntiga;
  if (cfg.cronograma === undefined) cfg.cronograma = !smAtivManuais(p);
  // ---- datas de referência
  const ini = pj.dataInicio, fim = Nucleo.vigencia(p).fimVigente;
  const dias = ini && fim && fim > ini ? Math.round((Date.parse(fim) - Date.parse(ini)) / 86400000) : 0;
  const em = (fr) => (dias ? smSomarDias(ini, Math.round(dias * fr)) : '');
  const dF = em(Simples.FRACAO_FUNCOES), dI = em(Simples.FRACAO_INTEGRACAO);
  if (!p.macroentregas.length) p.macroentregas.push(Object.assign(Nucleo.novaMacro(1), { titulo: Nucleo.MACROS_SIMPLES[0] }));
  const ms = p.macroentregas, m1 = ms[0], mU = ms[ms.length - 1];
  // ---- árvore TRL
  let raiz = raizAntiga;
  if (cfg.trl && fs.length) {
    if (!raiz) { raiz = smNo('product', 'Produto', '__raiz'); p.trl.arvore.unshift(raiz); }
    if (raiz.justification === SM_GERADO || !smTxt(raiz.titulo)) raiz.titulo = smTxt(c.funcaoGlobal.nome) || smTxt(pj.nome) || 'Produto'; // a adotada mantém o título
    const livres = raiz.filhos.filter((n) => !n.origemFuncao);
    fs.forEach((f) => { if (!raiz.filhos.some((n) => n.origemFuncao === f.id)) { const n = livres.find((x) => !x.origemFuncao && smIgual(x.titulo, f.nome)); if (n) n.origemFuncao = f.id; } });
    const integL = livres.find((x) => !x.origemFuncao && /integra/i.test(x.titulo)); if (integL && !raiz.filhos.some((n) => n.origemFuncao === '__integracao')) integL.origemFuncao = '__integracao';
    const auto = new Map(raiz.filhos.filter((n) => n.origemFuncao).map((n) => [n.origemFuncao, n]));
    const outros = raiz.filhos.filter((n) => !n.origemFuncao || (n.origemFuncao !== '__integracao' && !fs.some((f) => f.id === n.origemFuncao) && n.filhos.length)); // função removida com subitens: o item fica
    outros.forEach((n) => { if (n.origemFuncao && n.origemFuncao !== '__integracao') delete n.origemFuncao; });
    raiz.filhos = fs.map((f) => Object.assign(auto.get(f.id) || smNo('subsystem', '', f.id), { titulo: smTxt(f.nome) }))
      .concat([Object.assign(auto.get('__integracao') || smNo('subsystem', '', '__integracao'), { titulo: auto.get('__integracao') ? auto.get('__integracao').titulo : 'Integração do sistema' })], outros);
  } else if (raiz && !fs.length && raiz.justification === SM_GERADO && !raiz.filhos.some((n) => !n.origemFuncao || n.trlInformado !== null)) {
    p.trl.arvore = p.trl.arvore.filter((n) => n !== raiz); // árvore gerada e ainda não avaliada: sai junto com as funções
  }
  const mapa = Nucleo.rechavear(p.trl.arvore);
  p.areas.forEach((a) => { if (a.noImatec && mapa[a.noImatec]) a.noImatec = mapa[a.noImatec]; });
  const noDe = new Map();
  ((cfg.trl && p.trl.arvore.find((n) => n.origemFuncao === '__raiz')) || { filhos: [] }).filhos.forEach((n) => { if (n.origemFuncao) noDe.set(n.origemFuncao, n); });
  // ---- áreas: a ligada ao item da função (ou com o mesmo nome) é reaproveitada; só se cria a que falta
  const alvos = !fs.length ? [] : fs.map((f) => ({ fid: f.id, f, nome: smTxt(f.nome) })).concat([{ fid: '__integracao', f: null, nome: 'Integração do sistema' }]);
  if (cfg.trl) {
    const ids = new Set(alvos.map((x) => x.fid));
    p.areas = p.areas.filter((a) => !a.origemFuncao || ids.has(a.origemFuncao) || a.adotada); // só sai área gerada de função removida
    p.areas.forEach((a) => { if (a.adotada && a.origemFuncao && !ids.has(a.origemFuncao)) { delete a.origemFuncao; delete a.adotada; delete a.respFuncao; } }); // a adotada volta a ser só dela
    alvos.forEach((x) => {
      const no = noDe.get(x.fid);
      let a = p.areas.find((y) => y.origemFuncao === x.fid);
      if (!a) { a = p.areas.find((y) => !y.origemFuncao && no && y.noImatec === no.chave) || p.areas.find((y) => !y.origemFuncao && smIgual(y.nome, x.nome)); if (a) a.adotada = true; }
      if (!a) {
        let n = 0; p.areas.forEach((y) => { const mm = String(y.id || '').match(/(\d+)$/); if (mm) n = Math.max(n, +mm[1]); });
        a = { id: 'A' + (n + 1), nome: x.nome, noImatec: '', noImatecTitulo: '', responsaveis: [], trlEsperado: +pj.trlEsperadoFinal || 6 };
        p.areas.push(a);
      }
      a.origemFuncao = x.fid;
      if (!a.adotada || !smTxt(a.nome)) a.nome = x.nome; // a área adotada mantém o nome dela
      if (no) { a.noImatec = no.chave; a.noImatecTitulo = no.titulo; delete a.vinculoPerdido; }
      // responsável: o da função manda; função sem responsável herda o da área; os dois vazios → coordenador
      const f = x.f, rf = f && smTxt(f.responsavel) ? { nome: smTxt(f.responsavel), email: smTxt(f.email) } : null;
      const base = (a.responsaveis || []).filter((r) => (smTxt(r.nome) || smTxt(r.email)) && !r.auto && !(a.respFuncao && smIgual(r.nome, a.respFuncao)));
      if (rf) { a.responsaveis = [rf].concat(base.filter((r) => !smIgual(r.nome, rf.nome))); a.respFuncao = rf.nome; }
      else if (base.length && f) { a.responsaveis = base; f.responsavel = base[0].nome || ''; f.email = base[0].email || ''; a.respFuncao = f.responsavel; }
      else if (base.length) { a.responsaveis = base; delete a.respFuncao; }
      else { a.responsaveis = [{ nome: coord.nome || '', email: coord.email || '', auto: true }].filter((r) => r.nome || r.email); delete a.respFuncao; }
      x.area = a;
    });
  } else {
    alvos.forEach((x) => { // árvore própria do projeto: só lê os responsáveis das áreas de mesmo nome
      const a = p.areas.find((y) => smIgual(y.nome, x.nome)); x.area = a || null;
      if (a && x.f && !smTxt(x.f.responsavel) && (a.responsaveis || [])[0]) { x.f.responsavel = a.responsaveis[0].nome || ''; x.f.email = a.responsaveis[0].email || ''; }
    });
  }
  // ---- cronograma: uma etapa por função + integração e testes (reaproveita atividade de mesmo nome)
  const etapas = !cfg.cronograma || !fs.length ? [] : fs.map((f) => ({ fid: f.id, nome: smTxt(f.nome), resp: smTxt(f.responsavel), ini, fim: dF, macro: m1 }))
    .concat(Simples.INTEGRACAO.map(([fid, nome], k) => ({ fid, nome, resp: '', ini: k ? dI : dF, fim: k ? fim : dI, macro: mU })));
  if (cfg.cronograma) {
    if (dias) {
      if (!m1.dataInicio) m1.dataInicio = ini;
      if (!m1.dataPrevista) m1.dataPrevista = ms.length > 1 ? dF : fim;
      if (ms.length > 1) { if (!mU.dataInicio) mU.dataInicio = dF; if (!mU.dataPrevista) mU.dataPrevista = fim; }
    }
    const ids = new Set(etapas.map((x) => x.fid));
    ms.forEach((m) => { m.atividades = m.atividades.filter((a) => !a.funcaoId || ids.has(a.funcaoId) || +a.percentual > 0); }); // etapa de função removida sai, se não tiver andamento
    ms.forEach((m) => m.atividades.forEach((a) => { if (a.funcaoId && !ids.has(a.funcaoId)) { delete a.funcaoId; delete a.adotada; } }));
    const achar = (x) => { for (const m of ms) { const a = m.atividades.find((y) => y.funcaoId === x.fid); if (a) return a; }
      for (const m of ms) { const a = m.atividades.find((y) => !y.funcaoId && smIgual(y.nome, x.nome)); if (a) { a.funcaoId = x.fid; a.adotada = true; return a; } } return null; };
    etapas.forEach((x) => {
      let a = achar(x);
      if (!a) { a = { id: Nucleo.uid('at'), nome: x.nome, responsavel: '', inicio: '', fim: '', dependeDe: [], percentual: 0, area: '', funcaoId: x.fid }; x.macro.atividades.push(a); }
      a.nome = x.nome;
      if (x.resp && !a.adotada) a.responsavel = x.resp; else if (!a.responsavel) a.responsavel = x.resp || coord.nome || ''; // a atividade adotada mantém o responsável dela
      if (!a.inicio && x.ini) a.inicio = x.ini;
      if (!a.fim && x.fim) a.fim = x.fim;
      const al = alvos.find((y) => y.fid === (x.fid === '__testes' ? '__integracao' : x.fid));
      if (!a.area && al && al.area) a.area = al.area.id;
      x.ativ = a;
    });
    const integ = etapas.find((x) => x.fid === '__integracao'), testes = etapas.find((x) => x.fid === '__testes');
    const unir = (a, l) => { a.dependeDe = [...new Set((a.dependeDe || []).concat(l))]; };
    if (integ) unir(integ.ativ, etapas.filter((x) => !x.fid.startsWith('__')).map((x) => x.ativ.id));
    if (testes) unir(testes.ativ, [integ.ativ.id]);
  }
  return foto() !== antes;
};

// ================================================================== aba Funções e especificações
App.novos.funcaoSimples = () => ({ id: uid('fn'), nome: '', responsavel: '', email: '', subfuncoes: [] });
App.novos.especSimples = () => App.novos.qualidade(); // a função que atende fica no desdobramento (o mesmo da versão completa)

App.abas.especificacoes = {
  render() {
    const p = App.p, c = App.campo, b = 'produto.etapas.conceitual', e = p.produto.etapas.conceitual, o = p.qfdOrigem || {};
    const opF = [['', '— escolha —']].concat(e.funcoes.filter((f) => smTxt(f.nome)).map((f) => [f.id, f.nome]), [['__integracao', 'Sistema todo (integração)']]);
    let h = `<h2>Funções e especificações</h2>
<div class="info-box"><b>Só dois passos.</b> <b>1.</b> Diga o que o produto faz e liste as funções (o que ele precisa fazer), com quem cuida de cada uma.
<b>2.</b> Escreva as especificações (o que medir e a meta) e a função que atende cada uma.<br>
O sistema monta sozinho o <b>cronograma</b> (uma etapa por função + integração e testes), a <b>árvore TRL</b> e os <b>responsáveis</b> a cobrar. Depois é só avaliar o TRL e marcar se cada especificação foi atingida.</div>

<div class="cartao"><h3 style="margin-top:0">1. O que o produto faz?</h3>
  <div class="grade-campos">${c(b + '.funcaoGlobal.nome', 'Em uma frase (verbo + objeto)', { classe: 'largo', ph: 'ex.: Dosar sementes uma a uma' })}</div>
  <h4>Funções — o que ele precisa fazer para isso</h4>
  <div class="rolagem"><table class="tab-edit"><thead><tr><th style="width:36px">Nº</th><th>Função</th><th style="width:24%">Responsável</th><th style="width:24%">E-mail do responsável</th><th class="acoes"></th></tr></thead><tbody>
  ${e.funcoes.map((f, i) => `<tr><td class="centro"><b>${i + 1}</b></td><td>${c(`${b}.funcoes.${i}.nome`, '', { ph: 'ex.: Medir a vazão' })}</td>
    <td>${c(`${b}.funcoes.${i}.responsavel`, '', { ph: esc(p.projeto.coordenador.nome || 'nome') })}</td><td>${c(`${b}.funcoes.${i}.email`, '', { tipo: 'email', ph: 'e-mail' })}</td>
    <td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${b}.funcoes" data-i="${i}" title="Remover">✕</button></td></tr>`).join('')
    || '<tr><td colspan="5" class="vazio">Nenhuma função ainda. Escreva-as no quadro abaixo, uma por linha.</td></tr>'}
  </tbody></table></div>
  <div class="grade-campos" style="margin-top:8px"><label class="campo largo">Adicionar várias de uma vez — uma função por linha
    <textarea id="simpLote" rows="3" placeholder="Captar a semente&#10;Individualizar a semente&#10;Controlar a velocidade"></textarea></label></div>
  <div class="barra"><button class="btn primario" data-acao="simp-lote">+ Adicionar funções</button>
    <button class="btn" data-acao="add-linha" data-lista="${b}.funcoes" data-novo="funcaoSimples">+ Uma função</button>
    <span class="muted">Sem responsável, a função fica com o coordenador (${esc(p.projeto.coordenador.nome || 'aba Projeto')}).</span></div>
</div>

<div class="cartao"><h3 style="margin-top:0">2. Especificações — o que medir e qual a meta</h3>
  <div class="rolagem"><table class="tab-edit"><thead><tr><th>Especificação (o que medir)</th><th style="width:20%">Meta</th><th style="width:28%">Função que atende</th><th class="acoes"></th></tr></thead><tbody>
  ${p.qualidade.map((q, i) => `<tr${q.qfd && q.qfd.id ? ' class="qfd"' : ''}>
    <td>${q.qfd && q.qfd.id ? `<span class="selo">QFD</span> ${esc(q.requisito)}` : c(`qualidade.${i}.requisito`, '', { ph: 'ex.: Precisão da dosagem' })}</td>
    <td>${q.qfd && q.qfd.id ? esc(q.criterioAceite) : c(`qualidade.${i}.criterioAceite`, '', { ph: 'ex.: ≥ 95 %' })}</td>
    <td>${(() => { const fid = Simples.funcaoDaEspec(p, q), d = e.desdobramento[nedipIdEspec(q)], extra = d ? d.funcoes.length - (fid && fid !== '__integracao' ? 1 : 0) : 0;
      return `<select class="simp-fn" data-q="${i}">${App.opcoes(opF, fid)}</select>${extra > 0 ? `<div class="muted">+ ${extra} outra(s) ligação(ões) do projeto conceitual (mantidas)</div>` : ''}`; })()}</td>
    <td class="acoes">${q.qfd && q.qfd.id ? '' : `<button class="btn pequeno perigo" data-acao="rem-linha" data-lista="qualidade" data-i="${i}" title="Remover">✕</button>`}</td></tr>`).join('')
    || '<tr><td colspan="4" class="vazio">Nenhuma especificação ainda.</td></tr>'}
  </tbody></table></div>
  <div class="barra"><button class="btn primario" data-acao="add-linha" data-lista="qualidade" data-novo="especSimples">+ Especificação</button>
    ${App.botaoQfdNavegador()}${App.botaoConceitualNavegador()}
    <label class="btn" title="Opcional: traz as especificações de um QFD já feito">⬆ Importar do QFD (opcional)<input type="file" accept=".json,.zip,application/json,application/zip" hidden id="arqQfdSimp"></label>
    ${o.importadoEm ? `<span class="muted">QFD importado em ${esc(o.importadoEm.replace('T', ' ').slice(0, 16))}</span>` : ''}</div>
  <p class="muted">Se a meta foi atingida, se não foi, o valor medido e a correção (PDCA) ficam na aba ✅ Qualidade.</p>
</div>

<div class="cartao"><h3 style="margin-top:0">O que o sistema montou</h3><div id="simpResumo"></div></div>`;
    return h;
  },
  depois() {
    const i = $('#arqQfdSimp');
    if (i) i.addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) App.importarQfd(f); });
    $$('select.simp-fn').forEach((sel) => sel.addEventListener('change', () => { // grava no desdobramento, sem perder as outras ligações
      Simples.definirFuncao(App.p, App.p.qualidade[+sel.dataset.q], sel.value);
      App.marcarSujo(true); App.agendarAnalise(100);
    }));
    App.abas.especificacoes.analise();
  },
  analise() {
    const el = $('#simpResumo');
    if (!el || !App.p) return;
    const p = App.p, fs = p.produto.etapas.conceitual.funcoes.filter((f) => smTxt(f.nome));
    if (!fs.length) { el.innerHTML = '<p class="vazio">Escreva as funções no passo 1: o cronograma, a árvore TRL e os responsáveis aparecem aqui.</p>'; return; }
    const cfg = p.config.simples || {}, ativs = p.macroentregas.flatMap((m) => m.atividades.filter((a) => a.funcaoId));
    const nManuais = p.macroentregas.reduce((n, m) => n + m.atividades.filter((a) => !a.funcaoId).length, 0);
    const semMeta = p.qualidade.filter((q) => !smTxt(q.criterioAceite)).length, semFun = p.qualidade.filter((q) => !Simples.funcaoDaEspec(p, q)).length;
    const t = App.an ? App.an.trl : null, nAval = (App.an ? Object.values(Nucleo.achatar(App.an.trl.arvore)) : []).filter((n) => n.trlInformado !== null).length;
    el.innerHTML = `<div class="kpis">
      <div class="kpi"><div class="r">Etapas no cronograma</div><div class="v">${ativs.length + nManuais}</div><div class="r">${cfg.cronograma ? `${fs.length} função(ões) + integração e testes` : 'as já cadastradas no projeto'}${cfg.cronograma && nManuais ? ` · ${nManuais} já cadastrada(s)` : ''}</div></div>
      <div class="kpi ${nAval ? '' : 'alerta'}"><div class="r">Árvore TRL</div><div class="v">${t && t.sistema !== null ? 'TRL ' + t.sistema : '—'}</div><div class="r">${nAval ? `${nAval} item(ns) avaliado(s)` : 'falta avaliar'} · meta ${p.projeto.trlEsperadoFinal || '—'}</div></div>
      <div class="kpi ${p.qualidade.length ? '' : 'alerta'}"><div class="r">Especificações</div><div class="v">${p.qualidade.length}</div><div class="r">${p.qualidade.filter((q) => q.status === 'conforme').length} atingida(s) · ${p.qualidade.filter((q) => q.status === 'não conforme').length} não atingida(s)</div></div>
    </div>
    ${semMeta ? `<div class="aviso-box">${semMeta} especificação(ões) sem meta.</div>` : ''}${semFun ? `<div class="aviso-box">${semFun} especificação(ões) sem a função que atende.</div>` : ''}
    ${cfg.trl ? '' : `<div class="info-box" style="margin:8px 0">A árvore TRL e as áreas deste projeto foram montadas antes (na versão completa) e continuam valendo, com as avaliações já feitas. As funções não criam outra árvore.</div>`}
    ${cfg.cronograma ? `<table class="tab-edit"><thead><tr><th>Etapa do cronograma (gerada pelas funções)</th><th>Responsável</th><th>Início</th><th>Fim</th></tr></thead><tbody>
    ${ativs.map((a) => `<tr><td>${esc(a.nome)}</td><td>${esc(a.responsavel || '—')}</td><td>${esc(dataBR(a.inicio)) || '—'}</td><td>${esc(dataBR(a.fim)) || '—'}</td></tr>`).join('')}</tbody></table>`
    : `<div class="info-box" style="margin:8px 0">O cronograma já cadastrado (${nManuais} atividade(s)) continua valendo. <button class="btn pequeno" data-acao="simp-gerar-cron">Acrescentar uma etapa por função + integração e testes</button>
      <span class="muted">Atividades com o mesmo nome de uma função são reaproveitadas, não duplicadas.</span></div>`}
    <div class="barra"><button class="btn primario" data-acao="ir-aba" data-aba="trl">📈 Avaliar o TRL</button><button class="btn" data-acao="ir-aba" data-aba="cronograma">📅 Ajustar datas no cronograma</button>
      <button class="btn" data-acao="ir-aba" data-aba="qualidade">✅ Marcar as metas atingidas</button></div>`;
  },
};

App.acoes['simp-gerar-cron'] = () => {
  App.p.config.simples = Object.assign({}, App.p.config.simples, { cronograma: true });
  App.marcarSujo(true); App.analisar(); App.render();
  App.toast('Etapas das funções incluídas no cronograma. As atividades que já existiam continuam lá.', 'ok', 7000);
};

App.acoes['simp-lote'] = () => {
  const t = $('#simpLote'), c = App.p.produto.etapas.conceitual;
  const nomes = String(t ? t.value : '').split('\n').map((x) => x.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean);
  if (!nomes.length) { App.toast('Escreva uma função por linha no quadro.', 'aviso'); return; }
  const tem = new Set(c.funcoes.map((f) => smTxt(f.nome).toLowerCase()));
  const vazias = c.funcoes.filter((f) => !smTxt(f.nome));
  let n = 0;
  nomes.forEach((nome) => { if (tem.has(nome.toLowerCase())) return; const f = vazias.shift(); if (f) f.nome = nome; else c.funcoes.push(Object.assign(App.novos.funcaoSimples(), { nome })); tem.add(nome.toLowerCase()); n++; });
  App.marcarSujo(true); App.analisar(); App.render();
  App.toast(n ? `${n} função(ões) adicionada(s). Cronograma, árvore TRL e responsáveis atualizados.` : 'Essas funções já estavam na lista.', n ? 'ok' : 'aviso');
};

// ------------------------------------------------------------------ aba Projeto enxuta (simplificada)
{
  const renderCompleto = App.abas.projeto.render;
  App.abas.projeto.render = function () {
    if (!Nucleo.simplificado(App.p)) return renderCompleto.call(this);
    const c = App.campo, fs = App.p.produto.etapas.conceitual.funcoes.filter((f) => smTxt(f.nome)).length;
    const pj = App.p.projeto, nMais = [pj.codigo, pj.unidadeEmbrapii, pj.responsavelEmpresa, pj.endereco, pj.coordenadorAdjunto.nome, pj.introducao].filter((x) => smTxt(x)).length + pj.aditivos.length;
    return `<h2>${esc(App.p.projeto.nome || 'Novo projeto')} ${App.seloVersao()}</h2>
<div class="${fs ? 'ok-box' : 'aviso-box'}" style="margin-bottom:14px">${fs ? `Funções cadastradas: ${fs}. ` : '<b>Próximo passo:</b> '}<button class="btn pequeno primario" data-acao="ir-aba" data-aba="especificacoes">🎯 ${fs ? 'Ver funções e especificações' : 'Listar as funções e especificações'}</button></div>
<div class="cartao"><h3 style="margin-top:0">O básico</h3><div class="grade-campos">
  ${c('projeto.nome', 'Nome do projeto *', { classe: 'largo', ph: 'ex.: Dosador de sementes' })}
  ${c('projeto.empresaParceira', 'Empresa parceira (se houver)')}
  ${c('projeto.dataInicio', 'Início', { tipo: 'date' })}
  ${c('projeto.dataFimPrevista', 'Término', { tipo: 'date' })}
  ${c('projeto.trlEsperadoFinal', 'TRL a alcançar no fim', { tipo: 'select', opcoes: App.opcoesTrl })}
  ${c('projeto.coordenador.nome', 'Coordenador')}
  ${c('projeto.coordenador.email', 'E-mail do coordenador', { tipo: 'email' })}
  ${c('projeto.objetivoGeral', 'Objetivo (opcional, uma ou duas frases)', { tipo: 'textarea', classe: 'largo', linhas: 2 })}
</div><p class="muted">Já vem preenchido: você como coordenador e no grupo de gestão (recebe o e-mail de andamento), início hoje e término em 12 meses. Mude o que precisar.</p></div>
<div id="painelKpi"></div>
<details class="cartao"><summary><b>Mais dados (opcional)</b> — código, unidade, endereço, aditivos de prazo, introdução dos relatórios${nMais ? ` · <b>${nMais} já preenchido(s)</b>` : ''}</summary><div class="grade-campos" style="margin-top:10px">
  ${c('projeto.codigo', 'Código')}${c('projeto.ano', 'Ano (capa dos relatórios)', { tipo: 'number' })}
  ${c('projeto.unidadeEmbrapii', 'Unidade EMBRAPII', { classe: 'largo' })}${c('projeto.responsavelEmpresa', 'Responsável na empresa (assina o aceite)')}
  ${c('projeto.endereco', 'Endereço (capa)', { classe: 'largo' })}
  ${c('projeto.coordenadorAdjunto.nome', 'Coordenador adjunto')}${c('projeto.coordenadorAdjunto.email', 'E-mail do coordenador adjunto', { tipo: 'email' })}
  ${c('projeto.introducao', 'Introdução dos relatórios', { tipo: 'textarea', classe: 'largo', linhas: 4 })}</div>
  <div class="vigencia"><h4>Termos aditivos e subtrativos de prazo</h4><div id="vigResumo" class="vig-resumo"></div>
  ${App.tabela('projeto.aditivos', [
    { campo: 'tipo', rotulo: 'Tipo', tipo: 'select', largura: '130px', opcoes: [['aditivo', 'Aditivo (+)'], ['subtrativo', 'Subtrativo (−)']] },
    { campo: 'quantidade', rotulo: 'Quantidade', tipo: 'number', min: 0, largura: '100px' },
    { campo: 'unidade', rotulo: 'Unidade', tipo: 'select', largura: '100px', opcoes: [['meses', 'meses'], ['dias', 'dias']] },
    { campo: 'numero', rotulo: 'Nº do termo', largura: '120px' }, { campo: 'dataTermo', rotulo: 'Data do termo', tipo: 'date', largura: '150px' },
    { campo: 'justificativa', rotulo: 'Justificativa', tipo: 'textarea' },
  ], { novo: 'aditivo', botao: 'Adicionar termo', vazio: 'Nenhum termo: vale o término acima.' })}</div></details>`;
  };
}

// ------------------------------------------------------------------ cronograma: aviso de que as etapas vêm das funções
{
  const ab = App.abas.cronograma;
  if (ab) {
    const r0 = ab.render;
    ab.render = function () {
      const h = r0.call(this);
      if (!Nucleo.simplificado(App.p)) return h;
      return `<div class="info-box">Versão simplificada: as etapas marcadas como <b>função</b> são criadas a partir da aba 🎯 Funções e especificações (o nome vem de lá).
        Aqui você só ajusta datas, percentual concluído e dependências. <button class="btn pequeno" data-acao="ir-aba" data-aba="especificacoes">Editar as funções</button></div>` + h;
    };
  }
}
