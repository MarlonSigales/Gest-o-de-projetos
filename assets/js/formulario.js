/*
 * Pré-projeto informacional: questionário aplicado no Google Forms (ou em papel).
 *  - importa o CSV de respostas do Google Forms (Respostas → ⋮ → Baixar respostas .csv);
 *  - exporta um CSV em branco no mesmo formato, que serve de base para montar o formulário;
 *  - perguntas e respondentes podem ser editados; o resultado vira um documento no padrão do roteiro,
 *    que também pode entrar numa macroentrega (bloco "Questionário").
 * Formato do CSV do Forms: 1ª linha = perguntas; "Carimbo de data/hora" na 1ª coluna; perguntas em grade
 * aparecem como "Pergunta [item]"; caixas de seleção juntam as respostas com ", ".
 */
'use strict';

const Formulario = {};
window.Formulario = Formulario; // nedipNormalizar testa window.Formulario
Formulario.TIPOS = [
  ['identificacao', 'Identificação (dado pessoal, não vai ao relatório)'],
  ['texto', 'Resposta aberta'],
  ['escolha', 'Múltipla escolha (uma resposta)'],
  ['caixas', 'Caixas de seleção (várias respostas)'],
  ['escala', 'Escala linear'],
  ['grade', 'Grade (escala por item)'],
];
const fTxt = (x) => String(x ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
const fLinha = (x) => fTxt(x).replace(/\s*\n\s*/g, ' ');
/** Texto da pergunta sem a numeração do formulário ("11. Qual…" → "Qual…"): o sistema numera P1, P2… */
const fPergunta = (x) => fLinha(x).replace(/^\d{1,3}\s*[.)\-–]\s+(?=\S)/, '');
const fCmp = (x) => fLinha(x).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const fNum = (v) => { const m = String(v ?? '').trim().match(/^(-?\d+(?:[.,]\d+)?)(?:\s*[-–—:)]|\s*$)/); return m ? parseFloat(m[1].replace(',', '.')) : null; };
const fRotulo = (v) => { const m = String(v ?? '').trim().match(/^-?\d+(?:[.,]\d+)?\s*[-–—:)]\s*(.+)$/); return m ? m[1].trim() : ''; };
const RE_LETRA = /^[A-Za-z]\)\s/;
const RE_DIV_LETRA = /,\s*(?=[A-Za-z]\)\s)/;
const RE_ABERTA = /coment|sugest|observa|por ?qu[eê]|descreva|explique|justifique/i;
const RE_IDENT = /\b(nome|cargo|fun[cç][aã]o|contato|telefone|celular|e-?mail|whats ?app|cpf|endere[cç]o)\b/i;

Formulario.vazio = () => ({ titulo: '', publico: '', meio: 'Google Forms', arquivo: '', importadoEm: '', perguntas: [], respostas: [], destaques: [] });
Formulario.novaPergunta = (id, texto = '', tipo = 'texto') => ({ id, texto, tipo, opcoes: [], itens: [], escala: { min: 1, max: 5, invertida: false, rotulos: {} }, fase: '', analisar: tipo !== 'identificacao',
  grafico: true, rotulo: '' }); // grafico: gera a figura da pergunta; rotulo: título da figura (vazio = resumo da pergunta)
Formulario.chave = (p, it) => (it ? `${p.id}__${it.id}` : p.id);
Formulario.colunas = (f) => f.perguntas.flatMap((p) => (p.tipo === 'grade' ? p.itens.map((it) => ({ p, it })) : [{ p, it: null }]));
Formulario.proximoId = (lista, pref) => pref + (Math.max(0, ...lista.map((x) => +(String(x.id).match(/(\d+)$/) || [0, 0])[1])) + 1);

Formulario.normalizar = function (f) {
  f = Object.assign(Formulario.vazio(), f && typeof f === 'object' ? f : {});
  const ids = new Set();
  f.perguntas = (Array.isArray(f.perguntas) ? f.perguntas : []).filter((p) => p && typeof p === 'object').map((p) => {
    p = Object.assign(Formulario.novaPergunta(''), p);
    if (!p.id || ids.has(p.id)) p.id = Formulario.proximoId([...ids].map((id) => ({ id })), 'p');
    ids.add(p.id);
    if (!Formulario.TIPOS.some(([t]) => t === p.tipo)) p.tipo = 'texto';
    p.opcoes = (Array.isArray(p.opcoes) ? p.opcoes : []).map(String);
    p.itens = (Array.isArray(p.itens) ? p.itens : []).map((it, k) => (typeof it === 'object' && it ? Object.assign({ id: 'i' + (k + 1), texto: '' }, it) : { id: 'i' + (k + 1), texto: String(it) }));
    p.escala = Object.assign({ min: 1, max: 5, invertida: false, rotulos: {} }, p.escala || {});
    p.analisar = p.analisar !== false;
    p.grafico = p.grafico !== false;
    p.rotulo = String(p.rotulo || '');
    return p;
  });
  f.respostas = (Array.isArray(f.respostas) ? f.respostas : []).filter((r) => r && typeof r === 'object')
    .map((r, k) => Object.assign({ id: 'r' + (k + 1), data: '', valores: {} }, r, { valores: Object.assign({}, r.valores || {}) }));
  f.destaques = (Array.isArray(f.destaques) ? f.destaques : []).filter((d) => d && typeof d === 'object')
    .map((d, k) => Object.assign({ id: 'd' + (k + 1), pergunta: '', texto: '', incluir: true }, d));
  return f;
};

// ------------------------------------------------------------------ CSV
/** Bytes → texto: UTF-8 (Google Forms); se inválido, Windows-1252 (CSV salvo pelo Excel). */
Formulario.decodificar = function (buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { return new TextDecoder('windows-1252').decode(buf); }
};

/** CSV (RFC 4180) → linhas. Aceita vírgula, ponto e vírgula ou tabulação; aspas com quebras de linha. */
Formulario.lerCsv = function (txt) {
  txt = String(txt || '').replace(/^﻿/, '');
  let l1 = '', q = false;
  for (const ch of txt) { if (ch === '"') q = !q; else if (ch === '\n' && !q) break; l1 += ch; }
  const conta = (c) => { let n = 0, dq = false; for (const ch of l1) { if (ch === '"') dq = !dq; else if (!dq && ch === c) n++; } return n; };
  const sep = [',', ';', '\t'].sort((a, b) => conta(b) - conta(a))[0];
  const linhas = [];
  let lin = [], cel = '';
  q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cel += '"'; i++; } else q = false; } else cel += ch; }
    else if (ch === '"' && cel.trim() === '') { cel = ''; q = true; }
    else if (ch === sep) { lin.push(cel); cel = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; lin.push(cel); linhas.push(lin); lin = []; cel = ''; }
    else cel += ch;
  }
  if (cel !== '' || lin.length) { lin.push(cel); linhas.push(lin); }
  return linhas.filter((l) => l.some((c) => String(c).trim()));
};

