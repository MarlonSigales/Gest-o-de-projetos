/*
 * Relatórios de andamento entre macroentregas (quando necessários): cada macroentrega pode ter vários,
 * com data, período coberto e desenvolvimento em blocos (o mesmo editor da macroentrega). O PDF tem capa
 * própria e não tem termo de aceite; fica em relatorios/, entra no ZIP e no e-mail (se marcado) e os blocos
 * podem ser copiados para o relatório final da macroentrega.
 */
'use strict';

App.relAberto = null; // id do relatório intermediário aberto para edição

App.intermediariosHtml = function (mi) {
  const m = App.p.macroentregas[mi], rs = m.relatorios;
  let h = `<p class="muted" style="margin-top:0">Para registrar o andamento antes da entrega (pré-macroentrega): cada relatório tem data, período e desenvolvimento em blocos. O PDF não tem termo de aceite, fica em <code>relatorios/</code> e entra no ZIP e, se marcado, no e-mail ao salvar. Os blocos podem ser copiados para o relatório final desta macroentrega.</p>`;
  if (rs.length) {
    h += `<table class="tab-edit"><thead><tr><th>Relatório</th><th style="width:110px">Data</th><th style="width:200px">Período</th><th style="width:80px">Blocos</th><th style="width:130px">PDF</th><th style="width:380px"></th></tr></thead><tbody>
    ${rs.map((r, ri) => `<tr class="${App.relAberto === r.id ? 'sel' : ''}"><td><b>${esc(r.titulo || 'Relatório ' + (ri + 1))}</b></td><td>${esc(dataBR(r.data))}</td>
      <td>${r.periodoInicio || r.periodoFim ? `${esc(dataBR(r.periodoInicio) || '…')} a ${esc(dataBR(r.periodoFim) || '…')}` : '—'}</td><td>${r.blocos.length}</td>
      <td class="muted">${r.gerado ? 'gerado em ' + esc(r.gerado.replace('T', ' ').slice(0, 16)) : '—'}</td>
      <td><div class="barra" style="margin:0"><button class="btn pequeno ${App.relAberto === r.id ? 'primario' : ''}" data-acao="rel-abrir" data-mi="${mi}" data-id="${esc(r.id)}">${App.relAberto === r.id ? '✓ Fechar' : '✎ Abrir'}</button>
        <button class="btn pequeno" data-acao="rel-pdf" data-mi="${mi}" data-ri="${ri}">📄 PDF</button>
        <button class="btn pequeno" data-acao="rel-copiar" data-mi="${mi}" data-ri="${ri}" ${r.blocos.length ? '' : 'disabled'} title="Acrescenta cópias dos blocos no fim do desenvolvimento da macroentrega">⧉ Copiar para o relatório final</button>
        <button class="btn pequeno perigo" data-acao="rel-excluir" data-mi="${mi}" data-ri="${ri}">🗑</button></div></td></tr>`).join('')}</tbody></table>`;
  } else h += '<p class="vazio">Nenhum relatório de andamento nesta macroentrega.</p>';
  h += `<div class="barra"><button class="btn" data-acao="rel-novo" data-mi="${mi}">+ Relatório de andamento</button></div>`;
  const ri = rs.findIndex((r) => r.id === App.relAberto);
  if (ri >= 0) {
    const b = `macroentregas.${mi}.relatorios.${ri}`, c = App.campo;
    h += `<div class="rel-editor"><h4 style="margin-top:0">${esc(rs[ri].titulo || 'Relatório')}</h4><div class="grade-campos">
      ${c(b + '.titulo', 'Título')}${c(b + '.data', 'Data do relatório', { tipo: 'date' })}
      ${c(b + '.periodoInicio', 'Período coberto: de', { tipo: 'date' })}${c(b + '.periodoFim', 'até', { tipo: 'date' })}
      ${c(b + '.enviar', 'Enviar no e-mail de andamento ao salvar', { tipo: 'checkbox' })}</div>
      ${App.blocosHtml(mi, b + '.blocos', { base: '2', ajuda: 'Desenvolvimento deste relatório em blocos. No PDF, depois da identificação e do andamento das atividades, os capítulos são numerados 2.1, 2.1.1 …' })}
      <div class="barra"><button class="btn primario" data-acao="rel-pdf" data-mi="${mi}" data-ri="${ri}">📄 Gerar o PDF deste relatório</button></div></div>`;
  }
  return h;
};

