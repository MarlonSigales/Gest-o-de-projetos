/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Relatórios em PDF gerados no navegador (pdfmake), no padrão visual dos templates InovaAgro/Embrapii:
 *  - Relatório de Macroentrega: capa → TERMO DE ACEITE (2ª página) → apresentação → itens → equipe → contracapa
 *  - Relatório Geral de Andamento: capa → listas de figuras e tabelas → sumário → seções
 */
'use strict';

const Pdf = {};
const COR = { teal: '#409580', escuro: '#085357', lima: '#A8E156', texto: '#1d2b2b', suave: '#666666', grade: '#cfdcda', zebra: '#f4f8f7' };
const MM = 2.8346;
const A4 = { w: 595.28, h: 841.89 };

// ------------------------------------------------------------------ utilidades
Pdf.lerComoDataUrl = (blob) => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(blob); });

/** Carrega as figuras referenciadas: arquivo -> {dataUrl} | {svg} | null */
Pdf.carregarFiguras = async function (p, armazem) {
  const out = {};
  for (const m of p.macroentregas) {
    for (const f of m.figuras || []) {
      if (f.arquivo in out) continue;
      const b = armazem ? await armazem.lerArquivo(f.arquivo) : null;
      if (!b) { out[f.arquivo] = null; continue; }
      out[f.arquivo] = /\.svg$/i.test(f.arquivo) ? { svg: await b.text() } : { dataUrl: await Pdf.lerComoDataUrl(b) };
    }
  }
  return out;
};

/** Texto simples (Markdown básico) → nós pdfmake: parágrafos, títulos #, listas "- "/"* "/"1.", **negrito**, *itálico* e {{fig:id}}/{{tab:id}}. */
Pdf.texto = function (txt, num, estilo = 'corpo') {
  const refs = (s) => Nucleo.trocarRefs(s, num);
  const inline = (s) => Nucleo.mdInline(refs(s)).map((t) => (t.b || t.i ? { text: t.t, bold: t.b, italics: t.i } : t.t));
  const tamH = { 1: 11.5, 2: 10.8, 3: 10.2 };
  return Nucleo.mdBlocos(txt).map((b) => {
    if (b.tipo === 'h') return { text: inline(b.texto), bold: true, fontSize: tamH[b.nivel], color: b.nivel === 2 ? COR.teal : COR.escuro, margin: [0, 6, 0, 3] };
    if (b.tipo === 'ul') return { ul: b.itens.map((l) => ({ text: inline(l) })), style: estilo, margin: [0, 0, 0, 6] };
    if (b.tipo === 'ol') return { ol: b.itens.map((l) => ({ text: inline(l) })), start: b.inicio, style: estilo, margin: [0, 0, 0, 6] };
    const partes = [];
    b.linhas.forEach((l, k) => { partes.push(...inline(l)); if (k < b.linhas.length - 1) partes.push('\n'); });
    return { text: partes, style: estilo, alignment: 'justify', margin: [0, 0, 0, 6] };
  });
};

const fonteAbnt = (f) => 'Fonte: ' + String((f || '').trim() || `Elaborado pelos autores (${new Date().getFullYear()})`).replace(/\.$/, '') + '.';

Pdf.figura = function (f, n, imgs, tocId) {
  const img = imgs[f.arquivo];
  let corpo;
  if (!img) corpo = { text: `[arquivo não encontrado: ${f.arquivo}]`, color: '#c33', alignment: 'center', margin: [0, 10, 0, 10] };
  else if (img.svg) corpo = { svg: img.svg, width: 150 * MM, alignment: 'center' };
  else corpo = { image: img.dataUrl, fit: [150 * MM, 110 * MM], alignment: 'center' };
  const leg = { text: `Figura ${n} – ${f.titulo || ''}`, style: 'legenda' };
  if (tocId) { leg.tocItem = tocId; leg.tocStyle = { fontSize: 9.5 }; }
  return { stack: [leg, corpo, { text: fonteAbnt(f.fonte), style: 'fonte' }], unbreakable: true, margin: [0, 6, 0, 10] };
};

Pdf.tabela = function (t, n, tocId) {
  const nc = Math.max(1, (t.cabecalho || []).length);
  const cab = (t.cabecalho || []).map((c) => ({ text: c, bold: true, alignment: 'center' }));
  const linhas = (t.linhas || []).map((l) => Array.from({ length: nc }, (_, k) => ({ text: String(l[k] ?? ''), alignment: 'center' })));
  const leg = { text: `Tabela ${n} – ${t.titulo || ''}`, style: 'legenda' };
  if (tocId) { leg.tocItem = tocId; leg.tocStyle = { fontSize: 9.5 }; }
  return {
    stack: [leg, {
      table: { headerRows: 1, widths: Array(nc).fill('*'), body: [cab, ...(linhas.length ? linhas : [Array(nc).fill('')])] },
      layout: { // padrão IBGE: sem bordas laterais; traços só no topo, sob o cabeçalho e no fechamento
        hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 1.1 : (i === 1 ? 0.7 : 0),
        vLineWidth: () => 0, paddingTop: () => 3, paddingBottom: () => 3,
      },
      fontSize: 9.5,
    }, { text: fonteAbnt(t.fonte), style: 'fonte' }],
    unbreakable: (t.linhas || []).length < 25, margin: [0, 6, 0, 10],
  };
};

/** Figuras e tabelas soltas de uma seção (as que estão em blocos saem no lugar do bloco). */
Pdf.anexosSecao = function (m, secao, num, imgs, tocIds = {}) {
  const itens = [], refs = Nucleo.refsBlocos(m);
  (m.figuras || []).forEach((f) => { if ((f.secao || 'resultados') === secao && !refs.fig.has(f.id)) itens.push([0, num.fig[f.id], Pdf.figura(f, num.fig[f.id], imgs, tocIds.fig)]); });
  (m.tabelas || []).forEach((t) => { if ((t.secao || 'resultados') === secao && !refs.tab.has(t.id)) itens.push([1, num.tab[t.id], Pdf.tabela(t, num.tab[t.id], tocIds.tab)]); });
  return itens.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
};

const estilos = {
  corpo: { fontSize: 10, lineHeight: 1.25, color: COR.texto },
  legenda: { fontSize: 10, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
  fonte: { fontSize: 8.5, alignment: 'center', margin: [0, 3, 0, 0] },
  secao: { fontSize: 11, bold: true, color: COR.teal },
  subitem: { fontSize: 10.5, bold: true, color: COR.texto },
  h1: { fontSize: 15, bold: true, color: COR.escuro, margin: [0, 0, 0, 2] },
  h2: { fontSize: 12, bold: true, color: COR.teal, margin: [0, 10, 0, 5] },
  h3: { fontSize: 10.5, bold: true, color: COR.escuro, margin: [0, 8, 0, 4] },
  muted: { fontSize: 8.5, color: COR.suave },
  th: { bold: true, color: '#ffffff', fontSize: 8.8 },
  td: { fontSize: 8.8 },
};

const trlCor = (v) => (v === null || v === undefined) ? '#888888' : v <= 3 ? '#c0392b' : v <= 6 ? '#d4a017' : '#2e8b57';
const trlTxt = (v) => ({ text: (v === null || v === undefined) ? 'n/a' : 'TRL ' + v, bold: true, color: '#ffffff', fillColor: trlCor(v), alignment: 'center', fontSize: 8.5 });

/** Tabela com cabeçalho verde e linhas zebradas. */
Pdf.grade = function (cabecalho, linhas, widths) {
  return {
    table: { headerRows: 1, widths: widths || Array(cabecalho.length).fill('*'),
      body: [cabecalho.map((c) => (c && typeof c === 'object' && !Array.isArray(c) ? Object.assign({ style: 'th', fillColor: COR.teal }, c) : { text: c, style: 'th', fillColor: COR.teal })), ...linhas.map((l, i) => l.map((c) => {
        const cel = typeof c === 'object' && c !== null && !Array.isArray(c) ? Object.assign({}, c) : { text: c ?? '' };
        if (!cel.fillColor && i % 2 === 1) cel.fillColor = COR.zebra;
        cel.style = cel.style || 'td';
        return cel;
      }))] },
    layout: { hLineColor: () => COR.grade, vLineColor: () => COR.grade, hLineWidth: () => 0.5, vLineWidth: () => 0.5, paddingTop: () => 3, paddingBottom: () => 3 },
    margin: [0, 3, 0, 9],
  };
};

Pdf.kpi = function (pares) {
  return {
    table: { widths: [150, '*'], body: pares.map(([r, v]) => [{ text: r, bold: true, color: COR.escuro, fillColor: '#eef5f3', fontSize: 9 }, typeof v === 'object' ? v : { text: String(v ?? ''), fontSize: 9 }]) },
    layout: { hLineColor: () => COR.grade, vLineColor: () => COR.grade, hLineWidth: () => 0.5, vLineWidth: () => 0.5, paddingTop: () => 4, paddingBottom: () => 4 },
    margin: [0, 2, 0, 8],
  };
};

const caixa = (conteudo, tipo = 'alerta') => ({
  table: { widths: [4, '*'], body: [[{ text: '', fillColor: tipo === 'alerta' ? '#c0392b' : COR.teal }, { stack: [].concat(conteudo), fontSize: 9, fillColor: tipo === 'alerta' ? '#fdf0ef' : '#eef7f4' }]] },
  layout: 'noBorders', margin: [0, 2, 0, 4],
});

const pessoas = (l) => (l || []).map((r) => `${r.nome || ''}${r.email ? ' <' + r.email + '>' : ''}${r.observacao ? ' (' + r.observacao + ')' : ''}`).join('; ') || '—';

Pdf.fontes = () => ({ Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-MediumItalic.ttf' } });

// ------------------------------------------------------------------ elementos do template
const T = () => window.TEMPLATES;

function textoVigencia(p) {
  const v = Nucleo.vigencia(p);
  if (!v.inicio && !v.fimVigente) return '';
  let t = `Vigência: ${Nucleo.dataBR(v.inicio) || '—'} a ${Nucleo.dataBR(v.fimVigente) || '—'}`;
  if (v.termos.length) t += ` (término original ${Nucleo.dataBR(v.fimOriginal)}; ${v.nAditivos} aditivo(s), ${v.nSubtrativos} subtrativo(s))`;
  return t;
}

function capa(p, linha1, linha2, extra) {
  const pj = p.projeto, u = CONFIG.unidade;
  const vig = textoVigencia(p);
  return [
    { image: T().fundoCapa, width: 330, absolutePosition: { x: 0, y: 0 } },
    { image: T().logo, width: 120, absolutePosition: { x: 12 * MM, y: 10 * MM } },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 14 * MM, h: 14 * MM, color: COR.teal }], absolutePosition: { x: 18 * MM, y: 98 * MM } },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 10 * MM, h: 10 * MM, color: COR.lima }], absolutePosition: { x: 30 * MM, y: 110 * MM } },
    { text: linha1, fontSize: 26, color: COR.escuro, absolutePosition: { x: 40 * MM, y: 96 * MM } },
    { text: linha2, fontSize: 26, color: COR.escuro, absolutePosition: { x: 50 * MM, y: 110 * MM } },
    { text: String(pj.ano || ''), fontSize: 20, alignment: 'center', absolutePosition: { x: 0, y: 150 * MM } },
    { text: `${u.sigla} – ${pj.codigo} – ${pj.nome}`, fontSize: 9, color: COR.escuro, alignment: 'center', absolutePosition: { x: 20 * MM, y: 163 * MM }, width: 170 * MM },
    ...(vig ? [{ table: { widths: [170 * MM], body: [[{ text: vig, fontSize: 9.5, bold: true, color: COR.escuro, alignment: 'center' }]] }, layout: 'noBorders', absolutePosition: { x: 20 * MM, y: 170 * MM } }] : []),
    ...(extra ? [{ table: { widths: [170 * MM], body: [[{ text: extra, fontSize: 10, alignment: 'center' }]] }, layout: 'noBorders', absolutePosition: { x: 20 * MM, y: 178 * MM } }] : []),
    { text: pj.empresaParceira || 'Parceiro', fontSize: 16, absolutePosition: { x: 20 * MM, y: 200 * MM } },
    { table: { widths: [62 * MM], body: [[{ text: 'Endereço:\n' + String(pj.endereco || '').replace(/, /g, ',\n'), fontSize: 9.5, alignment: 'right', lineHeight: 1.5 }]] }, layout: 'noBorders', absolutePosition: { x: 118 * MM, y: 245 * MM } },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 23 * MM, h: 80 * MM, color: COR.teal }], absolutePosition: { x: 187 * MM, y: 190 * MM } },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 60 * MM, h: 25 * MM, color: COR.lima }], absolutePosition: { x: 150 * MM, y: 272 * MM } },
  ];
}

