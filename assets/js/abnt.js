/* Figuras e tabelas no padrão ABNT (editor usado dentro de cada macroentrega). */
'use strict';

App.SECOES = Nucleo.SECOES;
/** Mesma regra dos PDFs: numera por seção (na ordem do relatório) e depois pela ordem da lista. */
App.numerarAbnt = (m) => Nucleo.numerarAbnt([m]);

App.editorFiguras = function (mi) {
  const m = App.p.macroentregas[mi];
  const num = App.numerarAbnt(m);
  const base = `macroentregas.${mi}.figuras`;
  let h = `<div class="barra"><label class="btn primario">+ Inserir figura (PNG, JPG ou SVG até ${CONFIG.uploadMaxMb} MB)
    <input type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" multiple hidden data-upload-fig="${mi}"></label>
    <span class="muted">As imagens ficam em <b>figuras/</b>, junto do JSON do projeto.</span></div>`;
  if (!m.figuras.length) return h + '<p class="vazio">Nenhuma figura nesta macroentrega.</p>';
  h += '<div class="lista-figs">';
  m.figuras.forEach((f, i) => {
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
  if (!m.tabelas.length) return h + '<p class="vazio">Nenhuma tabela nesta macroentrega.</p>';
  m.tabelas.forEach((t, ti) => {
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
