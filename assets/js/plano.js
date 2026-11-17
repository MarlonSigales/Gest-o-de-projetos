/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Plano de trabalho EMBRAPII → projeto pré-preenchido (todoQA 102).
 * Lê o plano em PDF (pdf.js, carregado só quando preciso), .docx ou texto e preenche o projeto:
 *  - nome (título público), código, empresa parceira e responsável na empresa, unidade, coordenador e adjunto (nome e
 *    e-mail), período de execução (data de fim prevista quando há data de início), TRL esperado ao final;
 *  - introdução (resumo público, justificativa, escopo positivo e negativo, requisitos, metodologia e resultados) e o
 *    objetivo geral; os objetivos específicos viram objetivos das macroentregas;
 *  - equipe (nome, vínculo e função; CPF, telefones e valores de bolsa NUNCA são guardados);
 *  - macroentregas do cronograma físico-financeiro (título, parâmetros de aferição, indicador, meses, responsável e
 *    recurso) e os requisitos de alto nível no quadro de especificações (Qualidade).
 * Cria um projeto novo com isso ou completa os campos vazios do projeto aberto.
 */
'use strict';

const Plano = {};
if (typeof window !== 'undefined') window.Plano = Plano;
(function () { // escopo próprio: os nomes curtos daqui não colidem com os de outros scripts
Plano.PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

// ================================================================== leitura
/** Linhas do PDF: [{ y, pag, cel: [{ x, x2, s }] }] (cabeçalhos e rodapés repetidos de página saem). */
/*
 * Alguns PDFs (Word para Mac → PDF) têm fontes com o mapa de caracteres trocado: o texto sai em MacRoman lido como
 * Windows-1252 ("InovaÁ„o", "”rg„o", "n∫"). A fonte com esse defeito é reconhecida pelos padrões e o texto é desfeito.
 */
const MAC = 'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»…\u00a0ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔ\uf8ffÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';
const W1252 = (() => { try { const dec = new TextDecoder('windows-1252'); return [...MAC].map((c, i) => dec.decode(new Uint8Array([0x80 + i]))); } catch (e) { return null; } })();
Plano.desfazMac = (s) => (W1252 ? [...String(s)].map((c) => { const i = MAC.indexOf(c); return i < 0 ? c : W1252[i]; }).join('') : s);
const SUSPEITO = /[a-z][ÁÍÌÛÙ„∫‡È]|[„∫]/;
Plano.linhasDeItens = function (pags) {
  const out = [];
  const ruins = {}, total = {};
  pags.forEach((pg) => pg.itens.forEach((t) => { const f = t.f || '?'; total[f] = (total[f] || 0) + 1; if (SUSPEITO.test(t.s)) ruins[f] = (ruins[f] || 0) + 1; }));
  const trocar = new Set(Object.keys(ruins).filter((f) => ruins[f] >= 2 && ruins[f] / total[f] > 0.02));
  if (trocar.size) pags = pags.map((pg) => ({ itens: pg.itens.map((t) => (trocar.has(t.f || '?') ? Object.assign({}, t, { s: Plano.desfazMac(t.s) }) : t)) }));
  pags.forEach((pg, ip) => {
    const its = pg.itens.filter((t) => String(t.s).trim()).sort((a, b) => a.y - b.y || a.x - b.x);
    const grupos = [];
    its.forEach((t) => {
      const g = grupos.find((x) => Math.abs(x.y - t.y) <= Math.max(2, (t.h || 10) * 0.35));
      if (g) g.itens.push(t); else grupos.push({ y: t.y, itens: [t] });
    });
    grupos.sort((a, b) => a.y - b.y).forEach((g) => {
      const it = g.itens.sort((a, b) => a.x - b.x), cel = [];
      it.forEach((t) => {
        const ult = cel[cel.length - 1], esp = Math.max(2.2, (t.h || 10) * 0.33);
        if (ult && t.x - ult.x2 <= Math.min(18, (t.h || 10) * 1.6)) { ult.s += (t.x - ult.x2 > esp * 0.25 && !/\s$/.test(ult.s) ? ' ' : '') + t.s; ult.x2 = t.x + t.w; }
        else cel.push({ x: t.x, x2: t.x + t.w, s: t.s });
      });
      cel.forEach((c) => { c.s = c.s.replace(/\s+/g, ' ').trim(); });
      out.push({ y: g.y, pag: ip, cel: cel.filter((c) => c.s), h: Math.max(...it.map((t) => t.h || 10)) });
    });
  });
  // tira o que se repete no topo/rodapé de várias páginas (timbre, assinatura eletrônica)
  const conta = {};
  out.forEach((l) => { const k = Plano.texto(l); conta[k] = (conta[k] || 0) + 1; });
  const nPag = pags.length;
  return out.filter((l) => l.cel.length && !(nPag > 2 && conta[Plano.texto(l)] >= Math.max(3, nPag * 0.4)) && !/^Clicksign\b|^Documento assinado/i.test(Plano.texto(l)));
};
Plano.texto = (l) => l.cel.map((c) => c.s).join(' ').replace(/\s+/g, ' ').trim();

function carregarScript(src) {
  return new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => erro(new Error('não consegui carregar o leitor de PDF (sem internet?). Use o plano em .docx ou cole o texto.')); document.head.appendChild(s); });
}
Plano.lerPdf = async function (arq) {
  if (!window.pdfjsLib) await carregarScript(Plano.PDFJS + 'pdf.min.js');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = Plano.PDFJS + 'pdf.worker.min.js';
  const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await arq.arrayBuffer()) }).promise, pags = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
    pags.push({ itens: tc.items.filter((t) => t.str !== undefined).map((t) => ({ s: t.str, x: t.transform[4], y: vp.height - t.transform[5], w: t.width, h: t.height || Math.abs(t.transform[3]), f: t.fontName })) });
  }
  return Plano.linhasDeItens(pags);
};
/** .docx: parágrafos viram linhas; cada linha de tabela vira uma linha com uma célula por coluna (x = coluna). */
Plano.lerDocx = async function (arq) {
  const zip = await JSZip.loadAsync(arq), f = zip.file('word/document.xml');
  if (!f) throw new Error('o .docx não tem o texto (word/document.xml).');
  const doc = new DOMParser().parseFromString(await f.async('string'), 'application/xml'), W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const txt = (el) => { let s = ''; for (const n of el.getElementsByTagNameNS(W, '*')) { if (n.localName === 't') s += n.textContent; else if (n.localName === 'tab' || n.localName === 'br') s += ' '; } return s.replace(/\s+/g, ' ').trim(); };
  const out = []; let y = 0;
  const corpo = doc.getElementsByTagNameNS(W, 'body')[0];
  const andar = (no) => {
    for (const el of no.childNodes) {
      if (el.localName === 'p') { const s = txt(el); if (s) out.push({ y: y += 12, pag: 0, h: 10, cel: [{ x: 0, x2: s.length * 5, s }] }); }
      else if (el.localName === 'tbl') {
        for (const tr of el.getElementsByTagNameNS(W, 'tr')) {
          const tcs = [...tr.childNodes].filter((n) => n.localName === 'tc');
          // cada parágrafo da célula numa linha própria, para os rótulos ficarem acima dos valores
          const pars = tcs.map((tc) => [...tc.getElementsByTagNameNS(W, 'p')].map(txt).filter(Boolean));
          const n = Math.max(0, ...pars.map((p) => p.length));
          for (let k = 0; k < n; k++) { const cel = pars.map((p, c) => ({ x: c * 120, x2: c * 120 + 110, s: p[k] || '' })).filter((c) => c.s); if (cel.length) out.push({ y: y += 12, pag: 0, h: 10, cel }); }
          y += 6;
        }
      } else if (el.childNodes && el.childNodes.length && el.localName !== 'sectPr') andar(el);
    }
  };
  if (corpo) andar(corpo);
  return out;
};
Plano.lerTexto = (s) => String(s || '').split(/\r?\n/).map((x, i) => ({ y: i * 12, pag: 0, h: 10, cel: x.trim() ? [{ x: 0, x2: x.length * 5, s: x.trim() }] : [] })).filter((l) => l.cel.length);
Plano.ler = async function (arq) {
  const n = arq.name || '';
  if (/\.pdf$/i.test(n) || arq.type === 'application/pdf') return Plano.lerPdf(arq);
  if (/\.docx$/i.test(n)) return Plano.lerDocx(arq);
  if (/\.(txt|md)$/i.test(n) || /^text\//.test(arq.type)) return Plano.lerTexto(await arq.text());
  throw new Error('use o plano em PDF, .docx ou .txt.');
};

// ================================================================== interpretação
const T = (x) => String(x ?? '').replace(/\s+/g, ' ').trim();
const semAc = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CPF = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g;
/** Texto do plano sem CPF, telefones e documentos de identidade (o texto fica no projeto e vai como fonte da patente). */
Plano.semPessoais = (txt) => String(txt || '').split('\n').map((l) => l.replace(CPF, '').replace(/(\+?\d{2}\s?)?(\(?\d{2}\)?\s?)?\d{4,5}-\d{4}\b/g, '').replace(/\b[\d.-]{5,12}\s*\/?\s*(SSP|SESP|SJS|DETRAN|PC)\b[^\n]*/gi, '').replace(/\s{2,}/g, ' ').trim()).filter(Boolean).join('\n');
const tiraPessoais = (s) => String(s).replace(CPF, '').replace(/\(?\+?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '').replace(/\s{2,}/g, ' ').trim();

/** Junta linhas de texto corrido em parágrafos (quebra quando a linha anterior termina frase e a próxima recua ou é item). */
function paragrafos(ls) {
  const ps = []; let cur = '';
  ls.forEach((l, k) => {
    const s = Plano.texto(l), ant = ls[k - 1];
    const item = /^(\d+[.)]|[-–•▪])\s/.test(s) || /^(Objetivos?\s+(Geral|Espec[íi]fic)|Escopo\s+(positivo|negativo)|Requisitos\s+do)/i.test(s)
      || (ant && /:$/.test(Plano.texto(ant)) && Plano.texto(ant).length < 60);
    const novo = !cur || item || (ant && /[.:;!?]$/.test(Plano.texto(ant)) && (l.cel[0].x > ant.cel[0].x + 8 || l.y - ant.y > (l.h || 10) * 1.9 || l.pag !== ant.pag && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(s)));
    if (novo) { if (cur) ps.push(cur); cur = s; } else cur += (cur.endsWith('-') ? '' : ' ') + s;
  });
  if (cur) ps.push(cur);
  return ps.map(T).filter(Boolean);
}

/** Divide as linhas de uma tabela em blocos, um por âncora (linha com o nº ou a função): o corte entre duas âncoras
 * vizinhas fica no maior espaço vertical entre elas (as células têm várias linhas, centradas na vertical). */
function blocosPorAncora(ls, anc) {
  const corte = (a, b) => { let k = a + 1, gap = -1; for (let j = a + 1; j <= b; j++) { const g = ls[j].pag !== ls[j - 1].pag ? 999 : ls[j].y - ls[j - 1].y; if (g > gap) { gap = g; k = j; } } return k; };
  return anc.map((a, n) => {
    const ini = n ? corte(anc[n - 1], a) : (() => { let k = a; while (k > 0 && ls[k - 1].pag === ls[a].pag && ls[k].y - ls[k - 1].y < (ls[a].h || 10) * 1.6 && a - k < 6) k--; return k; })();
    const fim = n < anc.length - 1 ? corte(a, anc[n + 1]) - 1 : (() => { let k = a; while (k < ls.length - 1 && ls[k + 1].pag === ls[a].pag && ls[k + 1].y - ls[k].y < (ls[a].h || 10) * 1.6 && k - a < 8) k++; return k; })();
    return ls.slice(ini, fim + 1);
  });
}

Plano.interpretar = function (L) {
  const tx = L.map(Plano.texto), d = { avisos: [] };
  const acha = (re, de = 0, ate = L.length) => { for (let i = de; i < ate; i++) if (re.test(tx[i])) return i; return -1; };
  // títulos numerados (2.2. Introdução…): índice de cada seção
  const secao = (re) => acha(new RegExp('^\\s*(\\d+(\\.\\d+)*\\.?)?\\s*' + re.source, 'i'));
  const proxSecao = (i) => { for (let k = i + 1; k < L.length; k++) if (/^\d+(\.\d+)*\.?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,80}$/.test(tx[k]) && L[k].cel.length === 1 && !/^\d+\.\s+.{90,}/.test(tx[k]) && /^\d+\.\d|^\d+\.\s+(Dados|Descri|Respons|Or[çc]a|Cronog|Plano|Pedido|Aprova)/i.test(tx[k])) return k; return L.length; };
  /** Valor abaixo de um rótulo, na coluna dele (tabelas do tipo "rótulo em cima, valor embaixo"). */
  const abaixo = (i, reRot, linhas = 1, pare) => {
    if (i < 0) return '';
    const c = L[i].cel.find((x) => reRot.test(x.s)); if (!c) return '';
    const m = c.s.match(new RegExp('(' + reRot.source + ')[^:]*:\\s*(.+)$', 'i')); if (m && T(m[m.length - 1]).length > 2) return T(m[m.length - 1]);
    const vs = [];
    for (let k = i + 1; k < L.length && k <= i + linhas + 3 && vs.length < linhas; k++) {
      if (pare && pare.test(tx[k])) break;
      const cand = L[k].cel.filter((v) => v.x < c.x2 + 4 && v.x2 > c.x - 4);
      if (!cand.length) continue;
      const melhor = cand.sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0];
      vs.push(melhor.s);
    }
    return T(vs.join(' '));
  };
  const rotulo = (re, de = 0, ate = L.length, linhas = 1, pare) => { const i = acha(re, de, ate); return i < 0 ? '' : abaixo(i, re, linhas, pare); };

  // ---- dados cadastrais
  const iCoord = acha(/^Coordenador\b(?!\s+Adjunto)/i), iAdj = acha(/^Coordenador\s+Adjunto/i), iFoco = acha(/Ponto Focal|Fiscais de Projeto/i, Math.max(iAdj, 0));
  if (iCoord >= 0) d.coordenador = { nome: tiraPessoais(rotulo(/Nome do Coordenador/i, iCoord, iAdj > 0 ? iAdj : iCoord + 8)), email: (rotulo(/e-?mail/i, iCoord, iAdj > 0 ? iAdj : iCoord + 10).match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/) || [''])[0] };
  if (iAdj >= 0) d.coordenadorAdjunto = { nome: tiraPessoais(rotulo(/Nome do Coordenador Adjunto/i, iAdj, iAdj + 8)), email: (rotulo(/e-?mail/i, iAdj, iFoco > iAdj ? iFoco : iAdj + 10).match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/) || [''])[0] };
  const i13 = acha(/outros part[íi]cipes|Dados da Empresa/i), i2 = secao(/Descri[çc][ãa]o do Projeto/);
  if (i13 >= 0) {
    const fim = i2 > i13 ? i2 : i13 + 40;
    let emp = rotulo(/Nome\s*\/\s*Raz[ãa]o Social|Raz[ãa]o Social/i, i13, fim);
    emp = emp.replace(/^\(\s*X?\s*\)\s*P[úu]blico\s*\(\s*X?\s*\)\s*Privado\s*/i, '').replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/, '').trim();
    d.empresa = emp;
    const rep = tiraPessoais(rotulo(/Nome do representante legal/i, i13, fim)), foco = tiraPessoais(rotulo(/Contato na Empresa/i, i13, fim));
    d.responsavelEmpresa = rep || foco;
    d.focoEmpresa = foco;
    const em = L.slice(i13, fim).map(Plano.texto).join(' ').match(/E-?mail:?\s*([\w.+-]+@[\w-]+(\.[\w-]+)+)/i);
    if (em) d.emailEmpresa = em[1];
  }
  const un = tx.slice(0, 40).join(' ').match(/UNIDADE EMBRAPII\s+(.{3,120}?)(,\s*com\b|\s+com a\b|\s+tendo\b|\.)/i);
  if (un) d.unidade = T(un[1]);
  // ---- descrição geral
  d.titulo = rotulo(/T[íi]tulo P[úu]blico|T[íi]tulo do Projeto/i, 0, L.length, 4, /Resumo|Per[íi]odo|C[óo]digo|Objetivo/i);
  const per = tx.join(' ').match(/Per[íi]odo de Execu[çc][ãa]o.{0,120}?(\d{1,3})\s*meses/i) || tx.join(' ').match(/(\d{1,3})\s*meses\b/);
  if (per) d.meses = +per[1];
  const cod = tx.join(' ').match(/\b([A-Z]{2,6}-\d{3,4}\.\d{3,6})\b/); if (cod) d.codigo = cod[1];
  const val = rotulo(/Valor Total do Projeto/i); if (/R\$/.test(val)) d.valor = val;
  const iRes = acha(/^Resumo P[úu]blico/i);
  if (iRes >= 0) {
    const c0 = L[iRes].cel[0], ls = [];
    for (let k = iRes + 1; k < L.length && !/^(In[íi]cio das Atividades|Valor Total|\d+\.\d)/i.test(tx[k]); k++) {
      const cs = L[k].cel.filter((c) => c.x < c0.x + 40 && !/^C[óo]digo$|^[A-Z]{2,6}-\d/.test(c.s) && !/^\d{1,3} meses$/.test(c.s));
      if (cs.length) ls.push({ y: L[k].y, pag: L[k].pag, h: L[k].h, cel: cs });
    }
    d.resumo = paragrafos(ls).join('\n\n');
  }
  const corpo = (reIni, reFim) => {
    const i = acha(reIni); if (i < 0) return [];
    let f = reFim ? acha(reFim, i + 1) : -1; if (f < 0) f = proxSecao(i);
    return paragrafos(L.slice(i + 1, f));
  };
  d.introducao = corpo(/^\d+(\.\d+)*\.?\s*Introdu[çc][ãa]o|^Introdu[çc][ãa]o|^Justificativa/i, /^Escopo do projeto|^\d+(\.\d+)*\.?\s*(Requisitos|Objetivos)/i);
  d.escopo = corpo(/^Escopo do projeto/i, /^\d+(\.\d+)*\.?\s*(Requisitos|Objetivos)/i);
  d.requisitos = corpo(/^\d+(\.\d+)*\.?\s*Requisitos/i, /^\d+(\.\d+)*\.?\s*Objetivos/i)
    .flatMap((p) => p.replace(/^Requisitos do (Produto|Projeto)\s*/i, '').split(/(?<=[.;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/)).map(T)
    .map((s) => s.replace(/^.*?deve ter as seguintes caracter[íi]sticas:\s*/i, '')).filter((s) => s.length > 15);
  const obj = corpo(/^\d+(\.\d+)*\.?\s*Objetivos?\b/i, /^\d+(\.\d+)*\.?\s*Metodologia/i);
  const iEsp = obj.findIndex((s) => /^Objetivos?\s+Espec[íi]ficos?/i.test(s)), iGer = obj.findIndex((s) => /^Objetivo\s+Geral/i.test(s));
  if (iGer >= 0) d.objetivoGeral = T(obj[iGer].replace(/^Objetivo\s+Geral\s*:?/i, '') || obj[iGer + 1] || '');
  if (d.objetivoGeral === '' && iGer >= 0) d.objetivoGeral = obj[iGer + 1] || '';
  if (iGer >= 0 && !obj[iGer].replace(/^Objetivo\s+Geral\s*:?/i, '').trim() && iEsp !== iGer + 1) d.objetivoGeral = obj[iGer + 1];
  d.objetivosEspecificos = iEsp >= 0 ? obj.slice(iEsp + 1).map((s) => s.replace(/^\d+[.)]\s*/, '')).filter(Boolean) : [];
  d.metodologia = corpo(/^\d+(\.\d+)*\.?\s*Metodologia/i, /^\d+(\.\d+)*\.?\s*Resultados/i);
  const res = corpo(/^\d+(\.\d+)*\.?\s*Resultados/i);
  d.resultados = res.filter((s) => !/^(Marcar|x?\s*[3-6]\s+(Estabelecimento|Valida|Demonstra))|Defini[çc][ãa]o do n[íi]vel/i.test(s));
  const iRes2 = acha(/^\d+(\.\d+)*\.?\s*Resultados/i);
  if (iRes2 >= 0) for (let k = iRes2; k < Math.min(L.length, iRes2 + 40); k++) {
    const c = L[k].cel; const ix = c.findIndex((x) => /^x$/i.test(x.s)); const n = c.find((x) => /^[3-9]$/.test(x.s));
    if (ix >= 0 && n) { d.trl = +n.s; break; }
    const m = tx[k].match(/^x\s+([3-9])\s+/i); if (m) { d.trl = +m[1]; break; }
  }
  // ---- equipe (5.2): nomes na coluna da esquerda, em blocos; CPF e valores ficam de fora
  const iEq = acha(/Detalhamento da equipe|Equipe do projeto|Equipe executora/i), iCr = acha(/Cronograma f[íi]sico|Cronograma de execu/i, Math.max(iEq, 0));
  d.equipe = [];
  if (iEq >= 0) {
    const fim = iCr > iEq ? iCr : L.length, ls = L.slice(iEq + 1, fim);
    const ehFuncao = (s) => /^(Coordenador(a)?|Colaborador(a)?|Pesquisador(a)?|Bolsista|Gerente|Vice-?coordenador(a)?|Coordenador(a)? adjunt[oa]|Consultor(a)?|Executor(a)?)\b/i.test(s);
    const ancoras = ls.map((l, k) => (l.cel.some((c) => ehFuncao(c.s) && l.cel.indexOf(c) > 0) ? k : -1)).filter((k) => k >= 0);
    if (ancoras.length) {
      const xs = ancoras.map((k) => ls[k].cel[0].x);
      const xNome = Math.min(...ls.slice(ancoras[0] - 3 < 0 ? 0 : ancoras[0] - 3).flatMap((l) => l.cel.map((c) => c.x)));
      const doNome = (c) => Math.abs(c.x - xNome) < 14;
      const blocos = blocosPorAncora(ls, ancoras);
      ancoras.forEach((a, n) => {
        const bloco = blocos[n];
        const nome = T(bloco.map((l) => l.cel.filter(doNome).map((c) => c.s).join(' ')).join(' '));
        const fc = ls[a].cel.find((c) => ehFuncao(c.s));
        const vinc = T(bloco.map((l) => l.cel.filter((c) => !doNome(c) && c.x < fc.x - 4 && !CPF.test(c.s) && !/^Contrata/i.test(c.s) && !/^edital$/i.test(c.s)).map((c) => c.s.replace(CPF, '')).join(' ')).join(' ')).replace(/\s*\/\s*/g, '/');
        CPF.lastIndex = 0;
        if (nome && !/^Nome$/i.test(nome)) d.equipe.push({ nome: tiraPessoais(nome), funcao: T(fc.s), vinculo: tiraPessoais(vinc) });
      });
      void xs;
    }
  }
  // ---- macroentregas do cronograma físico-financeiro
  d.macros = [];
  if (iCr >= 0) {
    const fimC = acha(/^\s*\d+\.?\s+Plano de aplica|^\s*\d+\.?\s+Pedido de deferimento|Plano de aplica[çc][ãa]o/i, iCr + 1), ls = L.slice(iCr + 1, fimC > 0 ? fimC : L.length);
    const iCab = ls.findIndex((l) => l.cel.some((c) => /^Detalhamento$/i.test(c.s)) && l.cel.some((c) => /Respons/i.test(c.s)));
    if (iCab >= 0) {
      const cab = ls[iCab].cel.map((c) => ({ nome: semAc(c.s), cx: (c.x + c.x2) / 2 }));
      const col = (nome) => cab.findIndex((c) => c.nome.startsWith(nome));
      const nomes = { det: col('detalhamento'), par: col('parametros'), met: col('metrica'), res: col('resultado'), ini: col('inicio'), fim: col('termino'), resp: col('responsavel'), rec: col('recurso') };
      const corpoC = ls.slice(iCab + 1);
      const xOrdem = Math.min(...corpoC.flatMap((l) => l.cel.map((c) => c.x)));
      const anc = corpoC.map((l, k) => (l.cel.some((c) => /^\d{1,2}$/.test(c.s) && c.x < xOrdem + 40) ? k : -1)).filter((k) => k >= 0);
      const colDe = (c) => { const cx = (c.x + c.x2) / 2; let best = -1, dist = 1e9; cab.forEach((h, j) => { const dd = Math.abs(h.cx - cx); if (dd < dist) { dist = dd; best = j; } }); return best; };
      const blocos = blocosPorAncora(corpoC, anc);
      anc.forEach((a, n) => {
        const bloco = blocos[n];
        const cols = {};
        bloco.forEach((l) => l.cel.forEach((c) => { if (/^\d{1,2}$/.test(c.s) && c.x < xOrdem + 40) return; if (/^(Macro|entregas|Macro entregas|Metas|ou|Ordem)$/i.test(c.s)) return; const j = colDe(c); (cols[j] = cols[j] || []).push(c.s); }));
        const v = (k) => (nomes[k] >= 0 ? T((cols[nomes[k]] || []).join(' ')).replace(/(\w)- (\w)/g, '$1$2').replace(/Assinatur a/g, 'Assinatura') : '');
        const mes = (s) => { const m = String(s).match(/(\d{1,2})\s*[º°o]?\s*m[êe]s/i); return m ? +m[1] : null; };
        const numero = +corpoC[a].cel.find((c) => /^\d{1,2}$/.test(c.s) && c.x < xOrdem + 40).s;
        d.macros.push({ numero, titulo: v('det'), parametros: v('par'), metrica: v('met'), resultado: v('res'), inicio: v('ini'), termino: v('fim'), mesIni: mes(v('ini')) || (/assinatura/i.test(v('ini')) ? 1 : null), mesFim: mes(v('fim')), responsavel: tiraPessoais(v('resp')), recurso: (v('rec').match(/[\d.]+,\d{2}/) || [''])[0] });
      });
    }
  }
  if (!d.titulo) d.avisos.push('título não encontrado');
  if (!d.macros.length) d.avisos.push('cronograma físico-financeiro (macroentregas) não encontrado');
  if (!d.equipe.length) d.avisos.push('equipe não encontrada');
  return d;
};

