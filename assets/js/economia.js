/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Análise econômica e de mercado — fase de lançamento (implementação) do NeDIP, só na versão completa.
 * Entradas: mercado (TAM/SAM/SOM) e volumes por ano, preço, custo variável unitário (itens), CAPEX (com ano e
 * vida útil) e OPEX anual, além das premissas (TMA, impostos, IR, capital de giro, reajustes, valor residual).
 * Saídas: DRE e fluxo de caixa livre por ano, VPL, TIR, payback simples e descontado, índice de lucratividade,
 * ROI, margem de contribuição, pontos de equilíbrio (operacional, contábil e econômico), custo pleno unitário,
 * preço para a margem-alvo, EVA/MVA (Stewart, 1991), valor adicionado bruto e sensibilidade do VPL.
 * Simplificações (ditas na tela e no PDF): fluxos no fim de cada ano, depreciação linear, IR só sobre lucro
 * positivo (sem compensação de prejuízos), sem financiamento (capital próprio).
 */
'use strict';

const Economia = {};
window.Economia = Economia;

Economia.REF_EVA = 'STEWART, G. B. The Quest for Value: a guide for senior managers. New York: HarperBusiness, 1991.';
Economia.CAT_CV = [['material', 'Material / componente'], ['mao', 'Mão de obra direta'], ['terceiros', 'Serviço de terceiros'], ['logistica', 'Embalagem e logística'], ['energia', 'Energia e insumos de processo'], ['outros', 'Outros']];
Economia.CAT_CAPEX = [['equipamentos', 'Máquinas e equipamentos'], ['ferramental', 'Ferramental e moldes'], ['instalacoes', 'Instalações e obras'], ['pd', 'P&D, certificação e registros'], ['software', 'Software e TI'], ['outros', 'Outros']];
Economia.CAT_OPEX = [['pessoal', 'Pessoal e encargos'], ['ocupacao', 'Aluguel, energia e ocupação'], ['manutencao', 'Manutenção'], ['comercial', 'Marketing e vendas'], ['administrativo', 'Administrativo'], ['assistencia', 'Assistência técnica e garantia'], ['outros', 'Outros']];
Economia.PREMISSAS = [ // [campo, rótulo, obrigatória para o resultado fazer sentido]
  ['tma', 'TMA – taxa mínima de atratividade (% a.a.)', true], ['impostos', 'Impostos sobre a venda (% da receita)', true],
  ['comissao', 'Comissões, royalties e frete (% da receita)', false], ['ir', 'IR + CSLL (% do lucro)', true],
  ['capitalGiro', 'Capital de giro (% da receita do ano)', false], ['residual', 'Valor residual ao final (% do CAPEX)', false],
  ['reajustePreco', 'Reajuste anual do preço (%)', false], ['reajusteCustos', 'Reajuste anual dos custos (%)', false],
  ['margemAlvo', 'Margem de contribuição-alvo (% do preço)', false],
];

const ecNum = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v);
const ecLista = (x) => (Array.isArray(x) ? x.filter((i) => i && typeof i === 'object') : []);

Economia.normalizar = function (e) {
  e = e && typeof e === 'object' ? e : {};
  const N = Math.max(1, Math.min(15, Math.round(ecNum(e.horizonte) || 5)));
  const vol = Array.isArray(e.volumes) ? e.volumes : [];
  const out = {
    moeda: String(e.moeda || 'R$'), unidade: String(e.unidade || 'un'), horizonte: N,
    preco: ecNum(e.preco), volAno1: ecNum(e.volAno1), crescimento: ecNum(e.crescimento),
    volumes: Array.from({ length: N }, (_, i) => ecNum(vol[i])),
    mercado: Object.assign({ tam: null, sam: null, som: null, fonte: '' }, e.mercado || {}),
    custosVariaveis: ecLista(e.custosVariaveis).map((x) => Object.assign({ item: '', categoria: 'material', quantidade: 1, unidade: 'un', custo: null, terceiros: true }, x)),
    capex: ecLista(e.capex).map((x) => { const y = Object.assign({ item: '', categoria: 'equipamentos', valor: null, ano: 0, vida: 5 }, x); y.ano = Math.max(0, Math.min(N, Math.round(+y.ano || 0))); return y; }),
    opex: ecLista(e.opex).map((x) => Object.assign({ item: '', categoria: 'pessoal', valor: null }, x)),
    conclusao: String(e.conclusao || ''),
  };
  Economia.PREMISSAS.forEach(([k]) => { out[k] = ecNum(e[k]); });
  ['tam', 'sam', 'som'].forEach((k) => { out.mercado[k] = ecNum(out.mercado[k]); });
  out.mercado.fonte = String(out.mercado.fonte || '');
  return out;
};

/** Há dados mínimos para calcular (preço e algum volume)? */
Economia.temDados = (ec) => !!(ec && +ec.preco > 0 && (ec.volumes || []).some((v) => +v > 0));
Economia.daProjeto = (p) => p && p.produto && p.produto.etapas && p.produto.etapas.lancamento && p.produto.etapas.lancamento.economia;

/**
 * Cálculo completo. mult (opcional) multiplica preço, volume, custo variável, OPEX, CAPEX e TMA (sensibilidade).
 * Fluxos no fim de cada ano; ano 0 = implantação.
 */
