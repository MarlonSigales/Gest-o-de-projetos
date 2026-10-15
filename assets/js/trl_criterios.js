/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Critérios de avaliação de TRL usados na avaliação interna.
 * Redação própria, baseada nas definições públicas de TRL da NASA (NPR 7123.1, apêndice E)
 * e nos níveis da ISO 16290:2013 (Space systems — Definition of the TRLs and their criteria of assessment).
 * Não reproduz o questionário da ferramenta IMATEC/AEB.
 *
 * Regra: o TRL de um item é o maior nível N em que TODOS os critérios dos níveis 1..N estão atendidos
 * ("sim" ou "não se aplica" com justificativa).
 */
'use strict';

window.TRL_FONTE = 'Critérios baseados em NASA NPR 7123.1 (definições de TRL) e ISO 16290:2013';

window.TRL_NIVEIS = [
  { n: 1, nome: 'Princípios básicos observados e relatados', criterios: [
    ['1a', 'Os princípios científicos/técnicos que sustentam a tecnologia foram identificados'],
    ['1b', 'Esses princípios estão documentados (literatura, relatórios, revisão bibliográfica)'],
  ] },
  { n: 2, nome: 'Conceito tecnológico e/ou aplicação formulados', criterios: [
    ['2a', 'A aplicação prática pretendida foi identificada'],
    ['2b', 'O conceito tecnológico foi formulado (esboços, concepções, princípios de solução)'],
    ['2c', 'Requisitos iniciais ou análise preliminar de viabilidade foram levantados'],
  ] },
  { n: 3, nome: 'Prova de conceito analítica e experimental da função crítica', criterios: [
    ['3a', 'As funções e características críticas foram identificadas'],
    ['3b', 'Há modelagem analítica ou simulação das funções críticas'],
    ['3c', 'As funções críticas foram comprovadas experimentalmente em laboratório (mesmo com partes não integradas)'],
  ] },
  { n: 4, nome: 'Componente e/ou arranjo validado em laboratório', criterios: [
    ['4a', 'Componentes foram integrados num arranjo/protótipo de bancada que executa a função'],
    ['4b', 'Ensaios de laboratório foram feitos e os resultados atendem às predições/requisitos da função'],
    ['4c', 'Os requisitos de desempenho do sistema estão definidos e quantificados'],
  ] },
  { n: 5, nome: 'Componente e/ou arranjo validado em ambiente relevante', criterios: [
    ['5a', 'O arranjo tem fidelidade próxima da aplicação real (forma, ajuste, função e materiais relevantes)'],
    ['5b', 'Foi ensaiado em ambiente relevante (condições e cargas representativas simuladas)'],
    ['5c', 'As interfaces com o sistema hospedeiro estão definidas e foram verificadas'],
  ] },
  { n: 6, nome: 'Modelo/protótipo demonstrado em ambiente relevante', criterios: [
    ['6a', 'Existe protótipo de engenharia representativo do sistema final'],
    ['6b', 'O protótipo foi demonstrado em ambiente relevante, com desempenho medido frente aos requisitos'],
    ['6c', 'Riscos de fabricação, integração e custo foram identificados'],
  ] },
  { n: 7, nome: 'Protótipo do sistema demonstrado em ambiente operacional', criterios: [
    ['7a', 'O protótipo está em escala real e próximo da configuração final'],
    ['7b', 'Foi demonstrado em ambiente operacional (campo/uso real)'],
  ] },
  { n: 8, nome: 'Sistema real concluído e qualificado', criterios: [
    ['8a', 'O sistema na configuração final está concluído'],
    ['8b', 'Foi qualificado por ensaios e demonstrações (normas aplicáveis)'],
    ['8c', 'Documentação de fabricação, operação e manutenção está concluída'],
  ] },
  { n: 9, nome: 'Sistema real comprovado em operação', criterios: [
    ['9a', 'O sistema opera com sucesso em uso real (missão/operação)'],
    ['9b', 'Produção, comercialização ou uso regular estão estabelecidos'],
  ] },
];

/** TRL pelos critérios; null se nada foi respondido. */
window.trlPorCriterios = function (av) {
  const c = (av && av.criterios) || {};
  if (!Object.values(c).some((x) => x && x.r)) return null;
  let nivel = 0;
  for (const lv of window.TRL_NIVEIS) {
    const ok = lv.criterios.every(([id]) => c[id] && (c[id].r === 'sim' || c[id].r === 'na'));
    if (!ok) break;
    nivel = lv.n;
  }
  return nivel || null;
};

/** Critérios que faltam para o próximo nível (para os pontos de verificação). */
window.trlFaltaProximo = function (av) {
  const atual = window.trlPorCriterios(av) || 0;
  const prox = window.TRL_NIVEIS.find((l) => l.n === atual + 1);
  if (!prox) return { nivel: null, faltam: [] };
  const c = (av && av.criterios) || {};
  return { nivel: prox.n, faltam: prox.criterios.filter(([id]) => !(c[id] && (c[id].r === 'sim' || c[id].r === 'na'))).map(([id, t]) => ({ id, texto: t })) };
};
