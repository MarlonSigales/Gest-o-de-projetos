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

/** Texto simples → nós pdfmake: parágrafos, listas ("- "), **negrito** e {{fig:id}}/{{tab:id}}. */
Pdf.texto = function (txt, num, estilo = 'corpo') {
  txt = String(txt || '').replace(/\r/g, '').trim();
  if (!txt) return [];
  const inline = (s) => {
    s = s.replace(/\{\{(fig|tab):([A-Za-z0-9_-]+)\}\}/g, (_, t, id) => {
      const n = t === 'fig' ? num.fig[id] : num.tab[id];
      return n ? (t === 'fig' ? 'Figura ' : 'Tabela ') + n : (t === 'fig' ? '[figura não encontrada]' : '[tabela não encontrada]');
    });
    return s.split(/(\*\*.+?\*\*)/g).filter(Boolean).map((pt) => (pt.startsWith('**') && pt.endsWith('**')) ? { text: pt.slice(2, -2), bold: true } : pt);
  };
  return txt.split(/\n\s*\n/).map((bloco) => {
    const linhas = bloco.split('\n');
    if (linhas.every((l) => /^\s*[-•*]\s+/.test(l))) return { ul: linhas.map((l) => ({ text: inline(l.replace(/^\s*[-•*]\s+/, '')) })), style: estilo, margin: [0, 0, 0, 6] };
    const partesTxt = [];
    linhas.forEach((l, i) => { partesTxt.push(...inline(l)); if (i < linhas.length - 1) partesTxt.push('\n'); });
    return { text: partesTxt, style: estilo, alignment: 'justify', margin: [0, 0, 0, 6] };
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

Pdf.anexosSecao = function (m, secao, num, imgs, tocIds = {}) {
  const itens = [];
  (m.figuras || []).forEach((f) => { if ((f.secao || 'resultados') === secao) itens.push([0, num.fig[f.id], Pdf.figura(f, num.fig[f.id], imgs, tocIds.fig)]); });
  (m.tabelas || []).forEach((t) => { if ((t.secao || 'resultados') === secao) itens.push([1, num.tab[t.id], Pdf.tabela(t, num.tab[t.id], tocIds.tab)]); });
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
      body: [cabecalho.map((c) => ({ text: c, style: 'th', fillColor: COR.teal })), ...linhas.map((l, i) => l.map((c) => {
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

function capa(p, linha1, linha2, extra) {
  const pj = p.projeto, u = CONFIG.unidade;
  return [
    { image: T().fundoCapa, width: 330, absolutePosition: { x: 0, y: 0 } },
    { image: T().logo, width: 120, absolutePosition: { x: 12 * MM, y: 10 * MM } },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 14 * MM, h: 14 * MM, color: COR.teal }], absolutePosition: { x: 18 * MM, y: 98 * MM } },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 10 * MM, h: 10 * MM, color: COR.lima }], absolutePosition: { x: 30 * MM, y: 110 * MM } },
    { text: linha1, fontSize: 26, color: COR.escuro, absolutePosition: { x: 40 * MM, y: 96 * MM } },
    { text: linha2, fontSize: 26, color: COR.escuro, absolutePosition: { x: 50 * MM, y: 110 * MM } },
    { text: String(pj.ano || ''), fontSize: 20, alignment: 'center', absolutePosition: { x: 0, y: 150 * MM } },
    { text: `${u.sigla} – ${pj.codigo} – ${pj.nome}`, fontSize: 9, color: COR.escuro, alignment: 'center', absolutePosition: { x: 20 * MM, y: 163 * MM }, width: 170 * MM },
    ...(extra ? [{ text: extra, fontSize: 10, alignment: 'center', absolutePosition: { x: 20 * MM, y: 175 * MM }, width: 170 * MM }] : []),
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

const tituloSecao = (img, titulo) => ({
  columns: [{ image: T()[img], width: 36, height: 36 }, { text: titulo.toUpperCase(), style: 'secao', margin: [10, 11, 0, 0] }],
  margin: [0, 16, 0, 6], unbreakable: true,
});
const subitem = (rotulo) => ({ columns: [{ image: T().seta, width: 9, margin: [0, 2, 0, 0] }, { text: rotulo, style: 'subitem', margin: [6, 0, 0, 0] }], margin: [22, 8, 0, 4] });
const corpo = (arr) => ({ stack: arr, margin: [22, 0, 0, 0] });

// ------------------------------------------------------------------ RELATÓRIO DE MACROENTREGA
Pdf.macroentrega = async function (p, mi, armazem) {
  const m = p.macroentregas[mi];
  const an = Nucleo.analisar(p);
  const pj = p.projeto, u = CONFIG.unidade, num = Nucleo.numerarAbnt([m]);
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
        ...(ac.aceito ? [{ text: '☑ Aceite registrado no sistema', bold: true, color: COR.escuro, alignment: 'center', margin: [0, 6, 0, 0] }] : []),
      ], fontSize: 9 }],
    ] },
    layout: { hLineWidth: () => 0.7, vLineWidth: () => 0.7, paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 6, paddingRight: () => 6 },
  });

  // página 3 — apresentação
  c.push({ columns: [{ canvas: [{ type: 'rect', x: 0, y: 0, w: 34, h: 34, color: COR.teal }], width: 44 }, { text: 'MACRO', fontSize: 22, bold: true, color: COR.escuro, margin: [0, 5, 0, 0] }], pageBreak: 'before', margin: [0, 0, 0, 40] });
  c.push({ table: { widths: [170], body: [[{ text: 'ENTREGA ' + n, bold: true, color: '#ffffff', fillColor: COR.teal, margin: [8, 4, 0, 4] }]] }, layout: 'noBorders', margin: [0, 0, 0, 22] });
  c.push({ stack: Pdf.texto(`**A Macro Entrega ${n}${m.titulo ? ' – ' + m.titulo : ''}** – ${m.descricao || ''}`, num), width: 340, margin: [0, 0, 110, 0] });

  // páginas de itens
  c.push(Object.assign(tituloSecao('secFundamentos', 'Fundamentos e direcionamento do projeto'), { pageBreak: 'before', margin: [0, 0, 0, 6] }));
  c.push(subitem('1. Introdução'), corpo([...Pdf.texto(pj.introducao, num), ...Pdf.anexosSecao(m, 'introducao', num, imgs)]));
  c.push(subitem('2. Objetivo Geral do Projeto'), corpo(Pdf.texto(pj.objetivoGeral, num)));
  const obj = (m.objetivosEtapa || []).filter((o) => String(o).trim());
  c.push(subitem(`2.1 Objetivos da Etapa ${n}`), corpo([
    ...(obj.length ? [{ ul: obj.map((o, i) => o + (i < obj.length - 1 ? ';' : '.')), style: 'corpo', margin: [0, 0, 0, 6] }] : []),
    ...Pdf.anexosSecao(m, 'objetivos', num, imgs)]));
  c.push(tituloSecao('secResultados', 'Resultados e conclusões do projeto'));
  c.push(subitem('3. Resultados'), corpo([...Pdf.texto(m.resultados, num), ...Pdf.anexosSecao(m, 'resultados', num, imgs)]));
  c.push(subitem('4. Conclusão'), corpo([...Pdf.texto(m.conclusao, num), ...Pdf.anexosSecao(m, 'conclusao', num, imgs)]));
  c.push(tituloSecao('secProjecoes', 'Projeções e próximos passos'));
  c.push(subitem('5. Etapas Futuras'), corpo([...Pdf.texto(m.etapasFuturas, num), ...Pdf.anexosSecao(m, 'etapasFuturas', num, imgs)]));

  if (p.config && p.config.incluirAndamentoNaMacro) {
    const am = an.macroentregas[mi];
    c.push(tituloSecao('secAndamento', 'Andamento e maturidade tecnológica (TRL)'));
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
      if (pg === 3 || pg === total - 1) return { image: T().logo, width: 80, alignment: 'right', margin: [0, 10 * MM, 14 * MM, 0] };
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
      const total = Pdf._total || 0;
      const itens = [];
      if (pg === 3) itens.push({ image: T().fundoLateral, width: 78 * MM, height: A4.h, opacity: 0.6, absolutePosition: { x: 0, y: 0 } });
      if (pg >= 3) itens.push({ canvas: [{ type: 'rect', x: 0, y: 0, w: 12 * MM, h: 26 * MM, color: COR.escuro }], absolutePosition: { x: A4.w - 12 * MM, y: A4.h - 26 * MM } });
      return itens;
    },
  };
  return doc;
};

