/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/* Abas: Projeto, Equipe e Interessados, Áreas/Responsáveis, Qualidade, Lições aprendidas. */
'use strict';

// ------------------------------------------------------------------ PROJETO
App.abas.projeto = {
  render() {
    const c = App.campo;
    return `
<h2>${esc(App.p.projeto.nome || 'Novo projeto')}</h2>
${App.guiaExemploHtml ? App.guiaExemploHtml() : ''}
<div class="cartao vigencia"><h3 style="margin-top:0">Vigência do projeto</h3><div class="grade-campos">
  ${c('projeto.dataInicio', 'Data de início', { tipo: 'date' })}
  ${c('projeto.dataFimPrevista', 'Data de término (original)', { tipo: 'date' })}
  <div id="vigResumo" class="vig-resumo"></div>
</div>
<h4>Termos aditivos e subtrativos de prazo</h4>
${App.tabela('projeto.aditivos', [
    { campo: 'tipo', rotulo: 'Tipo', tipo: 'select', largura: '130px', opcoes: [['aditivo', 'Aditivo (+)'], ['subtrativo', 'Subtrativo (−)']] },
    { campo: 'quantidade', rotulo: 'Quantidade', tipo: 'number', min: 0, largura: '100px' },
    { campo: 'unidade', rotulo: 'Unidade', tipo: 'select', largura: '100px', opcoes: [['meses', 'meses'], ['dias', 'dias']] },
    { campo: 'numero', rotulo: 'Nº do termo', largura: '120px' },
    { campo: 'dataTermo', rotulo: 'Data do termo', tipo: 'date', largura: '150px' },
    { campo: 'justificativa', rotulo: 'Justificativa', tipo: 'textarea' },
  ], { novo: 'aditivo', botao: 'Adicionar termo aditivo/subtrativo', vazio: 'Nenhum termo: vale a data de término original.' })}
</div>
<div id="painelKpi"></div>
<div class="cartao"><h3 style="margin-top:0">Identificação</h3><div class="grade-campos">
  ${c('projeto.nome', 'Nome do projeto *', { classe: 'largo' })}
  ${c('projeto.codigo', 'Código *', { ph: 'PINV-2210.0006' })}
  ${c('projeto.ano', 'Ano (capa dos relatórios)', { tipo: 'number' })}
  ${c('projeto.unidadeEmbrapii', 'Unidade EMBRAPII', { classe: 'largo' })}
  ${c('projeto.empresaParceira', 'Empresa parceira')}
  ${c('projeto.responsavelEmpresa', 'Responsável na empresa (assina o aceite)')}
  ${c('projeto.endereco', 'Endereço (capa)', { classe: 'largo' })}
  ${c('projeto.trlEsperadoFinal', 'TRL esperado ao final do projeto', { tipo: 'select', opcoes: App.opcoesTrl })}
</div></div>
<div class="cartao"><h3 style="margin-top:0">Coordenação</h3><div class="grade-campos">
  ${c('projeto.coordenador.nome', 'Coordenador')}
  ${c('projeto.coordenador.email', 'E-mail do coordenador', { tipo: 'email' })}
  ${c('projeto.coordenadorAdjunto.nome', 'Coordenador adjunto')}
  ${c('projeto.coordenadorAdjunto.email', 'E-mail do coordenador adjunto', { tipo: 'email' })}
</div></div>
<div class="cartao"><h3 style="margin-top:0">Textos comuns a todos os relatórios</h3><div class="grade-campos">
  ${c('projeto.introducao', 'Introdução (contextualização do projeto)', { tipo: 'textarea', classe: 'largo', linhas: 7 })}
  ${c('projeto.objetivoGeral', 'Objetivo geral do projeto', { tipo: 'textarea', classe: 'largo', linhas: 4 })}
</div>
<p class="muted">Dicas de texto: deixe uma linha em branco entre parágrafos; linhas iniciadas por "- " ou "1. " viram lista; "# " vira título; <b>**negrito**</b>; <i>*itálico*</i>; cite figuras e tabelas com <span class="marcador">{{fig:fig_001}}</span> e <span class="marcador">{{tab:tab_001}}</span>.</p></div>`;
  },
  analise() {
    const an = App.an, el = $('#painelKpi');
    if (!el || !an) return;
    const v = an.vigencia, vr = $('#vigResumo');
    if (vr) {
      const sinal = v.variacaoDias > 0 ? '+' : '';
      vr.innerHTML = `<div class="r">Término vigente</div><div class="v">${v.fimVigente ? dataBR(v.fimVigente) : '—'}</div>
        <div class="r">${v.inicio ? 'de ' + dataBR(v.inicio) : ''}${v.duracaoDias !== null ? ' · ' + v.duracaoDias + ' dias' : ''}${v.termos.length ? ` · ${v.nAditivos} aditivo(s), ${v.nSubtrativos} subtrativo(s) (${sinal}${v.variacaoDias ?? 0} dias)` : ''}${v.restamDias !== null ? ` · ${v.restamDias >= 0 ? 'restam ' + v.restamDias + ' dias' : '<b class="gap-neg">encerrada</b>'}` : ''}</div>`;
      $$('#conteudo .vigencia tbody tr').forEach((tr, k) => {
        const t = v.termos[k];
        const td = tr.querySelector('td:last-child');
        if (t && td && !td.querySelector('.vig-fim')) td.insertAdjacentHTML('afterbegin', `<div class="vig-fim muted" title="término após este termo">→ ${dataBR(t.fimDepois)}</div>`);
        else if (t && td) td.querySelector('.vig-fim').textContent = '→ ' + dataBR(t.fimDepois);
      });
    }
    const t = an.trl;
    el.innerHTML = `<div class="kpis">
      <div class="kpi"><div class="r">Percentual geral</div><div class="v">${an.percentualGeral}%</div><div class="barra-prog"><i style="width:${an.percentualGeral}%"></i></div></div>
      <div class="kpi"><div class="r">Macroentregas</div><div class="v">${an.macroentregas.length}</div><div class="r">${an.macroentregas.filter((m) => m.aceito).length} aceita(s)</div></div>
      <div class="kpi ${t.sistema !== null && t.esperadoEtapa && t.sistema < t.esperadoEtapa ? 'alerta' : ''}"><div class="r">TRL atual do sistema</div><div class="v">${t.sistema ?? '—'}</div><div class="r">esperado na etapa: ${t.esperadoEtapa ?? '—'} · final: ${t.esperadoFinal ?? '—'}</div></div>
      <div class="kpi ${an.riscosAltos.length ? 'alerta' : ''}"><div class="r">Riscos altos em aberto</div><div class="v">${an.riscosAltos.length}</div></div>
    </div>` + an.alertas.map((a) => `<div class="alerta-box">${esc(a)}</div>`).join('')
      + (t.pontosVerificacao.length ? `<div class="aviso-box"><b>Ponto de verificação (TRL mais baixo):</b> ${t.pontosVerificacao.map((p) => `${esc(p.nome)} (TRL ${p.trlAtual}) — cobrar ${esc(p.cobrar.map((r) => r.nome).join(', '))}`).join('; ')}</div>` : '');
  },
};

