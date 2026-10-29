/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Projeto de produto (NeDIP) nos relatórios: seções escolhidas por macroentrega (bloco "Projeto do produto")
 * e para o relatório geral, como no relatório do QFD. A estrutura de funções do projeto conceitual vira um
 * diagrama (função global como caixa-preta + funções parciais e subfunções) desenhado automaticamente.
 */
'use strict';

const NedipRel = {};
window.NedipRel = NedipRel;
NedipRel.SECOES = [
  ['fases', 'Situação das fases (NeDIP)', 'planejamento'],
  ['planejamento', 'Escopo, premissas e plano', 'planejamento'],
  ['ciclo', 'Ciclo de vida e clientes', 'informacional'],
  ['necessidades', 'Necessidades e requisitos de cliente', 'informacional'],
  ['concorrentes', 'Concorrentes e similares', 'informacional'],
  ['normas', 'Normas, legislação e restrições', 'informacional'],
  ['funcoes', 'Função global e estrutura de funções', 'conceitual'],
  ['desdobramento', 'Desdobramento das especificações em funções', 'conceitual'],
  ['concepcoes', 'Concepções e matriz de decisão', 'conceitual'],
  ['preliminar', 'Leiaute, protótipos e FMEA', 'preliminar'],
  ['detalhado', 'Lista de materiais', 'detalhado'],
  ['documentacao', 'Desenhos, planos, protótipo final e proteção intelectual', 'detalhado'],
  ['producao', 'Preparação da produção', 'producao'],
  ['economia', 'Análise econômica e de mercado', 'lancamento'],
  ['lancamentoPlano', 'Plano de lançamento, canais e certificações', 'lancamento'],
  ['validacao', 'Validação em uso e encerramento', 'validacao'],
];
/** Textos das fases em passos (passos.js) que entram nos relatórios: seção → [fase, campo, rótulo, tipo?]. */
NedipRel.CAMPOS = {
  documentacao: [['detalhado', 'desenhos', 'Desenhos e documentos de fabricação'], ['detalhado', 'planos', 'Planos de fabricação, montagem e controle de qualidade'],
    ['detalhado', 'protoFinal', 'Ensaio do protótipo final'], ['detalhado', 'pi', 'Proteção intelectual']],
  producao: [['producao', 'processos', 'Processos, recursos e leiaute de fabricação'], ['producao', 'fornecedores', 'Fornecedores e itens comprados'],
    ['producao', 'instrucoes', 'Instruções de trabalho e plano de controle'], ['producao', 'lotePiloto', 'Lote piloto'],
    ['producao', 'assistencia', 'Assistência técnica e peças de reposição'], ['producao', 'liberacao', 'Data de liberação da produção', 'data'],
    ['producao', 'liberacaoAceite', 'Aceite da liberação']],
  lancamentoPlano: [['lancamento', 'plano', 'Plano de lançamento e comunicação'], ['lancamento', 'data', 'Data de lançamento', 'data'],
    ['lancamento', 'canais', 'Canais de venda, distribuição e assistência'], ['lancamento', 'treinamento', 'Treinamento'],
    ['lancamento', 'certificacoes', 'Registros, certificações e homologações'], ['lancamento', 'documentacao', 'Documentação ao cliente']],
  validacao: [['validacao', 'satisfacao', 'Satisfação dos clientes'], ['validacao', 'campo', 'Desempenho em campo, falhas e reclamações'],
    ['validacao', 'especUso', 'Especificações confirmadas em uso'], ['validacao', 'melhorias', 'Melhorias e próxima versão'],
    ['validacao', 'encerramento', 'Encerramento do projeto']],
};
const ndCampos = (p, s) => (NedipRel.CAMPOS[s] || []).map(([f, k, r, t]) => [r, String(((p.produto.etapas[f] || {})[k]) ?? '').trim(), t]).filter(([, v]) => v);
/** Seções que o projeto usa: na versão simplificada, só funções e desdobramento (o resto fica oculto e fora dos PDFs). */
NedipRel.SO_SIMPLIFICADA = ['funcoes', 'desdobramento'];
NedipRel.secoesDe = (p) => (Nucleo.simplificado(p) ? NedipRel.SECOES.filter(([s]) => NedipRel.SO_SIMPLIFICADA.includes(s)) : NedipRel.SECOES);
NedipRel.nome = (s) => (NedipRel.SECOES.find(([k]) => k === s) || [, s])[1];
NedipRel.etapa = (s) => (NedipRel.SECOES.find(([k]) => k === s) || [, , 'informacional'])[2];

