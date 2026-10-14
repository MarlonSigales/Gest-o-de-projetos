/*
 * Desenvolvimento em blocos, no estilo de um caderno (Google Colab): texto, capítulo, subcapítulo, figura,
 * tabela, dados do QFD, projeto do produto, questionário e quebra de página. Entre os blocos ficam os botões
 * de inserir; cada bloco tem editar, excluir e mover. A mesma lista serve à macroentrega (no PDF, em
 * "3. Resultados", com capítulos 3.1, 3.1.1 …) e aos relatórios de andamento intermediários dela.
 * Figuras e tabelas dos blocos ficam na macroentrega (figuras/, tabelas[]) e são referenciadas pelo bloco.
 */
'use strict';

App.blocoEdit = new Set(); // blocos abertos para edição (não vai para o JSON)
App.BLOCOS_MENU = [['texto', '¶ Texto'], ['titulo:1', 'Capítulo'], ['titulo:2', 'Subcapítulo'], ['titulo:3', 'Seção'], ['figura', '🖼 Figura'],
  ['tabela', '▦ Tabela'], ['qfd', '🏠 Dados do QFD'], ['nedip', '🛠 Projeto do produto'], ['questionario', '📋 Questionário'], ['quebra', '⤓ Quebra de página']];
App.NIVEIS = [[1, 'Capítulo'], [2, 'Subcapítulo'], [3, 'Seção']];
App.PARTES_QUEST = [['identificacao', 'Identificação da pesquisa'], ['destaques', 'Principais resultados (destaques)'], ['roteiro', 'Roteiro aplicado'],
  ['graficos', 'Gráficos das respostas (figuras)'], ['resultados', 'Resultados por pergunta (tabelas)'], ['consolidacao', 'Necessidades consolidadas']];

/** Números dos títulos (3.1, 3.1.1 …) na ordem dos blocos; base '' numera 1, 1.1 …; base null/undefined não numera. */
Nucleo.numerarTitulos = function (blocos, base) {
  const cont = [0, 0, 0], out = {};
  (blocos || []).forEach((b) => {
    if (b.tipo !== 'titulo') return;
    const n = b.nivel - 1;
    cont[n]++; for (let k = n + 1; k < 3; k++) cont[k] = 0;
    out[b.id] = (base ? base + '.' : '') + cont.slice(0, n + 1).map((x) => x || 1).join('.');
  });
  return out;
};

// ------------------------------------------------------------------ texto simples → HTML (prévia)
App.textoHtml = function (txt, num) {
  if (!String(txt || '').trim()) return '<p class="vazio">Texto vazio — clique em ✎ Editar.</p>';
  const inl = (s) => Nucleo.mdInline(Nucleo.trocarRefs(s, num)).map((t) => { let h = esc(t.t); if (t.i) h = `<i>${h}</i>`; if (t.b) h = `<b>${h}</b>`; return h; }).join('');
  return Nucleo.mdBlocos(txt).map((b) => {
    if (b.tipo === 'h') return `<h${b.nivel + 3} class="nb-h">${inl(b.texto)}</h${b.nivel + 3}>`;
    if (b.tipo === 'ul') return '<ul>' + b.itens.map((l) => `<li>${inl(l)}</li>`).join('') + '</ul>';
    if (b.tipo === 'ol') return `<ol start="${b.inicio}">` + b.itens.map((l) => `<li>${inl(l)}</li>`).join('') + '</ol>';
    return `<p>${b.linhas.map(inl).join('<br>')}</p>`;
  }).join('');
};

// ------------------------------------------------------------------ editor
/**
 * Editor de uma lista de blocos. lp = caminho da lista no projeto (padrão: blocos da macroentrega);
 * op.base = prefixo da numeração dos capítulos ('3' na macroentrega, '2' nos relatórios intermediários).
 */
