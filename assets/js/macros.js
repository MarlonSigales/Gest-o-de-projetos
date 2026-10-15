/* Aba Macroentregas: uma sub-aba por macroentrega, com inclusão/remoção e PDF individual. */
'use strict';

App.STATUS_MACRO = [['planejada', 'planejada'], ['em andamento', 'em andamento'], ['concluída', 'concluída'], ['aceita', 'aceita']];

App.novaMacro = function () {
  return {
    uid: Nucleo.uid('me'), numero: App.p.macroentregas.length + 1, titulo: '', descricao: '', dataInicio: '', dataPrevista: '', dataEntrega: '',
    status: 'planejada', percentualConcluido: 0, trlEsperado: 4, areas: [], objetivosEtapa: [''],
    resultados: '', conclusao: '', etapasFuturas: '', atividades: [], figuras: [], tabelas: [], blocos: [], relatorios: [],
    finalizada: false, andamento: { periodoInicio: '', periodoFim: '' },
    aceite: { dataAceite: '', nomeResponsavelEmpresa: '', aceito: false },
  };
};

App.abas.macros = {
  render() {
    const ms = App.p.macroentregas;
    if (App.macroSel >= ms.length) App.macroSel = Math.max(0, ms.length - 1);
    const anM = App.an ? App.an.macroentregas : [];
    let h = `<h2>Macroentregas</h2><div class="subabas">` + ms.map((m, i) =>
      `<button data-acao="sel-macro" data-i="${i}" class="${i === App.macroSel ? 'ativa' : ''} ${anM[i] && anM[i].atrasada ? 'atrasada' : ''}" title="${esc(m.titulo)}">Macroentrega ${i + 1}${m.finalizada ? ' ✓' : ''}</button>`).join('')
      + `<button class="btn" data-acao="add-macro">+ Macroentrega</button></div>`;
    if (!ms.length) return h + '<p class="vazio">Nenhuma macroentrega. Clique em "+ Macroentrega".</p>';

    const mi = App.macroSel, m = ms[mi], b = `macroentregas.${mi}`, c = App.campo, fin = m.finalizada;
    const temAtiv = m.atividades.length > 0;
    // situação da escrita: em andamento → relatórios de andamento; finalizada → relatório da macroentrega (com termo de aceite)
    h += `<div class="cartao situacao-escrita ${fin ? 'fin' : 'and'}"><div class="barra" style="justify-content:space-between;margin:0">
      <div><b>${fin ? '✅ Finalizada' : '📝 Em andamento'}</b> <span class="muted">${fin
        ? '— o texto abaixo gera o <b>relatório da macroentrega</b>, com termo de aceite e conclusão.'
        : '— o texto abaixo gera <b>relatórios de andamento</b> (sem termo de aceite). Quando a macroentrega estiver pronta, marque como finalizada: o mesmo texto vira o relatório final.'}</span>
        <div><span id="statusMacro"></span></div></div>
      <div class="barra" style="margin:0">
        ${fin ? `<button class="btn primario" data-acao="pdf-macro" data-i="${mi}">📄 Gerar o relatório da macroentrega</button>
          <button class="btn" data-acao="macro-finalizar" data-i="${mi}" data-v="0">↺ Voltar para em andamento</button>`
        : `<button class="btn primario" data-acao="rel-gerar" data-mi="${mi}">📄 Gerar relatório de andamento</button>
          <button class="btn" data-acao="macro-finalizar" data-i="${mi}" data-v="1">✔ Marcar como finalizada</button>`}
        <button class="btn perigo" data-acao="rem-macro" data-i="${mi}">– Remover</button></div></div>
      ${fin ? '' : `<div class="grade-campos" style="margin-top:8px">${c(b + '.andamento.periodoInicio', 'Próximo relatório de andamento: período de', { tipo: 'date' })}${c(b + '.andamento.periodoFim', 'até', { tipo: 'date' })}</div>`}
    </div>

<div class="cartao"><h3 style="margin-top:0">Macroentrega ${mi + 1}</h3><div class="grade-campos">
  ${c(b + '.titulo', 'Título (conforme plano de trabalho)', { classe: 'largo' })}
  ${c(b + '.descricao', 'Descrição (vai para a apresentação e para o termo de aceite)', { tipo: 'textarea', classe: 'largo', linhas: 4 })}
  ${c(b + '.dataInicio', 'Início', { tipo: 'date' })}
  ${c(b + '.dataPrevista', 'Data prevista de entrega', { tipo: 'date' })}
  ${c(b + '.dataEntrega', 'Data de entrega (realizada)', { tipo: 'date' })}
  ${c(b + '.status', 'Situação', { tipo: 'select', opcoes: App.STATUS_MACRO })}
  ${temAtiv ? `<label class="campo">Percentual concluído<input disabled value="calculado pelas atividades"></label>` : c(b + '.percentualConcluido', 'Percentual concluído (%)', { tipo: 'number', min: 0, max: 100 })}
  ${c(b + '.trlEsperado', 'TRL esperado ao fim da etapa', { tipo: 'select', opcoes: App.opcoesTrl })}
  ${c(b + '.areas', 'Áreas envolvidas (Ctrl+clique; vazio = todas)', { tipo: 'multi', opcoes: App.opcoesAreas(false) })}
</div></div>

<div class="cartao"><h3 style="margin-top:0">Fundamentos e direcionamento</h3>
  <p class="muted">Introdução e objetivo geral são comuns a todas as macroentregas e ficam na aba Projeto.</p>
  <h4>Objetivos da etapa</h4>
  ${App.listaTextos(b + '.objetivosEtapa', 'Objetivo', 'Adicionar objetivo')}
</div>

<div class="cartao nb-cartao"><h3 style="margin-top:0">Resultados — desenvolvimento</h3>${App.blocosHtml(mi, null, { ajuda: 'Escreva o desenvolvimento como num caderno: texto, capítulos, figuras, tabelas e dados do sistema, cada um no seu bloco. Figuras e tabelas só entram por blocos, sempre com o texto que as explica. No PDF, os blocos formam o item <b>3. Resultados</b>, com capítulos numerados (3.1, 3.1.1 …).' })}</div>

${fin ? `<div class="cartao"><h3 style="margin-top:0">Conclusão</h3>${c(b + '.conclusao', '', { tipo: 'textarea', linhas: 4 })}</div>` : ''}

<div class="cartao"><h3 style="margin-top:0">Projeções e próximos passos</h3>
  ${c(b + '.etapasFuturas', 'Etapas futuras', { tipo: 'textarea', classe: 'largo', linhas: 4 })}
</div>

<div class="cartao"><h3 style="margin-top:0">Atividades (cronograma desta macroentrega)</h3>
${App.tabela(b + '.atividades', [
    { campo: 'nome', rotulo: 'Atividade', largura: '24%' },
    { campo: 'responsavel', rotulo: 'Responsável', tipo: 'select', opcoes: App.opcoesPessoas() },
    { campo: 'area', rotulo: 'Área', tipo: 'select', opcoes: App.opcoesAreas() },
    { campo: 'inicio', rotulo: 'Início', tipo: 'date' },
    { campo: 'fim', rotulo: 'Fim', tipo: 'date' },
    { campo: 'percentual', rotulo: '%', tipo: 'number', min: 0, max: 100, largura: '70px' },
    { campo: 'dependeDe', rotulo: 'Depende de', tipo: 'multi', opcoes: (a) => App.opcoesAtividades(a.id) },
  ], { novo: 'atividade', botao: 'Adicionar atividade', vazio: 'Sem atividades: o percentual da macroentrega é informado manualmente.' })}
</div>

<div class="cartao"><h3 style="margin-top:0">Relatórios de andamento gerados (histórico)</h3>${App.intermediariosHtml(mi)}</div>

${fin ? `<div class="cartao"><h3 style="margin-top:0">Termo de aceite (2ª página do PDF)</h3><div class="grade-campos">
  ${c(b + '.aceite.dataAceite', 'Data do aceite', { tipo: 'date' })}
  ${c(b + '.aceite.nomeResponsavelEmpresa', 'Responsável na empresa', { ph: App.p.projeto.responsavelEmpresa || '' })}
  ${c(b + '.aceite.aceito', 'Macroentrega aceita pela empresa', { tipo: 'checkbox' })}
</div></div>` : ''}`;
    return h;
  },
  analise() {
    const a = App.an && App.an.macroentregas[App.macroSel];
    const el = $('#statusMacro');
    if (!a || !el) return;
    el.innerHTML = `<span class="status ${esc(a.status)}">${esc(a.status)}</span> · ${a.percentual}% concluído${a.automatico ? ' (pelas atividades)' : ''}${a.aceito ? ' · <b>aceite registrado</b>' : ''}`;
  },
};

