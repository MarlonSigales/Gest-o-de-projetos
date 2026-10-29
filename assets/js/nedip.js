/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Projeto de produto/serviço pelo modelo do NeDIP/UFSC (PRODIP), com as três macrofases:
 *   planejamento → projetação (informacional, conceitual, preliminar, detalhado) → implementação
 *   (preparação da produção, lançamento — com a análise econômica e de mercado —, validação).
 * Referência: BACK, N.; OGLIARI, A.; DIAS, A.; SILVA, J. C. Projeto integrado de produtos:
 * planejamento, concepção e modelagem. Barueri: Manole, 2008. Funções, princípios de solução e
 * concepção: PAHL, G. et al. Engineering Design: A Systematic Approach. 3. ed. Springer, 2007.
 * As recomendações são redação própria, resumindo atividades típicas de cada fase.
 *
 * Tudo é opcional: cada fase pode usar um aplicativo próprio (entrada externa), as ferramentas
 * internas podem ser ligadas/desligadas e todas as listas aceitam linhas manuais.
 */
'use strict';

window.NEDIP_REF = 'BACK, N.; OGLIARI, A.; DIAS, A.; SILVA, J. C. Projeto integrado de produtos: planejamento, concepção e modelagem. Barueri: Manole, 2008.';
window.PAHL_REF = 'PAHL, G.; BEITZ, W.; FELDHUSEN, J.; GROTE, K.-H. Engineering Design: A Systematic Approach. 3. ed. London: Springer, 2007.';

window.NEDIP_MACROFASES = [['planejamento', 'Planejamento'], ['projetacao', 'Projetação'], ['implementacao', 'Implementação']];

