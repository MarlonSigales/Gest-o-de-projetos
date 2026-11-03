/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Parte elétrica do projeto de produto (projetos elétricos e de automação e a parte elétrica dos mistos):
 * - fora as especificações, só a equipe da área elétrica (aba Áreas, marcada como elétrica) faz as etapas;
 * - o coordenador (ou o adjunto) e o gestor (grupo de gestão) aceitam ou recusam cada etapa, com motivo.
 * Quem é quem sai do nome e do e-mail configurados neste navegador (⚙ Configurações), comparados com as Áreas, o
 * coordenador e os interessados do grupo de gestão. Não é senha; com o login (item 52) passa a valer por conta.
 */
'use strict';

(function () {
  const norm = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const RE_AREA = /eletric|eletron|automa|embarc|firmware|software|controle|potencia eletrica/;

  /** Áreas que fazem a parte elétrica: as marcadas; sem nenhuma marcada, as que têm nome de área elétrica. */
  App.areasEletricas = function (p = App.p) {
    const as = (p && p.areas) || [];
    const marcadas = as.filter((a) => a.eletrica === true);
    if (marcadas.length || as.some((a) => a.eletrica === false)) return marcadas;
    return as.filter((a) => RE_AREA.test(norm(a.nome)));
  };
  const mesma = (pes, eu) => { const e = norm(pes && pes.email), n = norm(pes && pes.nome); if (eu.email && e) return e === eu.email; return !!(eu.nome && n && n === eu.nome); };

  /** Papéis de quem está usando: equipe (ou livre, sem área elétrica definida), coordenador, gestor. */
  App.papeisEletrica = function () {
    const p = App.p, eu = { nome: norm(App.cfg && App.cfg.usuario), email: norm(App.cfg && App.cfg.email) }, papeis = [];
    if (!p) return { papeis: ['livre'], usuario: (App.cfg && App.cfg.usuario) || '' };
    const areas = App.areasEletricas(p), resp = areas.flatMap((a) => a.responsaveis || []).filter((r) => norm(r.nome) || norm(r.email));
    if (!resp.length) papeis.push('livre');
    else if (resp.some((r) => mesma(r, eu))) papeis.push('equipe');
    if ([p.projeto.coordenador, p.projeto.coordenadorAdjunto].some((c) => c && (norm(c.nome) || norm(c.email)) && mesma(c, eu))) papeis.push('coordenador');
    const gest = new Set((p.gruposEmail || []).filter((g) => g.gestao).map((g) => g.id));
    if ((p.interessados || []).some((i) => (i.grupos || []).some((g) => gest.has(g)) && mesma(i, eu))) papeis.push('gestor');
    return { papeis, usuario: (App.cfg && App.cfg.usuario) || '' };
  };

  const ROTULO = { 'nao-enviado': 'não enviada', aguardando: 'aguardando aceite', aceito: '✓ aceita', recusado: '✗ recusada', alterado: 'alterada depois do envio' };
  /** Situação dos aceites da parte elétrica (vinda das seções do projeto conceitual). */
  App.aceiteEletricaHtml = function () {
    const l = App.p && App.p.produto && App.p.produto.aceiteEletrica;
    if (!Array.isArray(l) || !l.length) return '';
    const r = App.papeisEletrica(), areas = App.areasEletricas();
    const quem = r.papeis.includes('livre') ? 'Nenhuma área elétrica com responsável na aba Áreas: por enquanto todos editam a parte elétrica.'
      : `Você: ${r.papeis.length ? r.papeis.map((x) => ({ equipe: 'equipe da área elétrica', coordenador: 'coordenador', gestor: 'gestor' }[x])).join(', ') : 'somente leitura na parte elétrica'}. Área(s) elétrica(s): ${areas.map((a) => esc(a.nome)).join(', ')}.`;
    const d = (x) => (x ? `${x.decisao === 'aceito' ? '✓' : '✗'} ${esc(x.por || '')}${x.motivo ? ` — “${esc(x.motivo)}”` : ''}` : '—');
    return `<div class="cartao"><h3 style="margin-top:0">Aceite da parte elétrica</h3><p class="muted" style="margin-top:0">${quem} O envio e o aceite ficam no cartão “Aceite desta etapa” de cada seção.</p>
      <div class="rolagem"><table class="tab-edit"><thead><tr><th>Etapa</th><th>Situação</th><th>Enviada por</th><th>Coordenador</th><th>Gestor</th></tr></thead><tbody>
      ${l.map((x) => `<tr><td>${esc(x.nome)}</td><td class="${x.estado === 'aceito' ? 'gap-pos' : x.estado === 'recusado' || x.estado === 'alterado' ? 'gap-neg' : ''}">${esc(ROTULO[x.estado] || x.estado)}</td><td>${esc(x.enviadoPor || '—')}</td><td>${d(x.coordenador)}</td><td>${d(x.gestor)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  };

  // as seções do projeto conceitual recebem os papéis no endereço: se eles mudarem (Áreas, coordenador, quem usa), recarregam
  let ultimo = null;
  const renderBase = App.render;
  App.render = function () {
    const out = renderBase.apply(this, arguments);
    try {
      if (App.p) {
        const k = JSON.stringify(App.papeisEletrica());
        if (ultimo !== null && k !== ultimo && App.secoesRecarregarPc) App.secoesRecarregarPc();
        ultimo = k;
      }
    } catch (e) { /* ok */ }
    return out;
  };
})();
