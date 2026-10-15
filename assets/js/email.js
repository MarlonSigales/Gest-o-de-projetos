/* Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar este código exige autorização do autor (ver LICENSE). */
/*
 * E-mail de andamento sem servidor. Três modos (⚙ Configurações):
 *  - "emailjs": envio automático pelo serviço EmailJS (https://www.emailjs.com), com o JSON anexado;
 *  - "mailto":  abre o programa de e-mail do computador com assunto e corpo prontos (o anexo é feito à mão);
 *  - "nenhum":  não envia.
 */
'use strict';

const Email = {};

Email.assunto = (p) => 'andamento projeto ' + p.projeto.nome;

Email.corpo = function (p, an, usuario) {
  const pj = p.projeto, t = an.trl;
  const pessoas = (l) => (l || []).map((r) => `${r.nome || ''}${r.email ? ' <' + r.email + '>' : ''}${r.observacao ? ' (' + r.observacao + ')' : ''}`.trim()).join('; ') || 'não definido';
  const trl = (v) => (v === null || v === undefined) ? 'não avaliado' : 'TRL ' + v;
  const L = [];
  L.push('ANDAMENTO DO PROJETO');
  L.push('- Projeto: ' + pj.nome);
  L.push('- Código: ' + pj.codigo);
  L.push('- Salvo em: ' + new Date().toLocaleString('pt-BR').slice(0, 17) + (usuario ? ' por ' + usuario : ''));
  L.push('- Percentual geral: ' + an.percentualGeral + '%');
  L.push('');
  L.push('MATURIDADE TECNOLÓGICA');
  L.push('- TRL atual do sistema: ' + trl(t.sistema));
  L.push('- TRL esperado na etapa atual: ' + (t.esperadoEtapa ?? '—') + (an.macroAtual ? ' (Macroentrega ' + an.macroAtual.numero + ')' : ''));
  L.push('- TRL esperado ao final do projeto: ' + (t.esperadoFinal ?? '—'));
  L.push('');
  L.push('TRL POR ÁREA');
  if (!t.areas.length) L.push('- Nenhuma área cadastrada.');
  t.areas.forEach((a) => L.push(`- ${a.nome} · atual: ${trl(a.trlAtual)} · esperado: ${a.trlEsperado ?? '—'} · responsável(is): ${pessoas(a.responsaveis)}`));
  L.push('');
  L.push('PONTOS DE VERIFICAÇÃO (TRL MAIS BAIXO) — QUEM COBRAR');
  if (!t.pontosVerificacao.length && t.nosMaisBaixos.length) t.nosMaisBaixos.forEach((n) => L.push(`- ${n.titulo} (${n.tipo}) · ${trl(n.trl)} · cobrar: ${pessoas(n.cobrar)}`));
  else if (!t.pontosVerificacao.length) L.push('- Sem avaliação de maturidade importada.');
  t.pontosVerificacao.forEach((a) => L.push(`- ${a.nome} · ${trl(a.trlAtual)}${a.trlEsperado ? ' (esperado ' + a.trlEsperado + ')' : ''} · cobrar: ${pessoas(a.cobrar)}`));
  L.push('');
  L.push('MACROENTREGAS');
  an.macroentregas.forEach((m) => L.push(`- ${m.numero}. ${m.titulo || '(sem título)'} · ${m.status} · ${m.percentual}%${m.dataPrevista ? ' · prevista ' + Nucleo.dataBR(m.dataPrevista) : ''}`));
  const atr = an.macroentregas.filter((m) => m.atrasada);
  if (atr.length) { L.push(''); L.push('MACROENTREGAS ATRASADAS'); atr.forEach((m) => L.push(`- ${m.numero}. ${m.titulo} (prevista ${Nucleo.dataBR(m.dataPrevista)})`)); }
  if (an.riscosAltos.length) { L.push(''); L.push('RISCOS ALTOS EM ABERTO'); an.riscosAltos.forEach((r) => L.push(`- ${r.id} ${r.descricao} · nível ${r.nivel} (${r.rotulo}) · responsável: ${r.responsavel || '—'}`)); }
  L.push('');
  L.push(`Arquivo do projeto: ${Nucleo.nomeArquivo(p)}`);
  const texto = L.join('\n');

  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1d2b2b;">', aberta = false;
  L.forEach((l) => {
    if (!l) return;
    if (l.startsWith('- ')) { if (!aberta) { html += '<ul style="margin:4px 0 12px 0;">'; aberta = true; } html += `<li style="margin:3px 0;">${e(l.slice(2))}</li>`; }
    else { if (aberta) { html += '</ul>'; aberta = false; } html += `<h3 style="color:#085357;border-bottom:2px solid #A8E156;margin:16px 0 6px 0;font-size:15px;">${e(l)}</h3>`; }
  });
  if (aberta) html += '</ul>';
  html = (html + '</div>').replace(/· cobrar:/g, '· <b style="color:#b3261e;">cobrar:</b>');
  return { texto, html };
};