App.blocosHtml = function (mi, lp, op = {}) {
  lp = lp || `macroentregas.${mi}.blocos`;
  const m = App.p.macroentregas[mi], bl = App.get(lp) || [];
  const x = { mi, lp, m, bl, num: Nucleo.numerar(App.p, [Nucleo.macroDaLista(m, bl)]), tit: Nucleo.numerarTitulos(bl, op.base ?? '3') };
  let h = `<p class="muted" style="margin-top:0">${op.ajuda || 'Monte o desenvolvimento como num caderno: escolha o tipo de bloco nos botões; ao incluir um bloco, novos botões aparecem abaixo dele. No PDF, os blocos entram em <b>3. Resultados</b>, depois do texto acima, com capítulos numerados (3.1, 3.1.1 …). Tabelas largas saem em folha deitada.'}</p><div class="nb">`;
  h += App.blocoInserirHtml(x, 0, !bl.length);
  bl.forEach((b, i) => { h += App.blocoHtml(x, i) + App.blocoInserirHtml(x, i + 1, i === bl.length - 1); });
  return h + '</div>';
};
const dl = (x) => `data-mi="${x.mi}" data-lp="${esc(x.lp)}"`;

App.blocoInserirHtml = (x, pos, fixo) => `<div class="nb-inserir ${fixo ? 'fixo' : ''}"><span class="nb-linha"></span><div class="nb-botoes">${App.BLOCOS_MENU.map(([t, r]) =>
  `<button class="btn pequeno" data-acao="bloco-add" ${dl(x)} data-pos="${pos}" data-tipo="${t}">+ ${r}</button>`).join('')}</div><span class="nb-linha"></span></div>`;

const ROTULO_BLOCO = { texto: 'Texto', titulo: 'Título', figura: 'Figura', tabela: 'Tabela', qfd: 'Dados do QFD', nedip: 'Projeto do produto', questionario: 'Questionário', quebra: 'Quebra de página' };

App.blocoHtml = function (x, i) {
  const b = x.bl[i], ed = App.blocoEdit.has(b.id), bp = `${x.lp}.${i}`;
  const rot = b.tipo === 'titulo' ? App.NIVEIS.find(([n]) => n === b.nivel)[1] : ROTULO_BLOCO[b.tipo];
  const fer = `<div class="nb-ferr"><span class="nb-tipo">${esc(rot)}</span><span class="nb-esp"></span>
    <button class="btn pequeno" data-acao="bloco-mover" ${dl(x)} data-i="${i}" data-d="-1" title="Mover para cima" ${i ? '' : 'disabled'}>↑</button>
    <button class="btn pequeno" data-acao="bloco-mover" ${dl(x)} data-i="${i}" data-d="1" title="Mover para baixo" ${i < x.bl.length - 1 ? '' : 'disabled'}>↓</button>
    ${b.tipo === 'quebra' ? '' : `<button class="btn pequeno ${ed ? 'primario' : ''}" data-acao="bloco-editar" data-id="${esc(b.id)}">${ed ? '✓ Concluir' : '✎ Editar'}</button>`}
    <button class="btn pequeno perigo" data-acao="bloco-excluir" ${dl(x)} data-i="${i}">🗑 Excluir</button></div>`;
  return `<div class="nb-bloco ${ed ? 'editando' : ''} nb-${b.tipo}" id="bloco_${esc(b.id)}">${fer}<div class="nb-corpo">${(ed ? App.blocoEditor : App.blocoPrevia)(x, b, bp)}</div></div>`;
};

const irInformacional = (t) => `<button class="btn pequeno primario" data-acao="ir-aba" data-aba="produto" data-etapa="informacional">${t}</button>`;
const listaSecoes = (b, nomes, disp) => `<ul>${b.secoes.map((s) => { const d = disp(s); return `<li>${esc(nomes(s))}${d.ok ? '' : ` <span class="gap-neg">— ${esc(d.motivo)}</span>`}</li>`; }).join('') || '<li class="vazio">Nenhuma seção escolhida.</li>'}</ul>`;

