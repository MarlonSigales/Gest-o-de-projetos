/*
 * Relatório do QFD (casa da qualidade) a partir do backup completo exportado pelo sistema QFD, com a identidade
 * visual dos PDFs deste sistema. As seções são escolhidas por macroentrega (bloco "QFD" do desenvolvimento) e para
 * o relatório geral. Tabelas largas viram a folha (paisagem) ou, se nem assim couberem, são divididas em partes.
 */
'use strict';

const Qfd = {};
window.Qfd = Qfd; // outros scripts testam window.Qfd
Qfd.SECOES = [
  ['dicionario', 'Dicionário de requisitos'],
  ['clientes', 'Requisitos do cliente'],
  ['comparacoes', 'Hierarquização dos requisitos do cliente (diagrama de Mudge)'],
  ['projeto', 'Requisitos de projeto'],
  ['matriz', 'Matriz QFD (casa da qualidade)'],
  ['telhado', 'Telhado de correlações'],
  ['especificacoes', 'Especificações de projeto'],
  ['competitiva', 'Avaliação competitiva'],
  ['atendimento', 'Atendimento aos requisitos do cliente'],
  ['ranking', 'Ranking de prioridades'],
  ['insights', 'Indicadores da análise'],
];
Qfd.nome = (s) => (Qfd.SECOES.find(([k]) => k === s) || [, s])[1];
Qfd.SETA = { up: '+', down: '−', none: '*' }; // a fonte dos PDFs (Roboto) não tem setas
Qfd.LEGENDA_SENTIDO = 'Sentido: + quanto maior, melhor · − quanto menor, melhor · * valor nominal (alvo).';
Qfd.TERCOS = { superior: ['Superior', '#e3f4ea', '#1e7a4c'], medio: ['Médio', '#fdecec', '#b3261e'], inferior: ['Inferior', '#fff1e0', '#a85d00'] };
Qfd.CORES = ['#085357', '#c0392b', '#2e8b57', '#d35400', '#0e7490', '#7c3aed', '#b7791f', '#4b5563', '#be185d', '#1d4ed8'];
const QFD_TOL = 0.05; // tolerância das metas nominais (igual ao sistema QFD)

const qTxt = (x) => String(x ?? '').trim();
const qPct = (x, d = 1) => (x === null || x === undefined || isNaN(x)) ? '—' : (x * 100).toFixed(d).replace('.', ',') + '%';
const qNum = (x, d = 2) => (x === null || x === undefined || isNaN(x)) ? '—' : String(Math.round(x * 10 ** d) / 10 ** d).replace('.', ',');

Qfd.sentido = (s) => ({ crescente: 'up', decrescente: 'down', nominal: 'none' }[String(s || '').toLowerCase()] || (['up', 'down', 'none'].includes(s) ? s : 'none'));

