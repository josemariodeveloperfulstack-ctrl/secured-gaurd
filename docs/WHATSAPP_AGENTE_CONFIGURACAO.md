# Agente WhatsApp — Guia de configuração (Local Windows + VPS Linux)

Documentação para conectar os provedores **UAZAPI**, **Z-API**, **Evolution API** e **Baileys REST**, configurar o **agente com IA** (memória em banco), **inbox comercial** e **webhooks**.

> **Quando voltar com as chaves:** preencha os arquivos de exemplo na seção [Arquivos de ambiente](#arquivos-de-ambiente) e reinicie o backend (e os containers WhatsApp/Evolution, se aplicável).

---

## Índice

1. [Visão geral](#visão-geral)
2. [Arquitetura e fallback](#arquitetura-e-fallback)
3. [Ambiente local (Windows)](#ambiente-local-windows)
4. [Ambiente VPS (Linux)](#ambiente-vps-linux)
5. [Referência de variáveis](#referência-de-variáveis)
6. [Agente IA, memória e inbox](#agente-ia-memória-e-inbox)
7. [Webhooks Evolution](#webhooks-evolution)
8. [Conectar o WhatsApp (QR)](#conectar-o-whatsapp-qr)
9. [Validação e troubleshooting](#validação-e-troubleshooting)
10. [Checklist ao receber as chaves](#checklist-ao-receber-as-chaves)
11. [Arquivos relacionados no repositório](#arquivos-relacionados-no-repositório)

---

## Visão geral

O **Secured Guard** usa um **agente multi-provedor**: ao enviar mensagem, o backend tenta os provedores na ordem definida em `WHATSAPP_PROVIDER_ORDER`. Se um falhar, o próximo é usado automaticamente.

| Provedor | Tipo | Uso típico |
|----------|------|------------|
| **UAZAPI** | SaaS | Produção sem servidor próprio |
| **Z-API** | SaaS | Idem |
| **Evolution API v2** | Self-hosted (Docker) | CI, VPS, ou local com container |
| **Baileys REST** | Serviço Node no projeto | Dev local, fallback em CI/VPS |

Na tela **Sistema → Conexão WhatsApp** (`/whatsapp-connection`):

- Aba **Conexão**: status dos provedores, QR Code, testes.
- Aba **Inbox comercial**: histórico gravado no PostgreSQL, assumir atendimento humano, IA em pausa.

---

## Arquitetura e fallback

```
Envio de mensagem
       │
       ▼
WhatsAppAgentService
       │
       ├── 1º provedor (ex.: uazapi)  ──falha──►
       ├── 2º (ex.: zapi)            ──falha──►
       ├── 3º (ex.: evolution)       ──falha──►
       └── 4º (ex.: baileys)
```

**Ordem recomendada:**

| Ambiente | `WHATSAPP_PROVIDER_ORDER` sugerido |
|----------|-------------------------------------|
| Windows (local) | `baileys` ou `evolution,baileys` |
| CI (Docker) | `evolution,uazapi,zapi,baileys` |
| VPS / produção | `uazapi,zapi,evolution,baileys` (se tiver SaaS) ou `evolution,baileys` |

Mensagens recebidas (webhook) são gravadas em:

- `whatsapp_conversations` — thread por telefone, modo `AI_ACTIVE` ou `HUMAN_HANDOFF`
- `whatsapp_messages` — todas as mensagens (lead, IA, humano, sistema)

---

## Ambiente local (Windows)

### Pré-requisitos

- Docker Desktop (para o serviço Baileys e, opcionalmente, Evolution)
- PostgreSQL local (profile `local`)
- Backend com `SPRING_PROFILES_ACTIVE=local`
- Frontend Vite (`localhost:3000` → proxy `/api`)

### Opção A — Desenvolvimento com IntelliJ (recomendado)

#### 1. Subir o serviço Baileys

```powershell
cd c:\dev\secured-guard
docker compose -f docker-compose.local.yml up -d whatsapp
```

Verificar:

```powershell
curl http://localhost:3333/health
```

#### 2. Configuração do backend

Defaults em `backend/src/main/resources/application-local.properties`:

| Variável | Valor local padrão |
|----------|-------------------|
| `whatsapp.agent.provider-order` | `baileys` |
| `baileys.enabled` | `true` |
| `baileys.rest.url` | `http://localhost:3333` |
| `baileys.rest.instance.key` | `secured_guard_local` |

**Run configuration (IntelliJ):**

- Active profiles: `local`
- Variáveis opcionais: ver `deploy/env.whatsapp.local.example`

> **Importante:** o `INSTANCE_KEY` do container em `docker-compose.local.yml` é `secured_guard_local`. Na tela **Conexão WhatsApp**, use o mesmo nome de instância ao gerar o QR.

#### 3. Conectar o celular

1. Acesse **Conexão WhatsApp**
2. Instância: `secured_guard_local`
3. **Gerar QR Code** → escanear no WhatsApp (Aparelhos conectados)
4. **Verificar Status** até **Conectado**

### Opção B — Stack completa via Docker

```powershell
docker compose -f docker-compose.local.yml up -d
```

- Backend: `http://localhost:8083`
- Baileys (rede interna): `http://secured-guard-local-whatsapp:3333`
- Variáveis já injetadas no serviço `backend` do compose

### Evolution no Windows (opcional)

Subir Evolution na porta 8080 (imagem `atendai/evolution-api:v2.1.1`) e definir:

```properties
EVOLUTION_API_ENABLED=true
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=<PREENCHER>
EVOLUTION_API_INSTANCE=securedguard
WHATSAPP_PROVIDER_ORDER=evolution,baileys
```

### UAZAPI / Z-API no Windows (opcional)

Só aparecem como **habilitados** na UI se `UAZAPI_ENABLED=true` / `ZAPI_ENABLED=true` e tokens preenchidos. O QR costuma ser no **painel do SaaS**, não na tela do Secured Guard.

---

## Ambiente VPS (Linux)

### Perfis Spring

| Deploy | Profile típico | Arquivo properties |
|--------|----------------|-------------------|
| VPS Z7 | `vps-prod` | `application-vps-prod.properties` |
| Docker prod | `prod` | `application-prod.properties` + env do compose |
| CI | `ci` | `application-ci.properties` |

### Serviços Docker (referência)

| Serviço | Compose | Função |
|---------|---------|--------|
| `evolution-api-ci` | `docker-compose.ci.yml` | Evolution na rede Docker |
| `whatsapp-service-ci` / `whatsapp-service-prod` | CI / prod | Baileys REST |
| `backend-ci` / `backend` | CI / prod | API Spring |

### Passo a passo na VPS

#### 1. Criar/editar `.env`

Use o modelo:

- `deploy/env.whatsapp.vps.example` — copiar para `.env` na pasta do deploy
- Ou: `env.whatsapp-agent.template` na raiz do repo

Script auxiliar:

```bash
cd /var/www/secured_guard/ci   # ajuste o caminho da sua VPS
export EVOLUTION_API_KEY="<PREENCHER>"
# export UAZAPI_ENABLED=true
# export UAZAPI_BASE_URL=...
bash deploy/configure-whatsapp-agent.sh .env docker-compose.ci.yml
```

#### 2. Variáveis mínimas (Evolution na VPS)

```bash
WHATSAPP_PROVIDER_ORDER=evolution,uazapi,zapi,baileys

EVOLUTION_API_ENABLED=true
EVOLUTION_API_URL=https://evolution.z7botsolutions.com.br
EVOLUTION_API_KEY=<PREENCHER>
EVOLUTION_API_INSTANCE=securedguard

BAILEYS_ENABLED=true
BAILEYS_REST_URL=http://whatsapp-service-prod:3333
BAILEYS_INSTANCE_KEY=securedguard
```

> Dentro do Docker, use **hostname do serviço** (`whatsapp-service-prod:3333`), não `localhost`.

#### 3. Reiniciar containers

```bash
docker compose -f docker-compose.ci.yml up -d evolution-api-ci backend-ci whatsapp-service-ci
# ou o compose de produção que você utiliza
```

#### 4. Webhook + IA (produção)

Ver seções [Webhooks Evolution](#webhooks-evolution) e [Agente IA](#agente-ia-memória-e-inbox).

#### 5. Validar

```bash
curl -s https://SEU_DOMINIO/api/whatsapp/agent/status
```

---

## Referência de variáveis

### Ordem e agente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `WHATSAPP_PROVIDER_ORDER` | Ordem de fallback (vírgula) | `uazapi,zapi,evolution,baileys` |
| `WHATSAPP_AGENT_AI_ENABLED` | IA responde automaticamente | `true` |
| `WHATSAPP_AGENT_CONTEXT_MAX_MESSAGES` | Mensagens no contexto Gemini | `40` |
| `WHATSAPP_AGENT_SYSTEM_PROMPT` | Prompt sistema (opcional) | vazio = padrão Promover |
| `WHATSAPP_WEBHOOK_REQUIRE_API_KEY` | Exige header `apikey` no webhook | `true` |

### Gemini (IA)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `GEMINI_API_ENABLED` | Habilita chamadas Gemini | `true` |
| `GEMINI_API_KEY` | Chave Google AI | `<PREENCHER>` |
| `GEMINI_API_URL` | URL da API | `https://generativelanguage.googleapis.com/v1beta` |
| `WHATSAPP_AGENT_AI_MODEL` | Modelo para chat | `gemini-1.5-flash` |

### Evolution API

| Variável | Descrição | Local | VPS |
|----------|-----------|-------|-----|
| `EVOLUTION_API_ENABLED` | Liga/desliga | `false` ou `true` | `true` |
| `EVOLUTION_API_URL` | URL base | `http://localhost:8080` | `https://evolution.z7botsolutions.com.br` |
| `EVOLUTION_API_KEY` | API Key (header `apikey`) | `<PREENCHER>` | `<PREENCHER>` |
| `EVOLUTION_API_INSTANCE` | Nome da instância | `securedguard` | `securedguard` |
| `EVOLUTION_SERVER_URL` | URL pública (container Evolution) | — | `https://evolution.z7botsolutions.com.br` |

### UAZAPI

| Variável | Descrição |
|----------|-----------|
| `UAZAPI_ENABLED` | `true` para ativar |
| `UAZAPI_BASE_URL` | URL da instância (ex.: `https://xxx.uazapi.com`) |
| `UAZAPI_INSTANCE_TOKEN` | Token da instância |
| `UAZAPI_ADMIN_TOKEN` | Token admin (opcional) |

Documentação: https://docs.uazapi.com

### Z-API

| Variável | Descrição |
|----------|-----------|
| `ZAPI_ENABLED` | `true` para ativar |
| `ZAPI_BASE_URL` | `https://api.z-api.io` |
| `ZAPI_INSTANCE_ID` | ID da instância |
| `ZAPI_INSTANCE_TOKEN` | Token da instância |
| `ZAPI_CLIENT_TOKEN` | Client-Token (header) |

Documentação: https://developer.z-api.io

### Baileys REST

| Variável | Descrição | Local | VPS/CI |
|----------|-----------|-------|--------|
| `BAILEYS_ENABLED` | Habilita provedor | `true` | `true` |
| `BAILEYS_REST_URL` | URL do serviço | `http://localhost:3333` | `http://whatsapp-service-ci:3333` |
| `BAILEYS_INSTANCE_KEY` | Nome da sessão | `secured_guard_local` | `securedguard_ci` / `securedguard` |
| `BAILEYS_REST_TOKEN` | Token (se configurado no serviço) | `<PREENCHER ou vazio>` | `<PREENCHER ou vazio>` |

### Mapeamento properties Spring

As variáveis de ambiente acima mapeiam para `application.properties`:

```properties
whatsapp.agent.provider-order=${WHATSAPP_PROVIDER_ORDER:...}
uazapi.enabled=${UAZAPI_ENABLED:false}
zapi.enabled=${ZAPI_ENABLED:false}
evolution.api.url=${EVOLUTION_API_URL:}
baileys.rest.url=${BAILEYS_REST_URL:http://localhost:3333}
```

---

## Agente IA, memória e inbox

### Comportamento

| Modo | Comportamento |
|------|----------------|
| `AI_ACTIVE` | Mensagem do lead → gravada → Gemini gera resposta → enviada e gravada |
| `HUMAN_HANDOFF` | Mensagens gravadas; **IA não responde** |
| Humano no app WhatsApp | Detectado (`fromMe` sem envio recente do sistema) → pausa IA automaticamente |

### API REST (equipe comercial)

Requer permissões comerciais (mesmo grupo de `/api/leads/**`).

| Método | Endpoint | Função |
|--------|----------|--------|
| `GET` | `/api/whatsapp/agent/conversations` | Lista conversas |
| `GET` | `/api/whatsapp/agent/conversations/{id}/messages` | Histórico |
| `POST` | `/api/whatsapp/agent/conversations/{id}/takeover` | Humano assume |
| `POST` | `/api/whatsapp/agent/conversations/{id}/release-ai` | Reativa IA |
| `POST` | `/api/whatsapp/agent/conversations/{id}/messages` | Enviar como consultor |

### Status dos provedores

| Método | Endpoint |
|--------|----------|
| `GET` | `/api/whatsapp/agent/status` |

---

## Webhooks Evolution

### Endpoint

```
POST /api/webhooks/whatsapp/evolution
```

- **Segurança:** público (`permitAll`), validação opcional via header `apikey` = `EVOLUTION_API_KEY`
- **Property:** `whatsapp.agent.webhook.require-api-key=true`

### URLs por ambiente

| Ambiente | URL do webhook (Evolution → backend) |
|----------|--------------------------------------|
| CI (rede Docker) | `http://backend-ci:8080/api/webhooks/whatsapp/evolution` |
| VPS pública | `https://<SEU_DOMINIO_API>/api/webhooks/whatsapp/evolution` |

### Configuração no `docker-compose.ci.yml`

```yaml
WEBHOOK_GLOBAL_ENABLED: "true"
WEBHOOK_GLOBAL_URL: http://backend-ci:8080/api/webhooks/whatsapp/evolution
WEBHOOK_EVENTS_MESSAGES_UPSERT: "true"
WEBHOOK_EVENTS_SEND_MESSAGE: "true"
```

### Eventos processados

- `messages.upsert` / eventos com `message` no payload
- Mensagens do lead (`fromMe: false`) → persistência + IA (se ativa)
- Mensagens `fromMe: true` → distingue envio do sistema vs. humano no celular

---

## Conectar o WhatsApp (QR)

### Pela tela Secured Guard

1. **Conexão WhatsApp** → aba **Conexão**
2. Nome da instância alinhado ao ambiente (ver tabela abaixo)
3. **Gerar QR Code** → escanear
4. **Verificar Status**

| Ambiente | Instância Baileys | Instância Evolution |
|----------|-------------------|---------------------|
| Windows local | `secured_guard_local` | `securedguard` |
| CI | `securedguard_ci` | `securedguard` |
| VPS / prod | `securedguard` | `securedguard` |

### Pela Evolution (curl na VPS)

```bash
# Criar instância (se necessário)
curl -X POST "https://evolution.z7botsolutions.com.br/instance/create" \
  -H "apikey: <EVOLUTION_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"securedguard","integration":"WHATSAPP-BAILEYS","qrcode":true}'

# Obter QR
curl -H "apikey: <EVOLUTION_API_KEY>" \
  "https://evolution.z7botsolutions.com.br/instance/connect/securedguard"
```

### UAZAPI / Z-API

Conexão do número é feita no **painel do provedor**. No Secured Guard, valide com `/api/whatsapp/agent/status` (`connected: true`).

---

## Validação e troubleshooting

### Status na UI

| Badge | Significado |
|-------|-------------|
| **on** + **API ok** + **closed** | Serviço responde, WhatsApp **não** pareado (falta QR) |
| **on** + **connected** | Pronto para enviar |
| **off** + **disabled** | `*_ENABLED=false` ou credenciais vazias |
| **indisponível** | URL inacessível do backend (container parado, URL errada) |

### Comandos úteis

**Windows (PowerShell):**

```powershell
docker ps
curl http://localhost:3333/health
curl http://localhost:8081/api/whatsapp/agent/status
```

**VPS (Linux):**

```bash
docker ps | grep -E 'evolution|whatsapp|backend'
docker logs evolution-api-ci --tail 50
docker logs secured-guard-backend-ci --tail 50
curl -s http://localhost:8080/api/whatsapp/agent/status | jq .
```

### Problemas comuns

| Problema | Causa provável | Solução |
|----------|----------------|---------|
| Evolution **disabled** no local | `EVOLUTION_API_URL` vazio | Preencher URL ou usar só Baileys |
| Baileys **closed** | QR não escaneado | Gerar QR com instância correta |
| QR não aparece | Sessão antiga | **Limpar Sessão e Reconectar** |
| UAZAPI/Z-API **disabled** | `*_ENABLED=false` | Ativar e preencher tokens |
| IA não responde | `GEMINI_API_ENABLED=false` | Habilitar Gemini + chave |
| Inbox vazio | Webhook não configurado | Configurar `WEBHOOK_GLOBAL_URL` na Evolution |
| Webhook 401 | `apikey` incorreta | Igualar `EVOLUTION_API_KEY` |

---

## Checklist ao receber as chaves

Use esta lista quando tiver todos os valores:

### Local (Windows)

- [ ] `docker compose -f docker-compose.local.yml up -d whatsapp`
- [ ] Preencher `deploy/env.whatsapp.local.example` → salvar como `.env.local` (ou variáveis no IntelliJ)
- [ ] `SPRING_PROFILES_ACTIVE=local`
- [ ] Reiniciar backend
- [ ] QR com instância `secured_guard_local`
- [ ] `GET /api/whatsapp/agent/status` → Baileys connected
- [ ] (Opcional) `GEMINI_API_KEY` + `GEMINI_API_ENABLED=true`
- [ ] Testar aba **Inbox comercial**

### VPS (Linux)

- [ ] Preencher `deploy/env.whatsapp.vps.example` → `.env` no servidor
- [ ] `EVOLUTION_API_KEY` no `.env` e no painel Evolution
- [ ] `docker compose ... up -d evolution-api-ci backend-ci whatsapp-service-ci`
- [ ] Webhook público apontando para `/api/webhooks/whatsapp/evolution`
- [ ] `curl .../api/whatsapp/agent/status` → provedores ok
- [ ] QR / conexão Evolution ou SaaS
- [ ] (Opcional) UAZAPI e/ou Z-API com `*_ENABLED=true`
- [ ] `GEMINI_API_KEY` em produção
- [ ] Teste mensagem real → aparece no inbox

### GitHub Actions / CI (secrets)

Secrets sugeridos (ver `.github/workflows/deploy-ci-docker.yml`):

- `EVOLUTION_API_KEY`
- `UAZAPI_*` / `ZAPI_*` (se usar)
- `GEMINI_API_KEY`

---

## Arquivos de ambiente

| Arquivo | Uso |
|---------|-----|
| `deploy/env.whatsapp.local.example` | Template Windows — copiar e preencher |
| `deploy/env.whatsapp.vps.example` | Template VPS Linux — copiar para `.env` do servidor |
| `env.whatsapp-agent.template` | Template genérico (raiz do repo) |
| `backend/src/main/resources/application-local.properties` | Defaults profile `local` |
| `backend/src/main/resources/application-vps-prod.properties` | Defaults VPS |
| `backend/src/main/resources/application-ci.properties` | Defaults CI |

---

## Arquivos relacionados no repositório

| Caminho | Conteúdo |
|---------|----------|
| `backend/.../service/whatsapp/WhatsAppAgentService.java` | Fallback entre provedores |
| `backend/.../service/whatsapp/agent/*` | IA, conversas, webhook inbound |
| `backend/.../controller/WhatsAppWebhookController.java` | Webhook Evolution |
| `backend/.../controller/WhatsAppAgentConversationController.java` | API inbox |
| `frontend/src/pages/WhatsAppConnection.tsx` | UI Conexão + Inbox |
| `docker-compose.local.yml` | Baileys local |
| `docker-compose.ci.yml` | Evolution + webhook CI |
| `deploy/configure-whatsapp-agent.sh` | Script `.env` na VPS |
| `deploy/DEPLOY_EVOLUTION_CI.md` | Deploy Evolution no CI |
| `backend/docs/WHATSAPP_IMPLEMENTATION_SUMMARY.md` | Resumo técnico anterior |
| `backend/src/main/resources/db/migration/V1047__whatsapp_agent_conversations.sql` | Tabelas de conversa |

---

## Resumo rápido

```
┌─────────────────┐     webhook      ┌──────────────────┐
│  Evolution /    │ ───────────────► │  Backend Spring  │
│  UAZAPI / Z-API │                  │  + PostgreSQL    │
│  Baileys        │ ◄─────────────── │  + Gemini (IA)   │
└─────────────────┘     envio        └──────────────────┘
                                              │
                                              ▼
                                    Frontend Inbox / QR
```

**Local:** comece com **Baileys** (`localhost:3333`) + instância `secured_guard_local`.  
**VPS:** comece com **Evolution** + `EVOLUTION_API_KEY` + webhook + opcional SaaS.

---

*Última atualização: maio/2026 — agente multi-provedor, memória em banco e inbox comercial.*
