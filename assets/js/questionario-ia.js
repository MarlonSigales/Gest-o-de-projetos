/**
 * Pedido para IA pré-desenvolver as perguntas do questionário de levantamento de necessidades (todoQA 48).
 * Segue Reis (2003): necessidades dos clientes ao longo de todo o ciclo de vida do produto; Spagnolo (2011): as necessidades
 * alimentam o QFD (requisitos dos clientes, com importância); Pahl et al.: lista de verificação de requisitos (geometria,
 * cinemática, forças, energia, material, sinais, segurança, ergonomia, produção, qualidade, montagem, transporte, uso,
 * manutenção, reciclagem, custos, prazos). A resposta vem em JSON fixo ("questionario-ia") e só acrescenta perguntas novas.
 * Cabeçalho padrão timbrado EMBRAPII para o Google Forms (título e descrição prontos para colar).
 * Só acrescenta ao fim da caixa do questionário; não muda o resto.
 */
(function () {
  'use strict';
  const FORMATO = 'questionario-ia';
  const TIPOS_OK = ['identificacao', 'texto', 'escolha', 'caixas', 'escala', 'grade'];
  const CICLO = ['Projeto e fabricação', 'Montagem', 'Venda e compra', 'Transporte e armazenamento', 'Instalação e ajustes', 'Uso e operação', 'Manutenção', 'Segurança e ambiente', 'Descarte e reciclagem'];
  const t = (x) => String(x ?? '').trim();
  const cmp = (x) => t(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  function contexto(p) {
    const pj = p.projeto, c = ((p.produto || {}).etapas || {}).conceitual || {}, inf = ((p.produto || {}).etapas || {}).informacional || {};
    return {
      projeto: pj.nome, codigo: pj.codigo, empresa: pj.empresaParceira, tipo: (p.produto || {}).tipo || 'produto',
      objetivo: pj.objetivoGeral, introducao: t(pj.introducao).slice(0, 1500),
      funcaoGlobal: (c.funcaoGlobal || {}).nome || '', funcoes: (c.funcoes || []).map((f) => f.nome).filter(Boolean),
      perguntasJaExistentes: ((inf.formulario || {}).perguntas || []).map((q) => q.texto).filter(Boolean),
      fasesDoCicloDeVida: CICLO
    };
  }

  function pedido(p) {
    const ex = {
      formato: FORMATO, versao: 1, titulo: 'Levantamento de necessidades dos clientes', publico: 'quem fabrica, vende, usa, mantém e descarta',
      perguntas: [
        { texto: 'Nome:', tipo: 'identificacao' },
        { texto: 'Em que situações você usa (ou usaria) este tipo de equipamento?', tipo: 'texto', fase: 'Uso e operação' },
        { texto: 'Com que frequência faz manutenção em equipamentos semelhantes?', tipo: 'escolha', opcoes: ['A) Diariamente', 'B) Semanalmente', 'C) Mensalmente', 'D) Raramente'], fase: 'Manutenção' },
        { texto: 'Importância dos atributos (1 = sem importância … 5 = essencial)', tipo: 'grade', itens: ['Ser leve', 'Ser fácil de regular'], escala: { min: 1, max: 5, rotulos: { 1: 'Sem importância', 5: 'Essencial' } }, fase: 'Uso e operação' }
      ],
      observacoes: 'cuidados ao aplicar'
    };
    return `# Pedido: perguntas do questionário de levantamento de necessidades — responder em JSON

Você é uma equipe de projeto de produto. Monte as perguntas de um questionário para levantar as **necessidades dos clientes** do projeto abaixo, seguindo:
1. **Reis (2003)**: as necessidades vêm de todos os clientes ao longo do **ciclo de vida** do produto (projeto e fabricação, montagem, venda, transporte, instalação, uso, manutenção, segurança e ambiente, descarte). Faça perguntas para cada fase relevante e indique a fase em cada pergunta.
2. **Spagnolo (2011)**: as respostas vão virar requisitos dos clientes no **QFD**; inclua uma pergunta em grade para o cliente dar a **importância** (1 a 5) de cada atributo levantado.
3. **Pahl et al.**: use a lista de verificação de requisitos para não esquecer nada — geometria, cinemática, forças, energia, material, sinais/comandos, segurança, ergonomia, produção, controle de qualidade, montagem, transporte, uso, manutenção, reciclagem, custos e prazos.

Regras:
- Perguntas **neutras**, que não induzam uma solução ("o que incomoda ao regular?" em vez de "você quer regulagem elétrica?").
- Linguagem simples, de quem usa; uma ideia por pergunta; perguntas abertas para descobrir e fechadas (escolha, escala) para medir.
- 4 perguntas de identificação no início (nome, empresa/instituição, função, contato) — dados pessoais, tipo "identificacao".
- Entre 15 e 30 perguntas no total; não repita as já existentes.
- "tipo" somente: ${TIPOS_OK.join(', ')}. Escolha e caixas com "opcoes" em letras (A), B)…); grade com "itens" e "escala".

## Contexto do projeto
\`\`\`json
${JSON.stringify(contexto(p), null, 2)}
\`\`\`

## Formato da resposta (só este bloco JSON)
\`\`\`json
${JSON.stringify(ex, null, 2)}
\`\`\``;
  }

  function extrairJson(texto) {
    const s = String(texto || '').replace(/^\uFEFF/, '');
    const blocos = [...s.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]).reverse().concat([s]);
    for (const b of blocos) {
      const i = b.indexOf('{'), j = b.lastIndexOf('}');
      if (i < 0 || j <= i) continue;
      try { return JSON.parse(b.slice(i, j + 1)); } catch (e) { try { return JSON.parse(b.slice(i, j + 1).replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"')); } catch (e2) { /* próximo */ } }
    }
    throw new Error('Não achei um JSON válido na resposta. Copie a resposta inteira da IA (ou o bloco que começa com { e termina com }).');
  }

  /** Acrescenta as perguntas novas (mesmo texto não repete). Devolve quantas entraram. */
  function importar(f, d) {
    if (!d || !Array.isArray(d.perguntas)) throw new Error('A resposta não está no formato pedido (falta a lista "perguntas").');
    if (!t(f.titulo) && t(d.titulo)) f.titulo = t(d.titulo).slice(0, 200);
    if (!t(f.publico) && t(d.publico)) f.publico = t(d.publico).slice(0, 300);
    let n = 0;
    d.perguntas.forEach((q) => {
      const texto = t(q && q.texto);
      if (!texto || f.perguntas.some((x) => cmp(x.texto) === cmp(texto))) return;
      const tipo = TIPOS_OK.includes(q.tipo) ? q.tipo : 'texto';
      const np = Formulario.novaPergunta(Formulario.proximoId(f.perguntas, 'p'), texto.slice(0, 600), tipo);
      np.fase = t(q.fase).slice(0, 80);
      if (tipo === 'escolha' || tipo === 'caixas') np.opcoes = (Array.isArray(q.opcoes) ? q.opcoes : []).map((o) => t(o).slice(0, 200)).filter(Boolean);
      if (tipo === 'grade') np.itens = (Array.isArray(q.itens) ? q.itens : []).map((it, k) => ({ id: 'i' + (k + 1), texto: t(typeof it === 'object' ? it.texto : it).slice(0, 200) })).filter((it) => it.texto);
      if ((tipo === 'grade' || tipo === 'escala') && q.escala && typeof q.escala === 'object') {
        np.escala = Object.assign(np.escala, { min: +q.escala.min || 1, max: +q.escala.max || 5, rotulos: Object.assign({}, q.escala.rotulos || {}) });
      }
      f.perguntas.push(np); n++;
    });
    return n;
  }

  /** Título e descrição para o Google Forms, no padrão timbrado EMBRAPII. */
  function cabecalhoForms(p, f) {
    const pj = p.projeto, u = (typeof CONFIG !== 'undefined' && CONFIG.unidade) || {};
    return [`${t(f.titulo) || 'Levantamento de necessidades dos clientes'} — ${t(pj.nome)}`, '',
      'EMBRAPII · Unidade ' + (u.nome || 'InovaAgro/UFPel'),
      `Projeto: ${[t(pj.codigo), t(pj.nome)].filter(Boolean).join(' – ')}${pj.empresaParceira ? ' · Empresa parceira: ' + t(pj.empresaParceira) : ''}`,
      `Coordenação: ${t((pj.coordenador || {}).nome)}${(pj.coordenador || {}).email ? ' (' + t(pj.coordenador.email) + ')' : ''}`,
      `Data: ${new Date().toLocaleDateString('pt-BR')}${t(f.publico) ? ' · Público: ' + t(f.publico) : ''}`, '',
      'Esta pesquisa levanta as necessidades de quem fabrica, vende, usa, mantém e descarta o produto. Não há respostas certas ou erradas.',
      'Seus dados de identificação são usados só para contato e não aparecem nos relatórios (LGPD).',
      `Contato: ${u.email || ''}${u.site ? ' · ' + u.site : ''}`].join('\n');
  }

  function htmlCaixa(p) {
    return `<details class="form-det" data-det="ia-quest" ${App.formAberto && App.formAberto.ia ? 'open' : ''}><summary>🤖 Pedir as perguntas a uma IA (Reis, Spagnolo e Pahl) e cabeçalho EMBRAPII para o Forms</summary>
      <ol class="muted">
        <li>Copie o pedido (já leva o contexto do projeto e o formato da resposta) e cole na sua IA (ChatGPT, Claude, Gemini…).</li>
        <li>Cole aqui a resposta e importe: só entram as perguntas que ainda não existem. Revise antes de aplicar.</li>
        <li>No Google Forms, cole o título e a descrição do cabeçalho padrão timbrado EMBRAPII.</li></ol>
      <div class="barra"><button class="btn primario" data-acao="qia-copiar">📋 Copiar o pedido</button>
        <button class="btn" data-acao="qia-baixar">⬇ Baixar o pedido (.md)</button>
        <button class="btn" data-acao="qia-cabecalho">📋 Copiar cabeçalho EMBRAPII para o Forms</button></div>
      <textarea id="qia-resposta" rows="4" style="width:100%;box-sizing:border-box" placeholder="Cole aqui a resposta da IA…"></textarea>
      <div class="barra"><button class="btn primario" data-acao="qia-importar">⇩ Importar as perguntas</button></div>
      <pre id="qia-texto" class="rolagem" hidden style="white-space:pre-wrap;max-height:300px"></pre>
    </details>`;
  }

  const baseHtml = App.formularioHtml;
  App.formularioHtml = function (e, b) {
    const h = baseHtml.apply(this, arguments);
    try { const i = h.lastIndexOf('</div>'); return i >= 0 ? h.slice(0, i) + htmlCaixa(App.p) + h.slice(i) : h + htmlCaixa(App.p); }
    catch (er) { console.error(er); return h; }
  };
  document.addEventListener('toggle', (ev) => { if (ev.target && ev.target.matches && ev.target.matches('[data-det="ia-quest"]') && App.formAberto) App.formAberto.ia = ev.target.open; }, true);

  async function copiar(texto, rotulo) {
    try { await navigator.clipboard.writeText(texto); App.toast(rotulo + ' copiado.', 'ok'); }
    catch (e) { const pre = $('#qia-texto'); if (pre) { pre.hidden = false; pre.textContent = texto; } App.toast('Não deu para copiar sozinho: selecione o texto abaixo e copie.', 'aviso'); }
  }
  const formAtual = () => App.p.produto.etapas.informacional.formulario;
  App.acoes['qia-copiar'] = () => copiar(pedido(App.p), 'Pedido');
  App.acoes['qia-baixar'] = () => App.baixarBlob(new Blob([pedido(App.p)], { type: 'text/markdown' }), 'pedido-ia-questionario-' + Nucleo.nomeSeguro(App.p.projeto.nome || 'projeto') + '.md');
  App.acoes['qia-cabecalho'] = () => copiar(cabecalhoForms(App.p, formAtual()), 'Cabeçalho');
  App.acoes['qia-importar'] = () => {
    const tx = ($('#qia-resposta') || {}).value || '';
    if (!t(tx)) { App.toast('Cole a resposta da IA na caixa.', 'aviso'); return; }
    try {
      const inf = App.p.produto.etapas.informacional;
      const n = importar(inf.formulario, extrairJson(tx));
      inf.formulario = Formulario.normalizar(inf.formulario);
      App.marcarSujo(true); App.render();
      App.toast(n ? `${n} pergunta(s) nova(s) no questionário. Revise antes de aplicar.` : 'Nenhuma pergunta nova (todas já existiam).', 'ok', 7000);
    } catch (e) { App.toast(esc(e.message), 'erro', 8000); }
  };
  window.QuestionarioIA = { pedido, importar, extrairJson, cabecalhoForms, contexto };
})();