/** Interpreta o backup do QFD em estruturas prontas para tabelas. Devolve null se não for um backup válido. */
Qfd.analisar = function (d) {
  if (!d || typeof d !== 'object' || !Array.isArray(d.requisitosProjeto)) return null;
  const rc = (d.requisitosCliente || []).map((r, i) => ({ id: r.id, n: i + 1, cod: 'RC' + (i + 1), descricao: qTxt(r.descricao), obs: qTxt(r.observacao), pts: +r.importancia || 0, peso: +r.peso || 0 }));
  const rp = d.requisitosProjeto.map((r, i) => ({ id: r.id, n: i + 1, cod: 'RP' + (i + 1), descricao: qTxt(r.descricao), obs: qTxt(r.observacao),
    sentido: Qfd.sentido(r.sentidoMelhoria), dificuldade: r.dificuldadeTecnica ?? null, impAbs: +r.importanciaAbsoluta || 0, peso: +r.pesoRelativo || 0 }));
  const rcId = new Map(rc.map((x) => [x.id, x])), rpId = new Map(rp.map((x) => [x.id, x]));

  // comparação aos pares: o primeiro requisito do par é o preferido; "valor" é a intensidade (1, 3 ou 5)
  const comparacoes = (d.comparacaoCliente || []).map((c) => ({ a: rcId.get(c.requisito1), b: rcId.get(c.requisito2), valor: +c.valor || 0 })).filter((c) => c.a && c.b);
  if (!rc.some((x) => x.pts) && comparacoes.length) comparacoes.forEach((c) => { c.a.pts += c.valor; });
  const somaPts = rc.reduce((s, x) => s + x.pts, 0);
  if (!rc.some((x) => x.peso) && somaPts) rc.forEach((x) => { x.peso = x.pts / somaPts; });

  // matriz de relações e telhado
  const mat = new Map();
  (d.matrizQFD || []).forEach((m) => { const v = +m.influencia || 0; if (v > 0 && rcId.has(m.requisitoCliente) && rpId.has(m.requisitoProjeto)) mat.set(m.requisitoCliente + '|' + m.requisitoProjeto, v); });
  const infl = (c, p) => mat.get(c.id + '|' + p.id) || 0;
  if (!rp.some((x) => x.impAbs)) rp.forEach((p) => { p.impAbs = rc.reduce((s, c) => s + infl(c, p) * c.pts, 0); });
  const somaImp = rp.reduce((s, x) => s + x.impAbs, 0);
  if (!rp.some((x) => x.peso) && somaImp) rp.forEach((x) => { x.peso = x.impAbs / somaImp; });
  const correl = new Map();
  (d.correlacaoProjeto || []).forEach((c) => {
    const a = rpId.get(c.requisito1), b = rpId.get(c.requisito2), v = qTxt(c.correlacao);
    if (a && b && a !== b && ['++', '+', '-', '--'].includes(v)) correl.set([a.n, b.n].sort((x, y) => x - y).join('|'), v);
  });

  // hierarquia dos requisitos de projeto (terços)
  const ordem = [...rp].sort((a, b) => b.peso - a.peso || b.impAbs - a.impAbs || a.n - b.n);
  const t = Math.ceil(ordem.length / 3);
  ordem.forEach((x, k) => { x.rank = k + 1; x.terco = k < t ? 'superior' : k < 2 * t ? 'medio' : 'inferior'; });

  // especificações, metas e valor medido do "nosso produto"
  const ac = d.avaliacaoCompetitiva || {};
  const produtos = (ac.produtos || []).map((p, i) => ({ id: p.id, nome: qTxt(p.nome) || 'Produto ' + (i + 1), nosso: p.tipo === 'nosso' || p.id === 'nosso' }));
  if (!produtos.some((p) => p.nosso)) produtos.unshift({ id: 'nosso', nome: 'Nosso produto', nosso: true });
  produtos.forEach((p, i) => { p.cor = Qfd.CORES[i % Qfd.CORES.length]; });
  const conc = produtos.filter((p) => !p.nosso), nosso = produtos.find((p) => p.nosso);
  const notas = new Map(), metasRc = new Map(), valores = new Map();
  (ac.notasCliente || []).forEach((n) => { if (n.nota !== '' && n.nota !== null && n.nota !== undefined && !isNaN(n.nota)) notas.set(n.requisitoClienteId + '|' + n.produtoId, +n.nota); });
  (ac.metasCliente || []).forEach((m) => { if (m.meta !== '' && m.meta !== null && !isNaN(m.meta)) metasRc.set(m.requisitoClienteId, +m.meta); });
  (ac.valoresTecnicos || []).forEach((v) => { if (qTxt(v.valor)) valores.set(v.requisitoProjetoId + '|' + v.produtoId, qTxt(v.valor)); });
  const esp = new Map((d.especificacoesProjeto || []).map((e) => [e.requisitoProjetoId, e]));
  rp.forEach((x) => {
    const e = esp.get(x.id) || {};
    x.unidade = qTxt(e.unidadeMedida); x.metaTxt = qTxt(e.valorUnitario); x.meta = Nucleo.parseNumero(x.metaTxt);
    x.formaAval = qTxt(e.observacao); x.aspectos = qTxt(e.aspectosIndesejaveis);
    x.medidoTxt = valores.get(x.id + '|' + nosso.id) || ''; x.medido = Nucleo.parseNumero(x.medidoTxt);
    if (x.meta === null) x.estado = 'sem-meta';
    else if (x.medido === null) x.estado = 'sem-medicao';
    else {
      const ok = x.sentido === 'up' ? x.medido >= x.meta : x.sentido === 'down' ? x.medido <= x.meta
        : (x.meta === 0 ? x.medido === 0 : Math.abs(x.medido - x.meta) <= Math.abs(x.meta) * QFD_TOL);
      x.estado = ok ? 'atingida' : 'nao-atingida';
    }
    x.relacoes = rc.filter((c) => infl(c, x)).length;
    // melhor concorrente (só sentidos ↑/↓ com valor numérico)
    const vs = conc.map((p) => ({ p, v: Nucleo.parseNumero(valores.get(x.id + '|' + p.id)) })).filter((o) => o.v !== null);
    x.melhor = null;
    if (vs.length && x.sentido !== 'none') x.melhor = vs.reduce((m, o) => ((x.sentido === 'up' ? o.v > m.v : o.v < m.v) ? o : m));
    x.abaixoConcorrente = !!(x.melhor && x.meta !== null && (x.sentido === 'up' ? x.meta < x.melhor.v : x.meta > x.melhor.v));
  });

  // atendimento de cada requisito de cliente: parcela da influência dos RPs relacionados com meta atingida (entre os medidos)
  rc.forEach((c) => {
    c.rels = rp.filter((p) => infl(c, p)).map((p) => ({ rp: p, infl: infl(c, p) })).sort((a, b) => b.infl - a.infl || a.rp.n - b.rp.n);
    const maxI = Math.max(0, ...c.rels.map((r) => r.infl));
    c.cobertura = maxI >= 9 ? 'Forte' : maxI >= 3 ? 'Moderada' : maxI >= 1 ? 'Fraca' : 'Sem relação';
    const med = c.rels.filter((r) => ['atingida', 'nao-atingida'].includes(r.rp.estado));
    const den = med.reduce((s, r) => s + r.infl, 0);
    c.atend = den ? med.filter((r) => r.rp.estado === 'atingida').reduce((s, r) => s + r.infl, 0) / den : null;
    c.metaNota = metasRc.has(c.id) ? metasRc.get(c.id) : null;
    c.notaNosso = notas.has(c.id + '|' + nosso.id) ? notas.get(c.id + '|' + nosso.id) : null;
    const nc = conc.map((p) => notas.get(c.id + '|' + p.id)).filter((v) => v !== undefined);
    c.melhorConc = nc.length ? Math.max(...nc) : null;
  });
  const comAt = rc.filter((c) => c.atend !== null);
  const pesoAt = comAt.reduce((s, c) => s + c.peso, 0);
  const geral = comAt.length ? (pesoAt ? comAt.reduce((s, c) => s + c.peso * c.atend, 0) / pesoAt : comAt.reduce((s, c) => s + c.atend, 0) / comAt.length) : null;
  const n = (est) => rp.filter((x) => x.estado === est).length;

  return {
    rc, rp, ordem, comparacoes, mat, infl, correl, produtos, conc, nosso, notas, valores, metasRc,
    atendimento: { geral, atingidas: n('atingida'), naoAtingidas: n('nao-atingida'), semMedicao: n('sem-medicao'), semMeta: n('sem-meta'),
      rcFortes: rc.filter((c) => c.cobertura === 'Forte').length, rcSemRelacao: rc.filter((c) => !c.rels.length),
      rcSoFracas: rc.filter((c) => c.cobertura === 'Fraca'), rpSemRelacao: rp.filter((x) => !x.relacoes),
      abaixo50: comAt.filter((c) => c.atend < 0.5), metasNaoAtingidas: rp.filter((x) => x.estado === 'nao-atingida') },
    metasAbaixo: ordem.filter((x) => x.abaixoConcorrente),
    fortes: rc.filter((c) => c.notaNosso !== null && c.melhorConc !== null && c.notaNosso > c.melhorConc),
    melhorar: rc.filter((c) => c.notaNosso !== null && c.melhorConc !== null && c.notaNosso < c.melhorConc),
    insights: {
      nRc: rc.length, nRp: rp.length, comparacoes: comparacoes.length, comparacoesEsperadas: rc.length * (rc.length - 1) / 2,
      correlacoes: correl.size, relacoes: mat.size, especificacoes: rp.filter((x) => x.metaTxt).length,
      concorrentes: conc.length, notas: [...notas.keys()].length, notasEsperadas: rc.length * produtos.length,
    },
    projeto: qTxt((d.metadata || {}).projeto), schemaVersion: (d.metadata || {}).schemaVersion ?? null,
  };
};

