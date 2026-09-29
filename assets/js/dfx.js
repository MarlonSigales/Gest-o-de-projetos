/*
 * Catálogo DfX (Design for X) com recomendações baseadas em:
 * PAHL, G.; BEITZ, W.; FELDHUSEN, J.; GROTE, K.-H. Engineering Design: A Systematic Approach. 3. ed. London: Springer, 2007.
 * (ed. brasileira: Projeto na Engenharia. São Paulo: Blücher, 2005). Os capítulos citados são os da edição inglesa de 2007;
 * a numeração muda entre edições — confira na sua.
 *
 * trlMin: a partir de qual TRL a diretriz costuma ser exigida.
 * condicaoMin: condição de teste mínima em que a diretriz pode ser verificada (índice de DFX_CONDICOES).
 */
'use strict';

window.DFX_CONDICOES = [
  ['bancada', 'Bancada / prova de conceito (TRL 3–4)'],
  ['laboratorio', 'Laboratório / ambiente simulado (TRL 4–5)'],
  ['relevante', 'Ambiente relevante (TRL 5–6)'],
  ['operacional', 'Ambiente operacional / campo (TRL 7+)'],
];

const CAP7 = 'Pahl et al. (2007), cap. 7 – Embodiment design (diretrizes de projeto de forma)';