Economia.calcular = function (ec, mult = {}) {
  const M = Object.assign({ preco: 1, volume: 1, cv: 1, opex: 1, capex: 1, tma: 1 }, mult);
  const N = ec.horizonte, pc = (x) => (+x || 0) / 100;
  const i = pc(ec.tma) * M.tma, tVenda = pc(ec.impostos) + pc(ec.comissao), tIr = pc(ec.ir), tCg = pc(ec.capitalGiro);
  const rP = pc(ec.reajustePreco), rC = pc(ec.reajusteCustos);
  const cvItens = ec.custosVariaveis.map((x) => Object.assign({}, x, { total: (+x.quantidade || 0) * (+x.custo || 0) * M.cv }));
  const cvu = cvItens.reduce((s, x) => s + x.total, 0);
  const cvuTerc = cvItens.filter((x) => x.terceiros).reduce((s, x) => s + x.total, 0);
  const porCat = Economia.CAT_CV.map(([k, rot]) => ({ k, rot, valor: cvItens.filter((x) => (x.categoria || 'outros') === k).reduce((s, x) => s + x.total, 0) })).filter((x) => x.valor);
  const P = (+ec.preco || 0) * M.preco;
  const capexItens = ec.capex.map((x) => Object.assign({}, x, { valor: (+x.valor || 0) * M.capex, vida: Math.max(0, Math.round(+x.vida || 0)) }));
  const capexTotal = capexItens.reduce((s, x) => s + x.valor, 0);
  const opexAno = ec.opex.reduce((s, x) => s + (+x.valor || 0), 0) * M.opex;
  const anos = [];
  let acum = 0, acumDesc = 0, cgAnt = 0, capexAcum = 0, depAcum = 0;
  for (let t = 0; t <= N; t++) {
    const fP = t ? Math.pow(1 + rP, t - 1) : 1, fC = t ? Math.pow(1 + rC, t - 1) : 1;
    const vol = t ? (+ec.volumes[t - 1] || 0) * M.volume : 0;
    const preco = t ? P * fP : 0, cvuT = cvu * fC;
    const rb = vol * preco, ded = rb * tVenda, rl = rb - ded, cv = vol * cvuT, mc = rl - cv;
    const opex = t ? opexAno * fC : 0, ebitda = mc - opex;
    const dep = capexItens.reduce((s, x) => s + (x.vida > 0 && t > x.ano && t <= x.ano + x.vida ? x.valor / x.vida : 0), 0);
    const ebit = ebitda - dep, ir = Math.max(0, ebit) * tIr, lucro = ebit - ir;
    const capex = capexItens.filter((x) => x.ano === t).reduce((s, x) => s + x.valor, 0);
    const capInvest = capexAcum - depAcum + cgAnt; // capital investido no início do ano (para o EVA)
    const cg = tCg * rb, dCg = cg - cgAnt;
    const fim = t === N ? cg + pc(ec.residual) * capexTotal : 0; // recuperação do giro + valor residual
    const fcl = lucro + dep - capex - dCg + fim;
    const fd = fcl / Math.pow(1 + i, t);
    acum += fcl; acumDesc += fd;
    const eva = t ? lucro - i * capInvest : 0;
    const va = rb - vol * cvuTerc * fC; // valor adicionado bruto: receita − insumos de terceiros
    anos.push({ t, vol, preco, cvu: cvuT, rb, ded, rl, cv, mc, opex, ebitda, dep, ebit, ir, lucro, capex, dCg, fim, fcl, fd, acum, acumDesc, eva, va, capInvest });
    cgAnt = cg; capexAcum += capex; depAcum += dep;
  }
  const fcls = anos.map((a) => a.fcl);
  const vpl = anos.reduce((s, a) => s + a.fd, 0);
  const vpAt = (taxa) => fcls.reduce((s, f, t) => s + f / Math.pow(1 + taxa, t), 0);
  // TIR: procura a troca de sinal e refina por bissecção
  let tir = null;
  if (fcls.some((f) => f < 0) && fcls.some((f) => f > 0)) {
    const grade = [-0.99, -0.9, -0.75, -0.5, -0.25, 0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10];
    for (let k = 0; k < grade.length - 1 && tir === null; k++) {
      let a = grade[k], b = grade[k + 1], fa = vpAt(a), fb = vpAt(b);
      if (fa === 0) { tir = a; break; }
      if (fa * fb > 0) continue;
      for (let it = 0; it < 200; it++) { const m = (a + b) / 2, fm = vpAt(m); if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; } }
      tir = (a + b) / 2;
    }
  }
  const payback = (campo) => {
    if (anos[0][campo] >= 0 && anos.every((a) => a.fcl >= 0)) return 0;
    for (let t = 1; t <= N; t++) {
      const antes = anos[t - 1][campo], agora = anos[t][campo];
      if (antes < 0 && agora >= 0) { const f = campo === 'acum' ? anos[t].fcl : anos[t].fd; return t - 1 + (f ? -antes / f : 0); }
    }
    return null;
  };
  const vpInvest = anos.reduce((s, a) => s + a.capex / Math.pow(1 + i, a.t), 0);
  const lucroTotal = anos.reduce((s, a) => s + a.lucro, 0);
  const a1 = anos[1] || anos[0];
  const mcu = P * (1 - tVenda) - cvu;
  const pe = (fixo) => (mcu > 0 ? fixo / mcu : null);
  const margem = pc(ec.margemAlvo), divisor = 1 - tVenda - margem;
  const mva = anos.reduce((s, a) => s + a.eva / Math.pow(1 + i, a.t), 0);
  const vaTotal = anos.reduce((s, a) => s + a.va, 0), rbTotal = anos.reduce((s, a) => s + a.rb, 0);
  return {
    N, i, tVenda, tIr, cvItens, cvu, cvuTerc, porCat, P, capexItens, capexTotal, opexAno, anos, vpl, tir,
    paybackSimples: payback('acum'), paybackDescontado: payback('acumDesc'),
    il: vpInvest > 0 ? (vpl + vpInvest) / vpInvest : null,
    roi: capexTotal > 0 ? lucroTotal / capexTotal : null, lucroTotal,
    mcu, mcPct: P > 0 ? mcu / P : null,
    peOperacional: pe(opexAno), peContabil: pe(opexAno + a1.dep), peEconomico: pe(opexAno + a1.dep + i * capexTotal),
    custoPleno: a1.vol > 0 ? cvu + (opexAno + a1.dep) / a1.vol : null,
    precoSugerido: divisor > 0 && cvu > 0 ? cvu / divisor : null,
    precoMinimoAno1: a1.vol > 0 && 1 - tVenda > 0 ? (cvu * a1.vol + opexAno + a1.dep) / (a1.vol * (1 - tVenda)) : null,
    margemEbitda: anos.slice(1).map((a) => (a.rb ? a.ebitda / a.rb : null)),
    mva, vaTotal, vaPct: rbTotal ? vaTotal / rbTotal : null, vaUnit: P - cvuTerc,
  };
};

/** Multiplicador (de preço ou volume) que zera o VPL, por bissecção. */
Economia.multiplicadorEquilibrio = function (ec, campo) {
  const f = (m) => Economia.calcular(ec, { [campo]: m }).vpl;
  let a = 0, b = 20, fa = f(a), fb = f(b);
  if (fa * fb > 0) return null;
  for (let k = 0; k < 80; k++) { const m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) { b = m; fb = fm; } else { a = m; fa = fm; } }
  return (a + b) / 2;
};