const ndTxt = (x) => String(x ?? '').trim();
window.nedipTemFuncoes = (p) => { const c = p.produto && p.produto.etapas.conceitual; return !!(c && (ndTxt(c.funcaoGlobal.nome) || c.funcoes.length)); };

/** A seção tem dados? Se não, diz o que falta e em que fase preencher. */
NedipRel.disponivel = function (p, s) {
  const E = p.produto.etapas, I = E.informacional, C = E.conceitual, P = E.preliminar;
  const ok = (cond, motivo) => (cond ? { ok: true } : { ok: false, motivo, etapa: NedipRel.etapa(s) });
  switch (s) {
    case 'fases': return { ok: true };
    case 'planejamento': return ok([E.planejamento.escopo, E.planejamento.premissas, E.planejamento.orcamento, E.planejamento.comunicacao].some(ndTxt), 'escopo e plano não preenchidos');
    case 'ciclo': return ok(ndTxt(I.cicloVida), 'ciclo de vida não preenchido');
    case 'necessidades': return ok(I.necessidades.length || I.consolidacao.length, 'sem necessidades ou requisitos de cliente');
    case 'concorrentes': return ok(I.concorrentesLista.length || ndTxt(I.concorrentes), 'sem concorrentes');
    case 'normas': return ok(I.normasLista.length || ndTxt(I.normas), 'sem normas');
    case 'funcoes': return ok(nedipTemFuncoes(p), 'função global e funções não cadastradas');
    case 'desdobramento': return ok(Object.values(C.desdobramento).some((d) => d.funcoes.length || d.obs), 'desdobramento não preenchido');
    case 'concepcoes': return ok(C.concepcoes.length, 'sem concepções');
    case 'preliminar': return ok(ndTxt(P.leiaute) || P.prototipos.length || P.fmea.length, 'leiaute, protótipos e FMEA vazios');
    case 'detalhado': return ok(E.detalhado.bom.length, 'lista de materiais vazia');
    case 'documentacao': case 'producao': case 'lancamentoPlano': return ok(ndCampos(p, s).length, 'textos da fase não preenchidos');
    case 'validacao': return ok(ndCampos(p, s).length || (E.validacao.questionarios || []).length, 'validação não preenchida');
    case 'economia': return ok(window.Economia && E.lancamento.ferramentas.economia !== false && Economia.temDados(E.lancamento.economia), 'análise econômica sem preço e volumes');
    default: return { ok: true };
  }
};

// ================================================================== diagrama da estrutura de funções (SVG)
const ndXml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Quebra o texto em linhas de até n caracteres. */
const ndLinhas = (t, n) => {
  const out = [];
  let lin = '';
  ndTxt(t).split(/\s+/).filter(Boolean).forEach((w) => { if ((lin + ' ' + w).trim().length > n && lin) { out.push(lin); lin = w; } else lin = (lin + ' ' + w).trim(); });
  if (lin) out.push(lin);
  return out.length ? out : [''];
};
/** "A (Material), B (Energia), C (Sinal)" → ["A (Material)", "B (Energia)", "C (Sinal)"]. */
const ndItens = (t) => ndTxt(t).split(/\n|;|,(?![^(]*\))/).map((x) => x.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);