function contracapa() {
  const u = CONFIG.unidade;
  return [
    { image: T().fundoEquipe, width: A4.w, height: A4.h, opacity: 0.35, absolutePosition: { x: 0, y: 0 } },
    { image: T().logoGrande, width: 115 * MM, absolutePosition: { x: 47.5 * MM, y: 95 * MM } },
    { text: u.site, fontSize: 11, alignment: 'center', absolutePosition: { x: 0, y: 152 * MM } },
    { stack: [`Telefone: ${u.telefones}`, `E-mail: ${u.email}`, u.endereco], fontSize: 10.5, bold: true, color: COR.escuro, lineHeight: 1.6, absolutePosition: { x: 40 * MM, y: 240 * MM } },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 20 * MM, h: 47 * MM, color: COR.escuro }], absolutePosition: { x: 190 * MM, y: 250 * MM } },
  ];
}

const tituloSecao = (img, titulo, toc) => ({
  columns: [{ image: T()[img], width: 36, height: 36 }, Object.assign({ text: titulo.toUpperCase(), style: 'secao', margin: [10, 11, 0, 0] },
    toc ? { tocItem: toc, tocStyle: { bold: true, fontSize: 10, color: COR.teal }, tocMargin: [0, 8, 0, 0] } : {})],
  margin: [0, 16, 0, 6], unbreakable: true,
});
const subitem = (rotulo, toc) => ({ columns: [{ image: T().seta, width: 9, margin: [0, 2, 0, 0] }, Object.assign({ text: rotulo, style: 'subitem', margin: [6, 0, 0, 0] },
  toc ? { tocItem: toc, tocStyle: { fontSize: 9.5 }, tocMargin: [14, 3, 0, 0] } : {})], margin: [22, 8, 0, 4] });
const corpo = (arr) => ({ stack: arr, margin: [22, 0, 0, 0] });

// ------------------------------------------------------------------ RELATÓRIO DE MACROENTREGA
Pdf.macroentrega = async function (p, mi, armazem) {
  const m = p.macroentregas[mi];
  const an = Nucleo.analisar(p);
  const pj = p.projeto, u = CONFIG.unidade, num = Nucleo.numerar(p, [m]);
  const imgs = await Pdf.carregarFiguras({ macroentregas: [m] }, armazem);
  const n = mi + 1;
  const c = [];

  // página 1 — capa (elementos posicionados)
  c.push(...capa(p, 'MACRO', 'ENTREGA ' + n));
  c.push({ text: ' ' });

  // página 2 — TERMO DE ACEITE (cabeçalho institucional vem no header da página 2)
  const ac = m.aceite || {};
  const data = ac.dataAceite ? Nucleo.dataBR(ac.dataAceite) : (m.dataEntrega ? Nucleo.dataBR(m.dataEntrega) : '____/____/______');
  const resp = ac.nomeResponsavelEmpresa || pj.responsavelEmpresa;
  const rot = (t) => ({ text: t, bold: true, alignment: 'center', fontSize: 9 });
  const val = (t) => ({ text: t || '', fontSize: 9 });
  c.push({ text: 'TERMO DE ACEITE DE MACROENTREGA', bold: true, fontSize: 11, alignment: 'center', margin: [0, 0, 0, 14], pageBreak: 'before' });
  c.push({
    table: { widths: [95, '*'], body: [
      [rot('Unidade EMBRAPII'), val(pj.unidadeEmbrapii)],
      [rot('Empresa'), val(pj.empresaParceira)],
      [rot('Código Projeto'), val(pj.codigo)],
      [rot('Número da Macroentrega'), val('Macroentrega ' + String(n).padStart(2, '0'))],
      [rot('Título da Macroentrega'), val(m.titulo)],
      [{ text: 'Descrição da Macroentrega', bold: true, alignment: 'center', colSpan: 2, fontSize: 9 }, {}],
      [{ text: m.descricao || '', colSpan: 2, fontSize: 9, alignment: 'justify', margin: [0, 0, 0, 90] }, {}],
      [{ text: 'Declaração que a Macroentrega descrita está aceita.', bold: true, alignment: 'center', colSpan: 2, fontSize: 9 }, {}],
      [{ text: 'Data: ' + data, fontSize: 9, margin: [0, 0, 0, 90] }, { stack: [
        { text: '______________________________________________', alignment: 'center', margin: [0, 50, 0, 2] },
        { text: 'Assinatura do responsável pelo projeto na Empresa', alignment: 'center' },
        { text: `(${resp || 'nome do responsável'}\n${pj.empresaParceira || 'nome da empresa'})`, alignment: 'center' },
        ...(ac.aceito ? [{ text: '√ Aceite registrado no sistema', bold: true, color: COR.escuro, alignment: 'center', margin: [0, 6, 0, 0] }] : []),
      ], fontSize: 9 }],
    ] },
    layout: { hLineWidth: () => 0.7, vLineWidth: () => 0.7, paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 6, paddingRight: () => 6 },
  });

  // página 3 — SUMÁRIO (logo após o termo de aceite)
  const TOC = 'sumMacro';
  c.push({ toc: { id: TOC, title: { text: 'SUMÁRIO', style: 'secao', fontSize: 13, margin: [0, 0, 0, 14] } }, pageBreak: 'before' });

  // página 4 — apresentação
  c.push({ columns: [{ canvas: [{ type: 'rect', x: 0, y: 0, w: 34, h: 34, color: COR.teal }], width: 44 }, { text: 'MACRO', fontSize: 22, bold: true, color: COR.escuro, margin: [0, 5, 0, 0] }], pageBreak: 'before', margin: [0, 0, 0, 40] });
  c.push({ table: { widths: [170], body: [[{ text: 'ENTREGA ' + n, bold: true, color: '#ffffff', fillColor: COR.teal, margin: [8, 4, 0, 4] }]] }, layout: 'noBorders', margin: [0, 0, 0, 22] });
  c.push({ stack: Pdf.texto(`**A Macro Entrega ${n}${m.titulo ? ' – ' + m.titulo : ''}** – ${m.descricao || ''}`, num), width: 340, margin: [0, 0, 110, 0] });

  // páginas de itens
  c.push(Object.assign(tituloSecao('secAndamento', 'Próximos passos para o TRL esperado', TOC), { pageBreak: 'before', margin: [0, 0, 0, 6] }));
  c.push(corpo(Pdf.proximosPassos(p, an, +m.trlEsperado || null, { text: '' }).slice(1)));
  c.push(tituloSecao('secFundamentos', 'Fundamentos e direcionamento do projeto', TOC));
  c.push(subitem('1. Introdução', TOC), corpo([...Pdf.texto(pj.introducao, num), ...Pdf.anexosSecao(m, 'introducao', num, imgs)]));
  c.push(subitem('2. Objetivo Geral do Projeto', TOC), corpo(Pdf.texto(pj.objetivoGeral, num)));
  const obj = (m.objetivosEtapa || []).filter((o) => String(o).trim());
  c.push(subitem(`2.1 Objetivos da Etapa ${n}`, TOC), corpo([
    ...(obj.length ? [{ ul: obj.map((o, i) => o + (i < obj.length - 1 ? ';' : '.')), style: 'corpo', margin: [0, 0, 0, 6] }] : []),
    ...Pdf.anexosSecao(m, 'objetivos', num, imgs)]));
  c.push(tituloSecao('secResultados', 'Resultados e conclusões do projeto', TOC));
  c.push(subitem('3. Resultados', TOC), corpo([...Pdf.texto(m.resultados, num), ...Pdf.anexosSecao(m, 'resultados', num, imgs),
    ...Pdf.blocos(p, m, num, imgs, { recuo: 22, base: '3', tocTitulos: TOC })]));
  c.push(subitem('4. Conclusão', TOC), corpo([...Pdf.texto(m.conclusao, num), ...Pdf.anexosSecao(m, 'conclusao', num, imgs)]));
  c.push(tituloSecao('secProjecoes', 'Projeções e próximos passos', TOC));
  c.push(subitem('5. Etapas Futuras', TOC), corpo([...Pdf.texto(m.etapasFuturas, num), ...Pdf.anexosSecao(m, 'etapasFuturas', num, imgs)]));

  if (p.config && p.config.incluirAndamentoNaMacro) {
    const am = an.macroentregas[mi];
    c.push(tituloSecao('secAndamento', 'Andamento e maturidade tecnológica (TRL)', TOC));
    const bloco = [Pdf.kpi([
      ['Situação', am.status.charAt(0).toUpperCase() + am.status.slice(1)],
      ['Percentual concluído', am.percentual + '%' + (am.automatico ? ' (calculado pelas atividades)' : '')],
      ['Prazo previsto', Nucleo.dataBR(m.dataPrevista)],
      ['TRL esperado ao fim da etapa', String(m.trlEsperado || '—')],
    ])];
    const atv = an.atividades.filter((a) => a.macro === n);
    if (atv.length) {
      bloco.push({ text: 'Atividades', style: 'h3' }, Pdf.grade(['Cód.', 'Atividade', 'Responsável', 'Período', '%'],
        atv.map((a) => [a.codigo, a.nome + (a.atrasada ? ' (atrasada)' : ''), a.responsavel, `${Nucleo.dataBR(a.inicio)} a ${Nucleo.dataBR(a.fim)}`, String(a.percentual)]), [28, '*', 90, 110, 26]));
    }
    const ids = m.areas || [];
    const areas = an.trl.areas.filter((a) => !ids.length || ids.includes(a.id));
    if (areas.length && an.trl.temDados) bloco.push({ text: 'TRL das áreas envolvidas', style: 'h3' }, Pdf.tabelaAreas(areas, +m.trlEsperado || null));
    c.push(corpo(bloco));
  }

  // referências citadas nos textos desta macroentrega
  const refs = Pdf.referenciasCitadas(p, num);
  if (refs.length) c.push(tituloSecao('secProjecoes', 'Referências', TOC), corpo(refs));

  // apêndices: manuais e documentos individuais, só na última macroentrega (depois das referências)
  if (mi === p.macroentregas.length - 1) c.push(...await Pdf.apendices(p, armazem));

  // equipe
  const eq = [{ text: 'EQUIPE', fontSize: 24, bold: true, color: COR.lima, pageBreak: 'before' }, { text: 'PARTICIPANTES DO PROJETO', fontSize: 10.5, bold: true, color: COR.teal, margin: [0, 0, 0, 24] }];
  const pessoasEq = [];
  if (String(pj.coordenador.nome || '').trim()) pessoasEq.push({ text: 'COORDENADOR', bold: true, color: COR.lima }, { text: `${pj.coordenador.nome}\n${pj.coordenador.email || ''}`, margin: [0, 0, 0, 12] });
  pessoasEq.push({ text: 'COORDENADOR ADJUNTO', bold: true, color: COR.lima }, { text: `${pj.coordenadorAdjunto.nome || '—'}\n${pj.coordenadorAdjunto.email || ''}`, margin: [0, 0, 0, 12] });
  pessoasEq.push({ text: 'EQUIPE', bold: true, color: COR.lima });
  (pj.equipe || []).filter((e) => String((e.nome || '') + (e.email || '')).trim()).forEach((e) => pessoasEq.push({ text: [e.nome || '', e.funcao ? { text: ` (${e.funcao})`, style: 'muted' } : '', '\n' + (e.email || '')], margin: [0, 0, 0, 8] }));
  eq.push({ columns: [{ image: T().secEquipe, width: 42, height: 42 }, { stack: pessoasEq, margin: [14, 0, 0, 0], fontSize: 10 }] });
  c.push(...eq);

  // contracapa
  c.push({ text: ' ', pageBreak: 'before' });
  c.push(...contracapa());

  const rodTxt = `MACRO ENTREGA ${n} – ${u.sigla} ${pj.codigo}`;
  const doc = {
    pageSize: 'A4', pageMargins: [25 * MM, 42 * MM, 20 * MM, 28 * MM],
    info: { title: `Macroentrega ${n} – ${pj.nome}`, author: pj.coordenador.nome || '', creator: 'Gestão de Projetos (navegador)' },
    defaultStyle: { font: 'Roboto', fontSize: 10, color: COR.texto },
    styles: estilos,
    content: c,
    header: (pg, total) => {
      if (pg === 1 || pg === total) return null;
      if (pg === 2) {
        return { margin: [18 * MM, 10 * MM, 18 * MM, 0], columns: [
          { image: T().logoUfpel, width: 110 },
          { stack: u.cabecalhoAceite.map((l) => ({ text: l, bold: true })), fontSize: 7.5, alignment: 'center', margin: [6, 4, 6, 0] },
          { image: T().logoAceite, width: 105 },
        ] };
      }
      if (pg === 3 || pg === 4 || pg === total - 1) return { image: T().logo, width: 80, alignment: 'right', margin: [0, 10 * MM, 14 * MM, 0] }; // sumário e apresentação
      return { margin: [25 * MM, 10 * MM, 14 * MM, 0], columns: [
        { stack: [{ text: 'ITENS', fontSize: 11, bold: true, color: COR.teal }, { text: `MACRO ENTREGA ${n}`, fontSize: 22, bold: true, color: COR.escuro }], margin: [0, 8, 0, 0] },
        { image: T().logo, width: 80, alignment: 'right' },
      ] };
    },
    footer: (pg, total) => {
      if (pg === 1 || pg === total) return null;
      if (pg === 2) return { stack: u.rodapeAceite, italics: true, fontSize: 8, color: '#444444', alignment: 'right', margin: [0, 10, 18 * MM, 0] };
      return { columns: [{ text: rodTxt, fontSize: 7.5, bold: true, color: COR.escuro }, { text: String(pg), fontSize: 7.5, bold: true, color: COR.escuro, alignment: 'right', width: 40 }], margin: [25 * MM, 30, 20 * MM, 0] };
    },
    background: (pg, tam) => {
      const W = (tam && tam.width) || A4.w, H = (tam && tam.height) || A4.h; // folhas deitadas (tabelas largas) têm outro tamanho
      const itens = [];
      if (pg === 3) itens.push({ image: T().fundoLateral, width: 78 * MM, height: H, opacity: 0.6, absolutePosition: { x: 0, y: 0 } });
      if (pg >= 3) itens.push({ canvas: [{ type: 'rect', x: 0, y: 0, w: 12 * MM, h: 26 * MM, color: COR.escuro }], absolutePosition: { x: W - 12 * MM, y: H - 26 * MM } });
      return itens;
    },
  };
  return doc;
};

