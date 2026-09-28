/* Aba Cronograma: EAP/WBS, Gantt (SVG gerado no servidor) e caminho crítico (CPM). */
'use strict';

App.abas.cronograma = {
  render() {
    return `<h2>Cronograma</h2>
<div class="info-box">As atividades são cadastradas dentro de cada macroentrega (aba Macroentregas). Aqui aparecem a EAP, o gráfico de Gantt e o caminho crítico calculado pelas dependências.</div>
<div class="cartao"><h3 style="margin-top:0">Gráfico de Gantt</h3><div id="ganttBox" class="gantt-box"><p class="vazio">Calculando…</p></div>
<p class="muted">Contorno escuro = caminho crítico · vermelho = atrasada · preenchimento = percentual concluído · linha tracejada = hoje.</p></div>
<div class="cartao"><h3 style="margin-top:0">EAP – Estrutura analítica do projeto</h3><div id="eapBox"></div></div>
<div class="cartao"><h3 style="margin-top:0">Caminho crítico (CPM)</h3><div id="cpmBox"></div></div>`;
  },
  analise() {
    const an = App.an;
    if (!an) return;
    $('#ganttBox').innerHTML = App.gantt;
    const porId = Object.fromEntries(an.atividades.map((a) => [a.id, a]));
    let eap = `<ul class="eap"><li><b>${esc(App.p.projeto.nome || 'Projeto')}</b> — ${an.percentualGeral}%<ul>`;
    App.p.macroentregas.forEach((m, i) => {
      const am = an.macroentregas[i];
      eap += `<li><b>${i + 1}. ${esc(m.titulo || '(sem título)')}</b> <span class="status ${esc(am.status)}">${esc(am.status)}</span> ${am.percentual}% · prevista ${dataBR(m.dataPrevista) || '—'}<ul>`;
      m.atividades.forEach((a) => {
        const x = porId[a.id] || {};
        eap += `<li class="${x.critica ? 'critica' : ''} ${x.atrasada ? 'atrasada' : ''}">${esc(x.codigo)} ${esc(a.nome || '(sem nome)')} — ${esc(a.responsavel || 'sem responsável')} · ${dataBR(a.inicio)} a ${dataBR(a.fim)} · ${x.percentual ?? 0}%${x.atrasada ? ' · <b>atrasada</b>' : ''}</li>`;
      });
      if (!m.atividades.length) eap += '<li class="muted">sem atividades</li>';
      eap += '</ul></li>';
    });
    $('#eapBox').innerHTML = eap + '</ul></li></ul>';

    let cpm = an.cpm.erro ? `<div class="alerta-box">${esc(an.cpm.erro)}</div>` : '';
    if (an.atividades.length && !an.cpm.erro) {
      cpm += `<p>Duração pela rede de dependências: <b>${an.cpm.duracao} dias</b>. Caminho crítico: <b>${esc(an.cpm.caminho.join(' → ') || '—')}</b></p>`;
      cpm += `<div class="rolagem"><table class="tab-edit"><thead><tr><th>Cód.</th><th>Atividade</th><th>Duração (d)</th><th>Depende de</th><th>ES</th><th>EF</th><th>LS</th><th>LF</th><th>Folga</th></tr></thead><tbody>`;
      an.atividades.forEach((a) => {
        const dep = a.dependeDe.map((d) => (porId[d] ? porId[d].codigo : '?')).join(', ');
        cpm += `<tr class="${a.critica ? 'critica' : ''}"><td>${esc(a.codigo)}</td><td>${a.critica ? '<b>' : ''}${esc(a.nome)}${a.critica ? '</b>' : ''}</td><td>${a.duracao}</td><td>${esc(dep)}</td><td>${a.es ?? ''}</td><td>${a.ef ?? ''}</td><td>${a.ls ?? ''}</td><td>${a.lf ?? ''}</td><td>${a.folga ?? ''}</td></tr>`;
      });
      cpm += '</tbody></table></div><p class="muted">ES/EF = início/fim mais cedo; LS/LF = início/fim mais tarde (em dias a partir do início da rede). Folga zero = atividade crítica.</p>';
    } else if (!an.atividades.length) cpm = '<p class="vazio">Sem atividades cadastradas.</p>';
    $('#cpmBox').innerHTML = cpm;
  },
};
