/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Guia do exemplo: no projeto de exemplo (roda de bicicleta), a aba Projeto mostra um roteiro para quem está
 * começando — o que olhar em cada aba, com um botão que leva direto ao recurso. Some com "Ocultar o guia".
 */
'use strict';

/** [título, explicação, destino {aba, etapa?, macro?, rel?}] */
App.GUIA_EXEMPLO = [
  ['Projeto', 'Vigência com termo aditivo, painel de andamento e textos comuns aos relatórios (com listas e negrito). Dica: pare o mouse sobre qualquer botão, aba ou campo para ver um balão explicando para que serve.', { aba: 'projeto' }],
  ['Equipe e interessados', 'Grupos de e-mail: a gestão recebe o ZIP completo; os demais, os PDFs e o JSON.', { aba: 'equipe' }],
  ['Áreas e responsáveis', 'Cada área ligada a um item da árvore TRL; quem deve ser cobrado quando o TRL estiver baixo.', { aba: 'areas' }],
  ['Projeto informacional', 'Questionário do Google Forms (CSV importado, perguntas editáveis, gráficos e destaques), QFD completo com avaliação competitiva, concorrentes e normas em tabela.', { aba: 'produto', etapa: 'informacional' }],
  ['Pesquisa', 'Busca de anterioridade (patentes fictícias importadas de um CSV do Google Patents, com situação e risco) e referências bibliográficas em ABNT, citadas nos textos com {{ref:código}}.', { aba: 'pesquisa' }],
  ['Projeto conceitual', 'Seções do Sistema de Projeto Conceitual dentro do projeto: função global, estrutura de funções, concepções, matriz de decisão e FMEA — tudo preenchido e sincronizado com o Gestão.', { aba: 'produto', etapa: 'conceitual' }],
  ['Projeto preliminar e detalhado', 'Três rodadas de protótipo (a 3ª aprovada), FMEA alimentado pelas rodadas, lista de materiais, desenhos, planos e manuais de projeto e de uso.', { aba: 'produto', etapa: 'preliminar' }],
  ['Lançamento – análise econômica', 'Fase de mercado: TAM/SAM/SOM, volumes, custo variável por unidade, CAPEX e OPEX → VPL, TIR, payback, ponto de equilíbrio, EVA, valor adicionado, fluxo de caixa e sensibilidade (também no relatório geral).', { aba: 'produto', etapa: 'lancamento' }],
  ['Macroentrega 1', 'Desenvolvimento em blocos: questionário, contexto do produto e análise QFD. Aceite registrado.', { aba: 'macros', macro: 0 }],
  ['Macroentrega 2', 'Bloco “Projeto do produto” com o diagrama de funções; figuras e tabelas sempre dentro do texto, junto do parágrafo que as explica.', { aba: 'macros', macro: 1 }],
  ['Macroentrega 3', 'Finalizada, com aceite. No histórico fica o relatório de andamento emitido antes de finalizar.', { aba: 'macros', macro: 2 }],
  ['Macroentrega 4', 'Um só texto: enquanto “em andamento”, ele gera relatórios de andamento (cópias no histórico); ao marcar “finalizada”, o mesmo texto vira o relatório da macroentrega. Finalizada, com aceite.', { aba: 'macros', macro: 3 }],
  ['Macroentrega 5 (última)', 'Finalizada: lote piloto, validação de campo e TRL 6. O relatório da última macroentrega leva os apêndices: manuais, questionário, análise QFD, busca de anterioridade e lista de documentos.', { aba: 'macros', macro: 4 }],
  ['Cronograma', 'Gantt com caminho crítico e dependências; todas as atividades concluídas.', { aba: 'cronograma' }],
  ['Riscos', 'Matriz probabilidade × impacto; todos os riscos tratados e fechados.', { aba: 'riscos' }],
  ['Qualidade / DfX', 'Especificações do QFD e uma manual, todas conformes; uma não conformidade resolvida por PDCA; diretrizes DfX, inclusive uma criada pela equipe.', { aba: 'qualidade' }],
  ['TRL', 'Árvore do produto avaliada por critérios, com histórico das mudanças.', { aba: 'trl' }],
  ['Lições aprendidas', 'Registro por macroentrega.', { aba: 'licoes' }],
  ['Relatórios e exportação', 'Gere o relatório geral, o de cada macroentrega e exporte o ZIP. Os relatórios começam pelos “próximos passos” (o que falta para o TRL esperado) e o geral termina com os apêndices. Os PDFs mostram tudo o que foi visto acima.', { aba: 'relatorios' }],
];

App.guiaExemploHtml = function () {
  if (!App.p || !App.p.exemplo) return '';
  return `<div class="cartao guia-exemplo"><div class="barra" style="justify-content:space-between;margin-top:0"><h3 style="margin:0">🎓 Guia do exemplo</h3>
    <button class="btn pequeno" data-acao="guia-ocultar" title="Ocultar o guia neste projeto">Ocultar o guia</button></div>
  <p class="muted">Este projeto é fictício e usa todos os recursos do sistema. Siga os passos abaixo; cada botão leva ao lugar certo. Depois, gere os PDFs para ver como cada coisa aparece nos relatórios.</p>
  <ol class="guia-passos">${App.GUIA_EXEMPLO.map(([t, d], i) => `<li><button class="btn pequeno" data-acao="guia-ir" data-i="${i}">${esc(t)}</button> <span>${esc(d)}</span></li>`).join('')}</ol></div>`;
};
App.acoes['guia-ir'] = (el) => {
  const [, , d] = App.GUIA_EXEMPLO[+el.dataset.i];
  App.aba = d.aba;
  if (d.etapa) App.etapaSel = d.etapa;
  if (d.macro !== undefined) App.macroSel = Math.min(d.macro, App.p.macroentregas.length - 1);
  if (d.rel) { const m = App.p.macroentregas[App.macroSel]; App.relAberto = m && m.relatorios[0] ? m.relatorios[0].id : null; }
  App.render(); window.scrollTo(0, 0);
};
App.acoes['guia-ocultar'] = () => {
  if (!confirm('Ocultar o guia do exemplo neste projeto? (Para ver de novo, abra o exemplo outra vez em 📂 Criar/carregar.)')) return;
  App.p.exemplo = false; App.marcarSujo(true); App.render();
};
