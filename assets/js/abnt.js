/* Figuras e tabelas no padrão ABNT (editor usado dentro de cada macroentrega). */
'use strict';

App.SECOES = Nucleo.SECOES;
/** Mesma regra dos PDFs: numera por seção (na ordem do relatório) e depois pela ordem da lista. */
App.numerarAbnt = (m) => Nucleo.numerar(App.p, [m]);

App.editorFiguras = function (mi) {
  const m = App.p.macroentregas[mi];
  const num = App.numerarAbnt(m);
  const base = `macroentregas.${mi}.figuras`;
  let h = `<div class="barra"><label class="btn primario">+ Inserir figura (PNG, JPG ou SVG até ${CONFIG.uploadMaxMb} MB)
    <input type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" multiple hidden data-upload-fig="${mi}"></label>
    <span class="muted">As imagens ficam em <b>figuras/</b>, junto do JSON do projeto.</span></div>`;
  const refs = Nucleo.refsBlocos(m), nBl = m.figuras.filter((f) => refs.fig.has(f.id)).length;
  if (nBl) h += `<p class="muted">${nBl} figura(s) estão nos blocos do desenvolvimento (editadas lá).</p>`;
  if (m.figuras.length === nBl) return h + (nBl ? '' : '<p class="vazio">Nenhuma figura nesta macroentrega.</p>');
  h += '<div class="lista-figs">';
  m.figuras.forEach((f, i) => {
    if (refs.fig.has(f.id)) return;
    h += `<div class="fig-card">
      <div class="leg">Figura ${num.fig[f.id] ?? '?'} – ${esc(f.titulo || '(sem título)')}</div>
      <div class="prev"><img data-fig="${esc(f.arquivo)}" alt=""></div>
      <div class="muted" style="text-align:center">Fonte: ${esc(f.fonte || 'Elaborado pelos autores (' + new Date().getFullYear() + ')')}.</div>
      ${App.campo(`${base}.${i}.titulo`, 'Título (acima da figura)', { render: false })}
      ${App.campo(`${base}.${i}.fonte`, 'Fonte (abaixo da figura)')}
      ${App.campo(`${base}.${i}.secao`, 'Seção do relatório', { tipo: 'select', opcoes: App.SECOES, render: true })}
      <div class="barra" style="margin:4px 0 0">
        <span class="marcador" data-acao="copiar" data-texto="{{fig:${esc(f.id)}}}" title="Clique para copiar e cole no texto">{{fig:${esc(f.id)}}}</span>
        <button class="btn pequeno" data-acao="mover" data-lista="${base}" data-i="${i}" data-d="-1" title="Mover para cima">↑</button>
        <button class="btn pequeno" data-acao="mover" data-lista="${base}" data-i="${i}" data-d="1" title="Mover para baixo">↓</button>
        <button class="btn pequeno perigo" data-acao="rem-figura" data-mi="${mi}" data-i="${i}">Remover</button>
      </div></div>`;
  });
  return h + '</div>';
};