const fDataIso = (v) => {
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` + (m[4] ? `T${m[4].padStart(2, '0')}:${m[5]}:${m[6] || '00'}` : '');
  return /^\d{4}-\d{2}-\d{2}/.test(String(v || '').trim()) ? String(v).trim() : String(v || '').trim();
};

/** Linhas do CSV → perguntas e respostas (sem tocar no projeto). */
Formulario.importar = function (linhas) {
  if (!linhas.length) throw new Error('O arquivo está vazio.');
  const cab = linhas[0], dados = linhas.slice(1);
  const iData = cab.findIndex((c) => /carimbo de data|timestamp|data\/hora|data e hora/i.test(c));
  const perguntas = [], col = [];
  let ultChave = null;
  cab.forEach((c, j) => {
    if (j === iData) { col[j] = null; return; }
    const m = String(c).match(/^([\s\S]*?)\s*\[([^\]]+)\]\s*$/);
    if (m && fLinha(m[1])) {
      const texto = fPergunta(m[1]), ult = perguntas[perguntas.length - 1];
      let p = ult && ult.tipo === 'grade' && ultChave === fCmp(texto) ? ult : null;
      if (!p) { p = Formulario.novaPergunta('p' + (perguntas.length + 1), texto, 'grade'); perguntas.push(p); ultChave = fCmp(texto); }
      const it = { id: 'i' + (p.itens.length + 1), texto: fLinha(m[2]) };
      p.itens.push(it);
      col[j] = { p, it };
    } else {
      const p = Formulario.novaPergunta('p' + (perguntas.length + 1), fPergunta(c) || `Pergunta ${perguntas.length + 1}`, 'texto');
      perguntas.push(p); ultChave = null;
      col[j] = { p, it: null };
    }
  });
  const respostas = dados.map((r, k) => {
    const valores = {};
    col.forEach((x, j) => { if (!x) return; const v = fTxt(r[j]); if (v) valores[Formulario.chave(x.p, x.it)] = v; });
    return { id: 'r' + (k + 1), data: iData >= 0 ? fDataIso(r[iData]) : '', valores };
  }).filter((r) => Object.keys(r.valores).length || r.data);
  perguntas.forEach((p) => Formulario.detectarTipo(p, respostas));
  return { perguntas, respostas };
};

/** Tipo de uma pergunta pelo texto e pelas respostas. */
Formulario.detectarTipo = function (p, respostas) {
  const chaves = p.tipo === 'grade' ? p.itens.map((it) => Formulario.chave(p, it)) : [p.id];
  const vals = respostas.flatMap((r) => chaves.map((k) => r.valores[k])).filter(Boolean);
  const nums = vals.map(fNum).filter((x) => x !== null);
  const escalaNum = vals.length && nums.length >= vals.length * 0.8;
  const defEscala = () => {
    const rot = {};
    vals.forEach((v) => { const n = fNum(v), r = fRotulo(v); if (n !== null && r && !rot[n]) rot[n] = r; });
    const min = Math.min(...nums), max = Math.max(...nums);
    const rMin = String(rot[min] || ''), rMax = String(rot[max] || '');
    p.escala = { min: Math.min(min, 1), max: Math.max(max, Object.keys(rot).length ? Math.max(...Object.keys(rot).map(Number)) : max), rotulos: rot,
      invertida: /muito importante|mais importante|essencial|excelente|melhor/i.test(rMin) || /nada|sem import|menos|pior|ruim/i.test(rMax) };
  };
  if (p.tipo === 'grade') { if (escalaNum) defEscala(); else p.opcoes = [...new Set(vals)]; p.analisar = true; return p; }
  if (RE_IDENT.test(p.texto) && !RE_LETRA.test(vals[0] || '')) { p.tipo = 'identificacao'; p.analisar = false; return p; }
  const distintos = [...new Set(vals)];
  if (RE_ABERTA.test(p.texto) && !vals.some((v) => RE_LETRA.test(v))) { p.tipo = 'texto'; return p; }
  if (escalaNum && distintos.length <= 11 && nums.every((n) => Number.isInteger(n))) { p.tipo = 'escala'; defEscala(); return p; }
  if (vals.length && vals.filter((v) => RE_LETRA.test(v)).length >= vals.length * 0.6) {
    const partes = vals.flatMap((v) => (RE_LETRA.test(v) ? v.split(RE_DIV_LETRA) : [])).map(fTxt).filter(Boolean);
    const cont = {}; partes.forEach((x) => { cont[x] = (cont[x] || 0) + 1; });
    // a mesma letra pode ter variações de texto: fica a forma mais frequente de cada letra
    const porLetra = {};
    Object.entries(cont).forEach(([x, n]) => { const l = x[0].toUpperCase(); if (!porLetra[l] || n > porLetra[l][1]) porLetra[l] = [x, n]; });
    p.opcoes = Object.keys(porLetra).sort().map((l) => porLetra[l][0]);
    p.tipo = vals.some((v) => RE_LETRA.test(v) && v.split(RE_DIV_LETRA).length > 1) ? 'caixas' : 'escolha';
    return p;
  }
  if (vals.length >= 4 && distintos.length <= Math.max(5, Math.round(vals.length * 0.25))) {
    const cont = {}; vals.forEach((v) => { cont[v] = (cont[v] || 0) + 1; });
    const simples = distintos.filter((v) => !distintos.some((o) => o !== v && v.startsWith(o + ', ')));
    p.opcoes = simples.sort((a, b) => cont[b] - cont[a]);
    p.tipo = simples.length < distintos.length ? 'caixas' : 'escolha';
    return p;
  }
  p.tipo = 'texto';
  return p;
};

/** Respostas de caixas de seleção → alternativas marcadas. */
Formulario.dividir = function (v, opcoes) {
  v = fTxt(v);
  if (!v) return [];
  if (RE_LETRA.test(v)) return v.split(RE_DIV_LETRA).map(fTxt).filter(Boolean);
  if (opcoes.includes(v)) return [v];
  const out = [], tk = v.split(', ');
  let acc = '';
  tk.forEach((t) => { acc = acc ? acc + ', ' + t : t; if (opcoes.includes(acc)) { out.push(acc); acc = ''; } });
  if (acc) out.push(acc);
  return out;
};

/** Alternativa canônica de uma resposta (pela letra, quando houver). */
const fCanon = (v, opcoes) => {
  if (opcoes.includes(v)) return v;
  if (RE_LETRA.test(v)) { const o = opcoes.find((x) => x[0].toUpperCase() === v[0].toUpperCase() && RE_LETRA.test(x)); if (o) return o; }
  return null;
};

// ------------------------------------------------------------------ análise
Formulario.analisar = function (f) {
  const rs = f.respostas;
  const datas = rs.map((r) => String(r.data || '').slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const perguntas = f.perguntas.map((p, k) => {
    const out = { p, num: k + 1, tipo: p.tipo };
    const val = (it) => rs.map((r) => r.valores[Formulario.chave(p, it)]).filter((v) => fTxt(v));
    if (p.tipo === 'grade') {
      const e = p.escala, numerica = !p.opcoes.length;
      out.itens = p.itens.map((it) => {
        const vs = val(it), ns = vs.map(fNum).filter((x) => x !== null);
        const dist = {};
        if (numerica) { for (let v = e.min; v <= e.max; v++) dist[v] = 0; ns.forEach((n) => { dist[n] = (dist[n] || 0) + 1; }); }
        else { p.opcoes.forEach((o) => { dist[o] = 0; }); vs.forEach((v) => { dist[v] = (dist[v] || 0) + 1; }); }
        const media = ns.length ? ns.reduce((s, x) => s + x, 0) / ns.length : null;
        let imp = null;
        if (media !== null && e.max > e.min) { const s = e.invertida ? e.max + e.min - media : media; imp = 1 + (s - e.min) * 4 / (e.max - e.min); }
        return { it, n: vs.length, media, dist, imp };
      });
      out.respondidas = rs.filter((r) => p.itens.some((it) => fTxt(r.valores[Formulario.chave(p, it)]))).length;
      out.numerica = numerica;
      return out;
    }
    const vs = val(null);
    out.respondidas = vs.length;
    if (p.tipo === 'escolha' || p.tipo === 'caixas') {
      const cont = new Map(p.opcoes.map((o) => [o, 0])), outros = new Map();
      vs.forEach((v) => (p.tipo === 'caixas' ? Formulario.dividir(v, p.opcoes) : [fTxt(v)]).forEach((x) => {
        const c = fCanon(x, p.opcoes);
        if (c) cont.set(c, cont.get(c) + 1); else outros.set(x, (outros.get(x) || 0) + 1);
      }));
      out.contagem = [...cont.entries()].map(([op, n]) => ({ op, n }));
      out.outros = [...outros.entries()].map(([op, n]) => ({ op, n })).sort((a, b) => b.n - a.n);
    } else if (p.tipo === 'escala') {
      const ns = vs.map(fNum).filter((x) => x !== null), e = p.escala;
      out.dist = {}; for (let v = e.min; v <= e.max; v++) out.dist[v] = 0;
      ns.forEach((n) => { out.dist[n] = (out.dist[n] || 0) + 1; });
      out.media = ns.length ? ns.reduce((s, x) => s + x, 0) / ns.length : null;
      out.imp = out.media !== null && e.max > e.min ? 1 + ((e.invertida ? e.max + e.min - out.media : out.media) - e.min) * 4 / (e.max - e.min) : null;
    } else if (p.tipo === 'texto') {
      const cont = new Map();
      vs.forEach((v) => { const k = fTxt(v); const ex = [...cont.keys()].find((x) => fCmp(x) === fCmp(k)); cont.set(ex || k, (cont.get(ex || k) || 0) + 1); });
      out.respostas = [...cont.entries()].map(([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n);
    }
    return out;
  });
  return { n: rs.length, periodo: datas.length ? [datas[0], datas[datas.length - 1]] : null, perguntas, analisadas: perguntas.filter((x) => x.p.analisar && x.p.tipo !== 'identificacao') };
};

/** Necessidades com importância (itens de grade e escalas) → linhas da consolidação. */
Formulario.consolidar = function (f) {
  const an = Formulario.analisar(f), out = [];
  an.analisadas.forEach((x) => {
    if (x.tipo === 'grade' && x.numerica) x.itens.forEach((i) => { if (i.n && i.imp !== null) out.push({ necessidade: i.it.texto, fase: x.p.fase || '', citacoes: i.n, importancia: Math.round(i.imp * 10) / 10 }); });
    if (x.tipo === 'escala' && x.imp !== null && x.respondidas) out.push({ necessidade: x.p.texto, fase: x.p.fase || '', citacoes: x.respondidas, importancia: Math.round(x.imp * 10) / 10 });
  });
  return out.sort((a, b) => b.importancia - a.importancia || b.citacoes - a.citacoes);
};

/** Roteiro-modelo (NeDIP) como perguntas editáveis. */
Formulario.modelo = function () {
  const ps = [['Nome:', 'identificacao'], ['Empresa / instituição:', 'identificacao'], ['Cargo/função:', 'identificacao'], ['Contato (e-mail ou telefone):', 'identificacao']]
    .map(([t, tipo], k) => Formulario.novaPergunta('p' + (k + 1), t, tipo));
  (window.NEDIP_QUESTIONARIO || []).forEach(([fase, perg]) => perg.forEach((t) => { const p = Formulario.novaPergunta('p' + (ps.length + 1), t, 'texto'); p.fase = fase; ps.push(p); }));
  const g = Formulario.novaPergunta('p' + (ps.length + 1), 'Importância dos atributos (1 = sem importância … 5 = essencial)', 'grade');
  g.itens = [1, 2, 3, 4, 5].map((k) => ({ id: 'i' + k, texto: 'Atributo ' + k }));
  g.escala.rotulos = { 1: 'Sem importância', 5: 'Essencial' };
  ps.push(g);
  return ps;
};

/** CSV no formato do Google Forms: em branco (só o cabeçalho) ou com as respostas. */
Formulario.csv = function (f, comRespostas) {
  const perguntas = f.perguntas.length ? f.perguntas : Formulario.modelo();
  const cols = perguntas.flatMap((p) => (p.tipo === 'grade' ? p.itens.map((it) => ({ p, it, rot: `${p.texto} [${it.texto}]` })) : [{ p, it: null, rot: p.texto }]));
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const dataBr = (d) => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}:\d{2}))?/); return m ? `${m[3]}/${m[2]}/${m[1]}${m[4] ? ' ' + m[4] : ''}` : (d || ''); };
  const linhas = [['Carimbo de data/hora', ...cols.map((c) => c.rot)]];
  if (comRespostas) f.respostas.forEach((r) => linhas.push([dataBr(r.data), ...cols.map((c) => r.valores[Formulario.chave(c.p, c.it)] || '')]));
  return '﻿' + linhas.map((l) => l.map(q).join(',')).join('\r\n') + '\r\n';
};

/** Junta respostas importadas a um formulário existente, casando as perguntas pelo texto. */
Formulario.acrescentar = function (f, novo) {
  const mapa = {};
  novo.perguntas.forEach((np) => {
    let p = f.perguntas.find((x) => fCmp(x.texto) === fCmp(np.texto) && (x.tipo === 'grade') === (np.tipo === 'grade'));
    if (!p) { p = Object.assign({}, np, { id: Formulario.proximoId(f.perguntas, 'p'), itens: [] }); f.perguntas.push(p); }
    if (np.tipo === 'grade') np.itens.forEach((it) => {
      let ex = p.itens.find((x) => fCmp(x.texto) === fCmp(it.texto));
      if (!ex) { ex = { id: Formulario.proximoId(p.itens, 'i'), texto: it.texto }; p.itens.push(ex); }
      mapa[Formulario.chave(np, it)] = Formulario.chave(p, ex);
    });
    else {
      mapa[np.id] = p.id;
      np.opcoes.forEach((o) => { if (!p.opcoes.includes(o)) p.opcoes.push(o); });
    }
  });
  novo.respostas.forEach((r) => {
    const valores = {};
    Object.entries(r.valores).forEach(([k, v]) => { if (mapa[k]) valores[mapa[k]] = v; });
    f.respostas.push({ id: Formulario.proximoId(f.respostas, 'r'), data: r.data, valores });
  });
  return f;
};

// ------------------------------------------------------------------ gráficos e destaques
/** Texto curto para títulos e frases (sem parênteses, sem "?" final). */
const fCurto = (t, n = 70) => { t = fLinha(t).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').replace(/[?:.\s]+$/, '').trim(); return t.length > n ? t.slice(0, Math.max(t.lastIndexOf(' ', n), 20)) + '…' : t; };
/** Alternativa sem a letra e sem a explicação ("D) Muito importante; sistemas…" → "Muito importante"). */
const fOpcaoCurta = (o) => { const t = fLinha(o).replace(/^[A-Za-z]\)\s*/, ''); const c = t.split(/[;:]/)[0].replace(/\.$/, '').trim(); return fCurto(c || t, 80); };
const fPct = (n, d) => (d ? Math.round(n / d * 1000) / 10 : 0).toString().replace('.', ',') + '%';
const fDec = (x) => (x === null || x === undefined ? '—' : (Math.round(x * 100) / 100).toString().replace('.', ','));

/** Perguntas que viram gráfico (figura): analisadas, de escolha/caixas/escala/grade, com respostas e com "gráfico" marcado. */
Formulario.perguntasGrafico = (f) => Formulario.analisar(f).analisadas
  .filter((x) => ['escolha', 'caixas', 'escala', 'grade'].includes(x.tipo) && x.p.grafico !== false && x.respondidas).map((x) => x.p);
Formulario.tituloGrafico = (q) => fLinha(q.rotulo) || fLinha(q.texto).replace(/[:\s]+$/, ''); // título completo da pergunta (sem reticências)

/** Frases com a resposta mais citada (ou o item mais importante) de cada pergunta analisada — o usuário edita depois. */
Formulario.gerarDestaques = function (f) {
  const an = Formulario.analisar(f), out = [];
  an.analisadas.forEach((x) => {
    const q = x.p, tema = fLinha(q.texto).replace(/[?:.\s]+$/, '');
    let t = '';
    if ((x.tipo === 'escolha' || x.tipo === 'caixas') && x.respondidas) {
      const l = x.contagem.filter((o) => o.n).sort((a, b) => b.n - a.n);
      if (!l.length) return;
      t = `${tema}: ${fPct(l[0].n, x.respondidas)} (${l[0].n} de ${x.respondidas}) apontaram “${fOpcaoCurta(l[0].op)}”` + (l[1] ? `, seguido de “${fOpcaoCurta(l[1].op)}” (${fPct(l[1].n, x.respondidas)})` : '') + '.';
    } else if (x.tipo === 'escala' && x.media !== null) {
      t = `${tema}: média ${fDec(x.media)} na escala de ${q.escala.min} a ${q.escala.max} (${x.respondidas} respostas).`;
    } else if (x.tipo === 'grade' && x.numerica) {
      const its = x.itens.filter((i) => i.imp !== null).sort((a, b) => b.imp - a.imp);
      if (!its.length) return;
      t = `${tema}: maior importância para “${fCurto(its[0].it.texto, 60)}” (${fDec(its[0].imp)} de 5)` + (its[1] ? `, seguido de “${fCurto(its[1].it.texto, 60)}” (${fDec(its[1].imp)})` : '')
        + (its.length > 2 ? `; menor importância: “${fCurto(its[its.length - 1].it.texto, 60)}” (${fDec(its[its.length - 1].imp)})` : '') + '.';
    } else if (x.tipo === 'texto' && x.respostas && x.respostas.length) {
      const rep = x.respostas.filter((r) => r.n > 1);
      t = `${tema}: ${x.respondidas} resposta(s) aberta(s)` + (rep.length ? `; a mais repetida: “${fCurto(rep[0].t, 80)}” (${rep[0].n}×)` : '') + '.';
    }
    if (t) out.push({ id: 'd' + (out.length + 1), pergunta: q.id, texto: t, incluir: x.tipo !== 'texto' });
  });
  return out;
};

const fXml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Quebra um rótulo em até 2 linhas para o eixo dos gráficos. */
const fLinhasRotulo = (t, n = 44, max = 3) => { // quebra em até 3 linhas; só corta textos muito longos
  const out = [];
  let r = fLinha(t);
  while (r.length > n && out.length < max - 1) {
    let i = r.lastIndexOf(' ', n);
    if (i < 15) i = n;
    out.push(r.slice(0, i).trim()); r = r.slice(i).trim();
  }
  out.push(r.length > n ? r.slice(0, n - 1) + '…' : r);
  return out;
};
const F_CORES = ['#085357', '#409580', '#8cc9b5', '#e0b84a', '#d9773f', '#b3261e', '#7c3aed', '#4b5563', '#0e7490', '#be185d', '#1d4ed8'];

/** Gráfico de uma pergunta (item de Formulario.analisar) em SVG: barras horizontais como no Google Forms; grades em barras empilhadas. */
Formulario.graficoSvg = function (x) {
  const q = x.p, W = 900, lab = 340, x0 = lab + 14, wBar = W - x0 - 110, fonte = 'font-family="Roboto"';
  const rotulo = (t, y, lin) => fLinhasRotulo(t).map((l, k, ls) => `<text x="${lab}" y="${(y + lin / 2 + 5 + (k - (ls.length - 1) / 2) * 15).toFixed(1)}" font-size="13.5" fill="#1d2b2b" text-anchor="end" ${fonte}>${fXml(l)}</text>`).join('');
  let s = '', h;
  if (x.tipo === 'escolha' || x.tipo === 'caixas' || x.tipo === 'escala') {
    const l = x.tipo === 'escala'
      ? Object.keys(x.dist).map(Number).sort((a, b) => a - b).map((k) => ({ op: q.escala.rotulos[k] ? `${k} – ${q.escala.rotulos[k]}` : String(k), n: x.dist[k] }))
      : x.contagem.concat(x.outros.length ? [{ op: `Outras respostas (${x.outros.length})`, n: x.outros.reduce((a, o) => a + o.n, 0) }] : []);
    const lin = Math.max(34, 15 * Math.max(1, ...l.map((o) => fLinhasRotulo(o.op).length)) + 6), topo = 30, max = Math.max(1, ...l.map((o) => o.n));
    const passo = max <= 10 ? 2 : max <= 25 ? 5 : max <= 60 ? 10 : 20, eixo = Math.ceil(max / passo) * passo;
    h = topo + l.length * lin + 30;
    s += `<text x="0" y="16" font-size="15" fill="#555" ${fonte}>${x.respondidas} respostas${x.tipo === 'caixas' ? ' (várias alternativas por pessoa)' : ''}</text>`;
    for (let v = 0; v <= eixo; v += passo) {
      const xx = (x0 + wBar * v / eixo).toFixed(1);
      s += `<line x1="${xx}" y1="${topo}" x2="${xx}" y2="${topo + l.length * lin}" stroke="#e3e8e8"/><text x="${xx}" y="${topo + l.length * lin + 18}" font-size="13" fill="#666" text-anchor="middle" ${fonte}>${v}</text>`;
    }
    l.forEach((o, i) => {
      const y = topo + i * lin, w = wBar * o.n / eixo;
      s += rotulo(o.op, y, lin);
      s += `<rect x="${x0}" y="${y + 6}" width="${Math.max(w, 1.5).toFixed(1)}" height="${lin - 12}" fill="${o.n === max ? '#085357' : '#409580'}"/>`;
      s += `<text x="${(x0 + w + 6).toFixed(1)}" y="${y + lin / 2 + 5}" font-size="13.5" fill="#1d2b2b" ${fonte}>${o.n} (${fPct(o.n, x.respondidas)})</text>`;
    });
  } else {
    const cats = x.numerica ? Object.keys(x.itens[0] ? x.itens[0].dist : {}).map(Number).sort((a, b) => a - b) : q.opcoes.slice();
    const rot = (k) => (x.numerica && q.escala.rotulos[k] ? `${k} – ${q.escala.rotulos[k]}` : String(k));
    const SEQ = ['#e3efeb', '#b5dccf', '#7fbfaa', '#409580', '#1f6f6a', '#085357'];
    const nivel = (ci) => { const t = ci / Math.max(1, cats.length - 1); return Math.round((q.escala.invertida ? 1 - t : t) * 5); }; // 0 = menos importante
    const cor = (ci) => (x.numerica ? SEQ[nivel(ci)] : F_CORES[ci % F_CORES.length]);
    const lin = Math.max(36, 15 * Math.max(1, ...x.itens.map((i) => fLinhasRotulo(i.it.texto).length)) + 6), topo = 30, legLin = Math.ceil(cats.length / 3);
    h = topo + x.itens.length * lin + 18 + legLin * 22;
    s += `<text x="0" y="16" font-size="15" fill="#555" ${fonte}>${x.respondidas} respostas${x.numerica ? ' · à direita, importância de 1 a 5 (5 = mais importante)' : ''}</text>`;
    x.itens.forEach((i, r) => {
      const y = topo + r * lin;
      s += rotulo(i.it.texto, y, lin);
      let acc = 0;
      cats.forEach((k, ci) => {
        const n = i.dist[k] || 0;
        if (!n || !i.n) return;
        const w = wBar * n / i.n, xx = x0 + wBar * acc / i.n;
        acc += n;
        s += `<rect x="${xx.toFixed(1)}" y="${y + 6}" width="${w.toFixed(1)}" height="${lin - 12}" fill="${cor(ci)}"/>`;
        if (w > 22) s += `<text x="${(xx + w / 2).toFixed(1)}" y="${y + lin / 2 + 5}" font-size="12.5" fill="${x.numerica && nivel(ci) <= 2 ? '#1d2b2b' : '#ffffff'}" text-anchor="middle" ${fonte}>${n}</text>`;
      });
      if (x.numerica && i.imp !== null) s += `<text x="${x0 + wBar + 10}" y="${y + lin / 2 + 5}" font-size="13.5" font-weight="bold" fill="#085357" ${fonte}>${fDec(i.imp)}</text>`;
    });
    const ly = topo + x.itens.length * lin + 22;
    cats.forEach((k, ci) => {
      const lx = x0 + (ci % 3) * (wBar / 3), yy = ly + Math.floor(ci / 3) * 22;
      s += `<rect x="${lx.toFixed(1)}" y="${yy - 11}" width="13" height="13" fill="${cor(ci)}"/><text x="${(lx + 18).toFixed(1)}" y="${yy}" font-size="12.5" fill="#333" ${fonte}>${fXml(fCurto(rot(k), 32))}</text>`;
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}"><rect width="${W}" height="${h}" fill="#ffffff"/>${s}</svg>`;
};