/* ferramentas: [id, rótulo, ligada por padrão] — todas opcionais */
window.NEDIP_ETAPAS = [
  { id: 'planejamento', macro: 'planejamento', nome: 'Planejamento do projeto', curto: 'Planejamento', saida: 'Plano do projeto',
    objetivo: 'Definir escopo, partes interessadas, atividades, prazos, custos, riscos, qualidade e comunicação do projeto.',
    ferramentas: [['plano', 'Escopo, premissas e orçamento', true], ['atalhos', 'Atalhos para Equipe, Macroentregas, Cronograma e Riscos', true]],
    recomendacoes: [
      ['pla_escopo', 'Definir o escopo do produto/serviço e do projeto (o que entra e o que não entra)'],
      ['pla_partes', 'Identificar partes interessadas, equipe e responsáveis (aba Equipe e Interessados)'],
      ['pla_ativ', 'Desdobrar o trabalho em macroentregas e atividades com prazos e dependências'],
      ['pla_custos', 'Estimar custos e recursos (orçamento do projeto)'],
      ['pla_riscos', 'Identificar e planejar a resposta aos riscos (aba Riscos)'],
      ['pla_qual', 'Planejar a qualidade: critérios de aceite de cada entrega'],
      ['pla_com', 'Planejar a comunicação: quem recebe o quê e quando (grupos de e-mail)'],
      ['pla_aquis', 'Planejar aquisições e parcerias'],
    ] },
  { id: 'informacional', macro: 'projetacao', nome: 'Projeto informacional', curto: 'Informacional', saida: 'Especificações de projeto',
    objetivo: 'Transformar as necessidades dos clientes de todo o ciclo de vida em requisitos e especificações de projeto mensuráveis.',
    appPadrao: { nome: 'Sistema QFD', url: typeof CONFIG !== 'undefined' ? CONFIG.urlQfd : '' },
    ferramentas: [['questionarios', 'Questionários e consolidação das respostas', true], ['necessidades', 'Requisitos de cliente (manual ou do QFD)', true],
      ['especificacoes', 'Especificações de projeto (manual ou do QFD)', true], ['contexto', 'Ciclo de vida, concorrentes e normas', true]],
    recomendacoes: [
      ['inf_ciclo', 'Definir o ciclo de vida do produto/serviço e os clientes de cada fase (externos, intermediários e internos)'],
      ['inf_quest', 'Aplicar questionários e entrevistas estruturadas para levantar as necessidades dos clientes'],
      ['inf_bench', 'Analisar produtos/serviços concorrentes e patentes (benchmarking e busca de anterioridade)'],
      ['inf_normas', 'Levantar normas, legislação e restrições aplicáveis'],
      ['inf_req', 'Converter necessidades em requisitos de cliente e estes em requisitos de projeto mensuráveis'],
      ['inf_hier', 'Hierarquizar os requisitos de cliente (comparação aos pares / diagrama de Mudge)'],
      ['inf_qfd', 'Relacionar requisitos de cliente e de projeto na casa da qualidade (QFD)'],
      ['inf_espec', 'Definir para cada especificação: valor-meta, forma de avaliação e aspectos indesejáveis'],
    ] },
  { id: 'conceitual', macro: 'projetacao', nome: 'Projeto conceitual', curto: 'Conceitual', saida: 'Concepção do produto/serviço',
    objetivo: 'Desdobrar as especificações em funções e princípios de solução, gerar concepções alternativas e selecionar a que melhor atende às especificações.',
    appPadrao: { nome: 'Sistema de Projeto Conceitual', url: typeof CONFIG !== 'undefined' ? (CONFIG.urlConceitual || '') : '' },
    ferramentas: [['desdobramento', 'Desdobramento das especificações em funções', true], ['funcoes', 'Função global, estrutura de funções e matriz morfológica', true],
      ['concepcoes', 'Concepções alternativas', true], ['decisao', 'Matriz de decisão ponderada', true], ['trl', 'Exportar funções para a árvore TRL', true]],
    recomendacoes: [
      ['con_abstr', 'Analisar as especificações e abstrair o problema essencial (o que o produto/serviço precisa fazer, sem prender-se a soluções)'],
      ['con_global', 'Estabelecer a função global a partir das entradas e saídas de energia, material e sinal'],
      ['con_estr', 'Desdobrar a função global em funções parciais e elementares (estrutura de funções), com os fluxos entre elas'],
      ['con_desd', 'Relacionar cada especificação às funções que a atendem; especificação sem função indica função faltante'],
      ['con_variantes', 'Considerar variantes da estrutura de funções (ordem, agrupamento, funções auxiliares)'],
      ['con_princ', 'Buscar princípios de solução para cada função (brainstorming, analogias, catálogos, TRIZ, patentes)'],
      ['con_morf', 'Combinar princípios na matriz morfológica e descartar combinações incompatíveis'],
      ['con_variantesc', 'Firmar as concepções alternativas: esboços, arranjo e princípios de cada uma'],
      ['con_aval', 'Avaliar as concepções com critérios derivados das especificações (pesos do QFD ou definidos pela equipe)'],
      ['con_sel', 'Selecionar a concepção e registrar a justificativa'],
      ['con_risco', 'Registrar os riscos técnicos da concepção escolhida (aba Riscos)'],
      ['con_trl', 'Levar as funções/subsistemas para a árvore TRL (exportação ou montagem manual na aba TRL)'],
    ] },
  { id: 'preliminar', macro: 'projetacao', nome: 'Projeto preliminar', curto: 'Preliminar', saida: 'Leiaute definitivo e viabilidade',
    objetivo: 'Definir o leiaute, dimensionar, construir e ensaiar modelos/protótipos, analisar falhas e verificar as especificações (análise de qualidade).',
    ferramentas: [['leiaute', 'Leiaute e viabilidade', true], ['prototipos', 'Modelos, protótipos e ensaios', true], ['fmea', 'FMEA (análise de modos de falha)', true], ['qualidade', 'Análise de qualidade das especificações', true]],
    recomendacoes: [
      ['pre_det', 'Identificar os requisitos determinantes do leiaute (dimensões, arranjo, materiais, interfaces)'],
      ['pre_leiaute', 'Desenvolver leiautes alternativos e selecionar o melhor'],
      ['pre_dimen', 'Dimensionar e modelar (CAD, cálculos, simulação/CAE)'],
      ['pre_dfx', 'Aplicar as diretrizes de DfX (aba Qualidade / DfX)'],
      ['pre_proto', 'Construir modelos/protótipos e ensaiá-los frente às especificações'],
      ['pre_qual', 'Analisar a qualidade: situação de cada especificação e PDCA das não conformidades'],
      ['pre_fmea', 'Analisar modos de falha (FMEA) e levar os críticos para a aba Riscos'],
      ['pre_viab', 'Avaliar a viabilidade técnica e econômica (custo-alvo, fabricação)'],
    ] },
  { id: 'detalhado', macro: 'projetacao', nome: 'Projeto detalhado', curto: 'Detalhado', saida: 'Documentação do produto/serviço',
    objetivo: 'Detalhar e documentar o produto/serviço, verificar o protótipo final e reunir tudo em manuais de projeto e de uso.',
    ferramentas: [['bom', 'Lista de materiais', true], ['manualUso', 'Conteúdo do manual de uso', true], ['manuais', 'Manuais (gerados ou próprios)', true]],
    recomendacoes: [
      ['det_des', 'Detalhar peças e conjuntos: desenhos com tolerâncias, materiais e acabamentos'],
      ['det_bom', 'Montar a lista de materiais (itens fabricados e comprados)'],
      ['det_fab', 'Elaborar os planos de fabricação, montagem e controle de qualidade'],
      ['det_proto', 'Ensaiar o protótipo final e verificar todas as especificações'],
      ['det_pi', 'Avaliar a proteção intelectual (patente, modelo de utilidade, desenho industrial, software)'],
      ['det_manproj', 'Elaborar o manual de projeto (documentação técnica)'],
      ['det_manuso', 'Elaborar o manual de uso (operação, segurança e manutenção)'],
      ['det_docs', 'Importar desenhos, CAD, planilhas e demais documentos para o projeto (vão no ZIP)'],
    ] },
  { id: 'producao', macro: 'implementacao', nome: 'Preparação da produção', curto: 'Produção', saida: 'Liberação da produção',
    objetivo: 'Preparar processos, recursos, fornecedores e controle de qualidade, produzir o lote piloto e liberar a produção (ou a operação do serviço).',
    ferramentas: [['plano', 'Processos, fornecedores e lote piloto', true]],
    recomendacoes: [
      ['pro_proc', 'Planejar processos, recursos e leiaute de fabricação/montagem (ou de prestação do serviço)'],
      ['pro_forn', 'Homologar fornecedores e itens comprados'],
      ['pro_ctrl', 'Definir instruções de trabalho e o plano de controle de qualidade'],
      ['pro_piloto', 'Produzir o lote piloto e verificar as especificações'],
      ['pro_assist', 'Preparar assistência técnica e peças de reposição'],
      ['pro_lib', 'Liberar a produção (ou a operação do serviço)'],
    ] },
  { id: 'lancamento', macro: 'implementacao', nome: 'Lançamento', curto: 'Lançamento', saida: 'Produto/serviço lançado',
    objetivo: 'Colocar o produto/serviço no mercado: análise econômica e de mercado, plano de lançamento, canais, treinamento, certificações e documentação ao cliente.',
    ferramentas: [['plano', 'Plano de lançamento', true], ['economia', 'Análise econômica e de mercado (custos, CAPEX, OPEX, VPL, TIR, EVA…)', true]],
    recomendacoes: [
      ['lan_mercado', 'Dimensionar o mercado (TAM, SAM, SOM) e projetar a demanda por ano'],
      ['lan_custos', 'Levantar o custo variável unitário, os investimentos (CAPEX) e os custos fixos (OPEX)'],
      ['lan_viab', 'Avaliar a viabilidade: fluxo de caixa, VPL, TIR, payback, ponto de equilíbrio, EVA e sensibilidade'],
      ['lan_preco', 'Definir o preço de venda (margem de contribuição e preço mínimo)'],
      ['lan_plano', 'Elaborar o plano de lançamento e de comunicação/marketing'],
      ['lan_canais', 'Definir canais de venda, distribuição e assistência'],
      ['lan_trein', 'Treinar vendas, assistência técnica e usuários'],
      ['lan_cert', 'Obter registros, certificações e homologações exigidos'],
      ['lan_doc', 'Entregar a documentação ao cliente (manual de uso, garantia)'],
    ] },
  { id: 'validacao', macro: 'implementacao', nome: 'Validação', curto: 'Validação', saida: 'Produto/serviço validado e projeto encerrado',
    objetivo: 'Avaliar o produto/serviço em uso real, a satisfação dos clientes e o próprio projeto, registrando melhorias e encerrando o projeto.',
    ferramentas: [['campo', 'Desempenho em campo e satisfação', true]],
    recomendacoes: [
      ['val_satisf', 'Avaliar a satisfação dos clientes (questionários pós-uso)'],
      ['val_campo', 'Monitorar desempenho em campo, falhas, reclamações e garantia'],
      ['val_espec', 'Confirmar as especificações em uso real'],
      ['val_licoes', 'Registrar lições aprendidas (aba Lições aprendidas)'],
      ['val_melhor', 'Definir melhorias e a próxima versão'],
      ['val_encerr', 'Encerrar formalmente o projeto (aceites e documentação final)'],
    ] },
];