/** Seção disponível no backup? Se não, diz o que falta (para direcionar ao preenchimento). */
Qfd.disponivel = function (a, s) {
  if (!a) return { ok: false, motivo: 'nenhum QFD importado' };
  const ok = (cond, motivo) => (cond ? { ok: true } : { ok: false, motivo });
  switch (s) {
    case 'dicionario': return ok(a.rc.length || a.rp.length, 'sem requisitos');
    case 'clientes': return ok(a.rc.length, 'sem requisitos do cliente');
    case 'comparacoes': return ok(a.comparacoes.length, 'comparação aos pares não preenchida');
    case 'projeto': return ok(a.rp.length, 'sem requisitos de projeto');
    case 'matriz': return ok(a.mat.size, 'matriz de relações vazia');
    case 'telhado': return ok(a.correl.size, 'telhado de correlações vazio');
    case 'especificacoes': return ok(a.insights.especificacoes, 'especificações (valor-meta) não preenchidas');
    case 'competitiva': return ok(a.conc.length && (a.notas.size || a.valores.size), 'avaliação competitiva sem concorrentes/notas');
    case 'atendimento': return ok(a.mat.size && a.insights.especificacoes, 'precisa da matriz e das metas');
    case 'ranking': return ok(a.rc.length || a.rp.length, 'sem requisitos');
    default: return { ok: true };
  }
};

// ================================================================== PDF
const qfdTh = (t, extra) => Object.assign({ text: t, alignment: 'center' }, extra || {});
const qfdCelInfl = (v) => (v ? { text: String(v), alignment: 'center', bold: v === 9, fontSize: 7.5, color: v >= 3 ? '#ffffff' : COR.escuro, fillColor: v === 9 ? COR.escuro : v === 3 ? COR.teal : '#cfe8df' } : { text: '', fontSize: 7.5 });
const qfdCelCorr = (v) => (v ? { text: v.replace('-', '−').replace('-', '−'), alignment: 'center', bold: true, fontSize: 8, color: v.startsWith('+') ? (v === '++' ? '#ffffff' : COR.escuro) : (v === '--' ? '#ffffff' : '#7a1d16'),
  fillColor: { '++': COR.teal, '+': '#cfe8df', '-': '#f6cfcb', '--': '#c0392b' }[v] } : { text: '', fontSize: 8 });
const qfdTerco = (x) => { const [r, f, c] = Qfd.TERCOS[x.terco]; return { text: r, bold: true, color: c, fillColor: f }; };
const qfdEstado = { atingida: ['Atingida', COR.teal], 'nao-atingida': ['Não atingida', '#c0392b'], 'sem-medicao': ['Sem medição', '#888888'], 'sem-meta': ['Sem meta', '#888888'] };
const qfdMeta = (x) => (x.metaTxt ? `${Nucleo.SENTIDO_QFD[x.sentido] || ''} ${x.metaTxt} ${x.unidade}`.trim() : '—');
const qfdBarra = (frac, max = 60, cor = COR.teal) => ({ canvas: [{ type: 'rect', x: 0, y: 2, w: Math.max(1.5, max * Math.max(0, Math.min(1, frac || 0))), h: 6, color: cor }] });

/**
 * Tabela que se ajusta à folha: retrato se couber; senão paisagem; se nem assim couber, divide as colunas
 * em partes que repetem as primeiras ("fixas"). larg = [{min, w}] (w = número ou '*'; padrão: min).
 */
Pdf.tabelaAdaptavel = function (cab, linhas, larg, ctx, op = {}) {
  const fixas = op.fixas ?? 1, pad = op.compacta ? 4 : 8; // preenchimento esquerdo + direito de cada célula
  const soma = (ix) => ix.reduce((s, i) => s + larg[i].min + pad, 0);
  const todas = cab.map((_, i) => i);
  const rot = (c) => String(typeof c === 'object' && c ? c.text : c).replace(/\n/g, ' ');
  const montar = (ix) => {
    const g = Pdf.grade(ix.map((i) => cab[i]), linhas.map((l) => ix.map((i) => l[i])), ix.map((i) => larg[i].w ?? larg[i].min));
    if (op.compacta) Object.assign(g.layout, { paddingLeft: () => 2, paddingRight: () => 2 });
    g.table.dontBreakRows = true; // linha da tabela não se parte entre páginas
    return g;
  };
  if (soma(todas) <= ctx.retrato) return [{ no: montar(todas), larga: false }];
  if (soma(todas) <= ctx.paisagem) return [{ no: montar(todas), larga: true }];
  const fix = todas.slice(0, fixas), partes = [];
  let atual = [];
  todas.slice(fixas).forEach((i) => { if (atual.length && soma(fix.concat(atual, [i])) > ctx.paisagem) { partes.push(atual); atual = []; } atual.push(i); });
  if (atual.length) partes.push(atual);
  return partes.flatMap((pt, k) => [
    { no: { text: `Parte ${k + 1} de ${partes.length} — colunas ${rot(cab[pt[0]])} a ${rot(cab[pt[pt.length - 1]])}`, style: 'muted', margin: [0, k ? 8 : 0, 0, 2] }, larga: true },
    { no: montar(fix.concat(pt)), larga: true }]);
};

/**
 * Junta itens {no, larga, cola} em conteúdo: trechos largos vão para páginas em paisagem e depois volta-se ao retrato.
 * Itens "cola" (títulos e textos curtos) acompanham o próximo item, para não ficarem sozinhos na folha anterior.
 */
Pdf.montarOrientacao = function (itens) {
  const lst = itens.map((x) => Object.assign({}, x));
  for (let i = 0; i < lst.length; i++) if (lst[i].segue) lst[i].larga = i > 0 ? lst[i - 1].larga : false;
  for (let i = lst.length - 1; i >= 0; i--) if (lst[i].cola) lst[i].larga = i + 1 < lst.length ? lst[i + 1].larga : false;
  const out = [];
  let run = null;
  lst.forEach((x) => {
    if (x.larga) { if (!run) { run = { stack: [], pageBreak: 'before', pageOrientation: 'landscape' }; out.push(run); } run.stack.push(x.no); }
    else { if (run) { out.push(Pdf.marcaRetrato()); run = null; } out.push(x.no); }
  });
  if (run) out.push(Pdf.marcaRetrato());
  return out;
};
Pdf.marcaRetrato = () => ({ text: '', pageBreak: 'before', pageOrientation: 'portrait', _retrato: true });