App.acoes['macro-finalizar'] = (el) => {
  const m = App.p.macroentregas[+el.dataset.i], fin = el.dataset.v === '1';
  if (fin && !confirm('Marcar esta macroentrega como finalizada? O texto passa a gerar o relatório da macroentrega, com termo de aceite e conclusão.')) return;
  m.finalizada = fin;
  if (fin && !['concluída', 'aceita'].includes(m.status)) m.status = 'concluída';
  if (fin && !m.dataEntrega) m.dataEntrega = hojeISO();
  if (!fin && ['concluída', 'aceita'].includes(m.status) && !m.aceite.aceito) m.status = 'em andamento';
  App.marcarSujo(true); App.render(); App.agendarAnalise();
  App.toast(fin ? 'Macroentrega finalizada: gere o relatório da macroentrega e registre o aceite.' : 'Macroentrega de volta a em andamento: o texto gera relatórios de andamento.', 'ok', 7000);
};

App.listaTextos = function (caminho, rotulo, botao) {
  const l = App.get(caminho) || [];
  let h = '<table class="tab-edit"><tbody>';
  if (!l.length) h += '<tr><td class="vazio">Nenhum item.</td></tr>';
  l.forEach((_, i) => { h += `<tr><td>${App.campo(`${caminho}.${i}`, '', { ph: rotulo + ' ' + (i + 1) })}</td><td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${esc(caminho)}" data-i="${i}">✕</button></td></tr>`; });
  return h + `</tbody></table><div class="barra"><button class="btn pequeno" data-acao="add-linha" data-lista="${esc(caminho)}" data-novo="texto">+ ${esc(botao)}</button></div>`;
};

