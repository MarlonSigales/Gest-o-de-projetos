/* Aba Relatórios e Exportação: PDFs, e-mail, JSON/ZIP, importação, histórico — tudo no navegador. */
'use strict';

App.abas.relatorios = {
  render() {
    const naPasta = App.arm && App.arm.tipo === 'pasta';
    return `<h2>Relatórios e exportação</h2>
<div class="cartao"><h3 style="margin-top:0">Relatórios em PDF</h3>
  <p class="muted">Gerados no próprio navegador a partir do que está na tela (não é preciso salvar antes).${naPasta ? ' Uma cópia também é gravada em <b>relatorios/</b> na pasta do projeto.' : ''}</p>
  <div class="barra"><button class="btn primario" data-acao="pdf-geral">📊 Relatório geral de andamento</button></div>
  <div class="barra">${App.p.macroentregas.map((m, i) => `<button class="btn" data-acao="pdf-macro" data-i="${i}">📄 Macroentrega ${i + 1}${m.finalizada ? '' : ' (andamento)'}</button>`).join('')}</div>
  <p class="muted">Macroentregas em andamento geram o relatório de andamento com o texto atual; as finalizadas, o relatório da macroentrega com o termo de aceite.</p>
  ${App.campo('config.incluirAndamentoNaMacro', 'Incluir a seção "Andamento e TRL" no relatório de cada macroentrega', { tipo: 'checkbox' })}
  ${App.qfdRelatorioHtml()}
</div>

<div class="cartao"><h3 style="margin-top:0">E-mail de andamento</h3>
  <p class="muted">Disparado a cada salvamento para os interessados, com o assunto <b>andamento projeto ${esc(App.p.projeto.nome || '<nome>')}</b>. Modo atual: <b>${esc(App.descricaoModoEmail())}</b> (⚙ Configurações).</p>
  <div class="barra"><button class="btn" data-acao="email-previa">👁 Prévia do e-mail</button>
  <button class="btn" data-acao="email-reenviar" ${App.sujo ? 'disabled title="Salve antes"' : ''}>✉ Enviar agora (versão salva)</button></div>
</div>

<div class="cartao"><h3 style="margin-top:0">Exportar</h3>
  <div class="barra">
    <button class="btn" data-acao="exp-json">⬇ JSON "${esc(Nucleo.nomeArquivo(App.p))}"</button>
    <button class="btn" data-acao="exp-zip">⬇ ZIP (JSON + figuras + histórico)</button>
  </div>
  <p class="muted">O ZIP é o formato para guardar ou levar o projeto a outra máquina: o JSON e a pasta figuras/ vão juntos.${App.sujo ? ' <b>Há alterações não salvas: salve antes de exportar.</b>' : ''}</p>
</div>

<div class="cartao"><h3 style="margin-top:0">Importar projeto</h3>
  <div class="barra"><button class="btn" data-acao="ir-importar">Importar ZIP ou JSON + imagens…</button></div>
</div>

<div class="cartao"><h3 style="margin-top:0">Histórico de versões</h3>
  <p class="muted">A cada salvamento a versão anterior é guardada${naPasta ? ' em historico/ na pasta do projeto' : ' no navegador (últimas 50)'}.</p>
  <div class="barra"><button class="btn" data-acao="historico">Ver versões anteriores</button></div>
  <div id="histBox"></div>
</div>

<div class="cartao"><h3 style="margin-top:0">Registro de atividades</h3>
  <div class="rolagem" style="max-height:260px;overflow:auto"><table class="tab-edit"><thead><tr><th>Data/hora</th><th>Ação</th><th>Usuário</th></tr></thead><tbody>
  ${(App.p.log || []).slice(-100).reverse().map((l) => `<tr><td>${esc((l.dataHora || '').replace('T', ' '))}</td><td>${esc(l.acao)}</td><td>${esc(l.usuario)}</td></tr>`).join('') || '<tr><td colspan="3" class="vazio">Sem registros.</td></tr>'}
  </tbody></table></div>
</div>

${naPasta ? '' : `<div class="cartao"><h3 style="margin-top:0">Excluir projeto</h3>
  <div class="barra"><button class="btn perigo" data-acao="excluir">Excluir este projeto do navegador</button><span class="muted">Exporte o ZIP antes, se quiser guardar uma cópia.</span></div></div>`}`;
  },
};

