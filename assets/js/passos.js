/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/**
 * Fases finais do projeto de produto em PASSOS (todoQA 79): Projeto detalhado, Preparação da produção, Lançamento e
 * Validação. No lugar de "Entrada da fase / Importar resultado do aplicativo", passos numerados na ordem do trabalho,
 * com "Documentos da fase" no passo em que os arquivos são produzidos. Cada passo preenchido marca sozinho a
 * recomendação da fase correspondente (nedip.js).
 */
(function () {
  'use strict';
  const txt = (x) => String(x ?? '').trim();
  const cartaoPasso = (n, id, titulo, corpo, prox) => `<div class="cartao passo" id="passo-${id}"><h3 style="margin-top:0">${n}. ${titulo}</h3>${corpo}
    ${prox ? `<div class="passo-prox"><a href="#" data-acao="passo-ir" data-id="${prox[0]}">Próximo: ${esc(prox[1])} ↓</a></div>` : ''}</div>`;
  App.acoes['passo-ir'] = (el, ev) => { if (ev) ev.preventDefault(); const c = document.getElementById('passo-' + el.dataset.id); if (c) window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - 66, behavior: 'smooth' }); };

  /** Marca sozinha a recomendação quando o passo tem conteúdo (não desmarca o que a equipe marcou). */
  function marcar(e, rec, cheio) { if (cheio && e.recomendacoes && rec in e.recomendacoes && !e.recomendacoes[rec]) { e.recomendacoes[rec] = true; App.marcarSujo(true); } }
  const temAnexo = (e, re) => (e.anexos || []).some((a) => re.test(a.nome + ' ' + (a.descricao || '')));
  const docs = (e, b, id) => App.nedipAnexosHtml({ id }, e, b).replace(/^<div class="cartao">/, '').replace(/<\/div>\s*$/, '').replace(/<h3[^>]*>[\s\S]*?<\/h3>/, '');
  const linkQualidade = '<button class="btn pequeno" data-acao="ir-aba" data-aba="qualidade">✅ Qualidade / DfX (valor medido e situação)</button>';

  const FASES = {
    detalhado(e, b, servico) {
      const c = App.campo, pre = App.p.produto.etapas.preliminar, m = e.manuais;
      const P = [];
      P.push(['desenhos', 'Desenhos e documentos de fabricação', `<p class="muted" style="margin-top:0">Peças e conjuntos com tolerâncias, materiais e acabamentos. Suba os desenhos, o CAD e as planilhas em <b>Documentos da fase</b> (próximo passo).</p>
        ${c(b + '.desenhos', 'Lista de desenhos e observações', { tipo: 'textarea', linhas: 3, ph: 'ex.: D-01 aro (tolerâncias ISO 2768-m), D-02 cubo, D-03 conjunto' })}`, ['det_des'], () => txt(e.desenhos) || temAnexo(e, /desenh|cad|dwg|step|pdf/i)]);
      P.push(['docs', 'Documentos da fase', docs(e, b, 'detalhado'), ['det_docs'], () => (e.anexos || []).length > 0, true]);
      if (ferr(e, 'bom')) P.push(['bom', servico ? 'Lista de materiais e recursos' : 'Lista de materiais', `<p class="muted" style="margin-top:0">Itens fabricados e comprados.${(pre.prototipos || []).length ? ' Use as peças do leiaute definitivo do projeto preliminar.' : ''}</p>` + App.tabela(b + '.bom', [{ campo: 'item', rotulo: 'Item', largura: '70px' }, { campo: 'descricao', rotulo: 'Descrição' }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'number', min: 0, largura: '80px' },
        { campo: 'unidade', rotulo: 'Un.', largura: '60px' }, { campo: 'material', rotulo: 'Material / especificação' },
        { campo: 'origem', rotulo: 'Origem', tipo: 'select', largura: '130px', opcoes: [['fabricado', 'fabricado'], ['comprado', 'comprado'], ['terceirizado', 'terceirizado']] },
        { campo: 'fornecedor', rotulo: 'Fornecedor' }], { novo: 'bom', botao: 'Adicionar item', vazio: 'Nenhum item.' }), ['det_bom'], () => (e.bom || []).length > 0]);
      P.push(['planos', 'Planos de fabricação, montagem e controle de qualidade', c(b + '.planos', 'Roteiro por peça, sequência de montagem e plano de controle (o que medir, como e quando)', { tipo: 'textarea', linhas: 4 }), ['det_fab'], () => txt(e.planos)]);
      P.push(['proto', 'Ensaio do protótipo final', `${c(b + '.protoFinal', 'Protótipo final: o que foi ensaiado e o resultado', { tipo: 'textarea', linhas: 3 })}<p class="muted">Os valores medidos de cada especificação vão na Qualidade. ${linkQualidade}</p>`, ['det_proto'], () => txt(e.protoFinal)]);
      P.push(['pi', 'Proteção intelectual', `${c(b + '.pi', 'Busca de anterioridade e decisão (patente, modelo de utilidade, desenho industrial, software, segredo)', { tipo: 'textarea', linhas: 3 })}
        <div class="barra"><button class="btn pequeno" data-acao="ir-aba" data-aba="pesquisa">📚 Pesquisa (patentes e referências)</button></div>`, ['det_pi'], () => txt(e.pi)]);
      if (ferr(e, 'manualUso')) P.push(['uso', 'Conteúdo do manual de uso', `<p class="muted" style="margin-top:0">As especificações técnicas (metas e valores medidos) entram automaticamente.</p><div class="grade-campos">
        ${NEDIP_MANUAL_USO.map(([k, r]) => c(`${b}.manualUso.${k}`, r, { tipo: 'textarea', classe: 'largo', linhas: 3 })).join('')}</div>`, ['det_manuso'], () => Object.values(e.manualUso || {}).some(txt)]);
      if (ferr(e, 'manuais')) {
        const opA = [['', '— gerar pelo sistema —']].concat(e.anexos.map((a) => [a.arquivo, a.nome]));
        P.push(['manuais', 'Manuais de projeto e de uso', `<div class="grade-campos">${c(b + '.manuais.projetoAnexo', 'Manual de projeto próprio (documento da fase)', { tipo: 'select', render: true, opcoes: opA })}
          ${c(b + '.manuais.usoAnexo', 'Manual de uso próprio (documento da fase)', { tipo: 'select', render: true, opcoes: opA })}</div>
          <div class="barra">${m.projetoAnexo ? `<button class="btn" data-acao="nedip-baixar" data-arq="${esc(m.projetoAnexo)}">⬇ manual de projeto (próprio)</button>` : '<button class="btn primario" data-acao="nedip-manual" data-tipo="projeto">📘 Gerar manual de projeto</button>'}
          ${m.usoAnexo ? `<button class="btn" data-acao="nedip-baixar" data-arq="${esc(m.usoAnexo)}">⬇ manual de uso (próprio)</button>` : '<button class="btn primario" data-acao="nedip-manual" data-tipo="uso">📗 Gerar manual de uso</button>'}
          ${!m.projetoAnexo && m.projeto ? `<button class="btn" data-acao="nedip-baixar" data-arq="${esc(m.projeto)}">⬇ manual de projeto gerado</button>` : ''}
          ${!m.usoAnexo && m.uso ? `<button class="btn" data-acao="nedip-baixar" data-arq="${esc(m.uso)}">⬇ manual de uso gerado</button>` : ''}
          ${m.geradoEm ? `<span class="muted">gerados em ${esc(m.geradoEm.replace('T', ' ').slice(0, 16))}</span>` : ''}</div>`, ['det_manproj'], () => !!(m.projeto || m.projetoAnexo)]);
      }
      return P;
    },
    producao(e, b) {
      const c = App.campo, bom = (App.p.produto.etapas.detalhado.bom || []).filter((x) => x.origem !== 'fabricado');
      return [
        ['processos', 'Processos, recursos e leiaute de fabricação', c(b + '.processos', 'Processos, máquinas, ferramentas e leiaute (ou como o serviço será prestado)', { tipo: 'textarea', linhas: 4 }), ['pro_proc'], () => txt(e.processos)],
        ['fornecedores', 'Fornecedores e itens comprados', `${bom.length ? `<p class="muted" style="margin-top:0">Itens comprados/terceirizados da lista de materiais: ${bom.map((x) => esc(x.descricao || x.item)).join('; ')}.</p>` : ''}${c(b + '.fornecedores', 'Fornecedores homologados (item, fornecedor, prazo, condição)', { tipo: 'textarea', linhas: 3 })}`, ['pro_forn'], () => txt(e.fornecedores)],
        ['instrucoes', 'Instruções de trabalho e plano de controle', c(b + '.instrucoes', 'Instruções de trabalho por posto e plano de controle de qualidade', { tipo: 'textarea', linhas: 3 }), ['pro_ctrl'], () => txt(e.instrucoes)],
        ['piloto', 'Lote piloto', `${c(b + '.lotePiloto', 'Quantidade, resultados e ajustes', { tipo: 'textarea', linhas: 3 })}<p class="muted">Os resultados por especificação vão na Qualidade. ${linkQualidade}</p>`, ['pro_piloto'], () => txt(e.lotePiloto)],
        ['assistencia', 'Assistência técnica e peças de reposição', c(b + '.assistencia', 'Rede de assistência, peças de reposição e prazos', { tipo: 'textarea', linhas: 3 }), ['pro_assist'], () => txt(e.assistencia)],
        ['liberacao', 'Liberação da produção', `<div class="grade-campos">${c(b + '.liberacao', 'Data de liberação', { tipo: 'date' })}${c(b + '.liberacaoAceite', 'Aceite (quem liberou e condições)', { tipo: 'textarea', linhas: 2 })}</div>`, ['pro_lib'], () => txt(e.liberacao)],
        ['docs', 'Documentos da fase', docs(e, b, 'producao'), [], () => false, true],
      ];
    },
    lancamento(e, b) {
      const c = App.campo, P = [];
      if (ferr(e, 'economia') && window.Economia) { e.economia = Economia.normalizar(e.economia); P.push(['economia', 'Mercado, custos, viabilidade e preço', Economia.html(e, b), ['lan_mercado', 'lan_custos', 'lan_viab', 'lan_preco'], () => !!(e.economia && JSON.stringify(e.economia).match(/\d/))]); }
      P.push(['plano', 'Plano de lançamento e de comunicação', `<div class="grade-campos">${c(b + '.plano', 'Plano de lançamento e comunicação/marketing', { tipo: 'textarea', classe: 'largo', linhas: 3 })}${c(b + '.data', 'Data de lançamento', { tipo: 'date' })}</div>`, ['lan_plano'], () => txt(e.plano)]);
      P.push(['canais', 'Canais de venda, distribuição e assistência', c(b + '.canais', 'Canais', { tipo: 'textarea', linhas: 3 }), ['lan_canais'], () => txt(e.canais)]);
      P.push(['treinamento', 'Treinamento', c(b + '.treinamento', 'Vendas, assistência técnica e usuários', { tipo: 'textarea', linhas: 3 }), ['lan_trein'], () => txt(e.treinamento)]);
      P.push(['certificacoes', 'Registros, certificações e homologações', c(b + '.certificacoes', 'O que foi exigido e a situação', { tipo: 'textarea', linhas: 3 }), ['lan_cert'], () => txt(e.certificacoes)]);
      P.push(['documentacao', 'Documentação ao cliente', `${c(b + '.documentacao', 'Manual de uso, garantia e o que mais vai ao cliente', { tipo: 'textarea', linhas: 3 })}
        <div class="barra"><button class="btn pequeno" data-acao="ir-etapa" data-etapa="detalhado">📗 Manual de uso (projeto detalhado)</button></div>`, ['lan_doc'], () => txt(e.documentacao)]);
      P.push(['docs', 'Documentos da fase', docs(e, b, 'lancamento'), [], () => false, true]);
      return P;
    },
    validacao(e, b) {
      const c = App.campo;
      return [
        ['satisfacao', 'Questionário de satisfação (pós-uso)', `<p class="muted" style="margin-top:0">Mesmo caminho do projeto informacional: planeje as perguntas, aplique (Google Forms ou papel), registre abaixo e suba as respostas em <b>Documentos da fase</b> (próximo passo).</p>
          ${App.tabela(b + '.questionarios', [{ campo: 'publico', rotulo: 'Público' }, { campo: 'meio', rotulo: 'Meio', largura: '16%' },
          { campo: 'respondentes', rotulo: 'Respondentes', tipo: 'number', min: 0, largura: '90px' }, { campo: 'data', rotulo: 'Data', tipo: 'date', largura: '140px' },
          { campo: 'observacao', rotulo: 'Principais achados', tipo: 'textarea' }], { novo: 'questionario', botao: 'Registrar questionário', vazio: 'Nenhum questionário de satisfação.' })}
          ${c(b + '.satisfacao', 'Satisfação dos clientes (síntese)', { tipo: 'textarea', linhas: 3 })}`, ['val_satisf'], () => txt(e.satisfacao) || (e.questionarios || []).length > 0],
        ['docs', 'Documentos da fase (respostas)', docs(e, b, 'validacao'), [], () => false, true],
        ['campo', 'Desempenho em campo, falhas, reclamações e garantia', c(b + '.campo', 'O que aconteceu em uso', { tipo: 'textarea', linhas: 3 }), ['val_campo'], () => txt(e.campo)],
        ['espec', 'Especificações em uso real', `${c(b + '.especUso', 'O que foi confirmado (ou não) em uso real', { tipo: 'textarea', linhas: 3 })}<p class="muted">Os valores vão na Qualidade. ${linkQualidade}</p>`, ['val_espec'], () => txt(e.especUso)],
        ['licoes', 'Lições aprendidas', `<p class="muted" style="margin-top:0">${App.p.licoesAprendidas.length} lição(ões) registrada(s), inclusive as das recorrências do projeto preliminar.</p><div class="barra"><button class="btn" data-acao="ir-aba" data-aba="licoes">💡 Lições aprendidas</button></div>`, ['val_licoes'], () => App.p.licoesAprendidas.length > 0],
        ['melhorias', 'Melhorias e próxima versão', c(b + '.melhorias', 'Melhorias', { tipo: 'textarea', linhas: 3 }), ['val_melhor'], () => txt(e.melhorias)],
        ['encerramento', 'Encerramento do projeto', c(b + '.encerramento', 'Aceites e documentação final', { tipo: 'textarea', linhas: 3 }), ['val_encerr'], () => txt(e.encerramento)],
      ];
    },
  };
  App.acoes['ir-etapa'] = (el) => { App.aba = 'produto'; App.etapaSel = el.dataset.etapa; App.render(); window.scrollTo(0, 0); };

  App.nedipTemPassos = (id) => id in FASES;
  /** Passos da fase (cartões numerados). */
  App.nedipPassosHtml = function (et, e, b, servico) {
    const P = FASES[et.id](e, b, servico);
    P.forEach(([, , , recs, cheio]) => { const v = cheio(); recs.forEach((r) => marcar(e, r, v)); });
    return P.map(([id, titulo, corpo], i) => cartaoPasso(i + 1, id, titulo, corpo, P[i + 1] ? [P[i + 1][0], `${i + 2}. ${P[i + 1][1]}`] : null)).join('');
  };
})();
