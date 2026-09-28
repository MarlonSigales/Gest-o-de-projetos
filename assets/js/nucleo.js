/* Núcleo de regras (roda no navegador): modelo do projeto, validação, TRL, análise (percentuais, CPM, riscos) e Gantt em SVG. */
'use strict';

const Nucleo = {};
const PREFIXO_ARQ = 'gestão do projeto ';

Nucleo.hoje = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
Nucleo.agoraIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); };
Nucleo.dataBR = (iso) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : (iso || '');
Nucleo.uid = (pref) => pref + '_' + Math.random().toString(16).slice(2, 10);
Nucleo.emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
Nucleo.nomeSeguro = (n) => (String(n || '').replace(/[\\/:*?"<>|\x00-\x1F]+/g, '').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '').slice(0, 120)) || 'sem nome';
Nucleo.slug = (t) => (String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)) || 'projeto';
Nucleo.nomeArquivo = (p) => PREFIXO_ARQ + Nucleo.nomeSeguro(p.projeto.nome) + '.json';

// ================================================================== modelo
Nucleo.novo = function (nome = '') {
  return {
    schemaVersion: '1.0',
    id: Nucleo.uid('prj'),
    projeto: {
      nome, codigo: '', unidadeEmbrapii: CONFIG.unidade.nome, empresaParceira: '', responsavelEmpresa: '',
      endereco: 'Av. Eliseu Maciel, Capão do Leão – RS', ano: new Date().getFullYear(), dataInicio: '', dataFimPrevista: '',
      coordenador: { nome: '', email: '' }, coordenadorAdjunto: { nome: '', email: '' }, equipe: [],
      introducao: '', objetivoGeral: '', trlEsperadoFinal: 6,
    },
    interessados: [], areas: [], macroentregas: [Nucleo.novaMacro(1)],
    riscos: [], qualidade: [], licoesAprendidas: [],
    trl: { ultimaImportacao: '', arquivoOrigem: '', arvore: [] },
    config: { incluirAndamentoNaMacro: true },
    log: [],
  };
};

Nucleo.novaMacro = function (numero) {
  return {
    uid: Nucleo.uid('me'), numero, titulo: '', descricao: '', dataInicio: '', dataPrevista: '', dataEntrega: '',
    status: 'planejada', percentualConcluido: 0, trlEsperado: 4, areas: [], objetivosEtapa: [],
    resultados: '', conclusao: '', etapasFuturas: '', atividades: [], figuras: [], tabelas: [],
    aceite: { dataAceite: '', nomeResponsavelEmpresa: '', aceito: false },
  };
};

function mesclar(base, dados) {
  for (const k of Object.keys(base)) {
    const v = base[k];
    if (!(k in dados) || dados[k] === null || dados[k] === undefined) { dados[k] = structuredClone(v); continue; }
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof dados[k] === 'object' && !Array.isArray(dados[k])) dados[k] = mesclar(v, dados[k]);
    if (Array.isArray(v) && !Array.isArray(dados[k])) dados[k] = structuredClone(v);
  }
  return dados;
}

/** Completa campos ausentes (projetos antigos/importados), sem apagar nada. */
Nucleo.normalizar = function (p) {
  p = mesclar(Nucleo.novo(), p || {});
  p.macroentregas = p.macroentregas.map((m, i) => {
    m = mesclar(Nucleo.novaMacro(i + 1), m || {});
    m.numero = i + 1;
    m.atividades = m.atividades.map((a) => mesclar({ id: Nucleo.uid('at'), nome: '', responsavel: '', inicio: '', fim: '', dependeDe: [], percentual: 0, area: '' }, a || {}));
    return m;
  });
  p.qualidade = p.qualidade.map((q) => { q.pdca = Object.assign({ planejar: '', executar: '', verificar: '', agir: '' }, (q.pdca && !Array.isArray(q.pdca)) ? q.pdca : {}); return q; });
  p.schemaVersion = '1.0';
  return p;
};

Nucleo.validar = function (p) {
  const e = [];
  if (!String(p.projeto.nome || '').trim()) e.push('Informe o nome do projeto (aba Projeto).');
  if (!String(p.projeto.codigo || '').trim()) e.push('Informe o código do projeto, ex.: PINV-2210.0006 (aba Projeto).');
  let validos = 0;
  (p.interessados || []).forEach((x) => {
    const em = String(x.email || '').trim();
    if (!em) return;
    if (!Nucleo.emailValido(em)) e.push(`E-mail de interessado inválido: "${em}".`); else validos++;
  });
  if (!validos) e.push('Cadastre ao menos um interessado com e-mail válido (aba Equipe e Interessados).');
  const outros = [p.projeto.coordenador.email, p.projeto.coordenadorAdjunto.email, ...p.projeto.equipe.map((m) => m.email)];
  p.areas.forEach((a) => (a.responsaveis || []).forEach((r) => outros.push(r.email)));
  outros.forEach((em) => { em = String(em || '').trim(); if (em && !Nucleo.emailValido(em)) e.push(`E-mail inválido: "${em}".`); });
  return [...new Set(e)];
};

// ================================================================== TRL
const PREFIXO_TIPO = { product: 'P', subsystem: 'S', assembly: 'A', component: 'C' };
Nucleo.NOME_TIPO = { product: 'Produto', subsystem: 'Subsistema', assembly: 'Montagem', component: 'Componente' };

/**
 * Converte o JSON exportado pela ferramenta oficial em árvore normalizada.
 * Não usa "id" nem "stringId" como chave (ambos se repetem): a chave é o caminho (P1/S2/A1/C3).
 */
Nucleo.importarTrl = function (bruto) {
  const alertas = [];
  if (bruto && !Array.isArray(bruto) && typeof bruto === 'object') bruto = [bruto];
  if (!Array.isArray(bruto) || !bruto.length) throw new Error('O arquivo não contém itens de produto (esperado um array JSON).');
  const conv = (no, pai, pos, nivel) => {
    const tipo = String(no.type || '');
    const chave = (pai ? pai + '/' : '') + (PREFIXO_TIPO[tipo] || 'N') + pos;
    const titulo = String(no.title || '').trim() || '(sem título)';
    let trl = null;
    const v = no.imatec;
    if (v !== '' && v !== null && !isNaN(v) && Number.isInteger(Number(v)) && +v >= 1 && +v <= 9) trl = +v;
    else alertas.push(`"${titulo}" (${chave}): nível de maturidade ausente ou inválido (${JSON.stringify(v)}) — marcado como não avaliado.`);
    const filhos = (Array.isArray(no.nodes) ? no.nodes : []).filter((f) => f && typeof f === 'object').map((f, k) => conv(f, chave, k + 1, nivel + 1));
    const vis = no.visibility ?? 'true';
    return {
      chave, idOriginal: no.id ?? null, stringId: String(no.stringId ?? ''), titulo, tipo, nivel,
      visivel: !(vis === false || vis === 'false'),
      keyTechItems: String(no.keyTechItems ?? ''), justification: String(no.justification ?? ''),
      implementationMethod: String(no.implementationMethod ?? ''), supplier: String(no.supplier ?? ''),
      trlInformado: trl, filhos,
      // campos internos do Angular ($$hashKey) são descartados
    };
  };
  const arvore = [];
  bruto.forEach((no, i) => {
    if (!no || typeof no !== 'object') { alertas.push(`Item raiz ${i + 1} ignorado (não é um objeto).`); return; }
    arvore.push(conv(no, '', i + 1, 0));
  });
  return { arvore, alertas };
};

/** TRL efetivo = min(TRL informado, TRL efetivo dos filhos): o elemento menos maduro limita o conjunto. */
Nucleo.calcularTrl = function (arvore) {
  const calc = (n) => {
    const filhos = (n.filhos || []).map(calc);
    const vals = filhos.map((f) => f.trlEfetivo).filter((x) => x !== null);
    const minF = vals.length ? Math.min(...vals) : null;
    const todos = [n.trlInformado, minF].filter((x) => x !== null && x !== undefined);
    return Object.assign({}, n, {
      filhos, trlMinFilhos: minF, trlEfetivo: todos.length ? Math.min(...todos) : null,
      divergente: n.trlInformado !== null && minF !== null && n.trlInformado !== minF,
    });
  };
  return (arvore || []).map(calc);
};

Nucleo.achatar = function (arvore) {
  const out = {};
  const rec = (nos) => nos.forEach((n) => { const c = Object.assign({}, n, { folha: !(n.filhos || []).length }); delete c.filhos; out[n.chave] = c; rec(n.filhos || []); });
  rec(arvore || []);
  return out;
};

Nucleo.diffTrl = function (antiga, nova) {
  const a = Nucleo.achatar(antiga), n = Nucleo.achatar(nova);
  const porTitulo = {};
  Object.values(a).forEach((x) => (porTitulo[x.titulo.toLowerCase()] ??= []).push(x.chave));
  const usadas = new Set(), novos = [], alterados = [];
  Object.values(n).forEach((x) => {
    let ka = (a[x.chave] && a[x.chave].titulo.toLowerCase() === x.titulo.toLowerCase()) ? x.chave : null;
    if (!ka) ka = (porTitulo[x.titulo.toLowerCase()] || []).find((c) => !usadas.has(c)) || null;
    if (!ka && a[x.chave]) ka = x.chave;
    if (!ka) { novos.push({ chave: x.chave, titulo: x.titulo, trl: x.trlInformado }); return; }
    usadas.add(ka);
    if (a[ka].trlInformado !== x.trlInformado) {
      alterados.push({ chave: x.chave, titulo: x.titulo, de: a[ka].trlInformado, para: x.trlInformado, sentido: (x.trlInformado || 0) > (a[ka].trlInformado || 0) ? 'subiu' : 'caiu' });
    }
  });
  const removidos = Object.values(a).filter((x) => !usadas.has(x.chave)).map((x) => ({ chave: x.chave, titulo: x.titulo, trl: x.trlInformado }));
  return { novos, removidos, alterados };
};

/** Após reimportar: mantém o vínculo da área se o título bater; senão procura pelo título salvo. */
Nucleo.revincularAreas = function (areas, novaArvore) {
  const flat = Nucleo.achatar(novaArvore);
  const porTitulo = {};
  Object.values(flat).forEach((x) => (porTitulo[x.titulo.toLowerCase()] ??= []).push(x.chave));
  return (areas || []).map((ar) => {
    ar = Object.assign({}, ar);
    delete ar.vinculoPerdido;
    const k = String(ar.noImatec || ''), tit = String(ar.noImatecTitulo || '').toLowerCase();
    if (k && flat[k] && (!tit || flat[k].titulo.toLowerCase() === tit)) { ar.noImatecTitulo = flat[k].titulo; return ar; }
    if (tit && porTitulo[tit]) { ar.noImatec = porTitulo[tit][0]; return ar; }
    if (k && !flat[k]) ar.vinculoPerdido = true;
    return ar;
  });
};

// ================================================================== análise
Nucleo.risco = function (p, i) {
  const n = Math.max(1, Math.min(5, +p || 1)) * Math.max(1, Math.min(5, +i || 1));
  const classe = n >= 15 ? 'vermelho' : n >= 10 ? 'laranja' : n >= 5 ? 'amarelo' : 'verde';
  return { nivel: n, classe, rotulo: { vermelho: 'Crítico', laranja: 'Alto', amarelo: 'Moderado', verde: 'Baixo' }[classe] };
};

const diasEntre = (ini, fim) => {
  const a = Date.parse(ini), b = Date.parse(fim);
  if (isNaN(a) || isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};

Nucleo.cpm = function (ativs) {
  const res = { atividades: {}, duracao: 0, caminho: [], erro: null };
  const ids = Object.keys(ativs);
  if (!ids.length) return res;
  const preds = {}, succ = {}, grau = {};
  ids.forEach((id) => { succ[id] = []; });
  ids.forEach((id) => { preds[id] = (ativs[id].dependeDe || []).filter((d) => ativs[d] && d !== id); grau[id] = preds[id].length; });
  ids.forEach((id) => preds[id].forEach((p) => succ[p].push(id)));
  const fila = ids.filter((id) => grau[id] === 0), ordem = [];
  while (fila.length) { const n = fila.shift(); ordem.push(n); succ[n].forEach((s) => { if (--grau[s] === 0) fila.push(s); }); }
  if (ordem.length !== ids.length) { res.erro = 'Dependência circular entre atividades do cronograma: o caminho crítico não pôde ser calculado.'; return res; }
  const es = {}, ef = {}, ls = {}, lf = {};
  ordem.forEach((id) => { es[id] = Math.max(0, ...preds[id].map((p) => ef[p])); ef[id] = es[id] + ativs[id].duracao; });
  const dur = Math.max(...Object.values(ef));
  [...ordem].reverse().forEach((id) => { lf[id] = Math.min(dur, ...succ[id].map((s) => ls[s])); ls[id] = lf[id] - ativs[id].duracao; });
  ordem.forEach((id) => {
    const folga = ls[id] - es[id];
    res.atividades[id] = { es: es[id], ef: ef[id], ls: ls[id], lf: lf[id], folga, critica: folga === 0 };
    if (folga === 0) res.caminho.push(ativs[id].codigo);
  });
  res.duracao = dur;
  return res;
};

/** Indicadores do projeto: uma única fonte para a tela, o e-mail e os PDFs. */
Nucleo.analisar = function (p) {
  const hoje = Nucleo.hoje(), alertas = [];
  const ativs = {}, macros = [];
  p.macroentregas.forEach((m, mi) => {
    const num = mi + 1;
    let peso = 0, soma = 0;
    m.atividades.forEach((a, ai) => {
      const d = diasEntre(a.inicio, a.fim);
      const pct = Math.max(0, Math.min(100, +a.percentual || 0));
      peso += d; soma += d * pct;
      ativs[a.id] = { id: a.id, codigo: `${num}.${ai + 1}`, macro: num, nome: a.nome, responsavel: a.responsavel, inicio: a.inicio, fim: a.fim,
        duracao: d, percentual: pct, dependeDe: [...(a.dependeDe || [])], atrasada: !!(a.fim && a.fim < hoje && pct < 100), area: a.area || '' };
    });
    const pctM = peso > 0 ? Math.round(soma / peso * 10) / 10 : (+m.percentualConcluido || 0);
    let status = m.status;
    if (m.aceite && m.aceite.aceito) status = 'aceita';
    const atrasada = !['concluída', 'aceita'].includes(status) && !!m.dataPrevista && m.dataPrevista < hoje;
    if (atrasada) status = 'atrasada';
    macros.push({ uid: m.uid, numero: num, titulo: m.titulo, dataInicio: m.dataInicio || '', dataPrevista: m.dataPrevista, dataEntrega: m.dataEntrega,
      status, percentual: pctM, automatico: peso > 0, aceito: !!(m.aceite && m.aceite.aceito), trlEsperado: +m.trlEsperado || null, atrasada });
  });
  const pctGeral = macros.length ? Math.round(macros.reduce((s, m) => s + m.percentual, 0) / macros.length * 10) / 10 : 0;

  const cpm = Nucleo.cpm(ativs);
  Object.entries(cpm.atividades).forEach(([id, c]) => Object.assign(ativs[id], c));
  if (cpm.erro) alertas.push(cpm.erro);

  // TRL
  const arvore = Nucleo.calcularTrl(p.trl.arvore || []);
  const flat = Nucleo.achatar(arvore);
  const raizes = arvore.map((r) => r.trlEfetivo).filter((x) => x !== null);
  const trlSistema = raizes.length ? Math.min(...raizes) : null;
  const coord = p.projeto.coordenador || { nome: '', email: '' };
  const areas = p.areas.map((ar) => {
    const k = String(ar.noImatec || ''), no = k ? flat[k] : null;
    const resp = (ar.responsaveis || []).filter((r) => String((r.nome || '') + (r.email || '')).trim());
    const atual = no ? no.trlEfetivo : null, esp = +ar.trlEsperado || null;
    if (k && !no) alertas.push(`Área "${ar.nome}" está vinculada a um item que não existe mais na árvore TRL.`);
    return { id: ar.id, nome: ar.nome, no: k, noTitulo: no ? no.titulo : (ar.noImatecTitulo || ''), vinculado: !!no,
      trlAtual: atual ?? null, trlEsperado: esp, gap: (atual !== null && atual !== undefined && esp) ? esp - atual : null, responsaveis: resp };
  });
  const areaDoNo = (chave) => {
    let melhor = null;
    areas.forEach((a) => { if (a.vinculado && (chave === a.no || chave.startsWith(a.no + '/')) && (!melhor || a.no.length > melhor.no.length)) melhor = a; });
    return melhor;
  };
  const comTrl = areas.filter((a) => a.trlAtual !== null);
  const minArea = comTrl.length ? Math.min(...comTrl.map((a) => a.trlAtual)) : null;
  const pontos = comTrl.filter((a) => a.trlAtual === minArea).map((a) => Object.assign({}, a, {
    cobrar: a.responsaveis.length ? a.responsaveis : [Object.assign({}, coord, { observacao: 'área sem responsável — cobrar coordenação' })] }));
  const comNo = Object.values(flat).filter((n) => n.trlInformado !== null);
  const minNo = comNo.length ? Math.min(...comNo.map((n) => n.trlInformado)) : null;
  const nosBaixos = comNo.filter((n) => n.trlInformado === minNo)
    .filter((n) => !comNo.some((o) => o.chave.startsWith(n.chave + '/') && o.trlInformado === minNo)) // só a origem do gargalo
    .map((n) => {
      const a = areaDoNo(n.chave);
      return { chave: n.chave, titulo: n.titulo, tipo: Nucleo.NOME_TIPO[n.tipo] || n.tipo, trl: n.trlInformado, area: a ? a.nome : null,
        responsaveis: a ? a.responsaveis : [],
        cobrar: (a && a.responsaveis.length) ? a.responsaveis : [Object.assign({}, coord, { observacao: 'sem área vinculada — cobrar coordenação' })] };
    });
  const maiorGap = areas.filter((a) => (a.gap || 0) > 0).sort((x, y) => y.gap - x.gap);
  const macroAtual = macros.find((m) => !['concluída', 'aceita'].includes(m.status)) || null;
  const esperadoEtapa = macroAtual ? macroAtual.trlEsperado : (macros.length ? macros[macros.length - 1].trlEsperado : null);

  const riscos = p.riscos.map((r) => Object.assign({}, r, Nucleo.risco(r.probabilidade, r.impacto)));
  const riscosAltos = riscos.filter((r) => r.nivel >= 10 && (r.status || 'aberto') !== 'fechado').sort((a, b) => b.nivel - a.nivel);

  macros.forEach((m) => { if (m.atrasada) alertas.push(`Macroentrega ${m.numero} atrasada (prevista para ${Nucleo.dataBR(m.dataPrevista)}).`); });
  const nAtr = Object.values(ativs).filter((a) => a.atrasada).length;
  if (nAtr) alertas.push(`${nAtr} atividade(s) atrasada(s) no cronograma.`);

  return {
    hoje, percentualGeral: pctGeral, macroentregas: macros, macroAtual, atividades: Object.values(ativs),
    cpm: { duracao: cpm.duracao, caminho: cpm.caminho, erro: cpm.erro },
    trl: {
      arvore, sistema: trlSistema, esperadoFinal: +p.projeto.trlEsperadoFinal || null, esperadoEtapa, areas,
      pontosVerificacao: pontos, nosMaisBaixos: nosBaixos, maiorGap,
      divergentes: Object.values(flat).filter((n) => n.divergente).map((n) => ({ chave: n.chave, titulo: n.titulo, informado: n.trlInformado, minFilhos: n.trlMinFilhos })),
      temDados: Object.keys(flat).length > 0,
    },
    riscos, riscosAltos, alertas,
  };
};

// ================================================================== Gantt (SVG)
const escX = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
Nucleo.ganttSvg = function (an, largura = 1000) {
  const at = an.atividades.filter((a) => a.inicio && a.fim && !isNaN(Date.parse(a.inicio)) && !isNaN(Date.parse(a.fim)));
  const fonte = 'font-family="Roboto, Segoe UI, Arial, sans-serif"';
  if (!at.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="60" ${fonte}><text x="10" y="35" font-size="13" fill="#555">Cadastre atividades com data de início e fim para gerar o Gantt.</text></svg>`;
  const t = (d) => Date.parse(d + 'T00:00:00');
  const ini = Math.min(...at.map((a) => t(a.inicio))), fim = Math.max(...at.map((a) => t(a.fim))) + 86400000;
  const hoje = t(an.hoje);
  const colNome = 260, alt = 22, topo = 34, area = largura - colNome - 45;
  const esc = area / Math.max(1, fim - ini), h = topo + at.length * alt + 30;
  const x = (tt) => colNome + (tt - ini) * esc;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${h}" viewBox="0 0 ${largura} ${h}" ${fonte}><rect x="0" y="0" width="${largura}" height="${h}" fill="#ffffff"/>`;
  const d0 = new Date(ini); let m = new Date(d0.getFullYear(), d0.getMonth(), 1);
  while (m.getTime() < fim) {
    const xx = Math.max(colNome, x(m.getTime()));
    s += `<line x1="${xx.toFixed(1)}" y1="${topo - 6}" x2="${xx.toFixed(1)}" y2="${h - 24}" stroke="#e3e8e8" stroke-width="1"/>`;
    s += `<text x="${(xx + 3).toFixed(1)}" y="${topo - 12}" font-size="10" fill="#235959">${String(m.getMonth() + 1).padStart(2, '0')}/${String(m.getFullYear()).slice(2)}</text>`;
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  }
  at.forEach((a, i) => {
    const y = topo + i * alt;
    if (i % 2 === 0) s += `<rect x="0" y="${y}" width="${largura}" height="${alt}" fill="#f4f8f7"/>`;
    let nome = `${a.codigo} ${a.nome || ''}`; if (nome.length > 42) nome = nome.slice(0, 41) + '…';
    s += `<text x="6" y="${y + 15}" font-size="11" fill="${a.atrasada ? '#b3261e' : '#1d2b2b'}">${escX(nome)}</text>`;
    const x1 = x(t(a.inicio)), x2 = x(t(a.fim) + 86400000), w = Math.max(3, x2 - x1);
    const borda = a.critica ? ' stroke="#085357" stroke-width="2"' : '';
    s += `<rect x="${x1.toFixed(1)}" y="${y + 4}" width="${w.toFixed(1)}" height="${alt - 8}" rx="3" fill="${a.atrasada ? '#e57373' : '#9fd0c3'}"${borda}/>`;
    const wp = w * a.percentual / 100;
    if (wp > 0) s += `<rect x="${x1.toFixed(1)}" y="${y + 4}" width="${wp.toFixed(1)}" height="${alt - 8}" rx="3" fill="${a.atrasada ? '#b3261e' : '#409580'}"/>`;
    s += `<text x="${(x1 + w + 4).toFixed(1)}" y="${y + 15}" font-size="9" fill="#555">${Math.round(a.percentual)}%</text>`;
  });
  if (hoje >= ini && hoje <= fim) {
    const xh = x(hoje).toFixed(1);
    s += `<line x1="${xh}" y1="${topo - 6}" x2="${xh}" y2="${h - 24}" stroke="#b3261e" stroke-width="1.5" stroke-dasharray="4,3"/><text x="${(+xh + 3).toFixed(1)}" y="${h - 12}" font-size="10" fill="#b3261e">hoje</text>`;
  }
  const ly = h - 12;
  s += `<rect x="6" y="${ly - 9}" width="14" height="10" fill="#9fd0c3" stroke="#085357" stroke-width="2"/><text x="24" y="${ly}" font-size="10" fill="#333">caminho crítico</text>`;
  s += `<rect x="120" y="${ly - 9}" width="14" height="10" fill="#e57373"/><text x="138" y="${ly}" font-size="10" fill="#333">atrasada</text>`;
  s += `<rect x="200" y="${ly - 9}" width="14" height="10" fill="#409580"/><text x="218" y="${ly}" font-size="10" fill="#333">concluído</text>`;
  return s + '</svg>';
};

/** Figuras e tabelas: numeração por seção do relatório e depois pela ordem da lista. */
Nucleo.SECOES = [['introducao', 'Introdução'], ['objetivos', 'Objetivos da etapa'], ['resultados', 'Resultados'], ['conclusao', 'Conclusão'], ['etapasFuturas', 'Etapas futuras']];
Nucleo.numerarAbnt = function (macros, contador = { f: 0, t: 0 }) {
  const fig = {}, tab = {}, listaF = [], listaT = [];
  macros.forEach((m) => Nucleo.SECOES.forEach(([s]) => {
    (m.figuras || []).forEach((f) => { if ((f.secao || 'resultados') === s && !(f.id in fig)) { fig[f.id] = ++contador.f; listaF.push({ n: fig[f.id], titulo: f.titulo, macro: m.numero }); } });
    (m.tabelas || []).forEach((x) => { if ((x.secao || 'resultados') === s && !(x.id in tab)) { tab[x.id] = ++contador.t; listaT.push({ n: tab[x.id], titulo: x.titulo, macro: m.numero }); } });
  }));
  return { fig, tab, listaF, listaT };
};

Nucleo.figurasReferenciadas = (p) => {
  const out = [];
  p.macroentregas.forEach((m) => (m.figuras || []).forEach((f) => out.push({ macro: m.numero, arquivo: f.arquivo, titulo: f.titulo })));
  return out;
};
