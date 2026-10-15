/* Figuras e tabelas no padrão ABNT: numeração, prévia e operações das tabelas (usadas pelos blocos das macroentregas). */
'use strict';

App.SECOES = Nucleo.SECOES;
/** Mesma regra dos PDFs: numera por seção (na ordem do relatório) e depois pela ordem da lista. */
App.numerarAbnt = (m) => Nucleo.numerar(App.p, [m]);

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