// ------------------------------------------------------------------ PRÓXIMOS PASSOS PARA O TRL ESPERADO
/**
 * O que falta para cada item da árvore TRL chegar ao TRL esperado (alvo): critérios do próximo nível (avaliação interna)
 * e quantos faltam nos níveis seguintes, com a área e os responsáveis a cobrar.
 */
Nucleo.proximosPassosTrl = function (p, an, alvo) {
  if (!an.trl.temDados || !alvo) return { itens: [], semDados: !an.trl.temDados };
  const flat = Object.values(Nucleo.achatar(an.trl.arvore));
  const flatTodos = Nucleo.achatar(an.trl.arvore);
  const area = (chave) => { const r = Nucleo.areaDoItem(an.trl.areas, flatTodos, chave); return r ? r.area : null; };
  const itens = flat.filter((n) => n.trlInformado === null || n.trlInformado < alvo).map((n) => {
    const atual = n.trlInformado || 0, c = (n.avaliacao && n.avaliacao.criterios) || {};
    const interno = n.avaliacao && n.avaliacao.origem === 'interno';
    const niveis = window.TRL_NIVEIS.filter((l) => l.n > atual && l.n <= alvo).map((l) => ({ n: l.n,
      faltam: l.criterios.filter(([id]) => !(c[id] && (c[id].r === 'sim' || c[id].r === 'na'))).map(([id, t]) => ({ id, texto: t })) }));
    const a = area(n.chave);
    return { chave: n.chave, titulo: n.titulo, tipo: Nucleo.NOME_TIPO[n.tipo] || n.tipo, atual: n.trlInformado, alvo, interno, niveis, area: a ? a.nome : '', responsaveis: a ? a.responsaveis : [] };
  });
  // mostra primeiro os itens que limitam o sistema (menor TRL) e, entre eles, os mais detalhados (folhas)
  itens.sort((x, y) => (x.atual ?? 0) - (y.atual ?? 0) || y.chave.split('/').length - x.chave.split('/').length);
  return { itens, semDados: false };
};
Pdf.proximosPassos = function (p, an, alvo, titulo) {
  const r = Nucleo.proximosPassosTrl(p, an, alvo), out = [titulo];
  if (r.semDados) return out.concat(caixa('A maturidade (TRL) ainda não foi avaliada: avalie os itens na aba TRL para que o relatório indique o que falta para atingir o TRL esperado.'));
  if (!alvo) return out.concat(caixa('Informe o TRL esperado da macroentrega para gerar os próximos passos.'));
  if (!r.itens.length) return out.concat(caixa(`Todos os itens avaliados já atingiram o TRL esperado (${alvo}).`, 'ok'));
  out.push({ text: `TRL esperado: ${alvo}. Itens abaixo da meta (${r.itens.length}), começando pelos que limitam o sistema. O TRL de um item é o maior nível com todos os critérios dos níveis anteriores atendidos.`, style: 'corpo', margin: [0, 0, 0, 4] });
  out.push(Pdf.grade(['Item', 'TRL atual', 'O que falta', 'Área / cobrar'], r.itens.slice(0, 25).map((x) => {
    const prox = x.niveis[0];
    const falta = !x.interno && x.atual !== null ? [{ text: 'Avaliado fora do sistema: reavalie pelos critérios na aba TRL.', italics: true }]
      : [...(prox ? [{ text: `Para o TRL ${prox.n}:`, bold: true }, { ul: prox.faltam.map((f) => `${f.id} ${f.texto}`), fontSize: 7.8 }] : []),
        ...x.niveis.slice(1).filter((l) => l.faltam.length).map((l) => ({ text: `TRL ${l.n}: ${l.faltam.length} critério(s)`, fontSize: 7.8, color: COR.suave }))];
    return [{ text: [x.titulo, { text: `  ${x.chave} · ${x.tipo}`, style: 'muted' }] }, trlTxt(x.atual), { stack: falta, fontSize: 8 },
      { text: [x.area || 'sem área', '\n', { text: x.responsaveis.map((r) => r.nome).filter(Boolean).join('; ') || (x.area ? 'área sem responsável — cobrar a coordenação' : 'vincule o item a uma área (aba Equipe) — cobrar a coordenação'), style: 'muted' }], fontSize: 8 }];
  }), ['*', 44, '*', 95]));
  if (r.itens.length > 25) out.push({ text: `… e mais ${r.itens.length - 25} item(ns): veja a aba TRL.`, style: 'muted' });
  return out;
};

Pdf.tabelaAreas = function (areas, esperadoPadrao) {
  return Pdf.grade(['Área', 'Item avaliado', 'TRL atual', 'TRL esperado', 'Responsável(is)'],
    areas.map((a) => [a.nome, a.noTitulo || '—', trlTxt(a.trlAtual), String((esperadoPadrao ?? a.trlEsperado) || '—'), pessoas(a.responsaveis)]),
    [80, 80, 48, 48, '*']);
};

