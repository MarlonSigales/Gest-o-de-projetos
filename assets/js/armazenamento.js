/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * Armazenamento dos projetos, sem servidor.
 *  - ArmazemPasta: uma PASTA do computador (File System Access API — Chrome/Edge). O JSON e a pasta figuras/
 *    ficam juntos, como no disco: gestão do projeto <nome>.json, figuras/, imatec/, relatorios/, historico/.
 *  - ArmazemNavegador: IndexedDB do navegador (qualquer navegador). Para levar a outra máquina, exporte o ZIP.
 * Safari: arquivos são guardados como bytes (ArrayBuffer) — Blobs no IndexedDB do WebKit podem ficar ilegíveis
 * depois de recarregar a página —, cada gravação do projeto é conferida e o armazenamento persistente é pedido.
 */
'use strict';

const BD_NOME = 'gestao-projetos', BD_VERSAO = 1;
const PREFIXO = 'gestão do projeto ';

// ------------------------------------------------------------------ IndexedDB (promessas)
/** Safari 14: o primeiro indexedDB.open pode ficar parado até o IndexedDB "acordar"; databases() o acorda. */
const idbAcordar = () => {
  if (!indexedDB.databases || !/Safari\//.test(navigator.userAgent) || /Chrom(e|ium)\//.test(navigator.userAgent)) return Promise.resolve();
  let t;
  return new Promise((ok) => { const tentar = () => indexedDB.databases().finally(ok); t = setInterval(tentar, 100); tentar(); }).finally(() => clearInterval(t));
};

const BD = {
  _db: null,
  async abrir() {
    if (this._db) return this._db;
    await idbAcordar();
    return new Promise((ok, falha) => {
      const r = indexedDB.open(BD_NOME, BD_VERSAO);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('projetos')) db.createObjectStore('projetos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('arquivos')) db.createObjectStore('arquivos', { keyPath: 'chave' }).createIndex('proj', 'projId');
        if (!db.objectStoreNames.contains('historico')) db.createObjectStore('historico', { keyPath: 'chave' }).createIndex('proj', 'projId');
        if (!db.objectStoreNames.contains('pastas')) db.createObjectStore('pastas', { keyPath: 'id' });
      };
      r.onsuccess = () => {
        this._db = r.result;
        this._db.onversionchange = () => { this._db.close(); this._db = null; };
        this._db.onclose = () => { this._db = null; }; // Safari fecha a conexão ao liberar memória: reabre na próxima operação
        ok(r.result);
      };
      r.onerror = () => falha(r.error);
      r.onblocked = () => falha(new Error('O banco de dados do navegador está bloqueado por outra aba deste sistema. Feche as outras abas e tente de novo.'));
    });
  },
  async op(store, modo, fn) {
    let db = await this.abrir(), tx;
    try { tx = db.transaction(store, modo); } catch (e) { this._db = null; db = await this.abrir(); tx = db.transaction(store, modo); } // conexão fechada pelo navegador
    return new Promise((ok, falha) => {
      const res = fn(tx.objectStore(store));
      tx.oncomplete = () => ok(res && 'result' in res ? res.result : res);
      tx.onerror = () => falha(tx.error);
      tx.onabort = () => falha(tx.error);
    });
  },
  get: (s, k) => BD.op(s, 'readonly', (o) => o.get(k)),
  put: (s, v) => BD.op(s, 'readwrite', (o) => o.put(v)),
  del: (s, k) => BD.op(s, 'readwrite', (o) => o.delete(k)),
  todos: (s) => BD.op(s, 'readonly', (o) => o.getAll()),
  porProjeto: (s, id) => BD.op(s, 'readonly', (o) => o.index('proj').getAll(id)),
};

