/*
 * Balões explicativos: ao parar o mouse (ou focar pelo teclado) sobre um botão, aba ou campo, aparece um balão
 * dizendo para que serve. Os textos ficam num só dicionário, por ação (data-acao), aba (data-aba), tipo de bloco,
 * botão do menu (id) e campo (último trecho do data-path). Elementos com title="" também usam o balão.
 * Pode ser desligado em Configurações (preferência deste navegador: App.cfg.semDicas).
 */
'use strict';

App.DICAS = {
  aba: {
    projeto: 'Dados gerais: nome, código, empresa, datas, TRL inicial e alvo, e os e-mails das macroentregas.',
    areas: 'Áreas técnicas do projeto (mecânica, eletrônica, software…) e quem responde por cada uma.',
    equipe: 'Pessoas da equipe e interessados (empresa, Embrapii), com função e e-mail.',
    macros: 'Cada macroentrega tem um só texto: enquanto em andamento gera relatórios de andamento; finalizada, gera o relatório da macroentrega com termo de aceite.',
    cronograma: 'Atividades com datas, responsáveis e percentual; o gráfico de Gantt e os atrasos saem daqui.',
    pesquisa: 'Busca de anterioridade (patentes) e referências bibliográficas no padrão ABNT, citáveis nos textos.',
    produto: 'Projeto do produto/serviço pelas fases do NeDIP: informacional (QFD), conceitual, preliminar e detalhado.',
    trl: 'Avaliação do nível de maturidade tecnológica (TRL) de cada item, com os critérios de cada nível.',
    qualidade: 'Diretrizes de projeto para X (DfX): fabricação, montagem, manutenção, custo…',
    riscos: 'Riscos do projeto com probabilidade, impacto e plano de resposta (matriz de riscos).',
    licoes: 'Lições aprendidas: o que deu certo ou errado e o que fazer da próxima vez.',
    relatorios: 'Gera os PDFs (macroentregas, relatório geral, manuais), o e-mail e o ZIP completo do projeto.',
  },
  id: {
    btnProjetos: 'Criar um projeto novo, abrir uma pasta ou ZIP, retomar um recente ou carregar o exemplo da roda de bicicleta.',
    btnSalvar: 'Grava o projeto (na pasta escolhida ou no navegador). Atalho: Ctrl+S.',
    btnConfig: 'Preferências: e-mails, link do sistema QFD, salvamento automático e balões explicativos.',
  },
  bloco: {
    texto: 'Parágrafos com formatação simples (negrito, itálico, listas) e citações {{ref:…}} de figuras, tabelas e referências.',
    titulo: 'Título de seção (níveis 1 a 3), numerado automaticamente no PDF.',
    figura: 'Imagem com título e fonte no padrão ABNT, numerada automaticamente.',
    tabela: 'Tabela no padrão ABNT (cole do Excel/Planilhas), numerada automaticamente.',
    qfd: 'Partes escolhidas da análise QFD importada (casa da qualidade, requisitos, inconsistências…).',
    nedip: 'Partes escolhidas do projeto de produto (NeDIP): funções, concepções, especificações…',
    questionario: 'Partes escolhidas do questionário aos clientes: roteiro, gráficos das respostas, consolidação.',
    pesquisa: 'Partes escolhidas da pesquisa: estratégia de busca, patentes encontradas e síntese.',
    quebra: 'Força o conteúdo seguinte a começar em nova página no PDF.',
  },
  acao: {
    'macro-finalizar': 'Finalizada: o texto passa a gerar o relatório da macroentrega (com conclusão e termo de aceite). Em andamento: gera relatórios de andamento.',
    'rel-gerar': 'Guarda uma cópia do texto atual no histórico, com data e período, e gera o PDF do relatório de andamento.',
    'rel-pdf': 'Gera de novo o PDF desta versão do relatório de andamento.',
    'rel-abrir': 'Abre esta versão do histórico para corrigir (não muda o texto atual da macroentrega).',
    'rel-excluir': 'Remove esta versão do histórico de relatórios de andamento.',
    'pdf-macro': 'Gera o PDF desta macroentrega: relatório da macroentrega se finalizada, de andamento se não.',
    'pdf-geral': 'Relatório geral de andamento do projeto, com todas as macroentregas e os apêndices.',
    'add-macro': 'Acrescenta uma macroentrega ao projeto.',
    'rem-macro': 'Exclui esta macroentrega (pede confirmação).',
    'sel-macro': 'Mostra esta macroentrega.',
    'sel-etapa': 'Mostra esta fase do projeto de produto.',
    'bloco-add': 'Insere um bloco neste ponto do texto.',
    'bloco-editar': 'Abre o bloco para edição; clique de novo para fechar e ver a prévia.',
    'bloco-mover': 'Move o bloco para cima ou para baixo.',
    'bloco-excluir': 'Exclui o bloco (figuras e tabelas sem outro uso também saem).',
    'bloco-lista': 'Escolhe quais partes este bloco mostra no PDF.',
    'txt-fmt': 'Aplica a formatação ao texto selecionado.',
    'add-linha': 'Acrescenta uma linha.',
    'rem-linha': 'Remove esta linha.',
    mover: 'Muda a ordem deste item.',
    'tab-op': 'Acrescenta ou remove linhas e colunas da tabela.',
    'tab-colar': 'Cole uma tabela copiada do Excel ou do Google Planilhas.',
    'tab-colar-ok': 'Substitui a tabela pelo conteúdo colado.',
    'ir-aba': 'Vai para a seção indicada.',
    'qfd-abrir': 'Abre o sistema QFD em outra aba; ao terminar, exporte o backup (JSON) e importe-o aqui.',
    'qfd-pdf': 'Gera o PDF da análise QFD importada.',
    'qfd-int': 'Leva este item do QFD para o projeto (necessidades, requisitos, especificações).',
    'qfd-int-todas': 'Leva todos os itens do QFD para o projeto de uma vez.',
    'nedip-app-abrir': 'Abre o aplicativo de apoio desta fase em outra aba.',
    'nedip-baixar': 'Baixa o arquivo guardado junto do projeto.',
    'nedip-rem-anexo': 'Remove este documento do projeto.',
    'nedip-manual': 'Gera o manual de projeto (PDF) com as decisões de todas as fases.',
    'nedip-trl': 'Avalia o TRL a partir do que esta fase já produziu.',
    'nedip-quest-pdf': 'PDF do questionário (roteiro e resultados) para enviar ou arquivar.',
    'nedip-roteiro': 'Monta o roteiro de perguntas do questionário a partir das necessidades.',
    'nedip-normalizar-pesos': 'Ajusta os pesos para que somem 100%.',
    'nedip-fmea-riscos': 'Leva os modos de falha mais graves (FMEA) para a lista de riscos do projeto.',
    'nedip-cons-necessidades': 'Transforma as respostas consolidadas do questionário em necessidades dos clientes.',
    'nedip-conc-qfd': 'Usa os concorrentes do QFD na comparação.',
    'nedip-int': 'Leva este item para o projeto.',
    'nedip-int-todas': 'Leva todos os itens para o projeto.',
    'form-imp': 'Importa as respostas do Google Forms (CSV exportado da planilha de respostas).',
    'form-csv': 'Baixa o modelo de perguntas para montar o formulário no Google Forms.',
    'form-pdf': 'PDF do questionário com os gráficos das respostas.',
    'form-modelo': 'Preenche o questionário com um modelo de perguntas para começar.',
    'form-limpar': 'Apaga as respostas importadas (as perguntas ficam).',
    'form-destaques': 'Escolhe as perguntas destacadas no relatório.',
    'form-consolidar': 'Resume as respostas de cada pergunta (médias, contagens, comentários).',
    'form-rem-pergunta': 'Remove esta pergunta do questionário.',
    'trl-avaliar': 'Abre os critérios do nível para avaliar este item.',
    'trl-confirmar': 'Confirma o nível atingido por este item.',
    'trl-add-raiz': 'Acrescenta um item principal (sistema) à árvore do TRL.',
    'trl-add-filho': 'Acrescenta um subitem a este item.',
    'trl-remover': 'Remove este item e seus subitens.',
    'trl-exportar': 'Exporta a avaliação de TRL.',
    'dfx-sugerir': 'Sugere diretrizes DfX a partir do tipo de produto.',
    'dfx-add': 'Acrescenta uma diretriz DfX.',
    'dfx-decidir': 'Registra a decisão tomada para esta diretriz.',
    'ref-nova': 'Acrescenta uma referência bibliográfica (ABNT).',
    'ref-colar': 'Cole uma referência pronta (texto ABNT ou BibTeX) para preencher os campos.',
    'ref-abrir': 'Abre a referência para edição.',
    'exp-zip': 'Baixa o projeto completo (dados, figuras, documentos e PDFs) num ZIP.',
    'exp-json': 'Baixa só os dados do projeto (JSON), sem os arquivos.',
    importar: 'Abre um projeto a partir de um ZIP ou JSON exportado.',
    'ir-importar': 'Vai para a importação de projeto.',
    'carregar-exemplo': 'Carrega o projeto exemplo da roda de bicicleta, com todos os recursos preenchidos e um guia passo a passo.',
    'novo-navegador': 'Cria um projeto novo guardado no navegador.',
    'abrir-pasta': 'Escolhe uma pasta do computador para guardar o projeto (recomendado no Chrome/Edge).',
    'abrir-navegador': 'Abre um projeto guardado no navegador.',
    'abrir-recente': 'Abre este projeto recente.',
    'esquecer-recente': 'Tira este projeto da lista de recentes (os arquivos não são apagados).',
    restaurar: 'Volta o projeto para esta versão salva.',
    historico: 'Mostra as versões salvas anteriormente.',
    'email-previa': 'Mostra o e-mail que será enviado, com os anexos.',
    'email-reenviar': 'Monta de novo o e-mail com os PDFs atualizados.',
    'baixar-anexos': 'Baixa todos os documentos anexados.',
    'cfg-salvar': 'Grava as configurações.',
    'fechar-modal': 'Fecha esta janela.',
    'guia-ir': 'Vai para o ponto do exemplo explicado neste passo.',
    'guia-ocultar': 'Esconde o guia do exemplo (pode ser reaberto no Projeto).',
    'grupo-toggle': 'Mostra ou esconde este grupo.',
    copiar: 'Copia o texto para a área de transferência.',
    excluir: 'Exclui este item (pede confirmação).',
  },
  campo: {
    nome: 'Nome pelo qual o item aparece nos relatórios.',
    codigo: 'Código do projeto na Embrapii/unidade, usado nos cabeçalhos dos PDFs.',
    trlInicial: 'Nível de maturidade tecnológica no início do projeto.',
    trlAlvo: 'Nível de maturidade que o projeto deve atingir ao final.',
    trlEsperado: 'TRL que esta macroentrega deve alcançar; os “próximos passos” do relatório mostram o que falta.',
    dataInicio: 'Data de início.',
    dataPrevista: 'Data prevista para a entrega.',
    dataEntrega: 'Data em que foi entregue (preenchida ao finalizar).',
    status: 'Situação atual.',
    percentual: 'Quanto já foi feito (0 a 100%). Em branco, é calculado pelas atividades.',
    responsavel: 'Pessoa responsável (da equipe).',
    periodoInicio: 'Início do período coberto pelo relatório de andamento.',
    periodoFim: 'Fim do período coberto pelo relatório de andamento.',
    etapasFuturas: 'O que vem a seguir; aparece em “Próximas etapas” do relatório.',
    conclusao: 'Conclusão da macroentrega, só no relatório final dela.',
    legenda: 'Título da figura/tabela (ABNT: acima, numerado automaticamente).',
    fonte: 'Fonte da figura/tabela (ABNT: abaixo). Ex.: “Elaborado pelos autores (2026)”.',
    email: 'E-mail usado no envio dos relatórios.',
    probabilidade: 'Chance de o risco acontecer (1 a 5).',
    impacto: 'Gravidade se o risco acontecer (1 a 5).',
  },
};