App.opcoesAtividades = function (proprio) {
  const out = [];
  App.p.macroentregas.forEach((m, mi) => m.atividades.forEach((a, ai) => {
    if (a.id !== proprio) out.push([a.id, `${mi + 1}.${ai + 1} ${a.nome || ''}`]);
  }));
  return out;
};

App.acoes['sel-macro'] = (el) => { App.macroSel = +el.dataset.i; App.render(); };
App.acoes['add-macro'] = () => {
  App.p.macroentregas.push(App.novaMacro());
  App.macroSel = App.p.macroentregas.length - 1;
  App.marcarSujo(true); App.render(); App.agendarAnalise();
};
App.acoes['rem-macro'] = (el) => {
  const i = +el.dataset.i, m = App.p.macroentregas[i];
  if (!confirm(`Remover a Macroentrega ${i + 1}${m.titulo ? ' – ' + m.titulo : ''}? As seguintes serão renumeradas.`)) return;
  const idsAtiv = new Set(m.atividades.map((a) => a.id));
  App.p.macroentregas.splice(i, 1);
  App.p.macroentregas.forEach((x, k) => {
    x.numero = k + 1;
    x.atividades.forEach((a) => { a.dependeDe = (a.dependeDe || []).filter((d) => !idsAtiv.has(d)); });
  });
  App.macroSel = Math.max(0, i - 1);
  App.marcarSujo(true); App.render(); App.agendarAnalise();
  App.toast('Macroentrega removida. As figuras dela continuam na pasta até você removê-las; salve para confirmar.');
};
App.acoes['pdf-macro'] = async (el) => {
  const n = +el.dataset.i + 1;
  el.disabled = true; const t = el.textContent; el.textContent = 'Gerando PDF…';
  try { await App.gerarPdf('macro', n - 1); }
  catch (e) { App.toast('PDF: ' + esc(e.message), 'erro', 8000); }
  finally { el.disabled = false; el.textContent = t; }
};