// ================================================================== aplicar no projeto
/** Texto da introdução montado com as partes do plano. */
Plano.textoIntroducao = function (d) {
  const P = [];
  if (d.resumo) P.push(d.resumo);
  if ((d.introducao || []).length) P.push('**Justificativa**', ...d.introducao);
  if ((d.escopo || []).length) P.push('**Escopo do projeto**', ...d.escopo.map((s) => (/^[-–•]\s/.test(s) ? s.replace(/^[–•]\s/, '- ') : s)));
  if ((d.requisitos || []).length) P.push('**Requisitos de alto nível**', ...d.requisitos);
  if ((d.objetivosEspecificos || []).length) P.push('**Objetivos específicos**', ...d.objetivosEspecificos.map((s) => '- ' + s));
  if ((d.metodologia || []).length) P.push('**Metodologia**', ...d.metodologia);
  if ((d.resultados || []).length) P.push('**Resultados e produtos esperados**', ...d.resultados);
  return P.join('\n\n');
};
/** Primeiro dia do mês n do projeto (n = 1 é a própria data de início). */
const inicioDoMes = (iso, n) => { if (n <= 1) return iso; const [a, b, c] = iso.split('-').map(Number); const dt = new Date(a, b - 1 + n - 1, c); return dt.toISOString().slice(0, 10); };
const somaMeses = (iso, m) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '') || !m) return ''; const [a, b, c] = iso.split('-').map(Number); const dt = new Date(a, b - 1 + m, c); dt.setDate(dt.getDate() - 1); return dt.toISOString().slice(0, 10); };
/**
 * Preenche o projeto p com o plano. soVazios: só onde está vazio (projeto aberto); senão, o plano manda (projeto novo).
 * Devolve a lista do que entrou.
 */