window.NEDIP_STATUS = [['não iniciada', 'não iniciada'], ['em andamento', 'em andamento'], ['concluída', 'concluída'], ['não se aplica', 'não se aplica']];

/** Seções do manual de uso (preenchidas no projeto detalhado). */
window.NEDIP_MANUAL_USO = [
  ['descricao', 'Descrição do produto/serviço e aplicação'],
  ['seguranca', 'Instruções de segurança'],
  ['instalacao', 'Instalação, montagem ou preparação'],
  ['operacao', 'Operação / utilização'],
  ['manutencao', 'Manutenção e cuidados'],
  ['problemas', 'Solução de problemas'],
  ['descarte', 'Descarte e fim de vida'],
];

/** Roteiro-modelo de questionário por fase do ciclo de vida (projeto informacional). */
window.NEDIP_QUESTIONARIO = [
  ['Uso e operação', ['Em que situações você usa (ou usaria) o produto/serviço?', 'O que mais incomoda nas soluções que você usa hoje?', 'Que desempenho você espera (velocidade, capacidade, precisão, conforto)?']],
  ['Aquisição e custo', ['Quanto estaria disposto a pagar?', 'O que pesa mais na decisão de compra/contratação?']],
  ['Instalação e ajustes', ['Quem instala ou prepara? Quanto tempo é aceitável?', 'Que ajustes você precisa fazer com frequência?']],
  ['Manutenção', ['Com que frequência aceita fazer manutenção?', 'Quais falhas já teve em soluções semelhantes?']],
  ['Segurança e ambiente', ['Que riscos preocupam no uso?', 'Em que condições ambientais será usado (poeira, umidade, temperatura, vibração)?']],
  ['Descarte', ['O que é feito com o produto ao fim da vida útil?']],
];