App.blocoPrevia = function (x, b) {
  const { m, num, tit } = x;
  const editar = `data-acao="bloco-editar" data-id="${esc(b.id)}" title="Clique para editar"`;
  switch (b.tipo) {
    case 'titulo': return `<div class="nb-titulo n${b.nivel}" ${editar}>${esc(tit[b.id] || '')} ${b.titulo ? esc(b.titulo) : '<span class="vazio">Título vazio</span>'}</div>`;
    case 'texto': return `<div class="nb-texto" ${editar}>${App.textoHtml(b.texto, num)}</div>`;
    case 'figura': {
      const f = m.figuras.find((y) => y.id === b.ref);
      if (!f) return `<p class="vazio">Nenhuma imagem.</p>${App.blocoFiguraInput(x, b)}`;
      return `<div class="prev-abnt"><div class="leg">Figura ${num.fig[f.id] ?? '?'} – ${esc(f.titulo || '(sem título)')}</div><img data-fig="${esc(f.arquivo)}" alt="" style="max-width:100%;max-height:320px">
        <div class="fonte">Fonte: ${esc((f.fonte || 'Elaborado pelos autores (' + new Date().getFullYear() + ')').replace(/\.$/, ''))}.</div>
        <span class="marcador" data-acao="copiar" data-texto="{{fig:${esc(f.id)}}}" title="Copiar a referência para citar no texto">{{fig:${esc(f.id)}}}</span></div>`;
    }
    case 'tabela': {
      const t = m.tabelas.find((y) => y.id === b.ref);
      if (!t) return '<p class="vazio">Tabela não encontrada.</p>';
      return App.previaTabela(t, num.tab[t.id] ?? '?') + `<div style="text-align:center"><span class="marcador" data-acao="copiar" data-texto="{{tab:${esc(t.id)}}}">{{tab:${esc(t.id)}}}</span></div>`;
    }
    case 'qfd': {
      const a = Qfd.analisar(App.p.qfdDados);
      if (!a) return `<div class="aviso-box"><b>${esc(b.titulo)}</b><br>Nenhum QFD importado neste projeto. ${irInformacional('Ir ao projeto informacional (importar o QFD)')}</div>`;
      return `<div class="nb-resumo"><b>${esc(b.titulo)}</b> <span class="muted">· ${a.rc.length} requisitos do cliente, ${a.rp.length} de projeto</span>
        ${listaSecoes(b, Qfd.nome, (s) => { const d = Qfd.disponivel(a, s); return { ok: d.ok, motivo: 'falta no QFD: ' + d.motivo }; })}
        ${b.secoes.some((s) => !Qfd.disponivel(a, s).ok) ? '<button class="btn pequeno" data-acao="qfd-abrir">↗ Completar no sistema QFD</button>' : ''}</div>`;
    }
    case 'nedip': {
      const falta = b.secoes.map((s) => NedipRel.disponivel(App.p, s)).filter((d) => !d.ok);
      return `<div class="nb-resumo"><b>${esc(b.titulo)}</b> <span class="muted">· seções sem dados não entram no PDF</span>
        ${listaSecoes(b, NedipRel.nome, (s) => NedipRel.disponivel(App.p, s))}
        ${[...new Set(falta.map((d) => d.etapa))].map((et) => `<button class="btn pequeno" data-acao="ir-aba" data-aba="produto" data-etapa="${et}">Preencher em ${esc(NEDIP_ETAPAS.find((y) => y.id === et).curto)}</button>`).join(' ')}</div>`;
    }
    case 'questionario': {
      const f = App.p.produto.etapas.informacional.formulario;
      if (!f.perguntas.length) return `<div class="aviso-box"><b>${esc(b.titulo)}</b><br>Nenhum questionário importado. ${irInformacional('Ir ao questionário (projeto informacional)')}</div>`;
      const ng = b.partes.includes('graficos') ? Formulario.perguntasGrafico(f).length : 0;
      return `<div class="nb-resumo"><b>${esc(b.titulo)}</b> <span class="muted">· ${f.respostas.length} respondente(s), ${f.perguntas.length} pergunta(s)${ng ? `, ${ng} gráfico(s) como figura` : ''}</span>
        <ul>${b.partes.map((s) => `<li>${esc((App.PARTES_QUEST.find(([k]) => k === s) || [, s])[1])}</li>`).join('') || '<li class="vazio">Nenhuma parte escolhida.</li>'}</ul>
        ${f.respostas.length ? '' : irInformacional('Importar as respostas')}</div>`;
    }
    case 'quebra': return '<div class="nb-quebra">— nova página no PDF —</div>';
    default: return '';
  }
};

App.blocoFiguraInput = (x, b) => `<label class="btn ${b.ref ? '' : 'primario'}">${b.ref ? '↺ Trocar imagem' : '⬆ Escolher imagem (PNG, JPG ou SVG)'}<input type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" hidden data-bloco-fig="${esc(b.id)}" ${dl(x)}></label>`;

const caixasLista = (x, b, campo, lista, disp) => `<div class="nb-checks">${lista.map(([s, nome]) => { const d = disp ? disp(s) : { ok: true };
  return `<label class="campo rec" style="flex-direction:row;gap:8px"><input type="checkbox" data-acao="bloco-lista" ${dl(x)} data-id="${esc(b.id)}" data-campo="${campo}" data-v="${s}" ${b[campo].includes(s) ? 'checked' : ''}> ${esc(nome)}${d.ok ? '' : ` <span class="gap-neg">(${esc(d.motivo)})</span>`}</label>`; }).join('')}</div>`;