// ================================================================== tela (projeto informacional)
App.formAberto = { perguntas: false, respostas: false, destaques: false };
App.novos.perguntaForm = () => Formulario.novaPergunta(Formulario.proximoId(App.p.produto.etapas.informacional.formulario.perguntas, 'p'), '', 'texto');
App.novos.respostaForm = () => ({ id: Formulario.proximoId(App.p.produto.etapas.informacional.formulario.respostas, 'r'), data: hojeISO(), valores: {} });
App.formMacroAtual = () => { const m = App.p.macroentregas.find((x) => (x.blocos || []).some((b) => b.tipo === 'questionario')); return m ? m.uid : ''; };

App.formularioHtml = function (e, b) {
  const f = e.formulario, bf = b + '.formulario', c = App.campo;
  const an = Formulario.analisar(f);
  const temP = f.perguntas.length, temR = f.respostas.length;
  const opM = [['', '— não anexar —']].concat(App.p.macroentregas.map((m, i) => [m.uid, `Macroentrega ${i + 1} · ${m.titulo || '(sem título)'}`]));
  let h = `<div class="form-box"><h4 style="margin-top:0">Pré-projeto informacional: questionário (Google Forms)</h4>
  <ol class="muted" style="margin-top:0">
    <li>Monte o formulário: baixe o <b>CSV em branco</b> (perguntas atuais ou o roteiro-modelo) e use-o como base no Google Forms.</li>
    <li>Aplique aos clientes de cada fase do ciclo de vida.</li>
    <li>No Forms: <b>Respostas → ⋮ → Baixar respostas (.csv)</b> e importe aqui. Perguntas e respondentes podem ser editados depois.</li></ol>
  <div class="barra"><label class="btn primario">⬆ Importar CSV do Google Forms<input type="file" accept=".csv,.txt,text/csv,text/plain" hidden id="csvForms"></label>
    <button class="btn" data-acao="form-csv" data-com="0">⬇ CSV em branco (base para o Forms)</button>
    ${temR ? '<button class="btn" data-acao="form-csv" data-com="1">⬇ CSV com as respostas</button>' : ''}
    ${temP ? '' : '<button class="btn" data-acao="form-modelo">Começar pelo roteiro-modelo</button>'}
    ${temP ? '<button class="btn primario" data-acao="form-pdf">📄 Documento do questionário (PDF)</button>' : ''}
    ${an.analisadas.some((x) => (x.tipo === 'grade' && x.numerica) || x.tipo === 'escala') && temR ? '<button class="btn" data-acao="form-consolidar">→ Gerar a consolidação (necessidades com importância)</button>' : ''}
    ${temP ? '<button class="btn perigo" data-acao="form-limpar">Limpar questionário</button>' : ''}</div>`;
  if (!temP) return h + '<p class="vazio">Nenhum questionário importado.</p></div>';
  h += `<div class="grade-campos">${c(bf + '.titulo', 'Título da pesquisa', { ph: 'ex.: Levantamento de necessidades dos clientes' })}
    ${c(bf + '.publico', 'Público / fase do ciclo de vida')}${c(bf + '.meio', 'Meio de aplicação')}
    <label class="campo">Anexar o documento a uma macroentrega<select data-form-macro="1">${App.opcoes(opM, App.formMacroAtual())}</select></label></div>
  <p class="muted">${temR} respondente(s)${an.periodo ? ` entre ${dataBR(an.periodo[0])} e ${dataBR(an.periodo[1])}` : ''} · ${temP} pergunta(s), ${an.analisadas.length} analisada(s)${f.arquivo ? ` · arquivo: ${esc(f.arquivo)}` : ''}${f.importadoEm ? ` (importado em ${esc(f.importadoEm.replace('T', ' ').slice(0, 16))})` : ''}.
    Campos de identificação (nome, contato…) não são reproduzidos no documento.</p>`;

  // perguntas
  h += `<details class="form-det" data-det="perguntas" ${App.formAberto.perguntas ? 'open' : ''}><summary>Perguntas (${temP}) — editar texto, tipo, alternativas e itens</summary>
  <div class="rolagem"><table class="tab-edit"><thead><tr><th style="width:34px">#</th><th>Pergunta</th><th style="width:190px">Tipo</th><th>Alternativas / itens (um por linha)</th><th style="width:130px">Fase do ciclo de vida</th><th style="width:96px">Escala</th><th style="width:70px">Analisar</th><th style="width:70px">Gráfico</th><th class="acoes" style="width:90px"></th></tr></thead><tbody>
  ${f.perguntas.map((p, i) => {
    const bp = `${bf}.perguntas.${i}`;
    const lista = p.tipo === 'grade' ? p.itens.map((x) => x.texto).join('\n') : p.opcoes.join('\n');
    const usaLista = ['grade', 'escolha', 'caixas'].includes(p.tipo);
    const usaEscala = p.tipo === 'grade' ? !p.opcoes.length : p.tipo === 'escala';
    const temGraf = ['escolha', 'caixas', 'escala', 'grade'].includes(p.tipo);
    return `<tr><td>P${i + 1}</td><td>${c(bp + '.texto', '', { tipo: 'textarea', linhas: 2 })}${temGraf && p.grafico ? c(bp + '.rotulo', '', { ph: 'título da figura: ' + Formulario.tituloGrafico(p) }) : ''}</td>
      <td>${c(bp + '.tipo', '', { tipo: 'select', render: true, opcoes: Formulario.TIPOS })}</td>
      <td>${usaLista ? `<textarea rows="3" data-form-lista="${p.tipo === 'grade' ? 'itens' : 'opcoes'}" data-i="${i}" placeholder="${p.tipo === 'grade' ? 'um item por linha' : 'uma alternativa por linha'}">${esc(lista)}</textarea>` : '<span class="muted">—</span>'}</td>
      <td>${c(bp + '.fase', '')}</td>
      <td>${usaEscala ? `<span class="muted">${p.escala.min} a ${p.escala.max}</span>${c(bp + '.escala.invertida', `${p.escala.min} = mais importante`, { tipo: 'checkbox', classe: 'rec' })}` : ''}</td>
      <td class="centro">${c(bp + '.analisar', '', { tipo: 'checkbox' })}</td>
      <td class="centro">${temGraf ? c(bp + '.grafico', '', { tipo: 'checkbox', render: true }) : ''}</td>
      <td class="acoes"><button class="btn pequeno" data-acao="mover" data-lista="${bf}.perguntas" data-i="${i}" data-d="-1" title="Subir">↑</button><button class="btn pequeno" data-acao="mover" data-lista="${bf}.perguntas" data-i="${i}" data-d="1" title="Descer">↓</button><button class="btn pequeno perigo" data-acao="form-rem-pergunta" data-i="${i}" title="Excluir">✕</button></td></tr>`;
  }).join('')}</tbody></table></div>
  <div class="barra"><button class="btn pequeno" data-acao="add-linha" data-lista="${bf}.perguntas" data-novo="perguntaForm">+ Pergunta</button></div></details>`;

  // destaques (frases para o relatório)
  h += `<details class="form-det" data-det="destaques" ${App.formAberto.destaques ? 'open' : ''}><summary>Destaques para o relatório (${f.destaques.filter((d) => d.incluir).length}) — frases com os principais resultados</summary>
  <p class="muted" style="margin-top:4px">Geradas a partir das respostas (alternativa mais citada, item mais importante…) e editáveis. Entram em “Principais resultados” no documento e no bloco do questionário. Sem destaques salvos, o relatório usa os gerados na hora.</p>
  <div class="barra"><button class="btn pequeno" data-acao="form-destaques">↻ Gerar destaques a partir das respostas</button></div>
  ${f.destaques.length ? `<table class="tab-edit"><tbody>${f.destaques.map((d, i) => `<tr><td style="width:60px" class="centro">${c(`${bf}.destaques.${i}.incluir`, '', { tipo: 'checkbox' })}</td>
    <td>${c(`${bf}.destaques.${i}.texto`, '', { tipo: 'textarea', linhas: 2 })}</td>
    <td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${bf}.destaques" data-i="${i}">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="vazio">Nenhum destaque salvo.</p>'}
  </details>`;

  // respondentes (montado só quando aberto: pode ter centenas de campos)
  h += `<details class="form-det" data-det="respostas" ${App.formAberto.respostas ? 'open' : ''}><summary>Respondentes (${temR}) — editar ou excluir respostas</summary>`;
  if (App.formAberto.respostas) {
    const cols = Formulario.colunas(f);
    h += `<div class="rolagem form-resp"><table class="tab-edit"><thead><tr><th style="min-width:150px">Data</th>${cols.map(({ p, it }) => {
      const n = f.perguntas.indexOf(p) + 1, tt = it ? `${p.texto} [${it.texto}]` : p.texto;
      return `<th title="${esc(tt)}">P${n}${it ? '·' + esc(it.texto.slice(0, 18)) : ''}<br><span class="muted">${esc(p.texto.slice(0, 28))}${p.texto.length > 28 ? '…' : ''}</span></th>`;
    }).join('')}<th class="acoes"></th></tr></thead><tbody>
    ${f.respostas.map((r, i) => `<tr><td>${c(`${bf}.respostas.${i}.data`, '')}</td>${cols.map(({ p, it }) => `<td>${c(`${bf}.respostas.${i}.valores.${Formulario.chave(p, it)}`, '')}</td>`).join('')}
      <td class="acoes"><button class="btn pequeno perigo" data-acao="rem-linha" data-lista="${bf}.respostas" data-i="${i}" title="Excluir respondente">✕</button></td></tr>`).join('') || `<tr><td colspan="${cols.length + 2}" class="vazio">Nenhum respondente.</td></tr>`}
    </tbody></table></div>`;
  }
  h += `<div class="barra"><button class="btn pequeno" data-acao="add-linha" data-lista="${bf}.respostas" data-novo="respostaForm">+ Respondente</button></div></details></div>`;
  return h;
};

App.formularioDepois = function () {
  const inp = $('#csvForms');
  if (inp) inp.addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) App.formImportar(f); });
  $$('.form-det').forEach((d) => d.addEventListener('toggle', () => { const era = App.formAberto[d.dataset.det]; App.formAberto[d.dataset.det] = d.open; if (d.dataset.det === 'respostas' && d.open && !era) App.render(); }));
  $$('textarea[data-form-lista]').forEach((t) => t.addEventListener('change', () => {
    const p = App.p.produto.etapas.informacional.formulario.perguntas[+t.dataset.i];
    const ls = t.value.split('\n').map(fLinha).filter(Boolean);
    if (t.dataset.formLista === 'itens') {
      const ids = new Set();
      p.itens = ls.map((texto, k) => { const it = p.itens[k] ? Object.assign({}, p.itens[k], { texto }) : { id: Formulario.proximoId(p.itens.concat([...ids].map((id) => ({ id }))), 'i'), texto }; ids.add(it.id); return it; });
    } else p.opcoes = ls;
    App.marcarSujo(true);
  }));
  const sel = $('select[data-form-macro]');
  if (sel) sel.addEventListener('change', () => { App.formAnexarMacro(sel.value); App.marcarSujo(true); App.render(); });
};

