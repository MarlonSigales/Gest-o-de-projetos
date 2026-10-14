/* Aba Projeto de produto/serviço: modelo NeDIP (planejamento, projetação e implementação).
 * Tudo é opcional: cada fase pode ter um aplicativo próprio de entrada, as ferramentas internas
 * podem ser desligadas e as listas aceitam linhas manuais. */
'use strict';

App.etapaSel = 'informacional';
App.appAguardando = null; // fase cujo aplicativo externo foi aberto (pede o resultado na volta)

App.novos.funcao = () => ({ id: uid('fn'), nome: '', subfuncoes: [] });
App.novos.subfuncao = () => ({ id: uid('sf'), nome: '', principios: '', escolhido: '' });
App.novos.questionario = () => ({ publico: '', meio: '', respondentes: null, data: hojeISO(), observacao: '' });
App.novos.consolidacao = () => ({ necessidade: '', fase: '', citacoes: null, importancia: null });
App.novos.necessidade = () => ({ descricao: '', peso: 0, origem: 'manual' });
App.novos.concepcao = () => ({ id: uid('cc'), nome: '', descricao: '', avaliacao: '', selecionada: false });
App.novos.criterio = () => ({ nome: '', peso: 1, notas: {} });
App.novos.prototipo = () => ({ nome: '', data: hojeISO(), descricao: '', resultado: '' });
App.novos.fmea = () => ({ id: uid('fm'), item: '', modo: '', efeito: '', causa: '', s: 5, o: 5, d: 5, acao: '', responsavel: '', riscoId: '' });
App.novos.bom = () => ({ item: '', descricao: '', quantidade: 1, unidade: 'un', material: '', origem: 'fabricado', fornecedor: '' });

App.acoes['ir-aba'] = (el) => { App.aba = el.dataset.aba; if (el.dataset.etapa) App.etapaSel = el.dataset.etapa; App.render(); window.scrollTo(0, 0); };
App.acoes['sel-etapa'] = (el) => { App.etapaSel = el.dataset.etapa; App.render(); window.scrollTo(0, 0); };

const ferr = (e, id) => !!(e.ferramentas && e.ferramentas[id]);
const cartao = (titulo, corpo, extra = '') => `<div class="cartao ${extra}"><h3 style="margin-top:0">${titulo}</h3>${corpo}</div>`;
const pct = (x) => ((+x || 0) * 100).toFixed(1).replace('.', ',') + ' %';

App.abas.produto = {
  render() {
    const pr = App.p.produto, c = App.campo;
    const ativas = nedipEtapasAtivas(App.p);
    if (!ativas.length) pr.fases.informacional = true;
    let et = ativas.find((x) => x.id === App.etapaSel) || ativas[0] || NEDIP_ETAPAS[1];
    App.etapaSel = et.id;
    const e = pr.etapas[et.id], b = `produto.etapas.${et.id}`;
    const res = nedipResumo(App.p);
    const servico = pr.tipo === 'serviço';

    let h = `<h2>Projeto de ${servico ? 'serviço' : 'produto'}</h2>
<div class="cartao"><div class="barra" style="justify-content:space-between;margin-top:0;align-items:flex-start">
  <p class="muted" style="margin:0;max-width:760px">Modelo do NeDIP/UFSC (Back et al., 2008): planejamento → projetação → implementação. <b>Tudo é opcional</b>: cada fase pode usar um aplicativo próprio, as ferramentas internas podem ser desligadas e as listas aceitam linhas manuais. O que for preenchido vai para o JSON, para o ZIP e para os manuais.</p>
  ${c('produto.tipo', 'Tipo', { tipo: 'select', render: true, opcoes: [['produto', 'Produto'], ['serviço', 'Serviço']] })}</div>
  <details class="nedip-fases" ${App.nedipFasesAberto ? 'open' : ''}><summary>Fases usadas neste projeto (${ativas.length} de ${NEDIP_ETAPAS.length})</summary><div class="barra">
  ${NEDIP_MACROFASES.map(([m, rot]) => `<span class="muted"><b>${esc(rot)}:</b></span>` + NEDIP_ETAPAS.filter((x) => x.macro === m).map((x) => c(`produto.fases.${x.id}`, x.curto, { tipo: 'checkbox', render: true, classe: 'rec' })).join('')).join('<span class="nedip-seta">·</span>')}</div></details>
  <div class="nedip-fluxo">${NEDIP_MACROFASES.map(([m, rot]) => {
    const rs = res.filter((r) => r.macro === m);
    if (!rs.length) return '';
    return `<div class="nedip-macro"><div class="nedip-macro-rot">${esc(rot)}</div><div class="nedip-macro-passos">${rs.map((r, i) => `${i ? '<span class="nedip-seta">→</span>' : ''}<button class="nedip-passo ${r.id === et.id ? 'ativa' : ''} st-${r.status.replace(/\s/g, '-')}" data-acao="sel-etapa" data-etapa="${r.id}">
      <b>${esc(r.nome)}</b><span>${esc(r.status)} · ${r.feitas}/${r.total}</span><small>saída: ${esc(r.saida)}</small></button>`).join('')}</div></div>`;
  }).join('')}</div></div>

<div class="cartao"><h3 style="margin-top:0">${esc(et.nome)}</h3>
  <p>${esc(et.objetivo)} <b>Saída esperada:</b> ${esc(et.saida)}.</p>
  <div class="grade-campos">
    ${c(b + '.status', 'Situação da fase', { tipo: 'select', render: true, opcoes: NEDIP_STATUS })}
    ${c(b + '.macros', 'Macroentrega(s) desta fase (Ctrl+clique para várias)', { tipo: 'multi', opcoes: App.opcoesMacros(false) })}
  </div></div>`;

    h += App.nedipEntradaHtml(et, e, b);
    h += cartao('Recomendações da fase', `<p class="muted">Marque o que foi (ou será) aplicado. As marcadas aparecem no manual de projeto.</p>
  <div class="nedip-recs">${et.recomendacoes.map(([id, t]) => c(`${b}.recomendacoes.${id}`, t, { tipo: 'checkbox', classe: 'rec', render: true })).join('')}</div>`);
    h += App.nedipEspecifico[et.id](e, b, servico);
    h += cartao('Registro da fase (em aberto)', c(b + '.registro', 'Decisões, resultados, pendências e referências. Aceita parágrafos, listas com "- ", **negrito** e {{fig:id}}/{{tab:id}} das macroentregas.', { tipo: 'textarea', linhas: 7 }));
    h += App.nedipAnexosHtml(et, e, b);
    h += App.nedipIntegracaoHtml();
    return h;
  },
  depois() {
    const liga = (sel, fn) => { const i = $(sel); if (i) i.addEventListener('change', async (ev) => { const fs = Array.from(ev.target.files); ev.target.value = ''; if (fs.length) await fn(fs); }); };
    liga('#anexoEtapa', (fs) => App.nedipAnexar(fs, App.etapaSel));
    liga('#appResultado', (fs) => App.nedipImportarResultado(fs[0], App.etapaSel));
    liga('#csvConsol', (fs) => App.nedipImportarCsv(fs[0]));
    liga('#arqQfdInf', (fs) => App.importarQfd(fs[0]));
    if (App.etapaSel === 'informacional') App.formularioDepois();
    const d = $('.nedip-fases'); if (d) d.addEventListener('toggle', () => { App.nedipFasesAberto = d.open; });
  },
};

