/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Aba Pesquisa: busca de anterioridade (patentes) e referências bibliográficas.
 *  - Patentes: estratégia de busca, botões que abrem a busca pronta nas bases, importação do CSV exportado pelo
 *    Google Patents ou pelo Espacenet, tabela editável (situação, relevância, risco de liberdade de operação) e síntese.
 *    O navegador não consulta as bases sozinho (elas não permitem acesso sem servidor): a busca é feita lá e importada aqui.
 *  - Referências: importação de BibTeX ou RIS (Zotero, Mendeley, Google Acadêmico), formatação ABNT (NBR 6023),
 *    citação no texto com {{ref:codigo}} e seção "Referências" automática nos relatórios (só as citadas).
 */
'use strict';

const Pesquisa = {};
window.Pesquisa = Pesquisa;
Pesquisa.SITUACOES = [['pedido', 'pedido (em análise)'], ['concedida', 'concedida (vigente)'], ['expirada', 'expirada (domínio público)'], ['abandonada', 'arquivada/abandonada'], ['verificar', 'verificar']];
Pesquisa.RELEVANCIA = [['alta', 'alta'], ['média', 'média'], ['baixa', 'baixa']];
Pesquisa.FTO = [['verificar', 'verificar'], ['livre', 'livre (sem impedimento)'], ['atenção', 'atenção'], ['risco', 'risco']];
Pesquisa.TIPOS_REF = [['artigo', 'Artigo de periódico'], ['livro', 'Livro'], ['capitulo', 'Capítulo de livro'], ['evento', 'Trabalho em evento'], ['tese', 'Tese/dissertação/TCC'],
  ['norma', 'Norma técnica'], ['patente', 'Patente'], ['site', 'Página da internet'], ['outro', 'Outro']];
Pesquisa.BASES = ['Google Patents', 'Espacenet', 'WIPO Patentscope', 'INPI'];
const pzTxt = (x) => String(x ?? '').trim();

Pesquisa.vazio = () => ({
  estrategia: { objetivo: '', palavras: '', classificacao: '', bases: Pesquisa.BASES.slice(), periodo: '', dataBusca: '', observacoes: '' },
  patentes: [], referencias: [],
});
Pesquisa.novaPatente = () => ({ id: Nucleo.uid('pt'), numero: '', titulo: '', titular: '', pais: '', ano: '', situacao: 'verificar', relevancia: 'média', fto: 'verificar', observacao: '', link: '', base: '' });
Pesquisa.novaReferencia = (id) => ({ id: id || 'ref' + Math.random().toString(16).slice(2, 6), tipo: 'livro', autores: '', titulo: '', subtitulo: '', ano: '', veiculo: '', edicao: '', editora: '', local: '',
  volume: '', numero: '', paginas: '', doi: '', url: '', acesso: '' });
window.pesquisaNormalizar = function (x) {
  x = Object.assign(Pesquisa.vazio(), x && typeof x === 'object' ? x : {});
  x.estrategia = Object.assign(Pesquisa.vazio().estrategia, x.estrategia || {});
  if (!Array.isArray(x.estrategia.bases)) x.estrategia.bases = Pesquisa.BASES.slice();
  x.patentes = (Array.isArray(x.patentes) ? x.patentes : []).filter((t) => t && typeof t === 'object').map((t) => Object.assign(Pesquisa.novaPatente(), t));
  const ids = new Set();
  x.referencias = (Array.isArray(x.referencias) ? x.referencias : []).filter((r) => r && typeof r === 'object').map((r) => {
    r = Object.assign(Pesquisa.novaReferencia(), r);
    r.id = Pesquisa.codigoLimpo(r.id) || Pesquisa.novaReferencia().id;
    while (ids.has(r.id)) r.id += 'b';
    ids.add(r.id);
    return r;
  });
  return x;
};
Pesquisa.codigoLimpo = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_:.-]+/g, '').slice(0, 40);