window.DFX_CATALOGO = [
  { id: 'regras_basicas', nome: 'Regras básicas: clareza, simplicidade e segurança', ref: CAP7 + ' – regras básicas', trlMin: 3, condicaoMin: 0, recomendacoes: [
    'Clareza: cada função tem um efeito inequívoco; relações entrada–saída sem ambiguidade',
    'Simplicidade: menor número de peças e de formas; geometrias simples de fabricar e verificar',
    'Segurança direta: o próprio princípio de solução evita o perigo',
    'Segurança indireta: dispositivos e sistemas de proteção quando a segurança direta não é possível',
    'Advertências/sinalização apenas como último recurso',
  ] },
  { id: 'qualidade', nome: 'Projeto para a qualidade', ref: 'Pahl et al. (2007), cap. 10 – Design for quality', trlMin: 3, condicaoMin: 0, recomendacoes: [
    'Aplicar métodos preventivos desde o início (QFD, FMEA, análise de árvore de falhas)',
    'Identificar fatores de perturbação e tornar o projeto robusto a eles',
    'Definir critérios de aceite e método de verificação para cada requisito',
    'Revisões de projeto com checklist em cada etapa',
    'Registrar falhas e realimentar o projeto (lições aprendidas)',
  ] },
  { id: 'custo', nome: 'Projeto para custo mínimo (design to cost)', ref: 'Pahl et al. (2007), cap. 11 – Design for minimum costs', trlMin: 4, condicaoMin: 0, recomendacoes: [
    'Estimar custos já na fase conceitual, onde a maior parte do custo é definida',
    'Definir custo-alvo e acompanhá-lo a cada revisão',
    'Reduzir número de peças, variantes e complexidade',
    'Preferir componentes padronizados/comerciais',
    'Comparar custo de material × custo de fabricação por alternativa',
  ] },
  { id: 'risco', nome: 'Projeto para risco mínimo', ref: CAP7 + ' – design for minimum risk', trlMin: 4, condicaoMin: 1, recomendacoes: [
    'Identificar modos de falha e suas consequências (FMEA)',
    'Princípio de vida segura (safe-life): dimensionar para não falhar no uso previsto',
    'Princípio de falha segura (fail-safe): a falha não causa dano grave e é percebida',
    'Redundância em funções críticas (ativa, passiva ou por princípios diferentes)',
    'Monitoramento e alarme de estados críticos',
  ] },
  { id: 'normas', nome: 'Projeto conforme normas', ref: CAP7 + ' – design to standards', trlMin: 5, condicaoMin: 1, recomendacoes: [
    'Levantar normas obrigatórias aplicáveis (ex.: NR-12, ABNT, IEC/EMC)',
    'Usar elementos normalizados e séries de números preferenciais',
    'Padronizar variantes e interfaces internas',
    'Registrar a conformidade normativa nos documentos de projeto',
  ] },
  { id: 'dilatacao', nome: 'Projeto considerando dilatação térmica', ref: CAP7 + ' – design to allow for expansion', trlMin: 5, condicaoMin: 2, recomendacoes: [
    'Identificar fontes de calor e faixas de temperatura de operação',
    'Permitir dilatação livre em uma direção (mancal/fixação guiada), evitando restrição dupla',
    'Considerar coeficientes de dilatação diferentes em materiais combinados',
    'Avaliar gradientes transitórios (partida, parada, exposição ao sol)',
    'Calcular deslocamentos e tensões térmicas nos pontos críticos',
  ] },
  { id: 'fluencia', nome: 'Projeto considerando fluência e relaxação', ref: CAP7 + ' – design for creep and relaxation', trlMin: 5, condicaoMin: 2, recomendacoes: [
    'Verificar temperatura e tempo de carga, sobretudo em polímeros e juntas aquecidas',
    'Evitar uniões por pressão/parafusadas sujeitas a perda de pré-carga',
    'Usar elementos elásticos (molas, arruelas) para manter a pré-carga',
    'Prever reaperto ou inspeção periódica quando a relaxação for inevitável',
  ] },
  { id: 'corrosao', nome: 'Projeto contra corrosão', ref: CAP7 + ' – design against corrosion', trlMin: 5, condicaoMin: 2, recomendacoes: [
    'Evitar frestas e pontos de acúmulo de água, poeira e resíduos (prever drenagem)',
    'Evitar pares galvânicos ou isolar metais diferentes',
    'Escolher material ou proteção superficial adequada ao ambiente (fertilizantes, defensivos, umidade)',
    'Prever margem de corrosão, pontos de inspeção e facilidade de limpeza',
    'Proteger conectores e placas eletrônicas (vedação, conformal coating)',
  ] },
  { id: 'desgaste', nome: 'Projeto contra desgaste', ref: CAP7 + ' – design to minimise wear', trlMin: 5, condicaoMin: 2, recomendacoes: [
    'Identificar pares tribológicos e o mecanismo de desgaste esperado',
    'Separar as superfícies (lubrificação, mancais adequados) sempre que possível',
    'Concentrar o desgaste em peças baratas e fáceis de substituir',
    'Selecionar materiais e tratamentos superficiais resistentes',
    'Proteger contra abrasivos (solo, poeira, sementes, tratamento de sementes)',
  ] },
  { id: 'ergonomia', nome: 'Projeto ergonômico', ref: CAP7 + ' – design for ergonomics', trlMin: 6, condicaoMin: 2, recomendacoes: [
    'Adequar dimensões, alcances e forças ao usuário (antropometria)',
    'Comandos e indicações claros, coerentes e sem ambiguidade',
    'Reduzir carga física e cognitiva (sequências simples, poucos ajustes)',
    'Considerar ruído, vibração, iluminação e posturas de operação',
    'Validar com usuários reais em condição representativa',
  ] },
  { id: 'estetica', nome: 'Projeto estético', ref: CAP7 + ' – design for aesthetics', trlMin: 7, condicaoMin: 3, recomendacoes: [
    'Forma coerente com a função (a aparência comunica o uso)',
    'Unidade e ordem visual: poucas formas, cores e materiais',
    'Identidade visual/de marca consistente',
    'Acabamento que transmita qualidade',
  ] },
  { id: 'producao', nome: 'Projeto para fabricação (DFM)', ref: CAP7 + ' – design for production', trlMin: 6, condicaoMin: 2, recomendacoes: [
    'Adequar cada peça ao processo previsto (usinagem, chapa, fundição, injeção, PCB)',
    'Reduzir número de peças e de operações',
    'Especificar tolerâncias e acabamentos apenas onde a função exige',
    'Preferir peças padronizadas e compradas',
    'Escolher entre integrar ou dividir peças considerando o lote e o custo',
  ] },
  { id: 'montagem', nome: 'Projeto para montagem (DFA)', ref: CAP7 + ' – design for assembly', trlMin: 6, condicaoMin: 2, recomendacoes: [
    'Reduzir número de peças e de operações de montagem',
    'Facilitar manuseio e inserção (chanfros, guias; simetria ou assimetria evidente)',
    'Impedir montagem errada (poka-yoke)',
    'Montar em uma direção, preferencialmente de cima, sem ajustes',
    'Estrutura modular, com subconjuntos testáveis isoladamente',
  ] },
  { id: 'manutencao', nome: 'Projeto para manutenção', ref: CAP7 + ' – design for maintenance', trlMin: 6, condicaoMin: 2, recomendacoes: [
    'Prever inspeção, manutenção e reparo desde o projeto',
    'Acesso fácil aos componentes de desgaste e aos pontos de ajuste',
    'Evitar ferramentas especiais',
    'Indicação de estado e diagnóstico de falhas (inclusive eletrônico)',
    'Peças de reposição padronizadas e intercambiáveis',
  ] },
  { id: 'reciclagem', nome: 'Projeto para reciclagem', ref: CAP7 + ' – design for recycling', trlMin: 7, condicaoMin: 3, recomendacoes: [
    'Facilitar a desmontagem (uniões separáveis)',
    'Reduzir e identificar a variedade de materiais',
    'Evitar unir de forma inseparável materiais incompatíveis',
    'Permitir reuso de componentes e módulos',
    'Prever descarte adequado de eletrônicos e baterias',
  ] },
];

