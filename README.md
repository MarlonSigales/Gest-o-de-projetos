# Gestão de Projetos — versão que roda só no navegador

Sistema de gestão de projetos de P&D com várias macroentregas. Faz o seguinte:
- gera o **relatório de cada macroentrega** no padrão InovaAgro/Embrapii, com o **termo de aceite na 2ª página**;
- gera o **relatório geral de andamento** do projeto;
- controla a maturidade tecnológica como **TRL**, importando o JSON da ferramenta oficial da AEB;
- a cada **Salvar**, grava o JSON `gestão do projeto <nome>.json` e dispara o e-mail **`andamento projeto <nome>`**.

**Não precisa de servidor, PHP nem banco de dados.** São só arquivos HTML, CSS e JavaScript:
- pode ser publicado no **GitHub Pages**;
- pode ser aberto direto do disco, com duplo clique no `index.html`;
- funciona **sem internet**, com uma exceção: o envio automático de e-mail pelo EmailJS.

---

## 1. Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie **todo o conteúdo desta pasta** para a raiz. O `index.html` precisa ficar na raiz.
2. No repositório, vá em **Settings → Pages**.
3. Em **Source**, escolha **Deploy from a branch**, depois a branch `main` e a pasta `/ (root)`. Clique em **Save**.
4. Em cerca de 1 minuto o site fica disponível em `https://<seu-usuario>.github.io/<repositorio>/`.

O arquivo `.nojekyll` já vem incluído. Não há senhas nem dados de projetos no repositório: os projetos ficam no computador de quem usa (seção 2).

> **Repositório público = site público**, mas só o *programa* fica público. Cada pessoa que abre o site trabalha com os próprios arquivos, e nada é enviado ao GitHub.

---

## 2. Onde os projetos ficam guardados

Ao abrir o site, clique em **📂 Criar/carregar** e escolha uma das opções abaixo.

### 📁 Pasta do computador (recomendado — Chrome ou Edge no computador)
Você escolhe uma pasta, e o sistema grava tudo nela diretamente:
```
MinhaPasta/
  gestão do projeto <nome>.json   ← fonte de verdade
  figuras/                        ← imagens (referenciadas pelo JSON por caminho relativo)
  imatec/                         ← JSONs originais da avaliação de maturidade
  relatorios/                     ← cópias dos PDFs gerados
  historico/                      ← versão anterior a cada salvamento
```
- O JSON e as figuras **ficam sempre na mesma pasta**. Se a pasta estiver no OneDrive, Google Drive ou Dropbox, ela já fica sincronizada e com backup.
- As pastas usadas aparecem em **Recentes**. Por segurança, o navegador pede para confirmar o acesso a cada vez que você volta.
- Essa opção usa a *File System Access API*, que **só existe no Chrome e no Edge de computador**. No Firefox, no Safari e no celular, use a opção seguinte.

### 🌐 Guardado no navegador (qualquer navegador)
- O projeto fica no armazenamento interno do navegador (IndexedDB), **só naquele navegador e computador**.
- Limpar os dados do navegador apaga os projetos. **Exporte o ZIP com frequência** (aba Relatórios e Exportação).
- O histórico guarda as 50 últimas versões.
- **Safari (e Firefox):** os arquivos (figuras, documentos) são guardados como bytes, porque o Safari pode perder arquivos guardados de outro jeito ao recarregar a página. A cada salvamento o sistema **relê o que gravou** e avisa se o navegador não confirmou. Ele também pede ao navegador que **não apague** os dados do site. Mesmo assim, o Safari pode apagar dados de sites sem uso por 7 dias: em ⚙ Configurações, escolha **baixar o ZIP completo a cada salvamento**.

### Levar para outra máquina
Use **Exportar ZIP** (JSON + figuras + histórico) e, na outra máquina, **📂 Criar/carregar → Importar**. Também dá para importar o JSON junto com as imagens selecionadas.

---

## 3. E-mail de andamento (⚙ Configurações — salvas no JSON)

### Grupos e anexos
Na aba **Equipe e Interessados**, cada e-mail pode estar em um ou mais grupos. Os grupos marcados como **gestão** (★) têm tratamento diferente:

| Grupo | Recebe |
|---|---|
| **Gestão** | o **ZIP completo** do projeto: JSON, figuras, TRL, relatórios PDF e histórico |
| **Demais** (equipe, empresa…) | **os PDFs** (relatório geral + um por macroentrega) **e o JSON** |

Um e-mail que está na gestão e também em outro grupo **recebe só como gestão**, uma única vez. E-mails repetidos são unificados, sem diferenciar maiúsculas de minúsculas.

