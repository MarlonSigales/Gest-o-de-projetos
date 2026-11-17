/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Testes da leitura do plano de trabalho (assets/js/plano.js) com um plano FICTÍCIO montado como o PDF chega do pdf.js
 * (itens de texto com posição). Rodar: node tests/plano.test.js
 */
'use strict';
const Plano = require('../assets/js/plano.js');

let falhas = 0;
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) falhas++; };

// ---- monta um PDF fictício: cada linha é [y, [x, texto], [x, texto]...]
const H = 10, cw = 5;
const pag = (linhas, fonte = 'f1') => ({ itens: linhas.flatMap(([y, ...cs]) => cs.map(([x, s]) => ({ s, x, y, w: s.length * cw, h: H, f: fonte }))) });
const p1 = pag([
  [100, [90, '1. Dados cadastrais']],
  [120, [90, 'Coordenador']],
  [132, [90, 'Nome do Coordenador Projeto'], [400, 'CPF']],
  [144, [90, 'Ana Exemplo da Silva'], [400, '111.222.333-44']],
  [156, [90, 'Endereço Eletrônico (e-mail)'], [300, 'Telefone celular']],
  [168, [90, 'ana@exemplo.org'], [300, '(53) 99999-0000']],
  [190, [90, 'Coordenador Adjunto']],
  [202, [90, 'Nome do Coordenador Adjunto do Projeto'], [400, 'CPF']],
  [214, [90, 'Bruno Exemplo'], [400, '555.666.777-88']],
  [226, [90, 'Endereço Eletrônico (e-mail)']],
  [238, [90, 'bruno@exemplo.org']],
  [260, [90, '1.3. Dados dos outros partícipes']],
  [272, [90, 'Tipo'], [200, '2 – Nome / Razão Social'], [420, '3 - CNPJ']],
  [284, [90, '( ) Público (X ) Privado'], [200, 'EMPRESA FICTÍCIA LTDA'], [420, '00.000.000/0001-00']],
  [300, [90, 'Nome do representante legal']],
  [312, [90, 'CARLA FICTÍCIA']],
  [330, [90, '2. Descrição do Projeto']],
  [342, [90, '2.1. Descrição Geral']],
  [354, [90, 'Título Público'], [370, 'Período de Execução']],
  [366, [90, 'Sensor fictício de umidade']],
  [370, [410, '12 meses']],
  [378, [90, 'para grãos armazenados']],
  [390, [90, 'Resumo Público']],
  [402, [90, 'O projeto desenvolve um sensor.']],
  [414, [90, 'Valor Total do Projeto']],
  [426, [90, 'R$ 100.000,00']],
  [440, [90, 'Código XYZ-1234.00001']],
  [460, [90, '2.2. Introdução (Justificativa para o Projeto)']],
  [472, [110, 'A umidade causa perdas.']],
  [490, [90, '2.4. Objetivos']],
  [502, [110, 'Objetivo Geral:']],
  [514, [110, 'Desenvolver um sensor de umidade.']],
  [526, [110, 'Objetivos Específicos:']],
  [538, [90, '1. Projetar o sensor.']],
  [550, [90, '2. Testar o sensor.']],
  [570, [90, '2.5. Metodologia']],
  [582, [110, 'Etapas sequenciais.']],
  [600, [90, '2.6. Resultados e Produtos Esperados']],
  [612, [90, 'Marcar'], [130, 'TRL'], [170, 'Definição']],
  [624, [100, 'x'], [135, '5'], [170, 'Validação em ambiente relevante']],
]);
const p2 = pag([
  [100, [90, '5.2. Detalhamento da equipe com percepção de bolsas']],
  [112, [90, 'Nome'], [190, 'Vínculo'], [300, 'CPF'], [400, 'Função no projeto']],
  [130, [60, 'Ana Exemplo']],
  [142, [190, 'Docente/UFPel'], [300, '111.222.333-44'], [400, 'Coordenadora'], [480, '2.000,00']],
  [154, [60, 'da Silva']],
  [180, [60, 'Davi Teste'], [190, 'Mestrando/UFPel'], [300, '999.888.777-66'], [400, 'Colaborador'], [480, '1.000,00']],
  [210, [60, '6. Cronograma físico-financeiro']],
  [230, [80, 'Ordem'], [140, 'Detalhamento'], [240, 'Parâmetros de Aferição'], [340, 'Métrica'], [400, 'Resultado'], [470, 'Início'], [530, 'Término'], [640, 'Responsável'], [730, 'Recurso (R$)']],
  [250, [140, 'Projeto do'], [240, 'Desenho aprovado'], [470, 'Início do']],
  [262, [85, '1'], [140, 'sensor'], [340, 'Desenho'], [400, 'Aprovação'], [470, '1º mês'], [530, 'Final do 6º mês'], [640, 'Ana Exemplo'], [730, '60.000,00']],
  [290, [140, 'Testes'], [240, 'Relatório'], [470, 'Início do'], [530, 'Final do'], [640, 'Ana Exemplo']],
  [302, [85, '2'], [140, 'de campo'], [340, 'Relatório'], [400, 'Aprovação'], [470, '7º mês'], [530, '12º mês'], [730, '40.000,00']],
  [330, [60, '7. Plano de aplicação e detalhamento das despesas']],
]);