App.blocoEditor = function (x, b, bp) {
  const c = App.campo, { m, mi, num, tit } = x;
  switch (b.tipo) {
    case 'titulo': return `<div class="grade-campos"><label class="campo largo">${esc(tit[b.id] || '')} Título${App.campo(bp + '.titulo', '', { ph: 'ex.: Levantamento das necessidades', attrs: 'data-foco="1"' })}</label>
      ${c(bp + '.nivel', 'Nível', { tipo: 'select', render: true, opcoes: App.NIVEIS })}</div>`;
    case 'texto': return `<div class="barra nb-fmt"><button class="btn pequeno" data-acao="txt-fmt" data-f="negrito" data-id="${esc(b.id)}" title="Negrito"><b>B</b></button>
      <button class="btn pequeno" data-acao="txt-fmt" data-f="lista" data-id="${esc(b.id)}">• Lista</button>
      ${App.opcoesReferencias(m, num).length ? `<select data-ref-texto="${esc(b.id)}"><option value="">Citar figura/tabela…</option>${App.opcoes(App.opcoesReferencias(m, num), '')}</select>` : ''}
      <span class="muted">linha em branco = novo parágrafo · “- ” ou “1.” = lista · # título · **negrito** · *itálico*</span></div>
      ${c(bp + '.texto', '', { tipo: 'textarea', linhas: 8, attrs: `data-foco="1" id="txt_${esc(b.id)}"` })}`;
    case 'figura': {
      const k = m.figuras.findIndex((y) => y.id === b.ref);
      if (k < 0) return `<p class="muted">Escolha a imagem; depois informe título e fonte.</p>${App.blocoFiguraInput(x, b)}`;
      const f = m.figuras[k], fp = `macroentregas.${mi}.figuras.${k}`;
      return `<div class="nb-fig"><div class="prev"><img data-fig="${esc(f.arquivo)}" alt=""></div><div class="grade-campos" style="flex:1">
        ${c(fp + '.titulo', `Título (acima): Figura ${num.fig[f.id] ?? '?'}`, { classe: 'largo', attrs: 'data-foco="1"' })}${c(fp + '.fonte', 'Fonte (abaixo)', { classe: 'largo' })}
        <div class="barra">${App.blocoFiguraInput(x, b)}<span class="marcador" data-acao="copiar" data-texto="{{fig:${esc(f.id)}}}">{{fig:${esc(f.id)}}}</span></div></div></div>`;
    }
    case 'tabela': {
      const k = m.tabelas.findIndex((y) => y.id === b.ref);
      if (k < 0) return '<p class="vazio">Tabela não encontrada.</p>';
      return App.editorUmaTabela(mi, k, num);
    }
    case 'qfd': {
      const a = Qfd.analisar(App.p.qfdDados);
      return `${c(bp + '.titulo', 'Título do bloco', { attrs: 'data-foco="1"' })}
        ${a ? '' : `<div class="aviso-box">Nenhum QFD importado. ${irInformacional('Ir ao projeto informacional')}</div>`}
        <p class="muted">Informações do QFD neste bloco (mesma escolha do cartão “Relatório do QFD” no projeto informacional):</p>
        ${caxasQfd(x, b, a)}
        ${a && Qfd.SECOES.some(([s]) => !Qfd.disponivel(a, s).ok) ? '<div class="barra"><button class="btn pequeno" data-acao="qfd-abrir">↗ Completar no sistema QFD</button></div>' : ''}`;
    }
    case 'nedip': return `${c(bp + '.titulo', 'Título do bloco', { attrs: 'data-foco="1"' })}
        <p class="muted">Informações do projeto de produto neste bloco (mesma escolha do cartão “Projeto de produto nos relatórios”). Seções sem dados não entram no PDF.</p>
        ${caixasLista(x, b, 'secoes', NedipRel.SECOES, (s) => NedipRel.disponivel(App.p, s))}`;
    case 'questionario': {
      const f = App.p.produto.etapas.informacional.formulario;
      return `${c(bp + '.titulo', 'Título do bloco', { attrs: 'data-foco="1"' })}
        ${f.perguntas.length ? '' : `<div class="aviso-box">Nenhum questionário importado. ${irInformacional('Ir ao questionário')}</div>`}
        ${caixasLista(x, b, 'partes', App.PARTES_QUEST)}
        <p class="muted">Quais perguntas viram gráfico e o título de cada figura: no questionário (projeto informacional), colunas “Gráfico” e “título da figura”.</p>`;
    }
    default: return '';
  }
};
const caxasQfd = (x, b, a) => caixasLista(x, b, 'secoes', Qfd.SECOES, (s) => { const d = Qfd.disponivel(a, s); return { ok: d.ok, motivo: 'falta no QFD: ' + d.motivo }; });