/** FMEA: RPN = S × O × D; itens com RPN ≥ limite ou severidade ≥ 9 são sugeridos para a aba Riscos. */
window.NEDIP_FMEA_LIMITE = 100;

const nedipLista = (x) => (Array.isArray(x) ? x : []);
const nedipTxt = (x) => String(x ?? '');

window.nedipNormalizar = function (prod) {
  prod = prod && typeof prod === 'object' ? prod : {};
  const uidN = (p) => (window.Nucleo ? Nucleo.uid(p) : p + '_' + Math.random().toString(16).slice(2, 10));
  const out = { tipo: prod.tipo === 'serviço' ? 'serviço' : 'produto', fases: {}, etapas: {} };
  const e0 = prod.etapas || {};
  window.NEDIP_ETAPAS.forEach((et) => {
    out.fases[et.id] = prod.fases && et.id in prod.fases ? !!prod.fases[et.id] : true;
    const e = e0[et.id] || {};
    const base = {
      status: window.NEDIP_STATUS.some(([s]) => s === e.status) ? e.status : 'não iniciada',
      macros: nedipLista(e.macros).map(String),
      app: et.id === 'informacional' ? { nome: 'Sistema QFD', url: (window.CONFIG && CONFIG.urlQfd) || '' } // fixo: sempre o sistema QFD
        : (() => { // sem endereço salvo, vale o aplicativo padrão da fase (ex.: Sistema de Projeto Conceitual)
          const d = { nome: (et.appPadrao || {}).nome || '', url: (et.appPadrao || {}).url || '' };
          const a = Object.assign({}, d, e.app || {});
          if (!a.url) { a.url = d.url; if (!a.nome) a.nome = d.nome; }
          return a;
        })(),
      ferramentas: Object.fromEntries(et.ferramentas.map(([id, , pad]) => [id, e.ferramentas && id in e.ferramentas ? !!e.ferramentas[id] : pad])),
      recomendacoes: Object.fromEntries(et.recomendacoes.map(([id]) => [id, !!(e.recomendacoes && e.recomendacoes[id])])),
      registro: nedipTxt(e.registro),
      anexos: nedipLista(e.anexos).map((a) => Object.assign({ arquivo: '', nome: '', descricao: '', data: '', tamanho: 0 }, a)),
    };
    const X = {
      planejamento: () => ({ escopo: nedipTxt(e.escopo), premissas: nedipTxt(e.premissas), orcamento: nedipTxt(e.orcamento), comunicacao: nedipTxt(e.comunicacao) }),
      informacional: () => ({
        cicloVida: nedipTxt(e.cicloVida), concorrentes: nedipTxt(e.concorrentes), normas: nedipTxt(e.normas),
        questionarios: nedipLista(e.questionarios).map((q) => Object.assign({ publico: '', meio: '', respondentes: null, data: '', observacao: '' }, q)),
        consolidacao: nedipLista(e.consolidacao).map((q) => Object.assign({ necessidade: '', fase: '', citacoes: null, importancia: null }, q)),
        necessidades: nedipLista(e.necessidades).map((n) => Object.assign({ descricao: '', peso: 0, origem: 'manual' }, n)),
        concorrentesLista: nedipLista(e.concorrentesLista).map((x) => Object.assign({ empresa: '', pais: '', tipo: '', caracteristicas: '', observacao: '' }, x)),
        normasLista: nedipLista(e.normasLista).map((x) => Object.assign({ norma: '', titulo: '', aplicacao: '' }, x)),
        formulario: window.Formulario ? Formulario.normalizar(e.formulario) : (e.formulario || { perguntas: [], respostas: [] }), // questionário (Google Forms)
      }),
      conceitual: () => ({
        funcaoGlobal: Object.assign({ nome: '', entradas: '', saidas: '' }, e.funcaoGlobal || {}),
        funcoes: nedipLista(e.funcoes).map((f) => Object.assign({ id: uidN('fn'), nome: '' }, f, {
          subfuncoes: nedipLista(f.subfuncoes).map((s) => Object.assign({ id: uidN('sf'), nome: '', principios: '', escolhido: '' }, s)) })),
        desdobramento: Object.fromEntries(Object.entries(e.desdobramento || {}).map(([k, v]) => [k, { funcoes: nedipLista(v && v.funcoes).map(String), obs: nedipTxt(v && v.obs) }])),
        concepcoes: nedipLista(e.concepcoes).map((c) => Object.assign({ id: uidN('cc'), nome: '', descricao: '', avaliacao: '', selecionada: false }, c)),
        decisao: { criterios: nedipLista((e.decisao || {}).criterios).map((c) => Object.assign({ nome: '', peso: 1, notas: {} }, c, { notas: Object.assign({}, c.notas || {}) })) },
        trlExportadoEm: nedipTxt(e.trlExportadoEm),
      }),
      preliminar: () => ({
        leiaute: nedipTxt(e.leiaute), viabilidade: nedipTxt(e.viabilidade),
        prototipos: nedipLista(e.prototipos).map((x) => Object.assign({ nome: '', data: '', descricao: '', resultado: '' }, x)),
        fmea: nedipLista(e.fmea).map((x) => Object.assign({ id: uidN('fm'), item: '', modo: '', efeito: '', causa: '', s: 5, o: 5, d: 5, acao: '', responsavel: '', riscoId: '' }, x)),
      }),
      detalhado: () => ({
        bom: nedipLista(e.bom).map((x) => Object.assign({ item: '', descricao: '', quantidade: null, unidade: 'un', material: '', origem: 'fabricado', fornecedor: '' }, x)),
        manualUso: Object.fromEntries(window.NEDIP_MANUAL_USO.map(([k]) => [k, nedipTxt((e.manualUso || {})[k])])),
        manuais: Object.assign({ projeto: '', uso: '', geradoEm: '', projetoAnexo: '', usoAnexo: '' }, e.manuais || {}),
      }),
      producao: () => ({ processos: nedipTxt(e.processos), fornecedores: nedipTxt(e.fornecedores), lotePiloto: nedipTxt(e.lotePiloto), liberacao: nedipTxt(e.liberacao) }),
      lancamento: () => ({ plano: nedipTxt(e.plano), canais: nedipTxt(e.canais), treinamento: nedipTxt(e.treinamento), certificacoes: nedipTxt(e.certificacoes), data: nedipTxt(e.data),
        economia: window.Economia ? Economia.normalizar(e.economia) : (e.economia || {}) }), // análise econômica e de mercado (economia.js)
      validacao: () => ({ campo: nedipTxt(e.campo), satisfacao: nedipTxt(e.satisfacao), melhorias: nedipTxt(e.melhorias), encerramento: nedipTxt(e.encerramento),
        questionarios: nedipLista(e.questionarios).map((q) => Object.assign({ publico: '', meio: '', respondentes: null, data: '', observacao: '' }, q)) }),
    };
    out.etapas[et.id] = Object.assign(base, X[et.id]());
    if (et.id === 'informacional' && Array.isArray(e.consolidacaoNoQfd)) out.etapas.informacional.consolidacaoNoQfd = e.consolidacaoNoQfd.map(String); // o que da consolidação já foi para o QFD
  });
  if (prod.pcDados && typeof prod.pcDados === 'object' && !Array.isArray(prod.pcDados)) out.pcDados = prod.pcDados; // projeto conceitual/preliminar completo (seções)
  return out;
};

