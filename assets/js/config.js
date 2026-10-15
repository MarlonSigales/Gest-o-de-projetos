/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/* Dados institucionais usados nos relatórios. Edite aqui para outra unidade. */
'use strict';

window.CONFIG = {
  unidade: {
    nome: 'InovaAgro/UFPel – Tecnologias para a Agricultura',
    sigla: 'INOVAAGRO-UFPEL',
    site: 'wp.ufpel.edu.br/embrapii',
    telefones: '+55 53 981442370 / 866 522346',
    email: 'inovaagro.embrapii@gmail.com',
    endereco: 'Campus Universitário da UFPel, Capão do Leão - RS',
    cabecalhoAceite: [
      'MINISTÉRIO DA EDUCAÇÃO',
      'UNIVERSIDADE FEDERAL DE PELOTAS',
      'SUPERINTENDÊNCIA DE INOVAÇÃO E DESENVOLVIMENTO INTERINSTITUCIONAL',
      'UNIDADE EMBRAPII INOVAAGRO-UFPEL',
    ],
    rodapeAceite: ['Unidade Embrapii InovaAgro UFPEL', 'Faculdade de Agronomia Eliseu Maciel', 'Campus do Capão do Leão, Pelotas, RS'],
  },
  urlMaturidade: 'https://imatec.aeb.gov.br',
  // Sistema QFD: aberto na etapa de qualidade; ao voltar, o sistema pede o backup JSON exportado lá
  anexoMaxMb: 50,        // documentos das fases do projeto de produto (produto/<fase>/)
  urlQfd: 'https://marlonsigales.github.io/QFD/index.html',
  uploadMaxMb: 10,
  // Limite de anexo do EmailJS (plano gratuito). Acima disso o e-mail vai sem o JSON anexado, com aviso.
  emailjsLimiteAnexoKb: 45,
};
