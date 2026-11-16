/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Aba Ideias de patente: cada ideia que surge no projeto é anotada aqui (com as palavras de quem teve a ideia) e vira
 * um pré-preenchimento completo para o app "Apoio à Escrita de Patentes": um JSON no formato do pedido daquele app
 * ("apoio-escrita-patentes-pedido"), aberto na entrada dele em "📂 Continuar um pedido".
 * Leva: natureza, título, ficha da invenção (campo, problema, o que existe hoje, solução, componentes numerados,
 * vantagens, aplicações, ensaios, concorrentes), o texto da ideia (para as rodadas com IA de lá), os inventores com a
 * participação, a busca de anterioridade da aba Pesquisa (documentos, palavras-chave e classes) e os dados do projeto
 * para os formulários da universidade. Lá, o app escreve sozinho os rascunhos de resumo, reivindicações e relatório.
 */
'use strict';

const Ideias = {};
window.Ideias = Ideias;
Ideias.URL_APP = 'https://marlonsigales.github.io/apoio-escrita-patentes/index.html';
Ideias.FORMATO = 'apoio-escrita-patentes-pedido';
Ideias.SITUACOES = [['ideia', 'ideia'], ['redacao', 'em redação no app de patentes'], ['nit', 'enviada ao NIT'], ['depositada', 'depositada no INPI'], ['descartada', 'descartada']];
Ideias.NATUREZAS = [['', 'ainda não sei'], ['PI', 'Patente de invenção (PI)'], ['MU', 'Modelo de utilidade (MU)']];
Ideias.PERGUNTA = 'Conte com as suas palavras, do jeito do dia a dia: qual o produto, sistema ou processo? O que ele tem de diferente e que vamos buscar reivindicar? Como você descreve da melhor maneira o que é? E o que mais achar pertinente.';
const idTxt = (x) => String(x ?? '').trim();

Ideias.nova = () => ({
  id: Nucleo.uid('ip'), titulo: '', natureza: '', situacao: 'ideia', criadaEm: hojeISO(), exportadaEm: '',
  texto: '', campo: '', problema: '', estadoTecnica: '', solucao: '', diferencial: '', vantagens: '', aplicacoes: '', ensaios: '',
  componentes: [], inventores: [], palavras: '', classes: '', divulgacoes: '', usarPesquisa: true, observacoes: '',
});
window.ideiasNormalizar = function (lista) {
  return (Array.isArray(lista) ? lista : []).filter((x) => x && typeof x === 'object').map((x) => {
    const i = Object.assign(Ideias.nova(), x);
    i.componentes = (Array.isArray(i.componentes) ? i.componentes : []).filter((c) => c && typeof c === 'object').map((c) => Object.assign({ nome: '', funcao: '' }, c));
    i.inventores = (Array.isArray(i.inventores) ? i.inventores : []).filter((c) => c && typeof c === 'object').map((c) => Object.assign({ nome: '', email: '', percentual: null }, c));
    return i;
  });
};