/** Coloca (ou tira) o bloco "Questionário" no fim do desenvolvimento da macroentrega escolhida. */
App.formAnexarMacro = function (uid) {
  let bloco = null;
  App.p.macroentregas.forEach((m) => { const i = m.blocos.findIndex((b) => b.tipo === 'questionario'); if (i >= 0) { bloco = bloco || m.blocos[i]; m.blocos.splice(i, 1); } });
  const m = App.p.macroentregas.find((x) => x.uid === uid);
  if (m) { m.blocos.push(bloco || Nucleo.novoBloco('questionario')); App.toast(`Documento do questionário anexado à macroentrega ${App.p.macroentregas.indexOf(m) + 1} (bloco no fim do desenvolvimento; pode ser movido lá).`, 'ok', 7000); }
};

App.formImportar = async function (arquivo) {
  let novo;
  try {
    const txt = Formulario.decodificar(await arquivo.arrayBuffer());
    novo = Formulario.importar(Formulario.lerCsv(txt));
    if (!novo.perguntas.length) throw new Error('nenhuma pergunta no cabeçalho.');
  } catch (e) { App.toast('CSV do questionário: ' + esc(e.message), 'erro', 9000); return; }
  const e = App.p.produto.etapas.informacional, f = e.formulario;
  const aplicar = async (modo) => {
    App.fecharModal();
    if (modo === 'acrescentar') Formulario.acrescentar(f, novo);
    else { f.perguntas = novo.perguntas; f.respostas = novo.respostas; }
    f.arquivo = arquivo.name; f.importadoEm = Nucleo.agoraIso();
    if (!f.titulo) f.titulo = arquivo.name.replace(/\.[^.]+$/, '').replace(/\s*-\s*Respostas ao formul[aá]rio.*$/i, '').replace(/\s*\(respostas\)\s*/i, ' ').trim();
    App.formRegistrarAplicacao();
    await App.nedipAnexar([arquivo], 'informacional', 'Respostas do questionário (CSV do Google Forms)', true);
    e.recomendacoes.inf_quest = true;
    e.ferramentas.questionarios = true;
    if (e.status === 'não iniciada') e.status = 'em andamento';
    App.p.log.push({ dataHora: Nucleo.agoraIso(), acao: `Questionário importado (${arquivo.name}): ${novo.respostas.length} resposta(s), ${novo.perguntas.length} pergunta(s)`, usuario: App.cfg.usuario || '' });
    App.formAberto.perguntas = true;
    App.marcarSujo(true); App.render();
    const t = Formulario.analisar(f).perguntas.reduce((o, x) => { o[x.tipo] = (o[x.tipo] || 0) + 1; return o; }, {});
    App.toast(`Questionário: ${f.respostas.length} respondente(s), ${f.perguntas.length} pergunta(s) — ${Formulario.TIPOS.filter(([k]) => t[k]).map(([k, r]) => `${t[k]} ${r.split(' (')[0].toLowerCase()}`).join(', ')}. Confira os tipos em “Perguntas”.`, 'ok', 10000);
  };
  if (!f.perguntas.length) { await aplicar('substituir'); return; }
  App._formAplicar = aplicar;
  App.modal(`<h2>Importar respostas</h2><p>Este projeto já tem um questionário com ${f.perguntas.length} pergunta(s) e ${f.respostas.length} respondente(s). O arquivo traz ${novo.perguntas.length} pergunta(s) e ${novo.respostas.length} resposta(s).</p>
    <div class="barra"><button class="btn primario" data-acao="form-imp" data-modo="acrescentar">Acrescentar as respostas (casa as perguntas pelo texto)</button>
    <button class="btn perigo" data-acao="form-imp" data-modo="substituir">Substituir o questionário</button><button class="btn" data-acao="fechar-modal">Cancelar</button></div>`);
};
App.acoes['form-imp'] = (el) => App._formAplicar && App._formAplicar(el.dataset.modo);