// ------------------------------------------------------------------ RELATÓRIO GERAL DE ANDAMENTO
Pdf.andamento = async function (p, armazem) {
  const pj = p.projeto, u = CONFIG.unidade, an = Nucleo.analisar(p);
  const cont = { f: 0, t: 0 }, figRel = [];
  if ((p.config.nedipRelatorio || []).includes('funcoes') && nedipTemFuncoes(p)) figRel.push(['nd_rel_funcoes', ++cont.f]); // seção 6 vem antes do desenvolvimento
  const num = Nucleo.numerar(p, p.macroentregas, cont);
  figRel.forEach(([id, n]) => { num.fig[id] = n; num.listaF.unshift({ n, titulo: 'Função global e estrutura de funções' }); });
  const imgs = await Pdf.carregarFiguras(p, armazem);
  const c = [];
  let sec = 0;
  const h1 = (t) => { sec++; return [{ text: `${sec} ${t.toUpperCase()}`, style: 'h1', tocItem: 'sum', tocStyle: { bold: true, fontSize: 10 }, tocMargin: [0, 4, 0, 0], margin: [0, 14, 0, 2] },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 470, y2: 0, lineWidth: 2, lineColor: COR.lima }], margin: [0, 0, 0, 8] }]; };
  const h2 = (t) => ({ text: t, style: 'h2', tocItem: 'sum', tocStyle: { fontSize: 9.5 }, tocMargin: [14, 2, 0, 0] });

  c.push(...capa(p, 'RELATÓRIO DE', 'ANDAMENTO', `Situação em ${new Date().toLocaleDateString('pt-BR')} · ${p.macroentregas.length} macroentrega(s)`));
  c.push({ text: ' ' });

  // pré-textuais (ABNT): listas e sumário
  if (num.listaF.length) c.push({ toc: { id: 'fig', title: { text: 'Lista de figuras', style: 'h1', margin: [0, 0, 0, 12] } }, pageBreak: 'before' });
  if (num.listaT.length) c.push({ toc: { id: 'tab', title: { text: 'Lista de tabelas', style: 'h1', margin: [0, 0, 0, 12] } }, pageBreak: 'before' });
  c.push({ toc: { id: 'sum', title: { text: 'Sumário', style: 'h1', margin: [0, 0, 0, 12] } }, pageBreak: 'before' });

  // 1
  c.push(Object.assign(h1('Identificação e resumo executivo')[0], { pageBreak: 'before' }), h1dummy());
  function h1dummy() { return { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 470, y2: 0, lineWidth: 2, lineColor: COR.lima }], margin: [0, 0, 0, 8] }; }
  const prox = an.macroentregas.find((m) => !['concluída', 'aceita'].includes(m.status));
  c.push(Pdf.kpi([
    ['Projeto', pj.nome], ['Código', pj.codigo], ['Unidade EMBRAPII', pj.unidadeEmbrapii], ['Empresa parceira', pj.empresaParceira],
    ['Coordenação', `${pj.coordenador.nome || ''} ${pj.coordenador.email ? '<' + pj.coordenador.email + '>' : ''}`],
    ['Vigência', (() => { const v = an.vigencia; return `${Nucleo.dataBR(v.inicio)} a ${Nucleo.dataBR(v.fimVigente)}` + (v.termos.length ? ` (original: ${Nucleo.dataBR(v.fimOriginal)})` : '') + (v.restamDias !== null ? (v.restamDias >= 0 ? ` · restam ${v.restamDias} dias` : ' · encerrada') : ''); })()],
    ['Percentual geral', { text: [{ text: an.percentualGeral + '%', bold: true }, ' (média das macroentregas)'], fontSize: 9 }],
    ['TRL atual do sistema', an.trl.sistema === null ? '—' : 'TRL ' + an.trl.sistema],
    ['TRL esperado', `etapa atual: ${an.trl.esperadoEtapa ?? '—'} · final: ${an.trl.esperadoFinal ?? '—'}`],
    ['Próxima entrega', prox ? `Macroentrega ${prox.numero} – ${prox.titulo} (${Nucleo.dataBR(prox.dataPrevista)})` : 'todas concluídas'],
  ]));
  an.alertas.forEach((a) => c.push(caixa(a)));
  if (!an.alertas.length) c.push(caixa('Nenhum alerta de prazo ou dependência.', 'ok'));
  if (an.vigencia.termos.length) {
    c.push(h2('Termos aditivos e subtrativos de prazo'), Pdf.grade(['Termo', 'Tipo', 'Prazo', 'Data', 'Término resultante', 'Justificativa'],
      an.vigencia.termos.map((t) => [t.numero || '—', t.tipo === 'subtrativo' ? 'Subtrativo' : 'Aditivo', `${t.tipo === 'subtrativo' ? '−' : '+'}${t.quantidade} ${t.unidade}`, Nucleo.dataBR(t.dataTermo), Nucleo.dataBR(t.fimDepois), t.justificativa]),
      [50, 55, 55, 55, 65, '*']));
  }

  // próximos passos (TRL esperado na etapa atual ou ao final)
  c.push(...Pdf.proximosPassos(p, an, an.trl.esperadoEtapa || an.trl.esperadoFinal, { stack: h1('Próximos passos para o TRL esperado') }));

  // 2
  c.push(...h1('Quadro das macroentregas'));
  c.push(Pdf.grade(['Nº', 'Título', 'Início', 'Prevista', 'Entrega', 'Situação', '%', 'Aceite'],
    an.macroentregas.map((m) => [String(m.numero), m.titulo, Nucleo.dataBR(m.dataInicio), Nucleo.dataBR(m.dataPrevista), Nucleo.dataBR(m.dataEntrega),
      m.atrasada ? { text: 'atrasada', color: '#c0392b', bold: true } : m.status, String(m.percentual), m.aceito ? 'sim' : 'não']),
    [18, '*', 50, 50, 50, 58, 28, 32]));
  const inter = p.macroentregas.flatMap((m, i) => m.relatorios.map((r) => [String(i + 1), r.titulo, Nucleo.dataBR(r.data), r.periodoInicio || r.periodoFim ? `${Nucleo.dataBR(r.periodoInicio) || '…'} a ${Nucleo.dataBR(r.periodoFim) || '…'}` : '—', String(r.blocos.length)]));
  if (inter.length) c.push(h2('Relatórios de andamento entre macroentregas'), Pdf.grade(['Macro', 'Relatório', 'Data', 'Período', 'Blocos'], inter, [32, '*', 55, 110, 38]));

  // 3
  c.push(...h1('Cronograma'));
  if (an.atividades.some((a) => a.inicio && a.fim)) c.push({ svg: Nucleo.ganttSvg(an, 1000), width: 470 });
  else c.push({ text: 'Cadastre atividades com data de início e fim nas macroentregas para gerar o Gantt.', style: 'muted', margin: [0, 0, 0, 8] });
  if (an.cpm.caminho.length) c.push({ text: [{ text: 'Caminho crítico', bold: true }, ` (${an.cpm.duracao} dias): ${an.cpm.caminho.join(' › ')}.`], style: 'corpo', margin: [0, 6, 0, 4] });
  const atras = an.atividades.filter((a) => a.atrasada);
  if (atras.length) c.push(h2('Atividades atrasadas'), Pdf.grade(['Cód.', 'Atividade', 'Responsável', 'Fim previsto', '%'], atras.map((a) => [a.codigo, a.nome, a.responsavel, Nucleo.dataBR(a.fim), String(a.percentual)]), [28, '*', 100, 60, 26]));

  // 4
  c.push(...h1('Maturidade tecnológica (TRL)'));
  if (!an.trl.temDados) {
    c.push(caixa(`Nenhuma avaliação de maturidade importada. Faça a avaliação na ferramenta oficial (${CONFIG.urlMaturidade}) e importe o JSON na aba TRL.`));
  } else {
    c.push(Pdf.kpi([
      ['TRL atual do sistema', { text: [an.trl.sistema === null ? '—' : 'TRL ' + an.trl.sistema, { text: '  (menor TRL entre os subelementos)', style: 'muted' }], fontSize: 9 }],
      ['TRL esperado na etapa', String(an.trl.esperadoEtapa ?? '—')], ['TRL esperado ao final', String(an.trl.esperadoFinal ?? '—')],
      ['Avaliação importada em', String(p.trl.ultimaImportacao || '').replace('T', ' ')],
    ]));
    c.push(h2('TRL esperado × TRL atual por área'), Pdf.tabelaAreas(an.trl.areas));
    const g = Pdf.graficoTrl(an.trl.areas);
    if (g) c.push({ svg: g, width: 450, alignment: 'center', margin: [0, 0, 0, 8] });
    c.push(h2('Pontos de verificação (TRL mais baixo)'));
    an.trl.pontosVerificacao.forEach((pv) => c.push(caixa([{ text: [{ text: pv.nome, bold: true }, ` — TRL atual ${pv.trlAtual}${pv.trlEsperado ? ' (esperado ' + pv.trlEsperado + ')' : ''}`] }, { text: [{ text: 'Cobrar: ', bold: true }, pessoas(pv.cobrar)] }])));
    c.push({ text: 'Itens da estrutura com menor TRL', style: 'h3' }, Pdf.grade(['Item', 'Tipo', 'TRL', 'Área', 'Cobrar', 'Falta para o próximo nível'],
      an.trl.nosMaisBaixos.map((nn) => [`${nn.titulo} (${nn.chave})`, nn.tipo, trlTxt(nn.trl), nn.area || '—', pessoas(nn.cobrar),
        nn.falta && nn.falta.nivel ? `TRL ${nn.falta.nivel}: ` + nn.falta.faltam.map((f) => f.id + ' ' + f.texto).join('; ') : '—']), ['*', 50, 36, 60, 95, 120]));
    if (an.trl.divergentes.length) c.push({ text: 'Divergências de avaliação', style: 'h3' }, Pdf.grade(['Item', 'TRL informado', 'Menor TRL dos subelementos'], an.trl.divergentes.map((d) => [d.titulo, String(d.informado), String(d.minFilhos)])));
    const linhasArv = [];
    const rec = (nos, nivel) => nos.forEach((nn) => {
      linhasArv.push([{ text: [nn.titulo, { text: '  ' + nn.chave, style: 'muted' }], margin: [nivel * 12, 0, 0, 0] }, Nucleo.NOME_TIPO[nn.tipo] || nn.tipo, trlTxt(nn.trlEfetivo),
        { text: (nn.divergente ? `informado ${nn.trlInformado} ≠ mínimo dos subelementos ${nn.trlMinFilhos}` : '') + (nn.visivel ? '' : ' (oculto)'), style: 'muted' }]);
      rec(nn.filhos, nivel + 1);
    });
    rec(an.trl.arvore, 0);
    c.push({ text: 'Estrutura avaliada', style: 'h3' }, Pdf.grade(['Estrutura', 'Tipo', 'TRL', 'Observação'], linhasArv, ['*', 70, 44, 130]));
    // evidências da avaliação interna por critérios
    const evid = [];
    const recEv = (nos) => nos.forEach((nn) => {
      const av = nn.avaliacao;
      if (av && av.origem === 'interno') {
        const trlC = trlPorCriterios(av) || 0, falta = trlFaltaProximo(av);
        const itens = [];
        TRL_NIVEIS.filter((lv) => lv.n <= trlC).forEach((lv) => lv.criterios.forEach(([id]) => {
          const cr = av.criterios[id];
          if (cr && (cr.ev || cr.fig)) itens.push(`${id}${cr.r === 'na' ? ' (N.A.)' : ''}: ${cr.ev || ''}${cr.fig && num.fig[cr.fig] ? ` (Figura ${num.fig[cr.fig]})` : ''}`);
        }));
        const nao = TRL_NIVEIS.flatMap((lv) => lv.criterios).filter(([id]) => av.criterios[id] && av.criterios[id].r === 'nao').map(([id]) => `${id}: ${av.criterios[id].ev || 'não atendido'}`);
        evid.push([nn.titulo, trlTxt(trlC || null), { ul: itens.length ? itens : ['—'], fontSize: 7.8 },
          { stack: [falta.nivel ? `TRL ${falta.nivel}: ${falta.faltam.map((f) => f.id).join(', ')}` : '—', ...(nao.length ? [{ text: nao.join('; '), color: '#c0392b' }] : [])], fontSize: 7.8 }]);
      }
      recEv(nn.filhos || []);
    });
    recEv(p.trl.arvore || []);
    if (evid.length) c.push({ text: 'Evidências da avaliação por critérios', style: 'h3' }, Pdf.grade(['Item', 'TRL', 'Evidências dos critérios atendidos', 'Falta / não atendido'], evid, [85, 38, '*', 110]),
      { text: TRL_FONTE + '. O TRL de cada item é o maior nível com todos os critérios dos níveis anteriores atendidos.', style: 'muted', margin: [0, 0, 0, 6] });
  }

  // 5
  c.push({ stack: [...h1('Riscos'), Pdf.matrizRiscos(an.riscos)], unbreakable: true }); // título junto da matriz (não fica sozinho no fim da página)
  if (an.riscosAltos.length) c.push(h2('Riscos altos e críticos em aberto'), Pdf.grade(['ID', 'Risco', 'P×I', 'Resposta', 'Plano de ação', 'Responsável'],
    an.riscosAltos.map((r) => [r.id, r.descricao, `${r.nivel} (${r.rotulo})`, r.resposta, r.planoAcao, r.responsavel]), [22, '*', 50, 48, '*', 70]));
  else c.push(caixa('Nenhum risco alto ou crítico em aberto.', 'ok'));

  // projeto de produto/serviço (NeDIP): seções escolhidas no cartão "Projeto de produto nos relatórios"
  const simpRel = Nucleo.simplificado(p);
  const secNedip = ((p.config && p.config.nedipRelatorio) || []).filter((s) => NedipRel.secoesDe(p).some(([k]) => k === s) && NedipRel.disponivel(p, s).ok);
  if (p.produto && p.produto.etapas && p.produto.etapas.informacional && secNedip.length) {
    c.push(...h1(simpRel ? 'Funções e especificações' : `Projeto de ${p.produto.tipo === 'serviço' ? 'serviço' : 'produto'} (fases NeDIP)`));
    c.push(...Pdf.blocoNedip(p, secNedip, { h: h2, num, figId: 'nd_rel_funcoes', tocFig: 'fig' }));
    const conc = p.produto.etapas.conceitual.concepcoes.find((x) => x.selecionada);
    if (conc && !simpRel) c.push({ text: [{ text: 'Concepção selecionada: ', bold: true }, conc.nome], style: 'corpo', margin: [0, 0, 0, 6] });
    if (!simpRel) c.push({ text: 'Referência: ' + NEDIP_REF, style: 'muted', margin: [0, 0, 0, 8] });
  }

  // análise QFD (seções escolhidas no projeto informacional ou na aba Relatórios)
  const secQfd = (p.config && p.config.qfdRelatorio) || [];
  let numSecQfd = null;
  if (p.qfdDados && secQfd.length) {
    c.push(...h1('Projeto informacional – análise QFD'));
    numSecQfd = sec;
    c.push(...Pdf.blocoQfd(p.qfdDados, secQfd, { h: h2, origem: Pdf.qfdOrigem(p) }));
  }

  // 6
  c.push(...h1('Qualidade, DfX e lições aprendidas'));
  if (p.qualidade.length) {
    const o = p.qfdOrigem || {};
    c.push(h2('Requisitos de qualidade (especificações de projeto)'));
    if (o.importadoEm) c.push({ text: `Origem: QFD – ${o.arquivo} (atualizado em ${Nucleo.dataBR(o.importadoEm.slice(0, 10))}), requisitos na ordem de importância.`, style: 'muted', margin: [0, 0, 0, 4] });
    c.push(Pdf.grade(['Requisito', 'Critério de aceite', 'Forma de avaliação', 'Medido', 'Situação'], p.qualidade.map((q) => [
      { stack: [q.requisito, ...(q.aspectosIndesejaveis ? [{ text: 'Aspectos indesejáveis: ' + q.aspectosIndesejaveis, style: 'muted' }] : [])], fontSize: 8.8 },
      q.criterioAceite, q.metodoVerificacao, q.valorMedido || '—',
      { text: q.status, bold: q.status === 'não conforme', color: q.status === 'não conforme' ? '#c0392b' : (q.status === 'conforme' ? COR.teal : COR.texto) }]), ['*', 70, '*', 50, 55]));
    p.qualidade.filter((q) => q.status === 'não conforme').forEach((q) => c.push(caixa([{ text: 'Não conformidade: ' + q.requisito, bold: true },
      `Planejar: ${q.pdca.planejar}`, `Executar: ${q.pdca.executar}`, `Verificar: ${q.pdca.verificar}`, `Agir: ${q.pdca.agir}`])));
  } else c.push({ text: 'Nenhum requisito de qualidade cadastrado.', style: 'muted' });
  const dfxI = (p.dfx && p.dfx.itens) || [];
  if (dfxI.some((i) => i.decisao)) {
    const condRot = (DFX_CONDICOES.find(([v]) => v === p.dfx.condicaoTeste) || [, 'não informada'])[1];
    c.push(h2('Design for X (DfX) — Pahl & Beitz'), { text: `Condição de teste atual: ${condRot} · TRL do sistema: ${an.trl.sistema ?? 'não avaliado'}`, style: 'muted', margin: [0, 0, 0, 4] });
    c.push(Pdf.grade(['Diretriz', 'Decisão', 'Recomendações aplicadas', 'Justificativa'],
      dfxI.filter((i) => i.decisao).map((i) => [i.nome, { text: i.decisao === 'usar' ? 'Usar' : 'Negligenciar', bold: true, color: i.decisao === 'usar' ? COR.teal : '#777777' },
        i.decisao === 'usar' ? { ul: i.recomendacoes.filter((r) => r.marcado).map((r) => r.texto), fontSize: 8 } : '—', i.justificativa]), [110, 55, '*', 120]));
    const pend = dfxI.filter((i) => !i.decisao);
    if (pend.length) c.push({ text: 'Diretrizes ainda não decididas: ' + pend.map((i) => i.nome).join('; ') + '.', style: 'muted', margin: [0, 0, 0, 6] });
    c.push({ text: 'Referência: PAHL, G.; BEITZ, W.; FELDHUSEN, J.; GROTE, K.-H. Engineering Design: A Systematic Approach. 3. ed. London: Springer, 2007.', style: 'muted', margin: [0, 0, 0, 8] });
  }
  const licoes = p.licoesAprendidas.filter((l) => String((l.descricao || '') + (l.recomendacao || '')).trim()); // linhas vazias não vão ao relatório
  if (licoes.length) {
    const numMacro = (uid) => { const i = p.macroentregas.findIndex((m) => m.uid === uid); return i >= 0 ? String(i + 1) : '—'; };
    c.push(h2('Lições aprendidas'), Pdf.grade(['Data', 'Macro', 'Lição', 'Recomendação'], licoes.map((l) => [Nucleo.dataBR(l.data), numMacro(l.macroUid), l.descricao, l.recomendacao]), [52, 32, '*', '*']));
  }

  // 7
  c.push(...h1('Desenvolvimento por macroentrega'));
  c.push({ text: 'Introdução', style: 'h3' }, ...Pdf.texto(pj.introducao, num), { text: 'Objetivo geral', style: 'h3' }, ...Pdf.texto(pj.objetivoGeral, num));
  const toc = { fig: 'fig', tab: 'tab' };
  p.macroentregas.forEach((m, i) => {
    c.push(h2(`Macroentrega ${i + 1}${m.titulo ? ' – ' + m.titulo : ''}`));
    c.push(...Pdf.texto(m.descricao, num), ...Pdf.anexosSecao(m, 'introducao', num, imgs, toc));
    const obj = (m.objetivosEtapa || []).filter((o) => String(o).trim());
    if (obj.length) c.push({ text: 'Objetivos da etapa', style: 'h3' }, { ul: obj, style: 'corpo', margin: [0, 0, 0, 6] }, ...Pdf.anexosSecao(m, 'objetivos', num, imgs, toc));
    const res = Pdf.anexosSecao(m, 'resultados', num, imgs, toc);
    const blc = Pdf.blocos(p, m, num, imgs, { recuo: 0, base: null, toc, qfdSecao: numSecQfd });
    if (String(m.resultados || '').trim() || res.length || blc.length) c.push({ text: 'Resultados', style: 'h3' }, ...Pdf.texto(m.resultados, num), ...res, ...blc);
    const con = Pdf.anexosSecao(m, 'conclusao', num, imgs, toc);
    if (String(m.conclusao || '').trim() || con.length) c.push({ text: 'Conclusão', style: 'h3' }, ...Pdf.texto(m.conclusao, num), ...con);
    const fut = Pdf.anexosSecao(m, 'etapasFuturas', num, imgs, toc);
    if (String(m.etapasFuturas || '').trim() || fut.length) c.push({ text: 'Etapas futuras', style: 'h3' }, ...Pdf.texto(m.etapasFuturas, num), ...fut);
  });

  const refsG = Pdf.referenciasCitadas(p, num);
  if (refsG.length) c.push(...h1('Referências'), ...refsG);

  c.push(...await Pdf.apendices(p, armazem, { tocId: 'sum' })); // apêndices depois das referências

  // 8
  { const t = h1('Equipe'); t[0].pageBreak = 'before'; c.push(...t); }
  c.push(Pdf.grade(['Nome', 'Função', 'E-mail'], [
    [pj.coordenador.nome, 'Coordenador', pj.coordenador.email], [pj.coordenadorAdjunto.nome, 'Coordenador adjunto', pj.coordenadorAdjunto.email],
    ...pj.equipe.map((e) => [e.nome, e.funcao, e.email])]));

  c.push({ text: ' ', pageBreak: 'before' }, ...contracapa());

  return {
    pageSize: 'A4', pageMargins: [25 * MM, 30 * MM, 20 * MM, 25 * MM],
    info: { title: 'Relatório de andamento – ' + pj.nome, author: pj.coordenador.nome || '', creator: 'Gestão de Projetos (navegador)' },
    defaultStyle: { font: 'Roboto', fontSize: 10, color: COR.texto },
    styles: estilos,
    content: c,
    header: (pg, total, tam) => (pg === 1 || pg === total) ? null : {
      margin: [25 * MM, 10 * MM, 14 * MM, 0],
      stack: [{ columns: [{ text: [{ text: 'RELATÓRIO DE ANDAMENTO', bold: true }, ' – ' + pj.nome], fontSize: 8, color: COR.escuro, margin: [0, 10, 0, 0] }, { image: T().logo, width: 62, alignment: 'right' }] },
        { canvas: [{ type: 'line', x1: 0, y1: 2, x2: ((tam && tam.width) || A4.w) - 39 * MM, y2: 2, lineWidth: 1.2, lineColor: COR.lima }] }],
    },
    footer: (pg, total) => (pg === 1 || pg === total) ? null : {
      columns: [{ text: `${u.sigla} ${pj.codigo} – emitido em ${new Date().toLocaleString('pt-BR').slice(0, 17)}`, fontSize: 7.5, bold: true, color: COR.escuro }, { text: String(pg), fontSize: 7.5, bold: true, color: COR.escuro, alignment: 'right', width: 40 }],
      margin: [25 * MM, 25, 20 * MM, 0],
    },
  };
};