// ================================================================== pré-preenchimento a partir do projeto
/** Pessoas do projeto (coordenação + equipe), sem repetir. */
Ideias.pessoas = function (p) {
  const pj = p.projeto, vistas = new Map();
  [pj.coordenador, pj.coordenadorAdjunto, ...(pj.equipe || [])].forEach((x) => { if (x && idTxt(x.nome) && !vistas.has(x.nome.trim().toLowerCase())) vistas.set(x.nome.trim().toLowerCase(), { nome: x.nome.trim(), email: idTxt(x.email) }); });
  return [...vistas.values()];
};
/** Completa os campos vazios da ideia com o que o projeto já tem (não apaga nada). Devolve os nomes do que entrou. */
Ideias.puxarDoProjeto = function (p, ideia) {
  const feito = [], put = (k, v, rot) => { if (!idTxt(ideia[k]) && idTxt(v)) { ideia[k] = idTxt(v); feito.push(rot); } };
  const et = (p.produto && p.produto.etapas) || {}, conc = et.conceitual || {}, inf = et.informacional || {}, pq = p.pesquisa || { estrategia: {}, patentes: [] };
  put('titulo', p.projeto.nome, 'título');
  const necs = (inf.necessidades || []).filter((n) => idTxt(n.descricao)).sort((a, b2) => (b2.peso || 0) - (a.peso || 0)).slice(0, 5).map((n) => idTxt(n.descricao));
  if (necs.length) put('problema', 'O que os usuários precisam e as soluções atuais não atendem bem: ' + necs.join('; ') + '.', 'problema (necessidades do QFD)');
  if (conc.funcaoGlobal && idTxt(conc.funcaoGlobal.nome)) put('campo', conc.funcaoGlobal.nome, 'campo (função global)');
  if (!ideia.componentes.length) {
    const comp = [];
    (conc.funcoes || []).forEach((f) => (f.subfuncoes || []).forEach((s) => { if (idTxt(s.escolhido) || idTxt(s.nome)) comp.push({ nome: idTxt(s.escolhido) || idTxt(s.nome), funcao: idTxt(s.nome) || idTxt(f.nome) }); }));
    if (!comp.length) (conc.funcoes || []).forEach((f) => { if (idTxt(f.nome)) comp.push({ nome: idTxt(f.nome), funcao: '' }); });
    if (comp.length) { ideia.componentes = comp.slice(0, 20); feito.push(comp.length + ' componente(s)'); }
  }
  const sel = (conc.concepcoes || []).find((c) => c.selecionada);
  if (sel) put('solucao', sel.descricao || sel.nome, 'como funciona (concepção selecionada)');
  const conc2 = (inf.concorrentesLista || []).filter((c) => idTxt(c.empresa)).map((c) => `${c.empresa}${idTxt(c.caracteristicas) ? ` — ${c.caracteristicas}` : ''}`);
  if (conc2.length) put('estadoTecnica', 'Concorrentes: ' + conc2.join('; ') + '.', 'o que existe hoje');
  put('palavras', pq.estrategia && pq.estrategia.palavras, 'palavras-chave');
  put('classes', pq.estrategia && pq.estrategia.classificacao, 'classes IPC/CPC');
  if (!ideia.inventores.length) {
    const ps = Ideias.pessoas(p);
    if (ps.length) { const pc = Math.floor(100 / ps.length); ideia.inventores = ps.map((x, i) => ({ nome: x.nome, email: x.email, percentual: i === 0 ? 100 - pc * (ps.length - 1) : pc })); feito.push(ps.length + ' inventor(es)'); }
  }
  if (!idTxt(ideia.texto)) {
    const partes = [ideia.titulo && `É ${ideia.titulo.charAt(0).toLowerCase() + ideia.titulo.slice(1)}.`, ideia.problema && `O problema: ${ideia.problema}`, ideia.solucao && `Como resolve: ${ideia.solucao}`, ideia.diferencial && `O diferencial: ${ideia.diferencial}`].filter(Boolean);
    if (partes.length) { ideia.texto = partes.join('\n\n') + '\n\n[Reescreva com as suas palavras e acrescente o que faltar.]'; feito.push('texto da ideia (rascunho)'); }
  }
  return feito;
};

/** O que falta para a ideia render um bom pedido. */
Ideias.faltando = function (i) {
  const f = [];
  if (!idTxt(i.titulo)) f.push('título');
  if (idTxt(i.texto).split(/\s+/).filter(Boolean).length < 40) f.push('a ideia com as suas palavras (40 palavras ou mais)');
  if (!idTxt(i.problema)) f.push('problema');
  if (!idTxt(i.solucao)) f.push('como funciona');
  if (!idTxt(i.diferencial)) f.push('diferencial');
  if (!i.componentes.some((c) => idTxt(c.nome))) f.push('componentes');
  if (!i.inventores.some((c) => idTxt(c.nome))) f.push('inventores');
  const soma = i.inventores.reduce((s, x) => s + (Number(x.percentual) || 0), 0);
  if (i.inventores.length && Math.abs(soma - 100) > 0.01) f.push(`participação somando 100% (hoje ${soma}%)`);
  return f;
};