Plano.aplicar = function (p, d, soVazios) {
  const pj = p.projeto, feito = [];
  const put = (obj, k, v, rot) => { v = T(v); if (!v) return; if (soVazios && T(obj[k]) && obj[k] !== CONFIGpadrao(k)) return; obj[k] = v; feito.push(rot); };
  const CONFIGpadrao = (k) => (k === 'unidadeEmbrapii' && typeof CONFIG !== 'undefined' ? CONFIG.unidade.nome : null);
  put(pj, 'nome', d.titulo, 'nome'); put(pj, 'codigo', d.codigo, 'código'); put(pj, 'empresaParceira', d.empresa, 'empresa parceira');
  put(pj, 'responsavelEmpresa', d.responsavelEmpresa, 'responsável na empresa'); put(pj, 'unidadeEmbrapii', d.unidade, 'unidade EMBRAPII');
  if (d.coordenador) { put(pj.coordenador, 'nome', d.coordenador.nome, 'coordenador'); put(pj.coordenador, 'email', d.coordenador.email, 'e-mail do coordenador'); }
  if (d.coordenadorAdjunto) { put(pj.coordenadorAdjunto, 'nome', d.coordenadorAdjunto.nome, 'coordenador adjunto'); put(pj.coordenadorAdjunto, 'email', d.coordenadorAdjunto.email, 'e-mail do adjunto'); }
  put(pj, 'objetivoGeral', d.objetivoGeral, 'objetivo geral');
  const intro = Plano.textoIntroducao(d); put(pj, 'introducao', intro, 'introdução (resumo, justificativa, escopo, requisitos, objetivos, metodologia, resultados)');
  if (d.trl && (!soVazios || !pj.trlEsperadoFinal || pj.trlEsperadoFinal === 6)) { pj.trlEsperadoFinal = d.trl; feito.push('TRL ' + d.trl + ' ao final'); }
  if (d.meses && pj.dataInicio && (!soVazios || !pj.dataFimPrevista)) { pj.dataFimPrevista = somaMeses(pj.dataInicio, d.meses); feito.push('fim previsto'); }
  // equipe: acrescenta quem não está (pelo nome)
  const temNome = new Set(pj.equipe.map((x) => semAc(T(x.nome))));
  const novos = (d.equipe || []).filter((x) => x.nome && !temNome.has(semAc(x.nome)));
  novos.forEach((x) => pj.equipe.push({ nome: x.nome, email: '', funcao: T([x.funcao, x.vinculo].filter(Boolean).join(' — ')), areas: [] }));
  if (novos.length) feito.push(novos.length + ' pessoa(s) na equipe');
  // macroentregas
  if ((d.macros || []).length && (!soVazios || !p.macroentregas.some((m) => (m.blocos || []).length || T(m.resultados) || m.percentualConcluido))) {
    const velhas = p.macroentregas;
    p.macroentregas = d.macros.map((m, k) => {
      const base = velhas[k] && !soVazios ? velhas[k] : (velhas[k] || Nucleo.novaMacro(k + 1));
      const desc = [m.parametros && `Parâmetros de aferição: ${m.parametros}`, (m.metrica || m.resultado) && `Indicador: ${[m.metrica, m.resultado].filter(Boolean).join(' — ')}`,
        (m.mesIni || m.mesFim) && `Prazo: ${m.mesIni ? m.mesIni + 'º' : '?'} ao ${m.mesFim ? m.mesFim + 'º' : '?'} mês`, m.responsavel && `Responsável: ${m.responsavel}`, m.recurso && `Recurso: R$ ${m.recurso}`].filter(Boolean).join('\n');
      return Object.assign(base, { numero: k + 1, titulo: m.titulo || base.titulo, descricao: desc || base.descricao,
        dataInicio: pj.dataInicio && m.mesIni ? inicioDoMes(pj.dataInicio, m.mesIni) : base.dataInicio,
        dataPrevista: pj.dataInicio && m.mesFim ? somaMeses(pj.dataInicio, m.mesFim) : base.dataPrevista,
        resultados: base.resultados || (m.resultado ? `Resultado esperado: ${m.resultado}` : ''), trlEsperado: d.trl || base.trlEsperado });
    });
    feito.push(d.macros.length + ' macroentrega(s) do cronograma');
    if (d.macros.length < 4 && !Nucleo.simplificado(p)) feito.push('atenção: o plano tem ' + d.macros.length + ' macroentregas (o NeDIP sugere uma por fase; ajuste as fases em Projeto de produto)');
  }
  // objetivos específicos → objetivos das macroentregas (repartidos na ordem), se ainda vazios
  const oe = d.objetivosEspecificos || [];
  if (oe.length && p.macroentregas.length && p.macroentregas.every((m) => !(m.objetivosEtapa || []).some((x) => T(x)))) {
    const n = p.macroentregas.length, por = Math.ceil(oe.length / n);
    p.macroentregas.forEach((m, k) => { m.objetivosEtapa = oe.slice(k * por, (k + 1) * por); if (!m.objetivosEtapa.length) m.objetivosEtapa = ['']; });
    feito.push(oe.length + ' objetivo(s) específico(s) nas macroentregas');
  }
  // requisitos de alto nível → quadro de especificações
  const req = (d.requisitos || []).filter((s) => !/^(Requisitos do Produto|O produto gerado pelo projeto deve)/i.test(s) && s.length > 15);
  const temReq = new Set(p.qualidade.map((q) => semAc(T(q.requisito))));
  const nq = req.filter((s) => !temReq.has(semAc(s)));
  nq.forEach((s) => p.qualidade.push({ id: Nucleo.uid('q'), requisito: s, criterioAceite: (s.match(/\(([^)]*\d[^)]*)\)/g) || []).join(' ').replace(/[()]/g, ''), metodoVerificacao: '', status: 'pendente', pdca: { planejar: '', executar: '', verificar: '', agir: '' }, origem: 'plano de trabalho' }));
  if (nq.length) feito.push(nq.length + ' requisito(s) no quadro de especificações');
  if (d.empresa && !(p.interessados || []).some((x) => semAc(T(x.papel)).includes('empresa'))) {
    const nome = d.focoEmpresa || d.responsavelEmpresa;
    if (nome) { p.interessados.push({ nome, email: d.emailEmpresa || '', papel: 'Empresa parceira (' + d.empresa + ')', grupos: [] }); feito.push('interessado da empresa'); }
  }
  return feito;
};