// ------------------------------------------------------------------ entrada da fase: aplicativo externo + ferramentas opcionais
App.nedipEntradaHtml = function (et, e, b) {
  const c = App.campo, o = App.p.qfdOrigem || {};
  const qfdInfo = et.id === 'informacional'
    ? `<p class="muted" style="margin:6px 0 0">${o.importadoEm ? `QFD importado em ${esc(o.importadoEm.replace('T', ' ').slice(0, 16))} (${esc(o.arquivo)}).` : 'Um backup JSON do sistema QFD, se importado, preenche os requisitos de cliente e as especificações. Sem QFD, use as linhas manuais abaixo.'}</p>` : '';
  return cartao('Entrada da fase (opcional)', `<p class="muted" style="margin-top:0">Se esta fase é feita em um aplicativo próprio, informe-o aqui. Ao voltar dele, o sistema pede o resultado, que fica nos documentos da fase${et.id === 'informacional' ? ' (o JSON do sistema QFD também atualiza requisitos e especificações)' : ''}. Nada disso é obrigatório.</p>
  <div class="grade-campos">${c(b + '.app.nome', 'Aplicativo da fase', { ph: 'ex.: Sistema QFD' })}${c(b + '.app.url', 'Endereço (URL)', { ph: 'https://…', render: true })}</div>
  <div class="barra">${e.app.url ? `<button class="btn" data-acao="nedip-app-abrir">↗ Abrir ${esc(e.app.nome || 'aplicativo')}</button>` : ''}
    <label class="btn">⬆ Importar resultado do aplicativo<input type="file" hidden id="appResultado"></label></div>${qfdInfo}
  <div class="barra nedip-ferr"><span class="muted"><b>Ferramentas internas desta fase:</b></span>${et.ferramentas.map(([id, rot]) => c(`${b}.ferramentas.${id}`, rot, { tipo: 'checkbox', render: true, classe: 'rec' })).join('')}</div>`);
};

App.acoes['nedip-app-abrir'] = () => {
  const e = App.p.produto.etapas[App.etapaSel];
  const w = window.open(e.app.url, '_blank');
  App.appAguardando = App.etapaSel;
  if (!w) App.toast(`O navegador bloqueou a nova aba. Abra: <a href="${esc(e.app.url)}" target="_blank" rel="noopener">${esc(e.app.url)}</a>`, 'aviso', 15000);
  App.pedirResultadoApp(App.etapaSel);
};
App.pedirResultadoApp = function (etapa) {
  const e = App.p.produto.etapas[etapa], nome = e.app.nome || 'aplicativo';
  App.modal(`<h2>Resultado de ${esc(nome)}</h2>
    <p>Terminou em ${esc(nome)}? Selecione o arquivo exportado por ele (${etapa === 'informacional' ? 'no sistema QFD: botão “Backup”, JSON completo' : 'qualquer formato'}). Ele fica nos documentos da fase “${esc(NEDIP_ETAPAS.find((x) => x.id === etapa).nome)}”.</p>
    <div class="barra"><label class="btn primario">Selecionar arquivo<input type="file" hidden id="appVolta"></label>
    ${e.app.url ? `<button class="btn" data-acao="nedip-app-abrir">↗ Voltar a ${esc(nome)}</button>` : ''}
    <button class="btn" data-acao="nedip-app-depois">Importar depois</button></div>`);
  $('#appVolta').addEventListener('change', (ev) => { const f = ev.target.files[0]; if (f) App.nedipImportarResultado(f, etapa); });
};
App.acoes['nedip-app-depois'] = () => { App.appAguardando = null; App.fecharModal(); };
{
  const voltou = () => { if (App.appAguardando && document.visibilityState === 'visible' && App.p && !$('#appVolta')) App.pedirResultadoApp(App.appAguardando); };
  document.addEventListener('visibilitychange', voltou);
  window.addEventListener('focus', voltou);
}

/** Resultado de aplicativo externo: backup do QFD atualiza requisitos/especificações; o resto vira documento da fase. */
App.nedipImportarResultado = async function (arquivo, etapa) {
  App.appAguardando = null;
  let ehQfd = false;
  try {
    if (/\.json$/i.test(arquivo.name)) { const d = JSON.parse((await arquivo.text()).replace(/^﻿/, '')); ehQfd = !!(d && Array.isArray(d.requisitosProjeto)); }
    else if (/\.zip$/i.test(arquivo.name)) {
      const z = await JSZip.loadAsync(arquivo);
      for (const n of Object.keys(z.files).filter((x) => /\.json$/i.test(x))) { try { const d = JSON.parse(await z.file(n).async('string')); if (d && Array.isArray(d.requisitosProjeto)) { ehQfd = true; break; } } catch (e) { /* ignora */ } }
    }
  } catch (e) { /* não é JSON válido: vai como documento */ }
  App.fecharModal();
  if (ehQfd) { await App.importarQfd(arquivo); return; }
  const e = App.p.produto.etapas[etapa];
  await App.nedipAnexar([arquivo], etapa, `Resultado de ${e.app.nome || 'aplicativo externo'}`);
};