Economia.SENS = [['preco', 'Preço de venda'], ['volume', 'Volume de vendas'], ['cv', 'Custo variável unitário'], ['opex', 'OPEX (custos fixos)'], ['capex', 'CAPEX (investimento)'], ['tma', 'TMA']];
Economia.PASSOS_SENS = [-0.2, -0.1, 0, 0.1, 0.2];
Economia.sensibilidade = (ec) => Economia.SENS.map(([k, rot]) => {
  const vals = Economia.PASSOS_SENS.map((d) => Economia.calcular(ec, { [k]: 1 + d }).vpl);
  return { k, rot, vals, amplitude: Math.abs(vals[vals.length - 1] - vals[0]) };
}).sort((a, b) => b.amplitude - a.amplitude);

/** Premissas não informadas e alertas de coerência (mercado, preço, equilíbrio). */
Economia.diagnostico = function (ec, r) {
  const faltam = [], alertas = [];
  Economia.PREMISSAS.filter(([, , obrig]) => obrig).forEach(([k, rot]) => { if (ec[k] === null) faltam.push(rot + ' (considerado 0)'); });
  if (!(+ec.preco > 0)) faltam.push('Preço de venda');
  if (!ec.volumes.some((v) => +v > 0)) faltam.push('Volume de vendas por ano');
  if (!ec.custosVariaveis.length) faltam.push('Custos variáveis por unidade');
  if (!ec.capex.length) faltam.push('CAPEX (sem investimento, payback e índice de lucratividade não se aplicam)');
  if (!ec.opex.length) faltam.push('OPEX (custos fixos anuais)');
  const u = ec.unidade, mo = ec.moeda, mk = ec.mercado;
  if (r.P > 0 && r.mcu <= 0) alertas.push(`O preço líquido de impostos e comissões (${Economia.fMoeda(r.P * (1 - r.tVenda), mo, 2)}) não cobre o custo variável unitário (${Economia.fMoeda(r.cvu, mo, 2)}): a margem de contribuição é negativa e não há ponto de equilíbrio.`);
  const v1 = r.anos[1] ? r.anos[1].vol : 0;
  if (r.peContabil !== null && v1 > 0 && v1 < r.peContabil) alertas.push(`No ano 1, o volume previsto (${Economia.fNum(v1)} ${u}) está abaixo do ponto de equilíbrio contábil (${Economia.fNum(Math.ceil(r.peContabil))} ${u}/ano).`);
  if (mk.tam && mk.sam && mk.sam > mk.tam) alertas.push('O mercado acessível (SAM) é maior que o mercado total (TAM).');
  if (mk.sam && mk.som && mk.som > mk.sam) alertas.push('O mercado alcançável (SOM) é maior que o mercado acessível (SAM).');
  const vMax = Math.max(0, ...ec.volumes.map((v) => +v || 0));
  if (mk.sam && vMax > mk.sam) alertas.push(`O volume previsto (até ${Economia.fNum(vMax)} ${u}/ano) supera o mercado acessível (SAM = ${Economia.fNum(mk.sam)} ${u}/ano).`);
  else if (mk.som && vMax > mk.som) alertas.push(`O volume previsto (até ${Economia.fNum(vMax)} ${u}/ano) supera o mercado alcançável (SOM = ${Economia.fNum(mk.som)} ${u}/ano): revise a participação de mercado.`);
  if (r.tir !== null && r.i > 0 && r.tir < r.i && r.vpl < 0) { /* coerente com VPL negativo: já sai no parecer */ }
  const viavel = r.vpl > 0 && (r.tir === null || r.tir >= r.i);
  let parecer;
  if (!Economia.temDados(ec)) parecer = 'Informe preço e volumes para avaliar a viabilidade.';
  else if (viavel) parecer = `Economicamente viável nas premissas informadas: VPL positivo (${Economia.fMoeda(r.vpl, mo)}) à TMA de ${Economia.fPct(r.i)}${r.tir !== null ? `, TIR de ${Economia.fPct(r.tir)}` : ''}${r.paybackDescontado !== null ? ` e payback descontado de ${Economia.fAnos(r.paybackDescontado)}` : ''}.`;
  else parecer = `Inviável nas premissas informadas: VPL ${r.vpl < 0 ? 'negativo' : 'nulo'} (${Economia.fMoeda(r.vpl, mo)}) à TMA de ${Economia.fPct(r.i)}${r.tir !== null ? ` e TIR de ${Economia.fPct(r.tir)}` : ''}. Veja na sensibilidade o que mais pesa no resultado.`;
  return { faltam, alertas, viavel, parecer };
};