/** Mantém uma linha no quadro "Questionários aplicados" com o número de respondentes do formulário. */
App.formRegistrarAplicacao = function () {
  const e = App.p.produto.etapas.informacional, f = e.formulario, an = Formulario.analisar(f);
  let q = e.questionarios.find((x) => x.origem === 'formulario');
  if (!q) { q = Object.assign(App.novos.questionario(), { origem: 'formulario' }); e.questionarios.push(q); }
  Object.assign(q, { publico: f.publico || q.publico || 'Respondentes do formulário', meio: f.meio || 'Google Forms', respondentes: f.respostas.length, data: an.periodo ? an.periodo[0] : q.data });
  if (!q.observacao) q.observacao = 'Resultados no documento do questionário.';
};

App.acoes['form-csv'] = (el) => {
  const f = App.p.produto.etapas.informacional.formulario, com = el.dataset.com === '1';
  App.baixarBlob(new Blob([Formulario.csv(f, com)], { type: 'text/csv;charset=utf-8' }), `${com ? 'Respostas' : 'Modelo de formulário'} - ${App.nedipNomeSeguro(App.p.projeto.nome || 'projeto')}.csv`);
  if (!com && !f.perguntas.length) App.toast('CSV com o roteiro-modelo. Para ajustar as perguntas antes, use “Começar pelo roteiro-modelo”.', 'aviso', 8000);
};
App.acoes['form-modelo'] = () => {
  const f = App.p.produto.etapas.informacional.formulario;
  f.perguntas = Formulario.modelo(); App.formAberto.perguntas = true;
  App.marcarSujo(true); App.render();
};
App.acoes['form-limpar'] = () => {
  if (!confirm('Apagar as perguntas e as respostas do questionário? (O CSV importado continua nos documentos da fase.)')) return;
  const e = App.p.produto.etapas.informacional;
  e.formulario = Formulario.vazio();
  e.questionarios = e.questionarios.filter((q) => q.origem !== 'formulario');
  App.marcarSujo(true); App.render();
};
App.acoes['form-rem-pergunta'] = (el) => {
  const f = App.p.produto.etapas.informacional.formulario, p = f.perguntas[+el.dataset.i];
  if (!p || !confirm(`Excluir a pergunta P${+el.dataset.i + 1} e as respostas dela?`)) return;
  const chaves = new Set(p.tipo === 'grade' ? p.itens.map((it) => Formulario.chave(p, it)) : [p.id]);
  f.respostas.forEach((r) => Object.keys(r.valores).forEach((k) => { if (chaves.has(k) || k.startsWith(p.id + '__')) delete r.valores[k]; }));
  f.perguntas.splice(+el.dataset.i, 1);
  App.marcarSujo(true); App.render();
};
App.acoes['form-destaques'] = () => {
  const f = App.p.produto.etapas.informacional.formulario;
  if (f.destaques.length && !confirm(`Substituir os ${f.destaques.length} destaque(s) atuais (inclusive os editados) pelos gerados agora?`)) return;
  f.destaques = Formulario.gerarDestaques(f); App.formAberto.destaques = true;
  App.marcarSujo(true); App.render();
  App.toast(`${f.destaques.length} destaque(s) gerado(s). Revise o texto antes de usar no relatório.`, 'ok');
};
App.acoes['form-consolidar'] = () => {
  const e = App.p.produto.etapas.informacional, l = Formulario.consolidar(e.formulario);
  if (!l.length) { App.toast('Nenhuma pergunta de escala/grade com respostas numéricas para consolidar.', 'aviso'); return; }
  if (e.consolidacao.length && !confirm(`Substituir as ${e.consolidacao.length} linha(s) da consolidação por ${l.length} vindas do questionário?`)) return;
  e.consolidacao = l; e.recomendacoes.inf_quest = true;
  App.formRegistrarAplicacao();
  App.marcarSujo(true); App.render();
  App.toast(`${l.length} necessidade(s) na consolidação (importância de 1 a 5, maior = mais importante). Use “→ Usar como requisitos de cliente” se quiser.`, 'ok', 8000);
};
App.acoes['form-pdf'] = async () => {
  try { App.baixarBlob(await Pdf.gerar(Pdf.questionarioFormulario(App.p)), `Questionário - resultados - ${App.nedipNomeSeguro(App.p.projeto.nome || 'projeto')}.pdf`); }
  catch (e) { console.error(e); App.toast('Erro ao gerar o PDF: ' + esc(e.message), 'erro', 9000); }
};