/** Remove a volta ao retrato quando o próximo conteúdo já começa em página nova (evita folha em branco). */
Pdf.ajustarQuebras = function (content) {
  const seq = [];
  const rec = (arr) => arr.forEach((no, i) => {
    if (!no || typeof no !== 'object') return;
    if (Array.isArray(no)) { rec(no); return; }
    seq.push({ arr, no });
    if (Array.isArray(no.stack)) rec(no.stack);
  });
  rec(content);
  seq.forEach((x, k) => {
    if (!x.no._retrato) return;
    const prox = seq.slice(k + 1).find((y) => !y.no._removido);
    if (!prox || prox.no.pageBreak === 'before') {
      x.no._removido = true;
      x.arr.splice(x.arr.indexOf(x.no), 1);
      if (prox && !prox.no.pageOrientation) prox.no.pageOrientation = 'portrait';
    }
  });
  return content;
};

/** Contexto de largura útil (pt) e títulos para montar o relatório do QFD dentro de outro documento. */
Pdf.ctxLargura = (recuo = 0) => ({ retrato: A4.w - 45 * MM - recuo, paisagem: A4.h - 45 * MM - recuo });

/**
 * Conteúdo pdfmake das seções escolhidas do QFD.
 * ctx: { h(titulo) → nó do título da seção, recuo, origem (texto) }
 */
