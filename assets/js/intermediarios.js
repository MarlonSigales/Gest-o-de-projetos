/*
 * Relatórios de andamento da macroentrega. A macroentrega tem um só texto (os blocos do desenvolvimento):
 * enquanto não está finalizada, "Gerar relatório de andamento" guarda uma cópia do texto daquele momento
 * (com data e período) e gera o PDF sem termo de aceite; ao finalizar, o mesmo texto gera o relatório da
 * macroentrega. As cópias formam o histórico (podem ser reabertas, corrigidas e geradas de novo) e ficam
 * em relatorios/, no ZIP.
 */
'use strict';

App.relAberto = null; // id do relatório do histórico aberto para correção

App.intermediariosHtml = function (mi) {
  const m = App.p.macroentregas[mi], rs = m.relatorios;
  let h = `<p class="muted" style="margin-top:0">Cada relatório de andamento guarda uma cópia do texto da macroentrega no dia em que foi gerado. Para corrigir uma versão já emitida, abra-a aqui; para o próximo relatório, edite o desenvolvimento acima e use “Gerar relatório de andamento”.</p>`;
  if (!rs.length) return h + '<p class="vazio">Nenhum relatório de andamento gerado.</p>';
  h += `<table class="tab-edit"><thead><tr><th>Relatório</th><th style="width:110px">Data</th><th style="width:200px">Período</th><th style="width:80px">Blocos</th><th style="width:260px"></th></tr></thead><tbody>
    ${rs.map((r, ri) => `<tr class="${App.relAberto === r.id ? 'sel' : ''}"><td><b>${esc(r.titulo || 'Relatório ' + (ri + 1))}</b></td><td>${esc(dataBR(r.data))}</td>
      <td>${r.periodoInicio || r.periodoFim ? `${esc(dataBR(r.periodoInicio) || '…')} a ${esc(dataBR(r.periodoFim) || '…')}` : '—'}</td><td>${r.blocos.length}</td>
      <td><div class="barra" style="margin:0"><button class="btn pequeno" data-acao="rel-pdf" data-mi="${mi}" data-ri="${ri}">📄 PDF</button>
        <button class="btn pequeno ${App.relAberto === r.id ? 'primario' : ''}" data-acao="rel-abrir" data-id="${esc(r.id)}">${App.relAberto === r.id ? '✓ Fechar' : '✎ Corrigir'}</button>
        <button class="btn pequeno perigo" data-acao="rel-excluir" data-mi="${mi}" data-ri="${ri}">🗑</button></div></td></tr>`).join('')}</tbody></table>`;
  const ri = rs.findIndex((r) => r.id === App.relAberto);
  if (ri >= 0) {
    const b = `macroentregas.${mi}.relatorios.${ri}`, c = App.campo;
    h += `<div class="rel-editor"><h4 style="margin-top:0">Corrigir: ${esc(rs[ri].titulo || 'Relatório')}</h4><div class="grade-campos">
      ${c(b + '.titulo', 'Título')}${c(b + '.data', 'Data do relatório', { tipo: 'date' })}
      ${c(b + '.periodoInicio', 'Período coberto: de', { tipo: 'date' })}${c(b + '.periodoFim', 'até', { tipo: 'date' })}</div>
      ${App.blocosHtml(mi, b + '.blocos', { base: '3', ajuda: 'Texto desta versão do relatório (cópia do desenvolvimento no dia em que foi gerado). As correções aqui não mudam o texto atual da macroentrega.' })}
      <div class="barra"><button class="btn primario" data-acao="rel-pdf" data-mi="${mi}" data-ri="${ri}">📄 Gerar de novo o PDF desta versão</button></div></div>`;
  }
  return h;
};