// ------------------------------------------------------------------ formatação (tela e PDF)
Economia.fNum = (v, d = 0) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
Economia.fMoeda = (v, m = 'R$', d = 0) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v < 0 ? '−' : ''}${m} ${Economia.fNum(Math.abs(v), d)}`);
Economia.fPct = (v, d = 1) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : Economia.fNum(v * 100, d) + ' %');
Economia.fAnos = (v) => (v === null || v === undefined ? 'não ocorre no horizonte' : `${Economia.fNum(v, 1)} ano${v >= 2 || v < 1 ? 's' : ''}`);
Economia.fCompacto = (v) => {
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  if (a >= 1e9) return s + Economia.fNum(a / 1e9, 1) + ' bi';
  if (a >= 1e6) return s + Economia.fNum(a / 1e6, 1) + ' mi';
  if (a >= 1e3) return s + Economia.fNum(a / 1e3, 0) + ' mil';
  return s + Economia.fNum(a, 0);
};

/** Indicadores-resumo: [rótulo, valor, observação, alerta?] (mesma lista na tela e no PDF). */
Economia.indicadores = function (ec, r) {
  const m = ec.moeda, u = ec.unidade, ceil = (x) => (x === null ? null : Math.ceil(x));
  return [
    ['VPL (valor presente líquido)', Economia.fMoeda(r.vpl, m), `à TMA de ${Economia.fPct(r.i)}`, r.vpl < 0],
    ['TIR (taxa interna de retorno)', r.tir === null ? 'não calculável' : Economia.fPct(r.tir), r.tir === null ? 'fluxo sem troca de sinal' : (r.tir >= r.i ? 'acima da TMA' : 'abaixo da TMA'), r.tir !== null && r.tir < r.i],
    ['Payback simples', Economia.fAnos(r.paybackSimples), 'recuperação do investimento', r.paybackSimples === null],
    ['Payback descontado', Economia.fAnos(r.paybackDescontado), 'considerando a TMA', r.paybackDescontado === null],
    ['Índice de lucratividade', r.il === null ? '—' : Economia.fNum(r.il, 2), 'VP dos fluxos ÷ VP do CAPEX', r.il !== null && r.il < 1],
    ['ROI no horizonte', Economia.fPct(r.roi), 'lucro líquido acumulado ÷ CAPEX', r.roi !== null && r.roi < 0],
    ['Margem de contribuição unitária', Economia.fMoeda(r.mcu, m, 2), `${Economia.fPct(r.mcPct)} do preço (ano 1)`, r.mcu <= 0],
    ['Ponto de equilíbrio contábil', r.peContabil === null ? '—' : `${Economia.fNum(ceil(r.peContabil))} ${u}/ano`, `operacional: ${Economia.fNum(ceil(r.peOperacional))} · econômico: ${Economia.fNum(ceil(r.peEconomico))}`, false],
    ['Custo pleno unitário (ano 1)', Economia.fMoeda(r.custoPleno, m, 2), `variável ${Economia.fMoeda(r.cvu, m, 2)} + fixos e depreciação rateados`, r.custoPleno !== null && r.custoPleno > r.P * (1 - r.tVenda)],
    ['Preço para a margem-alvo', Economia.fMoeda(r.precoSugerido, m, 2), ec.margemAlvo === null ? 'informe a margem-alvo' : `margem de contribuição de ${Economia.fNum(ec.margemAlvo, 1)} %`, false],
    ['Preço mínimo (lucro zero no ano 1)', Economia.fMoeda(r.precoMinimoAno1, m, 2), `preço atual: ${Economia.fMoeda(r.P, m, 2)}`, r.precoMinimoAno1 !== null && r.P < r.precoMinimoAno1],
    ['MVA (soma dos EVA descontados)', Economia.fMoeda(r.mva, m), 'valor econômico agregado no horizonte', r.mva < 0],
    ['Valor adicionado bruto', Economia.fMoeda(r.vaTotal, m), `${Economia.fPct(r.vaPct)} da receita · ${Economia.fMoeda(r.vaUnit, m, 2)}/${u}`, false],
  ];
};

/** Linhas da DRE e do fluxo de caixa: [rótulo, campo ou função, destaque, decimais]. */
Economia.LINHAS_FC = [
  ['Volume vendido', 'vol', false, 0, true], ['Preço unitário', 'preco', false, 2, true],
  ['Receita bruta', 'rb', false], ['(−) Impostos, comissões e frete', (a) => -a.ded, false], ['Receita líquida', 'rl', true],
  ['(−) Custos variáveis', (a) => -a.cv, false], ['Margem de contribuição', 'mc', true], ['(−) OPEX (custos fixos)', (a) => -a.opex, false],
  ['EBITDA', 'ebitda', true], ['(−) Depreciação', (a) => -a.dep, false], ['EBIT (lucro operacional)', 'ebit', false], ['(−) IR + CSLL', (a) => -a.ir, false],
  ['Lucro líquido (NOPAT)', 'lucro', true], ['(+) Depreciação', 'dep', false], ['(−) CAPEX', (a) => -a.capex, false],
  ['(−) Variação do capital de giro', (a) => -a.dCg, false], ['(+) Recuperação do giro e valor residual', 'fim', false],
  ['Fluxo de caixa livre', 'fcl', true], ['Fluxo acumulado', 'acum', false], ['Fluxo descontado', 'fd', false], ['Fluxo descontado acumulado', 'acumDesc', true],
  ['EVA (valor econômico agregado)', 'eva', false], ['Valor adicionado bruto', 'va', false],
];
Economia.valorLinha = (a, def) => (typeof def[1] === 'function' ? def[1](a) : a[def[1]]);
Economia.textoLinha = (a, def) => {
  if (def[4] && !a.t) return '';
  const v = Economia.valorLinha(a, def);
  return Math.abs(v) < 0.005 ? '–' : Economia.fNum(v, def[3] || 0);
};

/** Gráfico do fluxo de caixa: barras = fluxo livre do ano; linhas = acumulado simples e descontado. */
Economia.graficoSvg = function (r, moeda = 'R$') {
  const W = 720, H = 300, esq = 70, dir = 16, topo = 24, base = 52;
  const a = r.anos, vals = a.flatMap((x) => [x.fcl, x.acum, x.acumDesc, 0]);
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (mn === mx) { mn -= 1; mx += 1; }
  const pad = (mx - mn) * 0.06; mn -= pad; mx += pad;
  const y = (v) => topo + (mx - v) / (mx - mn) * (H - topo - base);
  const larg = (W - esq - dir) / a.length, x = (t) => esq + larg * t + larg / 2;
  const F = 'font-family="Roboto, Segoe UI, Arial, sans-serif"';
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" ${F}><rect width="${W}" height="${H}" fill="#ffffff"/>`;
  for (let k = 0; k <= 4; k++) {
    const v = mn + (mx - mn) * k / 4, yy = y(v).toFixed(1);
    s += `<line x1="${esq}" y1="${yy}" x2="${W - dir}" y2="${yy}" stroke="#e3e8e8" stroke-width="1"/><text x="${esq - 6}" y="${(+yy + 4).toFixed(1)}" font-size="10" fill="#5f6f6d" text-anchor="end">${Economia.fCompacto(v)}</text>`;
  }
  s += `<line x1="${esq}" y1="${y(0).toFixed(1)}" x2="${W - dir}" y2="${y(0).toFixed(1)}" stroke="#1d2b2b" stroke-width="1"/>`;
  a.forEach((d) => {
    const bw = Math.min(46, larg * 0.6), y0 = y(0), y1 = y(d.fcl);
    s += `<rect x="${(x(d.t) - bw / 2).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(y1 - y0)).toFixed(1)}" fill="${d.fcl >= 0 ? '#409580' : '#c0392b'}" rx="2"/>`;
    s += `<text x="${x(d.t).toFixed(1)}" y="${H - base + 16}" font-size="11" fill="#1d2b2b" text-anchor="middle">${d.t ? 'ano ' + d.t : 'ano 0'}</text>`;
  });
  const linha = (campo, cor, tracej) => {
    const pts = a.map((d) => `${x(d.t).toFixed(1)},${y(d[campo]).toFixed(1)}`).join(' ');
    let h = `<polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="2"${tracej ? ' stroke-dasharray="5,4"' : ''}/>`;
    a.forEach((d) => { h += `<circle cx="${x(d.t).toFixed(1)}" cy="${y(d[campo]).toFixed(1)}" r="3" fill="${cor}"/>`; });
    return h;
  };
  s += linha('acum', '#085357', false) + linha('acumDesc', '#d4a017', true);
  const ly = H - 14;
  s += `<rect x="${esq}" y="${ly - 9}" width="12" height="10" fill="#409580"/><text x="${esq + 16}" y="${ly}" font-size="10.5" fill="#333">fluxo livre do ano (${moeda})</text>`;
  s += `<line x1="${esq + 170}" y1="${ly - 4}" x2="${esq + 190}" y2="${ly - 4}" stroke="#085357" stroke-width="2"/><text x="${esq + 195}" y="${ly}" font-size="10.5" fill="#333">acumulado</text>`;
  s += `<line x1="${esq + 270}" y1="${ly - 4}" x2="${esq + 290}" y2="${ly - 4}" stroke="#d4a017" stroke-width="2" stroke-dasharray="5,4"/><text x="${esq + 295}" y="${ly}" font-size="10.5" fill="#333">acumulado descontado (TMA)</text>`;
  return s + '</svg>';
};