const carimbo = () => Nucleo.agoraIso().replace('T', '_').replace(/:/g, '');
const blobParaBytes = (b) => (b.arrayBuffer ? b.arrayBuffer() : new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error); r.readAsArrayBuffer(b); }));
/** Registro de arquivo → Blob (registros antigos guardavam o Blob; os novos, os bytes). */
const registroParaBlob = (r) => (!r ? null : r.bytes ? new Blob([r.bytes], { type: r.tipo || '' }) : (r.blob || null));
/** Pede ao navegador para não apagar os dados deste site (Safari apaga após 7 dias sem uso; Firefox quando falta espaço). */
const pedirPersistencia = async () => {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) return await navigator.storage.persist(); } catch (e) { /* sem suporte */ }
  return null;
};
const partes = (c) => String(c).split('/').filter(Boolean);
const caminhoValido = (c) => typeof c === 'string' && c && !c.includes('..') && !c.startsWith('/') && !c.includes('\\');

// ================================================================== pasta do computador
class ArmazemPasta {
  constructor(handle) { this.tipo = 'pasta'; this.h = handle; this.nome = handle.name; this.arquivoAtual = null; }

  static suportado() { return typeof window.showDirectoryPicker === 'function'; }

  async permissao(pedir = true) {
    const op = { mode: 'readwrite' };
    if ((await this.h.queryPermission(op)) === 'granted') return true;
    return pedir && (await this.h.requestPermission(op)) === 'granted';
  }

  async _dir(ps, criar) {
    let d = this.h;
    for (const p of ps) d = await d.getDirectoryHandle(p, { create: criar });
    return d;
  }

  async lerArquivo(caminho) {
    if (!caminhoValido(caminho)) return null;
    try {
      const ps = partes(caminho), nome = ps.pop();
      const d = await this._dir(ps, false);
      return await (await d.getFileHandle(nome)).getFile();
    } catch (e) { return null; }
  }

  async gravarArquivo(caminho, blob) {
    if (!caminhoValido(caminho)) throw new Error('Caminho inválido: ' + caminho);
    const ps = partes(caminho), nome = ps.pop();
    const d = await this._dir(ps, true);
    const w = await (await d.getFileHandle(nome, { create: true })).createWritable();
    await w.write(blob);
    await w.close(); // a API grava num arquivo temporário e troca ao fechar (gravação atômica)
  }

  async removerArquivo(caminho) {
    try { const ps = partes(caminho), nome = ps.pop(); await (await this._dir(ps, false)).removeEntry(nome); } catch (e) { /* já não existe */ }
  }

  async _jsonPrincipal() {
    const cands = [];
    for await (const [nome, e] of this.h.entries()) {
      if (e.kind === 'file' && /\.json$/i.test(nome)) cands.push(nome);
    }
    cands.sort((a, b) => (b.startsWith(PREFIXO) - a.startsWith(PREFIXO)));
    return cands[0] || null;
  }

  async lerProjeto() {
    const nome = await this._jsonPrincipal();
    if (!nome) return null;
    const txt = await (await this.lerArquivo(nome)).text();
    const p = JSON.parse(txt);
    if (!p || !p.projeto) throw new Error(`"${nome}" não é um projeto deste sistema.`);
    this.arquivoAtual = nome;
    return p;
  }

  async gravarProjeto(p, texto) {
    const novo = Nucleo.nomeArquivo(p);
    const anterior = this.arquivoAtual || (await this._jsonPrincipal());
    if (anterior) {
      const f = await this.lerArquivo(anterior);
      if (f) await this.gravarArquivo(`historico/${anterior.replace(/\.json$/i, '')}_${carimbo()}.json`, f);
    }
    await this.gravarArquivo(novo, new Blob([texto], { type: 'application/json' }));
    if (anterior && anterior !== novo) await this.removerArquivo(anterior); // projeto renomeado (a cópia ficou no histórico)
    this.arquivoAtual = novo;
    return novo;
  }

  /** Regrava o JSON atual sem gerar nova versão no histórico (ex.: registrar o resultado do e-mail no log). */
  async atualizarSemHistorico(p, texto) {
    await this.gravarArquivo(this.arquivoAtual || Nucleo.nomeArquivo(p), new Blob([texto], { type: 'application/json' }));
  }