// ================================================================== JSON para o Apoio à Escrita de Patentes
const n2 = (n) => String(n).padStart(2, '0');
Ideias.datasDivulgacao = (t) => [...String(t || '').matchAll(/(\d{2})\/(\d{2})\/(\d{4})\s*[—–:-]?\s*([^\n;]*)/g)].map((m, k) => ({ id: 'dv' + k, data: `${m[3]}-${m[2]}-${m[1]}`, meio: idTxt(m[4]) || 'divulgação' }));

/** Monta o pedido do app de patentes a partir da ideia e do projeto. */
Ideias.paraPedido = function (p, i) {
  const pj = p.projeto, pq = p.pesquisa || { estrategia: {}, patentes: [] }, inf = ((p.produto || {}).etapas || {}).informacional || {};
  const comps = i.componentes.filter((c) => idTxt(c.nome)).map((c, k) => ({ id: 'c' + (k + 1), num: n2(k + 1), nome: idTxt(c.nome), funcao: idTxt(c.funcao) }));
  const invs = i.inventores.filter((x) => idTxt(x.nome));
  const relev = { alta: 4, média: 3, baixa: 2 };
  const docs = i.usarPesquisa ? (pq.patentes || []).filter((x) => idTxt(x.numero) || idTxt(x.titulo)).map((x, k) => ({
    id: 'r' + (k + 1), num: idTxt(x.numero), titulo: idTxt(x.titulo), base: idTxt(x.base), link: idTxt(x.link), relevancia: relev[x.relevancia] || 3, lido: 'resumo',
    nota: [idTxt(x.observacao).replace(/situação estimada pelas datas; confirmar a vigência na base oficial/, '').trim(), x.situacao && x.situacao !== 'verificar' ? 'Situação: ' + ((window.Pesquisa && Pesquisa.SITUACOES.find(([k2]) => k2 === x.situacao)) || [, x.situacao])[1] : ''].filter(Boolean).join(' · '),
    carac: {}, categoria: 'A', tipoDoc: 'Patente ou MU', publicacao: '', depositante: idTxt(x.titular), pais: idTxt(x.pais),
  })) : [];
  let estado = idTxt(i.estadoTecnica);
  const proximas = docs.filter((d) => d.relevancia >= 3).slice(0, 6);
  if (proximas.length) estado = [estado, 'Documentos de patente próximos encontrados na busca: ' + proximas.map((d) => `${d.num}${d.titulo ? ` (${d.titulo}${d.depositante ? ', ' + d.depositante : ''})` : ''}`).join('; ') + '.'].filter(Boolean).join('\n\n');
  // o diferencial vem primeiro: o app de patentes tira dele a parte caracterizante da 1ª reivindicação
  const solucao = [idTxt(i.diferencial), idTxt(i.solucao)].filter(Boolean).join('\n\n');
  const concorrentes = (inf.concorrentesLista || []).filter((c) => idTxt(c.empresa)).map((c) => c.empresa).join('; ');
  const textoIdeia = [idTxt(i.texto), idTxt(i.diferencial) && !idTxt(i.texto).includes(idTxt(i.diferencial)) ? `O que queremos reivindicar (diferencial): ${idTxt(i.diferencial)}` : '',
    comps.length ? 'Partes principais: ' + comps.map((c) => c.nome + (c.funcao ? ` (${c.funcao})` : '')).join('; ') + '.' : '', idTxt(i.observacoes)].filter(Boolean).join('\n\n');
  const pedido = {
    versao: 1, criadoEm: hojeISO(), natureza: i.natureza || '', titulo: idTxt(i.titulo), area: (p.areas || []).map((a) => a.nome).filter(Boolean).join(', '),
    contexto: { instituicao: 'Universidade Federal de Pelotas', ano: String(new Date().getFullYear()), inventores: invs.map((x) => x.nome).join('\n'), depositante: 'Universidade Federal de Pelotas', divulgacoes: Ideias.datasDivulgacao(i.divulgacoes) },
    ficha: { campo: idTxt(i.campo), problema: idTxt(i.problema), estadoTecnica: estado, solucao, componentes: comps, vantagens: idTxt(i.vantagens), aplicacoes: idTxt(i.aplicacoes), ensaios: idTxt(i.ensaios), concorrentes },
    fontes: [{ id: 'fgp', nome: `Projeto "${pj.nome || 'sem nome'}" (Gestão de Projetos)`, tipo: 'texto', ativa: true, data: hojeISO(),
      texto: [pj.introducao, pj.objetivoGeral && 'Objetivo geral: ' + pj.objetivoGeral, idTxt(pq.estrategia && pq.estrategia.observacoes)].filter((x) => idTxt(x)).join('\n\n') }],
    classes: { marcadas: [], manuais: idTxt(i.classes).split(/\s*[;,\n]\s*/).filter(Boolean).join('; ') },
    busca: { termos: { objeto: idTxt(i.palavras).split(/\s*[;\n]\s*/).filter(Boolean).join('; '), elemento: '', orientacao: '', geometria: '', problema: '', condicao: '', fabricacao: '' },
      traducoes: {}, depositantes: [...new Set(docs.map((d) => d.depositante).filter(Boolean))].join('; '), executadas: {}, resultados: docs, md: '', retorno: '', registroColado: [], notaRetorno: '',
      analise: { diferenciais: idTxt(i.diferencial) ? [idTxt(i.diferencial)] : [], ameacas: [], lacunas: [], recomendacoes: [], prazos: '', data: idTxt(pq.estrategia && pq.estrategia.dataBusca) } },
    autoFeito: {}, relatorio: { campo: '', fundamentos: '', problemaSolucao: '', desenhos: '', descricao: '', exemplos: '' }, reivindicacoes: [], desenhos: [], resumo: '', figuraResumo: '1', revisao: {},
    universidade: {
      tituloProjeto: idTxt(pj.nome), cadastroProjeto: idTxt(pj.codigo), tipoProjeto: 'Pesquisa', objetoProjeto: idTxt(pj.objetivoGeral),
      parceria: idTxt(pj.empresaParceira) ? 'Sim' : 'Não', parceriaDetalhe: idTxt(pj.empresaParceira), empresasMercado: concorrentes,
      contexto: idTxt(i.problema), comoHoje: estado, resultado: solucao, aplicacoesIndustriais: idTxt(i.aplicacoes),
      inventores: invs.map((x, k) => ({ id: 'iv' + (k + 1), nome: idTxt(x.nome), email: idTxt(x.email), percentual: x.percentual == null ? '' : String(x.percentual), inventor: true, notificante: k === 0, qualificacao: '', cpf: '', celular: '', endereco: '', cep: '', cidade: '', uf: '', nacionalidade: 'Brasileira', vinculo: 'Sim', instituicao: '', daFicha: true })),
      colaboradores: [],
    },
    ideia: { texto: textoIdeia, respostas: '', rodadas: [] },
  };
  return { formato: Ideias.FORMATO, versao: 1, origem: 'Gestão de Projetos', projeto: idTxt(pj.nome), exportadoEm: new Date().toISOString(), titulo: pedido.titulo, pedido, figuras: {} };
};