App.opcoesReferencias = (m, num) => {
  num = num || Nucleo.numerar(App.p, [m]);
  return m.figuras.filter((f) => num.fig[f.id]).map((f) => [`{{fig:${f.id}}}`, `Figura ${num.fig[f.id]} – ${f.titulo || f.id}`])
    .concat(m.tabelas.filter((t) => num.tab[t.id]).map((t) => [`{{tab:${t.id}}}`, `Tabela ${num.tab[t.id]} – ${t.titulo || t.id}`]));
};

/** Editor de uma tabela (o mesmo da lista de tabelas, para usar dentro do bloco). */
App.editorUmaTabela = function (mi, ti, num) {
  const t = App.p.macroentregas[mi].tabelas[ti], p = `macroentregas.${mi}.tabelas.${ti}`, nc = Math.max(1, t.cabecalho.length);
  let h = `<div class="grade-campos">${App.campo(`${p}.titulo`, `Título (acima): Tabela ${num.tab[t.id] ?? '?'}`, { attrs: 'data-foco="1"' })}
    ${App.campo(`${p}.fonte`, 'Fonte (abaixo da tabela)', { ph: 'Elaborado pelos autores (' + new Date().getFullYear() + ')' })}</div>
    <div class="rolagem"><table class="grade-tabela"><thead><tr>${t.cabecalho.map((c, k) => `<th>${App.campo(`${p}.cabecalho.${k}`, '')}</th>`).join('')}</tr></thead><tbody>`;
  t.linhas.forEach((l, r) => { h += '<tr>' + Array.from({ length: nc }, (_, k) => { if (l[k] === undefined) l[k] = ''; return `<td>${App.campo(`${p}.linhas.${r}.${k}`, '')}</td>`; }).join('') + '</tr>'; });
  h += `</tbody></table></div><div class="barra">
    <button class="btn pequeno" data-acao="tab-op" data-p="${p}" data-op="+l">+ linha</button><button class="btn pequeno" data-acao="tab-op" data-p="${p}" data-op="-l">− linha</button>
    <button class="btn pequeno" data-acao="tab-op" data-p="${p}" data-op="+c">+ coluna</button><button class="btn pequeno" data-acao="tab-op" data-p="${p}" data-op="-c">− coluna</button>
    <button class="btn pequeno" data-acao="tab-colar" data-p="${p}">Colar do Excel/CSV</button>
    <label class="btn pequeno">⬆ Importar CSV<input type="file" accept=".csv,.txt,text/csv,text/plain" hidden data-tab-csv="${p}"></label>
    <span class="marcador" data-acao="copiar" data-texto="{{tab:${esc(t.id)}}}">{{tab:${esc(t.id)}}}</span>
    ${t.cabecalho.length > 8 ? '<span class="muted">tabela larga: sai em folha deitada no PDF</span>' : ''}</div>`;
  return h;
};