const L = Plano.linhasDeItens([p1, p2]);
const d = Plano.interpretar(L);
ok(d.titulo === 'Sensor fictício de umidade para grãos armazenados', 'título em duas linhas, sem o período ao lado: ' + d.titulo);
ok(d.meses === 12 && d.codigo === 'XYZ-1234.00001' && d.valor === 'R$ 100.000,00', 'período, código e valor');
ok(d.coordenador.nome === 'Ana Exemplo da Silva' && d.coordenador.email === 'ana@exemplo.org', 'coordenador com e-mail');
ok(d.coordenadorAdjunto.nome === 'Bruno Exemplo' && d.coordenadorAdjunto.email === 'bruno@exemplo.org', 'coordenador adjunto');
ok(d.empresa === 'EMPRESA FICTÍCIA LTDA' && d.responsavelEmpresa === 'CARLA FICTÍCIA', 'empresa e representante: ' + d.empresa);
ok(d.objetivoGeral === 'Desenvolver um sensor de umidade.' && d.objetivosEspecificos.length === 2, 'objetivo geral e específicos');
ok(d.trl === 5, 'TRL marcado com x');
ok(d.equipe.length === 2 && d.equipe[0].nome === 'Ana Exemplo da Silva' && d.equipe[0].funcao === 'Coordenadora' && d.equipe[1].vinculo === 'Mestrando/UFPel', 'equipe com nome em várias linhas: ' + JSON.stringify(d.equipe));
ok(!/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(JSON.stringify(d)), 'nenhum CPF nos dados lidos');
ok(d.macros.length === 2 && d.macros[0].titulo === 'Projeto do sensor' && d.macros[0].mesIni === 1 && d.macros[0].mesFim === 6 && d.macros[1].mesIni === 7 && d.macros[1].mesFim === 12 && d.macros[1].recurso === '40.000,00', 'macroentregas do cronograma: ' + JSON.stringify(d.macros.map((m) => [m.titulo, m.mesIni, m.mesFim, m.recurso])));

ok(Plano.funcaoGlobal(d) === 'Desenvolver um sensor de umidade' && Plano.funcoes(d).map((f) => f.nome).join('|') === 'Projetar o sensor|Testar o sensor', 'versão simplificada: função global e funções pelos objetivos');
ok(Plano.encurtar('Desenvolver, otimizar e validar um sistema de aeração, visando reduzir perdas') === 'Desenvolver, otimizar e validar um sistema de aeração', 'nome de função encurtado sem cortar o verbo');

// fonte com o mapa MacRoman trocado
const pm = Plano.linhasDeItens([{ itens: [{ s: 'InovaÁ„o', x: 90, y: 10, w: 40, h: 10, f: 'mac' }, { s: 'n∫ 01', x: 90, y: 30, w: 30, h: 10, f: 'mac' }, { s: 'Órgão – ok', x: 90, y: 50, w: 50, h: 10, f: 'boa' }] }]);
ok(Plano.texto(pm[0]) === 'Inovação' && Plano.texto(pm[1]) === 'nº 01' && Plano.texto(pm[2]) === 'Órgão – ok', 'texto de fonte com mapa trocado é desfeito (as outras fontes ficam como estão)');
ok(Plano.semPessoais('CPF 111.222.333-44\nTel (53) 99999-0000\nCEP 96.010-610\nR$ 1.000,00') === 'CPF\nTel\nCEP 96.010-610\nR$ 1.000,00', 'texto guardado sem CPF e telefone');

// aplicar num projeto mínimo
global.Nucleo = { novaMacro: (n) => ({ uid: 'm' + n, numero: n, titulo: '', descricao: '', objetivosEtapa: [''], resultados: '', blocos: [], percentualConcluido: 0 }), uid: (p) => p + Math.random().toString(36).slice(2, 7), simplificado: () => false };
const p = { projeto: { nome: '', codigo: '', empresaParceira: '', responsavelEmpresa: '', unidadeEmbrapii: '', coordenador: { nome: '', email: '' }, coordenadorAdjunto: { nome: '', email: '' }, objetivoGeral: '', introducao: '', trlEsperadoFinal: 6, dataInicio: '2027-01-10', dataFimPrevista: '', equipe: [] },
  macroentregas: [1, 2, 3, 4].map(global.Nucleo.novaMacro), qualidade: [], interessados: [] };
Plano.aplicar(p, d, false);
ok(p.projeto.nome === d.titulo && p.projeto.trlEsperadoFinal === 5 && p.projeto.dataFimPrevista === '2028-01-09', 'projeto preenchido e fim previsto pelos meses: ' + p.projeto.dataFimPrevista);
ok(p.macroentregas.length === 2 && p.macroentregas[1].dataInicio === '2027-07-10' && p.macroentregas[1].dataPrevista === '2028-01-09', 'macroentregas com datas pelos meses: ' + p.macroentregas.map((m) => m.dataInicio + '→' + m.dataPrevista));
ok(p.projeto.equipe.length === 2 && /Introdução|Justificativa/.test(p.projeto.introducao), 'equipe e introdução');
ok(p.projeto.coordenador.nome === 'Bruno Exemplo' && p.projeto.coordenador.email === 'bruno@exemplo.org' && !p.projeto.coordenadorAdjunto.nome && p.interessados.some((x) => x.nome === 'Ana Exemplo da Silva' && /formal/.test(x.papel)), 'o adjunto do plano é o coordenador do projeto; o formal vai aos interessados');
const nome = p.projeto.nome; p.projeto.nome = 'Meu nome';
Plano.aplicar(p, Object.assign({}, d, { titulo: 'Outro' }), true);
ok(p.projeto.nome === 'Meu nome' && p.projeto.equipe.length === 2, 'completar o aberto não troca o que já tem texto nem repete a equipe');
void nome;

console.log(falhas ? `${falhas} falha(s)` : 'tudo ok');
process.exitCode = falhas ? 1 : 0;