window.nedipEtapasAtivas = (p) => window.NEDIP_ETAPAS.filter((et) => !p.produto || !p.produto.fases || p.produto.fases[et.id] !== false);

/** Princípios de solução de uma subfunção (um por linha). */
window.nedipPrincipios = (s) => String(s.principios || '').split('\n').map((x) => x.trim()).filter(Boolean);

/** Identificador estável de uma especificação (item da qualidade). */
window.nedipIdEspec = (q) => q.id || (q.qfd && q.qfd.id ? 'qfd_' + q.qfd.id : '');

/** Árvore TRL a partir da estrutura de funções: produto → funções (subsistemas) → subfunções (montagens). */
window.nedipArvoreFuncoes = function (p) {
  const c = p.produto.etapas.conceitual;
  const conc = c.concepcoes.find((x) => x.selecionada);
  const noT = (titulo, tipo, just, key) => ({ chave: '', idOriginal: null, stringId: '', titulo, tipo, nivel: 0, visivel: true, keyTechItems: key || 'Nenhum',
    justification: just, implementationMethod: 'Indefinido', supplier: 'Não Aplicável', trlInformado: null, filhos: [], avaliacao: { origem: 'interno', criterios: {}, atualizado: '' } });
  const raiz = Object.assign(noT(c.funcaoGlobal.nome || p.projeto.nome || 'Produto', 'product', 'Gerado da estrutura de funções (projeto conceitual)' + (conc ? ` – concepção: ${conc.nome}` : '')),
    p.trl.arvore.some((n) => n.origemFuncao === '__raiz') ? {} : { origemFuncao: '__raiz' }); // a versão simplificada reconhece esta árvore
  c.funcoes.forEach((f) => {
    const s = Object.assign(noT(f.nome || 'Função', 'subsystem', 'Função parcial (projeto conceitual)'), { origemFuncao: f.id });
    f.subfuncoes.forEach((sf) => s.filhos.push(noT(sf.escolhido ? `${sf.nome} — ${sf.escolhido}` : (sf.nome || 'Subfunção'), 'assembly',
      'Subfunção (projeto conceitual)' + (sf.escolhido ? '; princípio de solução escolhido: ' + sf.escolhido : '')
        + (sf.maturidadeTexto ? `; maturidade: ${sf.maturidadeTexto}${sf.trlFaixa ? ` (TRL provável ${sf.trlFaixa})` : ''}` : '')
        + (sf.concorrentes && sf.concorrentes.length ? '; usado por: ' + sf.concorrentes.join(', ') : ''), sf.escolhido || 'Nenhum')));
    raiz.filhos.push(s);
  });
  return raiz;
};