// ================================================================== ABNT (NBR 6023)
/** Separa os autores ("A; B" ou "A and B") e devolve [{sobrenome, iniciais, org}]. */
Pesquisa.autores = function (s) {
  return pzTxt(s).split(/\s*;\s*|\s+and\s+/i).filter(Boolean).map((a) => {
    const marcadaOrg = /^\{[\s\S]*\}$/.test(a.trim());
    a = a.replace(/[{}]/g, '').trim();
    const ehOrg = marcadaOrg || /^(ABNT|ISO|IEC|INPI|MAPA|EMBRAPA|IBGE|ASTM|DIN)\b/i.test(a) || a === a.toUpperCase()
      || /\b(associa[cç][aã]o|organiza[cç][aã]o|organization|institut[eo]|minist[eé]rio|universidade|university|sociedade|society|ag[eê]ncia|empresa|comit[eê]|conselho|international|brasil)\b/i.test(a);
    if (ehOrg && !/,/.test(a)) return { sobrenome: a, iniciais: '', org: true };
    if (/,/.test(a)) { const [sob, nomes] = a.split(/,(.+)/); return { sobrenome: sob.trim(), iniciais: Pesquisa.iniciais(nomes), org: false }; }
    const p = a.split(/\s+/);
    if (p.length === 1) return { sobrenome: a, iniciais: '', org: true };
    return { sobrenome: p[p.length - 1], iniciais: Pesquisa.iniciais(p.slice(0, -1).join(' ')), org: false };
  });
};
Pesquisa.iniciais = (n) => pzTxt(n).split(/[\s.]+/).filter(Boolean).map((x) => (/^(de|da|do|dos|das|e)$/i.test(x) ? '' : x[0].toUpperCase() + '.')).filter(Boolean).join(' ');
Pesquisa.autoresAbnt = function (s) {
  const l = Pesquisa.autores(s);
  if (!l.length) return '';
  const f = (a) => (a.org ? a.sobrenome.toUpperCase() : `${a.sobrenome.toUpperCase()}${a.iniciais ? ', ' + a.iniciais : ''}`);
  return l.length > 3 ? f(l[0]) + ' et al.' : l.map(f).join('; ');
};
/** Citação no texto (autor-data): (SILVA, 2020), (SILVA; SOUZA, 2020), (SILVA et al., 2020). */
Pesquisa.citacao = function (r) {
  const l = Pesquisa.autores(r.autores), ano = pzTxt(r.ano) || 's.d.';
  const nome = (a) => a.sobrenome.toUpperCase();
  const quem = !l.length ? fCurto(r.titulo, 30).toUpperCase() : l.length > 3 ? nome(l[0]) + ' et al.' : l.map(nome).join('; ');
  return `(${quem}, ${ano})`;
};
const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const dataAbnt = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[3]} ${MESES[+m[2] - 1]} ${m[1]}` : pzTxt(iso); };
/** Referência ABNT em partes [{t, b}] (b = negrito no destaque do título/veículo). */
Pesquisa.abntPartes = function (r) {
  const P = [], add = (t, b) => { if (pzTxt(t)) P.push({ t, b: !!b }); };
  const aut = Pesquisa.autoresAbnt(r.autores), ano = pzTxt(r.ano) || '[s.d.]', loc = pzTxt(r.local) || '[s.l.]', ed = pzTxt(r.editora) || '[s.n.]';
  const tit = pzTxt(r.titulo).replace(/\.$/, ''), sub = pzTxt(r.subtitulo) ? ': ' + pzTxt(r.subtitulo).replace(/\.$/, '') : '';
  const pag = pzTxt(r.paginas) ? `p. ${pzTxt(r.paginas).replace(/^p\.\s*/, '')}` : '';
  if (aut) add(aut.replace(/\.$/, '') + '. '); // "et al." e iniciais já terminam em ponto
  switch (r.tipo) {
    case 'artigo':
      add(tit + sub + '. '); add(pzTxt(r.veiculo), true);
      add([pzTxt(r.local) ? ', ' + pzTxt(r.local) : '', pzTxt(r.volume) ? `, v. ${pzTxt(r.volume)}` : '', pzTxt(r.numero) ? `, n. ${pzTxt(r.numero)}` : '', pag ? ', ' + pag : '', `, ${ano}.`].join(''));
      break;
    case 'capitulo': case 'evento':
      add(tit + sub + '. In: '); add(pzTxt(r.veiculo) || '[obra]', true); add(`. ${loc}: ${ed}, ${ano}.${pag ? ' ' + pag + '.' : ''}`);
      break;
    case 'tese':
      add(tit, true); add(sub + '. ' + ano + '. '); add(`${pzTxt(r.veiculo) || 'Trabalho acadêmico'} – ${ed}, ${loc}, ${ano}.`);
      break;
    case 'patente':
      add(tit, true); add(sub + '. '); add(`${pzTxt(r.numero) ? 'Número: ' + pzTxt(r.numero) + '. ' : ''}${pzTxt(r.local) ? pzTxt(r.local) + ', ' : ''}${ano}.`);
      break;
    default: // livro, norma, site, outro
      add(tit, true); add(sub + '. ');
      if (pzTxt(r.edicao)) add(`${pzTxt(r.edicao).replace(/\.?\s*ed\.?$/i, '')}. ed. `);
      if (r.tipo !== 'site' || pzTxt(r.editora)) add(`${loc}: ${ed}, ${ano}.`); else add(`${ano}.`);
      if (pag && r.tipo !== 'livro') add(' ' + pag + '.');
  }
  if (pzTxt(r.doi)) add(` DOI: ${pzTxt(r.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}.`);
  if (pzTxt(r.url) && (r.tipo === 'site' || !pzTxt(r.doi))) add(` Disponível em: ${pzTxt(r.url)}.`);
  if (pzTxt(r.acesso)) add(` Acesso em: ${dataAbnt(r.acesso)}.`);
  return P;
};
Pesquisa.abntTexto = (r) => Pesquisa.abntPartes(r).map((x) => x.t).join('');

// ================================================================== importação: BibTeX e RIS
const DIACR = { "'": '\u0301', '`': '\u0300', '^': '\u0302', '~': '\u0303', '"': '\u0308', c: '\u0327' };
/** LaTeX → texto: {\'e}, \'{e}, \c{c}, {\"o} … viram letras acentuadas; chaves somem. */
const tex = (s) => String(s || '')
  .replace(/\{?\\(['`^~"]|c\s)\s*\{?([A-Za-z])\}?\}?/g, (m, d, l) => (l + DIACR[d.trim()]).normalize('NFC'))
  .replace(/\\&/g, '&').replace(/---?/g, '–').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
/** Autores do BibTeX: "{Instituição}" (chaves duplas no arquivo) fica marcado como autor institucional. */
const texAutores = (s) => String(s || '').split(/\s+and\s+/i).map((a) => (/^\s*\{[\s\S]*\}\s*$/.test(a) ? '{' + tex(a) + '}' : tex(a))).filter(Boolean).join('; ');
const TIPOS_BIB = { article: 'artigo', book: 'livro', inbook: 'capitulo', incollection: 'capitulo', inproceedings: 'evento', conference: 'evento', phdthesis: 'tese', mastersthesis: 'tese',
  misc: 'site', online: 'site', electronic: 'site', techreport: 'outro', standard: 'norma', patent: 'patente' };
Pesquisa.lerBibtex = function (txt) {
  const out = [], re = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let m;
  while ((m = re.exec(txt))) {
    let i = re.lastIndex, nivel = 1;
    const ini = i;
    while (i < txt.length && nivel > 0) { if (txt[i] === '{') nivel++; else if (txt[i] === '}') nivel--; i++; }
    const corpo = txt.slice(ini, i - 1), campos = {};
    const rc = /(\w+)\s*=\s*/g;
    let c;
    while ((c = rc.exec(corpo))) {
      let j = rc.lastIndex, v = '';
      if (corpo[j] === '{') { let n = 1; j++; const s0 = j; while (j < corpo.length && n > 0) { if (corpo[j] === '{') n++; else if (corpo[j] === '}') n--; j++; } v = corpo.slice(s0, j - 1); }
      else if (corpo[j] === '"') { const s0 = ++j; while (j < corpo.length && corpo[j] !== '"') j++; v = corpo.slice(s0, j); j++; }
      else { const s0 = j; while (j < corpo.length && corpo[j] !== ',') j++; v = corpo.slice(s0, j); }
      campos[c[1].toLowerCase()] = v;
      rc.lastIndex = j;
    }
    const tipo = TIPOS_BIB[m[1].toLowerCase()];
    if (!tipo && m[1].toLowerCase() === 'comment') continue;
    const r = Pesquisa.novaReferencia(Pesquisa.codigoLimpo(m[2]));
    Object.assign(r, { tipo: tipo || 'outro', autores: texAutores(campos.author || campos.editor || (campos.organization ? `{${campos.organization}}` : '') || (campos.institution ? `{${campos.institution}}` : '')),
      titulo: tex(campos.title), ano: tex(campos.year || (campos.date || '').slice(0, 4)), veiculo: tex(campos.journal || campos.booktitle || campos.school || campos.journaltitle || ''),
      editora: tex(campos.publisher || campos.school || campos.institution || ''), local: tex(campos.address || campos.location || ''), volume: tex(campos.volume), numero: tex(campos.number || campos.issue),
      paginas: tex(campos.pages).replace(/--/g, '-'), edicao: tex(campos.edition), doi: tex(campos.doi), url: tex(campos.url), acesso: tex(campos.urldate) });
    if (r.titulo) out.push(r);
  }
  return out;
};
const TIPOS_RIS = { JOUR: 'artigo', JFULL: 'artigo', MGZN: 'artigo', BOOK: 'livro', CHAP: 'capitulo', CONF: 'evento', CPAPER: 'evento', THES: 'tese', ELEC: 'site', WEB: 'site', STAND: 'norma', PAT: 'patente' };
Pesquisa.lerRis = function (txt) {
  const out = [];
  let r = null, au = [], ini = '', fim = '';
  String(txt).replace(/\r/g, '').split('\n').forEach((l) => {
    const m = l.match(/^([A-Z][A-Z0-9])\s{1,2}-\s?(.*)$/);
    if (!m) return;
    const [, k, v0] = m, v = v0.trim();
    if (k === 'TY') { r = Pesquisa.novaReferencia(); r.tipo = TIPOS_RIS[v] || 'outro'; au = []; ini = fim = ''; return; }
    if (!r) return;
    if (k === 'ER') { r.autores = au.join('; '); r.paginas = ini && fim ? `${ini}-${fim}` : ini; if (!r.id || /^ref/.test(r.id)) r.id = Pesquisa.codigoLimpo(((Pesquisa.autores(r.autores)[0] || {}).sobrenome || 'ref').toLowerCase() + r.ano); if (r.titulo) out.push(r); r = null; return; }
    if (['AU', 'A1', 'A2'].includes(k)) au.push(v);
    else if (['TI', 'T1'].includes(k)) r.titulo = v;
    else if (['T2', 'JO', 'JF', 'BT', 'JA'].includes(k)) r.veiculo = r.veiculo || v;
    else if (['PY', 'Y1', 'DA'].includes(k)) r.ano = r.ano || (v.match(/\d{4}/) || [''])[0];
    else if (k === 'VL') r.volume = v; else if (k === 'IS') r.numero = v; else if (k === 'SP') ini = v; else if (k === 'EP') fim = v;
    else if (k === 'PB') r.editora = v; else if (k === 'CY') r.local = v; else if (k === 'DO') r.doi = v; else if (k === 'UR') r.url = r.url || v; else if (k === 'ET') r.edicao = v; else if (k === 'ID') r.id = Pesquisa.codigoLimpo(v);
  });
  return out;
};

// ================================================================== importação: CSV de patentes (Google Patents / Espacenet)
Pesquisa.lerCsvPatentes = function (txt) {
  let ls = Formulario.lerCsv(txt);
  while (ls.length && !ls[0].some((c) => /title|t[ií]tulo/i.test(c))) ls = ls.slice(1); // Google Patents começa com "search URL:"
  if (!ls.length) throw new Error('não achei a linha de cabeçalho (com "title" ou "título").');
  const cab = ls[0].map((c) => fLinha(c).toLowerCase());
  const col = (re) => cab.findIndex((c) => re.test(c));
  const iN = col(/^(id|publication number|n[uú]mero|numero|patent number|publication|n[uú]mero de publica)/), iT = col(/title|t[ií]tulo/), iTit = col(/assignee|applicant|titular|depositante|requerente/);
  const iPri = col(/priority|prioridade/), iPub = col(/publication date|data de publica|^publication$/), iCon = col(/grant|concess/), iL = col(/link|url/);
  const ano = (s) => (String(s || '').match(/(19|20)\d{2}/) || [''])[0];
  const atual = new Date().getFullYear();
  return ls.slice(1).filter((l) => l.some((c) => pzTxt(c))).map((l) => {
    const numero = pzTxt(l[iN]).replace(/\s+/g, ' '), anoPri = ano(l[iPri]) || ano(l[iPub]), anoCon = ano(l[iCon]);
    let situacao = 'pedido';
    if (anoPri && +anoPri + 20 < atual) situacao = 'expirada';
    else if (anoCon) situacao = 'concedida';
    return Object.assign(Pesquisa.novaPatente(), { numero, titulo: fLinha(l[iT]), titular: fLinha(l[iTit] || '').split(/\s*[,;]\s*/).slice(0, 3).join('; '), pais: (numero.match(/^[A-Z]{2}/) || [''])[0],
      ano: anoPri, situacao, link: pzTxt(l[iL]), observacao: 'situação estimada pelas datas; confirmar a vigência na base oficial' });
  }).filter((p) => p.numero || p.titulo);
};

/** Endereços da busca pronta nas bases (a partir das palavras-chave e da classificação). */
Pesquisa.urlsBusca = function (e) {
  const termos = pzTxt(e.palavras).split(/\s*[;\n]\s*/).filter(Boolean);
  const q = termos.map((t) => (/\s/.test(t) ? `"${t}"` : t)).join(' OR ') + (pzTxt(e.classificacao) ? ' ' + pzTxt(e.classificacao) : '');
  const enc = encodeURIComponent(q.trim());
  return {
    'Google Patents': `https://patents.google.com/?q=${encodeURIComponent('(' + termos.join(') OR (') + ')')}`,
    Espacenet: `https://worldwide.espacenet.com/patent/search?q=${enc}`,
    'WIPO Patentscope': `https://patentscope.wipo.int/search/pt/result.jsf?query=${enc}`,
    INPI: 'https://busca.inpi.gov.br/pePI/jsp/patentes/PatenteSearchBasico.jsp',
  };
};

/** Síntese da busca: contagens e listas por situação/risco. */
Pesquisa.sintese = function (pq) {
  const P = pq.patentes, cont = (k, v) => P.filter((x) => x[k] === v);
  return { total: P.length, pedidos: cont('situacao', 'pedido'), concedidas: cont('situacao', 'concedida'), expiradas: cont('situacao', 'expirada'), arquivadas: cont('situacao', 'abandonada'),
    verificar: cont('situacao', 'verificar'), riscos: P.filter((x) => x.fto === 'risco' || (x.fto === 'atenção' && x.relevancia === 'alta')),
    vigentesAltas: P.filter((x) => ['pedido', 'concedida'].includes(x.situacao) && x.relevancia === 'alta') };
};

// ================================================================== tela
App.pesquisaRefAberta = null;
App.novos.patente = () => Pesquisa.novaPatente();
App.abas.pesquisa = {
  render() {
    const pq = App.p.pesquisa, e = pq.estrategia, c = App.campo, s = Pesquisa.sintese(pq), urls = Pesquisa.urlsBusca(e);
    let h = `<h2>Pesquisa: anterioridade e referências</h2>
<div class="cartao"><h3 style="margin-top:0">Busca de anterioridade (patentes)</h3>
  <p class="muted" style="margin-top:0">1) Defina a estratégia; 2) abra a busca pronta em cada base; 3) exporte os resultados (Google Patents: “Download (CSV)”; Espacenet: exportar CSV) e importe aqui; 4) classifique relevância e risco. A situação vem estimada pelas datas: confirme a vigência na base oficial (INPI para o Brasil).</p>
  <div class="grade-campos">${c('pesquisa.estrategia.objetivo', 'Objetivo da busca', { classe: 'largo', ph: 'ex.: verificar liberdade de operação do sistema de regulagem automática' })}
    ${c('pesquisa.estrategia.palavras', 'Palavras-chave (uma por linha ou separadas por ;)', { tipo: 'textarea', linhas: 3, render: true })}
    ${c('pesquisa.estrategia.classificacao', 'Classificação IPC/CPC', { ph: 'ex.: B07B 4/08' })}
    ${c('pesquisa.estrategia.periodo', 'Período coberto', { ph: 'ex.: 2000–2026' })}
    ${c('pesquisa.estrategia.dataBusca', 'Data da busca', { tipo: 'date' })}
    ${c('pesquisa.estrategia.observacoes', 'Observações da estratégia', { tipo: 'textarea', classe: 'largo', linhas: 2 })}</div>
  <div class="barra">${Pesquisa.BASES.map((b) => `<a class="btn" href="${esc(urls[b])}" target="_blank" rel="noopener" ${pzTxt(e.palavras) || b === 'INPI' ? '' : 'aria-disabled="true"'}>↗ ${esc(b)}</a>`).join('')}
    <label class="btn primario">⬆ Importar CSV de patentes<input type="file" accept=".csv,.txt,text/csv,text/plain" hidden id="csvPatentes"></label></div>
  ${pzTxt(e.palavras) ? '<p class="muted">No INPI a busca é manual: copie as palavras-chave acima.</p>' : '<p class="muted">Preencha as palavras-chave para os botões abrirem a busca pronta.</p>'}
  ${App.tabela('pesquisa.patentes', [{ campo: 'numero', rotulo: 'Número', largura: '130px' }, { campo: 'titulo', rotulo: 'Título', tipo: 'textarea' }, { campo: 'titular', rotulo: 'Titular', largura: '13%' },
    { campo: 'ano', rotulo: 'Ano', largura: '60px' }, { campo: 'situacao', rotulo: 'Situação', tipo: 'select', opcoes: Pesquisa.SITUACOES, largura: '150px', render: true },
    { campo: 'relevancia', rotulo: 'Relevância', tipo: 'select', opcoes: Pesquisa.RELEVANCIA, largura: '95px', render: true }, { campo: 'fto', rotulo: 'Liberdade de operação', tipo: 'select', opcoes: Pesquisa.FTO, largura: '140px', render: true },
    { campo: 'observacao', rotulo: 'Observação', tipo: 'textarea' }], { novo: 'patente', botao: 'Adicionar patente', vazio: 'Nenhuma patente: importe o CSV de uma base ou adicione à mão.' })}
  ${s.total ? `<div class="info-box"><b>Síntese:</b> ${s.total} documento(s) — ${s.expiradas.length} em domínio público, ${s.concedidas.length} concedida(s), ${s.pedidos.length} pedido(s) em análise, ${s.arquivadas.length} arquivado(s), ${s.verificar.length} a verificar.
    ${s.riscos.length ? `<br><b class="gap-neg">Atenção à liberdade de operação:</b> ${s.riscos.map((x) => esc(x.numero || x.titulo)).join('; ')}.` : ''}</div>` : ''}
</div>
<div class="cartao"><h3 style="margin-top:0">Referências bibliográficas (ABNT)</h3>
  <p class="muted" style="margin-top:0">Importe do Zotero, Mendeley ou Google Acadêmico (BibTeX <code>.bib</code> ou RIS <code>.ris</code>) ou cadastre à mão. Cite no texto com o código, ex.: <span class="marcador">{{ref:back2008}}</span> → “(BACK et al., 2008)”. Os relatórios ganham a seção “Referências” só com as obras citadas.</p>
  <div class="barra"><label class="btn primario">⬆ Importar BibTeX/RIS<input type="file" accept=".bib,.ris,.txt,text/plain" hidden id="arqRefs"></label>
    <button class="btn" data-acao="ref-colar">Colar BibTeX/RIS</button><button class="btn" data-acao="ref-nova">+ Referência à mão</button></div>`;
    if (!pq.referencias.length) h += '<p class="vazio">Nenhuma referência.</p>';
    pq.referencias.forEach((r, i) => {
      const b = `pesquisa.referencias.${i}`, aberta = App.pesquisaRefAberta === r.id;
      h += `<div class="ref-item ${aberta ? 'aberta' : ''}"><div class="ref-linha"><span class="ref-abnt">${Pesquisa.abntPartes(r).map((x) => (x.b ? `<b>${esc(x.t)}</b>` : esc(x.t))).join('')}</span>
        <span class="ref-acoes"><span class="marcador" data-acao="copiar" data-texto="{{ref:${esc(r.id)}}}" title="Copiar para citar no texto">{{ref:${esc(r.id)}}}</span> <span class="muted">${esc(Pesquisa.citacao(r))}</span>
        <button class="btn pequeno" data-acao="ref-abrir" data-id="${esc(r.id)}">${aberta ? '✓ Fechar' : '✎ Editar'}</button><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="pesquisa.referencias" data-i="${i}">✕</button></span></div>
        ${aberta ? `<div class="grade-campos">${c(b + '.id', 'Código (para citar)', { render: true })}${c(b + '.tipo', 'Tipo', { tipo: 'select', opcoes: Pesquisa.TIPOS_REF, render: true })}
          ${c(b + '.autores', 'Autores (Sobrenome, Nome; Sobrenome, Nome) ou {Instituição}', { classe: 'largo', render: true })}${c(b + '.titulo', 'Título', { classe: 'largo', render: true })}${c(b + '.subtitulo', 'Subtítulo', { render: true })}
          ${c(b + '.ano', 'Ano', { render: true })}${c(b + '.veiculo', r.tipo === 'artigo' ? 'Periódico' : ['capitulo', 'evento'].includes(r.tipo) ? 'Livro / evento (In:)' : r.tipo === 'tese' ? 'Tipo (Tese, Dissertação…) e curso' : 'Série / veículo', { render: true })}
          ${c(b + '.edicao', 'Edição', { render: true })}${c(b + '.editora', r.tipo === 'tese' ? 'Instituição' : 'Editora', { render: true })}${c(b + '.local', 'Local', { render: true })}
          ${c(b + '.volume', 'Volume', { render: true })}${c(b + '.numero', 'Número', { render: true })}${c(b + '.paginas', 'Páginas', { render: true })}
          ${c(b + '.doi', 'DOI', { render: true })}${c(b + '.url', 'URL', { render: true })}${c(b + '.acesso', 'Acesso em', { tipo: 'date', render: true })}</div>` : ''}</div>`;
    });
    h += `</div>
<div class="cartao"><h3 style="margin-top:0">Nos relatórios</h3><p class="muted" style="margin-top:0">A busca de anterioridade entra numa macroentrega pelo bloco <b>📚 Pesquisa</b> (estratégia, tabela e síntese). As referências citadas com {{ref:código}} em qualquer texto entram automaticamente na seção “Referências” do relatório.</p></div>`;
    return h;
  },
  depois() {
    const liga = (sel, fn) => { const i = $(sel); if (i) i.addEventListener('change', async (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) await fn(f); }); };
    liga('#csvPatentes', async (f) => {
      try {
        const l = Pesquisa.lerCsvPatentes(Formulario.decodificar(await f.arrayBuffer()));
        if (!l.length) throw new Error('nenhuma patente no arquivo.');
        const tem = new Set(App.p.pesquisa.patentes.map((x) => x.numero));
        const novas = l.filter((x) => !x.numero || !tem.has(x.numero));
        novas.forEach((x) => { x.base = /espacenet/i.test(f.name) ? 'Espacenet' : 'Google Patents'; });
        App.p.pesquisa.patentes.push(...novas);
        if (!App.p.pesquisa.estrategia.dataBusca) App.p.pesquisa.estrategia.dataBusca = hojeISO();
        App.p.produto.etapas.informacional.recomendacoes.inf_bench = true;
        App.marcarSujo(true); App.render();
        App.toast(`${novas.length} patente(s) importada(s)${l.length - novas.length ? `; ${l.length - novas.length} repetida(s) ignorada(s)` : ''}. Classifique relevância e liberdade de operação.`, 'ok', 8000);
      } catch (e) { App.toast('CSV de patentes: ' + esc(e.message), 'erro', 9000); }
    });
    liga('#arqRefs', async (f) => App.refImportar(Formulario.decodificar(await f.arrayBuffer())));
  },
};
App.refImportar = function (txt) {
  const l = /^\s*TY\s{1,2}-/m.test(txt) ? Pesquisa.lerRis(txt) : Pesquisa.lerBibtex(txt);
  if (!l.length) { App.toast('Nenhuma referência reconhecida (BibTeX começa com @article{…}; RIS com TY  - ).', 'erro', 9000); return; }
  const refs = App.p.pesquisa.referencias, ids = new Set(refs.map((r) => r.id));
  l.forEach((r) => { while (ids.has(r.id)) r.id += 'b'; ids.add(r.id); refs.push(r); });
  App.fecharModal(); App.marcarSujo(true); App.render();
  App.toast(`${l.length} referência(s) importada(s). Cite com {{ref:código}}.`, 'ok', 7000);
};
App.acoes['ref-colar'] = () => {
  App.modal(`<h2>Colar referências</h2><p class="muted">Cole o conteúdo BibTeX (@article{…}) ou RIS (TY  - …), exportado do Zotero, Mendeley ou Google Acadêmico (“Citar” → BibTeX).</p>
    <textarea id="txtRefs" rows="12" style="font-family:monospace"></textarea><div class="barra"><button class="btn primario" data-acao="ref-colar-ok">Importar</button></div>`);
};
App.acoes['ref-colar-ok'] = () => App.refImportar($('#txtRefs').value);
App.acoes['ref-nova'] = () => { const r = Pesquisa.novaReferencia(); App.p.pesquisa.referencias.push(r); App.pesquisaRefAberta = r.id; App.marcarSujo(true); App.render(); };
App.acoes['ref-abrir'] = (el) => { App.pesquisaRefAberta = App.pesquisaRefAberta === el.dataset.id ? null : el.dataset.id; App.render(); };

// ================================================================== PDF
/** Bloco "Pesquisa" (busca de anterioridade). partes: estrategia, patentes, sintese. */
Pdf.blocoPesquisa = function (p, partes, ctx) {
  ctx = Object.assign({ h: (t) => ({ text: t, style: 'h3' }), recuo: 0 }, ctx, Pdf.ctxLargura(ctx.recuo || 0));
  const pq = p.pesquisa, e = pq.estrategia, itens = [], add = (no, larga = false) => itens.push({ no, larga }), cola = (no) => itens.push({ no, cola: true });
  if (partes.includes('estrategia') && (pzTxt(e.palavras) || pzTxt(e.objetivo))) {
    cola(ctx.h('Estratégia de busca'));
    add(Pdf.kpi([['Objetivo', e.objetivo || '—'], ['Palavras-chave', pzTxt(e.palavras).split(/\s*[;\n]\s*/).filter(Boolean).join('; ') || '—'], ['Classificação IPC/CPC', e.classificacao || '—'],
      ['Bases consultadas', (e.bases || []).join(', ') || '—'], ['Período', e.periodo || '—'], ['Data da busca', Nucleo.dataBR(e.dataBusca) || '—']]));
    if (pzTxt(e.observacoes)) Pdf.texto(e.observacoes, ctx.num).forEach((n) => add(n));
  }
  if (partes.includes('patentes') && pq.patentes.length) {
    cola(ctx.h('Documentos de patente analisados'));
    const corSit = { expirada: COR.teal, concedida: '#b7791f', pedido: '#b7791f', abandonada: COR.suave, verificar: COR.suave };
    const corFto = { livre: COR.teal, 'atenção': '#b7791f', risco: '#c0392b', verificar: COR.suave };
    Pdf.tabelaAdaptavel(['Número', 'Título', 'Titular', 'Ano', 'Situação', 'Relevância', 'Liberdade de operação'], pq.patentes.map((x) => [{ text: x.numero, bold: true }, x.titulo, x.titular, x.ano,
      { text: (Pesquisa.SITUACOES.find(([k]) => k === x.situacao) || [, x.situacao])[1], color: corSit[x.situacao], bold: true }, x.relevancia,
      { text: (Pesquisa.FTO.find(([k]) => k === x.fto) || [, x.fto])[1], color: corFto[x.fto], bold: x.fto === 'risco' }]),
    [{ min: 80 }, { min: 130, w: '*' }, { min: 75 }, { min: 30 }, { min: 70 }, { min: 50 }, { min: 70 }], ctx).forEach((x) => itens.push(x));
    const obs = pq.patentes.filter((x) => pzTxt(x.observacao) && !/situação estimada/.test(x.observacao));
    if (obs.length) itens.push({ no: { ul: obs.map((x) => `${x.numero || x.titulo}: ${x.observacao}`), style: 'corpo', fontSize: 8.8, margin: [0, 0, 0, 6] }, segue: true });
  }
  if (partes.includes('sintese') && pq.patentes.length) {
    const s = Pesquisa.sintese(pq);
    cola(ctx.h('Síntese da busca'));
    add({ text: `${s.total} documento(s) analisado(s): ${s.expiradas.length} em domínio público, ${s.concedidas.length} concedido(s) e vigente(s), ${s.pedidos.length} pedido(s) em análise, ${s.arquivadas.length} arquivado(s) e ${s.verificar.length} a verificar.`, style: 'corpo', margin: [0, 0, 0, 4] });
    if (s.expiradas.length) add(caixa([{ text: 'Domínio público (podem ser usadas livremente como base de engenharia): ', bold: true }, s.expiradas.map((x) => x.numero || x.titulo).join('; ') + '.'], 'ok'));
    if (s.riscos.length || s.vigentesAltas.length) add(caixa([{ text: 'Atenção à liberdade de operação: ', bold: true }, [...new Set([...s.riscos, ...s.vigentesAltas])].map((x) => `${x.numero || x.titulo} (${x.titular || 'titular não informado'})`).join('; ') + '. Evite reproduzir as reivindicações e acompanhe a situação na base oficial.']));
  }
  return Pdf.montarOrientacao(itens);
};

/** Seção "Referências" com as obras citadas (num.citadas é preenchido ao montar os textos). */
Pdf.referenciasCitadas = function (p, num) {
  const ids = num && num.citadas ? [...num.citadas] : [];
  const refs = (p.pesquisa ? p.pesquisa.referencias : []).filter((r) => ids.includes(r.id)).sort((a, b) => Pesquisa.abntTexto(a).localeCompare(Pesquisa.abntTexto(b), 'pt-BR'));
  return refs.map((r) => ({ text: Pesquisa.abntPartes(r).map((x) => (x.b ? { text: x.t, bold: true } : x.t)), style: 'corpo', alignment: 'left', margin: [0, 0, 0, 7] }));
};