/** Cópia do texto atual da macroentrega para o histórico (novos ids nos blocos; figuras e tabelas são compartilhadas). */
App.relInstantaneo = function (m) {
  const r = Nucleo.novoRelatorio(m.relatorios.length + 1);
  Object.assign(r, { periodoInicio: m.andamento.periodoInicio || (m.relatorios.length ? m.relatorios[m.relatorios.length - 1].periodoFim : m.dataInicio) || '',
    periodoFim: m.andamento.periodoFim || Nucleo.hoje(), etapasFuturas: m.etapasFuturas,
    blocos: m.blocos.map((b) => Object.assign(Nucleo.clonar(b), { id: Nucleo.uid('bl') })) });
  return r;
};
App.relCaminhoPdf = (mi, ri) => `relatorios/macroentrega_${String(mi + 1).padStart(2, '0')}_andamento_${String(ri + 1).padStart(2, '0')}.pdf`;
App.relNomePdf = (mi, ri) => `Macroentrega ${String(mi + 1).padStart(2, '0')} - relatório de andamento ${ri + 1} - ${Nucleo.nomeSeguro(App.p.projeto.nome)}.pdf`;
App.relGerarPdf = async function (mi, ri) {
  const blob = await Pdf.gerar(await Pdf.relatorioIntermediario(App.p, mi, ri, App.arm));
  App.baixarBlob(blob, App.relNomePdf(mi, ri));
  try { await App.arm.gravarArquivo(App.relCaminhoPdf(mi, ri), blob); } catch (e) { /* opcional */ }
  App.p.macroentregas[mi].relatorios[ri].gerado = Nucleo.agoraIso();
  App.marcarSujo(true);
};
App.acoes['rel-gerar'] = async (el) => {
  const mi = +el.dataset.mi, m = App.p.macroentregas[mi];
  if (!m.blocos.length && !confirm('O desenvolvimento desta macroentrega ainda está vazio. Gerar o relatório de andamento mesmo assim?')) return;
  const r = App.relInstantaneo(m);
  m.relatorios.push(r);
  m.andamento = { periodoInicio: r.periodoFim, periodoFim: '' }; // o próximo começa onde este terminou
  if (m.status === 'planejada') m.status = 'em andamento';
  const t = el.textContent; el.disabled = true; el.textContent = 'Gerando PDF…';
  try { await App.relGerarPdf(mi, m.relatorios.length - 1); App.toast(`${r.titulo} gerado e guardado no histórico (relatorios/).`, 'ok', 7000); }
  catch (e) { console.error(e); App.toast('PDF: ' + esc(e.message), 'erro', 9000); }
  finally { el.disabled = false; el.textContent = t; App.render(); }
};
App.acoes['rel-abrir'] = (el) => { App.relAberto = App.relAberto === el.dataset.id ? null : el.dataset.id; App.render(); };
App.acoes['rel-excluir'] = async (el) => {
  const m = App.p.macroentregas[+el.dataset.mi], ri = +el.dataset.ri, r = m.relatorios[ri];
  if (!r || !confirm(`Excluir "${r.titulo}" do histórico? (O texto atual da macroentrega não muda.)`)) return;
  m.relatorios.splice(ri, 1);
  for (const b of r.blocos) {
    if (!b.ref || App.refEmUso(m, b.ref)) continue;
    if (b.tipo === 'tabela') m.tabelas = m.tabelas.filter((t) => t.id !== b.ref);
    if (b.tipo === 'figura') {
      const f = m.figuras.find((x) => x.id === b.ref);
      m.figuras = m.figuras.filter((x) => x.id !== b.ref);
      if (f && !App.p.macroentregas.some((x) => x.figuras.some((g) => g.arquivo === f.arquivo))) { try { await App.arm.removerArquivo(f.arquivo); } catch (e) { /* ignora */ } }
    }
  }
  if (App.relAberto === r.id) App.relAberto = null;
  App.marcarSujo(true); App.render();
};
App.acoes['rel-pdf'] = async (el) => {
  const mi = +el.dataset.mi, ri = +el.dataset.ri, t = el.textContent;
  el.disabled = true; el.textContent = 'Gerando PDF…';
  try { await App.relGerarPdf(mi, ri); } catch (e) { console.error(e); App.toast('PDF: ' + esc(e.message), 'erro', 9000); }
  finally { el.disabled = false; el.textContent = t; App.render(); }
};