Pdf.blocoQfd = function (dados, secoes, ctx) {
  const a = Qfd.analisar(dados);
  ctx = Object.assign({ h: (t) => ({ text: t, style: 'h3' }), recuo: 0 }, ctx, Pdf.ctxLargura(ctx.recuo || 0));
  if (!a) return [{ text: 'QFD não importado: importe o backup JSON do sistema QFD no projeto informacional.', style: 'muted' }];
  const itens = [];
  const add = (no, larga = false) => itens.push({ no, larga });
  const cola = (no) => itens.push({ no, cola: true });
  const tab = (cab, linhas, larg, op) => Pdf.tabelaAdaptavel(cab, linhas, larg, ctx, op).forEach((x) => itens.push(x));
  const nota = (t) => itens.push({ no: { text: t, style: 'muted', margin: [0, 0, 0, 4] }, segue: true }); // fica com a tabela anterior
  const corpoTxt = (t) => ({ text: t, style: 'corpo', margin: [0, 0, 0, 4] });
  if (ctx.origem) add({ text: ctx.origem, style: 'muted', margin: [0, 0, 0, 6] });

  const S = {
    dicionario() {
      if (a.rc.length) add({ stack: [{ text: 'Requisitos do cliente (RC)', bold: true, margin: [0, 0, 0, 2] },
        { ul: a.rc.map((x) => ({ text: [{ text: x.cod, bold: true }, ' — ' + x.descricao, ...(x.obs ? [{ text: ' — ' + x.obs, italics: true, color: COR.suave }] : [])] })), style: 'corpo', margin: [0, 0, 0, 6] }] });
      if (a.rp.length) add({ stack: [{ text: 'Requisitos de projeto (RP)', bold: true, margin: [0, 0, 0, 2] },
        { ul: a.rp.map((x) => ({ text: [{ text: `${x.cod} ${Qfd.SETA[x.sentido]}`, bold: true }, ' — ' + x.descricao, ...(x.obs ? [{ text: ' — ' + x.obs, italics: true, color: COR.suave }] : [])] })), style: 'corpo', margin: [0, 0, 0, 4] },
        { text: Qfd.LEGENDA_SENTIDO, style: 'muted', margin: [0, 0, 0, 6] }] });
    },
    clientes() {
      const max = Math.max(...a.rc.map((x) => x.peso), 0) || 1;
      tab(['ID', 'Requisito do cliente', 'Importância (pts)', 'Peso', ''], a.rc.map((x) => [{ text: x.cod, bold: true }, x.descricao, { text: String(x.pts), alignment: 'center' }, { text: qPct(x.peso), alignment: 'center' }, qfdBarra(x.peso / max, 70)]),
        [{ min: 30 }, { min: 160, w: '*' }, { min: 55 }, { min: 42 }, { min: 76 }]);
      nota('Importância = soma dos pontos obtidos na comparação aos pares; peso = importância ÷ soma das importâncias.');
    },
    comparacoes() {
      const n = a.rc.length;
      const cel = (i, j) => {
        if (j <= i) return { text: '', fillColor: j === i ? '#e7eeec' : undefined };
        const c = a.comparacoes.find((x) => (x.a === a.rc[i] && x.b === a.rc[j]) || (x.a === a.rc[j] && x.b === a.rc[i]));
        if (!c) return { text: '', fontSize: 7 };
        return { text: [{ text: c.a.cod + '\n', bold: true }, String(c.valor)], fontSize: 6.8, alignment: 'center', color: COR.escuro };
      };
      const cab = ['', ...a.rc.slice(1).map((x) => qfdTh(x.cod, { fontSize: 7.5 })), qfdTh('Pts'), qfdTh('Peso')];
      const linhas = a.rc.slice(0, -1).map((x, i) => [{ text: x.cod, bold: true, fontSize: 7.5 }, ...a.rc.slice(1).map((_, k) => cel(i, k + 1)), { text: String(x.pts), alignment: 'center', bold: true }, { text: qPct(x.peso), alignment: 'center' }]);
      const ult = a.rc[n - 1];
      if (ult) linhas.push([{ text: ult.cod, bold: true, fontSize: 7.5 }, ...a.rc.slice(1).map(() => ({ text: '' })), { text: String(ult.pts), alignment: 'center', bold: true }, { text: qPct(ult.peso), alignment: 'center' }]);
      tab(cab, linhas, [{ min: 28 }, ...a.rc.slice(1).map(() => ({ min: 22 })), { min: 26 }, { min: 34 }], { compacta: true });
      nota(`Cada célula indica o requisito preferido no par e a intensidade (1 = pouco mais importante, 3 = medianamente, 5 = muito mais importante). ${a.comparacoes.length} de ${a.insights.comparacoesEsperadas} comparações preenchidas.`);
    },
    projeto() {
      cola({ text: 'Requisitos de projeto na ordem de importância relativa, divididos em terços (superior, médio e inferior).', style: 'corpo', margin: [0, 0, 0, 4] });
      tab(['#', 'ID', 'Requisito de projeto', 'Sentido', 'Imp. absoluta', 'Peso relativo', 'Dificuldade', 'Terço'], a.ordem.map((x) => {
        const f = Qfd.TERCOS[x.terco][1];
        return [x.rank, { text: x.cod, bold: true }, x.descricao, { text: Qfd.SETA[x.sentido], alignment: 'center' }, { text: qNum(x.impAbs, 1), alignment: 'center' },
          { text: qPct(x.peso), alignment: 'center' }, { text: x.dificuldade ?? '—', alignment: 'center' }, qfdTerco(x)].map((c) => Object.assign(typeof c === 'object' ? c : { text: String(c) }, { fillColor: (c && c.fillColor) || f }));
      }), [{ min: 16 }, { min: 30 }, { min: 120, w: '*' }, { min: 34 }, { min: 42 }, { min: 40 }, { min: 50 }, { min: 42 }]);
      nota(Qfd.LEGENDA_SENTIDO + ' Dificuldade técnica de 1 (fácil) a 5 (difícil).');
    },
    matriz() {
      const rps = a.rp;
      const cab = [qfdTh('RC \\ RP'), ...rps.map((x) => qfdTh(`${x.cod}\n${Qfd.SETA[x.sentido]}`, { fontSize: 7 })), qfdTh('Peso RC')];
      const linhas = a.rc.map((c) => [{ text: [{ text: c.cod + ' ', bold: true }, { text: c.descricao, fontSize: 6.8, color: COR.suave }], fontSize: 7.5 },
        ...rps.map((p) => qfdCelInfl(a.infl(c, p))), { text: qPct(c.peso), alignment: 'center', fontSize: 7.5 }]);
      const rodape = (rot, f) => [{ text: rot, bold: true, fontSize: 7, fillColor: '#eef5f3' }, ...rps.map((p) => Object.assign({ alignment: 'center', fontSize: 6.8, fillColor: '#eef5f3' }, f(p))), { text: '', fillColor: '#eef5f3' }];
      linhas.push(rodape('Importância absoluta', (p) => ({ text: qNum(p.impAbs, 0) })), rodape('Peso relativo', (p) => ({ text: qPct(p.peso) })),
        rodape('Ranking', (p) => ({ text: String(p.rank), bold: true, color: Qfd.TERCOS[p.terco][2] })), rodape('Dificuldade técnica', (p) => ({ text: String(p.dificuldade ?? '—') })));
      tab(cab, linhas, [{ min: 120, w: '*' }, ...rps.map(() => ({ min: 22 })), { min: 32 }], { compacta: true });
      nota('Relação: 9 = forte · 3 = moderada · 1 = fraca. Importância absoluta = Σ (peso do requisito do cliente × relação). ' + Qfd.LEGENDA_SENTIDO);
    },
    telhado() {
      const rps = a.rp;
      const cab = ['', ...rps.map((x) => qfdTh(`${x.cod}\n${Qfd.SETA[x.sentido]}`, { fontSize: 7 }))];
      const linhas = rps.map((x) => [{ text: x.cod, bold: true, fontSize: 7.5 }, ...rps.map((y) => (y.n === x.n ? { text: '', fillColor: '#e7eeec' } : y.n < x.n ? { text: '' } : qfdCelCorr(a.correl.get(x.n + '|' + y.n))))]);
      tab(cab, linhas, [{ min: 28 }, ...rps.map(() => ({ min: 24 }))], { compacta: true });
      const cont = { '++': [], '+': [], '-': [], '--': [] };
      a.correl.forEach((v, k) => { const [i, j] = k.split('|'); cont[v].push(`RP${i}–RP${j}`); });
      add({ text: [{ text: 'Correlações: ', bold: true }, `++ forte positiva: ${cont['++'].length} · + positiva: ${cont['+'].length} · − negativa: ${cont['-'].length} · −− forte negativa: ${cont['--'].length}.`], style: 'corpo', margin: [0, 2, 0, 3] });
      const neg = cont['-'].concat(cont['--']);
      if (neg.length) add(caixa([{ text: 'Conflitos técnicos (correlação negativa): ', bold: true }, neg.join('; ') + '. Melhorar um requisito tende a piorar o outro: avalie compromissos ou soluções que eliminem o conflito.']));
      if (cont['++'].length) add({ text: [{ text: 'Sinergias fortes: ', bold: true }, cont['++'].join('; ') + '.'], style: 'corpo', margin: [0, 0, 0, 6] });
    },
    especificacoes() {
      cola({ text: 'Especificações de projeto na ordem da hierarquia do QFD.', style: 'corpo', margin: [0, 0, 0, 4] });
      tab(['#', 'Requisito de projeto', 'Sentido', 'Valor-meta', 'Forma de avaliação', 'Aspectos indesejáveis'], a.ordem.map((x) => {
        const f = Qfd.TERCOS[x.terco][1];
        return [{ text: String(x.rank) }, { text: [{ text: x.cod + ' ', bold: true }, x.descricao] }, { text: Qfd.SETA[x.sentido], alignment: 'center' },
          { text: qfdMeta(x), bold: !!x.metaTxt }, { text: x.formaAval || '—' }, { text: x.aspectos || '—' }].map((c) => Object.assign(c, { fillColor: f }));
      }), [{ min: 16 }, { min: 110, w: '*' }, { min: 36 }, { min: 60 }, { min: 90, w: '*' }, { min: 90, w: '*' }]);
      nota(`${a.insights.especificacoes} de ${a.rp.length} requisitos com valor-meta. ${Qfd.LEGENDA_SENTIDO} Metas nominais aceitam ±5%.`);
    },
    competitiva() {
      const P = a.produtos;
      cola({ text: [{ text: 'Produtos comparados: ', bold: true }, P.map((p) => p.nome).join(', ') + '.'], style: 'corpo', margin: [0, 0, 0, 4] });
      if (a.notas.size) {
        cola({ text: 'Avaliação dos clientes (1 = pior, 5 = melhor)', style: 'h3', margin: [0, 4, 0, 2] });
        const rcs = [...a.rc].sort((x, y) => y.peso - x.peso);
        tab(['RC', 'Requisito do cliente', 'Peso', ...P.map((p) => qfdTh(p.nome, { fontSize: 7.5 })), qfdTh('Meta')], rcs.map((c) => [{ text: c.cod, bold: true }, c.descricao, { text: qPct(c.peso), alignment: 'center' },
          ...P.map((p) => { const v = a.notas.get(c.id + '|' + p.id); return { text: v === undefined ? '—' : String(v), alignment: 'center', bold: !!p.nosso }; }),
          { text: c.metaNota === null ? '—' : String(c.metaNota), alignment: 'center', bold: true }]),
        [{ min: 26 }, { min: 110, w: '*' }, { min: 36 }, ...P.map(() => ({ min: 40 })), { min: 30 }]);
        const g = Qfd.graficoNotas(a);
        if (g) itens.push({ no: { svg: g, width: 460, alignment: 'center', margin: [0, 2, 0, 8] }, segue: true });
      }
      if (a.valores.size) {
        cola({ text: 'Avaliação técnica (valores medidos)', style: 'h3', margin: [0, 6, 0, 2] });
        tab(['#', 'Requisito de projeto', 'Sentido', 'Meta', ...P.map((p) => qfdTh(p.nome, { fontSize: 7.5 })), qfdTh('Melhor concorrente')], a.ordem.map((x) => [String(x.rank), { text: [{ text: x.cod + ' ', bold: true }, x.descricao] },
          { text: Qfd.SETA[x.sentido], alignment: 'center' }, { text: x.metaTxt ? `${x.metaTxt} ${x.unidade}`.trim() : '—', alignment: 'center' },
          ...P.map((p) => ({ text: a.valores.get(x.id + '|' + p.id) || '—', alignment: 'center', bold: !!p.nosso })),
          { text: x.melhor ? `${x.melhor.p.nome}: ${qNum(x.melhor.v)}` : '—', fontSize: 7.5 }]),
        [{ min: 16 }, { min: 110, w: '*' }, { min: 34 }, { min: 40 }, ...P.map(() => ({ min: 40 })), { min: 70 }]);
      }
      const res = [];
      if (a.metasAbaixo.length) res.push(caixa([{ text: `Metas técnicas abaixo do melhor concorrente (${a.metasAbaixo.length})`, bold: true },
        { ul: a.metasAbaixo.map((x) => `${x.cod} — ${x.descricao}: meta ${x.metaTxt} ${x.unidade} × ${x.melhor.p.nome}: ${qNum(x.melhor.v)}`), fontSize: 8.5 },
        'Reveja essas metas nas especificações ou justifique por que ficar abaixo do concorrente é aceitável.']));
      if (a.fortes.length) res.push(caixa([{ text: 'Pontos fortes (nota do cliente acima de todos os concorrentes): ', bold: true }, a.fortes.map((c) => `${c.cod} ${c.descricao}`).join('; ')], 'ok'));
      if (a.melhorar.length) res.push(caixa([{ text: 'A melhorar (nota do cliente abaixo do melhor concorrente): ', bold: true }, a.melhorar.map((c) => `${c.cod} ${c.descricao}`).join('; ')]));
      if (!res.length) res.push(caixa('Nenhuma meta técnica abaixo do melhor concorrente.', 'ok'));
      res.forEach((r) => itens.push({ no: r, segue: true }));
    },
    atendimento() {
      const at = a.atendimento;
      add(Pdf.kpi([['Atendimento geral', { text: [{ text: qPct(at.geral, 0), bold: true }, ' (ponderado pelo peso dos requisitos do cliente com medição)'], fontSize: 9 }],
        ['Cobertura forte na matriz', `${at.rcFortes} de ${a.rc.length} requisitos do cliente`],
        ['Metas de projeto', `${at.atingidas} atingida(s) · ${at.naoAtingidas} não atingida(s) · ${at.semMedicao} sem medição · ${at.semMeta} sem meta`]]));
      cola({ text: 'Metas de projeto × valor medido', style: 'h3', margin: [0, 4, 0, 2] });
      tab(['#', 'Requisito de projeto', 'Sentido', 'Meta', 'Medido', 'Situação', 'Relações'], a.ordem.map((x) => {
        const [r, c] = qfdEstado[x.estado];
        return [String(x.rank), { text: [{ text: x.cod + ' ', bold: true }, x.descricao] }, { text: Qfd.SETA[x.sentido], alignment: 'center' }, { text: x.metaTxt ? `${x.metaTxt} ${x.unidade}`.trim() : '—', alignment: 'center' },
          { text: x.medidoTxt || '—', alignment: 'center' }, { text: r, bold: true, color: c, alignment: 'center' }, { text: String(x.relacoes), alignment: 'center' }];
      }), [{ min: 16 }, { min: 130, w: '*' }, { min: 34 }, { min: 50 }, { min: 46 }, { min: 58 }, { min: 40 }]);
      cola({ text: 'Atendimento por requisito do cliente', style: 'h3', margin: [0, 6, 0, 2] });
      tab(['RC', 'Requisito do cliente', 'Peso', 'Requisitos de projeto relacionados (influência)', 'Cobertura', 'Atendimento'], [...a.rc].sort((x, y) => y.peso - x.peso).map((c) => [
        { text: c.cod, bold: true }, c.descricao, { text: qPct(c.peso), alignment: 'center' },
        { text: c.rels.map((r, k) => ({ text: `${r.rp.cod} (${r.infl})${r.rp.estado === 'atingida' ? ' ok' : ''}${k < c.rels.length - 1 ? '  ' : ''}`, color: r.rp.estado === 'atingida' ? COR.teal : r.rp.estado === 'nao-atingida' ? '#c0392b' : COR.suave, bold: r.rp.estado === 'atingida' })), fontSize: 7.5 },
        { text: c.cobertura, alignment: 'center', bold: c.cobertura === 'Forte', color: c.cobertura === 'Sem relação' ? '#c0392b' : COR.texto },
        c.atend === null ? { text: '—', alignment: 'center' } : { stack: [{ text: qPct(c.atend, 0), alignment: 'center', bold: true }, qfdBarra(c.atend, 46, c.atend >= 0.5 ? COR.teal : '#c0392b')] }]),
      [{ min: 26 }, { min: 110, w: '*' }, { min: 36 }, { min: 130, w: '*' }, { min: 50 }, { min: 56 }]);
      nota('Atendimento = parcela da influência (9, 3, 1) dos requisitos de projeto relacionados cujas metas foram atingidas, entre os que têm medição. Meta atingida: (+) medido ≥ meta; (−) medido ≤ meta; (*) dentro de ±5%.');
      const diag = [];
      if (at.rcSemRelacao.length) diag.push(`Requisitos do cliente sem nenhum requisito de projeto: ${at.rcSemRelacao.map((c) => c.cod).join(', ')}.`);
      if (at.rcSoFracas.length) diag.push(`Atendidos só por relações fracas: ${at.rcSoFracas.map((c) => c.cod).join(', ')}.`);
      if (at.abaixo50.length) diag.push(`Atendimento abaixo de 50%: ${at.abaixo50.map((c) => c.cod).join(', ')}.`);
      if (at.metasNaoAtingidas.length) diag.push(`Metas de projeto não atingidas: ${at.metasNaoAtingidas.map((x) => x.cod).join(', ')}.`);
      if (at.rpSemRelacao.length) diag.push(`Requisitos de projeto sem relação com o cliente: ${at.rpSemRelacao.map((x) => x.cod).join(', ')}.`);
      add(diag.length ? caixa([{ text: 'Diagnóstico', bold: true }, { ul: diag, fontSize: 8.5 }]) : caixa('Diagnóstico: todos os requisitos do cliente têm relação com requisitos de projeto e nenhuma meta medida ficou sem ser atingida.', 'ok'));
    },
    ranking() {
      const col = (titulo, l) => ({ stack: [{ text: titulo, bold: true, margin: [0, 0, 0, 3] }, { ol: l, style: 'corpo', fontSize: 8.8 }] });
      add({ columns: [col('Requisitos do cliente', [...a.rc].sort((x, y) => y.pts - x.pts || x.n - y.n).map((c) => `${c.cod}: ${c.descricao} — ${c.pts} pts`)),
        col('Requisitos de projeto', a.ordem.map((x) => `${x.cod}: ${x.descricao} — ${qPct(x.peso)}`))], columnGap: 16, margin: [0, 0, 0, 8] });
    },
    insights() {
      const i = a.insights;
      add({ ul: [`${i.nRc} requisitos do cliente e ${i.nRp} requisitos de projeto.`, `Comparações aos pares: ${i.comparacoes} de ${i.comparacoesEsperadas}.`,
        `Correlações de projeto definidas: ${i.correlacoes}.`, `Relações na matriz QFD: ${i.relacoes} de ${i.nRc * i.nRp} células.`,
        `Especificações preenchidas: ${i.especificacoes} de ${i.nRp} (${qPct(i.nRp ? i.especificacoes / i.nRp : 0, 0)}).`,
        ...(i.concorrentes ? [`Concorrentes avaliados: ${i.concorrentes}; notas dos clientes preenchidas: ${i.notas} de ${i.notasEsperadas}.`] : [])], style: 'corpo', margin: [0, 0, 0, 6] });
    },
  };

  Qfd.SECOES.filter(([s]) => secoes.includes(s)).forEach(([s, nome]) => {
    const disp = Qfd.disponivel(a, s);
    cola(ctx.h(nome));
    if (!disp.ok) { add({ text: `Sem dados no QFD importado (${disp.motivo}). Complete no sistema QFD e reimporte o backup.`, style: 'muted', margin: [0, 0, 0, 6] }); return; }
    S[s]();
  });
  return Pdf.montarOrientacao(itens);
};