// ------------------------------------------------------------------ EQUIPE E INTERESSADOS
App.abas.equipe = {
  depois() { const el = $('#destResumo'); if (el) el.innerHTML = App.resumoDestinatarios(); },
  analise() { const el = $('#destResumo'); if (el) el.innerHTML = App.resumoDestinatarios(); },
  render() {
    return `<h2>Equipe e interessados</h2>
<div class="cartao"><h3 style="margin-top:0">Equipe do projeto</h3>
<p class="muted">Aparece na página "Equipe" dos relatórios. Coordenador e coordenador adjunto ficam na aba Projeto.</p>
${App.tabela('projeto.equipe', [
    { campo: 'nome', rotulo: 'Nome', largura: '24%' },
    { campo: 'email', rotulo: 'E-mail', tipo: 'email', largura: '24%' },
    { campo: 'funcao', rotulo: 'Função', largura: '20%' },
    { campo: 'areas', rotulo: 'Áreas', tipo: 'multi', opcoes: App.opcoesAreas(false) },
  ], { novo: 'membro', botao: 'Adicionar membro', vazio: 'Nenhum membro cadastrado.' })}</div>
<div class="cartao"><h3 style="margin-top:0">Grupos de e-mail</h3>
<p class="muted">Grupos marcados como <b>gestão</b> recebem o <b>ZIP completo</b> do projeto; os demais recebem <b>os PDFs e o JSON</b>. Quem estiver em gestão e em outro grupo recebe <b>apenas como gestão</b>.</p>
${App.tabela('gruposEmail', [
    { campo: 'nome', rotulo: 'Nome do grupo' },
    { campo: 'gestao', rotulo: 'Gestão (recebe ZIP completo)', tipo: 'checkbox', render: true, largura: '220px' },
  ], { novo: 'grupo', botao: 'Adicionar grupo' })}</div>
<div class="cartao"><h3 style="margin-top:0">Interessados no andamento (recebem o e-mail a cada salvamento)</h3>
<p class="muted">Assunto: <b>andamento projeto ${esc(App.p.projeto.nome || '<nome>')}</b>. Modo de envio: <b>${esc(App.descricaoModoEmail())}</b> (⚙ Configurações).</p>
${App.tabelaInteressados()}
<div id="destResumo"></div></div>`;
  },
};