Email.destinatarios = (p) => { const d = Nucleo.destinatarios(p); return d.gestao.concat(d.demais).map((r) => r.email); };

const paraBase64 = (blob) => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(blob); });

/** Link mailto: com assunto e corpo (o anexo é feito pelo usuário: mailto não permite anexar). */
Email.mailto = function (p, texto, emails, anexos) {
  let corpo = texto + '\n\nAnexar: ' + anexos.map((a) => a.nome).join('; ');
  if (corpo.length > 1800) corpo = corpo.slice(0, 1750) + '\n…(resumo truncado; detalhes nos anexos)';
  return `mailto:${emails.map(encodeURIComponent).join(',')}?subject=${encodeURIComponent(Email.assunto(p))}&body=${encodeURIComponent(corpo)}`;
};

/**
 * Envia por grupo. anexos = {gestao:[{nome,blob}], demais:[{nome,blob}]}; dest = Nucleo.destinatarios(p).
 * @returns {Promise<{grupos:Array<{grupo,emails,enviado,mensagem,anexos}>, manual:boolean}>}
 */
Email.enviar = async function (p, an, anexos, cfgEmail, usuario) {
  const dest = Nucleo.destinatarios(p);
  const { texto, html } = Email.corpo(p, an, usuario);
  const grupos = [
    { grupo: 'gestao', rotulo: 'Gestão', emails: dest.gestao.map((r) => r.email), anexos: anexos.gestao || [] },
    { grupo: 'demais', rotulo: 'Demais', emails: dest.demais.map((r) => r.email), anexos: anexos.demais || [] },
  ].filter((g) => g.emails.length);
  if (!grupos.length) return { grupos: [], manual: false, mensagem: 'Nenhum interessado com e-mail válido.' };
  const modo = cfgEmail.modo || 'mailto';
  if (modo === 'nenhum') return { grupos: grupos.map((g) => Object.assign(g, { enviado: false, mensagem: 'envio desativado' })), manual: false, mensagem: 'Envio de e-mail desativado (⚙ Configurações).' };

  if (modo === 'emailjs') {
    if (!cfgEmail.emailjsServico || !cfgEmail.emailjsModelo || !cfgEmail.emailjsChave) {
      return { grupos: grupos.map((g) => Object.assign(g, { enviado: false, mensagem: 'EmailJS não configurado' })), manual: true, mensagem: 'EmailJS não configurado (⚙ Configurações).' };
    }
    let manual = false;
    for (const g of grupos) {
      // EmailJS aceita um anexo por variável: para "demais", PDFs + JSON seguem num único ZIP
      let anexo = g.anexos[0] || null;
      if (g.grupo === 'demais' && g.anexos.length > 1) {
        const z = new JSZip();
        g.anexos.forEach((a) => z.file(a.nome, a.blob));
        anexo = { nome: 'PDFs e JSON - ' + Nucleo.nomeSeguro(p.projeto.nome) + '.zip', blob: await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }) };
      }
      const kb = anexo ? anexo.blob.size / 1024 : 0;
      const cabe = anexo && kb <= (+cfgEmail.limiteAnexoKb || 45);
      const corpo = { service_id: cfgEmail.emailjsServico, template_id: cfgEmail.emailjsModelo, user_id: cfgEmail.emailjsChave,
        template_params: { to_email: g.emails.join(','), subject: Email.assunto(p), message: texto, message_html: html, nome_projeto: p.projeto.nome,
          grupo: g.rotulo, nome_anexo: cabe ? anexo.nome : '', anexo: cabe ? await paraBase64(anexo.blob) : '' } };
      try {
        const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
        const t = await r.text();
        if (!r.ok) { g.enviado = false; g.mensagem = `falha no EmailJS (HTTP ${r.status}): ${t}`; manual = true; continue; }
        g.enviado = true;
        g.mensagem = cabe ? `enviado com ${anexo.nome}` : `enviado SEM anexo (${Math.round(kb)} KB acima do limite de ${cfgEmail.limiteAnexoKb || 45} KB) — envie os anexos manualmente`;
        if (!cabe) manual = true;
      } catch (e) { g.enviado = false; g.mensagem = 'sem conexão com o EmailJS: ' + e.message; manual = true; }
    }
    return { grupos, manual, mensagem: grupos.map((g) => `${g.rotulo}: ${g.mensagem}`).join(' · ') };
  }

  // mailto: prepara os rascunhos; o usuário anexa os arquivos
  grupos.forEach((g) => { g.enviado = false; g.mensagem = 'rascunho preparado (anexar manualmente)'; g.link = Email.mailto(p, texto, g.emails, g.anexos); });
  return { grupos, manual: true, mensagem: 'E-mails preparados por grupo: anexe os arquivos e envie.' };
};