// ================================================================== PDF

/**
 * Conteúdo do documento do questionário (também usado no bloco da macroentrega).
 * partes: identificacao, roteiro, resultados, consolidacao. ctx: { h(titulo) → nó, recuo }
 */
Pdf.blocoQuestionario = function (p, partes, ctx) {
  const e = p.produto.etapas.informacional, f = e.formulario;
  ctx = Object.assign({ h: (t) => ({ text: t, style: 'h3' }), recuo: 0 }, ctx);
  if (!f.perguntas.length) return [{ text: 'Questionário não importado: importe o CSV do Google Forms no projeto informacional.', style: 'muted' }];
  const an = Formulario.analisar(f), c = [];
  const larg = Pdf.ctxLargura(ctx.recuo).retrato;
  if (partes.includes('identificacao')) {
    c.push(ctx.h('Identificação da pesquisa'), Pdf.kpi([['Pesquisa', f.titulo || '—'], ['Público', f.publico || '—'], ['Meio', f.meio || '—'],
      ['Período', an.periodo ? `${Nucleo.dataBR(an.periodo[0])} a ${Nucleo.dataBR(an.periodo[1])}` : '—'], ['Respondentes', String(an.n)],
      ['Perguntas', `${f.perguntas.length} (${an.analisadas.length} analisadas; dados de identificação não são reproduzidos)`]]));
  }
  if (partes.includes('destaques')) {
    const ds = f.destaques.length ? f.destaques : Formulario.gerarDestaques(f); // sem destaques editados: gera na hora
    const l = ds.filter((d) => d.incluir && String(d.texto).trim()).map((d) => ({ text: Nucleo.mdInline(d.texto).map((t) => (t.b || t.i ? { text: t.t, bold: t.b, italics: t.i } : t.t)) }));
    if (l.length) c.push(ctx.h('Principais resultados'), { ul: l, style: 'corpo', margin: [0, 0, 0, 6] });
  }
  if (partes.includes('roteiro')) {
    c.push(ctx.h('Roteiro aplicado'));
    let fase = null;
    f.perguntas.forEach((q, i) => {
      if (q.fase && q.fase !== fase) { fase = q.fase; c.push({ text: fase, bold: true, color: COR.teal, margin: [0, 6, 0, 2] }); }
      const det = q.tipo === 'grade' ? q.itens.map((it) => it.texto) : ['escolha', 'caixas'].includes(q.tipo) ? q.opcoes.slice() : []; // cópia: o pdfmake altera as listas que recebe
      const esc0 = (q.tipo === 'escala' || (q.tipo === 'grade' && !q.opcoes.length)) ? ` (escala de ${q.escala.min} a ${q.escala.max}${q.escala.invertida ? `; ${q.escala.min} = mais importante` : ''})` : '';
      c.push({ stack: [{ text: [{ text: `P${i + 1}. `, bold: true }, q.texto, { text: `  — ${Formulario.TIPOS.find(([t]) => t === q.tipo)[1].split(' (')[0].toLowerCase()}${esc0}`, color: COR.suave, fontSize: 8.5 }], style: 'corpo' },
        ...(det.length ? [{ ul: det, fontSize: 8.8, color: COR.texto, margin: [10, 1, 0, 0] }] : [])], margin: [0, 2, 0, 3], unbreakable: det.length < 12 });
    });
  }
  if (partes.includes('graficos')) {
    const qs = Formulario.perguntasGrafico(f);
    let local = 0;
    qs.forEach((q, k) => {
      const x = an.perguntas.find((y) => y.p === q);
      const n = (ctx.num && ctx.num.fig[`qg_${ctx.blocoId}_${q.id}`]) || ++local;
      const leg = { text: `Figura ${n} – ${Formulario.tituloGrafico(q)}`, style: 'legenda' };
      if (ctx.tocFig) { leg.tocItem = ctx.tocFig; leg.tocStyle = { fontSize: 9.5 }; }
      c.push({ stack: [...(k ? [] : [ctx.h('Gráficos das respostas')]), leg, ...(fLinha(q.rotulo) ? [{ text: `P${x.num}. ${q.texto}`, style: 'muted', alignment: 'center', margin: [0, 0, 0, 3] }] : []),
        { svg: Formulario.graficoSvg(x), width: Math.min(larg, 440), alignment: 'center' },
        { text: fonteAbnt(`Elaborado pelos autores com dados do questionário (${new Date().getFullYear()})`), style: 'fonte' }], unbreakable: true, margin: [0, 6, 0, 10] });
    });
  }
  if (partes.includes('resultados')) {
    c.push(ctx.h('Resultados por pergunta'));
    if (!an.n) c.push({ text: 'Nenhuma resposta importada.', style: 'muted' });
    else an.analisadas.forEach((x) => {
      const q = x.p, tit = { text: [{ text: `P${x.num}. `, bold: true }, q.texto], style: 'corpo', bold: true, margin: [0, 8, 0, 2] };
      const sub = { text: `${x.respondidas} de ${an.n} responderam${q.tipo === 'caixas' ? ' (várias alternativas por pessoa; % sobre quem respondeu)' : ''}.`, style: 'muted', margin: [0, 0, 0, 2] };
      let corpoQ = [];
      if (q.tipo === 'escolha' || q.tipo === 'caixas') {
        const l = x.contagem.concat(x.outros.length ? [{ op: `Outras respostas (${x.outros.length})`, n: x.outros.reduce((s, o) => s + o.n, 0) }] : []);
        const max = Math.max(1, ...l.map((o) => o.n));
        corpoQ.push(Pdf.grade(['Alternativa', 'Respostas', '%', ''], l.map((o) => [o.op, { text: String(o.n), alignment: 'center', bold: o.n === max }, { text: fPct(o.n, x.respondidas), alignment: 'center' },
          { canvas: [{ type: 'rect', x: 0, y: 2, w: Math.max(1.5, 80 * o.n / max), h: 7, color: o.n === max ? COR.escuro : COR.teal }] }]), ['*', 48, 40, 84]));
        if (x.outros.length) corpoQ.push({ text: 'Outras respostas: ' + x.outros.map((o) => `${o.op}${o.n > 1 ? ` (${o.n}×)` : ''}`).join('; ') + '.', style: 'muted', margin: [0, 0, 0, 4] });
      } else if (q.tipo === 'escala') {
        const ks = Object.keys(x.dist).map(Number).sort((a, b) => a - b);
        corpoQ.push(Pdf.grade([...ks.map((k) => (q.escala.rotulos[k] ? `${k} – ${q.escala.rotulos[k]}` : String(k))), 'Média', 'Importância (1–5)'],
          [[...ks.map((k) => ({ text: `${x.dist[k]} (${fPct(x.dist[k], x.respondidas)})`, alignment: 'center' })), { text: fDec(x.media), alignment: 'center', bold: true }, { text: fDec(x.imp), alignment: 'center', bold: true }]]));
      } else if (q.tipo === 'grade' && x.numerica) {
        const ks = Object.keys(x.itens[0] ? x.itens[0].dist : {}).map(Number).sort((a, b) => a - b);
        const its = [...x.itens].sort((a, b) => (b.imp ?? -1) - (a.imp ?? -1));
        const wk = Math.max(16, Math.min(24, (larg - 230) / Math.max(1, ks.length)));
        corpoQ.push(Pdf.grade(['Item', 'n', ...ks.map(String), 'Média', 'Importância (1–5)', ''], its.map((i) => [i.it.texto, { text: String(i.n), alignment: 'center' },
          ...ks.map((k) => ({ text: String(i.dist[k] || 0), alignment: 'center', color: i.dist[k] ? COR.texto : '#aaaaaa' })),
          { text: fDec(i.media), alignment: 'center' }, { text: fDec(i.imp), alignment: 'center', bold: true },
          { canvas: [{ type: 'rect', x: 0, y: 2, w: Math.max(1.5, 50 * ((i.imp || 1) - 1) / 4), h: 7, color: COR.teal }] }]), ['*', 20, ...ks.map(() => wk), 34, 52, 54]));
        const r = q.escala.rotulos;
        corpoQ.push({ text: `Escala de ${q.escala.min} a ${q.escala.max}${Object.keys(r).length ? ' (' + Object.entries(r).map(([k, v]) => `${k} = ${v}`).join('; ') + ')' : ''}. Importância convertida para 1–5, em que 5 = mais importante${q.escala.invertida ? ` (na pergunta, ${q.escala.min} era o mais importante)` : ''}.`, style: 'muted', margin: [0, 0, 0, 4] });
      } else if (q.tipo === 'grade') {
        const ops = q.opcoes;
        corpoQ.push(Pdf.grade(['Item', ...ops], x.itens.map((i) => [i.it.texto, ...ops.map((o) => ({ text: String(i.dist[o] || 0), alignment: 'center' }))])));
      } else if (q.tipo === 'texto') {
        corpoQ.push({ ul: x.respostas.map((r) => (r.n > 1 ? { text: [r.t, { text: ` (${r.n}×)`, bold: true, color: COR.teal }] } : r.t)), style: 'corpo', fontSize: 8.8, margin: [0, 0, 0, 4] });
      }
      c.push({ stack: [tit, sub, ...corpoQ], unbreakable: q.tipo !== 'texto' && (q.tipo !== 'grade' || x.itens.length < 14) });
    });
  }
  if (partes.includes('consolidacao')) {
    const cons = e.consolidacao.filter((x) => String(x.necessidade).trim());
    if (cons.length) {
      const nec = nedipNecessidadesDaConsolidacao(cons);
      const porNome = Object.fromEntries(cons.map((x) => [x.necessidade.trim(), x]));
      const maxP = Math.max(...nec.map((n) => n.peso)) || 1;
      c.push(ctx.h('Necessidades consolidadas'), Pdf.grade(['Necessidade', 'Fase', 'Citações', 'Importância (1–5)', 'Peso relativo', ''], nec.map((n) => {
        const x = porNome[n.descricao] || {};
        return [n.descricao, x.fase || '—', { text: String(x.citacoes ?? '—'), alignment: 'center' }, { text: fDec(x.importancia), alignment: 'center' }, { text: fPct(n.peso, 1), alignment: 'center' },
          { canvas: [{ type: 'rect', x: 0, y: 2, w: Math.max(2, 60 * n.peso / maxP), h: 7, color: COR.teal }] }];
      }), ['*', 66, 42, 52, 46, 64]),
      { text: 'Peso relativo = (importância média × citações) ÷ soma de todas as necessidades. A comparação aos pares no QFD é uma hierarquização mais rigorosa.', style: 'muted', margin: [0, 0, 0, 6] });
    }
  }
  return c;
};