App.tabelaInteressados = function () {
  const gs = App.p.gruposEmail;
  let h = `<div class="rolagem"><table class="tab-edit"><thead><tr><th style="width:22%">Nome</th><th style="width:26%">E-mail *</th><th style="width:16%">Papel</th><th>Grupos</th><th class="acoes"></th></tr></thead><tbody>`;
  if (!App.p.interessados.length) h += '<tr><td colspan="5" class="vazio">Cadastre ao menos um e-mail para poder salvar.</td></tr>';
  App.p.interessados.forEach((it, i) => {
    h += `<tr><td>${App.campo(`interessados.${i}.nome`, '')}</td><td>${App.campo(`interessados.${i}.email`, '', { tipo: 'email' })}</td><td>${App.campo(`interessados.${i}.papel`, '')}</td>
      <td><div class="barra" style="margin:0">${gs.map((g) => `<label class="chk ${it.grupos.includes(g.id) ? 'on' : ''}"><input type="checkbox" data-acao="grupo-toggle" data-i="${i}" data-g="${esc(g.id)}" ${it.grupos.includes(g.id) ? 'checked' : ''}> ${esc(g.nome || g.id)}${g.gestao ? ' ★' : ''}</label>`).join('')}</div></td>
      <td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="interessados" data-i="${i}">✕</button></td></tr>`;
  });
  return h + `</tbody></table></div><div class="barra"><button class="btn pequeno" data-acao="add-linha" data-lista="interessados" data-novo="interessado">+ Adicionar interessado</button><span class="muted">★ = grupo de gestão</span></div>`;
};
App.acoes['grupo-toggle'] = (el) => {
  const it = App.p.interessados[+el.dataset.i];
  const g = el.dataset.g;
  it.grupos = it.grupos.includes(g) ? it.grupos.filter((x) => x !== g) : it.grupos.concat(g);
  App.marcarSujo(true); App.render();
};
App.resumoDestinatarios = function () {
  const d = Nucleo.destinatarios(App.p);
  const li = (l) => l.map((r) => `<li>${esc(r.nome ? r.nome + ' <' + r.email + '>' : r.email)}</li>`).join('') || '<li class="muted">ninguém</li>';
  return `<div class="grade-campos" style="margin-top:10px"><div class="ok-box"><b>Gestão — recebe o ZIP completo</b><ul>${li(d.gestao)}</ul></div>
    <div class="info-box" style="margin:6px 0"><b>Demais — recebem os PDFs e o JSON</b><ul>${li(d.demais)}</ul></div></div>`;
};

// ------------------------------------------------------------------ ÁREAS / RESPONSÁVEIS
App.nosTrl = function () {
  const out = [];
  const rec = (nos, nivel) => (nos || []).forEach((n) => { out.push({ chave: n.chave, titulo: n.titulo, nivel, tipo: n.tipo }); rec(n.filhos, nivel + 1); });
  rec(App.p.trl.arvore, 0);
  return out;
};
App.nomeTipo = { product: 'Produto', subsystem: 'Subsistema', assembly: 'Montagem', component: 'Componente' };