NedipRel.diagramaFuncoes = function (p) {
  const c = p.produto.etapas.conceitual, fg = c.funcaoGlobal;
  const W = 760, F = 'font-family="Roboto"';
  let s = '', y = 10;
  const caixa = (x, yy, w, linhas, op = {}) => {
    const lh = (op.fs || 14) + 4, h = Math.max(op.hMin || 0, linhas.length * lh + 14);
    s += `<rect x="${x}" y="${yy}" width="${w}" height="${h}" rx="4" fill="${op.fill || '#ffffff'}" stroke="${op.stroke || '#085357'}" stroke-width="1.3"/>`;
    linhas.forEach((l, k) => { s += `<text x="${x + w / 2}" y="${yy + 7 + (k + 1) * lh - 3 + (h - linhas.length * lh - 14) / 2}" font-size="${op.fs || 14}" ${op.bold ? 'font-weight="bold"' : ''} fill="${op.cor || '#1d2b2b'}" text-anchor="middle" ${F}>${ndXml(l)}</text>`; });
    return h;
  };
  const seta = (x1, y1, x2, y2, cor = '#085357') => {
    const a = Math.atan2(y2 - y1, x2 - x1), t = 7;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cor}" stroke-width="1.4"/>`;
    s += `<polygon points="${x2},${y2} ${(x2 - t * Math.cos(a - 0.45)).toFixed(1)},${(y2 - t * Math.sin(a - 0.45)).toFixed(1)} ${(x2 - t * Math.cos(a + 0.45)).toFixed(1)},${(y2 - t * Math.sin(a + 0.45)).toFixed(1)}" fill="${cor}"/>`;
  };
  // caixa-preta: entradas → função global → saídas
  const ent = ndItens(fg.entradas), sai = ndItens(fg.saidas);
  const bx = 265, bw = 230, nomeL = ndLinhas(fg.nome || p.projeto.nome || 'Função global', 22);
  const alturaLado = (l) => l.reduce((a, t) => a + ndLinhas(t, 26).length * 17 + 14, 0);
  const bh = Math.max(100, nomeL.length * 21 + 48, alturaLado(ent), alturaLado(sai));
  s += `<text x="${W / 2}" y="${y + 16}" font-size="17" font-weight="bold" fill="#085357" text-anchor="middle" ${F}>Função global (caixa-preta)</text>`;
  y += 30;
  s += `<rect x="${bx}" y="${y}" width="${bw}" height="${bh}" rx="5" fill="#085357"/>`;
  s += `<text x="${bx + bw / 2}" y="${y + bh / 2 - (nomeL.length * 21) / 2 + 2}" font-size="14" font-weight="bold" fill="#a8e156" text-anchor="middle" ${F}>FUNÇÃO GLOBAL</text>`;
  nomeL.forEach((l, k) => { s += `<text x="${bx + bw / 2}" y="${y + bh / 2 - (nomeL.length * 21) / 2 + 25 + k * 21}" font-size="17" fill="#ffffff" text-anchor="middle" ${F}>${ndXml(l)}</text>`; });
  const lado = (l, xTexto, anc, xa1, xa2) => {
    let yy = y + (bh - alturaLado(l)) / 2;
    l.forEach((t) => {
      const ls = ndLinhas(t, 26);
      ls.forEach((x, k) => { s += `<text x="${xTexto}" y="${yy + 14 + k * 17}" font-size="14" fill="#1d2b2b" text-anchor="${anc}" ${F}>${ndXml(x)}</text>`; });
      const ym = yy + ls.length * 17 + 3;
      seta(xa1, ym, xa2, ym, '#409580');
      yy += ls.length * 17 + 14;
    });
  };
  if (ent.length) lado(ent, 0, 'start', 0, bx - 4);
  if (sai.length) lado(sai, W, 'end', bx + bw + 4, W);
  y += bh + 30;
  // estrutura de funções: uma coluna por função parcial, subfunções abaixo
  const fs = c.funcoes.filter((f) => ndTxt(f.nome) || f.subfuncoes.length);
  if (fs.length) {
    s += `<text x="${W / 2}" y="${y + 16}" font-size="17" font-weight="bold" fill="#085357" text-anchor="middle" ${F}>Funções parciais e subfunções</text>`;
    y += 30;
    const porLinha = Math.min(fs.length, 4), gap = 10, cw = (W - gap * (porLinha - 1)) / porLinha;
    const chars = Math.max(12, Math.floor((cw - 24) / 7.6));
    for (let r = 0; r < fs.length; r += porLinha) {
      const grupo = fs.slice(r, r + porLinha);
      const hCab = Math.max(...grupo.map((f, k) => ndLinhas(`${r + k + 1}. ${f.nome || 'Função'}`, chars - 2).length)) * 18 + 14;
      let fundo = y;
      grupo.forEach((f, k) => {
        const x = k * (cw + gap);
        caixa(x, y, cw, ndLinhas(`${r + k + 1}. ${f.nome || 'Função'}`, chars - 2), { fill: '#409580', stroke: '#085357', cor: '#ffffff', bold: true, hMin: hCab });
        let yy = y + hCab + 14;
        f.subfuncoes.forEach((sf) => {
          const ls = ndLinhas(sf.nome || 'Subfunção', chars);
          if (sf.escolhido) ls.push(...ndLinhas('› ' + sf.escolhido, chars).map((l) => l));
          s += `<line x1="${x + 12}" y1="${yy - 14}" x2="${x + 12}" y2="${yy + 10}" stroke="#9fd0c3" stroke-width="1.2"/>`;
          const h = caixa(x + 20, yy, cw - 20, ls, { fill: '#eef7f4', stroke: '#9fd0c3', fs: 13 });
          s += `<line x1="${x + 12}" y1="${yy + 10}" x2="${x + 20}" y2="${yy + 10}" stroke="#9fd0c3" stroke-width="1.2"/>`;
          yy += h + 8;
        });
        fundo = Math.max(fundo, yy);
      });
      y = fundo + 14;
    }
    if (fs.some((f) => f.subfuncoes.some((sf) => sf.escolhido))) { s += `<text x="0" y="${y + 8}" font-size="13" fill="#666" ${F}>› princípio de solução escolhido</text>`; y += 16; }
  }
  const H = Math.ceil(y + 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${s}</svg>`;
};

// ================================================================== PDF
/**
 * Conteúdo das seções escolhidas do projeto de produto.
 * ctx: { h(titulo) → nó, recuo, num (numeração ABNT), figId (id da figura do diagrama), tocFig }
 */
Pdf.blocoNedip = function (p, secoes, ctx) {
  ctx = Object.assign({ h: (t) => ({ text: t, style: 'h3' }), recuo: 0 }, ctx, Pdf.ctxLargura(ctx.recuo || 0));
  const E = p.produto.etapas, I = E.informacional, C = E.conceitual, PR = E.preliminar, num = ctx.num || { fig: {}, tab: {} };
  const itens = [], add = (no, larga = false) => itens.push({ no, larga }), cola = (no) => itens.push({ no, cola: true });
  const tab = (cab, linhas, larg, op) => Pdf.tabelaAdaptavel(cab, linhas, larg, ctx, op).forEach((x) => itens.push(x));
  const texto = (t) => Pdf.texto(t, num).forEach((n) => add(n));
  const campos = (sec) => ndCampos(p, sec).forEach(([r, v, t]) => { cola({ text: r, bold: true, margin: [0, 4, 0, 2] }); if (t === 'data') add({ text: Nucleo.dataBR(v) || v, style: 'corpo' }); else texto(v); });
  const S = {
    fases() {
      tab(['Fase', 'Situação', 'Recomendações aplicadas', 'Macroentrega(s)', 'Saída esperada'], nedipResumo(p).map((r) => [r.nome,
        { text: r.status, bold: true, color: r.status === 'concluída' ? COR.teal : r.status === 'em andamento' ? '#b7791f' : COR.suave },
        `${r.feitas} de ${r.total}`, r.macros.join(', ') || '—', r.saida]), [{ min: 90, w: '*' }, { min: 60 }, { min: 60 }, { min: 55 }, { min: 110, w: '*' }]);
    },
    planejamento() {
      const e = E.planejamento;
      [['Escopo', e.escopo], ['Premissas e restrições', e.premissas], ['Orçamento e recursos', e.orcamento], ['Plano de comunicação', e.comunicacao]]
        .forEach(([r, t]) => { if (ndTxt(t)) { cola({ text: r, bold: true, margin: [0, 4, 0, 2] }); texto(t); } });
    },
    ciclo() { texto(I.cicloVida); },
    necessidades() {
      if (I.necessidades.length) tab(['Requisito de cliente', 'Peso relativo', 'Origem'], I.necessidades.map((n) => [n.descricao, { text: ((+n.peso || 0) * 100).toFixed(1).replace('.', ',') + ' %', alignment: 'center' }, n.origem || '—']), [{ min: 200, w: '*' }, { min: 60 }, { min: 80 }]);
      else tab(['Necessidade', 'Fase', 'Citações', 'Importância'], I.consolidacao.map((x) => [x.necessidade, x.fase || '—', String(x.citacoes ?? '—'), String(x.importancia ?? '—')]), [{ min: 200, w: '*' }, { min: 70 }, { min: 45 }, { min: 55 }]);
    },
    concorrentes() {
      if (I.concorrentesLista.length) tab(['Empresa / produto', 'País', 'Tipo', 'Características', 'Observação'], I.concorrentesLista.map((x) => [{ text: x.empresa, bold: true }, x.pais, x.tipo, x.caracteristicas, x.observacao]),
        [{ min: 80 }, { min: 45 }, { min: 55 }, { min: 130, w: '*' }, { min: 90, w: '*' }]);
      if (ndTxt(I.concorrentes)) texto(I.concorrentes);
    },
    normas() {
      if (I.normasLista.length) tab(['Norma / legislação', 'Título', 'Aplicação no projeto'], I.normasLista.map((x) => [{ text: x.norma, bold: true }, x.titulo, x.aplicacao]), [{ min: 75 }, { min: 130, w: '*' }, { min: 130, w: '*' }]);
      if (ndTxt(I.normas)) texto(I.normas);
    },
    funcoes() {
      const n = (ctx.figId && num.fig[ctx.figId]) || null;
      const leg = { text: `${n ? 'Figura ' + n : 'Figura'} – Função global e estrutura de funções`, style: 'legenda' };
      if (ctx.tocFig && n) { leg.tocItem = ctx.tocFig; leg.tocStyle = { fontSize: 9.5 }; }
      add({ stack: [leg, { svg: NedipRel.diagramaFuncoes(p), width: Math.min(ctx.retrato, 460), alignment: 'center' },
        { text: fonteAbnt(`Elaborado pelos autores com base no projeto conceitual (${new Date().getFullYear()})`), style: 'fonte' }], unbreakable: true, margin: [0, 6, 0, 10] });
      const lin = C.funcoes.flatMap((f, i) => (f.subfuncoes.length ? f.subfuncoes : [{ nome: '—', principios: '', escolhido: '' }]).map((sf, k) => [
        k ? '' : { text: `${i + 1}. ${f.nome}`, bold: true }, sf.nome, nedipPrincipios(sf).join('; ') || '—', { text: sf.escolhido || '—', bold: !!sf.escolhido }]));
      if (lin.length) tab(['Função parcial', 'Subfunção', 'Princípios de solução considerados', 'Escolhido'], lin, [{ min: 90 }, { min: 110, w: '*' }, { min: 110, w: '*' }, { min: 80 }]);
    },
    desdobramento() {
      const nomeF = {};
      C.funcoes.forEach((f) => { nomeF[f.id] = f.nome; f.subfuncoes.forEach((x) => { nomeF[x.id] = x.nome; }); });
      const l = p.qualidade.map((q) => [q, C.desdobramento[nedipIdEspec(q)]]).filter(([, d]) => d && (d.funcoes.length || d.obs));
      tab(['Especificação', 'Funções que atendem', 'Como'], l.map(([q, d]) => [q.requisito, d.funcoes.map((id) => nomeF[id] || id).join('; ') || '—', d.obs || '—']), [{ min: 120, w: '*' }, { min: 120, w: '*' }, { min: 120, w: '*' }]);
    },
    concepcoes() {
      tab(['Concepção', 'Descrição', 'Avaliação', 'Sel.'], C.concepcoes.map((x) => [{ text: x.nome, bold: x.selecionada }, x.descricao, x.avaliacao, x.selecionada ? { text: 'sim', bold: true, color: COR.teal } : '']),
        [{ min: 70 }, { min: 130, w: '*' }, { min: 120, w: '*' }, { min: 26 }]);
      if (C.decisao.criterios.length && C.concepcoes.length) {
        const pont = nedipPontuacao(C);
        cola({ text: 'Matriz de decisão ponderada', bold: true, margin: [0, 4, 0, 2] });
        tab(['Critério', 'Peso', ...C.concepcoes.map((x) => x.nome)], [...C.decisao.criterios.map((k) => [k.nome, String(k.peso), ...C.concepcoes.map((x) => ({ text: String(k.notas[x.id] ?? '—'), alignment: 'center' }))]),
          [{ text: 'Pontuação ponderada', bold: true }, '', ...pont.map((x) => ({ text: x.nota === null ? '—' : x.nota.toFixed(2).replace('.', ','), bold: true, alignment: 'center' }))]],
        [{ min: 150, w: '*' }, { min: 32 }, ...C.concepcoes.map(() => ({ min: 52 }))]);
      }
    },
    preliminar() {
      if (ndTxt(PR.leiaute)) { cola({ text: 'Leiaute', bold: true, margin: [0, 4, 0, 2] }); texto(PR.leiaute); }
      if (PR.prototipos.length) tab(['Protótipo', 'Data', 'Descrição e ensaios', 'Resultado'], PR.prototipos.map((x) => [x.nome, Nucleo.dataBR(x.data), x.descricao, x.resultado]), [{ min: 70 }, { min: 50 }, { min: 120, w: '*' }, { min: 120, w: '*' }]);
      if (PR.fmea.length) tab(['Item', 'Modo de falha', 'Efeito', 'Causa', 'S', 'O', 'D', 'RPN', 'Ação'], PR.fmea.map((x) => { const r = nedipRpn(x); return [x.item, x.modo, x.efeito, x.causa, String(x.s), String(x.o), String(x.d), { text: String(r), bold: true, color: r >= NEDIP_FMEA_LIMITE || +x.s >= 9 ? '#c0392b' : COR.texto }, x.acao]; }),
        [{ min: 60 }, { min: 75, w: '*' }, { min: 70, w: '*' }, { min: 70, w: '*' }, { min: 14 }, { min: 14 }, { min: 14 }, { min: 26 }, { min: 80, w: '*' }]);
    },
    detalhado() {
      tab(['Item', 'Descrição', 'Qtd.', 'Material / especificação', 'Origem', 'Fornecedor'], E.detalhado.bom.map((x) => [x.item, x.descricao, `${x.quantidade ?? ''} ${x.unidade || ''}`.trim(), x.material, x.origem, x.fornecedor]),
        [{ min: 30 }, { min: 110, w: '*' }, { min: 40 }, { min: 100, w: '*' }, { min: 55 }, { min: 70 }]);
    },
    documentacao() { campos('documentacao'); },
    producao() { campos('producao'); },
    lancamentoPlano() { campos('lancamentoPlano'); },
    validacao() {
      const q = (E.validacao.questionarios || []).filter((x) => ndTxt(x.publico) || ndTxt(x.observacao));
      if (q.length) {
        cola({ text: 'Questionários de satisfação', bold: true, margin: [0, 4, 0, 2] });
        tab(['Público', 'Meio', 'Resp.', 'Data', 'Principais achados'], q.map((x) => [x.publico, x.meio, String(x.respondentes ?? '—'), Nucleo.dataBR(x.data) || '—', x.observacao]),
          [{ min: 80 }, { min: 55 }, { min: 30 }, { min: 50 }, { min: 150, w: '*' }]);
      }
      campos('validacao');
    },
    economia() {
      Economia.pdf(Economia.normalizar(E.lancamento.economia), { h: (t) => cola({ text: t, bold: true, color: COR.escuro, margin: [0, 6, 0, 2] }), add: (n) => add(n), tab: (cab, l, larg, op) => tab(cab, l, larg, op) });
    },
  };
  NedipRel.secoesDe(p).filter(([s]) => secoes.includes(s)).forEach(([s, nome]) => {
    const d = NedipRel.disponivel(p, s);
    if (!d.ok) return; // seção sem dados não entra no relatório (a tela avisa e leva à fase)
    cola(ctx.h(nome));
    S[s]();
  });
  return Pdf.montarOrientacao(itens);
};

// ================================================================== tela: integração nas macroentregas
App.nedipBlocoDaMacro = (m) => (m.blocos || []).find((b) => b.tipo === 'nedip');
App.nedipIntegracaoHtml = function () {
  const p = App.p, ms = p.macroentregas, rel = p.config.nedipRelatorio || [];
  const cab = ms.map((m, i) => `<th class="centro" title="${esc(m.titulo)}">Macro ${i + 1}<br><button class="btn pequeno" data-acao="nedip-int-todas" data-macro="${esc(m.uid)}">todas</button></th>`).join('');
  const simp = Nucleo.simplificado(p);
  const linhas = NedipRel.secoesDe(p).map(([s, nome]) => {
    const d = NedipRel.disponivel(p, s);
    const chk = (uid, marcado) => `<td class="centro"><input type="checkbox" data-acao="nedip-int" data-sec="${s}" data-macro="${esc(uid)}" ${marcado ? 'checked' : ''}></td>`;
    return `<tr class="${d.ok ? '' : 'indisp'}"><td><b>${esc(nome)}</b>${d.ok ? '' : `<br><span class="gap-neg">${esc(d.motivo)}</span>${simp ? ' <span class="muted">(preencha acima)</span>' : ` <button class="btn pequeno" data-acao="ir-etapa" data-etapa="${d.etapa}">preencher em ${esc(NEDIP_ETAPAS.find((x) => x.id === d.etapa).curto)}</button>`}`}</td>
      ${ms.map((m) => { const b = App.nedipBlocoDaMacro(m); return chk(m.uid, b && b.secoes.includes(s)); }).join('')}${chk('__rel', rel.includes(s))}</tr>`;
  }).join('');
  return cartao(simp ? 'Especificações e funções nos relatórios' : 'Projeto de produto nos relatórios', `<p class="muted" style="margin-top:0">Marque o que ${simp ? 'das funções' : 'do projeto de produto'} entra em cada macroentrega (vira o bloco “${simp ? 'Especificações e funções' : 'Projeto do produto'}” no desenvolvimento, que pode ser movido ou editado lá) e no relatório geral.
    A estrutura de funções sai como figura (diagrama desenhado pelo sistema) e tabela. Seções sem dados não entram no PDF.</p>
  <div class="rolagem"><table class="tab-edit qfd-int"><thead><tr><th>Informação</th>${cab}<th class="centro">Relatório geral<br><button class="btn pequeno" data-acao="nedip-int-todas" data-macro="__rel">todas</button></th></tr></thead><tbody>${linhas}</tbody></table></div>
  ${nedipTemFuncoes(p) ? `<details class="form-det"><summary>Prévia do diagrama de funções</summary><div class="nd-previa">${NedipRel.diagramaFuncoes(p)}</div></details>` : ''}`);
};
App.nedipAlternar = function (uid, sec, ligar) {
  const ordem = NedipRel.SECOES.map(([s]) => s);
  if (uid === '__rel') {
    const l = new Set(App.p.config.nedipRelatorio || []);
    if (ligar) l.add(sec); else l.delete(sec);
    App.p.config.nedipRelatorio = ordem.filter((s) => l.has(s));
    return;
  }
  const m = App.p.macroentregas.find((x) => x.uid === uid);
  if (!m) return;
  let b = App.nedipBlocoDaMacro(m);
  if (!b && ligar) { b = Object.assign(Nucleo.novoBloco('nedip'), { secoes: [] }, Nucleo.simplificado(App.p) ? { titulo: 'Especificações e funções' } : {}); m.blocos.push(b); }
  if (!b) return;
  const l = new Set(b.secoes);
  if (ligar) l.add(sec); else l.delete(sec);
  b.secoes = ordem.filter((s) => l.has(s));
  if (!b.secoes.length) m.blocos.splice(m.blocos.indexOf(b), 1);
};
App.acoes['nedip-int'] = (el) => { App.nedipAlternar(el.dataset.macro, el.dataset.sec, el.checked); App.marcarSujo(true); App.render(); };
App.acoes['nedip-int-todas'] = (el) => {
  const uid = el.dataset.macro, disp = NedipRel.secoesDe(App.p).map(([s]) => s).filter((s) => NedipRel.disponivel(App.p, s).ok);
  const m = App.p.macroentregas.find((x) => x.uid === uid);
  const atuais = uid === '__rel' ? (App.p.config.nedipRelatorio || []) : ((m && App.nedipBlocoDaMacro(m)) || { secoes: [] }).secoes;
  const ligar = !disp.every((s) => atuais.includes(s));
  disp.forEach((s) => App.nedipAlternar(uid, s, ligar));
  App.marcarSujo(true); App.render();
};

// concorrentes e normas em tabela (projeto informacional)
App.novos.concorrente = () => ({ empresa: '', pais: '', tipo: '', caracteristicas: '', observacao: '' });
App.novos.norma = () => ({ norma: '', titulo: '', aplicacao: '' });
App.nedipContextoHtml = function (e, b) {
  const c = App.campo, a = window.Qfd ? Qfd.analisar(App.p.qfdDados) : null;
  return cartao('Ciclo de vida, concorrentes e normas', `<div class="grade-campos">${c(b + '.cicloVida', 'Ciclo de vida e clientes de cada fase', { tipo: 'textarea', classe: 'largo', linhas: 3 })}</div>
  <h4>Concorrentes e similares</h4>
  ${App.tabela(b + '.concorrentesLista', [{ campo: 'empresa', rotulo: 'Empresa / produto', largura: '16%' }, { campo: 'pais', rotulo: 'País', largura: '10%' }, { campo: 'tipo', rotulo: 'Tipo', largura: '12%' },
    { campo: 'caracteristicas', rotulo: 'Características', tipo: 'textarea' }, { campo: 'observacao', rotulo: 'Observação', tipo: 'textarea' }], { novo: 'concorrente', botao: 'Adicionar concorrente', vazio: 'Nenhum concorrente na tabela.' })}
  ${a && a.conc.length ? `<div class="barra" style="margin-top:0"><button class="btn pequeno" data-acao="nedip-conc-qfd">Trazer os concorrentes do QFD (${a.conc.map((x) => esc(x.nome)).join(', ')})</button></div>` : ''}
  <div class="grade-campos">${c(b + '.concorrentes', 'Texto livre sobre concorrentes, similares e patentes (opcional)', { tipo: 'textarea', classe: 'largo', linhas: 3 })}</div>
  <h4>Normas, legislação e restrições</h4>
  ${App.tabela(b + '.normasLista', [{ campo: 'norma', rotulo: 'Norma / legislação', largura: '18%' }, { campo: 'titulo', rotulo: 'Título' }, { campo: 'aplicacao', rotulo: 'Aplicação no projeto', tipo: 'textarea' }],
    { novo: 'norma', botao: 'Adicionar norma', vazio: 'Nenhuma norma na tabela.' })}
  <div class="grade-campos">${c(b + '.normas', 'Texto livre sobre normas e restrições (opcional)', { tipo: 'textarea', classe: 'largo', linhas: 3 })}</div>`);
};
App.acoes['nedip-conc-qfd'] = () => {
  const e = App.p.produto.etapas.informacional, a = Qfd.analisar(App.p.qfdDados), tem = new Set(e.concorrentesLista.map((x) => ndTxt(x.empresa).toLowerCase()));
  let n = 0;
  a.conc.forEach((x) => { if (!tem.has(x.nome.toLowerCase())) { e.concorrentesLista.push(Object.assign(App.novos.concorrente(), { empresa: x.nome, observacao: 'Concorrente da avaliação competitiva do QFD' })); n++; } });
  App.marcarSujo(true); App.render();
  App.toast(n ? `${n} concorrente(s) incluído(s). Complete país, tipo e características.` : 'Os concorrentes do QFD já estão na tabela.', n ? 'ok' : 'aviso');
};