App.editorTabelas = function (mi) {
  const m = App.p.macroentregas[mi];
  const num = App.numerarAbnt(m);
  const base = `macroentregas.${mi}.tabelas`;
  let h = `<div class="barra"><button class="btn primario" data-acao="add-tabela" data-mi="${mi}">+ Nova tabela</button>
    <span class="muted">Padrão IBGE/ABNT: título acima, fonte abaixo, sem bordas laterais.</span></div>`;
  const refs = Nucleo.refsBlocos(m), nBl = m.tabelas.filter((t) => refs.tab.has(t.id)).length;
  if (nBl) h += `<p class="muted">${nBl} tabela(s) estão nos blocos do desenvolvimento (editadas lá).</p>`;
  if (m.tabelas.length === nBl) return h + (nBl ? '' : '<p class="vazio">Nenhuma tabela nesta macroentrega.</p>');
  m.tabelas.forEach((t, ti) => {
    if (refs.tab.has(t.id)) return;
    const p = `${base}.${ti}`;
    const nc = Math.max(1, t.cabecalho.length);
    h += `<div class="tab-card"><div class="grade-campos">
      ${App.campo(`${p}.titulo`, 'Título (acima da tabela)')}
      ${App.campo(`${p}.fonte`, 'Fonte (abaixo da tabela)', { ph: 'Elaborado pelos autores (' + new Date().getFullYear() + ')' })}
      ${App.campo(`${p}.secao`, 'Seção do relatório', { tipo: 'select', opcoes: App.SECOES, render: true })}</div>
      <div class="rolagem"><table class="grade-tabela"><thead><tr>${t.cabecalho.map((c, k) => `<th>${App.campo(`${p}.cabecalho.${k}`, '')}</th>`).join('')}</tr></thead><tbody>`;
    t.linhas.forEach((l, r) => {
      h += '<tr>' + Array.from({ length: nc }, (_, k) => { if (l[k] === undefined) l[k] = ''; return `<td>${App.campo(`${p}.linhas.${r}.${k}`, '')}</td>`; }).join('') + '</tr>';
    });
    h += `</tbody></table></div>
      <div class="barra">
        <button class="btn pequeno" data-acao="tab-op" data-p="${p}" data-op="+l">+ linha</button>
        <button class="btn pequeno" data-acao="tab-op" data-p="${p}" data-op="-l">− linha</button>
        <button class="btn pequeno" data-acao="tab-op" data-p="${p}" data-op="+c">+ coluna</button>
        <button class="btn pequeno" data-acao="tab-op" data-p="${p}" data-op="-c">− coluna</button>
        <button class="btn pequeno" data-acao="tab-colar" data-p="${p}">Colar do Excel/CSV</button>
        <button class="btn pequeno" data-acao="tab-previa" data-mi="${mi}" data-ti="${ti}">Prévia ABNT</button>
        <span class="marcador" data-acao="copiar" data-texto="{{tab:${esc(t.id)}}}" title="Clique para copiar">{{tab:${esc(t.id)}}}</span>
        <span class="muted">Tabela ${num.tab[t.id] ?? '?'}</span>
        <button class="btn pequeno" data-acao="mover" data-lista="${base}" data-i="${ti}" data-d="-1">↑</button>
        <button class="btn pequeno" data-acao="mover" data-lista="${base}" data-i="${ti}" data-d="1">↓</button>
        <button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${base}" data-i="${ti}">Remover tabela</button>
      </div></div>`;
  });
  return h;
};