A cada **Salvar**, o sistema gera os PDFs, grava-os em `relatorios/`, monta o ZIP e prepara o envio por grupo. Quando o projeto está numa pasta do computador, os anexos também ficam em `envio/<data>/gestao/` e `envio/<data>/demais/`, prontos para anexar. A pasta `envio/` não entra no ZIP.

### Modos de envio
| Modo | O que acontece |
|---|---|
| **Programa de e-mail** (padrão) | Abre uma tela com um bloco por grupo: **1. Baixar anexos → 2. Abrir e-mail** (destinatários, assunto `andamento projeto <nome>` e resumo prontos) **→ 3. anexar e enviar**. Por limitação técnica, o navegador não consegue anexar arquivos sozinho. |
| **Automático pelo EmailJS** | Envia um e-mail por grupo. O EmailJS aceita um anexo por mensagem, então a gestão recebe o ZIP completo e os demais recebem um ZIP com os PDFs e o JSON. **Atenção:** cada PDF tem cerca de 1 MB. Se o anexo passar do limite do plano (campo "Limite de anexo"), o e-mail sai sem anexo e a tela de envio manual é aberta. |
| **Não enviar** | Só salva. |

Para envio **totalmente automático com anexos grandes** é preciso um servidor: a versão PHP, via SMTP.

**Configurar o EmailJS:** crie um modelo com To = `{{to_email}}`, Subject = `{{subject}}`, conteúdo HTML `{{{message_html}}}` e um *Variable Attachment* com parâmetro `anexo` e nome de arquivo `{{nome_anexo}}`. Depois cole o Service ID, o Template ID e a Public Key em ⚙ Configurações.

## 4. Uso

**Versão do projeto (escolhida ao criar):** ao criar um projeto, o sistema pergunta qual versão usar. Dá para trocar depois em ⚙ Configurações → *Versão do projeto*, sem perder nada.
- **⚡ Simplificada** — para quem não quer (ou não precisa) preencher muito. O gestor só faz **dois passos** na aba 🎯 **Funções e especificações**: (1) diz em uma frase o que o produto faz e lista as **funções** (dá para colar uma por linha), com o responsável; (2) escreve as **especificações** com a meta e a função que atende cada uma. O sistema monta sozinho o **cronograma** (uma etapa por função + *Integração do sistema* + *Testes e verificação das especificações*, com datas distribuídas na vigência e dependências), a **árvore TRL** (produto → funções + integração), as **áreas e responsáveis** (quem cobrar) e o desdobramento especificação → função dos relatórios. Já vem preenchido: quem está usando como coordenador e no grupo de gestão, início hoje e término em 12 meses, duas macroentregas (*Desenvolvimento das funções* e *Integração, testes e entrega*). A aba Projeto mostra só o básico (o resto fica em *Mais dados (opcional)*); o código é opcional. Ficam ocultas as abas Projeto de produto, Pesquisa e Áreas. Depois é só avaliar o TRL e marcar, na aba Qualidade, se cada meta foi atingida. Renomear ou remover uma função atualiza o cronograma, a árvore e as áreas; datas, percentuais e avaliações já preenchidos são mantidos.
- **🧭 Completa** — tudo: projeto de produto/serviço pelas fases do NeDIP (QFD, questionários, concepções, protótipos, FMEA, manuais), **análise econômica e de mercado** na fase de lançamento e pesquisa de patentes e referências. Projetos antigos abrem como completos.

**Primeira abertura:** o sistema exige **nome** (registrado no log) e **e-mail**. Esse e-mail entra automaticamente no **grupo de gestão** de qualquer projeto aberto ou criado que ainda não tenha ninguém na gestão (quando o projeto já tem gestão, nada muda). Para trocar, use ⚙.

**Exemplo para aprender:** em 📂 Criar/carregar → *Abrir o exemplo (roda de bicicleta)*. É um projeto fictício que usa **todos os recursos** do sistema, e a aba Projeto mostra o **🎓 Guia do exemplo**: um roteiro com o que olhar em cada aba e um botão que leva direto ao recurso. O guia pode ser ocultado. O exemplo traz:
- vigência com termo aditivo, equipe, grupos de e-mail, interessados e áreas ligadas à árvore TRL;
- 5 macroentregas em situações diferentes: finalizadas e aceitas, finalizada aguardando o aceite, em andamento (com relatório de andamento no histórico) e planejada (a última, cujo relatório leva os apêndices);
- desenvolvimento em blocos com todos os tipos (capítulo, subcapítulo, seção, texto, figura, tabela, QFD, projeto do produto, questionário, pesquisa e quebra de página);
- questionário do Google Forms com 24 respostas e todos os tipos de pergunta (escolha, caixas, escala, grade, aberta, identificação), gráficos e destaques;
- QFD completo, com avaliação competitiva de 3 concorrentes;
- busca de anterioridade com patentes **fictícias** importadas de um CSV no formato do Google Patents (`exemplos/patentes-roda-google-patents.csv`) e referências reais citadas nos textos;
- as fases NeDIP preenchidas, com o diagrama de funções, FMEA, lista de materiais, manuais e a **análise econômica e de mercado** no lançamento;
- cronograma com dependências e uma atividade atrasada, riscos, especificação manual, PDCA, DfX (inclusive um criado pela equipe), TRL por critérios e lições aprendidas.