// ================================================================== tela (fase de lançamento)
if (typeof App !== 'undefined') {
  App.novos.ecoCv = () => ({ item: '', categoria: 'material', quantidade: 1, unidade: 'un', custo: null, terceiros: true });
  App.novos.ecoCapex = () => ({ item: '', categoria: 'equipamentos', valor: null, ano: 0, vida: 5 });
  App.novos.ecoOpex = () => ({ item: '', categoria: 'pessoal', valor: null });
}

Economia.html = function (e, b) {
  const ec = e.economia, c = App.campo, be = b + '.economia', N = ec.horizonte, m = ec.moeda, u = ec.unidade;
  const num = (k, rot, op = {}) => c(`${be}.${k}`, rot, Object.assign({ tipo: 'number', min: 0 }, op));
  let h = cartao('Análise econômica e de mercado — premissas', `<p class="muted" style="margin-top:0">Fase de mercado: com o produto/serviço pronto para o lançamento, estime o mercado, o preço, os custos e os investimentos para avaliar a viabilidade.
  Percentuais em % (12 = 12 %). Campos em branco valem zero e aparecem como premissa não informada. Fluxos no fim de cada ano, depreciação linear, IR só sobre lucro positivo e sem financiamento (capital próprio).</p>
  <div class="grade-campos">
    ${c(be + '.moeda', 'Moeda', { ph: 'R$', render: true })}${c(be + '.unidade', 'Unidade de venda', { ph: 'un', render: true })}
    ${c(be + '.horizonte', 'Horizonte de análise (anos)', { tipo: 'select', render: true, opcoes: Array.from({ length: 15 }, (_, k) => [k + 1, String(k + 1)]) })}
    ${Economia.PREMISSAS.map(([k, rot]) => num(k, rot)).join('')}
  </div>`);

  h += cartao('Mercado e demanda', `<div class="grade-campos">
    ${num('mercado.tam', `TAM – mercado total (${u}/ano)`)}${num('mercado.sam', `SAM – mercado acessível (${u}/ano)`)}${num('mercado.som', `SOM – mercado alcançável (${u}/ano)`)}
    ${num('preco', `Preço de venda unitário no ano 1 (${m})`)}
    ${c(be + '.mercado.fonte', 'Fontes e premissas do dimensionamento do mercado', { tipo: 'textarea', classe: 'largo', linhas: 2 })}</div>
  <h4>Volume de vendas por ano (${esc(u)})</h4>
  <div class="rolagem"><table class="tab-edit"><thead><tr>${ec.volumes.map((_, k) => `<th style="min-width:90px">Ano ${k + 1}</th>`).join('')}</tr></thead>
  <tbody><tr>${ec.volumes.map((_, k) => `<td>${c(`${be}.volumes.${k}`, '', { tipo: 'number', min: 0 })}</td>`).join('')}</tr></tbody></table></div>
  <div class="grade-campos">${num('volAno1', `Volume do ano 1 (${u})`)}${num('crescimento', 'Crescimento anual (%)', { min: -100 })}</div>
  <div class="barra"><button class="btn pequeno" data-acao="eco-volumes">Preencher os ${N} anos pelo crescimento</button>
    ${ec.mercado.som ? `<button class="btn pequeno" data-acao="eco-volumes-som">Usar o SOM (${Economia.fNum(ec.mercado.som)}) em todos os anos</button>` : ''}
    <span class="muted" id="ecoMercado"></span></div>`);

  const bom = (App.p.produto.etapas.detalhado.bom || []).filter((x) => String(x.item || x.descricao || '').trim());
  h += cartao('Custo variável por unidade', `<p class="muted" style="margin-top:0">Tudo o que se gasta para cada unidade vendida (materiais, mão de obra direta, serviços, embalagem, frete por unidade). Marque <b>insumo de terceiros</b> para o que é comprado fora: entra no cálculo do valor adicionado.</p>
  ${App.tabela(be + '.custosVariaveis', [
    { campo: 'item', rotulo: 'Item' }, { campo: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: Economia.CAT_CV, largura: '170px' },
    { campo: 'quantidade', rotulo: 'Qtd. por unidade', tipo: 'number', min: 0, largura: '100px' }, { campo: 'unidade', rotulo: 'Un.', largura: '60px' },
    { campo: 'custo', rotulo: `Custo unitário (${m})`, tipo: 'number', min: 0, largura: '120px' }, { campo: 'terceiros', rotulo: 'Insumo de terceiros', tipo: 'checkbox', largura: '110px' },
  ], { novo: 'ecoCv', botao: 'Adicionar custo', vazio: 'Nenhum custo variável.' })}
  <div class="barra" style="margin-top:0">${bom.length ? `<button class="btn pequeno" data-acao="eco-bom">Trazer os ${bom.length} item(ns) da lista de materiais</button>` : '<span class="muted">Sem lista de materiais no projeto detalhado para importar.</span>'}
    <span class="muted" id="ecoCvu"></span></div>`);

  h += cartao('CAPEX — investimentos', `<p class="muted" style="margin-top:0">Gastos de capital: máquinas, ferramental, instalações, certificação, software. Ano 0 = implantação. A vida útil define a depreciação linear (0 = não deprecia).</p>
  ${App.tabela(be + '.capex', [
    { campo: 'item', rotulo: 'Item' }, { campo: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: Economia.CAT_CAPEX, largura: '190px' },
    { campo: 'valor', rotulo: `Valor (${m})`, tipo: 'number', min: 0, largura: '130px' },
    { campo: 'ano', rotulo: 'Ano', tipo: 'select', opcoes: Array.from({ length: N + 1 }, (_, k) => [k, k ? `ano ${k}` : 'ano 0 (implantação)']), largura: '150px' },
    { campo: 'vida', rotulo: 'Vida útil (anos)', tipo: 'number', min: 0, largura: '100px' },
  ], { novo: 'ecoCapex', botao: 'Adicionar investimento', vazio: 'Nenhum investimento.' })}`);

  h += cartao('OPEX — custos fixos anuais', `<p class="muted" style="margin-top:0">Custos que não dependem do volume: equipe, ocupação, manutenção, marketing, administração, assistência técnica. Valor do ano 1 (os anos seguintes seguem o reajuste dos custos).</p>
  ${App.tabela(be + '.opex', [
    { campo: 'item', rotulo: 'Item' }, { campo: 'categoria', rotulo: 'Categoria', tipo: 'select', opcoes: Economia.CAT_OPEX, largura: '210px' },
    { campo: 'valor', rotulo: `Valor anual (${m})`, tipo: 'number', min: 0, largura: '150px' },
  ], { novo: 'ecoOpex', botao: 'Adicionar custo fixo', vazio: 'Nenhum custo fixo.' })}`);

  h += cartao('Resultados da análise econômica', `<div id="ecoResultados">${Economia.resultadosHtml(ec)}</div>`);
  h += cartao('Parecer', c(be + '.conclusao', 'Conclusão da análise: decisão de lançamento, riscos de mercado e próximos passos (vai para os relatórios e o manual de projeto)', { tipo: 'textarea', linhas: 4 }));
  return h;
};