/** Seções do QFD no relatório geral (a mesma escolha do cartão no projeto informacional). */
App.qfdRelatorioHtml = function () {
  const a = window.Qfd ? Qfd.analisar(App.p.qfdDados) : null;
  if (!a) return `<p class="muted">Análise QFD no relatório geral: nenhum QFD importado. <button class="btn pequeno" data-acao="ir-aba" data-aba="produto" data-etapa="informacional">Importar no projeto informacional</button></p>`;
  const rel = App.p.config.qfdRelatorio || [];
  return `<h4>Análise QFD no relatório geral</h4><div class="nb-checks">${Qfd.SECOES.map(([s, nome]) => { const d = Qfd.disponivel(a, s);
    return `<label class="campo rec" style="flex-direction:row;gap:8px"><input type="checkbox" data-acao="qfd-int" data-sec="${s}" data-macro="__rel" ${rel.includes(s) ? 'checked' : ''} ${d.ok ? '' : 'disabled'}> ${esc(nome)}${d.ok ? '' : ` <span class="muted">(falta no QFD)</span>`}</label>`; }).join('')}</div>`;
};

App.acoes['pdf-macro'] = async (el) => {
  const t = el.textContent; el.disabled = true; el.textContent = 'Gerando PDF…';
  try { await App.gerarPdf('macro', +el.dataset.i); } catch (e) { console.error(e); App.toast('PDF: ' + esc(e.message), 'erro', 9000); }
  finally { el.disabled = false; el.textContent = t; }
};
App.acoes['pdf-geral'] = async (el) => {
  const t = el.textContent; el.disabled = true; el.textContent = 'Gerando PDF…';
  try { await App.gerarPdf('geral'); } catch (e) { console.error(e); App.toast('PDF: ' + esc(e.message), 'erro', 9000); }
  finally { el.disabled = false; el.textContent = t; }
};

App.acoes['email-previa'] = () => {
  const an = Nucleo.analisar(App.p);
  const { html } = Email.corpo(App.p, an, App.cfg.usuario);
  const d = Nucleo.destinatarios(App.p);
  const l = (x) => x.map((r) => r.email).join(', ') || '(ninguém)';
  App.modal(`<h2>Prévia do e-mail</h2><p><b>Assunto:</b> ${esc(Email.assunto(App.p))}<br><b>Gestão</b> (ZIP completo): ${esc(l(d.gestao))}<br><b>Demais</b> (PDFs + JSON): ${esc(l(d.demais))}<br><b>Modo:</b> ${esc(App.descricaoModoEmail())}</p><div class="email-previa">${html}</div>`);
};
App.acoes['email-reenviar'] = async () => {
  try {
    const r = await App.dispararEmails(JSON.stringify(App.p, null, 2), Nucleo.nomeArquivo(App.p));
    App.toast(esc(r.mensagem), r.manual ? 'aviso' : 'ok', 8000);
  } catch (e) { App.fecharModal(); App.toast('E-mail: ' + esc(e.message), 'erro'); }
};

App.acoes['exp-json'] = () => App.baixarBlob(new Blob([JSON.stringify(App.p, null, 2)], { type: 'application/json' }), Nucleo.nomeArquivo(App.p));
App.acoes['exp-zip'] = async (el) => {
  el.disabled = true;
  try {
    if (App.sujo && !confirm('Há alterações não salvas; o ZIP terá a última versão salva. Continuar?')) return;
    const blob = await Zip.exportar(App.arm);
    App.baixarBlob(blob, 'gestão do projeto ' + Nucleo.nomeSeguro(App.p.projeto.nome) + '.zip');
  } catch (e) { App.toast('ZIP: ' + esc(e.message), 'erro'); }
  finally { el.disabled = false; }
};

App.acoes['historico'] = async () => {
  const v = await App.arm.listarHistorico();
  $('#histBox').innerHTML = v.length ? '<table class="tab-edit"><thead><tr><th>Versão</th><th>Gravada em</th><th></th></tr></thead><tbody>'
    + v.map((x) => `<tr><td>${esc(x.arquivo)}</td><td>${esc(x.data)}</td><td><button class="btn pequeno" data-acao="restaurar" data-arq="${esc(x.arquivo)}">Abrir na tela</button></td></tr>`).join('')
    + '</tbody></table>' : '<p class="vazio">Nenhuma versão anterior.</p>';
};
App.acoes['restaurar'] = async (el) => {
  if (!App.confirmarDescartar()) return;
  const p = await App.arm.lerHistorico(el.dataset.arq);
  if (!p) { App.toast('Versão não encontrada.', 'erro'); return; }
  App.carregarEstado(p, App.arm);
  App.marcarSujo(true);
  App.toast('Versão carregada na tela. Clique em Salvar para torná-la a versão atual.', 'aviso', 8000);
};

