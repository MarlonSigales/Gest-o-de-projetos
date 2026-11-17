/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Ideias de patente — exportação completa para o Apoio à Escrita de Patentes (todoQA 101).
 * Além da ficha da ideia, o pré-preenchimento leva:
 *  - o RESUMO DO PROJETO do Gestão (função global, funções, concepção, projeto preliminar, quadro de especificações,
 *    necessidades, TRL) como fonte do pedido, e os valores medidos do quadro de especificações nos ensaios;
 *  - o PLANO DE TRABALHO EMBRAPII anexado ao projeto (.docx ou texto colado): vira fonte do pedido e pré-preenche os
 *    dados do projeto nos formulários da universidade (título, código, objeto, empresa parceira, contexto). O mesmo
 *    plano também pode completar os campos vazios do próprio projeto no Gestão;
 *  - as FIGURAS: diagramas da estrutura de funções e imagens da concepção selecionada e do projeto preliminar (do
 *    Projeto Conceitual aberto neste navegador ou do ZIP anexado) e as figuras das macroentregas do conceitual e do
 *    preliminar. Cada figura entra no pedido como figura editável (imagem de fundo), com a legenda.
 */
'use strict';

(function () {
  const t = (x) => String(x ?? '').trim();
  const lista = (x) => (Array.isArray(x) ? x : []);

  // ================================================================== resumo do projeto
  Ideias.resumoProjeto = function (p) {
    const pj = p.projeto, et = (p.produto && p.produto.etapas) || {}, inf = et.informacional || {}, conc = et.conceitual || {}, pre = et.preliminar || {};
    const L = [`RESUMO DO PROJETO "${t(pj.nome) || 'sem nome'}" (Gestão de Projetos, ${hojeISO().split('-').reverse().join('/')})`];
    const linha = (rot, v) => { if (t(v)) L.push(`${rot}: ${t(v)}`); };
    linha('Código', pj.codigo); linha('Empresa parceira', pj.empresaParceira); linha('Unidade EMBRAPII', pj.unidadeEmbrapii);
    linha('Objetivo geral', pj.objetivoGeral); linha('Introdução', pj.introducao);
    const necs = lista(inf.necessidades).filter((n) => t(n.descricao)).sort((a, b) => (b.peso || 0) - (a.peso || 0));
    if (necs.length) L.push('', 'NECESSIDADES DOS CLIENTES (QFD, da mais para a menos importante):', ...necs.map((n, k) => `${k + 1}. ${t(n.descricao)}`));
    const fg = conc.funcaoGlobal || {};
    if (t(fg.nome)) L.push('', `FUNÇÃO GLOBAL: ${t(fg.nome)}${t(fg.entradas) ? ` — entradas: ${t(fg.entradas)}` : ''}${t(fg.saidas) ? ` — saídas: ${t(fg.saidas)}` : ''}`);
    const fns = lista(conc.funcoes).filter((f) => t(f.nome));
    if (fns.length) {
      L.push('', 'ESTRUTURA DE FUNÇÕES (função → subfunções: princípio escolhido):');
      fns.forEach((f, k) => {
        L.push(`${k + 1}. ${t(f.nome)}`);
        lista(f.subfuncoes).filter((s) => t(s.nome)).forEach((s, j) => L.push(`   ${k + 1}.${j + 1} ${t(s.nome)}${t(s.escolhido) ? `: ${t(s.escolhido)}` : ''}`));
      });
    }
    const ccs = lista(conc.concepcoes).filter((c) => t(c.nome) || t(c.descricao));
    const sel = ccs.find((c) => c.selecionada);
    if (sel) L.push('', `CONCEPÇÃO SELECIONADA: ${t(sel.nome)}${t(sel.descricao) ? ' — ' + t(sel.descricao) : ''}${t(sel.avaliacao) ? ` (avaliação: ${t(sel.avaliacao)})` : ''}`);
    const outras = ccs.filter((c) => !c.selecionada);
    if (outras.length) L.push('Concepções alternativas avaliadas: ' + outras.map((c) => t(c.nome) || t(c.descricao).slice(0, 80)).join('; ') + '.');
    if (t(pre.leiaute) || t(pre.viabilidade) || lista(pre.prototipos).length) {
      L.push('', 'PROJETO PRELIMINAR:');
      linha('Leiaute', pre.leiaute); linha('Viabilidade', pre.viabilidade);
      lista(pre.prototipos).filter((x) => t(x.nome) || t(x.descricao)).forEach((x) => L.push(`Protótipo ${t(x.nome)}${t(x.data) ? ` (${t(x.data)})` : ''}: ${t(x.descricao)}${t(x.resultado) ? ' — resultado: ' + t(x.resultado) : ''}`));
    }
    const q = lista(p.qualidade).filter((x) => t(x.requisito));
    if (q.length) {
      L.push('', 'QUADRO DE ESPECIFICAÇÕES (requisito — critério de aceite — valor medido — situação):');
      q.forEach((x) => L.push(`- ${t(x.requisito)} — ${t(x.criterioAceite) || 'sem meta'}${t(x.valorMedido) ? ' — medido: ' + t(x.valorMedido) : ''} — ${t(x.status) || 'pendente'}${t(x.metodoVerificacao) ? ` (verificação: ${t(x.metodoVerificacao)})` : ''}`));
    }
    const arv = lista(p.trl && p.trl.arvore);
    if (arv.length && arv[0]) linha('\nTRL atual (raiz da árvore)', arv[0].trl || arv[0].trlAtual || '');
    linha('TRL esperado ao final', pj.trlEsperadoFinal);
    return L.join('\n');
  };

  /** Ensaios: os requisitos do quadro de especificações que já têm valor medido. */
  Ideias.ensaiosDoQuadro = (p) => lista(p.qualidade).filter((x) => t(x.requisito) && t(x.valorMedido))
    .map((x) => `${t(x.requisito)}: medido ${t(x.valorMedido)}${t(x.criterioAceite) ? ` (meta ${t(x.criterioAceite)})` : ''}${t(x.status) ? ' — ' + t(x.status) : ''}.`).join('\n');

  // ================================================================== plano de trabalho EMBRAPII
  async function textoDocx(arq) {
    const zip = await JSZip.loadAsync(arq);
    const f = zip.file('word/document.xml'); if (!f) throw new Error('o .docx não tem o texto (word/document.xml).');
    const doc = new DOMParser().parseFromString(await f.async('string'), 'application/xml');
    const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    return [...doc.getElementsByTagNameNS(W, 'p')].map((p) => {
      let s = '';
      for (const n of p.getElementsByTagNameNS(W, '*')) { if (n.localName === 't') s += n.textContent; else if (n.localName === 'tab') s += ' '; }
      return s.trim();
    }).filter(Boolean).join('\n');
  }
  Ideias.lerPlano = async function (arq) {
    const nome = arq.name || 'plano de trabalho';
    if (/\.docx$/i.test(nome)) return { nome, texto: await textoDocx(arq) };
    if (/\.(txt|md)$/i.test(nome) || /^text\//.test(arq.type)) return { nome, texto: await arq.text() };
    if (/\.pdf$/i.test(nome) && window.Plano) return { nome, texto: (await Plano.lerPdf(arq)).map(Plano.texto).join('\n') };
    if (/\.pdf$/i.test(nome)) throw new Error('PDF: abra o plano, selecione o texto (Ctrl+A, Ctrl+C) e cole no campo "texto do plano" abaixo. O PDF fica anexado ao projeto.');
    throw new Error('use o plano em .docx (ou cole o texto).');
  };
  /** Campos do plano de trabalho (modelo EMBRAPII e variações): rótulo na linha e o valor na mesma linha ou nas seguintes. */
  const ROTULOS = [
    ['titulo', /^(t[íi]tulo|nome)\s+do\s+projeto\b/i], ['codigo', /^(c[óo]digo|n[úu]mero|n[º°o]\.?)\s+(do\s+projeto|embrapii)\b/i],
    ['empresa', /^(empresa(s)?(\s+(parceira|contratante|participante)s?)?|raz[ãa]o\s+social)\b/i], ['unidade', /^unidade\s+embrapii\b/i],
    ['coordenador', /^coordena(dor|ção)(\s+do\s+projeto)?\b/i], ['objetivo', /^objetivos?\s+(geral|do\s+projeto)\b|^objetivo\s*:/i],
    ['especificos', /^objetivos?\s+espec[íi]ficos?\b/i], ['justificativa', /^(justificativa|contextualiza[çc][ãa]o|problema|motiva[çc][ãa]o|desafio\s+tecnol[óo]gico)\b/i],
    ['resultados', /^(resultados?\s+esperados?|produtos?\s+(finais|esperados)|entregas?\s+do\s+projeto)\b/i], ['trl', /^trl\b|^n[íi]vel\s+de\s+maturidade/i],
    ['prazo', /^(prazo|dura[çc][ãa]o|vig[êe]ncia)\b/i], ['valor', /^(valor\s+(total|do\s+projeto)|or[çc]amento)\b/i],
    // seções que só encerram o campo anterior
    ['_fim', /^(metodologia|cronograma|equipe(\s+t[ée]cnica)?|macroentregas?|riscos|refer[êe]ncias|or[çc]amento|plano\s+de\s+aplica[çc][ãa]o|contrapartida|propriedade\s+intelectual|indicadores|atividades|estado\s+da\s+(arte|t[ée]cnica)|escopo|anexos?)\b/i],
  ];
  Ideias.dadosDoPlano = function (texto) {
    const linhas = String(texto || '').split(/\n/).map((s) => s.trim()).filter(Boolean);
    const rotulo = (s) => { for (const [k, re] of ROTULOS) if (re.test(s.replace(/^\d+(\.\d+)*[.)]?\s*/, ''))) return k; return null; };
    const out = {};
    linhas.forEach((s, i) => {
      const k = rotulo(s); if (!k || k === '_fim' || out[k]) return;
      const limpo = s.replace(/^\d+(\.\d+)*[.)]?\s*/, '');
      const resto = (limpo.match(/[:–—-]\s*(.+)$/) || [])[1];
      if (resto && resto.length > 2 && !rotulo(resto)) { out[k] = resto.trim(); return; }
      const v = [];
      for (let j = i + 1; j < linhas.length && v.join(' ').length < 1500; j++) { if (rotulo(linhas[j])) break; v.push(linhas[j]); if (['titulo', 'codigo', 'empresa', 'unidade', 'coordenador', 'trl', 'prazo', 'valor'].includes(k)) break; }
      if (v.length) out[k] = v.join('\n');
    });
    return out;
  };

  // ================================================================== figuras
  const blobUrl = (b) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(''); fr.readAsDataURL(b); });
  /** ZIP mais recente do Projeto Conceitual anexado ao conceitual ou ao preliminar. */
  async function zipDoConceitual(p) {
    const et = (p.produto && p.produto.etapas) || {};
    const a = ['conceitual', 'preliminar'].flatMap((k) => lista((et[k] || {}).anexos)).filter((x) => /\.zip$/i.test(x.arquivo || '') && /conceitual/i.test((x.arquivo || '') + ' ' + (x.descricao || '')))
      .sort((x, y) => String(y.data).localeCompare(String(x.data)))[0];
    if (!a || !App.arm || !window.JSZip) return null;
    try { const b = await App.arm.lerArquivo(a.arquivo); return b ? await JSZip.loadAsync(b) : null; } catch (e) { return null; }
  }
  /** Imagens do Projeto Conceitual guardadas neste navegador (mesmo site: banco "pc_imagens"). */
  function imagemDoNavegador(id) {
    return new Promise((ok) => {
      if (!window.indexedDB) return ok(null);
      let r; try { r = indexedDB.open('pc_imagens', 1); } catch (e) { return ok(null); }
      r.onupgradeneeded = () => { try { r.result.createObjectStore('imagens', { keyPath: 'id' }); } catch (e) { /* ok */ } };
      r.onerror = () => ok(null);
      r.onsuccess = () => {
        const db = r.result;
        try { const g = db.transaction('imagens', 'readonly').objectStore('imagens').get(id); g.onsuccess = () => { db.close(); ok(g.result && g.result.blob ? g.result.blob : null); }; g.onerror = () => { db.close(); ok(null); }; } catch (e) { db.close(); ok(null); }
      };
    });
  }
  function janelaPc() {
    const fs = Object.values((App.secoes && App.secoes.frames) || {}).filter((f) => f.app === 'pc' && f.carregado);
    for (const f of fs) {
      try {
        const w = f.el.contentWindow, pc = w && w.eval("typeof PC !== 'undefined' ? PC : undefined"); // const PC não fica em window
        if (pc && typeof w.diagramasDoProjeto === 'function') return { w, pc };
      } catch (e) { /* outra origem */ }
    }
    return null;
  }
  /** Lista de figuras do projeto: [{ chave, legenda, origem, blob }]. */
  Ideias.figurasDoProjeto = async function (p) {
    const out = [], vistos = new Set();
    const add = (chave, legenda, origem, blob) => { if (blob && !vistos.has(chave)) { vistos.add(chave); out.push({ chave, legenda: t(legenda).slice(0, 200), origem, blob }); } };
    const zip = await zipDoConceitual(p);
    // diagramas da estrutura de funções: do Projeto Conceitual aberto, do ZIP ou o diagrama do Gestão
    let diags = [];
    const jp = janelaPc();
    if (jp) { try { diags = lista(jp.w.diagramasDoProjeto(jp.pc.raiz || jp.pc.p)).map((d) => ({ nome: d.nome, svg: d.svg })); } catch (e) { diags = []; } }
    if (!diags.length && zip) for (const n of Object.keys(zip.files).filter((n) => /^diagramas\/.+\.svg$/i.test(n)).sort()) diags.push({ nome: n.replace(/^diagramas\/|\.svg$/gi, '').replace(/-/g, ' '), svg: await zip.file(n).async('string') });
    const conc = ((p.produto || {}).etapas || {}).conceitual || {};
    if (!diags.length && window.NedipRel && lista(conc.funcoes).some((f) => t(f.nome))) { try { diags.push({ nome: '', svg: NedipRel.diagramaFuncoes(p) }); } catch (e) { /* sem diagrama */ } }
    diags.forEach((d, k) => add('dg:' + (t(d.nome) || k), 'Estrutura de funções' + (t(d.nome) ? ' — ' + t(d.nome) : ''), 'Projeto conceitual (diagrama de funções)', new Blob([d.svg], { type: 'image/svg+xml' })));
    // imagens da concepção e do projeto preliminar (Projeto Conceitual)
    const pc = (p.produto && p.produto.pcDados) || null;
    if (pc) {
      const ims = [];
      lista((pc.concepcao || {}).imagens).forEach((x) => x && x.id && ims.push([x.id, 'Concepção selecionada' + (t(x.legenda) ? ' — ' + t(x.legenda) : ''), 'Projeto conceitual']));
      const pl = pc.preliminar || {};
      if (pl.esbocoRestricoes) ims.push([pl.esbocoRestricoes, 'Esboço com as restrições de espaço', 'Projeto preliminar']);
      lista(pl.leiautes).forEach((x) => x.imagem && ims.push([x.imagem, 'Leiaute' + (t(x.nome) ? ' — ' + t(x.nome) : ''), 'Projeto preliminar']));
      const def = (pl.fechamento || {}).definitivo || {};
      if (def.imagem) ims.push([def.imagem, 'Leiaute definitivo', 'Projeto preliminar']);
      lista(pl.portadores).forEach((x) => x.imagem && ims.push([x.imagem, 'Portador de efeito' + (t(x.nome) ? ' — ' + t(x.nome) : ''), 'Projeto preliminar']));
      lista((pl.prototipo || {}).rodadas).concat(lista((pl.prototipo || {}).ciclo)).forEach((x, k) => x && x.imagem && ims.push([x.imagem, 'Protótipo' + (t(x.nome || x.titulo) ? ' — ' + t(x.nome || x.titulo) : ` ${k + 1}`), 'Projeto preliminar']));
      const mapa = (pc.arquivosImagens) || {};
      for (const [id, leg, orig] of ims) {
        let b = await imagemDoNavegador(id);
        if (!b && zip) { const n = mapa[id] || Object.keys(zip.files).find((f) => f.startsWith('imagens/' + id + '.')); if (n && zip.file(n)) b = await zip.file(n).async('blob'); }
        add('pc:' + id, leg, orig, b);
      }
    }
    // figuras das macroentregas do conceitual e do preliminar
    const et = (p.produto && p.produto.etapas) || {};
    for (const [k, nomeEt] of [['conceitual', 'Projeto conceitual'], ['preliminar', 'Projeto preliminar']]) {
      for (const uid of lista((et[k] || {}).macros)) {
        const m = p.macroentregas.find((x) => x.uid === uid); if (!m) continue;
        for (const f of lista(m.figuras)) {
          if (!/\.(png|jpe?g|svg|gif|webp)$/i.test(f.arquivo || '')) continue;
          let b = null; try { b = App.arm ? await App.arm.lerArquivo(f.arquivo) : null; } catch (e) { b = null; }
          add('mf:' + f.arquivo, t(f.titulo) || f.arquivo.split('/').pop(), `${nomeEt} (macroentrega ${m.numero})`, b);
        }
      }
    }
    return out;
  };
  /** Tamanho da figura no app de patentes (largura 1000, proporção da imagem). */
  function tamanho(url) {
    return new Promise((ok) => {
      const i = new Image();
      i.onload = () => { const w0 = i.naturalWidth || 1000, h0 = i.naturalHeight || 600; ok({ w: 1000, h: Math.max(200, Math.min(2000, Math.round(1000 * h0 / w0))) }); };
      i.onerror = () => ok({ w: 1000, h: 600 });
      i.src = url;
    });
  }

  // ================================================================== pré-preenchimento completo
  Ideias.paraPedidoCompleto = async function (p, i, figs) {
    const o = Ideias.paraPedido(p, i), ped = o.pedido;
    // resumo do projeto e plano de trabalho como fontes do pedido
    ped.fontes.push({ id: 'fgp-resumo', nome: `Resumo do projeto "${t(p.projeto.nome) || 'sem nome'}" (Gestão: funções, concepção, preliminar, quadro de especificações)`, tipo: 'texto', ativa: true, data: hojeISO(), texto: Ideias.resumoProjeto(p) });
    const pt = p.planoTrabalho || {};
    if (t(pt.texto)) {
      ped.fontes.push({ id: 'fgp-plano', nome: `Plano de trabalho EMBRAPII${t(pt.nome) ? ` (${t(pt.nome)})` : ''}`, tipo: 'texto', ativa: true, data: t(pt.data) || hojeISO(), texto: t(pt.texto) });
      const d = Ideias.dadosDoPlano(pt.texto), u = ped.universidade;
      const put = (k, v) => { if (!t(u[k]) && t(v)) u[k] = t(v).slice(0, 2000); };
      if (t(d.titulo)) u.tituloProjeto = t(d.titulo);
      put('cadastroProjeto', d.codigo); put('objetoProjeto', d.objetivo);
      if (t(d.empresa)) { u.parceria = 'Sim'; put('parceriaDetalhe', d.empresa); u.empresasInteressadas = 'Sim'; put('empresasInteressadasQuais', d.empresa); }
      put('contexto', d.justificativa);
      if (!t(ped.ficha.problema) && t(d.justificativa)) ped.ficha.problema = t(d.justificativa).slice(0, 2000);
    }
    if (!t(ped.ficha.ensaios)) ped.ficha.ensaios = Ideias.ensaiosDoQuadro(p);
    // figuras escolhidas
    const fora = new Set(lista(i.figurasFora)), legs = i.figurasLeg || {};
    const usar = lista(figs).filter((f) => !fora.has(f.chave));
    ped.desenhos = []; o.figuras = {};
    for (let k = 0; k < usar.length; k++) {
      const f = usar[k], url = await blobUrl(f.blob); if (!url) continue;
      const img = 'gp_fig_' + (k + 1), tam = await tamanho(url);
      o.figuras[img] = url;
      ped.desenhos.push({ id: 'gpd' + (k + 1), legenda: t(legs[f.chave]) || f.legenda, img, w: tam.w, h: tam.h, elementos: [] });
    }
    return o;
  };

  // ================================================================== tela
  App.figurasIdeia = null; // { projeto, lista: [{ chave, legenda, origem, blob, url }] }
  Ideias.htmlPlano = function () {
    const pt = App.p.planoTrabalho || {}, d = t(pt.texto) ? Ideias.dadosDoPlano(pt.texto) : {};
    const achados = [['titulo', 'título'], ['codigo', 'código'], ['empresa', 'empresa'], ['objetivo', 'objetivo'], ['justificativa', 'justificativa/problema']].filter(([k]) => t(d[k])).map(([, r]) => r);
    return `<div class="cartao"><h3 style="margin-top:0">📎 Plano de trabalho EMBRAPII</h3>
      <p class="muted" style="margin-top:0">Anexe o plano de trabalho do projeto (.docx; em PDF, anexe e cole o texto). Ele vai como fonte em todo pré-preenchimento de patente e preenche os dados do projeto nos formulários da universidade (título, código, objeto, empresa parceira, contexto).</p>
      <div class="barra"><label class="btn">📎 Anexar plano (.docx, .pdf, .txt)<input type="file" id="arqPlanoTrabalho" accept=".docx,.pdf,.txt,.md" hidden></label>
        ${t(pt.texto) ? '<button class="btn" data-acao="plano-preencher-projeto" title="Completa só os campos vazios do projeto">🪄 Completar o projeto com o plano</button><button class="btn perigo" data-acao="plano-tirar">Tirar o plano</button>' : ''}</div>
      ${t(pt.nome) || t(pt.arquivo) ? `<p>Anexado: <b>${esc(pt.nome || pt.arquivo)}</b>${pt.data ? ` <span class="muted">(${esc(pt.data.split('-').reverse().join('/'))})</span>` : ''}${t(pt.texto) ? ` · ${Math.round(t(pt.texto).length / 100) / 10} mil caracteres · encontrados: ${achados.length ? esc(achados.join(', ')) : '<span class="gap-neg">nenhum rótulo conhecido (o texto vai inteiro como fonte)</span>'}` : ' · <span class="gap-neg">sem texto: cole abaixo</span>'}</p>` : ''}
      ${App.campo('planoTrabalho.texto', 'Texto do plano (lido do .docx ou colado do PDF)', { tipo: 'textarea', classe: 'largo', linhas: t(pt.texto) ? 4 : 2, render: true })}</div>`;
  };
  Ideias.htmlFiguras = function (i, k) {
    const F = App.figurasIdeia && App.figurasIdeia.projeto === App.p.id ? App.figurasIdeia.lista : null;
    const fora = new Set(lista(i.figurasFora)), legs = i.figurasLeg || {};
    let h = `<h4>Figuras para o pedido (diagramas de funções, concepção, projeto preliminar)</h4>
      <div class="barra"><button class="btn pequeno" data-acao="ideia-figuras" data-i="${k}">🔎 ${F ? 'Procurar de novo' : 'Procurar as figuras do projeto'}</button></div>`;
    if (!F) return h + '<p class="muted">As figuras são procuradas também ao gerar o pré-preenchimento: entram todas as encontradas (aqui dá para escolher e mudar as legendas).</p>';
    if (!F.length) return h + '<p class="vazio">Nenhuma figura encontrada. Abra as seções do projeto conceitual e preliminar (ou anexe o ZIP do Projeto Conceitual) e procure de novo.</p>';
    h += '<div class="ideia-figs">' + F.map((f) => `<label class="ideia-fig${fora.has(f.chave) ? ' fora' : ''}"><img src="${f.url}" alt="">
      <span><input type="checkbox" data-fig-usar="1" data-i="${k}" data-chave="${esc(f.chave)}"${fora.has(f.chave) ? '' : ' checked'}> usar <small class="muted">${esc(f.origem)}</small></span>
      <input type="text" data-acao-input="ideia-fig-leg" data-i="${k}" data-chave="${esc(f.chave)}" value="${esc(legs[f.chave] || f.legenda)}" title="Legenda da figura no pedido"></label>`).join('') + '</div>';
    return h;
  };
  async function procurar() {
    if (App.figurasIdeia) App.figurasIdeia.lista.forEach((f) => URL.revokeObjectURL(f.url));
    const L = await Ideias.figurasDoProjeto(App.p);
    L.forEach((f) => { f.url = URL.createObjectURL(f.blob); });
    App.figurasIdeia = { projeto: App.p.id, lista: L };
    return L;
  }
  App.acoes['ideia-figuras'] = async () => { const L = await procurar(); App.render(); App.toast(L.length ? `${L.length} figura(s) encontrada(s).` : 'Nenhuma figura encontrada.', L.length ? 'ok' : 'aviso'); };
  document.addEventListener('change', (ev) => {
    const el = ev.target; if (!el.matches || !el.matches('input[data-fig-usar]') || !App.p) return;
    const i = App.p.ideiasPatente[+el.dataset.i], s = new Set(lista(i.figurasFora));
    if (el.checked) s.delete(el.dataset.chave); else s.add(el.dataset.chave);
    i.figurasFora = [...s]; App.marcarSujo(true); el.closest('.ideia-fig').classList.toggle('fora', !el.checked);
  });
  document.addEventListener('input', (ev) => {
    const el = ev.target; if (!el.matches || !el.matches('[data-acao-input="ideia-fig-leg"]') || !App.p) return;
    const i = App.p.ideiasPatente[+el.dataset.i]; if (!i) return;
    i.figurasLeg = Object.assign({}, i.figurasLeg, { [el.dataset.chave]: el.value }); App.marcarSujo(true);
  });
  document.addEventListener('change', async (ev) => {
    if (!ev.target || ev.target.id !== 'arqPlanoTrabalho') return;
    const arq = ev.target.files[0]; ev.target.value = ''; if (!arq || !App.p) return;
    const cam = 'documentos/plano-de-trabalho' + (arq.name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
    try { await App.arm.gravarArquivo(cam, arq); } catch (e) { /* o texto ainda serve */ }
    let lido = null, erro = '';
    try { lido = await Ideias.lerPlano(arq); } catch (e) { erro = e.message; }
    App.p.planoTrabalho = { nome: arq.name, arquivo: cam, data: hojeISO(), texto: lido ? (window.Plano ? Plano.semPessoais(t(lido.texto)) : t(lido.texto)) : t((App.p.planoTrabalho || {}).texto) };
    App.marcarSujo(true); App.render();
    App.toast(erro ? esc(erro) : 'Plano de trabalho anexado. Ele vai como fonte nos pré-preenchimentos de patente.', erro ? 'aviso' : 'ok', 9000);
  });
  App.acoes['plano-tirar'] = () => { if (!confirm('Tirar o plano de trabalho do projeto?')) return; App.p.planoTrabalho = { nome: '', arquivo: '', data: '', texto: '' }; App.marcarSujo(true); App.render(); };
  App.acoes['plano-preencher-projeto'] = () => {
    const d = Ideias.dadosDoPlano((App.p.planoTrabalho || {}).texto), pj = App.p.projeto, feito = [];
    const put = (k, v, rot) => { if (!t(pj[k]) && t(v)) { pj[k] = t(v); feito.push(rot); } };
    put('nome', d.titulo, 'nome'); put('codigo', d.codigo, 'código'); put('empresaParceira', d.empresa, 'empresa parceira');
    put('objetivoGeral', d.objetivo, 'objetivo geral'); put('introducao', d.justificativa, 'introdução');
    if (feito.length) { App.marcarSujo(true); App.atualizarTopo(); App.render(); }
    App.toast(feito.length ? 'Completado com o plano: ' + esc(feito.join(', ')) + '. Confira na aba Projeto.' : 'Nada a completar: os campos já têm texto ou o plano não tem esses rótulos.', feito.length ? 'ok' : '', 8000);
  };
  /** Gera o pré-preenchimento completo (com figuras, resumo e plano). */
  App.acoes['ideia-json'] = async (el) => {
    const i = App.p.ideiasPatente[+el.dataset.i];
    if (!t(i.titulo)) { App.toast('Dê um título à ideia antes de gerar o pré-preenchimento.', 'erro', 6000); return; }
    App.toast('Montando o pré-preenchimento (figuras, resumo do projeto, plano de trabalho)…', '', 4000);
    let figs = App.figurasIdeia && App.figurasIdeia.projeto === App.p.id ? App.figurasIdeia.lista : null;
    if (!figs) { try { figs = await procurar(); } catch (e) { figs = []; } }
    const o = await Ideias.paraPedidoCompleto(App.p, i, figs);
    const blob = new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = Ideias.nomeArquivo(i); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    i.exportadaEm = hojeISO(); if (i.situacao === 'ideia') i.situacao = 'redacao';
    App.marcarSujo(true); App.render();
    const falta = Ideias.faltando(i);
    App.toast(`Pré-preenchimento gerado com ${o.pedido.desenhos.length} figura(s)${t((App.p.planoTrabalho || {}).texto) ? ' e o plano de trabalho' : ''}. No Apoio à Escrita de Patentes: 📂 Continuar um pedido → escolha "${esc(Ideias.nomeArquivo(i))}".${falta.length ? ' Ainda falta: ' + esc(falta.join(', ')) + '.' : ''}`, 'ok', 12000);
  };
})();