/** Documento avulso, no padrão do roteiro: capa, sumário, identificação, roteiro, resultados e consolidação. */
Pdf.questionarioFormulario = function (p) {
  const { h1 } = secoesNumeradas();
  let primeira = true;
  const h = (t) => { const r = { stack: h1(t, primeira) }; primeira = false; return r; };
  const c = [{ toc: { id: 'sum', title: { text: 'Sumário', style: 'h1', margin: [0, 0, 0, 12] } }, pageBreak: 'before' },
    ...Pdf.blocoQuestionario(p, ['identificacao', 'destaques', 'roteiro', 'graficos', 'resultados', 'consolidacao'], { h }),
    { text: 'Base: levantamento de necessidades por fase do ciclo de vida no projeto informacional. ' + NEDIP_REF, style: 'muted', margin: [0, 10, 0, 0] }];
  const f = p.produto.etapas.informacional.formulario;
  return Pdf.documento(p, 'QUESTIONÁRIO', 'RESULTADOS', 'Questionário – resultados', c, `Projeto informacional · ${f.titulo || p.projeto.nome}`);
};

/** Roteiro imprimível com as perguntas do formulário (alternativas, escalas e grades para marcar). */
Pdf.roteiroFormulario = function (p) {
  const pj = p.projeto, f = p.produto.etapas.informacional.formulario, c = [];
  const linhas = (n) => ({ canvas: Array.from({ length: n }, (_, i) => ({ type: 'line', x1: 0, y1: 14 + i * 16, x2: 470, y2: 14 + i * 16, lineWidth: 0.4, lineColor: COR.grade })), margin: [0, 0, 0, 6] });
  c.push({ text: f.titulo || 'Roteiro de questionário – necessidades dos clientes', style: 'h1', pageBreak: 'before' });
  c.push({ text: `Projeto: ${pj.nome}.${f.publico ? ' Público: ' + f.publico + '.' : ''} Marque uma alternativa ( ) ou todas as que se aplicam [ ], conforme indicado.`, style: 'corpo', margin: [0, 0, 0, 8] });
  let fase = null;
  f.perguntas.forEach((q, i) => {
    const bloco = [];
    if (q.fase && q.fase !== fase) { fase = q.fase; c.push({ text: fase, style: 'h2', margin: [0, 8, 0, 4] }); }
    bloco.push({ text: [{ text: `${i + 1}. `, bold: true }, q.texto, q.tipo === 'caixas' ? { text: ' (marque todas que se aplicam)', color: COR.suave } : ''], style: 'corpo', margin: [0, 4, 0, 2] });
    if (q.tipo === 'identificacao') bloco.push(linhas(1));
    else if (q.tipo === 'texto') bloco.push(linhas(3));
    else if (q.tipo === 'escolha' || q.tipo === 'caixas') bloco.push({ stack: q.opcoes.map((o) => ({ text: `${q.tipo === 'caixas' ? '[  ]' : '(  )'}  ${o}`, style: 'corpo', margin: [10, 1, 0, 1] })), margin: [0, 0, 0, 6] });
    else if (q.tipo === 'escala') {
      const ks = []; for (let k = q.escala.min; k <= q.escala.max; k++) ks.push(k);
      bloco.push(Pdf.grade(ks.map((k) => (q.escala.rotulos[k] ? `${k} – ${q.escala.rotulos[k]}` : String(k))), [ks.map(() => ({ text: '(  )', alignment: 'center' }))]));
    } else if (q.tipo === 'grade') {
      const ks = [];
      if (q.opcoes.length) ks.push(...q.opcoes); else for (let k = q.escala.min; k <= q.escala.max; k++) ks.push(q.escala.rotulos[k] ? `${k} – ${q.escala.rotulos[k]}` : String(k));
      bloco.push(Pdf.grade(['Item', ...ks], q.itens.map((it) => [it.texto, ...ks.map(() => ({ text: '(  )', alignment: 'center' }))]), ['*', ...ks.map(() => Math.max(26, Math.min(62, 260 / ks.length)))]));
    }
    c.push({ stack: bloco, unbreakable: true });
  });
  c.push({ text: 'Base: levantamento de necessidades por fase do ciclo de vida no projeto informacional. ' + NEDIP_REF, style: 'muted', margin: [0, 8, 0, 0] });
  return Pdf.documento(p, 'ROTEIRO DE', 'QUESTIONÁRIO', 'Roteiro de questionário', c, 'Projeto informacional');
};