// ------------------------------------------------------------------ ações
const blocoLista = (el) => App.get(el.dataset.lp) || [];
const blocoAchar = (el, id) => blocoLista(el).find((b) => b.id === id) || null;
App.focarBloco = (id) => setTimeout(() => {
  const el = document.getElementById('bloco_' + id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const f = el.querySelector('[data-foco]'); if (f) f.focus();
}, 30);
/** A figura/tabela ainda é usada por algum bloco da macroentrega ou dos relatórios intermediários? */
App.refEmUso = (m, ref) => [m.blocos, ...(m.relatorios || []).map((r) => r.blocos)].some((l) => (l || []).some((b) => b.ref === ref));

App.proximaTabelaId = () => {
  let n = 0;
  App.p.macroentregas.forEach((x) => x.tabelas.forEach((t) => { const k = String(t.id).match(/(\d+)$/); if (k) n = Math.max(n, +k[1]); }));
  return 'tab_' + String(n + 1).padStart(3, '0');
};

App.acoes['bloco-add'] = (el) => {
  const mi = +el.dataset.mi, pos = +el.dataset.pos, m = App.p.macroentregas[mi], l = blocoLista(el);
  const [tipo, nivel] = el.dataset.tipo.split(':');
  const b = Nucleo.novoBloco(tipo);
  if (tipo === 'titulo') b.nivel = +nivel;
  if (tipo === 'tabela') {
    const t = { id: App.proximaTabelaId(), titulo: '', fonte: 'Elaborado pelos autores (' + new Date().getFullYear() + ')', secao: 'resultados', cabecalho: ['Coluna 1', 'Coluna 2', 'Coluna 3'], linhas: [['', '', ''], ['', '', '']] };
    m.tabelas.push(t); b.ref = t.id;
  }
  if (tipo === 'qfd' && App.p.qfdDados) { const a = Qfd.analisar(App.p.qfdDados); b.secoes = b.secoes.filter((s) => Qfd.disponivel(a, s).ok); }
  if (tipo === 'nedip') { const disp = NedipRel.SECOES.map(([s]) => s).filter((s) => s !== 'fases' && NedipRel.disponivel(App.p, s).ok); if (disp.length) b.secoes = disp; }
  l.splice(pos, 0, b);
  if (tipo !== 'quebra') App.blocoEdit.add(b.id);
  App.marcarSujo(true); App.render();
  if (tipo === 'figura') { const inp = document.querySelector(`input[data-bloco-fig="${b.id}"]`); if (inp) inp.click(); }
  App.focarBloco(b.id);
};
App.acoes['bloco-editar'] = (el) => {
  const id = el.dataset.id;
  if (App.blocoEdit.has(id)) App.blocoEdit.delete(id); else App.blocoEdit.add(id);
  App.render(); if (App.blocoEdit.has(id)) App.focarBloco(id);
};
App.acoes['bloco-mover'] = (el) => {
  const l = blocoLista(el), i = +el.dataset.i, j = i + (+el.dataset.d);
  if (j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]];
  App.marcarSujo(true); App.render(); App.focarBloco(l[j].id);
};
App.acoes['bloco-excluir'] = async (el) => {
  const m = App.p.macroentregas[+el.dataset.mi], l = blocoLista(el), b = l[+el.dataset.i];
  if (!b) return;
  const desc = { figura: ' A imagem também será apagada (se nenhum outro bloco a usar).', tabela: ' A tabela também será apagada (se nenhum outro bloco a usar).' }[b.tipo] || '';
  if (!confirm(`Excluir este bloco (${ROTULO_BLOCO[b.tipo].toLowerCase()})?${desc}`)) return;
  l.splice(+el.dataset.i, 1);
  App.blocoEdit.delete(b.id);
  if (b.ref && !App.refEmUso(m, b.ref)) { // blocos copiados entre relatórios compartilham a mesma figura/tabela
    if (b.tipo === 'tabela') m.tabelas = m.tabelas.filter((t) => t.id !== b.ref);
    if (b.tipo === 'figura') {
      const f = m.figuras.find((y) => y.id === b.ref);
      m.figuras = m.figuras.filter((y) => y.id !== b.ref);
      if (f && !App.p.macroentregas.some((y) => y.figuras.some((g) => g.arquivo === f.arquivo))) { try { await App.arm.removerArquivo(f.arquivo); } catch (e) { /* ignora */ } App.figUrl.delete(f.arquivo); }
    }
  }
  App.marcarSujo(true); App.render();
};
/** Caixas de seleção de listas do bloco (seções do QFD ou do projeto de produto, partes do questionário). */
App.acoes['bloco-lista'] = (el) => {
  const b = blocoAchar(el, el.dataset.id), campo = el.dataset.campo;
  if (!b) return;
  const ordem = (campo === 'partes' ? App.PARTES_QUEST : b.tipo === 'nedip' ? NedipRel.SECOES : Qfd.SECOES).map(([s]) => s);
  const l = new Set(b[campo]);
  if (el.checked) l.add(el.dataset.v); else l.delete(el.dataset.v);
  b[campo] = ordem.filter((s) => l.has(s));
  App.marcarSujo(true); App.render(); // o clique genérico desfaz a marcação visual; a tela é redesenhada pelo modelo
};