App.abas.areas = {
  render() {
    const nos = App.nosTrl();
    const opNos = [['', nos.length ? '— selecione o item da estrutura TRL —' : '— importe a avaliação na aba TRL —']]
      .concat(nos.map((n) => [n.chave, ' '.repeat(n.nivel) + `${n.titulo} (${App.nomeTipo[n.tipo] || n.tipo})`]));
    let h = `<h2>Áreas técnicas e responsáveis</h2>
<div class="info-box">Cada área é vinculada a um item da estrutura avaliada (produto, subsistema, montagem ou componente). O TRL atual da área é o do item vinculado; os responsáveis aparecem nos relatórios e no e-mail como <b>quem deve ser cobrado</b> quando a área tiver o TRL mais baixo.</div>`;
    if (!App.p.areas.length) h += '<p class="vazio">Nenhuma área cadastrada.</p>';
    App.p.areas.forEach((a, i) => {
      const inf = App.an ? App.an.trl.areas.find((x) => x.id === a.id) : null;
      h += `<div class="cartao"><div class="barra" style="justify-content:space-between;margin-top:0"><h3 style="margin:0">${esc(a.id)} · ${esc(a.nome || 'Nova área')}</h3>
      <span id="trlArea_${esc(a.id)}">${inf ? `atual ${App.trlBadge(inf.trlAtual)} · esperado ${inf.trlEsperado ?? '—'}` : ''}</span>
      <button class="btn pequeno perigo" data-acao="rem-linha" data-lista="areas" data-i="${i}">Remover área</button></div>
      <div class="grade-campos">
        ${App.campo(`areas.${i}.nome`, 'Nome da área')}
        <label class="campo largo">Item da estrutura TRL vinculado<select class="sel-no" data-path="areas.${i}.noImatec" data-tipo="select" data-render="1">${App.opcoes(opNos, a.noImatec)}</select>
          ${a.vinculoPerdido ? '<span class="gap-neg">O item vinculado não existe mais na última avaliação importada — selecione novamente.</span>' : ''}</label>
        ${App.campo(`areas.${i}.trlEsperado`, 'TRL esperado para a área', { tipo: 'select', opcoes: App.opcoesTrl })}
      </div>
      <h4>Responsáveis (um ou mais)</h4>
      ${App.tabela(`areas.${i}.responsaveis`, [{ campo: 'nome', rotulo: 'Nome' }, { campo: 'email', rotulo: 'E-mail', tipo: 'email' }], { novo: 'pessoa', botao: 'Adicionar responsável', vazio: 'Sem responsável: a cobrança vai para a coordenação.' })}
      </div>`;
    });
    h += `<div class="barra"><button class="btn primario" data-acao="add-linha" data-lista="areas" data-novo="area">+ Nova área</button></div>`;
    return h;
  },
  depois() {
    $$('.sel-no').forEach((s) => s.addEventListener('change', () => {
      const i = s.dataset.path.split('.')[1];
      const no = App.nosTrl().find((n) => n.chave === s.value);
      App.p.areas[i].noImatecTitulo = no ? no.titulo : '';
      delete App.p.areas[i].vinculoPerdido;
    }));
  },
  analise() {
    (App.an.trl.areas || []).forEach((inf) => {
      const el = document.getElementById('trlArea_' + inf.id);
      if (el) el.innerHTML = `atual ${App.trlBadge(inf.trlAtual)} · esperado ${inf.trlEsperado ?? '—'}`;
    });
  },
};