Os mesmos dados estão em `exemplos/roda-bicicleta-generica.zip` (importável). O backup do QFD está em `exemplos/qfd-roda-bicicleta.json` e o CSV do Forms em `exemplos/questionario-roda-google-forms.csv`.

| Aba | Conteúdo |
|---|---|
| **Funções e especificações** (só na simplificada) | Função global, funções com responsável, especificações com meta e a função que atende; resumo do que o sistema montou (cronograma, TRL, especificações) |
| **Projeto** (primeira página) | **Vigência: data de início, término original, termos aditivos (+) e subtrativos (−) de prazo e término vigente calculado**; painel com percentual, TRL, alertas e ponto de verificação; identificação, coordenação, introdução e objetivo geral |
| **Equipe e Interessados** | Equipe (página "Equipe" dos PDFs), **grupos de e-mail** (gestão ★ e demais) e **interessados**, com o resumo de quem recebe o quê |
| **Áreas / Responsáveis** | Áreas técnicas ligadas a itens da árvore TRL, com **um ou mais responsáveis** (quem cobrar) e TRL esperado |
| **Macroentregas** | Uma sub-aba por macroentrega, com **+ Macroentrega / – Remover** (a numeração é refeita). Projetos novos começam com 4. No topo, a situação do texto (**em andamento** ou **finalizada**); desenvolvimento em blocos, atividades, histórico de relatórios de andamento e termo de aceite |
| **Projeto de produto/serviço** | Modelo **NeDIP** (planejamento, projetação e implementação), tudo opcional: aplicativo externo por fase (QFD no informacional), especificações manuais, desdobramento em funções, matriz de decisão, FMEA → Riscos, manuais de projeto e de uso, documentos no ZIP |
| **Cronograma** | EAP, Gantt, caminho crítico (CPM) e atividades atrasadas |
| **Riscos** | Registro e matriz 5×5 (P × I) |
| **Qualidade / DfX** | Especificações vindas do QFD (feito no projeto informacional); requisitos, critérios de aceite, verificação e PDCA das não conformidades; **Design for X (Pahl & Beitz)** |
| **TRL** | Avaliação por critérios dentro do sistema, árvore, pontos de verificação, gráfico atual × esperado |
| **Lições aprendidas** | Registro por macroentrega |
| **Relatórios e Exportação** | PDFs, prévia e envio do e-mail, JSON, ZIP, histórico e exclusão |

**Salvar:** botão no menu lateral ou **Ctrl+S**. **Tudo o que é preenchido vai para o JSON**, inclusive grupos de e-mail, vigência/aditivos, DfX e configurações de envio. As exceções são o seu nome e e-mail, que ficam neste navegador.

**Menu lateral:** as abas na ordem do trabalho (Projeto, Áreas, Equipe, Macroentregas, Cronograma, Pesquisa, Projeto de produto, TRL, Qualidade/DfX, Riscos, Lições, Relatórios) e, embaixo, **Arquivo do projeto**: **📂 Criar/carregar**, **💾 Salvar** e **⚙ Configurações**.

**Balões explicativos:** pare o mouse (ou chegue pelo teclado) sobre qualquer botão, aba ou campo para ver para que ele serve. Podem ser desligados em ⚙ Configurações (preferência deste navegador).

### Projeto de produto/serviço (modelo NeDIP)
Macrofases e fases do modelo do NeDIP/UFSC (BACK, N. et al. *Projeto integrado de produtos*. Manole, 2008): **planejamento** → **projetação** (informacional, conceitual, preliminar, detalhado) → **implementação** (preparação da produção, lançamento, validação).