/** Texto do balão para o elemento (ou null). */
App.dicaDe = function (el) {
  const D = App.DICAS, d = el.dataset;
  if (el.dataset.dica) return el.dataset.dica;
  if (el.id && D.id[el.id]) return D.id[el.id];
  if (d.aba && D.aba[d.aba]) return D.aba[d.aba];
  if (d.acao === 'bloco-add' && D.bloco[d.tipo]) return D.bloco[d.tipo];
  if (d.acao && D.acao[d.acao]) return D.acao[d.acao];
  if (d.path) { const k = d.path.split('.').pop(); if (D.campo[k]) return D.campo[k]; }
  return null;
};

(function () {
  let balao = null, alvo = null, timer = null;
  const SEL = '[data-dica],[data-acao],[data-aba],[data-path],#btnProjetos,#btnSalvar,#btnConfig,[title]';
  const esconder = () => { clearTimeout(timer); if (balao) balao.classList.remove('visivel'); alvo = null; };
  const mostrar = (el) => {
    // title nativo vira balão (evita os dois ao mesmo tempo)
    if (el.hasAttribute('title')) { if (el.title) el.dataset.dica = el.title; el.removeAttribute('title'); }
    const txt = App.dicaDe(el);
    if (!txt) return;
    if (!balao) { balao = document.createElement('div'); balao.className = 'balao'; balao.setAttribute('role', 'tooltip'); document.body.appendChild(balao); }
    balao.textContent = txt;
    balao.classList.add('visivel');
    const r = el.getBoundingClientRect(), b = balao.getBoundingClientRect(), m = 8;
    let x = r.left + r.width / 2 - b.width / 2, y = r.bottom + m, cima = false;
    if (y + b.height > innerHeight - m) { y = r.top - b.height - m; cima = true; }
    x = Math.max(m, Math.min(x, innerWidth - b.width - m));
    balao.style.left = x + 'px'; balao.style.top = Math.max(m, y) + 'px';
    balao.classList.toggle('cima', cima);
  };
  const entrar = (e) => {
    if (App.cfg && App.cfg.semDicas) return;
    const el = e.target.closest && e.target.closest(SEL);
    if (!el || el === alvo) return;
    esconder(); alvo = el;
    timer = setTimeout(() => { if (alvo === el && el.isConnected) mostrar(el); }, e.type === 'focusin' ? 300 : 550);
  };
  document.addEventListener('mouseover', entrar);
  document.addEventListener('focusin', entrar);
  document.addEventListener('mouseout', (e) => { if (alvo && !alvo.contains(e.relatedTarget)) esconder(); });
  document.addEventListener('focusout', esconder);
  document.addEventListener('mousedown', esconder);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') esconder(); });
  window.addEventListener('scroll', () => { if (balao && balao.classList.contains('visivel')) esconder(); }, true); // rolagem durante a espera não cancela o balão
})();