// ------------------------------------------------------------------ QUALIDADE
App.qfdPedido = false; // pedido do JSON do QFD já mostrado nesta sessão (por projeto)
App.abas.qualidade = {
  render() {
    const o = App.p.qfdOrigem || {};
    const nQfd = App.p.qualidade.filter((q) => q.qfd && q.qfd.id && !q.qfd.removidoDoQfd).length;
    let h = `<h2>Gestão da qualidade</h2>
<div class="cartao ${o.importadoEm ? '' : 'qfd-pedido'}"><h3 style="margin-top:0">Especificações do QFD</h3>
  <p>Os critérios de qualidade são as <b>especificações de projeto</b>, obtidas com o QFD no <b>projeto informacional</b> (aba Projeto de produto/serviço). O <b>backup completo (JSON)</b> do sistema QFD traz: requisitos de projeto na ordem de importância, valor-meta com o sentido de melhoria, forma de avaliação, aspectos indesejáveis e o valor medido do produto. A situação é calculada como no QFD: atingida ⇒ conforme; não atingida ⇒ não conforme; sem medição ⇒ pendente.</p>
  <div class="barra"><button class="btn ${o.importadoEm ? '' : 'primario'}" data-acao="ir-aba" data-aba="produto" data-etapa="informacional">🛠 Ir ao projeto informacional (QFD)</button>
  <label class="btn">⬆ ${o.importadoEm ? 'Reimportar' : 'Importar'} JSON do QFD<input type="file" accept=".json,.zip,application/json,application/zip" hidden id="arqQfd"></label>
  <span class="muted">${o.importadoEm ? `Última importação: ${esc(o.importadoEm.replace('T', ' ').slice(0, 16))} · ${esc(o.arquivo)} · ${nQfd} requisito(s) de projeto` : '<b class="gap-neg">Nenhum QFD importado neste projeto.</b>'}</span></div>
  <p class="muted">Na reimportação, os requisitos são atualizados pelo identificador do QFD; o PDCA e os requisitos cadastrados à mão são mantidos, e a situação só muda quando o QFD traz medição.</p></div>
<div class="cartao"><h3 style="margin-top:0">Requisitos, critérios de aceite e verificação</h3>
${App.tabela('qualidade', [
    { campo: 'requisito', rotulo: 'Requisito', tipo: 'textarea' },
    { campo: 'criterioAceite', rotulo: 'Critério de aceite (meta)', tipo: 'textarea', largura: '14%' },
    { campo: 'metodoVerificacao', rotulo: 'Forma de avaliação', tipo: 'textarea' },
    { campo: 'aspectosIndesejaveis', rotulo: 'Aspectos indesejáveis', tipo: 'textarea' },
    { campo: 'valorMedido', rotulo: 'Medido', largura: '90px' },
    { campo: 'status', rotulo: 'Situação', tipo: 'select', render: true, largura: '130px', opcoes: [['pendente', 'pendente'], ['conforme', 'conforme'], ['não conforme', 'não conforme']] },
  ], { novo: 'qualidade', botao: 'Adicionar requisito' })}</div>`;
    const nc = App.p.qualidade.map((q, i) => [q, i]).filter(([q]) => q.status === 'não conforme');
    if (nc.length) {
      h += '<div class="cartao"><h3 style="margin-top:0">Tratamento de não conformidades (ciclo PDCA)</h3>';
      nc.forEach(([q, i]) => {
        q.pdca ??= { planejar: '', executar: '', verificar: '', agir: '' };
        h += `<h4>${esc(q.requisito || 'Requisito ' + (i + 1))}</h4><div class="grade-campos">
          ${App.campo(`qualidade.${i}.pdca.planejar`, 'P – Planejar (causa e ação)', { tipo: 'textarea', linhas: 3 })}
          ${App.campo(`qualidade.${i}.pdca.executar`, 'D – Executar', { tipo: 'textarea', linhas: 3 })}
          ${App.campo(`qualidade.${i}.pdca.verificar`, 'C – Verificar', { tipo: 'textarea', linhas: 3 })}
          ${App.campo(`qualidade.${i}.pdca.agir`, 'A – Agir (padronizar)', { tipo: 'textarea', linhas: 3 })}</div>`;
      });
      h += '</div>';
    }
    return h + App.dfxHtml();
  },
};