/** Pontuação ponderada de cada concepção: Σ(peso × nota) / Σ(peso), notas de 1 a 5. */
window.nedipPontuacao = function (c) {
  const crit = c.decisao.criterios.filter((k) => +k.peso > 0);
  const somaPeso = crit.reduce((s, k) => s + +k.peso, 0);
  return c.concepcoes.map((cc) => {
    const avaliados = crit.filter((k) => k.notas[cc.id] !== null && k.notas[cc.id] !== undefined && k.notas[cc.id] !== '');
    const total = avaliados.reduce((s, k) => s + +k.peso * +k.notas[cc.id], 0);
    return { id: cc.id, nome: cc.nome, nota: somaPeso ? total / somaPeso : null, completos: avaliados.length === crit.length && crit.length > 0 };
  });
};

/** RPN de uma linha da FMEA. */
window.nedipRpn = (x) => (+x.s || 0) * (+x.o || 0) * (+x.d || 0);

/** Requisitos de cliente a partir da consolidação dos questionários: peso ∝ importância média × citações. */
window.nedipNecessidadesDaConsolidacao = function (cons) {
  const l = cons.filter((c) => String(c.necessidade).trim()).map((c) => ({ descricao: c.necessidade.trim(), bruto: (+c.importancia || 0) * Math.max(+c.citacoes || 0, 1) }));
  const soma = l.reduce((s, x) => s + x.bruto, 0) || 1;
  return l.map((x) => ({ descricao: x.descricao, peso: Math.round(x.bruto / soma * 1e4) / 1e4, origem: 'questionários' })).sort((a, b) => b.peso - a.peso);
};

/** Resumo das fases ativas: recomendações aplicadas e situação. */
window.nedipResumo = function (p) {
  return window.nedipEtapasAtivas(p).map((et) => {
    const e = p.produto.etapas[et.id];
    const feitas = et.recomendacoes.filter(([id]) => e.recomendacoes[id]).length;
    const macros = e.macros.map((u) => p.macroentregas.findIndex((m) => m.uid === u) + 1).filter((n) => n > 0);
    return { id: et.id, macro: et.macro, nome: et.nome, saida: et.saida, status: e.status, feitas, total: et.recomendacoes.length, macros, anexos: e.anexos.length, app: e.app };
  });
};