Ideias.nomeArquivo = (i) => (idTxt(i.titulo) || 'ideia de patente').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) + '.json';

// ================================================================== tela
App.ideiaAberta = null;
App.novos.ideiaPatente = () => Ideias.nova();
App.novos.componenteIdeia = () => ({ nome: '', funcao: '' });
App.novos.inventorIdeia = () => ({ nome: '', email: '', percentual: null });
App.abas.ideias = {
  render() {
    const L = App.p.ideiasPatente, c = App.campo;
    let h = `<h2>💡 Ideias de patente</h2>
<div class="cartao"><p style="margin-top:0">Anote aqui cada ideia que pode virar patente. Para cada uma, o sistema gera um <b>pré-preenchimento completo</b> para o app <b>Apoio à Escrita de Patentes</b>: lá, na entrada, use <b>📂 Continuar um pedido</b> e escolha o arquivo. Vão a ficha da invenção, os componentes numerados, os inventores com a participação, a busca da aba Pesquisa e os dados do projeto para os formulários da universidade; o app escreve sozinho os rascunhos de resumo, reivindicações e relatório.</p>
  <p class="muted">Ideia de patente é sigilosa: não divulgue (apresentação, artigo, feira, rede social) antes do depósito. Se já houve divulgação, anote a data — o prazo de graça é de 12 meses (art. 12 da Lei 9.279/96).</p>
  <div class="barra"><button class="btn primario" data-acao="ideia-nova">+ Nova ideia de patente</button><a class="btn" href="${Ideias.URL_APP}" target="_blank" rel="noopener">↗ Abrir o Apoio à Escrita de Patentes</a></div></div>`;
    if (!L.length) h += '<p class="vazio">Nenhuma ideia ainda.</p>';
    L.forEach((i, k) => {
      const b = `ideiasPatente.${k}`, aberta = App.ideiaAberta === i.id, falta = Ideias.faltando(i);
      const sit = (Ideias.SITUACOES.find(([x]) => x === i.situacao) || [, i.situacao])[1];
      h += `<div class="cartao ideia-item${aberta ? ' aberta' : ''}"><div class="ref-linha"><span><b>${esc(i.titulo || '(ideia sem título)')}</b> <span class="muted">· ${esc(sit)}${i.natureza ? ' · ' + esc(i.natureza) : ''}${i.exportadaEm ? ' · pré-preenchimento gerado em ' + esc(Nucleo.dataBR(i.exportadaEm)) : ''}</span><br>
          <small class="${falta.length ? 'gap-neg' : 'muted'}">${falta.length ? 'Falta: ' + esc(falta.join(', ')) : '✓ Pronta para o app de patentes'}</small></span>
        <span class="ref-acoes"><button class="btn pequeno primario" data-acao="ideia-json" data-i="${k}" title="JSON para abrir no Apoio à Escrita de Patentes (📂 Continuar um pedido)">⬇ Pré-preenchimento (.json)</button>
          <button class="btn pequeno" data-acao="ideia-abrir" data-id="${esc(i.id)}">${aberta ? '✓ Fechar' : '✎ Editar'}</button><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="ideiasPatente" data-i="${k}" title="Apagar a ideia">✕</button></span></div>`;
      if (aberta) {
        h += `<div class="barra"><button class="btn pequeno" data-acao="ideia-puxar" data-i="${k}" title="Completa só o que está vazio">🪄 Puxar do projeto (título, funções, concepção, pesquisa, equipe)</button></div>
        <div class="grade-campos">${c(b + '.titulo', 'Título provisório', { classe: 'largo', render: true, ph: 'ex.: Sistema de regulagem automática de…' })}
          ${c(b + '.natureza', 'Natureza', { tipo: 'select', opcoes: Ideias.NATUREZAS, render: true })}${c(b + '.situacao', 'Situação', { tipo: 'select', opcoes: Ideias.SITUACOES, render: true })}
          ${c(b + '.texto', Ideias.PERGUNTA, { tipo: 'textarea', classe: 'largo', linhas: 6, render: true, ph: 'Escreva como se explicasse para um colega: o que é, como funciona, o que tem de novo…' })}
          ${c(b + '.campo', 'Para que serve (campo de aplicação)', { tipo: 'textarea', linhas: 2, render: true })}${c(b + '.problema', 'Problema que resolve', { tipo: 'textarea', linhas: 2, render: true })}
          ${c(b + '.estadoTecnica', 'O que existe hoje (e por que não serve)', { tipo: 'textarea', linhas: 3, render: true })}${c(b + '.solucao', 'Como funciona a solução', { tipo: 'textarea', linhas: 3, render: true })}
          ${c(b + '.diferencial', 'Diferencial: o que queremos reivindicar', { tipo: 'textarea', classe: 'largo', linhas: 3, render: true })}
          ${c(b + '.vantagens', 'Vantagens', { tipo: 'textarea', linhas: 2, render: true })}${c(b + '.aplicacoes', 'Aplicações', { tipo: 'textarea', linhas: 2, render: true })}
          ${c(b + '.ensaios', 'Ensaios e resultados (protótipo, testes)', { tipo: 'textarea', linhas: 2, render: true })}${c(b + '.divulgacoes', 'Divulgações já feitas (dd/mm/aaaa — meio, uma por linha)', { tipo: 'textarea', linhas: 2, render: true })}
          ${c(b + '.palavras', 'Palavras-chave para a busca (separadas por ;)', { render: true })}${c(b + '.classes', 'Classes IPC/CPC', { render: true, ph: 'ex.: A01C 7/04' })}
          ${c(b + '.usarPesquisa', 'Levar os documentos da aba Pesquisa para a busca do pedido', { tipo: 'checkbox', render: true })}
          ${c(b + '.observacoes', 'Observações', { tipo: 'textarea', classe: 'largo', linhas: 2, render: true })}</div>
        <h4>Componentes (viram as peças numeradas 01, 02… das figuras e das reivindicações)</h4>
        ${App.tabela(b + '.componentes', [{ campo: 'nome', rotulo: 'Peça / bloco', largura: '35%' }, { campo: 'funcao', rotulo: 'Função' }], { novo: 'componenteIdeia', botao: 'Adicionar componente', vazio: 'Nenhum componente.' })}
        <h4>Inventores e participação (1/3 dos ganhos da universidade; soma 100%)</h4>
        ${App.tabela(b + '.inventores', [{ campo: 'nome', rotulo: 'Nome completo (como no Lattes)', largura: '40%' }, { campo: 'email', rotulo: 'E-mail', tipo: 'email' }, { campo: 'percentual', rotulo: '%', tipo: 'number', largura: '90px', min: 0, max: 100, render: true }], { novo: 'inventorIdeia', botao: 'Adicionar inventor', vazio: 'Nenhum inventor.' })}
        <p class="muted">CPF, endereço e qualificação são completados por cada inventor no app de patentes (não ficam neste projeto).</p>`;
      }
      h += '</div>';
    });
    return h;
  },
};
App.acoes['ideia-nova'] = () => { const i = Ideias.nova(); App.p.ideiasPatente.push(i); App.ideiaAberta = i.id; App.marcarSujo(true); App.render(); };
App.acoes['ideia-abrir'] = (el) => { App.ideiaAberta = App.ideiaAberta === el.dataset.id ? null : el.dataset.id; App.render(); };
App.acoes['ideia-puxar'] = (el) => {
  const f = Ideias.puxarDoProjeto(App.p, App.p.ideiasPatente[+el.dataset.i]);
  App.marcarSujo(true); App.render();
  App.toast(f.length ? 'Puxado do projeto: ' + esc(f.join(', ')) + '.' : 'Nada novo: os campos que o projeto preencheria já têm texto.', f.length ? 'ok' : '', 6000);
};
App.acoes['ideia-json'] = (el) => {
  const i = App.p.ideiasPatente[+el.dataset.i];
  if (!idTxt(i.titulo)) { App.toast('Dê um título à ideia antes de gerar o pré-preenchimento.', 'erro', 6000); return; }
  const o = Ideias.paraPedido(App.p, i);
  const blob = new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = Ideias.nomeArquivo(i); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  i.exportadaEm = hojeISO(); if (i.situacao === 'ideia') i.situacao = 'redacao';
  App.marcarSujo(true); App.render();
  const falta = Ideias.faltando(i);
  App.toast(`Pré-preenchimento gerado. No Apoio à Escrita de Patentes: 📂 Continuar um pedido → escolha "${esc(Ideias.nomeArquivo(i))}".${falta.length ? ' Ainda falta: ' + esc(falta.join(', ')) + '.' : ''}`, 'ok', 10000);
};