// ------------------------------------------------------------------ DfX (Pahl & Beitz)
App.dfxHtml = function () {
  const d = App.p.dfx;
  const trl = App.an ? App.an.trl.sistema : null;
  const condSug = dfxCondicaoPorTrl(trl);
  const cond = d.condicaoTeste || '';
  const nUsar = d.itens.filter((i) => i.decisao === 'usar').length, nNeg = d.itens.filter((i) => i.decisao === 'negligenciar').length;
  let h = `<div class="cartao"><h3 style="margin-top:0">Design for X (DfX) — diretrizes de Pahl &amp; Beitz</h3>
  <p class="muted">Marque o que <b>será usado</b> ou <b>negligenciado</b> nesta fase, conforme o TRL e a condição de teste. Em cada diretriz, marque as recomendações que serão aplicadas. Tudo fica salvo no JSON.
  Referência: Pahl, Beitz, Feldhusen e Grote, <i>Engineering Design: A Systematic Approach</i>, 3. ed., Springer, 2007.</p>
  <div class="grade-campos">
    <label class="campo">TRL atual do sistema<input disabled value="${trl ?? 'não avaliado'}"></label>
    ${App.campo('dfx.condicaoTeste', 'Condição de teste atual', { tipo: 'select', render: true, opcoes: [['', condSug ? '— sugerida pelo TRL: ' + DFX_CONDICOES.find(([v]) => v === condSug)[1] + ' —' : '—']].concat(DFX_CONDICOES) })}
  </div>
  <div class="barra"><button class="btn" data-acao="dfx-sugerir">Aplicar sugestões às diretrizes ainda não decididas</button>
    <button class="btn" data-acao="dfx-add">+ DfX personalizado</button>
    <span class="muted">${nUsar} a usar · ${nNeg} negligenciada(s) · ${d.itens.length - nUsar - nNeg} pendente(s)</span></div>`;
  d.itens.forEach((it, i) => {
    const sug = dfxSugestao(it, trl, cond || condSug);
    const b = `dfx.itens.${i}`;
    const cls = it.decisao === 'usar' ? 'dfx-usar' : it.decisao === 'negligenciar' ? 'dfx-neg' : '';
    h += `<div class="dfx-card ${cls}">
      <div class="dfx-topo">
        <div class="dfx-nome">${it.personalizado ? App.campo(b + '.nome', '', { ph: 'Nome do DfX' }) : '<b>' + esc(it.nome) + '</b>'}
          <div class="muted">${esc(it.ref)} · exigida a partir do TRL ${esc(it.trlMin)} · teste mínimo: ${esc((DFX_CONDICOES[it.condicaoMin] || DFX_CONDICOES[0])[1])}</div></div>
        <div class="dfx-decisao">
          <label class="chk ${it.decisao === 'usar' ? 'on' : ''}"><input type="checkbox" data-acao="dfx-decidir" data-i="${i}" data-d="usar" ${it.decisao === 'usar' ? 'checked' : ''}> Usar</label>
          <label class="chk neg ${it.decisao === 'negligenciar' ? 'on' : ''}"><input type="checkbox" data-acao="dfx-decidir" data-i="${i}" data-d="negligenciar" ${it.decisao === 'negligenciar' ? 'checked' : ''}> Negligenciar</label>
          <span class="muted">sugestão: <b>${esc(sug.decisao || '—')}</b> (${esc(sug.motivo)})</span>
          ${it.personalizado ? `<button class="btn pequeno perigo" data-acao="rem-linha" data-lista="dfx.itens" data-i="${i}">✕</button>` : ''}
        </div>
      </div>
      <div class="dfx-recs">${it.recomendacoes.map((r, k) => it.personalizado
        ? `<div class="barra" style="margin:2px 0">${App.campo(`${b}.recomendacoes.${k}.marcado`, '', { tipo: 'checkbox' })}${App.campo(`${b}.recomendacoes.${k}.texto`, '', { ph: 'Recomendação' })}<button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${b}.recomendacoes" data-i="${k}">✕</button></div>`
        : App.campo(`${b}.recomendacoes.${k}.marcado`, r.texto, { tipo: 'checkbox', classe: 'rec' })).join('')}
        ${it.personalizado ? `<button class="btn pequeno" data-acao="add-linha" data-lista="${b}.recomendacoes" data-novo="recDfx">+ recomendação</button>` : ''}
      </div>
      ${it.personalizado ? `<div class="grade-campos">${App.campo(b + '.trlMin', 'Exigida a partir do TRL', { tipo: 'select', opcoes: App.opcoesTrl })}${App.campo(b + '.condicaoMin', 'Teste mínimo', { tipo: 'select', opcoes: DFX_CONDICOES.map(([, r], k) => [k, r]) })}</div>` : ''}
      ${App.campo(b + '.justificativa', it.decisao === 'negligenciar' ? 'Justificativa para negligenciar (TRL / condição de teste)' : 'Observações / justificativa', { tipo: 'textarea', linhas: 2 })}
    </div>`;
  });
  return h + '</div>';
};

App.abas.qualidade.depois = function () {
  const inp = $('#arqQfd');
  if (inp) inp.addEventListener('change', (ev) => { const f = ev.target.files[0]; if (f) App.importarQfd(f); ev.target.value = ''; });
};

/** Abre o sistema QFD em outra aba; ao voltar para esta, pede o backup JSON. */
App.qfdAguardando = false;
App.pedirJsonQfd = function () {
  App.modal(`<h2>Importar o JSON do QFD</h2>
    <p>Terminou o QFD? Exporte o <b>backup completo (JSON)</b> no sistema QFD (botão “Backup”) e selecione o arquivo aqui.
    As especificações passam a ser os critérios de qualidade deste projeto.</p>
    <div class="barra"><label class="btn primario">Selecionar JSON do QFD<input type="file" accept=".json,.zip,application/json,application/zip" hidden id="arqQfdVolta"></label>
    <button class="btn" data-acao="qfd-abrir">↗ Voltar ao sistema QFD</button>
    <button class="btn" data-acao="qfd-depois">Importar depois</button></div>`);
  $('#arqQfdVolta').addEventListener('change', (ev) => { const f = ev.target.files[0]; if (f) { App.qfdAguardando = false; App.importarQfd(f); } });
};
App.acoes['qfd-abrir'] = () => {
  const w = window.open(CONFIG.urlQfd, '_blank');
  App.qfdAguardando = true;
  if (!w) { App.toast(`O navegador bloqueou a nova aba. Abra: <a href="${esc(CONFIG.urlQfd)}" target="_blank" rel="noopener">${esc(CONFIG.urlQfd)}</a>`, 'aviso', 15000); }
  App.pedirJsonQfd();
};
App.acoes['qfd-depois'] = () => { App.qfdAguardando = false; App.fecharModal(); App.toast('Quando tiver o backup do QFD, importe-o na aba Qualidade / DfX.', 'aviso', 7000); };
// ao voltar da aba do QFD, reapresenta o pedido do JSON
const qfdVoltou = () => { if (App.qfdAguardando && document.visibilityState === 'visible' && App.p && !$('#arqQfdVolta')) App.pedirJsonQfd(); };
document.addEventListener('visibilitychange', qfdVoltou);
window.addEventListener('focus', qfdVoltou);

App.importarQfd = async function (arquivo) {
  try {
    let texto;
    if (/\.zip$/i.test(arquivo.name)) {
      const z = await JSZip.loadAsync(arquivo);
      const cands = Object.keys(z.files).filter((n) => /\.json$/i.test(n) && !z.files[n].dir);
      let achou = null;
      for (const n of cands) { const t = await z.file(n).async('string'); try { const d = JSON.parse(t); if (d && Array.isArray(d.requisitosProjeto)) { achou = t; break; } } catch (e) { /* ignora */ } }
      if (!achou) throw new Error('O ZIP não contém o backup JSON do QFD.');
      texto = achou;
    } else texto = await arquivo.text();
    let dados;
    try { dados = JSON.parse(texto.replace(/^\uFEFF/, '')); } catch (e) { throw new Error('O arquivo não é um JSON válido.'); }
    const r = Nucleo.importarQfd(dados);
    const m = Nucleo.mesclarQfd(App.p.qualidade, r.itens);
    const quando = Nucleo.agoraIso();
    const arqGuardado = `qfd/qfd_${quando.replace('T', '_').replace(/:/g, '')}.json`;
    await App.arm.gravarArquivo(arqGuardado, new Blob([texto], { type: 'application/json' }));
    App.p.qualidade = m.itens;
    const primeiraVez = !App.p.qfdDados;
    App.p.qfdDados = dados; // backup completo: relatório da casa da qualidade nas macroentregas e no relatório geral
    let sugeridas = 0;
    if (primeiraVez && window.Qfd) { // sugestão: as macroentregas do projeto informacional recebem tudo o que o QFD tem
      const a = Qfd.analisar(dados), disp = Qfd.SECOES.map(([s]) => s).filter((s) => Qfd.disponivel(a, s).ok);
      (App.p.produto ? App.p.produto.etapas.informacional.macros : []).forEach((uid) => {
        const mm = App.p.macroentregas.find((x) => x.uid === uid);
        if (mm && !App.qfdBlocoDaMacro(mm)) { disp.forEach((s) => App.qfdAlternar(uid, s, true)); sugeridas++; }
      });
    }
    if (App.p.produto) { const inf = App.p.produto.etapas.informacional; if (r.clientes.length) inf.necessidades = r.clientes.map((c) => Object.assign(c, { peso: Math.round(c.peso * 1e4) / 1e4, origem: 'QFD' })); inf.recomendacoes.inf_qfd = true; if (inf.status === 'não iniciada') inf.status = 'em andamento'; }
    App.p.qfdOrigem = { arquivo: arquivo.name, guardadoEm: arqGuardado, importadoEm: quando, requisitosProjeto: r.meta.requisitosProjeto, requisitosCliente: r.meta.requisitosCliente, schemaVersion: r.meta.schemaVersion };
    App.p.log.push({ dataHora: quando, acao: `QFD importado (${arquivo.name}): ${r.itens.length} requisito(s) de projeto`, usuario: App.cfg.usuario || '' });
    App.qfdAguardando = false;
    App.fecharModal(); App.marcarSujo(true); App.render(); App.agendarAnalise();
    App.toast(`QFD importado: ${r.itens.length} requisito(s) de projeto${m.removidos ? `, ${m.removidos} não existe(m) mais no QFD (mantidos e marcados)` : ''}${m.manuais ? `, ${m.manuais} manual(is) mantido(s)` : ''}. Salve para gravar no JSON.`, 'ok', 9000);
    if (r.avisos.length) App.toast(r.avisos.map(esc).join('<br>'), 'aviso', 10000);
    App.toast(sugeridas ? `O relatório do QFD foi incluído na(s) ${sugeridas} macroentrega(s) do projeto informacional. Ajuste as seções no projeto informacional.`
      : 'Escolha no projeto informacional (cartão “Relatório do QFD nas macroentregas”) o que do QFD entra em cada macroentrega.', 'aviso', 9000);
  } catch (e) { App.toast('QFD: ' + esc(e.message), 'erro', 9000); }
};

App.novos.recDfx = () => ({ texto: '', marcado: true });
App.acoes['dfx-decidir'] = (el, ev) => {
  const it = App.p.dfx.itens[+el.dataset.i];
  it.decisao = it.decisao === el.dataset.d ? '' : el.dataset.d;
  App.marcarSujo(true); App.render(); App.agendarAnalise();
};
App.acoes['dfx-sugerir'] = () => {
  const trl = App.an ? App.an.trl.sistema : null;
  const cond = App.p.dfx.condicaoTeste || dfxCondicaoPorTrl(trl);
  let n = 0;
  App.p.dfx.itens.forEach((it) => {
    if (it.decisao) return;
    const s = dfxSugestao(it, trl, cond);
    if (!s.decisao) return;
    it.decisao = s.decisao; n++;
    if (!it.justificativa) it.justificativa = 'Sugestão automática: ' + s.motivo + '.';
    if (s.decisao === 'usar') it.recomendacoes.forEach((r) => { r.marcado = true; });
  });
  App.marcarSujo(true); App.render(); App.agendarAnalise();
  App.toast(n ? `${n} diretriz(es) decididas pela sugestão. Revise antes de salvar.` : 'Nenhuma diretriz pendente com sugestão (importe o TRL para ter sugestões).');
};
App.acoes['dfx-add'] = () => {
  App.p.dfx.itens.push({ id: Nucleo.uid('dfx'), nome: '', ref: 'Definido pela equipe', trlMin: 4, condicaoMin: 0, decisao: '', justificativa: '', personalizado: true, recomendacoes: [{ texto: '', marcado: true }] });
  App.marcarSujo(true); App.render();
};

// ------------------------------------------------------------------ LIÇÕES APRENDIDAS
App.abas.licoes = {
  render() {
    return `<h2>Lições aprendidas</h2><div class="cartao">
${App.tabela('licoesAprendidas', [
    { campo: 'data', rotulo: 'Data', tipo: 'date', largura: '140px' },
    { campo: 'macroUid', rotulo: 'Macroentrega', tipo: 'select', opcoes: App.opcoesMacros(), largura: '200px' },
    { campo: 'descricao', rotulo: 'O que aconteceu / lição', tipo: 'textarea' },
    { campo: 'recomendacao', rotulo: 'Recomendação', tipo: 'textarea' },
  ], { novo: 'licao', botao: 'Adicionar lição' })}</div>`;
  },
};