/** Resultados calculados (atualizados a cada digitação, sem redesenhar os campos). */
Economia.resultadosHtml = function (ec) {
  if (!Economia.temDados(ec)) return '<p class="vazio">Informe o preço de venda e o volume de pelo menos um ano para ver VPL, TIR, payback, ponto de equilíbrio, EVA e sensibilidade.</p>';
  const r = Economia.calcular(ec), d = Economia.diagnostico(ec, r), m = ec.moeda, u = ec.unidade;
  let h = `<div class="${d.viavel ? 'ok-box' : 'alerta-box'}"><b>${d.viavel ? 'Viável' : 'Inviável'}:</b> ${esc(d.parecer.replace(/^[^:]*:\s*/, ''))}</div>`;
  if (d.faltam.length) h += `<div class="aviso-box"><b>Premissas não informadas:</b> ${d.faltam.map(esc).join('; ')}.</div>`;
  h += d.alertas.map((a) => `<div class="alerta-box">${esc(a)}</div>`).join('');
  h += `<div class="kpis" style="margin-top:12px">${Economia.indicadores(ec, r).map(([rot, v, obs, al]) => `<div class="kpi ${al ? 'alerta' : ''}"><div class="r">${esc(rot)}</div><div class="v" style="font-size:19px">${esc(v)}</div><div class="r">${esc(obs)}</div></div>`).join('')}</div>`;
  if (r.porCat.length) h += `<h4>Composição do custo variável unitário (${esc(Economia.fMoeda(r.cvu, m, 2))}/${esc(u)})</h4><div class="rolagem"><table class="tab-edit"><thead><tr><th>Categoria</th><th style="text-align:right">${esc(m)}/${esc(u)}</th><th style="text-align:right">% do custo</th><th style="text-align:right">% do preço</th></tr></thead><tbody>
    ${r.porCat.map((x) => `<tr><td>${esc(x.rot)}</td><td style="text-align:right">${Economia.fNum(x.valor, 2)}</td><td style="text-align:right">${Economia.fPct(x.valor / r.cvu)}</td><td style="text-align:right">${Economia.fPct(r.P ? x.valor / r.P : null)}</td></tr>`).join('')}</tbody></table></div>`;
  h += `<h4>Fluxo de caixa (${esc(m)})</h4><div class="nd-previa" style="overflow-x:auto">${Economia.graficoSvg(r, m)}</div>
  <div class="rolagem"><table class="tab-edit eco-fc"><thead><tr><th>${esc(m)}</th>${r.anos.map((a) => `<th style="text-align:right">Ano ${a.t}</th>`).join('')}</tr></thead><tbody>
  ${Economia.LINHAS_FC.map((def) => `<tr class="${def[2] ? 'total' : ''}"><td>${def[2] ? '<b>' + esc(def[0]) + '</b>' : esc(def[0])}${def[0] === 'Volume vendido' ? ` (${esc(u)})` : ''}</td>${r.anos.map((a) => { const v = Economia.valorLinha(a, def); return `<td style="text-align:right;white-space:nowrap${v < -0.004 ? ';color:var(--erro)' : ''}">${def[2] ? '<b>' : ''}${Economia.textoLinha(a, def)}${def[2] ? '</b>' : ''}</td>`; }).join('')}</tr>`).join('')}
  </tbody></table></div>`;
  const sens = Economia.sensibilidade(ec);
  const mPreco = Economia.multiplicadorEquilibrio(ec, 'preco'), mVol = Economia.multiplicadorEquilibrio(ec, 'volume');
  h += `<h4>Sensibilidade do VPL (${esc(m)})</h4><p class="muted" style="margin-top:0">Cada linha varia uma premissa e mantém as demais; ordenadas da que mais pesa para a que menos pesa.</p>
  <div class="rolagem"><table class="tab-edit"><thead><tr><th>Variável</th>${Economia.PASSOS_SENS.map((p) => `<th style="text-align:right">${p > 0 ? '+' : ''}${Math.round(p * 100)} %</th>`).join('')}</tr></thead><tbody>
  ${sens.map((x) => `<tr><td>${esc(x.rot)}</td>${x.vals.map((v) => `<td style="text-align:right${v < 0 ? ';color:var(--erro)' : ''}">${Economia.fNum(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="muted">VPL = 0 com ${mPreco !== null ? `preço de ${esc(Economia.fMoeda(r.P * mPreco, m, 2))} (${Economia.fPct(mPreco - 1)} do atual)` : 'nenhum preço entre 0 e 20× o atual'} ou ${mVol !== null ? `volume ${Economia.fPct(mVol - 1)} em relação ao previsto` : 'nenhum volume entre 0 e 20× o previsto'}.</p>`;
  const mk = ec.mercado, vN = r.anos[r.N].vol;
  if (mk.tam || mk.sam || mk.som) h += `<h4>Mercado</h4><div class="rolagem"><table class="tab-edit"><thead><tr><th>Referência</th><th style="text-align:right">${esc(u)}/ano</th><th style="text-align:right">Participação no ano ${r.N} (${Economia.fNum(vN)} ${esc(u)})</th></tr></thead><tbody>
    ${[['TAM – mercado total', mk.tam], ['SAM – mercado acessível', mk.sam], ['SOM – mercado alcançável', mk.som]].filter(([, v]) => v).map(([rot, v]) => `<tr><td>${rot}</td><td style="text-align:right">${Economia.fNum(v)}</td><td style="text-align:right">${Economia.fPct(vN / v)}</td></tr>`).join('')}</tbody></table></div>`;
  h += `<p class="muted">EVA = lucro líquido operacional − TMA × capital investido no início do ano (CAPEX líquido de depreciação + capital de giro); MVA = soma dos EVA descontados. Valor adicionado bruto = receita − insumos de terceiros. ${esc(Economia.REF_EVA)}</p>`;
  return h;
};

/** Atualização ao digitar (chamada pela análise da aba). */
Economia.atualizarTela = function () {
  const el = document.getElementById('ecoResultados');
  if (!el || !App.p) return;
  const ec = Economia.daProjeto(App.p);
  App.p.produto.etapas.lancamento.economia = Economia.normalizar(ec); // números digitados como texto viram números
  const n = App.p.produto.etapas.lancamento.economia;
  el.innerHTML = Economia.resultadosHtml(n);
  const cv = document.getElementById('ecoCvu');
  if (cv) { const r = Economia.calcular(n); cv.textContent = `Custo variável unitário: ${Economia.fMoeda(r.cvu, n.moeda, 2)} por ${n.unidade}` + (r.P ? ` (${Economia.fPct(r.cvu / r.P)} do preço)` : ''); }
  const mk = document.getElementById('ecoMercado');
  if (mk) { const tot = n.volumes.reduce((s, v) => s + (+v || 0), 0); mk.textContent = tot ? `Total no horizonte: ${Economia.fNum(tot)} ${n.unidade}` : ''; }
};

if (typeof App !== 'undefined') {
  App.acoes['eco-volumes'] = () => {
    const ec = Economia.daProjeto(App.p);
    if (!(+ec.volAno1 > 0)) { App.toast('Informe o volume do ano 1.', 'aviso'); return; }
    const g = (+ec.crescimento || 0) / 100;
    ec.volumes = ec.volumes.map((_, k) => Math.round(ec.volAno1 * Math.pow(1 + g, k)));
    App.marcarSujo(true); App.render(); App.agendarAnalise(50);
  };
  App.acoes['eco-volumes-som'] = () => {
    const ec = Economia.daProjeto(App.p);
    ec.volumes = ec.volumes.map(() => ec.mercado.som);
    App.marcarSujo(true); App.render(); App.agendarAnalise(50);
  };
  App.acoes['eco-bom'] = () => {
    const ec = Economia.daProjeto(App.p), tem = new Set(ec.custosVariaveis.map((x) => String(x.item).trim().toLowerCase()));
    let n = 0;
    App.p.produto.etapas.detalhado.bom.forEach((x) => {
      const nome = [x.item, x.descricao].map((s) => String(s || '').trim()).filter(Boolean).join(' – ');
      if (!nome || tem.has(nome.toLowerCase())) return;
      ec.custosVariaveis.push(Object.assign(App.novos.ecoCv(), { item: nome, categoria: x.origem === 'terceirizado' ? 'terceiros' : 'material', quantidade: x.quantidade ?? 1, unidade: x.unidade || 'un' }));
      tem.add(nome.toLowerCase()); n++;
    });
    App.marcarSujo(true); App.render(); App.agendarAnalise(50);
    App.toast(n ? `${n} item(ns) trazido(s) da lista de materiais. Informe o custo unitário de cada um.` : 'Os itens da lista de materiais já estão na tabela.', n ? 'ok' : 'aviso', 7000);
  };
}

// ================================================================== PDF
/**
 * Conteúdo pdfmake da análise econômica. ctx: { h(t) → título, add(nó), tab(cab, linhas, larguras [{min, w}]) }.
 * O fluxo de caixa sai em partes de até 6 anos, para caber em retrato.
 */
Economia.pdf = function (ec, ctx) {
  if (!Economia.temDados(ec)) { ctx.add({ text: 'Análise econômica sem dados (informe preço e volumes na fase de lançamento).', style: 'muted' }); return; }
  const r = Economia.calcular(ec), d = Economia.diagnostico(ec, r), m = ec.moeda, u = ec.unidade, F = Economia.fNum;
  ctx.add(caixa([{ text: (d.viavel ? 'Viável. ' : 'Inviável. ') + d.parecer.replace(/^[^:]*:\s*/, ''), bold: true }], d.viavel ? 'ok' : 'alerta'));
  if (d.faltam.length) ctx.add({ text: 'Premissas não informadas: ' + d.faltam.join('; ') + '.', style: 'muted', margin: [0, 0, 0, 4] });
  d.alertas.forEach((a) => ctx.add(caixa(a)));
  ctx.h('Premissas');
  const prem = Economia.PREMISSAS.filter(([k]) => ec[k] !== null).map(([k, rot]) => [rot, F(ec[k], 2) + ' %']);
  ctx.add(Pdf.kpi([['Horizonte', `${ec.horizonte} ano(s); fluxos no fim de cada ano`], ['Preço de venda (ano 1)', Economia.fMoeda(r.P, m, 2) + ' por ' + u], ...prem,
    ['Simplificações', 'Depreciação linear; IR só sobre lucro positivo (sem compensação de prejuízos); sem financiamento (capital próprio).']]));
  const mk = ec.mercado;
  if (mk.tam || mk.sam || mk.som || mk.fonte.trim()) {
    ctx.h('Mercado e demanda');
    const vN = r.anos[r.N].vol;
    const l = [['TAM – mercado total', mk.tam], ['SAM – mercado acessível', mk.sam], ['SOM – mercado alcançável', mk.som]].filter(([, v]) => v).map(([rot, v]) => [rot, { text: F(v), alignment: 'right' }, { text: Economia.fPct(vN / v), alignment: 'right' }]);
    if (l.length) ctx.tab(['Referência', `${u}/ano`, `Participação no ano ${r.N}`], l, [{ min: 150, w: '*' }, { min: 80 }, { min: 100 }]);
    if (mk.fonte.trim()) ctx.add({ text: 'Fontes e premissas: ' + mk.fonte.trim(), style: 'corpo', margin: [0, 0, 0, 6] });
  }
  ctx.h('Indicadores');
  ctx.tab(['Indicador', 'Valor', 'Observação'], Economia.indicadores(ec, r).map(([rot, v, obs, al]) => [{ text: rot, bold: true }, { text: v, bold: true, color: al ? '#c0392b' : COR.texto }, obs]),
    [{ min: 150 }, { min: 95 }, { min: 150, w: '*' }]);
  if (r.cvItens.length) {
    ctx.h(`Custo variável unitário (${Economia.fMoeda(r.cvu, m, 2)} por ${u})`);
    ctx.tab(['Item', 'Categoria', 'Qtd.', `Custo unit. (${m})`, `Total (${m})`, 'Terceiros'], r.cvItens.map((x) => [x.item || '—', (Economia.CAT_CV.find(([k]) => k === x.categoria) || [, 'Outros'])[1],
      `${F(+x.quantidade || 0, 2)} ${x.unidade || ''}`.trim(), { text: F(+x.custo || 0, 2), alignment: 'right' }, { text: F(x.total, 2), alignment: 'right' }, x.terceiros ? 'sim' : 'não']),
    [{ min: 110, w: '*' }, { min: 85 }, { min: 45 }, { min: 60 }, { min: 60 }, { min: 42 }]);
  }
  if (r.capexItens.length) {
    ctx.h(`CAPEX (${Economia.fMoeda(r.capexTotal, m)})`);
    ctx.tab(['Item', 'Categoria', `Valor (${m})`, 'Ano', 'Vida útil'], r.capexItens.map((x) => [x.item || '—', (Economia.CAT_CAPEX.find(([k]) => k === x.categoria) || [, 'Outros'])[1],
      { text: F(x.valor), alignment: 'right' }, String(x.ano), x.vida ? `${x.vida} anos` : 'não deprecia']), [{ min: 120, w: '*' }, { min: 100 }, { min: 70 }, { min: 30 }, { min: 55 }]);
  }
  if (ec.opex.length) {
    ctx.h(`OPEX (${Economia.fMoeda(r.opexAno, m)} no ano 1)`);
    ctx.tab(['Item', 'Categoria', `Valor anual (${m})`], ec.opex.map((x) => [x.item || '—', (Economia.CAT_OPEX.find(([k]) => k === x.categoria) || [, 'Outros'])[1], { text: F(+x.valor || 0), alignment: 'right' }]),
      [{ min: 150, w: '*' }, { min: 120 }, { min: 80 }]);
  }
  ctx.h(`Demonstrativo de resultados e fluxo de caixa (${m})`);
  ctx.add({ stack: [{ svg: Economia.graficoSvg(r, m), width: 440, alignment: 'center' }], margin: [0, 2, 0, 6], unbreakable: true });
  for (let ini = 0; ini < r.anos.length; ini += 6) {
    const parte = r.anos.slice(ini, ini + 6);
    ctx.tab([m, ...parte.map((a) => ({ text: `Ano ${a.t}`, alignment: 'right' }))], Economia.LINHAS_FC.map((def) => [{ text: def[0], bold: def[2] },
      ...parte.map((a) => { const v = Economia.valorLinha(a, def); return { text: Economia.textoLinha(a, def), alignment: 'right', bold: def[2], color: v < -0.004 ? '#c0392b' : COR.texto, fontSize: 8 }; })]),
    [{ min: 120, w: '*' }, ...parte.map(() => ({ min: 46 }))], { compacta: true });
  }
  ctx.h(`Sensibilidade do VPL (${m})`);
  const sens = Economia.sensibilidade(ec);
  ctx.tab(['Variável', ...Economia.PASSOS_SENS.map((p) => ({ text: `${p > 0 ? '+' : ''}${Math.round(p * 100)} %`, alignment: 'right' }))],
    sens.map((x) => [x.rot, ...x.vals.map((v) => ({ text: F(v), alignment: 'right', color: v < 0 ? '#c0392b' : COR.texto }))]), [{ min: 110, w: '*' }, ...Economia.PASSOS_SENS.map(() => ({ min: 54 }))]);
  const mPreco = Economia.multiplicadorEquilibrio(ec, 'preco'), mVol = Economia.multiplicadorEquilibrio(ec, 'volume');
  ctx.add({ text: `VPL = 0 com ${mPreco !== null ? `preço de ${Economia.fMoeda(r.P * mPreco, m, 2)} (${Economia.fPct(mPreco - 1)} do atual)` : 'nenhum preço entre 0 e 20× o atual'} ou volume ${mVol !== null ? Economia.fPct(mVol - 1) + ' em relação ao previsto' : 'fora de 0 a 20× o previsto'}. EVA = lucro líquido operacional − TMA × capital investido no início do ano; MVA = soma dos EVA descontados; valor adicionado bruto = receita − insumos de terceiros.`, style: 'muted', margin: [0, 0, 0, 6] });
  if (ec.conclusao.trim()) { ctx.h('Parecer'); Pdf.texto(ec.conclusao).forEach((n) => ctx.add(n)); }
  ctx.add({ text: 'Referência: ' + Economia.REF_EVA, style: 'muted', margin: [0, 0, 0, 8] });
};