Pdf.graficoTrl = function (areas) {
  areas = areas.filter((a) => a.trlAtual !== null || a.trlEsperado);
  if (!areas.length) return null;
  const w = 900, lin = 34, h = 40 + areas.length * lin + 30, x0 = 240, esc = (w - x0 - 30) / 9;
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#fff"/>`;
  for (let k = 1; k <= 9; k++) { const xx = x0 + k * esc; s += `<line x1="${xx}" y1="20" x2="${xx}" y2="${h - 30}" stroke="#e3e8e8"/><text x="${xx - 4}" y="14" font-size="11" fill="#555">${k}</text>`; }
  areas.forEach((a, i) => {
    const y = 26 + i * lin;
    s += `<text x="6" y="${y + 17}" font-size="12" fill="#1d2b2b">${e(String(a.nome || '').slice(0, 30))}</text>`;
    if (a.trlEsperado) s += `<rect x="${x0}" y="${y + 2}" width="${(a.trlEsperado * esc).toFixed(1)}" height="11" fill="#cfe8df"/>`;
    if (a.trlAtual !== null) s += `<rect x="${x0}" y="${y + 14}" width="${(a.trlAtual * esc).toFixed(1)}" height="11" fill="${a.gap > 0 ? '#c0392b' : COR.teal}"/>`;
  });
  const ly = h - 10;
  s += `<rect x="${x0}" y="${ly - 10}" width="14" height="10" fill="#cfe8df"/><text x="${x0 + 18}" y="${ly}" font-size="11">TRL esperado</text>`;
  s += `<rect x="${x0 + 130}" y="${ly - 10}" width="14" height="10" fill="${COR.teal}"/><text x="${x0 + 148}" y="${ly}" font-size="11">TRL atual</text>`;
  s += `<rect x="${x0 + 240}" y="${ly - 10}" width="14" height="10" fill="#c0392b"/><text x="${x0 + 258}" y="${ly}" font-size="11">abaixo do esperado</text></svg>`;
  return s;
};

