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

Ao abrir o site, clique em **📂 Projetos** e escolha uma das opções abaixo.

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

### Levar para outra máquina
Use **Exportar ZIP** (JSON + figuras + histórico) e, na outra máquina, **📂 Projetos → Importar**. Também dá para importar o JSON junto com as imagens selecionadas.

---

## 3. E-mail de andamento (⚙ Configurações)

Sem servidor, o navegador **não consegue enviar e-mail sozinho**. Por isso há três modos:

| Modo | O que acontece ao salvar |
|---|---|
| **Abrir meu programa de e-mail** (padrão) | Abre o programa de e-mail padrão (Outlook, Thunderbird, Mail…) com destinatários, assunto `andamento projeto <nome>` e resumo prontos. O JSON é baixado e **você anexa e clica em Enviar**. Por limitação técnica do `mailto:`, não é possível anexar automaticamente. |
| **Automático pelo EmailJS** | Envia sozinho, com o JSON anexado, pelo serviço gratuito [EmailJS](https://www.emailjs.com) (requer internet). |
| **Não enviar** | Só salva. |

Em todos os modos o corpo do e-mail traz, em lista: percentual geral, TRL atual e esperado do sistema, **TRL por área com os responsáveis**, **pontos de verificação (TRL mais baixo) com quem cobrar**, macroentregas atrasadas e riscos altos.

### Configurar o EmailJS (uma vez só)
1. Crie uma conta em https://www.emailjs.com.
2. Em **Email Services**, conecte o seu e-mail (Gmail, Outlook etc.) e anote o **Service ID**.
3. Em **Email Templates**, crie um modelo:
   - **To Email:** `{{to_email}}`
   - **Subject:** `{{subject}}`
   - **Content:** mude para HTML e use `{{{message_html}}}` (três chaves). Em texto puro, use `{{message}}`.
   - **Attachments → Add Attachment → Variable Attachment:** *Parameter Name* `json_anexo`, *Filename* `{{nome_anexo}}`, *Content Type* JSON.
   - Anote o **Template ID**.
4. Em **Account → General**, copie a **Public Key**.
5. No sistema, abra **⚙ Configurações**, escolha *Automático pelo EmailJS* e cole os três códigos.

Os limites dependem do plano do EmailJS. No gratuito, o total da mensagem é pequeno (cerca de 50 KB). Se o JSON passar de ~45 KB (valor ajustável em `assets/js/config.js`), o e-mail sai **sem o anexo** e o sistema avisa. As configurações de e-mail ficam guardadas só naquele navegador (localStorage) e nunca vão para o JSON do projeto.

---

## 4. Uso

| Aba | Conteúdo |
|---|---|
| **Projeto** | Painel (percentual, TRL, alertas, ponto de verificação); identificação, coordenação, introdução e objetivo geral |
| **Equipe e Interessados** | Equipe (página "Equipe" dos PDFs) e **e-mails que recebem o andamento** |
| **Áreas / Responsáveis** | Áreas técnicas ligadas a itens da árvore TRL, com **um ou mais responsáveis** (quem cobrar) e TRL esperado |
| **Macroentregas** | Uma sub-aba por macroentrega, com **+ Macroentrega / – Remover** (a numeração é refeita). Textos do template, figuras, tabelas, atividades, termo de aceite e **PDF da macroentrega** |
| **Cronograma** | EAP, Gantt, caminho crítico (CPM) e atividades atrasadas |
| **Riscos** | Registro e matriz 5×5 (P × I) |
| **Qualidade** | Requisitos, critérios de aceite, verificação e PDCA das não conformidades |
| **TRL** | Importação da avaliação oficial (https://imatec.aeb.gov.br), árvore, pontos de verificação, gráfico atual × esperado |
| **Lições aprendidas** | Registro por macroentrega |
| **Relatórios e Exportação** | PDFs, prévia e envio do e-mail, JSON, ZIP, histórico e exclusão |

**Salvar:** botão no topo ou **Ctrl+S**.

### Figuras e tabelas (ABNT)
- **Figuras** (PNG/JPG/SVG) vão para `figuras/`. A legenda fica **acima** ("Figura N – Título") e a fonte **abaixo**.
- **Tabelas** seguem o padrão IBGE: título acima, fonte abaixo, sem bordas laterais. Dá para colar do Excel.
- A numeração é automática, na ordem das seções do relatório. Para citar no texto, use `{{fig:fig_001}}` ou `{{tab:tab_001}}`.
- O relatório geral traz **lista de figuras**, **lista de tabelas** e **sumário**, todos com número de página.

### TRL
- Cada item da árvore recebe uma chave própria pelo caminho (`P1/S1/A1/C1`), porque o arquivo da ferramenta repete `id` e `stringId`. A árvore pode ter qualquer profundidade e vários produtos.
- O TRL do sistema é o **menor TRL entre os subelementos**. Quando o valor informado num item difere do mínimo dos filhos, o sistema mostra os dois.
- Na reimportação, o sistema mostra as diferenças (itens novos, removidos, TRL que subiu ou caiu) e mantém o vínculo das áreas pelo título do item.

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
assets/js/abas.js, macros.js, abnt.js, gantt.js, riscos.js, trl.js, relatorios.js
assets/js/templates.js     imagens dos templates embutidas (permite abrir do disco)
assets/js/exemplo.js       projeto de exemplo
lib/                       pdfmake 0.2.20 e JSZip 3.10.1 (licenças MIT incluídas)
```