if (typeof module !== 'undefined') module.exports = Plano;

// ================================================================== tela (só no navegador)
if (typeof window !== 'undefined' && typeof App !== 'undefined') (function () {
  const esc2 = (s) => (typeof esc === 'function' ? esc(s) : String(s));
  Plano.cartaoInicio = () => `<div class="cartao" style="margin:14px 0 0"><h3 style="margin-top:0">📄 Começar pelo plano de trabalho EMBRAPII</h3>
    <p class="muted" style="margin-top:0">Escolha o plano (PDF, .docx ou .txt): nome, código, empresa, coordenação, equipe, introdução, objetivos, requisitos, TRL e as macroentregas do cronograma já vêm preenchidos. Você confere antes de criar. CPF, telefones e valores de bolsa não são copiados.</p>
    <div class="barra"><label class="btn primario">📄 Escolher o plano de trabalho…<input type="file" class="arq-plano-trabalho" accept=".pdf,.docx,.txt,.md" hidden></label></div></div>`;
  let pendente = null; // { arq, linhas, d }
  async function abrirArquivo(arq) {
    App.toast('Lendo o plano de trabalho…', '', 3000);
    let linhas;
    try { linhas = await Plano.ler(arq); } catch (e) { App.toast('Não consegui ler o plano: ' + esc2(e.message), 'erro', 9000); return; }
    const d = Plano.interpretar(linhas);
    pendente = { arq, linhas, d };
    previa();
  }
  function previa() {
    const { arq, d } = pendente, aberto = !!(App.p && App.temConteudo && App.temConteudo());
    const li = (rot, v) => `<tr><th>${rot}</th><td>${v ? esc2(v) : '<span class="gap-neg">não encontrado</span>'}</td></tr>`;
    App.modal(`<h2>Plano de trabalho: o que foi encontrado</h2>
      <p class="muted">${esc2(arq.name)} — confira; tudo pode ser editado depois no projeto.${d.avisos.length ? ` <b class="gap-neg">Não encontrado: ${esc2(d.avisos.join('; '))}.</b>` : ''}</p>
      <table class="tabela-simples"><tbody>
        ${li('Nome (título)', d.titulo)}${li('Código', d.codigo)}${li('Empresa parceira', d.empresa)}${li('Responsável na empresa', d.responsavelEmpresa)}
        ${li('Unidade EMBRAPII', d.unidade)}${li('Coordenador', d.coordenador && [d.coordenador.nome, d.coordenador.email].filter(Boolean).join(' · '))}
        ${li('Coordenador adjunto', d.coordenadorAdjunto && [d.coordenadorAdjunto.nome, d.coordenadorAdjunto.email].filter(Boolean).join(' · '))}
        ${li('Período de execução', d.meses ? d.meses + ' meses' : '')}${li('Valor total', d.valor)}${li('TRL ao final', d.trl ? 'TRL ' + d.trl : '')}
        ${li('Objetivo geral', d.objetivoGeral)}
        ${li('Introdução', [d.resumo && 'resumo', (d.introducao || []).length && 'justificativa', (d.escopo || []).length && 'escopo', (d.requisitos || []).length && 'requisitos', (d.objetivosEspecificos || []).length && d.objetivosEspecificos.length + ' objetivos específicos', (d.metodologia || []).length && 'metodologia', (d.resultados || []).length && 'resultados'].filter(Boolean).join(', '))}
        ${li('Equipe', (d.equipe || []).length ? d.equipe.length + ' pessoa(s): ' + d.equipe.map((x) => x.nome).join(', ') : '')}
        ${li('Macroentregas', (d.macros || []).length ? d.macros.map((m) => `${m.numero}. ${m.titulo} (${m.mesIni || '?'}º–${m.mesFim || '?'}º mês)`).join(' · ') : '')}
        ${li('Requisitos → quadro de especificações', (d.requisitos || []).length ? d.requisitos.length + ' requisito(s)' : '')}
      </tbody></table>
      <div class="grade-campos grade-2" style="margin-top:10px">
        <div class="cartao" style="margin:0"><h3 style="margin-top:0">✚ Projeto novo</h3><p>Cria um projeto (guardado no navegador) já preenchido com o plano.</p>
          <div class="barra"><button class="btn primario" data-acao="plano-criar" data-v="completa">Criar (versão completa)</button><button class="btn" data-acao="plano-criar" data-v="simplificada">Versão simplificada</button></div></div>
        <div class="cartao" style="margin:0"><h3 style="margin-top:0">↻ Projeto aberto</h3><p>${aberto ? `Completa só os campos vazios de <b>${esc2(App.p.projeto.nome || '(sem nome)')}</b>; acrescenta a equipe e os requisitos que faltam.` : 'Nenhum projeto aberto.'}</p>
          <div class="barra"><button class="btn" data-acao="plano-completar" ${App.p ? '' : 'disabled'}>Completar o projeto aberto</button></div></div>
      </div>`, true);
  }
  async function guardarPlano() {
    const { arq, linhas } = pendente;
    const cam = 'documentos/plano-de-trabalho' + ((arq.name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase());
    try { if (App.arm && App.arm.gravarArquivo) await App.arm.gravarArquivo(cam, arq); } catch (e) { /* o texto basta */ }
    App.p.planoTrabalho = { nome: arq.name, arquivo: cam, data: hojeISO(), texto: Plano.semPessoais(linhas.map(Plano.texto).join('\n')) };
  }
  App.acoes['plano-criar'] = async (el) => {
    if (!pendente) return;
    if (App.p && App.sujo && !confirm('O projeto aberto tem alterações não salvas, que se perdem. Continuar?')) return;
    const p = Nucleo.novo('', el.dataset.v === 'simplificada' ? 'simplificada' : 'completa');
    const feito = Plano.aplicar(p, pendente.d, false);
    App.fecharModal();
    App.carregarEstado(p, new ArmazemNavegador(p.id, p.projeto.nome || ''));
    await guardarPlano();
    App.marcarSujo(true); App.aba = 'projeto'; App.render();
    App.toast(`Projeto criado com o plano de trabalho: ${esc2(feito.join(', '))}. Confira as abas Projeto, Equipe e Macroentregas, informe a data de início (as datas das macroentregas saem dos meses do cronograma) e clique em Salvar.`, 'ok', 15000);
    pendente = null;
  };
  App.acoes['plano-completar'] = async () => {
    if (!pendente || !App.p) return;
    const feito = Plano.aplicar(App.p, pendente.d, true);
    App.fecharModal(); await guardarPlano();
    App.marcarSujo(true); App.atualizarTopo(); App.render();
    App.toast(feito.length ? 'Completado com o plano: ' + esc2(feito.join(', ')) + '.' : 'Nada a completar: os campos já tinham texto. O plano ficou anexado (aba Ideias de patente).', 'ok', 12000);
    pendente = null;
  };
  /** Data de início informada depois: recalcula o fim previsto e as datas das macroentregas pelos meses do plano. */
  App.acoes['plano-datas'] = () => {
    const pj = App.p.projeto; if (!pj.dataInicio) { App.toast('Informe a data de início primeiro.', 'erro'); return; }
    const linhas = String((App.p.planoTrabalho || {}).texto || '');
    const d = linhas ? Plano.interpretar(Plano.lerTexto(linhas)) : null;
    let n = 0;
    App.p.macroentregas.forEach((m) => {
      const r = String(m.descricao || '').match(/Prazo:\s*(\d+)º\s*ao\s*(\d+)º\s*mês/); if (!r) return;
      m.dataInicio = inicioDoMes(pj.dataInicio, +r[1]);
      m.dataPrevista = somaMeses(pj.dataInicio, +r[2]); n++;
    });
    const meses = (d && d.meses) || null;
    if (meses && !pj.dataFimPrevista) pj.dataFimPrevista = somaMeses(pj.dataInicio, meses);
    App.marcarSujo(true); App.render();
    App.toast(n ? `Datas de ${n} macroentrega(s) calculadas pelos meses do plano.` : 'Nenhuma macroentrega com o prazo em meses do plano.', n ? 'ok' : '');
  };
  document.addEventListener('change', (ev) => {
    if (!ev.target.classList || !ev.target.classList.contains('arq-plano-trabalho')) return;
    const arq = ev.target.files[0]; ev.target.value = ''; if (arq) abrirArquivo(arq);
  });
})();
})();