Pdf.matrizRiscos = function (riscos) {
  const cont = {};
  riscos.filter((r) => (r.status || 'aberto') !== 'fechado').forEach((r) => (cont[`${+r.probabilidade}-${+r.impacto}`] ??= []).push(r.id));
  const cores = { verde: '#9ed89e', amarelo: '#f6e27a', laranja: '#f5a55a', vermelho: '#e5645a' };
  const body = [];
  for (let p = 5; p >= 1; p--) {
    const lin = [{ text: String(p), bold: true, alignment: 'center', margin: [0, 8, 0, 0] }];
    for (let i = 1; i <= 5; i++) {
      const r = Nucleo.risco(p, i), ids = cont[`${p}-${i}`] || [];
      lin.push({ text: ids.length ? ids.join(', ') : String(r.nivel), bold: !!ids.length, color: ids.length ? '#000' : '#666', fillColor: cores[r.classe], alignment: 'center', margin: [0, 8, 0, 8], fontSize: 8.5 });
    }
    body.push(lin);
  }
  body.push(['', ...[1, 2, 3, 4, 5].map((i) => ({ text: String(i), bold: true, alignment: 'center' }))]);
  return { stack: [
    { columns: [{ text: 'Probabilidade', fontSize: 8.5, bold: true, width: 80, alignment: 'right', margin: [0, 92, 8, 0] },
      { table: { widths: [18, 58, 58, 58, 58, 58], body }, layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#fff', vLineColor: () => '#fff' }, width: 'auto' }] },
    { text: 'Impacto', fontSize: 8.5, bold: true, alignment: 'center', margin: [0, 2, 0, 2] },
    { text: 'Nível = P × I · verde ≤ 4 · amarelo 5–9 · laranja 10–14 · vermelho ≥ 15 (riscos fechados não aparecem)', style: 'muted', alignment: 'center', margin: [0, 0, 0, 8] },
  ], unbreakable: true };
};

// ------------------------------------------------------------------ PROJETO DE PRODUTO/SERVIÇO (NeDIP)
/** Documento com capa do template, cabeçalho e rodapé. */
Pdf.documento = function (p, linha1, linha2, rotulo, content, extra) {
  const pj = p.projeto, u = CONFIG.unidade;
  return {
    pageSize: 'A4', pageMargins: [25 * MM, 30 * MM, 20 * MM, 25 * MM],
    info: { title: `${rotulo} – ${pj.nome}`, author: pj.coordenador.nome || '', creator: 'Gestão de Projetos (navegador)' },
    defaultStyle: { font: 'Roboto', fontSize: 10, color: COR.texto }, styles: estilos,
    content: [...capa(p, linha1, linha2, extra), { text: ' ' }, ...content, { text: ' ', pageBreak: 'before' }, ...contracapa()],
    header: (pg, total, tam) => (pg === 1 || pg === total) ? null : {
      margin: [25 * MM, 10 * MM, 14 * MM, 0],
      stack: [{ columns: [{ text: [{ text: rotulo.toUpperCase(), bold: true }, ' – ' + pj.nome], fontSize: 8, color: COR.escuro, margin: [0, 10, 0, 0] }, { image: T().logo, width: 62, alignment: 'right' }] },
        { canvas: [{ type: 'line', x1: 0, y1: 2, x2: ((tam && tam.width) || A4.w) - 39 * MM, y2: 2, lineWidth: 1.2, lineColor: COR.lima }] }],
    },
    footer: (pg, total) => (pg === 1 || pg === total) ? null : {
      columns: [{ text: `${u.sigla} ${pj.codigo} – emitido em ${new Date().toLocaleString('pt-BR').slice(0, 17)}`, fontSize: 7.5, bold: true, color: COR.escuro }, { text: String(pg), fontSize: 7.5, bold: true, color: COR.escuro, alignment: 'right', width: 40 }],
      margin: [25 * MM, 25, 20 * MM, 0],
    },
  };
};
const secoesNumeradas = () => {
  let s = 0, ss = 0;
  return {
    h1: (t, quebra) => { s++; ss = 0; return [{ text: `${s} ${t.toUpperCase()}`, style: 'h1', tocItem: 'sum', tocStyle: { bold: true, fontSize: 10 }, tocMargin: [0, 4, 0, 0], margin: [0, 14, 0, 2], pageBreak: quebra ? 'before' : undefined },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 470, y2: 0, lineWidth: 2, lineColor: COR.lima }], margin: [0, 0, 0, 8] }]; },
    h2: (t) => { ss++; return { text: `${s}.${ss} ${t}`, style: 'h2', tocItem: 'sum', tocStyle: { fontSize: 9.5 }, tocMargin: [14, 2, 0, 0] }; },
  };
};
const recsAplicadas = (p, et) => { const e = p.produto.etapas[et.id]; return et.recomendacoes.filter(([id]) => e.recomendacoes[id]).map(([, t]) => t); };

