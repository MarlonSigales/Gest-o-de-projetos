/* Abas: Projeto, Equipe e Interessados, Áreas/Responsáveis, Qualidade, Lições aprendidas. */
'use strict';

// ------------------------------------------------------------------ PROJETO
App.abas.projeto = {
  render() {
    const c = App.campo;
    return `
<h2>${esc(App.p.projeto.nome || 'Novo projeto')}</h2>
<div id="painelKpi"></div>
<div class="cartao"><h3 style="margin-top:0">Identificação</h3><div class="grade-campos">
  ${c('projeto.nome', 'Nome do projeto *', { classe: 'largo' })}
  ${c('projeto.codigo', 'Código *', { ph: 'PINV-2210.0006' })}
  ${c('projeto.ano', 'Ano (capa dos relatórios)', { tipo: 'number' })}
  ${c('projeto.dataInicio', 'Início', { tipo: 'date' })}
  ${c('projeto.dataFimPrevista', 'Término previsto', { tipo: 'date' })}
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
<p class="muted">Dicas de texto: deixe uma linha em branco entre parágrafos; linhas iniciadas por "- " viram lista; <b>**negrito**</b>; cite figuras e tabelas com <span class="marcador">{{fig:fig_001}}</span> e <span class="marcador">{{tab:tab_001}}</span>.</p></div>`;
  },
  analise() {
    const an = App.an, el = $('#painelKpi');
    if (!el || !an) return;
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
<div class="cartao"><h3 style="margin-top:0">Interessados no andamento (recebem o e-mail a cada salvamento)</h3>
<p class="muted">Assunto do e-mail: <b>andamento projeto ${esc(App.p.projeto.nome || '<nome>')}</b>, com o JSON atualizado. Modo de envio atual: <b>${esc(App.descricaoModoEmail())}</b> (altere em ⚙ Configurações).</p>
${App.tabela('interessados', [
    { campo: 'nome', rotulo: 'Nome', largura: '30%' },
    { campo: 'email', rotulo: 'E-mail *', tipo: 'email', largura: '35%' },
    { campo: 'papel', rotulo: 'Papel (ex.: gestor, empresa)' },
  ], { novo: 'interessado', botao: 'Adicionar interessado', vazio: 'Cadastre ao menos um e-mail para poder salvar.' })}</div>`;
  },
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
App.abas.qualidade = {
  render() {
    let h = `<h2>Gestão da qualidade</h2>
<div class="cartao"><h3 style="margin-top:0">Requisitos, critérios de aceite e verificação</h3>
${App.tabela('qualidade', [
    { campo: 'requisito', rotulo: 'Requisito', tipo: 'textarea' },
    { campo: 'criterioAceite', rotulo: 'Critério de aceite', tipo: 'textarea' },
    { campo: 'metodoVerificacao', rotulo: 'Método de verificação', tipo: 'textarea' },
    { campo: 'status', rotulo: 'Situação', tipo: 'select', render: true, largura: '140px', opcoes: [['pendente', 'pendente'], ['conforme', 'conforme'], ['não conforme', 'não conforme']] },
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
    return h;
  },
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