  async listarHistorico() {
    const out = [];
    try {
      const d = await this._dir(['historico'], false);
      for await (const [nome, e] of d.entries()) if (e.kind === 'file' && nome.endsWith('.json')) out.push({ arquivo: nome, data: new Date((await e.getFile()).lastModified).toLocaleString('pt-BR') });
    } catch (e) { /* sem histórico */ }
    return out.sort((a, b) => b.arquivo.localeCompare(a.arquivo));
  }

  async lerHistorico(arquivo) {
    const f = await this.lerArquivo('historico/' + arquivo);
    return f ? JSON.parse(await f.text()) : null;
  }

  async listarTodos() {
    const out = [];
    const rec = async (d, pref) => {
      for await (const [nome, e] of d.entries()) {
        if (nome.startsWith('.')) continue;
        if (e.kind === 'file') out.push({ caminho: pref + nome, obter: () => e.getFile() });
        else await rec(e, pref + nome + '/');
      }
    };
    await rec(this.h, '');
    return out;
  }

  async excluir() { throw new Error('Para excluir um projeto em pasta, apague a pasta no seu computador.'); }
}

// ================================================================== navegador (IndexedDB)
class ArmazemNavegador {
  constructor(id, nome) { this.tipo = 'navegador'; this.id = id; this.nome = nome || 'projeto'; }

  static async listar() {
    const l = await BD.todos('projetos');
    return l.map((r) => ({ id: r.id, nome: r.nome, codigo: r.codigo, atualizado: r.atualizado, macros: r.macros }))
      .sort((a, b) => String(b.atualizado).localeCompare(String(a.atualizado)));
  }

  async lerProjeto() {
    const r = await BD.get('projetos', this.id);
    return r ? JSON.parse(r.json) : null;
  }

  async gravarProjeto(p, texto) {
    const ant = await BD.get('projetos', this.id);
    if (ant) {
      await BD.put('historico', { chave: `${this.id}|${carimbo()}`, projId: this.id, arquivo: `${PREFIXO}${ant.nome}_${carimbo()}.json`, data: new Date().toLocaleString('pt-BR'), json: ant.json });
      const hs = (await BD.porProjeto('historico', this.id)).sort((a, b) => a.chave.localeCompare(b.chave));
      for (const h of hs.slice(0, Math.max(0, hs.length - 50))) await BD.del('historico', h.chave); // mantém as 50 últimas versões
    }
    await BD.put('projetos', { id: this.id, nome: p.projeto.nome, codigo: p.projeto.codigo, macros: p.macroentregas.length, atualizado: Nucleo.agoraIso().replace('T', ' ').slice(0, 16), json: texto });
    await this.conferir(texto);
    this.nome = p.projeto.nome;
    if (!ArmazemNavegador._persistencia) ArmazemNavegador._persistencia = pedirPersistencia();
    return Nucleo.nomeArquivo(p);
  }

  /** Lê de volta o que foi gravado: se o navegador não guardou, avisa em vez de dar o salvamento por feito. */
  async conferir(texto) {
    const r = await BD.get('projetos', this.id);
    if (!r || r.json !== texto) throw new Error('o navegador não confirmou a gravação (armazenamento cheio, aba privada ou bloqueio do navegador). Exporte o ZIP para não perder o trabalho.');
  }

  async atualizarSemHistorico(p, texto) {
    const r = await BD.get('projetos', this.id);
    if (r) { r.json = texto; await BD.put('projetos', r); await this.conferir(texto); }
  }

  async lerArquivo(caminho) { return registroParaBlob(await BD.get('arquivos', `${this.id}/${caminho}`)); }
  async gravarArquivo(caminho, blob) {
    if (!caminhoValido(caminho)) throw new Error('Caminho inválido: ' + caminho);
    const bytes = await blobParaBytes(blob);
    await BD.put('arquivos', { chave: `${this.id}/${caminho}`, projId: this.id, caminho, bytes, tipo: blob.type || '', tamanho: bytes.byteLength });
    const r = await BD.get('arquivos', `${this.id}/${caminho}`);
    if (!r || !r.bytes || r.bytes.byteLength !== bytes.byteLength) throw new Error(`o navegador não confirmou a gravação de ${caminho}.`);
  }
  async removerArquivo(caminho) { await BD.del('arquivos', `${this.id}/${caminho}`); }