Pdf.manualProjeto = async function (p, armazem, op = {}) {
  const pj = p.projeto, pr = p.produto, E = pr.etapas, an = Nucleo.analisar(p);
  const num = Nucleo.numerarAbnt(p.macroentregas, undefined, { p, gerar: false }); // manuais: só as figuras de arquivo (os gráficos gerados não entram)
  const imgs = op.apendice ? {} : await Pdf.carregarFiguras(p, armazem);
  const { h1, h2 } = op.secoes || secoesNumeradas();
  const nomeMacro = (u) => { const i = p.macroentregas.findIndex((m) => m.uid === u); return i >= 0 ? `${i + 1} – ${p.macroentregas[i].titulo}` : ''; };
  const txt = (rot, v) => (String(v || '').trim() ? [h2(rot), ...Pdf.texto(v, num)] : []);
  const c = [];
  if (!op.apendice) c.push({ toc: { id: 'sum', title: { text: 'Sumário', style: 'h1', margin: [0, 0, 0, 12] } }, pageBreak: 'before' });
  c.push(...h1('Identificação', true));
  c.push(Pdf.kpi([['Projeto', pj.nome], ['Código', pj.codigo], ['Tipo', pr.tipo === 'serviço' ? 'Serviço' : 'Produto'], ['Empresa parceira', pj.empresaParceira],
    ['Coordenação', `${pj.coordenador.nome || ''} ${pj.coordenador.email ? '<' + pj.coordenador.email + '>' : ''}`],
    ['Vigência', `${Nucleo.dataBR(an.vigencia.inicio)} a ${Nucleo.dataBR(an.vigencia.fimVigente)}`],
    ['TRL atual do sistema', an.trl.sistema === null ? 'não avaliado' : 'TRL ' + an.trl.sistema], ['Objetivo geral', pj.objetivoGeral || '—']]));
  c.push(Pdf.grade(['Macrofase', 'Fase', 'Situação', 'Recomendações', 'Macroentrega(s)', 'Saída'], nedipResumo(p).map((r) => [(NEDIP_MACROFASES.find(([m]) => m === r.macro) || [, ''])[1], r.nome, r.status, `${r.feitas} de ${r.total}`, r.macros.join(', ') || '—', r.saida]), [62, 80, 55, 55, 55, '*']));
  c.push({ text: 'Fases conforme o modelo do NeDIP/UFSC. ' + NEDIP_REF, style: 'muted', margin: [0, 0, 0, 6] });

  const especificos = {
    planejamento: (e) => { c.push(...txt('Escopo', e.escopo), ...txt('Premissas e restrições', e.premissas), ...txt('Orçamento e recursos', e.orcamento), ...txt('Plano de comunicação', e.comunicacao));
      c.push(h2('Estrutura do projeto'), Pdf.grade(['Macroentrega', 'Início', 'Prevista', 'Situação'], p.macroentregas.map((m, i) => [`${i + 1} – ${m.titulo}`, Nucleo.dataBR(m.dataInicio), Nucleo.dataBR(m.dataPrevista), m.status]), ['*', 55, 55, 65])); },
    informacional: (e) => {
      c.push(...txt('Ciclo de vida e clientes', e.cicloVida));
      if (e.questionarios.length) c.push(h2('Questionários aplicados'), Pdf.grade(['Público', 'Meio', 'Resp.', 'Data', 'Principais achados'], e.questionarios.map((q) => [q.publico, q.meio, q.respondentes ?? '—', Nucleo.dataBR(q.data), q.observacao]), [90, 70, 35, 50, '*']));
      if (e.consolidacao.length) c.push(h2('Consolidação das respostas'), Pdf.grade(['Necessidade', 'Fase', 'Citações', 'Importância média'], e.consolidacao.map((q) => [q.necessidade, q.fase || '—', q.citacoes ?? '—', q.importancia ?? '—']), ['*', 90, 50, 60]));
      if (e.necessidades.length) c.push(h2('Requisitos de cliente'), Pdf.grade(['Requisito de cliente', 'Peso relativo', 'Origem'], e.necessidades.map((n) => [n.descricao, ((+n.peso || 0) * 100).toFixed(1).replace('.', ',') + ' %', n.origem || '—']), ['*', 70, 80]));
      if (p.qualidade.length) {
        const o = p.qfdOrigem || {};
        c.push(h2('Especificações de projeto'));
        if (o.importadoEm) c.push({ text: `Linhas do QFD: ${o.arquivo} (${Nucleo.dataBR(o.importadoEm.slice(0, 10))}), na ordem de importância; demais linhas cadastradas manualmente.`, style: 'muted', margin: [0, 0, 0, 4] });
        c.push(Pdf.grade(['Requisito de projeto', 'Valor-meta', 'Forma de avaliação', 'Aspectos indesejáveis'], p.qualidade.map((q) => [q.requisito, q.criterioAceite, q.metodoVerificacao, q.aspectosIndesejaveis || '—']), ['*', 70, '*', '*']));
      }
      c.push(...txt('Concorrentes, similares e patentes', e.concorrentes), ...txt('Normas, legislação e restrições', e.normas));
    },
    conceitual: (e) => {
      if (e.funcaoGlobal.nome) c.push(h2('Função global'), Pdf.kpi([['Função global', e.funcaoGlobal.nome], ['Entradas', e.funcaoGlobal.entradas || '—'], ['Saídas', e.funcaoGlobal.saidas || '—']]));
      if (e.funcoes.length) c.push(h2('Estrutura de funções e princípios de solução'), Pdf.grade(['Função parcial', 'Subfunção', 'Princípios considerados', 'Escolhido'],
        e.funcoes.flatMap((f) => (f.subfuncoes.length ? f.subfuncoes : [{ nome: '—', principios: '', escolhido: '' }]).map((sf, k) => [k ? '' : { text: f.nome, bold: true }, sf.nome, nedipPrincipios(sf).join('; ') || '—', { text: sf.escolhido || '—', bold: !!sf.escolhido }])), [90, 90, '*', 90]));
      const nomeF = {}; e.funcoes.forEach((f) => { nomeF[f.id] = f.nome; f.subfuncoes.forEach((s) => { nomeF[s.id] = s.nome; }); });
      const desd = p.qualidade.map((q) => [q, e.desdobramento[nedipIdEspec(q)]]).filter(([, d]) => d && (d.funcoes.length || d.obs));
      if (desd.length) c.push(h2('Desdobramento das especificações em funções'), Pdf.grade(['Especificação', 'Funções que atendem', 'Como'], desd.map(([q, d]) => [q.requisito, d.funcoes.map((id) => nomeF[id] || id).join('; ') || '—', d.obs || '—']), ['*', '*', '*']));
      if (e.concepcoes.length) c.push(h2('Concepções alternativas'), Pdf.grade(['Concepção', 'Descrição', 'Avaliação', 'Sel.'],
        e.concepcoes.map((x) => [{ text: x.nome, bold: x.selecionada }, x.descricao, x.avaliacao, x.selecionada ? { text: 'sim', bold: true, color: COR.teal } : '']), [80, '*', '*', 25]));
      if (e.decisao.criterios.length && e.concepcoes.length) {
        const pont = nedipPontuacao(e);
        c.push(h2('Matriz de decisão ponderada'), Pdf.grade(['Critério', 'Peso', ...e.concepcoes.map((x) => x.nome)],
          [...e.decisao.criterios.map((k) => [k.nome, String(k.peso), ...e.concepcoes.map((x) => String(k.notas[x.id] ?? '—'))]),
            [{ text: 'Pontuação ponderada', bold: true }, '', ...pont.map((x) => ({ text: x.nota === null ? '—' : x.nota.toFixed(2).replace('.', ','), bold: true }))]],
          ['*', 35, ...e.concepcoes.map(() => 55)]));
        c.push({ text: 'Notas de 1 a 5; pontuação = Σ(peso × nota) ÷ Σ(peso).', style: 'muted', margin: [0, 0, 0, 6] });
      }
    },
    preliminar: (e) => {
      c.push(...txt('Leiaute', e.leiaute));
      if (e.prototipos.length) c.push(h2('Modelos, protótipos e ensaios'), Pdf.grade(['Protótipo', 'Data', 'Descrição e ensaios', 'Resultado'], e.prototipos.map((x) => [x.nome, Nucleo.dataBR(x.data), x.descricao, x.resultado]), [70, 50, '*', '*']));
      if (e.fmea.length) c.push(h2('FMEA'), Pdf.grade(['Item', 'Modo de falha', 'Efeito', 'Causa', 'S', 'O', 'D', 'RPN', 'Ação'],
        e.fmea.map((x) => { const r = nedipRpn(x), crit = r >= NEDIP_FMEA_LIMITE || +x.s >= 9; return [x.item, x.modo, x.efeito, x.causa, String(x.s), String(x.o), String(x.d), { text: String(r), bold: true, color: crit ? '#c0392b' : COR.texto }, x.acao + (x.riscoId ? ` (${x.riscoId})` : '')]; }),
        [55, '*', '*', '*', 14, 14, 14, 24, '*']));
      if (p.qualidade.length) {
        c.push(h2('Análise de qualidade'), Pdf.grade(['Especificação', 'Meta', 'Medido', 'Situação'], p.qualidade.map((q) => [q.requisito, q.criterioAceite, q.valorMedido || '—',
          { text: q.status, bold: q.status === 'não conforme', color: q.status === 'não conforme' ? '#c0392b' : (q.status === 'conforme' ? COR.teal : COR.texto) }]), ['*', 80, 60, 60]));
        p.qualidade.filter((q) => q.status === 'não conforme').forEach((q) => c.push(caixa([{ text: 'Não conformidade: ' + q.requisito, bold: true },
          `Planejar: ${q.pdca.planejar}`, `Executar: ${q.pdca.executar}`, `Verificar: ${q.pdca.verificar}`, `Agir: ${q.pdca.agir}`])));
      }
      const dfxU = ((p.dfx && p.dfx.itens) || []).filter((i) => i.decisao);
      if (dfxU.length) c.push(h2('Design for X (Pahl & Beitz)'), Pdf.grade(['Diretriz', 'Decisão', 'Justificativa'], dfxU.map((i) => [i.nome, i.decisao === 'usar' ? 'Usar' : 'Negligenciar', i.justificativa]), [120, 60, '*']));
      c.push(...txt('Viabilidade técnica e econômica', e.viabilidade));
    },
    detalhado: (e) => {
      if (e.bom.length) c.push(h2(pr.tipo === 'serviço' ? 'Lista de materiais e recursos' : 'Lista de materiais'), Pdf.grade(['Item', 'Descrição', 'Qtd.', 'Material / especificação', 'Origem', 'Fornecedor'],
        e.bom.map((x) => [x.item, x.descricao, `${x.quantidade ?? ''} ${x.unidade || ''}`.trim(), x.material, x.origem, x.fornecedor]), [30, '*', 40, '*', 55, 70]));
      if (e.manuais.usoAnexo || e.manuais.projetoAnexo) c.push(h2('Manuais próprios'), { ul: [e.manuais.projetoAnexo && 'Manual de projeto: ' + e.manuais.projetoAnexo, e.manuais.usoAnexo && 'Manual de uso: ' + e.manuais.usoAnexo].filter(Boolean), style: 'corpo' });
    },
    producao: (e) => { c.push(...txt('Processos, recursos e controle de qualidade', e.processos), ...txt('Fornecedores homologados', e.fornecedores), ...txt('Lote piloto', e.lotePiloto));
      if (e.liberacao) c.push({ text: [{ text: 'Liberação da produção: ', bold: true }, Nucleo.dataBR(e.liberacao)], style: 'corpo' }); },
    lancamento: (e) => {
      if (e.ferramentas.economia !== false && window.Economia && Economia.temDados(e.economia)) {
        c.push(h2('Análise econômica e de mercado'));
        Economia.pdf(Economia.normalizar(e.economia), { h: (t) => c.push({ text: t, style: 'h3' }), add: (n) => c.push(n), tab: (cab, l, larg) => c.push(Pdf.grade(cab, l, larg.map((x) => x.w || x.min))) });
      }
      c.push(...txt('Plano de lançamento', e.plano), ...txt('Canais', e.canais), ...txt('Treinamentos', e.treinamento), ...txt('Registros e certificações', e.certificacoes));
      if (e.data) c.push({ text: [{ text: 'Lançamento: ', bold: true }, Nucleo.dataBR(e.data)], style: 'corpo' }); },
    validacao: (e) => {
      if (e.questionarios.length) c.push(h2('Questionários de satisfação'), Pdf.grade(['Público', 'Meio', 'Resp.', 'Data', 'Principais achados'], e.questionarios.map((q) => [q.publico, q.meio, q.respondentes ?? '—', Nucleo.dataBR(q.data), q.observacao]), [90, 70, 35, 50, '*']));
      c.push(...txt('Satisfação dos clientes', e.satisfacao), ...txt('Desempenho em campo', e.campo), ...txt('Melhorias e próxima versão', e.melhorias), ...txt('Encerramento', e.encerramento));
    },
  };
  nedipEtapasAtivas(p).forEach((et) => {
    const e = E[et.id];
    c.push(...h1(et.nome, true));
    c.push({ text: [{ text: 'Objetivo: ', bold: true }, et.objetivo, ' ', { text: 'Situação: ', bold: true }, e.status + '. ',
      ...(e.macros.length ? [{ text: 'Macroentrega(s): ', bold: true }, e.macros.map(nomeMacro).filter(Boolean).join('; ') + '. '] : []),
      ...(e.app && e.app.nome ? [{ text: 'Aplicativo da fase: ', bold: true }, e.app.nome + (e.app.url ? ` (${e.app.url})` : '') + '.'] : [])], style: 'corpo', margin: [0, 0, 0, 6] });
    const r = et.recomendacoes.filter(([id]) => e.recomendacoes[id]).map(([, t]) => t);
    c.push(h2('Recomendações aplicadas'), r.length ? { ul: r, style: 'corpo', margin: [0, 0, 0, 6] } : { text: 'Nenhuma recomendação marcada.', style: 'muted' });
    especificos[et.id](e);
    c.push(...txt('Registro da fase', e.registro));
    if (e.anexos.length) c.push(h2('Documentos da fase'), Pdf.grade(['Arquivo', 'Descrição', 'Data'], e.anexos.map((a) => [a.arquivo, a.descricao || '—', Nucleo.dataBR(a.data)]), ['*', '*', 55]));
  });

  c.push(...h1('Maturidade tecnológica (TRL)', true));
  const linhas = [];
  const rec = (nos, nv) => nos.forEach((n) => { linhas.push([{ text: n.titulo, margin: [nv * 10, 0, 0, 0] }, App.nomeTipo ? (App.nomeTipo[n.tipo] || n.tipo) : n.tipo, trlTxt(n.trlInformado)]); rec(n.filhos || [], nv + 1); });
  rec(p.trl.arvore, 0);
  c.push(linhas.length ? Pdf.grade(['Item', 'Tipo', 'TRL'], linhas, ['*', 80, 50]) : { text: 'Árvore TRL vazia.', style: 'muted' });
  c.push({ text: `TRL do sistema: ${an.trl.sistema ?? 'não avaliado'} · esperado ao final: ${an.trl.esperadoFinal ?? '—'}. ${TRL_FONTE}.`, style: 'muted' });

  const figs = p.macroentregas.flatMap((m) => (m.figuras || []).map((f) => ({ f, n: num.fig[f.id] }))).filter((x) => x.n).sort((a, b) => a.n - b.n);
  const tabs = p.macroentregas.flatMap((m) => (m.tabelas || []).map((t) => ({ t, n: num.tab[t.id] }))).filter((x) => x.n).sort((a, b) => a.n - b.n);
  if ((figs.length || tabs.length) && !op.apendice) { // no apêndice as figuras já estão no corpo do relatório
    c.push(...h1('Figuras e tabelas do projeto', true));
    figs.forEach((x) => c.push(Pdf.figura(x.f, x.n, imgs)));
    tabs.forEach((x) => c.push(Pdf.tabela(x.t, x.n)));
  }
  c.push(...h1('Referências'), { ul: [NEDIP_REF, PAHL_REF], style: 'corpo', margin: [0, 0, 0, 6] }, ...Pdf.referenciasCitadas(p, num));
  if (op.apendice) return c;
  return Pdf.documento(p, 'MANUAL DE', 'PROJETO', 'Manual de projeto', c, `Documentação técnica · modelo NeDIP · ${new Date().toLocaleDateString('pt-BR')}`);
};