App.acoes['txt-fmt'] = (el) => {
  const ta = document.getElementById('txt_' + el.dataset.id);
  if (!ta) return;
  const a = ta.selectionStart, z = ta.selectionEnd, v = ta.value, sel = v.slice(a, z);
  let novo;
  if (el.dataset.f === 'negrito') novo = `**${sel || 'texto'}**`;
  else novo = (sel || 'item').split('\n').map((l) => (l.startsWith('- ') ? l : '- ' + l)).join('\n');
  const antes = v.slice(0, a), prefixo = el.dataset.f === 'lista' && antes && !antes.endsWith('\n\n') ? (antes.endsWith('\n') ? '\n' : '\n\n') : '';
  ta.value = antes + prefixo + novo + v.slice(z);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.focus(); ta.selectionStart = ta.selectionEnd = (antes + prefixo + novo).length;
};
document.addEventListener('change', (ev) => {
  const s = ev.target.closest('select[data-ref-texto]');
  if (!s || !s.value) return;
  const ta = document.getElementById('txt_' + s.dataset.refTexto);
  if (ta) {
    const a = ta.selectionStart;
    ta.value = ta.value.slice(0, a) + s.value + ta.value.slice(ta.selectionEnd);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.focus(); ta.selectionStart = ta.selectionEnd = a + s.value.length;
  }
  s.value = '';
});

// imagem do bloco de figura (nova ou troca)
document.addEventListener('change', async (ev) => {
  const inp = ev.target.closest('input[data-bloco-fig]');
  if (!inp) return;
  const arq = inp.files && inp.files[0];
  inp.value = '';
  if (!arq) return;
  const m = App.p.macroentregas[+inp.dataset.mi], b = blocoAchar(inp, inp.dataset.blocoFig);
  if (!b) return;
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg' }[arq.type] || ((arq.name.match(/\.(png|jpe?g|svg)$/i) || [])[1] || '').toLowerCase().replace('jpeg', 'jpg');
  if (!ext) { App.toast(esc(arq.name) + ': use PNG, JPG ou SVG.', 'erro'); return; }
  if (arq.size > CONFIG.uploadMaxMb * 1048576) { App.toast(esc(arq.name) + ': maior que ' + CONFIG.uploadMaxMb + ' MB.', 'erro'); return; }
  if (ext === 'svg' && /<script|\son\w+\s*=|javascript:/i.test(await arq.text())) { App.toast(esc(arq.name) + ': SVG com script não é permitido.', 'erro'); return; }
  try {
    const { id, arquivo } = await App.proximoArquivoFigura(ext);
    await App.arm.gravarArquivo(arquivo, arq);
    const ant = m.figuras.find((y) => y.id === b.ref);
    if (ant) { // troca: mantém id, título e fonte
      const velho = ant.arquivo; ant.arquivo = arquivo;
      if (!App.p.macroentregas.some((y) => y.figuras.some((g) => g.arquivo === velho))) { try { await App.arm.removerArquivo(velho); } catch (e) { /* ignora */ } App.figUrl.delete(velho); }
    } else {
      m.figuras.push({ id, arquivo, titulo: arq.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), fonte: 'Elaborado pelos autores (' + new Date().getFullYear() + ')', secao: 'resultados' });
      b.ref = id;
    }
    App.blocoEdit.add(b.id);
    App.marcarSujo(true); App.render(); App.focarBloco(b.id);
  } catch (e) { App.toast('Figura: ' + esc(e.message), 'erro'); }
});

// CSV para a tabela do bloco
document.addEventListener('change', async (ev) => {
  const inp = ev.target.closest('input[data-tab-csv]');
  if (!inp) return;
  const arq = inp.files && inp.files[0];
  inp.value = '';
  if (!arq) return;
  try {
    const ls = Formulario.lerCsv(Formulario.decodificar(await arq.arrayBuffer()));
    if (!ls.length) throw new Error('arquivo vazio');
    const t = App.get(inp.dataset.tabCsv), nc = Math.max(...ls.map((l) => l.length));
    t.cabecalho = Array.from({ length: nc }, (_, k) => fLinha(ls[0][k] ?? ''));
    t.linhas = ls.slice(1).map((l) => Array.from({ length: nc }, (_, k) => fLinha(l[k] ?? '')));
    if (!t.linhas.length) t.linhas = [t.cabecalho.map(() => '')];
    if (!t.titulo) t.titulo = arq.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    App.marcarSujo(true); App.render();
    App.toast(`Tabela importada: ${t.linhas.length} linha(s), ${nc} coluna(s).`, 'ok');
  } catch (e) { App.toast('CSV: ' + esc(e.message), 'erro'); }
});