/** Perfil das notas dos clientes (como no QFD): uma linha por produto, requisitos na ordem do peso. */
Qfd.graficoNotas = function (a) {
  const rcs = [...a.rc].sort((x, y) => y.peso - x.peso);
  if (!rcs.length || !a.notas.size) return null;
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lin = 22, x0 = 70, w = 620, esc = (w - x0 - 30) / 4, topo = 26, h = topo + rcs.length * lin + 44;
  const X = (v) => x0 + (v - 1) * esc, Y = (i) => topo + i * lin + lin / 2;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff"/>`;
  for (let k = 1; k <= 5; k++) s += `<line x1="${X(k)}" y1="${topo - 4}" x2="${X(k)}" y2="${topo + rcs.length * lin}" stroke="#e3e8e8"/><text x="${X(k) - 3}" y="${topo - 9}" font-size="11" fill="#555">${k}</text>`;
  rcs.forEach((c, i) => { if (i % 2 === 0) s += `<rect x="0" y="${topo + i * lin}" width="${w}" height="${lin}" fill="#f4f8f7" opacity=".7"/>`; s += `<text x="6" y="${Y(i) + 4}" font-size="11" fill="#1d2b2b">${e(c.cod)}</text>`; });
  a.produtos.forEach((p) => {
    const pts = rcs.map((c, i) => [a.notas.get(c.id + '|' + p.id), i]).filter(([v]) => v !== undefined);
    if (!pts.length) return;
    s += `<polyline fill="none" stroke="${p.cor}" stroke-width="${p.nosso ? 2.4 : 1.2}" stroke-dasharray="${p.nosso ? '' : '4,3'}" points="${pts.map(([v, i]) => `${X(v).toFixed(1)},${Y(i)}`).join(' ')}"/>`;
    pts.forEach(([v, i]) => { s += `<circle cx="${X(v).toFixed(1)}" cy="${Y(i)}" r="${p.nosso ? 4.5 : 3.5}" fill="${p.cor}"/>`; });
  });
  rcs.forEach((c, i) => { if (c.metaNota !== null) s += `<rect x="${X(c.metaNota) - 5}" y="${Y(i) - 5}" width="10" height="10" fill="none" stroke="#1d2b2b" stroke-width="1.4"/>`; });
  let lx = 6;
  const ly = h - 14;
  a.produtos.forEach((p) => { s += `<circle cx="${lx + 5}" cy="${ly - 4}" r="4" fill="${p.cor}"/><text x="${lx + 13}" y="${ly}" font-size="11" fill="#333">${e(p.nome)}</text>`; lx += 22 + p.nome.length * 6.2; });
  s += `<rect x="${lx}" y="${ly - 9}" width="10" height="10" fill="none" stroke="#1d2b2b" stroke-width="1.4"/><text x="${lx + 14}" y="${ly}" font-size="11" fill="#333">Meta</text>`;
  return s + '</svg>';
};