// ================================================================== PDF
/** Relatório de andamento: ri = índice no histórico, ou um relatório avulso (ex.: o texto atual, para o e-mail). */
Pdf.relatorioIntermediario = async function (p, mi, ri, armazem) {
  const m = p.macroentregas[mi], r = typeof ri === 'object' ? ri : m.relatorios[ri], n = mi + 1;
  const vista = Nucleo.macroDaLista(m, r.blocos), num = Nucleo.numerar(p, [vista]);
  const imgs = await Pdf.carregarFiguras({ macroentregas: [vista] }, armazem);
  const an = Nucleo.analisar(p), am = an.macroentregas[mi];
  const { h1 } = secoesNumeradas();
  const per = r.periodoInicio || r.periodoFim ? `${Nucleo.dataBR(r.periodoInicio) || '…'} a ${Nucleo.dataBR(r.periodoFim) || '…'}` : '—';
  const c = [{ toc: { id: 'sum', title: { text: 'Sumário', style: 'h1', margin: [0, 0, 0, 12] } }, pageBreak: 'before' }];
  c.push(...h1('Identificação e andamento', true));
  c.push(Pdf.kpi([['Projeto', `${p.projeto.nome} (${p.projeto.codigo})`], ['Macroentrega', `${n} – ${m.titulo}`], ['Relatório', `${r.titulo} · ${Nucleo.dataBR(r.data)}`],
    ['Período coberto', per], ['Situação da macroentrega', am.status.charAt(0).toUpperCase() + am.status.slice(1)],
    ['Percentual concluído', am.percentual + '%' + (am.automatico ? ' (calculado pelas atividades)' : '')], ['Prazo previsto', Nucleo.dataBR(m.dataPrevista) || '—']]));
  const atv = an.atividades.filter((a) => a.macro === n);
  if (atv.length) c.push({ text: 'Atividades', style: 'h3' }, Pdf.grade(['Cód.', 'Atividade', 'Responsável', 'Período', '%'],
    atv.map((a) => [a.codigo, a.nome + (a.atrasada ? ' (atrasada)' : ''), a.responsavel, `${Nucleo.dataBR(a.inicio)} a ${Nucleo.dataBR(a.fim)}`, String(a.percentual)]), [28, '*', 90, 110, 26]));
  const obj = (m.objetivosEtapa || []).filter((o) => String(o).trim());
  if (obj.length) c.push({ text: 'Objetivos da etapa', style: 'h3' }, { ul: obj, style: 'corpo', margin: [0, 0, 0, 6] });
  c.push(...Pdf.proximosPassos(p, an, +m.trlEsperado || null, { stack: h1('Próximos passos para o TRL esperado') }));
  c.push(...h1('Desenvolvimento', true));
  const bl = Pdf.blocos(p, vista, num, imgs, { base: '3', toc: { fig: null, tab: null } });
  c.push(...(bl.length ? bl : [{ text: 'Sem conteúdo: escreva o desenvolvimento da macroentrega em blocos.', style: 'muted' }]));
  const fut = r.etapasFuturas !== undefined ? r.etapasFuturas : m.etapasFuturas;
  if (String(fut || '').trim()) c.push(...h1('Próximas etapas'), ...Pdf.texto(fut, num));
  const refs = Pdf.referenciasCitadas(p, num);
  if (refs.length) c.push(...h1('Referências'), ...refs);
  return Pdf.documento(p, 'RELATÓRIO DE', 'ANDAMENTO', `Relatório de andamento – Macroentrega ${n}`, c, `Macroentrega ${n} – ${m.titulo} · ${r.titulo} · período ${per}`);
};