// ================================================================== PDF
/**
 * Conteúdo pdfmake dos blocos de uma macroentrega (ou da "macroentrega vista" por um relatório intermediário).
 * ctx: { recuo, base ('3' no relatório da macroentrega; null = títulos sem número), toc, qfdSecao (nº da seção do QFD no relatório geral) }
 */
Pdf.blocos = function (p, m, num, imgs, ctx = {}) {
  const tit = Nucleo.numerarTitulos(m.blocos, ctx.base), larg = Pdf.ctxLargura(ctx.recuo || 0), numerar = ctx.base !== null && ctx.base !== undefined;
  const estiloT = { 1: { fontSize: 10.5, bold: true, color: COR.escuro, margin: [0, 10, 0, 4] }, 2: { fontSize: 10, bold: true, color: COR.teal, margin: [0, 8, 0, 3] }, 3: { fontSize: 10, bold: true, italics: true, color: COR.texto, margin: [0, 6, 0, 3] } };
  const hBloco = (t) => ({ text: t, fontSize: 10.5, bold: true, color: COR.escuro, margin: [0, 10, 0, 4] });
  const hSub = (t) => ({ text: t, fontSize: 10, bold: true, color: COR.teal, margin: [0, 8, 0, 3] });
  const tocFig = ctx.toc && ctx.toc.fig;
  const saida = [];
  let titulos = []; // títulos esperando o próximo conteúdo (não ficam sozinhos no fim da página)
  const out = { push: (...nos) => {
    if (titulos.length && nos.length && !nos[0].pageBreak) { saida.push({ stack: [...titulos, nos[0]], unbreakable: true }, ...nos.slice(1)); titulos = []; return; }
    saida.push(...titulos, ...nos); titulos = [];
  } };
  (m.blocos || []).forEach((b, i) => {
    if (b.tipo === 'titulo') { if (b.titulo) titulos.push(Object.assign({ text: `${numerar ? tit[b.id] + ' ' : ''}${b.titulo}` }, estiloT[b.nivel])); return; }
    if (b.tipo === 'texto') { out.push(...Pdf.texto(b.texto, num)); return; }
    if (b.tipo === 'figura') { const f = m.figuras.find((x) => x.id === b.ref); if (f) out.push(Pdf.figura(f, num.fig[f.id], imgs, tocFig)); return; }
    if (b.tipo === 'tabela') {
      const t = m.tabelas.find((x) => x.id === b.ref);
      if (!t) return;
      const no = Pdf.tabela(t, num.tab[t.id], ctx.toc && ctx.toc.tab);
      const larga = (t.cabecalho || []).length * 48 > larg.retrato;
      out.push(...(larga ? Pdf.montarOrientacao([{ no, larga: true }]) : [no]));
      return;
    }
    if (b.tipo === 'qfd') {
      if (!b.secoes.length) return;
      if (ctx.qfdSecao) { out.push(hBloco(b.titulo), { text: `As informações do QFD (${b.secoes.map(Qfd.nome).join('; ').toLowerCase()}) estão na seção ${ctx.qfdSecao} deste relatório.`, style: 'corpo', margin: [0, 0, 0, 6] }); return; }
      out.push(hBloco(b.titulo), ...Pdf.blocoQfd(p.qfdDados, b.secoes, { h: hSub, recuo: ctx.recuo || 0, origem: Pdf.qfdOrigem(p) }));
      return;
    }
    if (b.tipo === 'nedip') {
      const c = Pdf.blocoNedip(p, b.secoes, { h: hSub, recuo: ctx.recuo || 0, num, figId: `nd_${b.id}_funcoes`, tocFig });
      if (c.length) out.push(hBloco(b.titulo), ...c);
      return;
    }
    if (b.tipo === 'questionario') { if (b.partes.length) out.push(hBloco(b.titulo), ...Pdf.blocoQuestionario(p, b.partes, { h: hSub, recuo: ctx.recuo || 0, num, blocoId: b.id, tocFig })); return; }
    if (b.tipo === 'quebra' && i < m.blocos.length - 1) out.push({ text: '', pageBreak: 'after' });
  });
  saida.push(...titulos);
  return saida;
};