App.previaTabela = function (t, n) {
  return `<div class="prev-abnt"><div class="leg">Tabela ${n} – ${esc(t.titulo)}</div><table><thead><tr>${t.cabecalho.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${t.linhas.map((l) => `<tr>${t.cabecalho.map((_, k) => `<td>${esc(l[k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="fonte">Fonte: ${esc((t.fonte || 'Elaborado pelos autores (' + new Date().getFullYear() + ')').replace(/\.$/, ''))}.</div></div>`;
};

// ------------------------------------------------------------------ ações
App.acoes['mover'] = (el) => {
  const l = App.get(el.dataset.lista), i = +el.dataset.i, j = i + (+el.dataset.d);
  if (!l || j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]];
  App.marcarSujo(true); App.render();
};

App.acoes['rem-figura'] = async (el) => {
  const m = App.p.macroentregas[+el.dataset.mi];
  const f = m.figuras[+el.dataset.i];
  if (!confirm('Remover a figura "' + (f.titulo || f.arquivo) + '"? O arquivo também será apagado da pasta figuras/.')) return;
  m.figuras.splice(+el.dataset.i, 1);
  const emUso = App.p.macroentregas.some((x) => x.figuras.some((g) => g.arquivo === f.arquivo));
  if (!emUso) { try { await App.arm.removerArquivo(f.arquivo); } catch (e) { /* ignora */ } App.figUrl.delete(f.arquivo); }
  App.marcarSujo(true); App.render();
};

App.acoes['add-tabela'] = (el) => {
  const m = App.p.macroentregas[+el.dataset.mi];
  let n = 0;
  App.p.macroentregas.forEach((x) => x.tabelas.forEach((t) => { const k = String(t.id).match(/(\d+)$/); if (k) n = Math.max(n, +k[1]); }));
  m.tabelas.push({ id: 'tab_' + String(n + 1).padStart(3, '0'), titulo: '', fonte: '', secao: 'resultados', cabecalho: ['Coluna 1', 'Coluna 2'], linhas: [['', '']] });
  App.marcarSujo(true); App.render();
};

App.acoes['tab-op'] = (el) => {
  const t = App.get(el.dataset.p);
  const op = el.dataset.op;
  if (op === '+l') t.linhas.push(t.cabecalho.map(() => ''));
  if (op === '-l' && t.linhas.length > 1) t.linhas.pop();
  if (op === '+c') { t.cabecalho.push('Coluna ' + (t.cabecalho.length + 1)); t.linhas.forEach((l) => l.push('')); }
  if (op === '-c' && t.cabecalho.length > 1) { t.cabecalho.pop(); t.linhas.forEach((l) => l.pop()); }
  App.marcarSujo(true); App.render();
};

App.acoes['tab-colar'] = (el) => {
  App.modal(`<h2>Colar dados na tabela</h2><p class="muted">Cole aqui as células copiadas do Excel/LibreOffice (separadas por tabulação) ou um CSV (; ou ,). A primeira linha vira o cabeçalho.</p>
    <textarea id="txtColar" rows="12" style="font-family:monospace"></textarea>
    <div class="barra"><button class="btn primario" data-acao="tab-colar-ok" data-p="${esc(el.dataset.p)}">Substituir conteúdo da tabela</button></div>`);
  setTimeout(() => $('#txtColar').focus(), 50);
};
App.acoes['tab-colar-ok'] = (el) => {
  const txt = $('#txtColar').value.replace(/\r/g, '').trim();
  if (!txt) return;
  const linhas = txt.split('\n');
  const sep = linhas[0].includes('\t') ? '\t' : (linhas[0].includes(';') ? ';' : ',');
  const dados = linhas.map((l) => l.split(sep).map((c) => c.trim().replace(/^"(.*)"$/, '$1')));
  const nc = Math.max(...dados.map((d) => d.length));
  const t = App.get(el.dataset.p);
  t.cabecalho = Array.from({ length: nc }, (_, k) => dados[0][k] ?? '');
  t.linhas = dados.slice(1).map((d) => Array.from({ length: nc }, (_, k) => d[k] ?? ''));
  if (!t.linhas.length) t.linhas = [t.cabecalho.map(() => '')];
  App.fecharModal(); App.marcarSujo(true); App.render();
};
App.acoes['tab-previa'] = (el) => {
  const m = App.p.macroentregas[+el.dataset.mi];
  const t = m.tabelas[+el.dataset.ti];
  App.modal('<h2>Prévia no padrão ABNT</h2>' + App.previaTabela(t, App.numerarAbnt(m).tab[t.id]));
};

// upload de figuras (delegado): grava direto em figuras/ (pasta ou navegador)
App.proximoArquivoFigura = async function (ext) {
  let n = 0;
  App.p.macroentregas.forEach((m) => m.figuras.forEach((f) => { const k = String(f.id).match(/(\d+)$/); if (k) n = Math.max(n, +k[1]); }));
  for (;;) {
    n++;
    const id = 'fig_' + String(n).padStart(3, '0');
    const arquivo = `figuras/${id}.${ext}`;
    if (!(await App.arm.lerArquivo(arquivo))) return { id, arquivo };
  }
};

document.addEventListener('change', async (ev) => {
  const inp = ev.target.closest('input[data-upload-fig]');
  if (!inp) return;
  const mi = +inp.dataset.uploadFig;
  for (const arq of Array.from(inp.files || [])) {
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg' }[arq.type] || (arq.name.match(/\.(png|jpe?g|svg)$/i) || [])[1];
    if (!ext) { App.toast(esc(arq.name) + ': use PNG, JPG ou SVG.', 'erro'); continue; }
    if (arq.size > CONFIG.uploadMaxMb * 1048576) { App.toast(esc(arq.name) + ': maior que ' + CONFIG.uploadMaxMb + ' MB.', 'erro'); continue; }
    if (ext === 'svg' && /<script|\son\w+\s*=|javascript:/i.test(await arq.text())) { App.toast(esc(arq.name) + ': SVG com script não é permitido.', 'erro'); continue; }
    try {
      const { id, arquivo } = await App.proximoArquivoFigura(ext === 'jpeg' ? 'jpg' : ext.toLowerCase());
      await App.arm.gravarArquivo(arquivo, arq);
      const titulo = arq.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      App.p.macroentregas[mi].figuras.push({ id, arquivo, titulo, fonte: 'Elaborado pelos autores (' + new Date().getFullYear() + ')', secao: 'resultados' });
      App.marcarSujo(true);
    } catch (e) { App.toast(esc(arq.name) + ': ' + esc(e.message), 'erro'); }
  }
  inp.value = '';
  App.render();
});

// ------------------------------------------------------------------ menu lateral: + Figura / + Tabela
App.destinoPadrao = () => Math.min(App.macroSel || 0, Math.max(0, App.p.macroentregas.length - 1));
App.seletorDestino = (prefixo) => `<div class="grade-campos">
  <label class="campo">Macroentrega<select id="${prefixo}Macro">${App.opcoes(App.p.macroentregas.map((m, i) => [i, `${i + 1} · ${m.titulo || '(sem título)'}`]), App.destinoPadrao())}</select></label>
  <label class="campo">Seção do relatório<select id="${prefixo}Secao">${App.opcoes(App.SECOES, 'resultados')}</select></label></div>`;

/** "+ Figura": abre direto a caixa para importar a imagem; depois pede título, fonte, macroentrega e seção. */
App.acoes['nova-figura'] = () => {
  if (!App.p) { App.toast('Abra um projeto primeiro.'); return; }
  if (!App.p.macroentregas.length) App.p.macroentregas.push(Nucleo.novaMacro(1));
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml';
  inp.onchange = () => {
    const arq = inp.files[0];
    if (!arq) return;
    App._novaFig = arq;
    const url = URL.createObjectURL(arq);
    App.modal(`<h2>Nova figura</h2>
      <div class="prev-abnt"><div class="leg" id="nfLeg">Figura – ${esc(arq.name.replace(/\.[^.]+$/, ''))}</div><img src="${url}" style="max-width:100%;max-height:300px"></div>
      ${App.seletorDestino('nf')}
      <div class="grade-campos"><label class="campo largo">Título (acima da figura)<input id="nfTitulo" value="${esc(arq.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))}"></label>
      <label class="campo largo">Fonte (abaixo da figura)<input id="nfFonte" value="Elaborado pelos autores (${new Date().getFullYear()})"></label></div>
      <div class="barra"><button class="btn primario" data-acao="nova-figura-ok">Inserir figura</button><button class="btn" data-acao="nova-figura">Escolher outra imagem</button></div>`);
    $('#nfTitulo').addEventListener('input', (e) => { $('#nfLeg').textContent = 'Figura – ' + e.target.value; });
  };
  inp.style.display = 'none'; document.body.appendChild(inp); // Safari só dispara o change de inputs que estão no documento
  inp.addEventListener('change', () => setTimeout(() => inp.remove(), 0));
  inp.click();
};
App.acoes['nova-figura-ok'] = async () => {
  const arq = App._novaFig;
  if (!arq) return;
  const mi = +$('#nfMacro').value, secao = $('#nfSecao').value, titulo = $('#nfTitulo').value.trim(), fonte = $('#nfFonte').value.trim();
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg' }[arq.type] || ((arq.name.match(/\.(png|jpe?g|svg)$/i) || [])[1] || '').toLowerCase().replace('jpeg', 'jpg');
  if (!ext) { App.toast('Use PNG, JPG ou SVG.', 'erro'); return; }
  if (arq.size > CONFIG.uploadMaxMb * 1048576) { App.toast('Arquivo maior que ' + CONFIG.uploadMaxMb + ' MB.', 'erro'); return; }
  try {
    const { id, arquivo } = await App.proximoArquivoFigura(ext);
    await App.arm.gravarArquivo(arquivo, arq);
    App.p.macroentregas[mi].figuras.push({ id, arquivo, titulo, fonte, secao });
    App._novaFig = null;
    App.marcarSujo(true); App.fecharModal();
    App.aba = 'macros'; App.macroSel = mi; App.render();
    const card = $$('.fig-card').pop(); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    App.toast(`Figura inserida na macroentrega ${mi + 1}. Cite no texto com {{fig:${id}}}.`, 'ok', 7000);
  } catch (e) { App.toast('Figura: ' + esc(e.message), 'erro'); }
};

/** "+ Tabela": pergunta destino, título, fonte e tamanho; cria e leva ao editor. */
App.acoes['nova-tabela'] = () => {
  if (!App.p) { App.toast('Abra um projeto primeiro.'); return; }
  if (!App.p.macroentregas.length) App.p.macroentregas.push(Nucleo.novaMacro(1));
  App.modal(`<h2>Nova tabela</h2>${App.seletorDestino('nt')}
    <div class="grade-campos"><label class="campo largo">Título (acima da tabela)<input id="ntTitulo"></label>
    <label class="campo largo">Fonte (abaixo da tabela)<input id="ntFonte" value="Elaborado pelos autores (${new Date().getFullYear()})"></label>
    <label class="campo">Colunas<input id="ntCols" type="number" min="1" max="20" value="3"></label>
    <label class="campo">Linhas (sem o cabeçalho)<input id="ntLins" type="number" min="1" max="200" value="3"></label>
    <label class="campo largo">…ou cole do Excel/CSV (1ª linha = cabeçalho)<textarea id="ntColar" rows="4" style="font-family:monospace"></textarea></label></div>
    <div class="barra"><button class="btn primario" data-acao="nova-tabela-ok">Criar tabela</button></div>`);
  setTimeout(() => { const e = $('#ntTitulo'); if (e) e.focus(); }, 50);
};
App.acoes['nova-tabela-ok'] = () => {
  const mi = +$('#ntMacro').value;
  let n = 0;
  App.p.macroentregas.forEach((x) => x.tabelas.forEach((t) => { const k = String(t.id).match(/(\d+)$/); if (k) n = Math.max(n, +k[1]); }));
  const t = { id: 'tab_' + String(n + 1).padStart(3, '0'), titulo: $('#ntTitulo').value.trim(), fonte: $('#ntFonte').value.trim(), secao: $('#ntSecao').value, cabecalho: [], linhas: [] };
  const colado = $('#ntColar').value.replace(/\r/g, '').trim();
  if (colado) {
    const ls = colado.split('\n'), sep = ls[0].includes('\t') ? '\t' : (ls[0].includes(';') ? ';' : ',');
    const d = ls.map((l) => l.split(sep).map((c) => c.trim()));
    const nc = Math.max(...d.map((x) => x.length));
    t.cabecalho = Array.from({ length: nc }, (_, k) => d[0][k] ?? '');
    t.linhas = d.slice(1).map((x) => Array.from({ length: nc }, (_, k) => x[k] ?? ''));
  } else {
    const nc = Math.max(1, +$('#ntCols').value || 3), nl = Math.max(1, +$('#ntLins').value || 3);
    t.cabecalho = Array.from({ length: nc }, (_, k) => 'Coluna ' + (k + 1));
    t.linhas = Array.from({ length: nl }, () => Array(nc).fill(''));
  }
  if (!t.linhas.length) t.linhas = [t.cabecalho.map(() => '')];
  App.p.macroentregas[mi].tabelas.push(t);
  App.marcarSujo(true); App.fecharModal();
  App.aba = 'macros'; App.macroSel = mi; App.render();
  const card = $$('.tab-card').pop(); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  App.toast(`Tabela criada na macroentrega ${mi + 1}. Cite no texto com {{tab:${t.id}}}.`, 'ok', 7000);
};