App.acoes['excluir'] = async () => {
  if (!confirm(`Excluir o projeto "${App.p.projeto.nome}" deste navegador? Isso não pode ser desfeito.`)) return;
  await App.arm.excluir();
  App.sujo = false; App.p = null; App.arm = null;
  try { localStorage.removeItem('gp-ultimo'); } catch (e) { /* ignora */ }
  $('#conteudo').innerHTML = ''; App.atualizarTopo();
  App.toast('Projeto excluído.', 'ok');
  App.telaProjetos();
};

// ------------------------------------------------------------------ importação
App.telaImportar = function () {
  const suporta = ArmazemPasta.suportado();
  App.modal(`<h2>Importar projeto</h2>
  <div class="grade-campos">
    <label class="campo">(a) Arquivo ZIP exportado<input type="file" id="impZip" accept=".zip,application/zip"></label>
    <label class="campo">(b) JSON do projeto<input type="file" id="impJson" accept=".json,application/json"></label>
    <label class="campo">… e as imagens da pasta figuras/<input type="file" id="impImgs" accept=".png,.jpg,.jpeg,.svg" multiple></label>
  </div>
  <h3>Onde guardar</h3>
  <div class="barra">
    <button class="btn primario" data-acao="importar" data-destino="pasta" ${suporta ? '' : 'disabled'}>Em uma pasta do computador…</button>
    <button class="btn" data-acao="importar" data-destino="navegador">No navegador</button>
  </div>
  <p class="muted">A importação cria um projeto novo (não sobrescreve o atual). Para a pasta, escolha uma pasta vazia.</p>`);
};

App.acoes['importar'] = async (el) => {
  const zip = $('#impZip').files[0], json = $('#impJson').files[0], imgs = Array.from($('#impImgs').files || []);
  if (!zip && !json) { App.toast('Selecione um ZIP ou um JSON.', 'aviso'); return; }
  if (!App.confirmarDescartar()) return;
  try {
    let projeto, arquivos = [];
    if (zip) ({ projeto, arquivos } = await Zip.ler(zip));
    else {
      projeto = JSON.parse(await json.text());
      if (!projeto || !projeto.projeto) throw new Error('O JSON não é um projeto deste sistema.');
      arquivos = imgs.filter((f) => /\.(png|jpe?g|svg)$/i.test(f.name)).map((f) => ({ caminho: 'figuras/' + f.name.replace(/[^A-Za-z0-9._-]/g, '_'), blob: f }));
      // reaponta figuras pelo nome do arquivo
      const nomes = new Set(arquivos.map((a) => a.caminho.split('/').pop()));
      (projeto.macroentregas || []).forEach((m) => (m.figuras || []).forEach((f) => { const b = String(f.arquivo || '').split('/').pop(); if (nomes.has(b)) f.arquivo = 'figuras/' + b; }));
    }
    projeto = Nucleo.normalizar(projeto);
    let arm;
    if (el.dataset.destino === 'pasta') {
      const h = await window.showDirectoryPicker({ id: 'gestao-projetos', mode: 'readwrite' });
      arm = new ArmazemPasta(h);
      if (!(await arm.permissao(true))) throw new Error('Permissão para a pasta negada.');
      if (await arm.lerProjeto()) throw new Error(`A pasta "${h.name}" já contém um projeto. Escolha uma pasta vazia.`);
      arm.arquivoAtual = null;
    } else {
      projeto.id = Nucleo.uid('prj');
      arm = new ArmazemNavegador(projeto.id, projeto.projeto.nome);
    }
    for (const a of arquivos) await arm.gravarArquivo(a.caminho, a.blob);
    projeto.log.push({ dataHora: Nucleo.agoraIso(), acao: 'Projeto importado', usuario: App.cfg.usuario || '' });
    await arm.gravarProjeto(projeto, JSON.stringify(projeto, null, 2));
    if (arm.tipo === 'pasta') await Recentes.lembrar(arm.h, projeto.projeto.nome);
    else try { localStorage.setItem('gp-ultimo', JSON.stringify({ tipo: 'navegador', id: arm.id })); } catch (e) { /* ignora */ }
    App.sujo = false;
    App.carregarEstado(projeto, arm);
    App.toast('Projeto importado.', 'ok');
  } catch (e) {
    if (e.name !== 'AbortError') App.toast('Importação: ' + esc(e.message), 'erro', 9000);
  }
};