// ------------------------------------------------------------------ conteúdo de cada fase
App.nedipEspecifico = {
  planejamento(e, b) {
    const c = App.campo, p = App.p;
    let h = '';
    if (ferr(e, 'plano')) h += cartao('Escopo, premissas e orçamento', `<div class="grade-campos">
      ${c(b + '.escopo', 'Escopo do produto/serviço e do projeto (inclui / não inclui)', { tipo: 'textarea', classe: 'largo', linhas: 4 })}
      ${c(b + '.premissas', 'Premissas e restrições', { tipo: 'textarea', classe: 'largo', linhas: 3 })}
      ${c(b + '.orcamento', 'Orçamento e recursos', { tipo: 'textarea', linhas: 3 })}
      ${c(b + '.comunicacao', 'Plano de comunicação', { tipo: 'textarea', linhas: 3 })}</div>`);
    if (ferr(e, 'atalhos')) h += cartao('O plano nas outras abas', `<div class="barra">
      <button class="btn" data-acao="ir-aba" data-aba="equipe">👥 Equipe e interessados (${p.projeto.equipe.length} / ${p.interessados.length})</button>
      <button class="btn" data-acao="ir-aba" data-aba="macros">📦 Macroentregas (${p.macroentregas.length})</button>
      <button class="btn" data-acao="ir-aba" data-aba="cronograma">📅 Cronograma (${p.macroentregas.reduce((s, m) => s + m.atividades.length, 0)} atividades)</button>
      <button class="btn" data-acao="ir-aba" data-aba="riscos">⚠️ Riscos (${p.riscos.length})</button></div>`);
    return h;
  },

  informacional(e, b) {
    const c = App.campo;
    let h = '';
    if (ferr(e, 'questionarios')) {
      const cons = e.consolidacao;
      h += cartao('Questionários aos clientes', `<ul class="muted" style="margin-top:0">
    <li>Separe os clientes por fase do ciclo de vida (quem compra, usa, instala, mantém e descarta) e aplique a cada grupo.</li>
    <li>Combine perguntas abertas (o que incomoda, o que esperam) com escala de importância de 1 a 5.</li>
    <li>Teste o roteiro com 2 ou 3 pessoas antes; registre data, meio e número de respondentes. Pode usar qualquer formulário (papel, Google Forms etc.).</li></ul>
  <div class="barra"><button class="btn" data-acao="nedip-roteiro">📄 Roteiro de questionário (${e.formulario.perguntas.length ? 'perguntas do questionário' : 'modelo'})</button></div>
  ${App.formularioHtml(e, b)}
  <h4>Questionários aplicados</h4>
  ${App.tabela(b + '.questionarios', [
    { campo: 'publico', rotulo: 'Público / fase do ciclo de vida' }, { campo: 'meio', rotulo: 'Meio', largura: '16%' },
    { campo: 'respondentes', rotulo: 'Respondentes', tipo: 'number', min: 0, largura: '90px' }, { campo: 'data', rotulo: 'Data', tipo: 'date', largura: '140px' },
    { campo: 'observacao', rotulo: 'Principais achados', tipo: 'textarea' }], { novo: 'questionario', botao: 'Registrar questionário', vazio: 'Nenhum questionário registrado.' })}
  <h4>Consolidação das respostas</h4>
  <p class="muted">Uma linha por necessidade citada. Pode digitar ou importar um CSV com as colunas <code>necessidade; citações; importância média (1–5); fase</code>.</p>
  ${App.tabela(b + '.consolidacao', [{ campo: 'necessidade', rotulo: 'Necessidade citada' }, { campo: 'fase', rotulo: 'Fase do ciclo de vida', largura: '18%' },
    { campo: 'citacoes', rotulo: 'Citações', tipo: 'number', min: 0, largura: '90px' }, { campo: 'importancia', rotulo: 'Importância média (1–5)', tipo: 'number', min: 1, max: 5, largura: '120px' }],
    { novo: 'consolidacao', botao: 'Adicionar necessidade', vazio: 'Nenhuma resposta consolidada.' })}
  <div class="barra"><label class="btn">⬆ Importar CSV<input type="file" accept=".csv,.txt,text/csv" hidden id="csvConsol"></label>
    ${cons.length ? `<button class="btn" data-acao="nedip-cons-necessidades">→ Usar como requisitos de cliente</button>
    <button class="btn primario" data-acao="nedip-quest-pdf">📄 PDF do questionário com respostas consolidadas</button>` : ''}</div>`);
    }
    if (ferr(e, 'necessidades')) {
      const soma = e.necessidades.reduce((s, n) => s + (+n.peso || 0), 0);
      h += cartao('Requisitos de cliente', `<p class="muted" style="margin-top:0">Manual, vindos da consolidação dos questionários ou do QFD (a importação do QFD substitui esta lista quando traz requisitos de cliente). Peso relativo de 0 a 1.</p>
  ${App.tabela(b + '.necessidades', [{ campo: 'descricao', rotulo: 'Requisito de cliente (necessidade)' }, { campo: 'peso', rotulo: 'Peso (0–1)', tipo: 'number', min: 0, max: 1, largura: '110px' }, { campo: 'origem', rotulo: 'Origem', largura: '130px' }],
    { novo: 'necessidade', botao: 'Adicionar requisito de cliente', vazio: 'Nenhum requisito de cliente.' })}
  ${e.necessidades.length ? `<p class="muted">Soma dos pesos: ${pct(soma)}${Math.abs(soma - 1) > 0.01 ? ' — <button class="btn pequeno" data-acao="nedip-normalizar-pesos">normalizar para 100 %</button>' : ''}</p>` : ''}`);
    }
    if (ferr(e, 'especificacoes')) h += App.nedipEspecHtml();
    h += App.qfdIntegracaoHtml();
    if (ferr(e, 'contexto')) h += App.nedipContextoHtml(e, b);
    return h;
  },

  conceitual(e, b) {
    const c = App.campo, q = App.p.qualidade;
    let h = cartao('Do problema à concepção', `<ol class="nedip-passos">
    <li><b>Abstrair:</b> leia as especificações e escreva o problema essencial, sem citar soluções.</li>
    <li><b>Função global:</b> o que entra e o que sai (energia, material, sinal).</li>
    <li><b>Estrutura de funções:</b> desdobre em funções parciais e elementares; considere variantes.</li>
    <li><b>Desdobramento:</b> ligue cada especificação às funções que a atendem — especificação sem função indica função faltante.</li>
    <li><b>Princípios de solução</b> para cada subfunção e <b>matriz morfológica</b>.</li>
    <li><b>Concepções:</b> combinações compatíveis de princípios, com esboço e arranjo.</li>
    <li><b>Avaliação:</b> critérios derivados das especificações (pesos do QFD ou da equipe) e seleção justificada.</li></ol>
  <p class="muted">Base: Pahl et al. (2007) e Back et al. (2008). Use as ferramentas abaixo ou apenas o registro da fase e documentos (ex.: esboços, planilhas de outro aplicativo).</p>`);
    if (ferr(e, 'funcoes')) {
      h += cartao('Função global', `<div class="grade-campos">
  ${c(b + '.funcaoGlobal.nome', 'Função global (verbo + objeto)', { classe: 'largo', ph: 'ex.: Dosar sementes individualmente' })}
  ${c(b + '.funcaoGlobal.entradas', 'Entradas (energia, material, sinal)', { tipo: 'textarea', linhas: 2 })}
  ${c(b + '.funcaoGlobal.saidas', 'Saídas (energia, material, sinal)', { tipo: 'textarea', linhas: 2 })}</div>`);
      let f = `<p class="muted" style="margin-top:0">Escreva um princípio de solução por linha e escolha um.</p>`;
      e.funcoes.forEach((fn, i) => {
        const bf = `${b}.funcoes.${i}`;
        f += `<div class="nedip-funcao"><div class="barra" style="margin-top:0">${c(bf + '.nome', '', { ph: `Função parcial ${i + 1}` })}
        <button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${b}.funcoes" data-i="${i}">✕ função</button></div>
        <table class="tab-edit"><thead><tr><th style="width:26%">Subfunção</th><th>Princípios de solução (um por linha)</th><th style="width:26%">Escolhido</th><th class="acoes"></th></tr></thead><tbody>
        ${fn.subfuncoes.map((s, k) => `<tr><td>${c(`${bf}.subfuncoes.${k}.nome`, '', { ph: 'ex.: Individualizar sementes' })}</td>
          <td>${c(`${bf}.subfuncoes.${k}.principios`, '', { tipo: 'textarea', linhas: 2, render: true })}</td>
          <td>${c(`${bf}.subfuncoes.${k}.escolhido`, '', { tipo: 'select', render: true, opcoes: [['', '—']].concat(nedipPrincipios(s).map((x) => [x, x])) })}</td>
          <td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${bf}.subfuncoes" data-i="${k}">✕</button></td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Nenhuma subfunção.</td></tr>'}
        </tbody></table>
        <div class="barra"><button class="btn pequeno" data-acao="add-linha" data-lista="${bf}.subfuncoes" data-novo="subfuncao">+ subfunção</button></div></div>`;
      });
      f += `<div class="barra"><button class="btn" data-acao="add-linha" data-lista="${b}.funcoes" data-novo="funcao">+ Função parcial</button></div>`;
      const subs = e.funcoes.flatMap((fn) => fn.subfuncoes.map((s) => ({ fn, s, pr: nedipPrincipios(s) }))).filter((x) => x.pr.length);
      if (subs.length) {
        const nCol = Math.max(...subs.map((x) => x.pr.length));
        f += `<h4>Matriz morfológica</h4><div class="rolagem"><table class="tab morf"><thead><tr><th>Subfunção</th>${Array.from({ length: nCol }, (_, i) => `<th>Princípio ${i + 1}</th>`).join('')}</tr></thead><tbody>
        ${subs.map((x) => `<tr><td><b>${esc(x.s.nome || '—')}</b><br><span class="muted">${esc(x.fn.nome)}</span></td>${Array.from({ length: nCol }, (_, i) => `<td class="${x.pr[i] && x.pr[i] === x.s.escolhido ? 'escolhido' : ''}">${esc(x.pr[i] || '')}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>`;
      }
      h += cartao('Estrutura de funções e princípios de solução', f);
    }
    if (ferr(e, 'desdobramento')) {
      const opF = e.funcoes.flatMap((fn) => [[fn.id, fn.nome || '(função sem nome)']].concat(fn.subfuncoes.map((s) => [s.id, `  ↳ ${s.nome || '(subfunção)'}`])));
      if (!q.length) h += cartao('Desdobramento das especificações em funções', '<p class="vazio">Sem especificações. Cadastre-as no projeto informacional (manualmente ou pelo QFD).</p>');
      else {
        const semF = q.filter((x) => !((e.desdobramento[nedipIdEspec(x)] || {}).funcoes || []).length);
        const usadas = new Set(Object.values(e.desdobramento).flatMap((d) => d.funcoes));
        const fSemE = opF.filter(([id]) => !usadas.has(id));
        h += cartao('Desdobramento das especificações em funções', `<p class="muted" style="margin-top:0">Para cada especificação, indique as funções/subfunções que a atendem (Ctrl+clique para várias) e como.${opF.length ? '' : ' <b>Cadastre as funções no cartão acima para poder ligá-las.</b>'}</p>
  <div class="rolagem"><table class="tab-edit"><thead><tr><th>Especificação</th><th style="width:30%">Funções que atendem</th><th style="width:30%">Como / observação</th></tr></thead><tbody>
  ${q.map((x) => { const id = nedipIdEspec(x); return `<tr><td>${esc(x.requisito)}<br><span class="muted">${esc(x.criterioAceite)}</span></td>
    <td>${opF.length ? c(`${b}.desdobramento.${id}.funcoes`, '', { tipo: 'multi', opcoes: opF, render: true }) : '—'}</td>
    <td>${c(`${b}.desdobramento.${id}.obs`, '', { tipo: 'textarea', linhas: 2 })}</td></tr>`; }).join('')}</tbody></table></div>
  ${opF.length && semF.length ? `<p class="gap-neg"><b>${semF.length}</b> especificação(ões) sem função: ${semF.map((x) => esc(x.requisito)).join('; ')}.</p>` : ''}
  ${opF.length && fSemE.length && q.length ? `<p class="muted">Funções que não atendem a nenhuma especificação: ${fSemE.map(([, n]) => esc(n.trim())).join('; ')}.</p>` : ''}`);
      }
    }
    if (ferr(e, 'concepcoes')) h += cartao('Concepções alternativas', App.tabela(b + '.concepcoes', [{ campo: 'nome', rotulo: 'Concepção', largura: '18%' }, { campo: 'descricao', rotulo: 'Combinação de princípios / descrição', tipo: 'textarea' },
      { campo: 'avaliacao', rotulo: 'Avaliação / justificativa', tipo: 'textarea' }, { campo: 'selecionada', rotulo: 'Selecionada', tipo: 'checkbox', largura: '90px' }],
      { novo: 'concepcao', botao: 'Adicionar concepção', vazio: 'Nenhuma concepção.' }));
    if (ferr(e, 'decisao')) h += App.nedipDecisaoHtml(e, b);
    if (ferr(e, 'trl')) h += cartao('Exportar para a árvore TRL', `<p>Gera na aba TRL: <b>produto</b> (função global) → <b>subsistemas</b> (funções parciais) → <b>montagens</b> (subfunções com o princípio escolhido). É opcional: a árvore também pode ser montada à mão na aba TRL.</p>
  <div class="barra"><button class="btn primario" data-acao="nedip-trl">📈 Exportar funções para o TRL</button>
  <button class="btn" data-acao="ir-aba" data-aba="trl">Montar/editar na aba TRL</button>
  <span class="muted">${e.trlExportadoEm ? 'Última exportação: ' + esc(e.trlExportadoEm.replace('T', ' ').slice(0, 16)) : 'Ainda não exportado.'}</span></div>`);
    return h;
  },

  preliminar(e, b) {
    const c = App.campo, q = App.p.qualidade;
    let h = '';
    if (ferr(e, 'leiaute')) h += cartao('Leiaute e viabilidade', `<div class="grade-campos">
  ${c(b + '.leiaute', 'Leiaute: requisitos determinantes, alternativas e leiaute escolhido', { tipo: 'textarea', classe: 'largo', linhas: 4 })}
  ${c(b + '.viabilidade', 'Viabilidade técnica e econômica (custo-alvo, fabricação)', { tipo: 'textarea', classe: 'largo', linhas: 3 })}</div>`);
    if (ferr(e, 'prototipos')) h += cartao('Modelos, protótipos e ensaios', App.tabela(b + '.prototipos', [{ campo: 'nome', rotulo: 'Modelo / protótipo', largura: '18%' }, { campo: 'data', rotulo: 'Data', tipo: 'date', largura: '140px' },
      { campo: 'descricao', rotulo: 'Descrição e ensaios', tipo: 'textarea' }, { campo: 'resultado', rotulo: 'Resultado', tipo: 'textarea' }], { novo: 'prototipo', botao: 'Adicionar protótipo', vazio: 'Nenhum protótipo registrado.' }));
    if (ferr(e, 'fmea')) h += App.nedipFmeaHtml(e, b);
    if (ferr(e, 'qualidade')) {
      const n = (s) => q.filter((x) => x.status === s).length;
      const d = (App.p.dfx && App.p.dfx.itens) || [];
      h += cartao('Análise de qualidade (especificações)', `<p style="margin-top:0"><b>${n('conforme')}</b> conforme(s) · <b class="${n('não conforme') ? 'gap-neg' : ''}">${n('não conforme')}</b> não conforme(s) · <b>${n('pendente')}</b> pendente(s) de ${q.length} especificação(ões). DfX: ${d.filter((i) => i.decisao === 'usar').length} diretriz(es) a usar, ${d.filter((i) => i.decisao === 'negligenciar').length} negligenciada(s).</p>
  ${q.length ? `<div class="rolagem"><table class="tab-edit"><thead><tr><th>Especificação</th><th>Meta</th><th style="width:110px">Medido</th><th style="width:140px">Situação</th><th>PDCA</th></tr></thead><tbody>
    ${q.map((x, i) => `<tr><td>${esc(x.requisito)}</td><td>${esc(x.criterioAceite)}</td><td>${c(`qualidade.${i}.valorMedido`, '')}</td>
      <td>${c(`qualidade.${i}.status`, '', { tipo: 'select', render: true, opcoes: [['pendente', 'pendente'], ['conforme', 'conforme'], ['não conforme', 'não conforme']] })}</td>
      <td>${x.status === 'não conforme' ? (x.pdca && x.pdca.planejar ? 'em tratamento' : '<b class="gap-neg">sem plano</b>') : ''}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="vazio">Sem especificações. Cadastre-as no projeto informacional (manualmente ou pelo QFD).</p>'}
  <div class="barra"><button class="btn primario" data-acao="ir-aba" data-aba="qualidade">✅ Qualidade / DfX (PDCA e DfX)</button>
  ${q.length ? '' : '<button class="btn" data-acao="sel-etapa" data-etapa="informacional">Ir ao projeto informacional</button>'}</div>`);
    }
    return h;
  },

  detalhado(e, b, servico) {
    const c = App.campo, m = e.manuais;
    let h = '';
    if (ferr(e, 'bom')) h += cartao(servico ? 'Lista de materiais e recursos' : 'Lista de materiais', App.tabela(b + '.bom', [{ campo: 'item', rotulo: 'Item', largura: '70px' }, { campo: 'descricao', rotulo: 'Descrição' }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'number', min: 0, largura: '80px' },
      { campo: 'unidade', rotulo: 'Un.', largura: '60px' }, { campo: 'material', rotulo: 'Material / especificação' },
      { campo: 'origem', rotulo: 'Origem', tipo: 'select', largura: '130px', opcoes: [['fabricado', 'fabricado'], ['comprado', 'comprado'], ['terceirizado', 'terceirizado']] },
      { campo: 'fornecedor', rotulo: 'Fornecedor' }], { novo: 'bom', botao: 'Adicionar item', vazio: 'Nenhum item. (Opcional: anexe a lista de outro sistema em Documentos.)' }));
    if (ferr(e, 'manualUso')) h += cartao('Conteúdo do manual de uso', `<p class="muted" style="margin-top:0">As especificações técnicas (metas e valores medidos) entram automaticamente.</p><div class="grade-campos">
  ${NEDIP_MANUAL_USO.map(([k, r]) => c(`${b}.manualUso.${k}`, r, { tipo: 'textarea', classe: 'largo', linhas: 3 })).join('')}</div>`);
    if (ferr(e, 'manuais')) {
      const opA = [['', '— gerar pelo sistema —']].concat(e.anexos.map((a) => [a.arquivo, a.nome]));
      h += cartao('Manuais', `<p style="margin-top:0">O <b>manual de projeto</b> compila as fases usadas (recomendações, questionários, requisitos e especificações, desdobramento, funções, concepções e decisão, protótipos, FMEA, qualidade, DfX, lista de materiais, TRL, figuras e documentos). O <b>manual de uso</b> reúne o conteúdo acima e as especificações técnicas. Ficam em <code>produto/manuais/</code> e entram no ZIP.</p>
  <p class="muted">Se os manuais forem feitos em outro programa, importe-os em “Documentos” e indique-os abaixo.</p>
  <div class="grade-campos">${c(b + '.manuais.projetoAnexo', 'Manual de projeto próprio (documento importado)', { tipo: 'select', render: true, opcoes: opA })}
  ${c(b + '.manuais.usoAnexo', 'Manual de uso próprio (documento importado)', { tipo: 'select', render: true, opcoes: opA })}</div>
  <div class="barra">
    ${m.projetoAnexo ? `<button class="btn" data-acao="nedip-baixar" data-arq="${esc(m.projetoAnexo)}">⬇ manual de projeto (próprio)</button>` : '<button class="btn primario" data-acao="nedip-manual" data-tipo="projeto">📘 Gerar manual de projeto</button>'}
    ${m.usoAnexo ? `<button class="btn" data-acao="nedip-baixar" data-arq="${esc(m.usoAnexo)}">⬇ manual de uso (próprio)</button>` : '<button class="btn primario" data-acao="nedip-manual" data-tipo="uso">📗 Gerar manual de uso</button>'}
    ${!m.projetoAnexo && m.projeto ? `<button class="btn" data-acao="nedip-baixar" data-arq="${esc(m.projeto)}">⬇ manual de projeto gerado</button>` : ''}
    ${!m.usoAnexo && m.uso ? `<button class="btn" data-acao="nedip-baixar" data-arq="${esc(m.uso)}">⬇ manual de uso gerado</button>` : ''}
    ${m.geradoEm ? `<span class="muted">gerados em ${esc(m.geradoEm.replace('T', ' ').slice(0, 16))}</span>` : ''}</div>`);
    }
    return h;
  },

  producao(e, b) {
    const c = App.campo;
    return ferr(e, 'plano') ? cartao('Processos, fornecedores e lote piloto', `<div class="grade-campos">
  ${c(b + '.processos', 'Processos, recursos e controle de qualidade', { tipo: 'textarea', classe: 'largo', linhas: 3 })}
  ${c(b + '.fornecedores', 'Fornecedores homologados', { tipo: 'textarea', linhas: 3 })}
  ${c(b + '.lotePiloto', 'Lote piloto: quantidade, resultados e ajustes', { tipo: 'textarea', linhas: 3 })}
  ${c(b + '.liberacao', 'Data de liberação da produção', { tipo: 'date' })}</div>`) : '';
  },

  lancamento(e, b) {
    const c = App.campo;
    return ferr(e, 'plano') ? cartao('Plano de lançamento', `<div class="grade-campos">
  ${c(b + '.plano', 'Plano de lançamento e comunicação', { tipo: 'textarea', classe: 'largo', linhas: 3 })}
  ${c(b + '.canais', 'Canais de venda, distribuição e assistência', { tipo: 'textarea', linhas: 3 })}
  ${c(b + '.treinamento', 'Treinamentos', { tipo: 'textarea', linhas: 3 })}
  ${c(b + '.certificacoes', 'Registros e certificações', { tipo: 'textarea', linhas: 3 })}
  ${c(b + '.data', 'Data de lançamento', { tipo: 'date' })}</div>`) : '';
  },

  validacao(e, b) {
    const c = App.campo;
    return ferr(e, 'campo') ? cartao('Desempenho em campo e satisfação', `<h4 style="margin-top:0">Questionários de satisfação (pós-uso)</h4>
  ${App.tabela(b + '.questionarios', [{ campo: 'publico', rotulo: 'Público' }, { campo: 'meio', rotulo: 'Meio', largura: '16%' },
    { campo: 'respondentes', rotulo: 'Respondentes', tipo: 'number', min: 0, largura: '90px' }, { campo: 'data', rotulo: 'Data', tipo: 'date', largura: '140px' },
    { campo: 'observacao', rotulo: 'Principais achados', tipo: 'textarea' }], { novo: 'questionario', botao: 'Registrar questionário', vazio: 'Nenhum questionário de satisfação.' })}
  <div class="grade-campos">
  ${c(b + '.satisfacao', 'Satisfação dos clientes (síntese)', { tipo: 'textarea', linhas: 3 })}
  ${c(b + '.campo', 'Desempenho em campo, falhas e reclamações', { tipo: 'textarea', linhas: 3 })}
  ${c(b + '.melhorias', 'Melhorias e próxima versão', { tipo: 'textarea', linhas: 3 })}
  ${c(b + '.encerramento', 'Encerramento do projeto', { tipo: 'textarea', linhas: 3 })}</div>
  <div class="barra"><button class="btn" data-acao="ir-aba" data-aba="licoes">💡 Lições aprendidas (${App.p.licoesAprendidas.length})</button></div>`) : '';
  },
};

// ------------------------------------------------------------------ especificações: QFD + linhas manuais
App.nedipEspecHtml = function () {
  const q = App.p.qualidade, c = App.campo;
  return cartao('Especificações de projeto', `<p class="muted" style="margin-top:0">São os critérios de qualidade do projeto. Linhas do QFD (<span class="selo">QFD</span>) são atualizadas na reimportação; as <b>manuais</b> podem ser editadas aqui. Situação, medido e PDCA ficam no projeto preliminar e na aba Qualidade.</p>
  <div class="rolagem"><table class="tab-edit"><thead><tr><th>Requisito de projeto</th><th style="width:15%">Valor-meta (critério de aceite)</th><th>Forma de avaliação</th><th>Aspectos indesejáveis</th><th class="acoes"></th></tr></thead><tbody>
  ${q.map((x, i) => (x.qfd && x.qfd.id)
    ? `<tr class="qfd"><td><span class="selo">QFD</span> ${esc(x.requisito)}</td><td>${esc(x.criterioAceite)}</td><td>${esc(x.metodoVerificacao)}</td><td>${esc(x.aspectosIndesejaveis || '')}</td><td class="acoes"></td></tr>`
    : `<tr><td>${c(`qualidade.${i}.requisito`, '', { tipo: 'textarea', linhas: 2, ph: 'ex.: Massa sem pneu' })}</td><td>${c(`qualidade.${i}.criterioAceite`, '', { ph: 'ex.: ≤ 1100 g' })}</td>
      <td>${c(`qualidade.${i}.metodoVerificacao`, '', { tipo: 'textarea', linhas: 2 })}</td><td>${c(`qualidade.${i}.aspectosIndesejaveis`, '', { tipo: 'textarea', linhas: 2 })}</td>
      <td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="qualidade" data-i="${i}">✕</button></td></tr>`).join('') || '<tr><td colspan="5" class="vazio">Nenhuma especificação.</td></tr>'}
  </tbody></table></div>
  <div class="barra"><button class="btn" data-acao="add-linha" data-lista="qualidade" data-novo="qualidade">+ Especificação manual</button></div>`);
};

// ------------------------------------------------------------------ matriz de decisão ponderada
App.nedipDecisaoHtml = function (e, b) {
  const c = App.campo, cc = e.concepcoes, cr = e.decisao.criterios;
  const pont = nedipPontuacao(e);
  const max = Math.max(...pont.map((x) => x.nota ?? -1));
  let t = `<p class="muted" style="margin-top:0">Notas de 1 (atende mal) a 5 (atende muito bem). Pontuação = Σ(peso × nota) ÷ Σ(peso). Os critérios podem vir das especificações (peso do QFD, quando houver) ou ser digitados.</p>`;
  if (!cc.length) t += '<p class="vazio">Cadastre concepções para avaliá-las.</p>';
  t += `<div class="rolagem"><table class="tab-edit"><thead><tr><th>Critério</th><th style="width:80px">Peso</th>${cc.map((x) => `<th style="width:90px">${esc(x.nome || '(concepção)')}</th>`).join('')}<th class="acoes"></th></tr></thead><tbody>
  ${cr.map((k, i) => `<tr><td>${c(`${b}.decisao.criterios.${i}.nome`, '')}</td><td>${c(`${b}.decisao.criterios.${i}.peso`, '', { tipo: 'number', min: 0, render: true })}</td>
    ${cc.map((x) => `<td>${c(`${b}.decisao.criterios.${i}.notas.${x.id}`, '', { tipo: 'number', min: 1, max: 5, render: true })}</td>`).join('')}
    <td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${b}.decisao.criterios" data-i="${i}">✕</button></td></tr>`).join('') || `<tr><td colspan="${cc.length + 3}" class="vazio">Nenhum critério.</td></tr>`}
  ${cr.length && cc.length ? `<tr class="total"><td><b>Pontuação</b></td><td></td>${pont.map((x) => `<td class="${x.nota !== null && x.nota === max ? 'escolhido' : ''}"><b>${x.nota === null ? '—' : x.nota.toFixed(2).replace('.', ',')}</b>${x.completos ? '' : '<br><span class="muted">incompleto</span>'}</td>`).join('')}<td></td></tr>` : ''}
  </tbody></table></div>
  <div class="barra"><button class="btn pequeno" data-acao="add-linha" data-lista="${b}.decisao.criterios" data-novo="criterio">+ critério</button>
    ${App.p.qualidade.length ? '<button class="btn pequeno" data-acao="nedip-crit-espec">Carregar critérios das especificações</button>' : ''}
    ${cr.length && cc.length ? '<button class="btn pequeno primario" data-acao="nedip-crit-sel">Selecionar a concepção de maior pontuação</button>' : ''}</div>`;
  return cartao('Matriz de decisão ponderada', t);
};
App.acoes['nedip-crit-espec'] = () => {
  const c = App.p.produto.etapas.conceitual, existentes = new Set(c.decisao.criterios.map((k) => k.nome));
  let n = 0;
  App.p.qualidade.forEach((q) => {
    const nome = q.requisito.replace(/^RP\d+\.\s*/, '') + (q.criterioAceite ? ` (${q.criterioAceite})` : '');
    if (existentes.has(nome)) return;
    const peso = q.qfd && q.qfd.pesoRelativo ? Math.round(q.qfd.pesoRelativo * 1000) / 10 : 1;
    c.decisao.criterios.push({ nome, peso, notas: {} }); n++;
  });
  App.marcarSujo(true); App.render();
  App.toast(`${n} critério(s) incluído(s)${App.p.qualidade.some((q) => q.qfd && q.qfd.pesoRelativo) ? ' com o peso relativo do QFD (%)' : ' com peso 1 (ajuste à vontade)'}.`, 'ok');
};
App.acoes['nedip-crit-sel'] = () => {
  const c = App.p.produto.etapas.conceitual;
  const pont = nedipPontuacao(c).filter((x) => x.nota !== null).sort((a, b) => b.nota - a.nota);
  if (!pont.length) { App.toast('Dê notas às concepções primeiro.', 'aviso'); return; }
  c.concepcoes.forEach((x) => { x.selecionada = x.id === pont[0].id; });
  c.recomendacoes.con_aval = true; c.recomendacoes.con_sel = true;
  App.marcarSujo(true); App.render();
  App.toast(`Selecionada: ${esc(pont[0].nome)} (${pont[0].nota.toFixed(2).replace('.', ',')}). Registre a justificativa na concepção.`, 'ok');
};

// ------------------------------------------------------------------ FMEA → Riscos
App.nedipFmeaHtml = function (e, b) {
  const c = App.campo, L = NEDIP_FMEA_LIMITE;
  const n10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, String(n)]);
  const criticos = e.fmea.filter((x) => nedipRpn(x) >= L || +x.s >= 9).length;
  return cartao('FMEA — análise de modos de falha', `<p class="muted" style="margin-top:0">S = severidade, O = ocorrência, D = detecção (1 a 10). RPN = S × O × D. Linhas com RPN ≥ ${L} ou S ≥ 9 são críticas e podem ir para a aba Riscos (probabilidade ≈ O/2, impacto ≈ S/2).</p>
  <div class="rolagem"><table class="tab-edit fmea"><thead><tr><th>Item / função</th><th>Modo de falha</th><th>Efeito</th><th>Causa</th><th style="width:62px">S</th><th style="width:62px">O</th><th style="width:62px">D</th><th style="width:60px">RPN</th><th>Ação recomendada</th><th style="width:120px">Responsável</th><th class="acoes"></th></tr></thead><tbody>
  ${e.fmea.map((x, i) => { const r = nedipRpn(x), crit = r >= L || +x.s >= 9; const bi = `${b}.fmea.${i}`; return `<tr class="${crit ? 'critico' : ''}">
    <td>${c(bi + '.item', '', { tipo: 'textarea', linhas: 2 })}</td><td>${c(bi + '.modo', '', { tipo: 'textarea', linhas: 2 })}</td><td>${c(bi + '.efeito', '', { tipo: 'textarea', linhas: 2 })}</td><td>${c(bi + '.causa', '', { tipo: 'textarea', linhas: 2 })}</td>
    <td>${c(bi + '.s', '', { tipo: 'select', opcoes: n10, render: true })}</td><td>${c(bi + '.o', '', { tipo: 'select', opcoes: n10, render: true })}</td><td>${c(bi + '.d', '', { tipo: 'select', opcoes: n10, render: true })}</td>
    <td><b>${r}</b>${x.riscoId ? `<br><span class="muted">${esc(x.riscoId)}</span>` : ''}</td>
    <td>${c(bi + '.acao', '', { tipo: 'textarea', linhas: 2 })}</td><td>${c(bi + '.responsavel', '', { tipo: 'select', opcoes: App.opcoesPessoas() })}</td>
    <td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${b}.fmea" data-i="${i}">✕</button></td></tr>`; }).join('') || '<tr><td colspan="11" class="vazio">Nenhum modo de falha.</td></tr>'}
  </tbody></table></div>
  <div class="barra"><button class="btn pequeno" data-acao="add-linha" data-lista="${b}.fmea" data-novo="fmea">+ modo de falha</button>
  ${criticos ? `<button class="btn pequeno primario" data-acao="nedip-fmea-riscos">⚠️ Levar ${criticos} crítico(s) para a aba Riscos</button>` : ''}</div>`);
};
App.acoes['nedip-fmea-riscos'] = () => {
  const p = App.p, e = p.produto.etapas.preliminar, L = NEDIP_FMEA_LIMITE;
  let novos = 0, atual = 0;
  e.fmea.filter((x) => nedipRpn(x) >= L || +x.s >= 9).forEach((x) => {
    const dados = { descricao: `FMEA: ${x.modo || 'modo de falha'} em ${x.item || 'item'}${x.efeito ? ' → ' + x.efeito : ''} (RPN ${nedipRpn(x)})`, categoria: 'Técnico (FMEA)',
      probabilidade: Math.min(5, Math.max(1, Math.ceil(+x.o / 2))), impacto: Math.min(5, Math.max(1, Math.ceil(+x.s / 2))), planoAcao: x.acao, responsavel: x.responsavel };
    const r = x.riscoId && p.riscos.find((k) => k.id === x.riscoId);
    if (r) { Object.assign(r, dados); atual++; } else {
      const id = App.proximoId(p.riscos, 'R');
      p.riscos.push(Object.assign(App.novos.risco(), dados, { id, resposta: 'mitigar', status: 'aberto', macroUid: e.macros[0] || '' }));
      x.riscoId = id; novos++;
    }
  });
  e.recomendacoes.pre_fmea = true;
  App.marcarSujo(true); App.render(); App.agendarAnalise();
  App.toast(`Riscos: ${novos} novo(s), ${atual} atualizado(s). Veja a aba Riscos.`, 'ok');
};

// ------------------------------------------------------------------ questionários: consolidação
App.nedipImportarCsv = async function (arquivo) {
  const txt = (await arquivo.text()).replace(/^﻿/, '').replace(/\r/g, '');
  const linhas = txt.split('\n').filter((l) => l.trim());
  const sep = linhas.some((l) => l.includes(';')) ? ';' : ',';
  const num = (v) => { const n = parseFloat(String(v || '').trim().replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const numDec = (v) => { const n = parseFloat(String(v || '').trim().replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const out = [];
  linhas.forEach((l, i) => {
    const c = l.split(sep).map((x) => x.trim().replace(/^"|"$/g, ''));
    if (i === 0 && num(c[1]) === null && numDec(c[2]) === null) return; // cabeçalho
    if (!c[0]) return;
    out.push({ necessidade: c[0], citacoes: num(c[1]), importancia: numDec(c[2]), fase: c[3] || '' });
  });
  if (!out.length) { App.toast('Nenhuma linha reconhecida. Use: necessidade; citações; importância (1–5); fase.', 'erro', 9000); return; }
  const e = App.p.produto.etapas.informacional;
  e.consolidacao.push(...out);
  await App.nedipAnexar([arquivo], 'informacional', 'Consolidação importada (CSV)', true);
  e.recomendacoes.inf_quest = true;
  App.marcarSujo(true); App.render();
  App.toast(`${out.length} necessidade(s) importada(s) do CSV.`, 'ok');
};
App.acoes['nedip-cons-necessidades'] = () => {
  const e = App.p.produto.etapas.informacional;
  const nec = nedipNecessidadesDaConsolidacao(e.consolidacao);
  if (!nec.length) return;
  if (e.necessidades.length && !confirm(`Substituir os ${e.necessidades.length} requisito(s) de cliente atuais por ${nec.length} vindos da consolidação?`)) return;
  e.necessidades = nec; e.recomendacoes.inf_req = true;
  e.ferramentas.necessidades = true;
  App.marcarSujo(true); App.render();
  App.toast('Requisitos de cliente gerados: peso proporcional a importância média × citações.', 'ok');
};
App.acoes['nedip-normalizar-pesos'] = () => {
  const l = App.p.produto.etapas.informacional.necessidades, s = l.reduce((a, n) => a + (+n.peso || 0), 0);
  if (!s) return;
  l.forEach((n) => { n.peso = Math.round((+n.peso || 0) / s * 1000) / 1000; });
  App.marcarSujo(true); App.render();
};
App.acoes['nedip-quest-pdf'] = async () => {
  try { App.baixarBlob(await Pdf.gerar(Pdf.questionarioConsolidado(App.p)), `Questionário - respostas consolidadas - ${App.nedipNomeSeguro(App.p.projeto.nome || 'projeto')}.pdf`); }
  catch (e) { App.toast('Erro ao gerar o PDF: ' + esc(e.message), 'erro'); }
};
App.acoes['nedip-roteiro'] = async () => {
  try { App.baixarBlob(await Pdf.gerar(Pdf.roteiroQuestionario(App.p)), `Roteiro de questionário - ${App.nedipNomeSeguro(App.p.projeto.nome || 'projeto')}.pdf`); }
  catch (e) { App.toast('Erro ao gerar o roteiro: ' + esc(e.message), 'erro'); }
};

// ------------------------------------------------------------------ documentos da fase (salvos no ZIP)
App.nedipAnexosHtml = function (et, e, b) {
  const det = et.id === 'detalhado';
  return `<div class="cartao"><h3 style="margin-top:0">${det ? 'Importação de documentos do projeto (salvos no ZIP)' : 'Documentos da fase'}</h3>
  <p class="muted">${det ? 'Desenhos, CAD, planilhas, listas, fotos e manuais próprios.' : 'Formulários, respostas, planilhas, esboços, resultados de aplicativos e outros arquivos desta fase.'} Ficam em <code>produto/${et.id}/</code>, junto do JSON, e entram no ZIP (até ${CONFIG.anexoMaxMb} MB por arquivo).</p>
  <div class="barra"><label class="btn primario">⬆ Importar arquivo(s)<input type="file" multiple hidden id="anexoEtapa"></label>
  ${det ? '<button class="btn" data-acao="exp-zip">📦 Exportar ZIP do projeto</button>' : ''}</div>
  ${e.anexos.length ? `<table class="tab-edit"><thead><tr><th>Arquivo</th><th>Descrição</th><th style="width:90px">Tamanho</th><th style="width:100px">Data</th><th class="acoes"></th></tr></thead><tbody>
  ${e.anexos.map((a, i) => `<tr><td><a href="#" data-acao="nedip-baixar" data-arq="${esc(a.arquivo)}">${esc(a.nome)}</a><br><span class="muted">${esc(a.arquivo)}</span></td>
    <td>${App.campo(`${b}.anexos.${i}.descricao`, '', { ph: 'descrição' })}</td><td>${(a.tamanho / 1024).toFixed(0)} KB</td><td>${esc(dataBR(a.data))}</td>
    <td class="acoes"><button class="btn pequeno perigo" data-acao="nedip-rem-anexo" data-i="${i}" title="Remover">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="vazio">Nenhum documento.</p>'}</div>`;
};

App.nedipNomeSeguro = (n) => String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 90) || 'arquivo';

App.nedipAnexar = async function (arquivos, etapa = App.etapaSel, descricao = '', silencioso = false) {
  const e = App.p.produto.etapas[etapa];
  let n = 0;
  for (const f of arquivos) {
    if (f.size > CONFIG.anexoMaxMb * 1048576) { App.toast(`${esc(f.name)}: maior que ${CONFIG.anexoMaxMb} MB.`, 'erro'); continue; }
    const nome = App.nedipNomeSeguro(f.name);
    const usados = new Set(e.anexos.map((a) => a.arquivo));
    let cam = `produto/${etapa}/${nome}`, k = 1;
    while (usados.has(cam)) { const m = nome.match(/^(.*?)(\.[^.]*)?$/); cam = `produto/${etapa}/${m[1]}_${++k}${m[2] || ''}`; }
    try {
      await App.arm.gravarArquivo(cam, f);
      e.anexos.push({ arquivo: cam, nome: f.name, descricao, data: hojeISO(), tamanho: f.size }); n++;
    } catch (err) { App.toast(`${esc(f.name)}: ${esc(err.message)}`, 'erro'); }
  }
  if (n) {
    if (etapa === 'detalhado') e.recomendacoes.det_docs = true;
    App.p.log.push({ dataHora: Nucleo.agoraIso(), acao: `${n} documento(s) importado(s) em ${NEDIP_ETAPAS.find((x) => x.id === etapa).nome}`, usuario: App.cfg.usuario || '' });
    App.marcarSujo(true);
    if (!silencioso) { App.render(); App.toast(`${n} arquivo(s) guardado(s) em produto/${etapa}/. Salve para registrar no JSON.`, 'ok'); }
  }
};
App.acoes['nedip-baixar'] = async (el) => {
  const blob = await App.arm.lerArquivo(el.dataset.arq);
  if (!blob) { App.toast('Arquivo não encontrado: ' + esc(el.dataset.arq), 'erro'); return; }
  App.baixarBlob(blob, el.dataset.arq.split('/').pop());
};
App.acoes['nedip-rem-anexo'] = async (el) => {
  const e = App.p.produto.etapas[App.etapaSel], a = e.anexos[+el.dataset.i];
  if (!a || !confirm(`Remover "${a.nome}" do projeto?`)) return;
  await App.arm.removerArquivo(a.arquivo);
  e.anexos.splice(+el.dataset.i, 1);
  if (App.etapaSel === 'detalhado') ['projetoAnexo', 'usoAnexo'].forEach((k) => { if (e.manuais[k] === a.arquivo) e.manuais[k] = ''; });
  App.marcarSujo(true); App.render();
};

// ------------------------------------------------------------------ funções → árvore TRL
App.acoes['nedip-trl'] = () => {
  const c = App.p.produto.etapas.conceitual;
  if (!c.funcoes.length) { App.toast('Cadastre ao menos uma função parcial (ou monte a árvore na aba TRL).', 'aviso'); return; }
  if (!App.p.trl.arvore.length) { App.nedipAplicarTrl('substituir'); return; }
  App.modal(`<h2>Exportar funções para o TRL</h2><p>A árvore TRL já tem ${App.p.trl.arvore.length} produto(s). Como exportar a estrutura de funções?</p>
    <div class="barra"><button class="btn primario" data-acao="nedip-trl-ok" data-modo="adicionar">Adicionar como novo produto</button>
    <button class="btn perigo" data-acao="nedip-trl-ok" data-modo="substituir">Substituir a árvore (perde as avaliações atuais)</button>
    <button class="btn" data-acao="fechar-modal">Cancelar</button></div>`);
};
App.acoes['nedip-trl-ok'] = (el) => App.nedipAplicarTrl(el.dataset.modo);
App.nedipAplicarTrl = function (modo) {
  const c = App.p.produto.etapas.conceitual;
  const raiz = nedipArvoreFuncoes(App.p);
  if (modo === 'substituir') {
    App.p.areas.forEach((a) => { if (a.noImatec) a.vinculoPerdido = true; });
    App.p.trl.arvore = [raiz];
  } else App.p.trl.arvore.push(raiz);
  c.trlExportadoEm = Nucleo.agoraIso();
  c.recomendacoes.con_trl = true;
  App.p.log.push({ dataHora: c.trlExportadoEm, acao: `Estrutura de funções exportada para a árvore TRL (${modo})`, usuario: App.cfg.usuario || '' });
  App.fecharModal();
  App.trlAposEstrutura();
  App.toast(`Árvore TRL ${modo === 'substituir' ? 'substituída' : 'ampliada'}: ${raiz.filhos.length} função(ões), ${raiz.filhos.reduce((s, f) => s + f.filhos.length, 0)} subfunção(ões). Avalie os itens na aba TRL.`, 'ok', 8000);
};

// ------------------------------------------------------------------ manuais
App.acoes['nedip-manual'] = async (el) => {
  const tipo = el.dataset.tipo;
  App.progresso(`Gerando o manual de ${tipo}…`);
  try {
    const doc = tipo === 'projeto' ? await Pdf.manualProjeto(App.p, App.arm) : await Pdf.manualUso(App.p);
    const blob = await Pdf.gerar(doc);
    const cam = `produto/manuais/manual_de_${tipo}.pdf`;
    await App.arm.gravarArquivo(cam, blob);
    const e = App.p.produto.etapas.detalhado;
    e.manuais[tipo] = cam; e.manuais.geradoEm = Nucleo.agoraIso();
    e.recomendacoes[tipo === 'projeto' ? 'det_manproj' : 'det_manuso'] = true;
    App.p.log.push({ dataHora: e.manuais.geradoEm, acao: `Manual de ${tipo} gerado (${cam})`, usuario: App.cfg.usuario || '' });
    App.fecharModal(); App.marcarSujo(true); App.render();
    App.baixarBlob(blob, `Manual de ${tipo} - ${App.nedipNomeSeguro(App.p.projeto.nome || 'projeto')}.pdf`);
    App.toast(`Manual de ${tipo} gerado e guardado em ${cam}. Salve para registrar no JSON.`, 'ok');
  } catch (e) { App.fecharModal(); console.error(e); App.toast('Erro ao gerar o manual: ' + esc(e.message), 'erro', 9000); }
};