**Tudo é opcional.** Em cada projeto você escolhe as fases usadas; em cada fase:
- **Entrada da fase:** um aplicativo próprio (nome e URL). O botão abre o aplicativo e, na volta, o sistema pede o resultado, que fica nos documentos da fase. No projeto informacional o aplicativo é fixo: o botão **↗ Ir para o app do projeto informacional (QFD)** abre o sistema QFD (https://marlonsigales.github.io/QFD/index.html), e o backup JSON atualiza requisitos de cliente e especificações. Nenhuma janela obriga a usar o aplicativo.
- **Ferramentas internas** ligáveis/desligáveis; todas as listas aceitam **linhas manuais**.
- Situação (incluindo "não se aplica"), macroentregas, **recomendações clicáveis**, registro livre e **documentos da fase** (`produto/<fase>/`, vão no ZIP).

| Fase | Saída | Ferramentas (opcionais) |
|---|---|---|
| Planejamento | Plano do projeto | Escopo, premissas, orçamento e comunicação; atalhos para Equipe, Macroentregas, Cronograma e Riscos |
| Informacional | Especificações | **Questionário do Google Forms** (CSV importado/exportado, editável, documento em PDF, anexável a uma macroentrega); **relatório do QFD nas macroentregas** (caixas de seleção); roteiro de questionário (PDF), questionários aplicados, **consolidação das respostas** (digitada ou CSV `necessidade; citações; importância; fase`) → requisitos de cliente, **PDF do questionário com respostas consolidadas**; requisitos de cliente manuais ou do QFD; **especificações manuais** ao lado das do QFD; ciclo de vida, concorrentes e normas |
| Conceitual | Concepção | Roteiro "do problema à concepção" (abstração, função global, estrutura de funções, desdobramento, princípios, matriz morfológica, concepções, avaliação); **desdobramento das especificações em funções** (aponta especificação sem função); estrutura de funções e matriz morfológica; concepções; **matriz de decisão ponderada** (critérios das especificações com peso do QFD, ou manuais; notas 1–5); exportação das funções para a árvore TRL |
| Preliminar | Leiaute e viabilidade | Leiaute e viabilidade; protótipos e ensaios; **FMEA** (S×O×D; críticos com RPN ≥ 100 ou S ≥ 9 vão para a aba Riscos, sem duplicar); **análise de qualidade** com situação e medido editáveis |
| Detalhado | Documentação | Lista de materiais; conteúdo do manual de uso; **manuais gerados** (projeto e uso) **ou próprios** (documento importado); importação de documentos para o ZIP |
| Preparação da produção | Liberação | Processos, fornecedores, lote piloto, data de liberação |
| Lançamento | Produto lançado | **Análise econômica e de mercado** (ver abaixo); plano, canais, treinamentos, certificações, data |
| Validação | Validado e encerrado | Questionários de satisfação, desempenho em campo, melhorias, encerramento; atalho para Lições aprendidas |

O **manual de projeto** compila as fases usadas; o relatório de andamento traz o resumo das fases.

### Análise econômica e de mercado (fase de lançamento, versão completa)
Na fase de mercado (Implementação → **Lançamento**), a ferramenta *Análise econômica e de mercado* recebe:
- **premissas:** moeda, unidade de venda, horizonte (1 a 15 anos), TMA, impostos sobre a venda, comissões/royalties/frete, IR + CSLL, capital de giro (% da receita), valor residual (% do CAPEX), reajustes anuais de preço e de custos e margem de contribuição-alvo;
- **mercado e demanda:** TAM, SAM e SOM, fontes, preço e volume por ano (ou preenchidos pelo crescimento, ou pelo SOM);
- **custo variável por unidade** (itens por categoria, marcando os insumos de terceiros; pode trazer os itens da lista de materiais), **CAPEX** (valor, ano e vida útil) e **OPEX** (custos fixos anuais).

Resultados (na hora, ao digitar): parecer de viabilidade, premissas não informadas e alertas (preço abaixo do custo variável, volume acima do SAM/SOM, ano 1 abaixo do ponto de equilíbrio); **VPL, TIR, payback simples e descontado, índice de lucratividade, ROI, margem de contribuição, pontos de equilíbrio operacional, contábil e econômico, custo pleno unitário, preço para a margem-alvo, preço mínimo, EVA/MVA e valor adicionado bruto**; composição do custo variável; DRE e fluxo de caixa livre por ano com gráfico; **sensibilidade do VPL** (±10 % e ±20 % em preço, volume, custo variável, OPEX, CAPEX e TMA) e o preço e o volume que zeram o VPL. Simplificações: fluxos no fim de cada ano, depreciação linear, IR só sobre lucro positivo, sem financiamento. Tudo vai para o manual de projeto e pode entrar no relatório geral e nas macroentregas (seção *Análise econômica e de mercado* em “Projeto de produto nos relatórios”).

### Pré-projeto informacional: questionário do Google Forms
No projeto informacional, cartão **Questionários aos clientes**:
1. **⬇ CSV em branco (base para o Forms):** só o cabeçalho, no formato do Google Forms, com as perguntas do projeto. Se ainda não houver perguntas, vêm as do roteiro-modelo NeDIP; para ajustá-las antes, use **Começar pelo roteiro-modelo**.
2. Monte e aplique o formulário. No Forms: **Respostas → ⋮ → Baixar respostas (.csv)**.
3. **⬆ Importar CSV do Google Forms.** O sistema reconhece:
   - a data de cada resposta;
   - perguntas em **grade** (`Pergunta [item]`) e as escalas (`1 - Muito importante`, inclusive quando 1 é o mais importante);
   - múltipla escolha e **caixas de seleção** (respostas "A) …, C) …");
   - escalas lineares e respostas abertas;
   - **dados de identificação** (nome, cargo, contato…), que nunca entram no documento.

Depois de importar:
- **Perguntas e respondentes podem ser editados:** texto, tipo, alternativas, itens, fase do ciclo de vida, "analisar" e cada resposta; também dá para incluir e excluir.
- Uma nova importação pode **acrescentar** respostas (as perguntas são casadas pelo texto) ou **substituir** o questionário.
- O CSV entra nos documentos da fase e o quadro "Questionários aplicados" é atualizado.
- **Documento do questionário (PDF):** no padrão do roteiro, com identificação da pesquisa, roteiro aplicado, resultados por pergunta (tabelas com barras, média e importância de 1 a 5) e necessidades consolidadas. O botão "Roteiro de questionário" passa a imprimir as perguntas do projeto, com campos para marcar.
- **Anexar a uma macroentrega:** escolha a macroentrega, e o documento entra como bloco no desenvolvimento dela.
- **→ Gerar a consolidação:** itens de grade e escalas viram necessidades com citações e importância, que alimentam os requisitos de cliente.
- **Gráficos das respostas:** cada pergunta de escolha, caixas, escala ou grade vira um gráfico de barras, como no Google Forms, numerado como **figura ABNT** (entra na lista de figuras). Na lista de perguntas, a coluna **Gráfico** escolhe quais entram e o campo "título da figura" ajusta a legenda. Isso substitui os prints dos gráficos do Forms.
- **Destaques:** frases com a alternativa mais citada e o percentual (ou o item mais importante da grade), **geradas e editáveis**. Entram em "Principais resultados".
- No bloco do questionário, escolha as partes: identificação, destaques, roteiro, gráficos, tabelas por pergunta e consolidação.

### Relatório do QFD nas macroentregas e no relatório geral
A importação do backup do QFD guarda o arquivo completo no projeto. No projeto informacional, o cartão **Relatório do QFD nas macroentregas** tem uma caixa de seleção por informação (linha) e por macroentrega (coluna), mais o relatório geral. As informações são:
- dicionário de requisitos;
- requisitos do cliente;
- diagrama de Mudge;
- requisitos de projeto em terços;
- matriz QFD;
- telhado de correlações;
- especificações;
- avaliação competitiva (notas, gráfico, valores técnicos, metas abaixo do melhor concorrente e **inconsistências**: o cliente prefere um produto, mas os requisitos de relação forte favorecem outro);
- atendimento aos requisitos do cliente;
- ranking;
- indicadores.

Na primeira importação, as macroentregas ligadas ao projeto informacional já recebem tudo o que o QFD tem. Informação que falta no QFD aparece desativada, com o botão **↗ completar no QFD**. O conteúdo sai com a identidade visual dos relatórios: **tabelas largas viram a folha (paisagem)** e, se ainda assim não couberem, são divididas em partes que repetem a primeira coluna. Também há o PDF avulso **Análise QFD**.

### Projeto de produto nos relatórios
No fim de cada fase do projeto de produto, o cartão **Projeto de produto nos relatórios** funciona como o do QFD: uma caixa por informação e por macroentrega, mais o relatório geral. Cada macroentrega marcada recebe o bloco "Projeto do produto". As informações são:
- situação das fases, escopo e plano;
- ciclo de vida;
- necessidades e requisitos de cliente;
- concorrentes e normas (agora em **tabela**, além do texto livre);
- **função global e estrutura de funções**, com um **diagrama desenhado pelo sistema** (caixa-preta com entradas e saídas, funções parciais e subfunções com o princípio escolhido) como figura ABNT, mais a tabela de funções e princípios;
- desdobramento das especificações;
- concepções e matriz de decisão;
- leiaute, protótipos e FMEA;
- lista de materiais.

Seções sem dados não entram no PDF; na tela elas aparecem com o botão que leva à fase onde se preenche. Os concorrentes da avaliação competitiva do QFD podem ser trazidos para a tabela com um clique.

### Pesquisa: busca de anterioridade e referências (aba 📚 Pesquisa)
**Busca de anterioridade (patentes).** O navegador não consulta as bases de patentes sozinho, porque elas não permitem acesso sem servidor. A busca é feita nelas e importada aqui:
1. Defina a estratégia: objetivo, palavras-chave, classificação IPC/CPC, período e data.
2. Os botões abrem a busca pronta no **Google Patents**, no **Espacenet** e no **WIPO Patentscope**. No **INPI**, a busca é manual, com as mesmas palavras.
3. Exporte o CSV (no Google Patents: “Download (CSV)”) e use **⬆ Importar CSV de patentes**.
4. A situação (pedido, concedida, expirada) vem **estimada pelas datas**; confirme na base oficial. Classifique a relevância e a **liberdade de operação** (livre, atenção, risco).

A síntese mostra o que está em domínio público e o que exige atenção. O bloco **📚 Pesquisa** leva a estratégia, a tabela e a síntese a uma macroentrega.

**Referências bibliográficas (ABNT NBR 6023).**
- Importe **BibTeX** (`.bib`) ou **RIS** (`.ris`), exportados do Zotero, do Mendeley ou do Google Acadêmico (“Citar → BibTeX”), ou cadastre à mão.
- Instituições como autor vão entre chaves: `{Associação Brasileira de Normas Técnicas}`.
- Cite no texto com `{{ref:código}}`, por exemplo `{{ref:back2008}}`, que vira “(BACK et al., 2008)”.
- Cada relatório ganha a seção **Referências**, em ordem alfabética, só com as obras citadas nele.

### Um só texto: relatórios de andamento e relatório da macroentrega
Cada macroentrega tem **um só texto** (o desenvolvimento em blocos), sem retrabalho. O topo da página mostra a situação:
- **📝 Em andamento:** o texto gera **relatórios de andamento** (sem termo de aceite). **Gerar relatório de andamento** guarda uma cópia do texto daquele dia no **histórico** (com período coberto) e gera o PDF em `relatorios/macroentrega_NN_andamento_NN.pdf`; o próximo período começa onde o anterior terminou. Versões do histórico podem ser reabertas (**✎ Corrigir**) e geradas de novo sem mudar o texto atual. No e-mail de andamento vai o relatório com o texto atual (`macroentrega_NN_andamento_atual.pdf`).
- **✅ Finalizada** (**✔ Marcar como finalizada**): o mesmo texto passa a gerar o **relatório da macroentrega**, com conclusão e termo de aceite. **↺ Voltar para em andamento** desfaz.

Todo relatório começa por **Próximos passos para o TRL esperado**: para cada item da árvore TRL abaixo do esperado, o nível atual, os critérios que faltam para o próximo nível e a área responsável.

**Apêndices:** o relatório da **última macroentrega** e o relatório geral terminam com os documentos individuais, quando houver informação: A Manual de projeto, B Manual de uso, C Questionário, D Análise QFD, E Busca de anterioridade e F Documentos do projeto (as letras seguem a ordem dos que existirem).

### Texto (Markdown básico)
Nos campos de texto e nos blocos:
- linha em branco separa parágrafos;
- `- `, `* ` ou `• ` fazem lista; `1. ` faz lista numerada (listas e parágrafos podem se alternar sem linha em branco);
- `#`, `##` e `###` fazem títulos;
- `**negrito**` e `*itálico*`;
- `{{fig:fig_001}}` e `{{tab:tab_001}}` citam figuras e tabelas; `{{ref:código}}` cita uma referência bibliográfica.

### Macroentregas: desenvolvimento em blocos
No cartão **Resultados — desenvolvimento**, monte o texto como num caderno (Google Colab). **Figuras e tabelas só existem dentro dos blocos**, junto do texto que as explica; em projetos antigos, o texto de resultados e as figuras/tabelas soltas viram blocos no início do desenvolvimento, na mesma ordem.
- Botões **+ Texto, + Capítulo, + Subcapítulo, + Seção, + Figura, + Tabela, + Dados do QFD, + Projeto do produto, + Questionário, + Pesquisa e + Quebra de página**. Ao incluir um bloco, novos botões aparecem abaixo dele.
- Cada bloco tem **✎ Editar / ✓ Concluir**, **🗑 Excluir** e **↑ ↓** para mover.
- O texto aceita negrito, listas e citações de figuras e tabelas (botões e seletor).
- Figura e tabela (importar CSV ou colar do Excel) ficam no próprio bloco, com numeração ABNT.
- Sem QFD ou sem questionário, o bloco avisa e leva à página de preenchimento.

No PDF, os blocos entram em **3. Resultados**, com capítulos numerados (3.1, 3.1.1 …). No relatório geral, entram no desenvolvimento de cada macroentrega.

**Projeto de produto pré-marcado:** num projeto novo, cada grupo de fases do NeDIP já vem ligado a uma macroentrega (informacional → 1, conceitual → 2, preliminar → 3, detalhado → última; com menos de 4 macroentregas, a distribuição é proporcional). Basta desmarcar o que não quiser.

### Qualidade: especificações vindas do QFD
Os critérios de qualidade são as **especificações de projeto**. No **projeto informacional**, o botão da entrada da fase **abre o sistema QFD** (https://marlonsigales.github.io/QFD/index.html, abre em outra aba; endereço em `CONFIG.urlQfd`). Ao voltar para a aba do sistema, ele **pede o backup JSON do QFD**; o JSON também pode ser importado a qualquer momento pelo botão "Importar resultado do aplicativo" ou na aba Qualidade. **O QFD é opcional**: as especificações podem ser cadastradas à mão no projeto informacional, ao lado das que vierem do QFD. O JSON é o backup completo exportado pelo botão "Backup" do painel do QFD. Também aceita um ZIP que contenha esse JSON.

Cada requisito de projeto vira uma linha, na **ordem de importância** do QFD:

| Campo do sistema | Vem do QFD |
|---|---|
| Requisito | `RPn. descrição` |
| Critério de aceite | valor-meta com o sentido de melhoria: ≥ (crescente), ≤ (decrescente) ou = ±5% (nominal) |
| Forma de avaliação | texto explicativo da especificação |
| Aspectos indesejáveis | da especificação |
| Medido | valor do "nosso produto" na avaliação competitiva |
| Situação | atingida ⇒ conforme · não atingida ⇒ não conforme · sem medição/meta ⇒ pendente |

O JSON original fica guardado em `qfd/`. Na **reimportação**, os requisitos são atualizados pelo identificador do QFD. Continuam como estavam:
- o PDCA;
- os requisitos cadastrados à mão;
- a situação, quando o QFD não traz medição.

Requisitos que saíram do QFD são mantidos e marcados. Só a exportação de especificações do QFD **não basta**, porque não traz a descrição dos requisitos: use o backup completo.

### Design for X (aba Qualidade / DfX)
São 15 diretrizes de Pahl, Beitz, Feldhusen e Grote (*Engineering Design*, 3. ed., Springer, 2007): regras básicas, qualidade, custo mínimo, risco mínimo, normas, dilatação, fluência, corrosão, desgaste, ergonomia, estética, fabricação (DFM), montagem (DFA), manutenção e reciclagem. Também é possível criar diretrizes próprias.

Para cada diretriz:
- **Usar** ou **Negligenciar**, com caixas clicáveis;
- recomendações de P&B que podem ser marcadas uma a uma;
- justificativa.

O sistema **sugere** a decisão a partir do TRL atual e da **condição de teste** (bancada, laboratório, ambiente relevante ou operacional), porque cada diretriz tem um TRL e uma condição de teste mínimos para ser verificada. O botão "Aplicar sugestões" preenche só as diretrizes ainda não decididas. As decisões aparecem no relatório geral. Os capítulos citados são os da edição inglesa de 2007; confira a numeração na sua edição.

### Figuras e tabelas (ABNT)
- **Figuras** (PNG/JPG/SVG) vão para `figuras/`. A legenda fica **acima** ("Figura N – Título") e a fonte **abaixo**.
- **Tabelas** seguem o padrão IBGE: título acima, fonte abaixo, sem bordas laterais. Dá para colar do Excel.
- A numeração é automática, na ordem das seções do relatório. Para citar no texto, use `{{fig:fig_001}}` ou `{{tab:tab_001}}`.
- O relatório geral traz **lista de figuras**, **lista de tabelas** e **sumário**, todos com número de página.

### TRL: avaliação dentro do sistema
Na aba **TRL** você monta a **estrutura do produto** (+ Produto e, em cada item, + Subsistema, + Montagem ou + Componente) e **avalia cada item por critérios**:
- **Critérios de cada nível (1 a 9):** cada um recebe **Sim**, **Não** ou **Não se aplica**, com uma **evidência** em texto e, se quiser, uma **figura do projeto** como prova.
- **TRL do item:** é o **maior nível em que todos os critérios dos níveis anteriores estão atendidos**. O sistema mostra o que **falta para o próximo nível**.
- **TRL do sistema:** é o **menor TRL entre as partes**. Os pontos de verificação, os responsáveis a cobrar, o e-mail e os PDFs usam esse cálculo. O relatório geral traz a tabela de **evidências por critério**, citando as figuras pelo número.
- **Histórico:** cada mudança de TRL fica registrada (item, de → para, data e usuário) e salva no JSON.
- **Origem dos critérios:** a redação é própria, baseada nas definições públicas de TRL da NASA (NPR 7123.1) e nos níveis da ISO 16290:2013. O questionário da ferramenta IMATEC/AEB não é reproduzido.

A **avaliação oficial da AEB** continua possível: **Exportar JSON compatível** gera o arquivo no formato do iMATEC (https://imatec.aeb.gov.br), e **Importar JSON** traz de volta uma avaliação feita lá. Itens importados aparecem como "importado". O botão **Avaliar por critérios** converte um item importado, pré-marcando os critérios até o nível declarado para você confirmar as evidências.

Chaves dos itens: o arquivo do iMATEC repete `id` e `stringId`, então cada item recebe uma chave pelo caminho na árvore (`P1/S1/A1/C1`). Incluir, remover ou mover itens recalcula as chaves e atualiza o vínculo das áreas.

---

## 5. Diferenças em relação à versão PHP

| Item | Versão PHP | Esta versão (navegador) |
|---|---|---|
| Servidor | PHP 8.1+ | nenhum (GitHub Pages ou o próprio disco) |
| Login | usuário e senha | não há: cada pessoa usa os próprios arquivos |
| E-mail | automático via SMTP, com anexo | programa de e-mail (anexo manual) **ou** EmailJS (automático, com limite de tamanho) |
| Onde ficam os dados | pasta no servidor, compartilhada por quem acessa | pasta do computador de cada usuário ou navegador; para compartilhar, use pasta sincronizada (OneDrive/Drive) ou ZIP |
| PDF | mPDF (fonte DejaVu Sans) | pdfmake no navegador (fonte Roboto) |
| Gravar em pasta | qualquer navegador | só Chrome/Edge de computador; nos demais, "guardado no navegador" |

O formato do JSON é o mesmo nas duas versões (`schema/projeto.schema.json`): um projeto salvo numa versão pode ser importado na outra.

---

## 6. Estrutura
```
index.html
assets/js/config.js        dados institucionais (edite aqui)
assets/js/nucleo.js        regras: modelo, validação, TRL, percentuais, CPM, riscos, Gantt
assets/js/armazenamento.js pasta do computador (File System Access) e IndexedDB; ZIP
assets/js/pdf.js           relatórios (pdfmake)
assets/js/email.js         e-mail (mailto / EmailJS)
assets/js/app.js           núcleo da interface
assets/js/nedip.js          fases NeDIP: recomendações, roteiro de questionário, funções → TRL
assets/js/produto.js        aba Projeto de produto/serviço (anexos e manuais)
assets/js/economia.js       análise econômica e de mercado da fase de lançamento (VPL, TIR, EVA, sensibilidade) e seu PDF
assets/js/simplificada.js   versão simplificada: aba Funções e especificações e geração automática de cronograma, TRL e áreas
assets/js/formulario.js     questionário do Google Forms (CSV, edição, análise, PDF)
assets/js/qfd.js            relatório da casa da qualidade a partir do backup do QFD; tabelas que viram a folha
assets/js/blocos.js         desenvolvimento das macroentregas em blocos (caderno) e seu PDF
assets/js/nedip_relatorio.js projeto de produto nos relatórios; diagrama da estrutura de funções
assets/js/intermediarios.js relatórios de andamento (histórico de cópias do texto) e seu PDF
assets/js/dicas.js          balões explicativos (dicionário por ação, aba, bloco e campo)
assets/js/pesquisa.js       aba Pesquisa: busca de anterioridade (patentes) e referências ABNT
assets/js/guia_exemplo.js   guia do exemplo (roteiro de aprendizado na aba Projeto)
assets/js/abas.js, macros.js, abnt.js, gantt.js, riscos.js, trl.js, relatorios.js
assets/js/templates.js     imagens dos templates embutidas (permite abrir do disco)
assets/js/exemplo.js       exemplo fictício (roda de bicicleta 700c), com figuras e QFD
exemplos/                  roda-bicicleta-generica.zip, qfd-roda-bicicleta.json, questionario-roda-google-forms.csv e patentes-roda-google-patents.csv
lib/                       pdfmake 0.2.20 e JSZip 3.10.1 (licenças MIT incluídas)
```

## Licença
Copyright (c) 2026 Marlon Sigales. Todos os direitos reservados. Copiar, reproduzir ou alterar o código exige autorização do autor; veja [LICENSE](LICENSE). As bibliotecas em `lib/` seguem suas próprias licenças (MIT).