// ================================================================== tela: integração nas macroentregas
App.qfdBlocoDaMacro = (m) => (m.blocos || []).find((b) => b.tipo === 'qfd');

/** Cartão do projeto informacional: o que do QFD entra em cada macroentrega e no relatório geral. */
App.qfdIntegracaoHtml = function () {
  const p = App.p, a = Qfd.analisar(p.qfdDados);
  const o = p.qfdOrigem || {};
  if (!a) {
    return cartao('Relatório do QFD nas macroentregas', `<p class="muted" style="margin-top:0">Importe o <b>backup completo (JSON)</b> do sistema QFD (botão “Backup”) para escolher, com caixas de seleção, o que vai para cada macroentrega e para o relatório geral: dicionário, requisitos, matriz, telhado, especificações, avaliação competitiva, atendimento e ranking.</p>
  ${o.importadoEm ? '<p class="aviso-box">O QFD deste projeto foi importado por uma versão anterior, que guardava só as especificações. Reimporte o backup para ter o relatório completo.</p>' : ''}
  <div class="barra"><button class="btn" data-acao="qfd-abrir">↗ Abrir o sistema QFD</button>
  <label class="btn primario">⬆ Importar backup JSON do QFD<input type="file" accept=".json,.zip,application/json,application/zip" hidden id="arqQfdInf"></label></div>`);
  }
  const ms = p.macroentregas, rel = p.config.qfdRelatorio || [];
  const cab = ms.map((m, i) => `<th class="centro" title="${esc(m.titulo)}">Macro ${i + 1}<br><button class="btn pequeno" data-acao="qfd-int-todas" data-macro="${esc(m.uid)}">todas</button></th>`).join('');
  const linhas = Qfd.SECOES.map(([s, nome]) => {
    const d = Qfd.disponivel(a, s);
    const chk = (uid, marcado) => `<td class="centro"><input type="checkbox" data-acao="qfd-int" data-sec="${s}" data-macro="${esc(uid)}" ${marcado ? 'checked' : ''} ${d.ok ? '' : 'disabled'}></td>`;
    return `<tr class="${d.ok ? '' : 'indisp'}"><td><b>${esc(nome)}</b>${d.ok ? '' : `<br><span class="gap-neg">falta no QFD: ${esc(d.motivo)}</span> <button class="btn pequeno" data-acao="qfd-abrir">↗ completar no QFD</button>`}</td>
      ${ms.map((m) => { const b = App.qfdBlocoDaMacro(m); return chk(m.uid, b && b.secoes.includes(s)); }).join('')}${chk('__rel', rel.includes(s))}</tr>`;
  }).join('');
  return cartao('Relatório do QFD nas macroentregas', `<p class="muted" style="margin-top:0">QFD importado${o.importadoEm ? ` em ${esc(o.importadoEm.replace('T', ' ').slice(0, 16))} (${esc(o.arquivo)})` : ''}: <b>${a.rc.length}</b> requisitos do cliente, <b>${a.rp.length}</b> de projeto, ${a.conc.length} concorrente(s).
    Marque o que entra em cada macroentrega (vira o bloco “Análise QFD” no desenvolvimento, que pode ser movido ou editado lá) e no relatório geral. As tabelas largas saem em folha deitada.</p>
  <div class="rolagem"><table class="tab-edit qfd-int"><thead><tr><th>Informação do QFD</th>${cab}<th class="centro">Relatório geral<br><button class="btn pequeno" data-acao="qfd-int-todas" data-macro="__rel">todas</button></th></tr></thead><tbody>${linhas}</tbody></table></div>
  <div class="barra"><label class="btn">⬆ Reimportar backup JSON do QFD<input type="file" accept=".json,.zip,application/json,application/zip" hidden id="arqQfdInf"></label>
  <button class="btn" data-acao="qfd-abrir">↗ Abrir o sistema QFD</button>
  <button class="btn" data-acao="qfd-pdf">📄 PDF da análise QFD</button></div>`);
};