/** Estrutura do DfX no JSON: completa o catálogo sem apagar escolhas já feitas. */
window.dfxNormalizar = function (dfx) {
  dfx = (dfx && typeof dfx === 'object' && !Array.isArray(dfx)) ? dfx : {};
  const itens = Array.isArray(dfx.itens) ? dfx.itens : [];
  const porId = Object.fromEntries(itens.map((i) => [i.id, i]));
  const out = window.DFX_CATALOGO.map((c) => {
    const at = porId[c.id] || {};
    const marc = Object.fromEntries((at.recomendacoes || []).map((r) => [r.texto, !!r.marcado]));
    return {
      id: c.id, nome: c.nome, ref: c.ref, trlMin: at.trlMin ?? c.trlMin, condicaoMin: at.condicaoMin ?? c.condicaoMin,
      decisao: at.decisao || '', justificativa: at.justificativa || '', personalizado: false,
      recomendacoes: c.recomendacoes.map((t) => ({ texto: t, marcado: !!marc[t] })),
    };
  });
  itens.filter((i) => i.personalizado).forEach((i) => out.push(Object.assign({ decisao: '', justificativa: '', ref: 'Definido pela equipe', trlMin: 4, condicaoMin: 0, recomendacoes: [] }, i, { personalizado: true })));
  return { condicaoTeste: dfx.condicaoTeste || '', itens: out };
};

/** Sugestão pela maturidade: usar quando TRL atual e condição de teste já permitem verificar a diretriz. */
window.dfxSugestao = function (item, trlAtual, condicaoTeste) {
  const ci = window.DFX_CONDICOES.findIndex(([v]) => v === condicaoTeste);
  if (trlAtual === null || trlAtual === undefined) return { decisao: '', motivo: 'sem TRL avaliado' };
  if (trlAtual < item.trlMin) return { decisao: 'negligenciar', motivo: `TRL atual ${trlAtual} < ${item.trlMin}` };
  if (ci >= 0 && ci < item.condicaoMin) return { decisao: 'negligenciar', motivo: `condição de teste insuficiente (requer ${window.DFX_CONDICOES[item.condicaoMin][1].split(' (')[0].toLowerCase()})` };
  return { decisao: 'usar', motivo: `TRL ${trlAtual} ≥ ${item.trlMin}` + (ci >= 0 ? ' e condição de teste adequada' : '') };
};

/** Condição de teste sugerida pelo TRL. */
window.dfxCondicaoPorTrl = (trl) => (trl === null || trl === undefined) ? '' : trl <= 3 ? 'bancada' : trl <= 4 ? 'laboratorio' : trl <= 6 ? 'relevante' : 'operacional';