App.acoes['rel-novo'] = (el) => {
  const m = App.p.macroentregas[+el.dataset.mi], r = Nucleo.novoRelatorio(m.relatorios.length + 1);
  const ant = m.relatorios[m.relatorios.length - 1];
  r.periodoInicio = ant && ant.periodoFim ? ant.periodoFim : (m.dataInicio || '');
  r.periodoFim = Nucleo.hoje();
  m.relatorios.push(r); App.relAberto = r.id;
  App.marcarSujo(true); App.render();
};
App.acoes['rel-abrir'] = (el) => { App.relAberto = App.relAberto === el.dataset.id ? null : el.dataset.id; App.render(); };
App.acoes['rel-excluir'] = async (el) => {
  const m = App.p.macroentregas[+el.dataset.mi], ri = +el.dataset.ri, r = m.relatorios[ri];
  if (!r || !confirm(`Excluir "${r.titulo}"? Figuras e tabelas usadas só por ele também serão apagadas.`)) return;
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
App.acoes['rel-copiar'] = (el) => {
  const m = App.p.macroentregas[+el.dataset.mi], r = m.relatorios[+el.dataset.ri];
  if (!r || !r.blocos.length) return;
  m.blocos.push(...r.blocos.map((b) => Object.assign(Nucleo.clonar(b), { id: Nucleo.uid('bl') }))); // figuras e tabelas são compartilhadas (mesmo ref)
  App.marcarSujo(true); App.render();
  App.toast(`${r.blocos.length} bloco(s) copiado(s) para o fim do desenvolvimento da macroentrega. Ajuste o texto do relatório final lá.`, 'ok', 8000);
};
App.relCaminhoPdf = (mi, ri) => `relatorios/macroentrega_${String(mi + 1).padStart(2, '0')}_andamento_${String(ri + 1).padStart(2, '0')}.pdf`;
App.relNomePdf = (mi, ri) => `Macroentrega ${String(mi + 1).padStart(2, '0')} - relatório de andamento ${ri + 1} - ${Nucleo.nomeSeguro(App.p.projeto.nome)}.pdf`;
App.acoes['rel-pdf'] = async (el) => {
  const mi = +el.dataset.mi, ri = +el.dataset.ri, t = el.textContent;
  el.disabled = true; el.textContent = 'Gerando PDF…';
  try {
    const blob = await Pdf.gerar(await Pdf.relatorioIntermediario(App.p, mi, ri, App.arm));
    App.baixarBlob(blob, App.relNomePdf(mi, ri));
    try { await App.arm.gravarArquivo(App.relCaminhoPdf(mi, ri), blob); } catch (e) { /* opcional */ }
    App.p.macroentregas[mi].relatorios[ri].gerado = Nucleo.agoraIso();
    App.marcarSujo(true);
  } catch (e) { console.error(e); App.toast('PDF: ' + esc(e.message), 'erro', 9000); }
  finally { el.disabled = false; el.textContent = t; App.render(); }
};

// ================================================================== PDF
Pdf.relatorioIntermediario = async function (p, mi, ri, armazem) {
  const m = p.macroentregas[mi], r = m.relatorios[ri], n = mi + 1;
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
  c.push(...h1('Desenvolvimento', true));
  const bl = Pdf.blocos(p, vista, num, imgs, { base: '2', toc: { fig: null, tab: null } });
  c.push(...(bl.length ? bl : [{ text: 'Sem conteúdo: inclua blocos neste relatório.', style: 'muted' }]));
  const refs = Pdf.referenciasCitadas(p, num);
  if (refs.length) c.push(...h1('Referências'), ...refs);
  return Pdf.documento(p, 'RELATÓRIO DE', 'ANDAMENTO', `Relatório de andamento – Macroentrega ${n}`, c, `Macroentrega ${n} – ${m.titulo} · ${r.titulo} · período ${per}`);
};