/** Liga/desliga uma seção do QFD numa macroentrega (cria ou remove o bloco) ou no relatório geral. */
App.qfdAlternar = function (uid, sec, ligar) {
  if (uid === '__rel') {
    const l = new Set(App.p.config.qfdRelatorio || []);
    if (ligar) l.add(sec); else l.delete(sec);
    App.p.config.qfdRelatorio = Qfd.SECOES.map(([s]) => s).filter((s) => l.has(s));
    return;
  }
  const m = App.p.macroentregas.find((x) => x.uid === uid);
  if (!m) return;
  let b = App.qfdBlocoDaMacro(m);
  if (!b && ligar) { b = Object.assign(Nucleo.novoBloco('qfd'), { secoes: [] }); m.blocos.push(b); }
  if (!b) return;
  const l = new Set(b.secoes);
  if (ligar) l.add(sec); else l.delete(sec);
  b.secoes = Qfd.SECOES.map(([s]) => s).filter((s) => l.has(s));
  if (!b.secoes.length) m.blocos.splice(m.blocos.indexOf(b), 1);
};
App.acoes['qfd-int'] = (el) => { App.qfdAlternar(el.dataset.macro, el.dataset.sec, el.checked); App.marcarSujo(true); App.render(); };
App.acoes['qfd-int-todas'] = (el) => {
  const a = Qfd.analisar(App.p.qfdDados);
  const uid = el.dataset.macro;
  const disp = Qfd.SECOES.map(([s]) => s).filter((s) => Qfd.disponivel(a, s).ok);
  const m = App.p.macroentregas.find((x) => x.uid === uid);
  const atuais = uid === '__rel' ? (App.p.config.qfdRelatorio || []) : ((m && App.qfdBlocoDaMacro(m)) || { secoes: [] }).secoes;
  const ligar = !disp.every((s) => atuais.includes(s));
  disp.forEach((s) => App.qfdAlternar(uid, s, ligar));
  App.marcarSujo(true); App.render();
};
App.acoes['qfd-pdf'] = async () => {
  try {
    const sn = secoesNumeradas();
    const c = Pdf.blocoQfd(App.p.qfdDados, Qfd.SECOES.map(([s]) => s), { h: (t) => ({ stack: sn.h1(t) }), origem: App.qfdOrigemTexto() });
    const sum = { toc: { id: 'sum', title: { text: 'Sumário', style: 'h1', margin: [0, 0, 0, 12] } }, pageBreak: 'before' };
    App.baixarBlob(await Pdf.gerar(Pdf.documento(App.p, 'ANÁLISE', 'QFD', 'Análise QFD – casa da qualidade', [sum, { text: '', pageBreak: 'after' }, ...c], `Projeto informacional · ${App.p.projeto.nome}`)),
      `Análise QFD - ${App.nedipNomeSeguro(App.p.projeto.nome || 'projeto')}.pdf`);
  } catch (e) { console.error(e); App.toast('PDF do QFD: ' + esc(e.message), 'erro', 9000); }
};
Pdf.qfdOrigem = (p) => {
  const o = p.qfdOrigem || {};
  return o.importadoEm ? `Fonte: backup do sistema QFD “${o.arquivo}”, importado em ${Nucleo.dataBR(o.importadoEm.slice(0, 10))}.` : 'Fonte: backup do sistema QFD.';
};
App.qfdOrigemTexto = () => Pdf.qfdOrigem(App.p);
