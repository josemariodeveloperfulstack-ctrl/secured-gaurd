# E-mail marketing — rastreamento de aberturas e cliques

Este guia explica por que os KPIs **Aberturas** e **Cliques** podem ficar em zero e como configurar o rastreamento corretamente.

---

## Como funciona

Ao **enviar** uma campanha (SMTP ou SendGrid), o backend:

1. Grava um registro em `email_logs` (um por destinatário).
2. Injeta no HTML:
   - **Pixel de abertura** — imagem 1×1 invisível (`/email-marketing/track/open/{id}.gif`).
   - **Links rastreados** — cada link `http(s)` passa por `/email-marketing/track/click/{id}?u=...`.
3. Quando o lead abre o e-mail ou clica, o servidor registra `OPENED` / `CLICKED` e a tela **Marketing → Campanhas** atualiza o funil.

Endpoints públicos (sem login): configurados em `SecurityConfig` como `permitAll` em `/email-marketing/**`.

---

## Por que aparece 0 aberturas / 0 cliques?

### 1. Desenvolvimento local (`localhost`) — causa mais comum

Se o backend roda no PC com profile `local`, a URL padrão de rastreamento seria `http://localhost:8083`. O sistema **não injeta** pixel/links com URL local, porque:

- Gmail, Outlook e Yahoo **não conseguem acessar** o seu `localhost`.
- O código trata `localhost` como URL inválida para e-mails reais.

**Sintoma:** campanha **Concluída**, **Total enviado** > 0, mas **Aberturas** e **Cliques** sempre 0 (mesmo abrindo o e-mail).

**Solução para testar no PC:**

```powershell
# Terminal 1 — backend na porta 8083
# Terminal 2 — túnel público (ex.: ngrok)
ngrok http 8083
```

No IntelliJ ou `.env`:

```properties
EMAIL_MARKETING_TRACKING_BASE_URL=https://SEU-SUBDOMINIO.ngrok-free.app
```

Reinicie o backend, crie uma **nova campanha** e envie de novo. Campanhas antigas **não** ganham rastreamento retroativo.

Alternativa: enviar campanhas pelo ambiente **CI** (`https://ci.z7botsolutions.com.br`), que já tem URL pública configurada.

### 2. Campanha enviada antes do rastreamento existir

E-mails já disparados **sem** pixel não passam a ser rastreados depois. É preciso um novo envio.

### 3. Cliente de e-mail bloqueia imagens

Muitos provedores só carregam imagens quando o usuário clica em **“Exibir imagens”**. Sem isso, o pixel não dispara → abertura não contada (limitação de qualquer ferramenta de e-mail marketing).

### 4. Template sem links clicáveis

Cliques só são contados em links `http://` ou `https://` no HTML. `mailto:`, `#` e links de descadastro não entram.

### 5. Produção (VPS) sem URL configurada

No servidor, defina no `.env`:

```bash
EMAIL_MARKETING_TRACKING_BASE_URL=https://securedguard.z7botsolutions.com.br
```

(ou o domínio real da API, **sem** barra no final)

Reinicie o backend e envie uma campanha nova.

### 6. SendGrid com Event Webhook (opcional)

Além do pixel próprio, o sistema aceita webhooks SendGrid em `/api/webhooks/sendgrid/**`. Para SMTP puro, o pixel + redirect são a fonte principal.

---

## Configuração por ambiente

| Ambiente | Variável | Valor exemplo |
|----------|----------|----------------|
| Local (teste real) | `EMAIL_MARKETING_TRACKING_BASE_URL` | `https://xxxx.ngrok-free.app` |
| CI | `EMAIL_MARKETING_TRACKING_BASE_URL` | `https://ci.z7botsolutions.com.br` |
| VPS / produção | `EMAIL_MARKETING_TRACKING_BASE_URL` | `https://securedguard.z7botsolutions.com.br` |

Properties Spring:

- `app.email.marketing.tracking-base-url`
- Fallback: `app.email.marketing.assets-base-url` e `assets-base-url-fallback`

Arquivos:

- `application-ci.properties` — CI já com URL pública
- `application-vps-prod.properties` — produção
- `application-local.properties` — vazio por padrão (obrigatório definir ngrok ou CI)

---

## Como validar

### 1. Verificar se o HTML tem pixel (nova campanha)

Após configurar URL pública, envie teste para seu e-mail. No código-fonte da mensagem, procure:

```html
<img src="https://SEU-DOMINIO/email-marketing/track/open/UUID.gif" ...
```

Se não existir, o rastreamento não foi injetado (URL ainda inválida).

### 2. Testar o endpoint manualmente

Substitua `{id}` por um UUID de `email_logs` da campanha:

```text
GET https://SEU-DOMINIO/email-marketing/track/open/{id}.gif
```

Deve retornar uma imagem GIF 1×1 e o status do log passa a `OPENED`.

### 3. Na interface

1. **Marketing → Campanhas** → selecione a campanha.
2. Veja **Aberturas / Cliques** e o **Funil**.
3. Aba de registros → filtro **Lidos** / **Clicados**.

### 4. Logs do backend

Se a URL não estiver configurada, ao enviar aparece:

```text
Tracking de e-mail desativado: URL pública não configurada (emailLogId=...)
```

---

## Funil: Enviados vs Entregues

- **Enviados:** mensagens aceitas pelo servidor (status `SENT`, `DELIVERED` ou posteriores).
- **Entregues:** mesmo conjunto para SMTP; `DELIVERED` é gravado ao aceitar o envio.
- **Abertos / Clicados:** só após pixel ou link rastreado (ou webhook SendGrid).

Campanhas antigas com status apenas `SENT` ainda aparecem como enviadas; o funil trata `SENT` como entregue para exibição correta.

---

## Checklist rápido

- [ ] URL pública em `EMAIL_MARKETING_TRACKING_BASE_URL` (não localhost para e-mails reais)
- [ ] Backend reiniciado após alterar variável
- [ ] **Nova** campanha de teste (não reutilizar envio antigo)
- [ ] Abrir o e-mail e permitir carregar imagens
- [ ] Clicar em um link `https://` do corpo do e-mail
- [ ] Atualizar a tela da campanha (ou aguardar alguns segundos)

---

## Respostas (respondidos)

Respostas por e-mail usam **Inbound Parse** do SendGrid (e-mail encaminhado para o sistema). SMTP simples sem Parse pode não preencher **Respondidos** automaticamente — isso é independente de abertura/clique.

---

## Arquivos relacionados

| Arquivo | Função |
|---------|--------|
| `EmailTrackingService.java` | Pixel + rewrite de links |
| `EmailTrackingController.java` | Endpoints `/email-marketing/track/...` |
| `EmailDispatchService.java` | Chama `injectTracking` no envio |
| `CampaignDetailPanel.tsx` | Funil e KPIs no frontend |

---

*Última atualização: maio/2026*