Pdf.tabelaAreas = function (areas, esperadoPadrao) {
  return Pdf.grade(['Área', 'Item avaliado', 'TRL atual', 'TRL esperado', 'Responsável(is)'],
    areas.map((a) => [a.nome, a.noTitulo || '—', trlTxt(a.trlAtual), String((esperadoPadrao ?? a.trlEsperado) || '—'), pessoas(a.responsaveis)]),
    [80, 80, 48, 48, '*']);
};

// ------------------------------------------------------------------ RELATÓRIO GERAL DE ANDAMENTO
Pdf.andamento = async function (p, armazem) {
  const pj = p.projeto, u = CONFIG.unidade, an = Nucleo.analisar(p);
  const num = Nucleo.numerarAbnt(p.macroentregas);
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
    ['Vigência', `${Nucleo.dataBR(pj.dataInicio)} a ${Nucleo.dataBR(pj.dataFimPrevista)}`],
    ['Percentual geral', { text: [{ text: an.percentualGeral + '%', bold: true }, ' (média das macroentregas)'], fontSize: 9 }],
    ['TRL atual do sistema', an.trl.sistema === null ? '—' : 'TRL ' + an.trl.sistema],
    ['TRL esperado', `etapa atual: ${an.trl.esperadoEtapa ?? '—'} · final: ${an.trl.esperadoFinal ?? '—'}`],
    ['Próxima entrega', prox ? `Macroentrega ${prox.numero} – ${prox.titulo} (${Nucleo.dataBR(prox.dataPrevista)})` : 'todas concluídas'],
  ]));
  an.alertas.forEach((a) => c.push(caixa(a)));
  if (!an.alertas.length) c.push(caixa('Nenhum alerta de prazo ou dependência.', 'ok'));

  // 2
  c.push(...h1('Quadro das macroentregas'));
  c.push(Pdf.grade(['Nº', 'Título', 'Início', 'Prevista', 'Entrega', 'Situação', '%', 'Aceite'],
    an.macroentregas.map((m) => [String(m.numero), m.titulo, Nucleo.dataBR(m.dataInicio), Nucleo.dataBR(m.dataPrevista), Nucleo.dataBR(m.dataEntrega),
      m.atrasada ? { text: 'atrasada', color: '#c0392b', bold: true } : m.status, String(m.percentual), m.aceito ? 'sim' : 'não']),
    [18, '*', 50, 50, 50, 58, 28, 32]));

  // 3
  c.push(...h1('Cronograma'));
  c.push({ svg: Nucleo.ganttSvg(an, 1000), width: 470 });
  if (an.cpm.caminho.length) c.push({ text: [{ text: 'Caminho crítico', bold: true }, ` (${an.cpm.duracao} dias): ${an.cpm.caminho.join(' → ')}.`], style: 'corpo', margin: [0, 6, 0, 4] });
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
    c.push({ text: 'Itens da estrutura com menor TRL', style: 'h3' }, Pdf.grade(['Item', 'Tipo', 'TRL', 'Área', 'Cobrar'],
      an.trl.nosMaisBaixos.map((nn) => [`${nn.titulo} (${nn.chave})`, nn.tipo, trlTxt(nn.trl), nn.area || '—', pessoas(nn.cobrar)]), ['*', 60, 40, 70, 150]));
    if (an.trl.divergentes.length) c.push({ text: 'Divergências de avaliação', style: 'h3' }, Pdf.grade(['Item', 'TRL informado', 'Menor TRL dos subelementos'], an.trl.divergentes.map((d) => [d.titulo, String(d.informado), String(d.minFilhos)])));
    const linhasArv = [];
    const rec = (nos, nivel) => nos.forEach((nn) => {
      linhasArv.push([{ text: [nn.titulo, { text: '  ' + nn.chave, style: 'muted' }], margin: [nivel * 12, 0, 0, 0] }, Nucleo.NOME_TIPO[nn.tipo] || nn.tipo, trlTxt(nn.trlEfetivo),
        { text: (nn.divergente ? `informado ${nn.trlInformado} ≠ mínimo dos subelementos ${nn.trlMinFilhos}` : '') + (nn.visivel ? '' : ' (oculto)'), style: 'muted' }]);
      rec(nn.filhos, nivel + 1);
    });
    rec(an.trl.arvore, 0);
    c.push({ text: 'Estrutura avaliada', style: 'h3' }, Pdf.grade(['Estrutura', 'Tipo', 'TRL', 'Observação'], linhasArv, ['*', 70, 44, 130]));
  }

  // 5
  c.push(...h1('Riscos'));
  c.push(Pdf.matrizRiscos(an.riscos));
  if (an.riscosAltos.length) c.push(h2('Riscos altos e críticos em aberto'), Pdf.grade(['ID', 'Risco', 'P×I', 'Resposta', 'Plano de ação', 'Responsável'],
    an.riscosAltos.map((r) => [r.id, r.descricao, `${r.nivel} (${r.rotulo})`, r.resposta, r.planoAcao, r.responsavel]), [22, '*', 50, 48, '*', 70]));
  else c.push(caixa('Nenhum risco alto ou crítico em aberto.', 'ok'));

  // 6
  c.push(...h1('Qualidade e lições aprendidas'));
  if (p.qualidade.length) {
    c.push(h2('Requisitos de qualidade'), Pdf.grade(['Requisito', 'Critério de aceite', 'Verificação', 'Situação'], p.qualidade.map((q) => [q.requisito, q.criterioAceite, q.metodoVerificacao, q.status]), ['*', '*', '*', 60]));
    p.qualidade.filter((q) => q.status === 'não conforme').forEach((q) => c.push(caixa([{ text: 'Não conformidade: ' + q.requisito, bold: true },
      `Planejar: ${q.pdca.planejar}`, `Executar: ${q.pdca.executar}`, `Verificar: ${q.pdca.verificar}`, `Agir: ${q.pdca.agir}`])));
  } else c.push({ text: 'Nenhum requisito de qualidade cadastrado.', style: 'muted' });
  if (p.licoesAprendidas.length) {
    const numMacro = (uid) => { const i = p.macroentregas.findIndex((m) => m.uid === uid); return i >= 0 ? String(i + 1) : '—'; };
    c.push(h2('Lições aprendidas'), Pdf.grade(['Data', 'Macro', 'Lição', 'Recomendação'], p.licoesAprendidas.map((l) => [Nucleo.dataBR(l.data), numMacro(l.macroUid), l.descricao, l.recomendacao]), [52, 32, '*', '*']));
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
    if (String(m.resultados || '').trim() || res.length) c.push({ text: 'Resultados', style: 'h3' }, ...Pdf.texto(m.resultados, num), ...res);
    const con = Pdf.anexosSecao(m, 'conclusao', num, imgs, toc);
    if (String(m.conclusao || '').trim() || con.length) c.push({ text: 'Conclusão', style: 'h3' }, ...Pdf.texto(m.conclusao, num), ...con);
    const fut = Pdf.anexosSecao(m, 'etapasFuturas', num, imgs, toc);
    if (String(m.etapasFuturas || '').trim() || fut.length) c.push({ text: 'Etapas futuras', style: 'h3' }, ...Pdf.texto(m.etapasFuturas, num), ...fut);
  });

  // 8
  c.push(...h1('Equipe'));
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
    header: (pg, total) => (pg === 1 || pg === total) ? null : {
      margin: [25 * MM, 10 * MM, 14 * MM, 0],
      stack: [{ columns: [{ text: [{ text: 'RELATÓRIO DE ANDAMENTO', bold: true }, ' – ' + pj.nome], fontSize: 8, color: COR.escuro, margin: [0, 10, 0, 0] }, { image: T().logo, width: 62, alignment: 'right' }] },
        { canvas: [{ type: 'line', x1: 0, y1: 2, x2: A4.w - 39 * MM, y2: 2, lineWidth: 1.2, lineColor: COR.lima }] }],
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
    { columns: [{ text: 'Probabilidade ↑', fontSize: 8.5, bold: true, width: 80, margin: [40, 60, 0, 0] },
      { table: { widths: [18, 58, 58, 58, 58, 58], body }, layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#fff', vLineColor: () => '#fff' }, width: 'auto' }] },
    { text: 'Impacto →', fontSize: 8.5, bold: true, alignment: 'center', margin: [0, 2, 0, 2] },
    { text: 'Nível = P × I · verde ≤ 4 · amarelo 5–9 · laranja 10–14 · vermelho ≥ 15 (riscos fechados não aparecem)', style: 'muted', alignment: 'center', margin: [0, 0, 0, 8] },
  ], unbreakable: true };
};

/** Gera o PDF e devolve um Blob. */
Pdf.gerar = function (doc) {
  return new Promise((ok, falha) => {
    try {
      const gerador = pdfMake.createPdf(doc, null, Pdf.fontes());
      gerador.getBlob((b) => ok(b));
    } catch (e) { falha(e); }
  });
};