// ------------------------------------------------------------------ APÊNDICES (última macroentrega e relatório geral)
/** Há conteúdo para o manual de projeto? (alguma fase iniciada, com recomendação ou registro) */
const temManualProjeto = (p) => nedipEtapasAtivas(p).some((et) => { const e = p.produto.etapas[et.id]; return e.status !== 'não iniciada' || Object.values(e.recomendacoes).some(Boolean) || String(e.registro || '').trim(); });
/**
 * Documentos individuais como apêndices: manual de projeto, manual de uso, questionário, análise QFD, busca de
 * anterioridade e lista de documentos do projeto — cada um só quando houver informação. ctx.tocId: sumário do documento.
 */
Pdf.apendices = async function (p, armazem, ctx = {}) {
  const out = [], letras = 'ABCDEFGHIJ';
  let k = 0;
  const titulo = (t) => {
    const no = { text: `APÊNDICE ${letras[k++]} – ${t.toUpperCase()}`, style: 'h1', pageBreak: 'before', margin: [0, 0, 0, 2] };
    if (ctx.tocId) Object.assign(no, { tocItem: ctx.tocId, tocStyle: { bold: true, fontSize: 10 }, tocMargin: [0, 4, 0, 0] });
    return [no, { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 470, y2: 0, lineWidth: 2, lineColor: COR.lima }], margin: [0, 0, 0, 8] }];
  };
  const sec = { h1: (t) => [{ text: t, style: 'h2' }], h2: (t) => ({ text: t, style: 'h3' }) }, h = (t) => ({ text: t, style: 'h2' });
  if (!Nucleo.simplificado(p) && temManualProjeto(p)) out.push(...titulo('Manual de projeto'), ...await Pdf.manualProjeto(p, armazem, { apendice: true, secoes: sec }));
  if (Object.values(p.produto.etapas.detalhado.manualUso).some((x) => String(x || '').trim())) out.push(...titulo('Manual de uso'), ...await Pdf.manualUso(p, { apendice: true, secoes: sec }));
  const f = p.produto.etapas.informacional.formulario;
  if (f.perguntas.length) out.push(...titulo('Questionário aos clientes'), ...Pdf.blocoQuestionario(p, ['identificacao', 'destaques', 'roteiro', 'resultados', 'consolidacao'], { h }));
  if (p.qfdDados) out.push(...titulo('Análise QFD – casa da qualidade'), ...Pdf.blocoQfd(p.qfdDados, Qfd.SECOES.map(([s]) => s), { h, origem: Pdf.qfdOrigem(p) }));
  if (p.pesquisa && (p.pesquisa.patentes.length || String(p.pesquisa.estrategia.palavras || '').trim())) out.push(...titulo('Busca de anterioridade'), ...Pdf.blocoPesquisa(p, ['estrategia', 'patentes', 'sintese'], { h }));
  const quebravel = (t) => String(t || '').replace(/([/_.-])/g, '$1​'); // caminhos longos quebram nas barras e sublinhados
  const docs = NEDIP_ETAPAS.flatMap((et) => p.produto.etapas[et.id].anexos.map((a) => [et.nome, quebravel(a.nome), a.descricao || '—', quebravel(a.arquivo)]));
  if (p.qfdOrigem && p.qfdOrigem.guardadoEm) docs.push(['Projeto informacional', quebravel(p.qfdOrigem.arquivo || 'backup do QFD'), 'Backup completo do sistema QFD', quebravel(p.qfdOrigem.guardadoEm)]);
  if (docs.length) out.push(...titulo('Documentos do projeto'), { text: 'Arquivos guardados junto do projeto (vão no ZIP exportado), por fase.', style: 'muted', margin: [0, 0, 0, 4] },
    Pdf.grade(['Fase', 'Documento', 'Descrição', 'Arquivo no ZIP'], docs, [70, '*', '*', '*']));
  return out;
};

Pdf.questionarioConsolidado = function (p) {
  const pj = p.projeto, e = p.produto.etapas.informacional, c = [];
  const { h1 } = secoesNumeradas();
  c.push(...h1('Questionários aplicados', true));
  c.push(e.questionarios.length ? Pdf.grade(['Público', 'Meio', 'Respondentes', 'Data', 'Principais achados'], e.questionarios.map((q) => [q.publico, q.meio, q.respondentes ?? '—', Nucleo.dataBR(q.data), q.observacao]), [90, 70, 50, 50, '*'])
    : { text: 'Nenhum questionário registrado.', style: 'muted' });
  const total = e.questionarios.reduce((s, q) => s + (+q.respondentes || 0), 0);
  if (total) c.push({ text: `Total de respondentes: ${total}.`, style: 'corpo', margin: [0, 0, 0, 6] });
  const cons = e.consolidacao.filter((x) => String(x.necessidade).trim());
  c.push(...h1('Respostas consolidadas'));
  if (cons.length) {
    const nec = nedipNecessidadesDaConsolidacao(cons);
    const maxP = Math.max(...nec.map((n) => n.peso)) || 1;
    const porNome = Object.fromEntries(cons.map((x) => [x.necessidade.trim(), x]));
    c.push(Pdf.grade(['Necessidade', 'Fase', 'Citações', 'Importância (1–5)', 'Peso relativo', ''], nec.map((n) => {
      const x = porNome[n.descricao] || {};
      return [n.descricao, x.fase || '—', x.citacoes ?? '—', x.importancia ?? '—', (n.peso * 100).toFixed(1).replace('.', ',') + ' %',
        { canvas: [{ type: 'rect', x: 0, y: 2, w: Math.max(2, 70 * n.peso / maxP), h: 7, color: COR.teal }] }];
    }), ['*', 70, 40, 50, 45, 75]));
    c.push({ text: 'Peso relativo = (importância média × citações) ÷ soma de todas as necessidades. É uma hierarquização simples; a comparação aos pares no QFD é uma alternativa mais rigorosa.', style: 'muted', margin: [0, 0, 0, 8] });
  } else c.push({ text: 'Nenhuma resposta consolidada.', style: 'muted' });
  if (e.necessidades.length) c.push(...h1('Requisitos de cliente adotados'), Pdf.grade(['Requisito de cliente', 'Peso', 'Origem'], e.necessidades.map((n) => [n.descricao, ((+n.peso || 0) * 100).toFixed(1).replace('.', ',') + ' %', n.origem || '—']), ['*', 60, 90]));
  c.push(...h1('Roteiro utilizado (modelo)'));
  NEDIP_QUESTIONARIO.forEach(([fase, perg]) => c.push({ text: fase, style: 'h3' }, { ul: perg.slice(), style: 'corpo', margin: [0, 0, 0, 4] }));
  c.push({ text: NEDIP_REF, style: 'muted', margin: [0, 8, 0, 0] });
  return Pdf.documento(p, 'QUESTIONÁRIO', 'CONSOLIDADO', 'Questionário – respostas consolidadas', c, `Projeto informacional · ${pj.nome}`);
};

Pdf.manualUso = async function (p, op = {}) {
  const pj = p.projeto, e = p.produto.etapas.detalhado, mu = e.manualUso;
  const { h1 } = op.secoes || secoesNumeradas();
  const c = op.apendice ? [] : [{ toc: { id: 'sum', title: { text: 'Sumário', style: 'h1', margin: [0, 0, 0, 12] } }, pageBreak: 'before' }];
  const num = Nucleo.numerarAbnt(p.macroentregas, undefined, { p, gerar: false }); // manuais: só as figuras de arquivo
  let primeira = true;
  NEDIP_MANUAL_USO.forEach(([k, rot]) => {
    if (!String(mu[k] || '').trim()) return;
    c.push(...h1(rot, primeira), ...Pdf.texto(mu[k], num)); primeira = false;
    if (k === 'descricao' && p.qualidade.length) {
      c.push(...h1('Especificações técnicas'), Pdf.grade(['Característica', 'Especificação', 'Valor verificado'], p.qualidade.map((q) => [q.requisito.replace(/^RP\d+\.\s*/, ''), q.criterioAceite, q.valorMedido || '—']), ['*', 90, 80]));
    }
  });
  if (primeira) c.push(...h1('Conteúdo', true), { text: 'O conteúdo do manual de uso ainda não foi preenchido (projeto detalhado).', style: 'muted' });
  c.push(...h1('Contato'), { text: `${pj.coordenador.nome || ''}${pj.coordenador.email ? ' – ' + pj.coordenador.email : ''}${pj.empresaParceira ? '\n' + pj.empresaParceira : ''}`, style: 'corpo' });
  if (op.apendice) return c;
  return Pdf.documento(p, 'MANUAL DE', 'USO', 'Manual de uso', c, `${p.produto.tipo === 'serviço' ? 'Serviço' : 'Produto'}: ${pj.nome}`);
};

Pdf.roteiroQuestionario = function (p) {
  const form = p.produto.etapas.informacional.formulario;
  if (form && form.perguntas && form.perguntas.length && Pdf.roteiroFormulario) return Pdf.roteiroFormulario(p); // perguntas do questionário do projeto
  const pj = p.projeto, c = [];
  c.push({ text: 'Roteiro de questionário – necessidades dos clientes', style: 'h1', pageBreak: 'before' });
  c.push({ text: `Projeto: ${pj.nome}. Modelo para o projeto informacional: adapte as perguntas ao produto/serviço, aplique a cada grupo de clientes do ciclo de vida e registre data, meio e número de respondentes no sistema.`, style: 'corpo', margin: [0, 0, 0, 8] });
  c.push(Pdf.kpi([['Respondente (perfil)', ' '], ['Fase do ciclo de vida', ' '], ['Data / meio', ' ']]));
  NEDIP_QUESTIONARIO.forEach(([fase, perguntas]) => {
    c.push({ text: fase, style: 'h2', margin: [0, 8, 0, 4] });
    perguntas.forEach((q) => c.push({ text: q, style: 'corpo', margin: [0, 2, 0, 2] }, { canvas: [0, 1, 2].map((i) => ({ type: 'line', x1: 0, y1: 14 + i * 16, x2: 470, y2: 14 + i * 16, lineWidth: 0.4, lineColor: COR.grade })), margin: [0, 0, 0, 6] }));
  });
  c.push({ text: 'Importância dos atributos (1 = sem importância … 5 = essencial)', style: 'h2', margin: [0, 10, 0, 4] });
  c.push(Pdf.grade(['Atributo (preencha)', '1', '2', '3', '4', '5'], Array.from({ length: 8 }, () => [' ', '( )', '( )', '( )', '( )', '( )']), ['*', 22, 22, 22, 22, 22]));
  c.push({ text: 'Base: levantamento de necessidades por fase do ciclo de vida no projeto informacional. ' + NEDIP_REF, style: 'muted', margin: [0, 8, 0, 0] });
  const d = Pdf.documento(p, 'ROTEIRO DE', 'QUESTIONÁRIO', 'Roteiro de questionário', c, 'Projeto informacional');
  return d;
};

/** Gera o PDF e devolve um Blob. */
Pdf.gerar = function (doc) {
  return new Promise((ok, falha) => {
    try {
      if (Array.isArray(doc.content)) Pdf.ajustarQuebras(doc.content);
      const gerador = pdfMake.createPdf(doc, null, Pdf.fontes());
      gerador.getBlob((b) => ok(b));
    } catch (e) { falha(e); }
  });
};