  async listarHistorico() {
    return (await BD.porProjeto('historico', this.id)).sort((a, b) => b.chave.localeCompare(a.chave)).map((h) => ({ arquivo: h.arquivo, data: h.data, chave: h.chave }));
  }
  async lerHistorico(arquivo) {
    const h = (await BD.porProjeto('historico', this.id)).find((x) => x.arquivo === arquivo);
    return h ? JSON.parse(h.json) : null;
  }

  async listarTodos() {
    const out = [];
    const r = await BD.get('projetos', this.id);
    if (r) out.push({ caminho: PREFIXO + Nucleo.nomeSeguro(r.nome) + '.json', obter: async () => new Blob([r.json], { type: 'application/json' }) });
    (await BD.porProjeto('arquivos', this.id)).forEach((a) => out.push({ caminho: a.caminho, obter: async () => registroParaBlob(a) }));
    (await BD.porProjeto('historico', this.id)).forEach((h) => out.push({ caminho: 'historico/' + h.arquivo, obter: async () => new Blob([h.json], { type: 'application/json' }) }));
    return out;
  }

  async excluir() {
    for (const a of await BD.porProjeto('arquivos', this.id)) await BD.del('arquivos', a.chave);
    for (const h of await BD.porProjeto('historico', this.id)) await BD.del('historico', h.chave);
    await BD.del('projetos', this.id);
  }
}

// ================================================================== pastas recentes (handles guardados)
const Recentes = {
  async listar() { try { return (await BD.todos('pastas')).sort((a, b) => b.usado.localeCompare(a.usado)); } catch (e) { return []; } },
  async lembrar(handle, nomeProjeto) {
    const todos = await this.listar();
    for (const r of todos) { if (await r.handle.isSameEntry(handle)) await BD.del('pastas', r.id); }
    await BD.put('pastas', { id: Nucleo.uid('dir'), handle, nome: handle.name, projeto: nomeProjeto || '', usado: Nucleo.agoraIso() });
  },
  async esquecer(id) { await BD.del('pastas', id); },
};

// ================================================================== ZIP (exportar / importar)
const Zip = {
  async exportar(armazem) {
    const z = new JSZip();
    for (const f of await armazem.listarTodos()) {
      if (/(^|\/)_/.test(f.caminho) || f.caminho.startsWith('envio/')) continue;
      z.file(f.caminho, await f.obter());
    }
    return z.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  },

  /** Lê um ZIP exportado e devolve {projeto, arquivos:[{caminho, blob}]} com caminhos relativos à pasta do JSON. */
  async ler(blob) {
    const z = await JSZip.loadAsync(blob);
    const nomes = Object.keys(z.files).filter((n) => !z.files[n].dir && !n.startsWith('__MACOSX'));
    const cands = nomes.filter((n) => /\.json$/i.test(n) && !/(^|\/)(historico|imatec)\//.test(n))
      .sort((a, b) => ((b.split('/').pop().startsWith(PREFIXO)) - (a.split('/').pop().startsWith(PREFIXO))) || (a.split('/').length - b.split('/').length));
    if (!cands.length) throw new Error('O ZIP não contém o arquivo JSON do projeto.');
    const principal = cands[0];
    const base = principal.includes('/') ? principal.slice(0, principal.lastIndexOf('/') + 1) : '';
    const projeto = JSON.parse(await z.file(principal).async('string'));
    if (!projeto || !projeto.projeto) throw new Error('O JSON do ZIP não é um projeto deste sistema.');
    const arquivos = [];
    for (const n of nomes) {
      if (n === principal || (base && !n.startsWith(base))) continue;
      const rel = n.slice(base.length);
      if (!caminhoValido(rel) || !(rel.startsWith('produto/') || /\.(json|png|jpe?g|svg|pdf)$/i.test(rel))) continue; // documentos das fases (produto/) aceitam qualquer tipo
      arquivos.push({ caminho: rel, blob: await z.file(n).async('blob') });
    }
    return { projeto, arquivos };
  },
};
