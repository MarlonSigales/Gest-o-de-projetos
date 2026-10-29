/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/* Núcleo de regras (roda no navegador): modelo do projeto, validação, TRL, análise (percentuais, CPM, riscos) e Gantt em SVG. */
'use strict';

const Nucleo = {};
const PREFIXO_ARQ = 'gestão do projeto ';

Nucleo.hoje = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
Nucleo.agoraIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19); };
Nucleo.dataBR = (iso) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso)) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : (iso || '');
Nucleo.uid = (pref) => pref + '_' + Math.random().toString(16).slice(2, 10);
// ------------------------------------------------------------------ texto (Markdown básico), usado no PDF e na prévia
/** Linhas → blocos: títulos (#), listas (-, *, • ou 1.), parágrafos (linha em branco separa). Listas e parágrafos podem se alternar sem linha em branco. */
Nucleo.mdBlocos = function (txt) {
  const out = [];
  let par = null, lista = null;
  String(txt || '').replace(/\r/g, '').split('\n').forEach((bruta) => {
    const l = bruta.replace(/\s+$/, '');
    let m;
    if (!l.trim()) { par = null; lista = null; return; }
    if ((m = l.match(/^\s*(#{1,6})\s+(.*)$/))) { par = null; lista = null; out.push({ tipo: 'h', nivel: Math.min(3, m[1].length), texto: m[2].replace(/\s+#+$/, '') }); return; }
    if ((m = l.match(/^\s*[-•*]\s+(.*)$/))) { par = null; if (!lista || lista.tipo !== 'ul') { lista = { tipo: 'ul', itens: [] }; out.push(lista); } lista.itens.push(m[1]); return; }
    if ((m = l.match(/^\s*(\d{1,3})[.)]\s+(.*)$/))) { par = null; if (!lista || lista.tipo !== 'ol') { lista = { tipo: 'ol', itens: [], inicio: +m[1] }; out.push(lista); } lista.itens.push(m[2]); return; }
    if (lista && /^\s{2,}\S/.test(bruta)) { lista.itens[lista.itens.length - 1] += ' ' + l.trim(); return; } // continuação recuada do item
    lista = null;
    if (!par) { par = { tipo: 'p', linhas: [] }; out.push(par); }
    par.linhas.push(l.trim());
  });
  return out;
};
/** Trechos com **negrito** e *itálico* → [{t, b, i}]. Asteriscos soltos ficam como estão. */
Nucleo.mdInline = function (s) {
  const out = [];
  String(s).split(/(\*\*(?=\S)[^\n]*?\S\*\*|\*(?=[^\s*])(?:[^*\n]*[^\s*])?\*)/g).forEach((pt) => {
    if (!pt) return;
    if (/^\*\*\S[\s\S]*\*\*$/.test(pt) && pt.length > 4) out.push(...Nucleo.mdInline(pt.slice(2, -2)).map((x) => Object.assign(x, { b: true })));
    else if (/^\*[^*][\s\S]*\*$|^\*[^\s*]\*$/.test(pt) && pt.length > 2) out.push({ t: pt.slice(1, -1), b: false, i: true });
    else out.push({ t: pt, b: false, i: false });
  });
  return out;
};
/** {{fig:id}} / {{tab:id}} → "Figura N" / "Tabela N"; {{ref:código}} → "(AUTOR, ano)" e marca a obra como citada. */
Nucleo.trocarRefs = (s, num) => String(s).replace(/\{\{(fig|tab|ref):([A-Za-z0-9_:.-]+)\}\}/g, (_, t, id) => {
  if (t === 'ref') {
    const r = num && num.refs && num.refs.get(id);
    if (!r || !window.Pesquisa) return '[referência não encontrada]';
    if (num.citadas) num.citadas.add(id);
    return Pesquisa.citacao(r);
  }
  const n = num && (t === 'fig' ? num.fig[id] : num.tab[id]);
  return n ? (t === 'fig' ? 'Figura ' : 'Tabela ') + n : (t === 'fig' ? '[figura não encontrada]' : '[tabela não encontrada]');
});
/** Cópia profunda (structuredClone não existe no Safari anterior ao 15.4). */
Nucleo.clonar = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
Nucleo.emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
Nucleo.nomeSeguro = (n) => (String(n || '').replace(/[\\/:*?"<>|\x00-\x1F]+/g, '').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '').slice(0, 120)) || 'sem nome';
Nucleo.slug = (t) => (String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)) || 'projeto';
Nucleo.nomeArquivo = (p) => PREFIXO_ARQ + Nucleo.nomeSeguro(p.projeto.nome) + '.json';

// ================================================================== modelo
/**
 * Versão do projeto, escolhida ao criá-lo (pode ser trocada em ⚙ Configurações sem perder dados):
 * - completa: projeto de produto/serviço pelo NeDIP (com a análise econômica na fase de lançamento) e pesquisa;
 * - simplificada: só especificações, funções e desdobramento (aba Especificações e funções) para acompanhar TRL e qualidade.
 * Projetos antigos (sem o campo) são completos.
 */
Nucleo.VERSOES = [['completa', 'Completa'], ['simplificada', 'Simplificada']];
Nucleo.simplificado = (p) => !!(p && p.config && p.config.versao === 'simplificada');

Nucleo.novo = function (nome = '', versao = 'completa') {
  const simp = versao === 'simplificada';
  return {
    schemaVersion: '1.0',
    id: Nucleo.uid('prj'),
    projeto: {
      nome, codigo: '', unidadeEmbrapii: CONFIG.unidade.nome, empresaParceira: '', responsavelEmpresa: '',
      endereco: 'Av. Eliseu Maciel, Capão do Leão – RS', ano: new Date().getFullYear(), dataInicio: '', dataFimPrevista: '',
      coordenador: { nome: '', email: '' }, coordenadorAdjunto: { nome: '', email: '' }, equipe: [],
      introducao: '', objetivoGeral: '', trlEsperadoFinal: 6,
      aditivos: [],            // termos aditivos/subtrativos de prazo
    },
    gruposEmail: Nucleo.gruposPadrao(),
    interessados: [], areas: [], macroentregas: (simp ? Nucleo.MACROS_SIMPLES : Nucleo.MACROS_PADRAO).map((t, i) => Object.assign(Nucleo.novaMacro(i + 1), { titulo: t })), // no mínimo 4, uma por fase
    riscos: [], qualidade: [], qfdOrigem: { arquivo: '', importadoEm: '', requisitosProjeto: 0, requisitosCliente: 0, schemaVersion: null },
    qfdDados: null,          // backup completo do sistema QFD (para o relatório da casa da qualidade)
    pesquisa: window.pesquisaNormalizar ? window.pesquisaNormalizar({}) : { estrategia: {}, patentes: [], referencias: [] }, // anterioridade e referências
    dfx: window.dfxNormalizar ? window.dfxNormalizar({}) : { condicaoTeste: '', itens: [] }, licoesAprendidas: [],
    trl: { ultimaImportacao: '', arquivoOrigem: '', arvore: [], historico: [] },
    produto: window.nedipNormalizar ? window.nedipNormalizar({}) : { tipo: 'produto', etapas: {} },
    config: {
      versao: simp ? 'simplificada' : 'completa',
      incluirAndamentoNaMacro: true,
      nedipRelatorio: simp ? ['funcoes', 'desdobramento'] : ['fases', 'funcoes', 'economia'], // seções do projeto de produto no relatório geral de andamento
      qfdRelatorio: window.Qfd ? Qfd.SECOES.map(([s]) => s) : [], // seções do QFD no relatório geral de andamento
      baixarAoSalvar: 'auto',
      email: { modo: 'mailto', emailjsServico: '', emailjsModelo: '', emailjsChave: '', limiteAnexoKb: 45, gerarPdfsAoSalvar: true },
    },
    log: [],
  };
};

Nucleo.gruposPadrao = () => [
  { id: 'gestao', nome: 'Gestão', gestao: true },
  { id: 'equipe', nome: 'Equipe técnica', gestao: false },
  { id: 'empresa', nome: 'Empresa parceira', gestao: false },
];

Nucleo.novaMacro = function (numero) {
  return {
    uid: Nucleo.uid('me'), numero, titulo: '', descricao: '', dataInicio: '', dataPrevista: '', dataEntrega: '',
    status: 'planejada', percentualConcluido: 0, trlEsperado: 4, areas: [], objetivosEtapa: [],
    resultados: '', conclusao: '', etapasFuturas: '', atividades: [], figuras: [], tabelas: [],
    blocos: [],              // desenvolvimento em blocos (texto, capítulos, figuras, tabelas, QFD, questionário)
    relatorios: [],          // histórico de relatórios de andamento (cópias do texto no dia em que foram gerados)
    finalizada: false,       // false: o texto gera relatórios de andamento; true: gera o relatório da macroentrega (com aceite)
    andamento: { periodoInicio: '', periodoFim: '' }, // período do próximo relatório de andamento
    aceite: { dataAceite: '', nomeResponsavelEmpresa: '', aceito: false },
  };
};

/** Blocos do desenvolvimento da macroentrega (editor no estilo de caderno). */
Nucleo.TIPOS_BLOCO = {
  texto: () => ({ texto: '' }),
  titulo: () => ({ titulo: '', nivel: 1 }),
  figura: () => ({ ref: '' }),
  tabela: () => ({ ref: '' }),
  qfd: () => ({ titulo: 'Análise QFD – casa da qualidade', secoes: window.Qfd ? Qfd.SECOES.map(([s]) => s) : [] }),
  questionario: () => ({ titulo: 'Questionário aos clientes – resultados', partes: ['identificacao', 'destaques', 'graficos', 'consolidacao'] }),
  nedip: () => ({ titulo: 'Projeto do produto', secoes: ['ciclo', 'concorrentes', 'normas', 'funcoes'] }),
  pesquisa: () => ({ titulo: 'Busca de anterioridade', partes: ['estrategia', 'patentes', 'sintese'] }),
  quebra: () => ({}),
};
Nucleo.novoBloco = (tipo) => Object.assign({ id: Nucleo.uid('bl'), tipo }, (Nucleo.TIPOS_BLOCO[tipo] || Nucleo.TIPOS_BLOCO.texto)());
Nucleo.normalizarBlocos = (l) => (Array.isArray(l) ? l : []).filter((b) => b && typeof b === 'object').map((b) => {
  const tipo = Nucleo.TIPOS_BLOCO[b.tipo] ? b.tipo : 'texto';
  const x = Object.assign({ id: Nucleo.uid('bl') }, Nucleo.TIPOS_BLOCO[tipo](), b, { tipo });
  if (tipo === 'titulo') x.nivel = [1, 2, 3].includes(+x.nivel) ? +x.nivel : 1;
  if ((tipo === 'qfd' || tipo === 'nedip') && !Array.isArray(x.secoes)) x.secoes = [];
  if ((tipo === 'questionario' || tipo === 'pesquisa') && !Array.isArray(x.partes)) x.partes = [];
  return x;
});
/** Ids de figuras/tabelas posicionadas por blocos (não vão para a seção "Resultados" como anexos soltos). */
Nucleo.refsBlocos = (m) => {
  const fig = new Set(), tab = new Set();
  const ver = (l) => (l || []).forEach((b) => { if (b.tipo === 'figura' && b.ref) fig.add(b.ref); if (b.tipo === 'tabela' && b.ref) tab.add(b.ref); });
  ver(m.blocos);
  (m.relatorios || []).forEach((r) => ver(r.blocos)); // as dos relatórios intermediários também não são "soltas"
  return { fig, tab };
};
/** Macroentrega "vista" por uma lista de blocos (relatório intermediário): só as figuras e tabelas dessa lista. */
Nucleo.macroDaLista = (m, blocos) => {
  if (!blocos || blocos === m.blocos) return m;
  const refs = Nucleo.refsBlocos({ blocos });
  return { uid: m.uid, numero: m.numero, titulo: m.titulo, figuras: (m.figuras || []).filter((f) => refs.fig.has(f.id)), tabelas: (m.tabelas || []).filter((t) => refs.tab.has(t.id)), blocos };
};
/** Relatórios de andamento entre macroentregas. */
Nucleo.novoRelatorio = (n) => ({ id: Nucleo.uid('ri'), titulo: `Relatório de andamento ${n}`, data: Nucleo.hoje(), periodoInicio: '', periodoFim: '', blocos: [], gerado: '' });
/**
 * Figuras e tabelas só existem dentro de blocos (sempre com o texto que as explica). Projetos antigos: o texto de
 * "Resultados" e as figuras/tabelas soltas viram blocos no início do desenvolvimento, na ordem em que saíam no PDF.
 */
Nucleo.migrarSoltas = function (m) {
  const refs = Nucleo.refsBlocos(m), novos = [];
  if (String(m.resultados || '').trim()) { novos.push(Object.assign(Nucleo.novoBloco('texto'), { texto: m.resultados })); m.resultados = ''; }
  Nucleo.SECOES.forEach(([sec]) => {
    (m.figuras || []).forEach((f) => { if ((f.secao || 'resultados') === sec && !refs.fig.has(f.id)) novos.push(Object.assign(Nucleo.novoBloco('figura'), { ref: f.id })); });
    (m.tabelas || []).forEach((t) => { if ((t.secao || 'resultados') === sec && !refs.tab.has(t.id)) novos.push(Object.assign(Nucleo.novoBloco('tabela'), { ref: t.id })); });
  });
  if (novos.length) m.blocos = novos.concat(m.blocos);
};
/** Numeração com o projeto (as figuras geradas pelo sistema — gráficos do questionário, diagrama de funções — entram na conta). */
Nucleo.numerar = (p, macros, contador) => Nucleo.numerarAbnt(macros, contador, { p });

/** Macroentregas iniciais de um projeto novo: uma por fase da projetação (o usuário renomeia, inclui ou remove). */
Nucleo.MACROS_PADRAO = ['Projeto informacional – necessidades e especificações', 'Projeto conceitual – funções e concepção',
  'Projeto preliminar – protótipo e ensaios', 'Projeto detalhado – documentação e validação'];
/** Versão simplificada: duas macroentregas — o desenvolvimento das funções e a integração (o usuário pode incluir outras). */
Nucleo.MACROS_SIMPLES = ['Desenvolvimento das funções', 'Integração, testes e entrega']; // funções na 1ª; integração e testes na última
/** Seções do projeto de produto por fase: [fase NeDIP, título do bloco, seções]. */
Nucleo.NEDIP_GRUPOS = [
  ['informacional', 'Projeto do produto – fase informacional', ['planejamento', 'ciclo', 'necessidades', 'concorrentes', 'normas']],
  ['conceitual', 'Projeto do produto – fase conceitual', ['funcoes', 'desdobramento', 'concepcoes']],
  ['preliminar', 'Projeto do produto – fase preliminar', ['preliminar']],
  ['detalhado', 'Projeto do produto – fase detalhada', ['detalhado']],
];
/**
 * Pré-marca as seções do projeto de produto nas macroentregas (uma vez por projeto): com 4 ou mais macroentregas,
 * fase informacional na 1ª, conceitual na 2ª, preliminar na 3ª e detalhada na última; com menos, distribui proporcionalmente.
 * Também liga as fases NeDIP às macroentregas, se ainda não estiverem ligadas.
 */
Nucleo.preMarcarNedip = function (p) {
  if (!p.config || p.config.nedipPreMarcado || Nucleo.simplificado(p)) return; // na simplificada não há fases NeDIP para distribuir
  p.config.nedipPreMarcado = true;
  const ms = p.macroentregas, n = ms.length;
  if (!n || ms.some((m) => (m.blocos || []).some((b) => b.tipo === 'nedip'))) return; // já escolhido pelo usuário
  Nucleo.NEDIP_GRUPOS.forEach(([fase, titulo, secoes], g) => {
    const mi = n >= 4 ? (g === 3 ? n - 1 : g) : Math.round(g * (n - 1) / 3), m = ms[mi];
    let b = m.blocos.find((x) => x.tipo === 'nedip');
    if (b) b.secoes = b.secoes.concat(secoes.filter((s) => !b.secoes.includes(s)));
    else m.blocos.push(Object.assign(Nucleo.novoBloco('nedip'), { titulo, secoes: secoes.slice() }));
    const e = p.produto && p.produto.etapas && p.produto.etapas[fase];
    if (e && !e.macros.length) e.macros = [m.uid];
    if (fase === 'informacional' && p.produto.etapas.planejamento && !p.produto.etapas.planejamento.macros.length) p.produto.etapas.planejamento.macros = [m.uid];
  });
};

function mesclar(base, dados) {
  for (const k of Object.keys(base)) {
    const v = base[k];
    if (!(k in dados) || dados[k] === null || dados[k] === undefined) { dados[k] = Nucleo.clonar(v); continue; }
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof dados[k] === 'object' && !Array.isArray(dados[k])) dados[k] = mesclar(v, dados[k]);
    if (Array.isArray(v) && !Array.isArray(dados[k])) dados[k] = Nucleo.clonar(v);
  }
  return dados;
}

/** Completa campos ausentes (projetos antigos/importados), sem apagar nada. */
Nucleo.normalizar = function (p) {
  p = mesclar(Nucleo.novo(), p || {});
  if (!Nucleo.VERSOES.some(([v]) => v === p.config.versao)) p.config.versao = 'completa';
  p.macroentregas = p.macroentregas.map((m, i) => {
    const finSalvo = m && typeof m.finalizada === 'boolean' ? m.finalizada : null; // projetos antigos não têm o campo
    m = mesclar(Nucleo.novaMacro(i + 1), m || {});
    m.numero = i + 1;
    m.atividades = m.atividades.map((a) => mesclar({ id: Nucleo.uid('at'), nome: '', responsavel: '', inicio: '', fim: '', dependeDe: [], percentual: 0, area: '' }, a || {}));
    // seção desconhecida faria a figura/tabela sumir do PDF: cai em "Resultados"
    const secOk = (x) => { if (!Nucleo.SECOES.some(([s]) => s === x.secao)) x.secao = 'resultados'; return x; };
    m.figuras = m.figuras.map(secOk); m.tabelas = m.tabelas.map(secOk);
    m.blocos = Nucleo.normalizarBlocos(m.blocos);
    m.relatorios = (Array.isArray(m.relatorios) ? m.relatorios : []).filter((r) => r && typeof r === 'object')
      .map((r, k) => { const x = Object.assign(Nucleo.novoRelatorio(k + 1), r, { blocos: Nucleo.normalizarBlocos(r.blocos) }); delete x.enviar; return x; });
    m.finalizada = finSalvo !== null ? finSalvo : (['concluída', 'aceita'].includes(m.status) || !!(m.aceite && m.aceite.aceito));
    Nucleo.migrarSoltas(m);
    return m;
  });
  if (p.qfdDados && (typeof p.qfdDados !== 'object' || !Array.isArray(p.qfdDados.requisitosProjeto))) p.qfdDados = null;
  if (!p.gruposEmail.some((g) => g.gestao)) p.gruposEmail.unshift({ id: 'gestao', nome: 'Gestão', gestao: true });
  const idsGrupo = new Set(p.gruposEmail.map((g) => g.id));
  p.interessados = p.interessados.map((i) => Object.assign({ nome: '', email: '', papel: '', grupos: [] }, i, { grupos: (Array.isArray(i.grupos) ? i.grupos : []).filter((g) => idsGrupo.has(g)) }));
  p.projeto.aditivos = (p.projeto.aditivos || []).map((a) => Object.assign({ id: Nucleo.uid('ad'), tipo: 'aditivo', quantidade: 0, unidade: 'meses', numero: '', dataTermo: '', justificativa: '' }, a));
  if (window.dfxNormalizar) p.dfx = window.dfxNormalizar(p.dfx);
  if (window.nedipNormalizar) p.produto = window.nedipNormalizar(p.produto);
  if (window.pesquisaNormalizar) p.pesquisa = window.pesquisaNormalizar(p.pesquisa);
  p.trl.arvore = Nucleo.normalizarArvore(p.trl.arvore || []);
  p.trl.historico = Array.isArray(p.trl.historico) ? p.trl.historico : [];
  p.qualidade = p.qualidade.map((q) => { q.id = q.id || (q.qfd && q.qfd.id ? 'qfd_' + q.qfd.id : Nucleo.uid('q')); q.aspectosIndesejaveis = q.aspectosIndesejaveis || ''; q.valorMedido = q.valorMedido || ''; q.pdca = Object.assign({ planejar: '', executar: '', verificar: '', agir: '' }, (q.pdca && !Array.isArray(q.pdca)) ? q.pdca : {}); return q; });
  Nucleo.preMarcarNedip(p);
  p.schemaVersion = '1.0';
  return p;
};

Nucleo.validar = function (p) {
  const e = [];
  if (!String(p.projeto.nome || '').trim()) e.push('Informe o nome do projeto (aba Projeto).');
  if (!String(p.projeto.codigo || '').trim() && !Nucleo.simplificado(p)) e.push('Informe o código do projeto, ex.: PINV-2210.0006 (aba Projeto).'); // na simplificada é opcional
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

// ================================================================== vigência (aditivos / subtrativos)
const somarPrazo = (iso, qtd, unidade, sinal) => {
  if (!iso || isNaN(Date.parse(iso))) return iso;
  const d = new Date(iso + 'T12:00:00');
  const q = sinal * (Math.abs(+qtd) || 0);
  if (unidade === 'dias') d.setDate(d.getDate() + q); else d.setMonth(d.getMonth() + q);
  return d.toISOString().slice(0, 10);
};
/** Término vigente = término original ± termos aditivos/subtrativos, na ordem cadastrada. */
Nucleo.vigencia = function (p) {
  const pj = p.projeto;
  let fim = pj.dataFimPrevista || '';
  const termos = (pj.aditivos || []).map((a) => {
    const antes = fim;
    fim = somarPrazo(fim, a.quantidade, a.unidade, a.tipo === 'subtrativo' ? -1 : 1);
    return Object.assign({}, a, { fimAntes: antes, fimDepois: fim });
  });
  const dias = (a, b) => (a && b && !isNaN(Date.parse(a)) && !isNaN(Date.parse(b))) ? Math.round((Date.parse(b) - Date.parse(a)) / 86400000) : null;
  return {
    inicio: pj.dataInicio || '', fimOriginal: pj.dataFimPrevista || '', fimVigente: fim, termos,
    nAditivos: termos.filter((t) => t.tipo !== 'subtrativo').length, nSubtrativos: termos.filter((t) => t.tipo === 'subtrativo').length,
    variacaoDias: dias(pj.dataFimPrevista, fim), duracaoDias: dias(pj.dataInicio, fim), restamDias: dias(Nucleo.hoje(), fim),
  };
};

// ================================================================== destinatários por grupo
/** Um e-mail que está no grupo de gestão recebe SOMENTE como gestão (sem duplicar). */
Nucleo.destinatarios = function (p) {
  const gest = new Set((p.gruposEmail || []).filter((g) => g.gestao).map((g) => g.id));
  const mapa = new Map();
  (p.interessados || []).forEach((i) => {
    const em = String(i.email || '').trim().toLowerCase();
    if (!Nucleo.emailValido(em)) return;
    const r = mapa.get(em) || { email: em, nome: i.nome || '', gestao: false, grupos: new Set() };
    (i.grupos || []).forEach((g) => { r.grupos.add(g); if (gest.has(g)) r.gestao = true; });
    if (!r.nome && i.nome) r.nome = i.nome;
    mapa.set(em, r);
  });
  const todos = [...mapa.values()].map((r) => Object.assign(r, { grupos: [...r.grupos] }));
  return { gestao: todos.filter((r) => r.gestao), demais: todos.filter((r) => !r.gestao) };
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

// ------------------------------------------------------------------ avaliação interna (critérios)
Nucleo.normalizarArvore = function (arvore) {
  const rec = (nos) => (nos || []).map((n) => {
    n = Object.assign({ chave: '', idOriginal: null, stringId: '', titulo: '', tipo: 'component', nivel: 0, visivel: true, keyTechItems: '', justification: '',
      implementationMethod: '', supplier: '', trlInformado: null, filhos: [] }, n);
    n.avaliacao = Object.assign({ origem: n.avaliacao ? 'interno' : 'importado', criterios: {}, atualizado: '' }, n.avaliacao || {});
    if (n.avaliacao.origem === 'interno' && window.trlPorCriterios) n.trlInformado = window.trlPorCriterios(n.avaliacao);
    n.filhos = rec(n.filhos);
    return n;
  });
  return rec(arvore);
};

/** Recalcula as chaves pelo caminho (após incluir/remover/mover itens). Devolve {velha: nova}. */
Nucleo.rechavear = function (arvore) {
  const mapa = {};
  const rec = (nos, pai, nivel) => nos.forEach((n, i) => {
    const nova = (pai ? pai + '/' : '') + (PREFIXO_TIPO[n.tipo] || 'N') + (i + 1);
    if (n.chave && n.chave !== nova) mapa[n.chave] = nova;
    n.chave = nova; n.nivel = nivel;
    rec(n.filhos || [], nova, nivel + 1);
  });
  rec(arvore || [], '', 0);
  return mapa;
};

/** Exporta a árvore no formato do JSON do iMATEC (para a avaliação oficial, quando exigida). */
Nucleo.exportarImatec = function (arvore) {
  let seq = 0;
  const rec = (nos) => nos.map((n) => ({
    id: ++seq, visibility: n.visivel === false ? 'false' : 'true', stringId: n.stringId || n.chave, title: n.titulo, type: n.tipo,
    keyTechItems: n.keyTechItems || 'Nenhum', justification: n.justification || 'Nenhuma', implementationMethod: n.implementationMethod || 'Indefinido',
    supplier: n.supplier || 'Não Aplicável', nodes: rec(n.filhos || []), imatec: n.trlInformado ?? 1,
  }));
  return rec(arvore || []);
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

/**
 * Área responsável por um item da árvore TRL, para saber quem cobrar. Ordem:
 * 1) área vinculada ao próprio item; 2) área gerada da mesma função (versão simplificada / projeto conceitual);
 * 3) área com o mesmo nome do item; 4) área vinculada ao item de cima mais próximo — menos à raiz, que é o produto
 * inteiro: herdar a área da raiz fazia todos os itens sem vínculo mostrarem a mesma área e as mesmas pessoas.
 * Devolve { area, como: 'propria' | 'funcao' | 'nome' | 'herdada' } ou null.
 */
Nucleo.areaDoItem = function (areas, flat, chave) {
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+—\s+.*$/, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const direta = (ch) => {
    const a = areas.find((x) => (x.vinculado || x.no) && x.no === ch);
    if (a) return { area: a, como: 'propria' };
    const n = flat[ch];
    if (n && n.origemFuncao) { const b = areas.find((x) => x.origemFuncao && x.origemFuncao === n.origemFuncao); if (b) return { area: b, como: 'funcao' }; }
    const t = n ? norm(n.titulo) : '';
    const c = t && areas.find((x) => norm(x.nome) === t);
    return c ? { area: c, como: 'nome' } : null;
  };
  const r = direta(chave);
  if (r) return r;
  const partes = chave.split('/');
  for (let i = partes.length - 1; i >= 2; i--) { // i >= 2: não sobe até a raiz (o produto inteiro)
    const h = direta(partes.slice(0, i).join('/'));
    if (h) return { area: h.area, como: 'herdada' };
  }
  return null;
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
    return { id: ar.id, nome: ar.nome, no: k, noTitulo: no ? no.titulo : (ar.noImatecTitulo || ''), vinculado: !!no, origemFuncao: ar.origemFuncao || '',
      trlAtual: atual ?? null, trlEsperado: esp, gap: (atual !== null && atual !== undefined && esp) ? esp - atual : null, responsaveis: resp };
  });
  const areaDoNo = (chave) => { const r = Nucleo.areaDoItem(areas, flat, chave); return r ? r.area : null; };
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
      const falta = (n.avaliacao && n.avaliacao.origem === 'interno' && window.trlFaltaProximo) ? window.trlFaltaProximo(n.avaliacao) : null;
      return { chave: n.chave, titulo: n.titulo, tipo: Nucleo.NOME_TIPO[n.tipo] || n.tipo, trl: n.trlInformado, area: a ? a.nome : null, falta,
        responsaveis: a ? a.responsaveis : [],
        cobrar: (a && a.responsaveis.length) ? a.responsaveis : [Object.assign({}, coord, { observacao: 'sem área vinculada — cobrar coordenação' })] };
    });
  const maiorGap = areas.filter((a) => (a.gap || 0) > 0).sort((x, y) => y.gap - x.gap);
  const macroAtual = macros.find((m) => !['concluída', 'aceita'].includes(m.status)) || null;
  const esperadoEtapa = macroAtual ? macroAtual.trlEsperado : (macros.length ? macros[macros.length - 1].trlEsperado : null);

  const riscos = p.riscos.map((r) => Object.assign({}, r, Nucleo.risco(r.probabilidade, r.impacto)));
  const riscosAltos = riscos.filter((r) => r.nivel >= 10 && (r.status || 'aberto') !== 'fechado').sort((a, b) => b.nivel - a.nivel);

  macros.forEach((m) => { if (m.atrasada) alertas.push(`Macroentrega ${m.numero} atrasada (prevista para ${Nucleo.dataBR(m.dataPrevista)}).`); });
  const vig = Nucleo.vigencia(p);
  macros.forEach((m) => {
    if (m.dataInicio && vig.inicio && m.dataInicio < vig.inicio) alertas.push(`Macroentrega ${m.numero} começa em ${Nucleo.dataBR(m.dataInicio)}, antes do início do projeto (${Nucleo.dataBR(vig.inicio)}). Confira a data.`);
    if (m.dataInicio && m.dataPrevista && m.dataInicio > m.dataPrevista) alertas.push(`Macroentrega ${m.numero}: início (${Nucleo.dataBR(m.dataInicio)}) depois da data prevista de entrega (${Nucleo.dataBR(m.dataPrevista)}).`);
  });
  if (vig.fimVigente) {
    macros.forEach((m) => { if (m.dataPrevista && m.dataPrevista > vig.fimVigente) alertas.push(`Macroentrega ${m.numero} prevista para ${Nucleo.dataBR(m.dataPrevista)}, depois do fim da vigência (${Nucleo.dataBR(vig.fimVigente)}).`); });
    if (vig.restamDias !== null && vig.restamDias < 0) alertas.push(`Vigência do projeto encerrada em ${Nucleo.dataBR(vig.fimVigente)}.`);
  }
  const dfxItens = (p.dfx && p.dfx.itens) || [];
  const dfx = { usar: dfxItens.filter((i) => i.decisao === 'usar').length, negligenciar: dfxItens.filter((i) => i.decisao === 'negligenciar').length,
    pendentes: dfxItens.filter((i) => !i.decisao).length, condicao: (p.dfx && p.dfx.condicaoTeste) || '' };
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
    riscos, riscosAltos, alertas, vigencia: vig, dfx,
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

/**
 * Figuras e tabelas: numeração na ordem em que aparecem no relatório — por seção e, dentro dela, pela ordem da lista.
 * Em "Resultados", as que estão em blocos vêm depois das soltas, na ordem dos blocos.
 */
Nucleo.SECOES = [['introducao', 'Introdução'], ['objetivos', 'Objetivos da etapa'], ['resultados', 'Resultados'], ['conclusao', 'Conclusão'], ['etapasFuturas', 'Etapas futuras']];
Nucleo.numerarAbnt = function (macros, contador = { f: 0, t: 0 }, extra = {}) {
  const geradas = extra.p && extra.gerar !== false && window.Formulario ? Nucleo.figurasGeradas(extra.p) : () => [];
  const fig = {}, tab = {}, listaF = [], listaT = [];
  const addF = (f, m) => { if (f && !(f.id in fig)) { fig[f.id] = ++contador.f; listaF.push({ n: fig[f.id], titulo: f.titulo, macro: m.numero }); } };
  const addT = (x, m) => { if (x && !(x.id in tab)) { tab[x.id] = ++contador.t; listaT.push({ n: tab[x.id], titulo: x.titulo, macro: m.numero }); } };
  macros.forEach((m) => {
    const refs = Nucleo.refsBlocos(m);
    Nucleo.SECOES.forEach(([s]) => {
      (m.figuras || []).forEach((f) => { if ((f.secao || 'resultados') === s && !refs.fig.has(f.id)) addF(f, m); });
      (m.tabelas || []).forEach((x) => { if ((x.secao || 'resultados') === s && !refs.tab.has(x.id)) addT(x, m); });
      if (s === 'resultados') (m.blocos || []).forEach((b) => {
        if (b.tipo === 'figura') addF((m.figuras || []).find((f) => f.id === b.ref), m);
        if (b.tipo === 'tabela') addT((m.tabelas || []).find((x) => x.id === b.ref), m);
        geradas(b).forEach((f) => addF(f, m));
      });
    });
  });
  const refs = new Map(((extra.p && extra.p.pesquisa && extra.p.pesquisa.referencias) || []).map((r) => [r.id, r]));
  return { fig, tab, listaF, listaT, refs, citadas: new Set() }; // citadas: preenchido ao montar os textos (seção "Referências")
};

/** Figuras que um bloco gera sozinho (sem arquivo): gráficos do questionário e diagrama da estrutura de funções. */
Nucleo.figurasGeradas = (p) => (b) => {
  if (b.tipo === 'questionario' && (b.partes || []).includes('graficos')) {
    const f = p.produto && p.produto.etapas.informacional.formulario;
    return f ? Formulario.perguntasGrafico(f).map((q) => ({ id: `qg_${b.id}_${q.id}`, titulo: Formulario.tituloGrafico(q) })) : [];
  }
  if (b.tipo === 'nedip' && (b.secoes || []).includes('funcoes') && window.nedipTemFuncoes && nedipTemFuncoes(p)) return [{ id: `nd_${b.id}_funcoes`, titulo: 'Função global e estrutura de funções' }];
  return [];
};

Nucleo.figurasReferenciadas = (p) => {
  const out = [];
  p.macroentregas.forEach((m) => (m.figuras || []).forEach((f) => out.push({ macro: m.numero, arquivo: f.arquivo, titulo: f.titulo })));
  return out;
};

// ================================================================== QFD → requisitos de qualidade
// Lê o backup completo exportado pelo sistema QFD (Psykozis/QFD, "Backup"/exportData):
// requisitosProjeto + especificacoesProjeto (+ valor medido do "nosso produto" na avaliação competitiva).
const QFD_TOLERANCIA = 0.05; // mesma tolerância nominal do sistema QFD
Nucleo.parseNumero = function (t) {
  const m = String(t == null ? '' : t).match(/-?\d[\d.,]*/);
  if (!m) return null;
  let s = m[0].replace(/[.,]$/, '');
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
  if (c !== -1 && d !== -1) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c !== -1) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};
Nucleo.SENTIDO_QFD = { up: '≥', down: '≤', none: '=' };
Nucleo.importarQfd = function (dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Arquivo inválido: esperado o backup JSON do sistema QFD.');
  if (!Array.isArray(dados.requisitosProjeto)) {
    if (Array.isArray(dados.especificacoesProjeto)) throw new Error('Este arquivo contém só as especificações. Exporte o backup completo do projeto no sistema QFD (botão “Backup”).');
    throw new Error('O arquivo não é um backup de projeto QFD (faltam os requisitos de projeto).');
  }
  const esp = dados.especificacoesProjeto || [];
  const vals = ((dados.avaliacaoCompetitiva || {}).valoresTecnicos || []).filter((v) => v.produtoId === 'nosso');
  const sentidos = { crescente: 'up', decrescente: 'down', nominal: 'none' };
  const rps = dados.requisitosProjeto.map((r, i) => Object.assign({ _i: i }, r));
  const ordem = [...rps].sort((a, b) => (b.importanciaAbsoluta || 0) - (a.importanciaAbsoluta || 0) || a._i - b._i);
  const avisos = [];
  const itens = ordem.map((r, k) => {
    const e = esp.find((x) => x.requisitoProjetoId === r.id) || {};
    const sentido = sentidos[String(r.sentidoMelhoria || '').toLowerCase()] || (['up', 'down', 'none'].includes(r.sentidoMelhoria) ? r.sentidoMelhoria : 'none');
    const un = String(e.unidadeMedida || '').trim();
    // backups atuais do QFD (tipoMeta/valorMeta/valorMax/tolerancia/metaTexto); os antigos guardavam a meta em "valorUnitario"
    const vazio = (x) => x === null || x === undefined || x === '';
    const atual = !String(e.valorUnitario || '').trim() && (!!e.tipoMeta || !!String(e.metaTexto || '').trim());
    const nBr = (x) => String(x).replace('.', ',');
    const vMeta = atual && !vazio(e.valorMeta) ? Number(e.valorMeta) : null, vMax = atual && !vazio(e.valorMax) ? Number(e.valorMax) : null, tol = atual && !vazio(e.tolerancia) ? Math.abs(Number(e.tolerancia)) : null;
    const metaTxt = atual ? (Number.isFinite(vMeta) ? nBr(vMeta) : '') : String(e.valorUnitario || '').trim();
    const meta = Nucleo.parseNumero(metaTxt);
    const medTxt = String((vals.find((v) => v.requisitoProjetoId === r.id) || {}).valor || '').trim();
    const med = Nucleo.parseNumero(medTxt);
    let estado = 'sem-meta';
    if (meta !== null) {
      if (med === null) estado = 'sem-medicao';
      else {
        let ok;
        if (atual && e.tipoMeta === 'faixa' && Number.isFinite(vMax)) ok = med >= meta && med <= vMax;
        else if (atual && e.tipoMeta === '>=') ok = med >= meta;
        else if (atual && e.tipoMeta === '<=') ok = med <= meta;
        else if (atual && e.tipoMeta === '=' && tol !== null && tol > 0) ok = Math.abs(med - meta) <= tol;
        else if (atual && e.tipoMeta === '=') ok = meta === 0 ? med === 0 : Math.abs(med - meta) <= Math.abs(meta) * QFD_TOLERANCIA;
        else ok = sentido === 'up' ? med >= meta : sentido === 'down' ? med <= meta : (meta === 0 ? med === 0 : Math.abs(med - meta) <= Math.abs(meta) * QFD_TOLERANCIA);
        estado = ok ? 'atingida' : 'nao-atingida';
      }
    }
    const moeda = /^(R\$|US\$|\$|€)$/.test(un);
    const valUn = (v) => (moeda ? `${un} ${v}` : `${v} ${un}`).trim();
    // sem valor-meta, a meta costuma estar escrita na observação do requisito (ex.: "entre 0,6 a 1,1 m3/s"): vira o critério
    const obsReq = String(r.observacao || '').trim(), metaNaObs = !metaTxt && !(atual && String(e.metaTexto || '').trim()) && /\d/.test(obsReq);
    let criterio;
    if (atual && metaTxt) {
      const simb = { '>=': '≥', '<=': '≤', '=': '=' }[e.tipoMeta];
      criterio = e.tipoMeta === 'faixa' && Number.isFinite(vMax) ? `${metaTxt} a ${valUn(nBr(vMax))}`
        : simb ? `${simb} ${valUn(metaTxt)}${e.tipoMeta === '=' ? (tol ? ` ± ${nBr(tol)}` : ' (±5%)') : ''}`
        : `${Nucleo.SENTIDO_QFD[sentido]} ${valUn(metaTxt)}`;
    } else if (atual && String(e.metaTexto || '').trim()) criterio = String(e.metaTexto).trim();
    else criterio = metaTxt ? `${Nucleo.SENTIDO_QFD[sentido]} ${valUn(metaTxt)}` + (sentido === 'none' ? ' (±5%)' : '') : (metaNaObs ? obsReq : '');
    if (!metaTxt && !criterio) avisos.push(`RP${r._i + 1} "${r.descricao}" está sem valor-meta nas especificações do QFD${metaNaObs ? ` (usada a observação: "${obsReq}")` : ''}.`);
    return {
      id: 'qfd_' + r.id, requisito: `RP${r._i + 1}. ${r.descricao}`, criterioAceite: criterio,
      metodoVerificacao: String((atual && e.formaAvaliacao) || e.observacao || (metaNaObs ? '' : r.observacao) || '').trim(),
      status: estado === 'atingida' ? 'conforme' : estado === 'nao-atingida' ? 'não conforme' : 'pendente',
      pdca: { planejar: '', executar: '', verificar: '', agir: '' },
      aspectosIndesejaveis: String(e.aspectosIndesejaveis || '').trim(),
      valorMedido: medTxt ? valUn(medTxt) : '',
      qfd: { id: r.id, numero: r._i + 1, rank: k + 1, sentido, meta: metaTxt, unidade: un, importanciaAbsoluta: r.importanciaAbsoluta || 0,
        pesoRelativo: r.pesoRelativo || 0, dificuldadeTecnica: r.dificuldadeTecnica ?? null, estado },
    };
  });
  const clientes = (dados.requisitosCliente || []).map((c) => ({ descricao: String(c.descricao || '').trim(), peso: +c.peso || 0 })).sort((a, b) => b.peso - a.peso);
  return { itens, avisos, clientes, meta: { schemaVersion: (dados.metadata || {}).schemaVersion ?? null, requisitosCliente: (dados.requisitosCliente || []).length, requisitosProjeto: itens.length } };
};
/** Mescla: itens do QFD são atualizados pelo id do requisito; situação só muda quando o QFD tem medição; PDCA e itens manuais são mantidos. */
/**
 * Resultado do Sistema de Projeto Conceitual (arquivo "…-para-gestao.json" ou gestao-conceitual.json do ZIP):
 * substitui funções, subfunções, princípios, desdobramento e concepções da fase conceitual. Funções e subfunções
 * com o mesmo nome mantêm o id (e, com ele, responsável, ligações da versão simplificada e da árvore TRL).
 * Especificações manuais do conceitual entram na Qualidade se ainda não existirem. Devolve um resumo.
 */
Nucleo.ehConceitual = (d) => !!(d && typeof d === 'object' && d.formato === 'projeto-conceitual-gestao' && d.conceitual && Array.isArray(d.conceitual.funcoes));
Nucleo.importarConceitual = function (p, d) {
  if (!Nucleo.ehConceitual(d)) throw new Error('O arquivo não é a exportação do Sistema de Projeto Conceitual.');
  const c = p.produto.etapas.conceitual, k = d.conceitual;
  const t = (x) => String(x ?? '').trim();
  const norm = (x) => t(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const antigas = new Map(c.funcoes.map((f) => [norm(f.nome), f]));
  const mapa = {}; // id do conceitual → id aqui
  c.funcoes = k.funcoes.map((fx) => {
    const ant = antigas.get(norm(fx.nome));
    const subAnt = new Map(((ant && ant.subfuncoes) || []).map((s) => [norm(s.nome), s]));
    const f = Object.assign({}, ant || {}, { id: ant ? ant.id : t(fx.id) || Nucleo.uid('fn'), nome: t(fx.nome), codigo: t(fx.codigo) });
    mapa[fx.id] = f.id;
    f.subfuncoes = (fx.subfuncoes || []).map((sx) => {
      const sa = subAnt.get(norm(sx.nome));
      const sf = Object.assign({}, sa || {}, { id: sa ? sa.id : t(sx.id) || Nucleo.uid('sf'), nome: t(sx.nome), codigo: t(sx.codigo), principios: t(sx.principios),
        escolhido: t(sx.escolhido), maturidade: t(sx.maturidade), maturidadeTexto: t(sx.maturidadeTexto), trlFaixa: t(sx.trlFaixa),
        concorrentes: Array.isArray(sx.concorrentes) ? sx.concorrentes.map(t) : [], fonte: t(sx.fonte) });
      mapa[sx.id] = sf.id;
      return sf;
    });
    return f;
  });
  if (k.funcaoGlobal) c.funcaoGlobal = Object.assign({}, c.funcaoGlobal, { nome: t(k.funcaoGlobal.nome) || c.funcaoGlobal.nome, entradas: t(k.funcaoGlobal.entradas) || c.funcaoGlobal.entradas, saidas: t(k.funcaoGlobal.saidas) || c.funcaoGlobal.saidas });
  let manuais = 0;
  (d.especificacoesManuais || []).forEach((e) => {
    if (!t(e.requisito) || p.qualidade.some((q) => q.id === e.id || norm(q.requisito) === norm(e.requisito))) return;
    p.qualidade.push({ id: t(e.id), requisito: t(e.requisito), criterioAceite: t(e.criterioAceite), metodoVerificacao: '', status: 'pendente', pdca: { planejar: '', executar: '', verificar: '', agir: '' }, aspectosIndesejaveis: '', valorMedido: '' });
    manuais++;
  });
  Object.entries(k.desdobramento || {}).forEach(([esp, v]) => {
    const ids = ((v && v.funcoes) || []).map((id) => mapa[id]).filter(Boolean);
    if (ids.length) c.desdobramento[esp] = { funcoes: [...new Set(ids)], obs: t(v.obs) || ((c.desdobramento[esp] || {}).obs || '') };
  });
  // FMEA da concepção → FMEA do projeto preliminar (linhas vindas do conceitual são substituídas; as da equipe ficam)
  let fmea = 0;
  if (Array.isArray(d.fmea) && p.produto.etapas.preliminar) {
    const pre = p.produto.etapas.preliminar, n10 = (x) => Math.min(10, Math.max(1, Math.round(+x) || 5));
    const antigas = new Map(pre.fmea.filter((x) => String(x.id).startsWith('pc_')).map((x) => [x.id, x]));
    const vindas = d.fmea.filter((x) => x && t(x.modo)).map((x) => Object.assign({ responsavel: '', riscoId: '' }, antigas.get(t(x.id)) || {}, {
      id: t(x.id) || Nucleo.uid('fm'), item: t(x.item), modo: t(x.modo), efeito: t(x.efeito), causa: t(x.causa), s: n10(x.s), o: n10(x.o), d: n10(x.d), acao: t(x.acao) }));
    pre.fmea = vindas.concat(pre.fmea.filter((x) => !String(x.id).startsWith('pc_')));
    fmea = vindas.length;
  }
  // lições aprendidas das recorrências do projeto preliminar: as vindas de lá são atualizadas; as da equipe ficam
  let licoes = 0;
  if (Array.isArray(d.licoes)) {
    const L = p.licoesAprendidas || (p.licoesAprendidas = []);
    d.licoes.filter((x) => x && t(x.idOrigem)).forEach((x) => {
      const ja = L.find((l) => l.origem === 'projeto-preliminar' && l.idOrigem === t(x.idOrigem));
      if (ja) { ja.descricao = t(x.descricao) || ja.descricao; if (t(x.recomendacao)) ja.recomendacao = t(x.recomendacao); }
      else L.push({ data: t(x.data) || Nucleo.hoje(), macroUid: '', descricao: t(x.descricao), recomendacao: t(x.recomendacao), origem: 'projeto-preliminar', idOrigem: t(x.idOrigem) });
      licoes++;
    });
  }
  const outras = c.concepcoes.filter((x) => !String(x.id).startsWith('pc_'));
  const vindas = (k.concepcoes || []).map((x) => ({ id: t(x.id), nome: t(x.nome), descricao: t(x.descricao), avaliacao: t(x.avaliacao), selecionada: !!x.selecionada }));
  if (vindas.some((x) => x.selecionada)) outras.forEach((x) => { x.selecionada = false; });
  c.concepcoes = vindas.concat(outras);
  c.conceitualImportadoEm = Nucleo.agoraIso();
  ['con_global', 'con_estr', 'con_desd', 'con_variantes', 'con_aval', 'con_sel'].forEach((r) => { if (c.recomendacoes && r in c.recomendacoes) c.recomendacoes[r] = true; });
  if (c.status === 'não iniciada') c.status = 'em andamento';
  return { funcoes: c.funcoes.length, subfuncoes: c.funcoes.reduce((s, f) => s + f.subfuncoes.length, 0), concepcoes: vindas.length, manuais, fmea, licoes, desdobramento: Object.keys(k.desdobramento || {}).length };
};

Nucleo.mesclarQfd = function (atual, novos) {
  const porId = new Map((atual || []).filter((q) => q.qfd && q.qfd.id).map((q) => [q.qfd.id, q]));
  const saida = novos.map((n) => {
    const a = porId.get(n.qfd.id);
    if (!a) return n;
    porId.delete(n.qfd.id);
    const temMedicao = ['atingida', 'nao-atingida'].includes(n.qfd.estado);
    const metodoAntigo = a.metodoVerificacao && a.metodoVerificacao !== n.criterioAceite ? a.metodoVerificacao : ''; // versões anteriores punham a meta da observação aqui
    return Object.assign({}, a, n, { status: temMedicao ? n.status : (a.status || n.status), pdca: a.pdca || n.pdca, metodoVerificacao: metodoAntigo || n.metodoVerificacao });
  });
  const removidos = [...porId.values()].map((q) => Object.assign({}, q, { qfd: Object.assign({}, q.qfd, { removidoDoQfd: true }) }));
  const manuais = (atual || []).filter((q) => !q.qfd || !q.qfd.id);
  return { itens: saida.concat(removidos, manuais), removidos: removidos.length, manuais: manuais.length };
};
