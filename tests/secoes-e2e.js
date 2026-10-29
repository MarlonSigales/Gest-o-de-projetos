/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/**
 * Teste de ponta a ponta das seções (QFD, conceitual e preliminar dentro do Gestão) — todoQA 76.
 * Precisa das três pastas lado a lado (gest-o-de-projetos, qfd, projetoconceitual) e do Playwright:
 *   cd <pasta que tem as três> && node gest-o-de-projetos/tests/secoes-e2e.js
 */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.resolve(__dirname, '..', '..'), PORTA = 8799;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.zip': 'application/zip' };
const servidor = http.createServer((req, res) => {
  const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
const falhas = [];
const ok = (c, msg) => { console.log((c ? '✓ ' : '✗ ') + msg); if (!c) falhas.push(msg); };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await new Promise((r) => servidor.listen(PORTA, r));
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }), pg = await ctx.newPage();
  const erros = []; pg.on('pageerror', (e) => erros.push(e.message)); pg.on('dialog', (d) => d.accept());
  const entrar = async (p) => {
    await p.goto(`http://localhost:${PORTA}/gest-o-de-projetos/index.html`); await espera(2000);
    if (await p.$('#modal:not(.oculto) input')) { const i = await p.$$('#modalCorpo input'); await i[0].fill('Teste'); await i[1].fill('teste@exemplo.com'); await p.click('#modalCorpo button'); await espera(800); }
    await p.evaluate(async () => { await App.acoes['carregar-exemplo'](); }); await espera(1500); await p.evaluate(() => App.fecharModal());
  };
  try {
    await entrar(pg);
    await pg.evaluate(() => { App.aba = 'produto'; App.etapaSel = 'informacional'; App.render(); }); await espera(800);
    ok(await pg.evaluate(() => $$('.app-secao.recolhida').length > 0 && !$$('.app-secao:not(.recolhida)').length), 'seções começam recolhidas');
    await pg.evaluate(() => App.irParaSecao('qfd', 'requisitos-projeto')); await espera(6000);
    ok(await pg.evaluate(() => !!App.secoes.frames['qfd:requisitos-projeto'] && App.secoes.frames['qfd:requisitos-projeto'].carregado), 'seção do QFD carrega ao abrir');
    ok(await pg.evaluate(() => /%/.test($('#sec-qfd-requisitos-projeto .sec-topo').innerText)), 'percentual no título');
    const f = pg.frames().find((x) => /requisitos-projeto/.test(x.url()));
    await f.evaluate(() => { const d = qfdDB.loadData(); d.requisitosProjeto[0].descricao += ' [e2e]'; qfdDB.saveData(d); }); await espera(2500);
    ok(await pg.evaluate(() => App.p.qualidade.some((x) => /\[e2e\]/.test(x.requisito))), 'QFD → Qualidade sem importar');
    await pg.evaluate(() => { App.etapaSel = 'conceitual'; App.render(); }); await espera(300);
    await pg.evaluate(() => App.irParaSecao('pc', 'concepcao')); await espera(8000);
    const fp = pg.frames().find((x) => /projetoconceitual/.test(x.url()) && /concepcao/.test(x.url()));
    await fp.evaluate(() => { const v = PC.p.variantes.find((x) => x.id === PC.p.concepcao.varianteId); v.nome += ' [e2e]'; PC.salvar('e2e'); }); await espera(3000);
    ok(await pg.evaluate(() => App.p.produto.etapas.conceitual.concepcoes.some((x) => /\[e2e\]/.test(x.nome))), 'conceitual → Gestão sem importar');
    ok(await pg.evaluate(() => $$('.cartao.so-leitura').length >= 3), 'quadros do Gestão alimentados pelas seções só para leitura');
    await pg.evaluate(async () => { await App.salvar(); }); await espera(2500); await pg.evaluate(() => App.fecharModal());
    ok(await pg.evaluate(() => (App.p.produto.etapas.conceitual.anexos || []).some((a) => /conceitual/.test(a.arquivo))), 'ZIP do conceitual anexo ao salvar');
    ok(await pg.evaluate(() => !!App.p.produto.pcDados), 'projeto conceitual guardado no JSON (pcDados)');
    const pg2 = await ctx.newPage(); pg2.on('dialog', (d) => d.accept()); await entrar(pg2);
    await pg2.evaluate(() => { App.aba = 'produto'; App.etapaSel = 'informacional'; App.render(); }); await espera(2500);
    ok(await pg2.evaluate(() => !!App.secoes.bloqueado), 'segunda aba fica parada (trava)');
    for (const fase of ['detalhado', 'producao', 'lancamento', 'validacao']) {
      ok(await pg.evaluate((fs) => { App.aba = 'produto'; App.etapaSel = fs; App.render(); return $$('#conteudo .cartao.passo').length >= 6 && !/Entrada da fase/.test($('#conteudo').innerText); }, fase), `passos em ${fase}, sem "Entrada da fase"`);
    }
    ok(!erros.length, 'sem erros de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
  } catch (e) { ok(false, 'execução: ' + e.message); }
  await b.close(); servidor.close();
  console.log(falhas.length ? `${falhas.length} falha(s)` : 'tudo ok');
  process.exit(falhas.length ? 1 : 0);
})();
