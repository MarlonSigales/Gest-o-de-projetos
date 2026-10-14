/* Aba Macroentregas: uma sub-aba por macroentrega, com inclusão/remoção e PDF individual. */
'use strict';

App.STATUS_MACRO = [['planejada', 'planejada'], ['em andamento', 'em andamento'], ['concluída', 'concluída'], ['aceita', 'aceita']];

App.novaMacro = function () {
  return {
    uid: Nucleo.uid('me'), numero: App.p.macroentregas.length + 1, titulo: '', descricao: '', dataInicio: '', dataPrevista: '', dataEntrega: '',
    status: 'planejada', percentualConcluido: 0, trlEsperado: 4, areas: [], objetivosEtapa: [''],
    resultados: '', conclusao: '', etapasFuturas: '', atividades: [], figuras: [], tabelas: [], blocos: [],
    aceite: { dataAceite: '', nomeResponsavelEmpresa: '', aceito: false },
  };
};

App.abas.macros = {
  render() {
    const ms = App.p.macroentregas;
    if (App.macroSel >= ms.length) App.macroSel = Math.max(0, ms.length - 1);
    const anM = App.an ? App.an.macroentregas : [];
    let h = `<h2>Macroentregas</h2><div class="subabas">` + ms.map((m, i) =>
      `<button data-acao="sel-macro" data-i="${i}" class="${i === App.macroSel ? 'ativa' : ''} ${anM[i] && anM[i].atrasada ? 'atrasada' : ''}" title="${esc(m.titulo)}">Macroentrega ${i + 1}</button>`).join('')
      + `<button class="btn" data-acao="add-macro">+ Macroentrega</button></div>`;
    if (!ms.length) return h + '<p class="vazio">Nenhuma macroentrega. Clique em "+ Macroentrega".</p>';

    const mi = App.macroSel, m = ms[mi], b = `macroentregas.${mi}`, c = App.campo;
    const temAtiv = m.atividades.length > 0;
    h += `<div class="barra" style="justify-content:space-between">
      <div class="barra" style="margin:0"><span id="statusMacro"></span></div>
      <div class="barra" style="margin:0">
        <button class="btn primario" data-acao="pdf-macro" data-i="${mi}">📄 Gerar PDF desta macroentrega</button>
        <button class="btn perigo" data-acao="rem-macro" data-i="${mi}">– Remover macroentrega</button></div></div>

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

<div class="cartao"><h3 style="margin-top:0">Resultados e conclusões</h3><div class="grade-campos">
  ${c(b + '.resultados', 'Resultados', { tipo: 'textarea', classe: 'largo', linhas: 8, ph: 'Cite figuras e tabelas com {{fig:fig_001}} e {{tab:tab_001}}' })}
  ${c(b + '.conclusao', 'Conclusão', { tipo: 'textarea', classe: 'largo', linhas: 4 })}
</div></div>

<div class="cartao nb-cartao"><h3 style="margin-top:0">Resultados — desenvolvimento em blocos</h3>${App.blocosHtml(mi)}</div>

<div class="cartao"><h3 style="margin-top:0">Relatórios de andamento desta macroentrega (antes da entrega)</h3>${App.intermediariosHtml(mi)}</div>

<div class="cartao"><h3 style="margin-top:0">Projeções e próximos passos</h3>
  ${c(b + '.etapasFuturas', 'Etapas futuras', { tipo: 'textarea', classe: 'largo', linhas: 4 })}
</div>

<div class="cartao"><h3 style="margin-top:0">Figuras soltas (por seção)</h3>${App.editorFiguras(mi)}</div>
<div class="cartao"><h3 style="margin-top:0">Tabelas soltas (por seção)</h3>${App.editorTabelas(mi)}</div>

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

<div class="cartao"><h3 style="margin-top:0">Termo de aceite (2ª página do PDF)</h3><div class="grade-campos">
  ${c(b + '.aceite.dataAceite', 'Data do aceite', { tipo: 'date' })}
  ${c(b + '.aceite.nomeResponsavelEmpresa', 'Responsável na empresa', { ph: App.p.projeto.responsavelEmpresa || '' })}
  ${c(b + '.aceite.aceito', 'Macroentrega aceita pela empresa', { tipo: 'checkbox' })}
</div></div>`;
    return h;
  },
  analise() {
    const a = App.an && App.an.macroentregas[App.macroSel];
    const el = $('#statusMacro');
    if (!a || !el) return;
    el.innerHTML = `<span class="status ${esc(a.status)}">${esc(a.status)}</span> · ${a.percentual}% concluído${a.automatico ? ' (pelas atividades)' : ''}${a.aceito ? ' · <b>aceite registrado</b>' : ''}`;
  },
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
