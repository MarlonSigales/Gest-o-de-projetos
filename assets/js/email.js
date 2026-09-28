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

Email.destinatarios = (p) => [...new Set((p.interessados || []).map((i) => String(i.email || '').trim()).filter(Nucleo.emailValido))];

/** @returns {Promise<{enviado:boolean, mensagem:string, modo:string}>} */
Email.enviar = async function (p, an, jsonTexto, cfg) {
  const dest = Email.destinatarios(p);
  if (!dest.length) return { enviado: false, modo: cfg.emailModo, mensagem: 'Nenhum interessado com e-mail válido.' };
  const { texto, html } = Email.corpo(p, an, cfg.usuario);
  const nomeArq = Nucleo.nomeArquivo(p);

  if (cfg.emailModo === 'emailjs') {
    if (!cfg.emailjsServico || !cfg.emailjsModelo || !cfg.emailjsChave) {
      return { enviado: false, modo: 'emailjs', mensagem: 'EmailJS não configurado (⚙ Configurações).' };
    }
    const kb = new Blob([jsonTexto]).size / 1024;
    const anexar = kb <= (CONFIG.emailjsLimiteAnexoKb || 45);
    const b64 = anexar ? btoa(unescape(encodeURIComponent(jsonTexto))) : '';
    const corpo = {
      service_id: cfg.emailjsServico, template_id: cfg.emailjsModelo, user_id: cfg.emailjsChave,
      template_params: {
        to_email: dest.join(','), subject: Email.assunto(p), message: texto, message_html: html,
        nome_projeto: p.projeto.nome, nome_anexo: nomeArq,
        json_anexo: anexar ? 'data:application/json;base64,' + b64 : '',
      },
    };
    try {
      const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      const t = await r.text();
      if (!r.ok) return { enviado: false, modo: 'emailjs', mensagem: `Falha no EmailJS (HTTP ${r.status}): ${t}` };
      return { enviado: true, modo: 'emailjs', mensagem: `E-mail enviado para ${dest.length} destinatário(s)` + (anexar ? ' com o JSON anexado.' : ` SEM anexo: o JSON tem ${Math.round(kb)} KB, acima do limite do EmailJS.`) };
    } catch (e) {
      return { enviado: false, modo: 'emailjs', mensagem: 'Sem conexão com o EmailJS: ' + e.message };
    }
  }

  if (cfg.emailModo === 'mailto') {
    let corpoTxt = texto + '\n\n(Anexe a este e-mail o arquivo "' + nomeArq + '".)';
    if (corpoTxt.length > 1800) corpoTxt = corpoTxt.slice(0, 1750) + '\n…(resumo truncado; detalhes no JSON anexo)';
    const url = `mailto:${dest.map(encodeURIComponent).join(',')}?subject=${encodeURIComponent(Email.assunto(p))}&body=${encodeURIComponent(corpoTxt)}`;
    const a = document.createElement('a');
    a.href = url; document.body.appendChild(a); a.click(); a.remove();
    return { enviado: true, modo: 'mailto', mensagem: `Programa de e-mail aberto para ${dest.length} destinatário(s). Anexe o arquivo "${nomeArq}" antes de enviar.` };
  }

  return { enviado: false, modo: 'nenhum', mensagem: 'Envio de e-mail desativado (⚙ Configurações).' };
};
