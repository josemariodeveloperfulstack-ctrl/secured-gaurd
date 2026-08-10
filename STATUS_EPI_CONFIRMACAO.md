# 📋 Confirmação de Entrega de EPI — WhatsApp, Link Público e Portal

**Data:** 04/08/2026
**Status:** ✅ IMPLEMENTADO E COBERTO POR 33 TESTES UNITÁRIOS
**Escopo:** Backend (`EPIDeliveryFormService`) + Frontend (`EpiConfirmReceiptPage`, `FichaEntregaEPIForm`)

---

## 🎯 Visão Geral

A ficha de entrega de EPI ganhou confirmação de recebimento **assinada digitalmente** pelo funcionário,
em três caminhos:

1. **WhatsApp** — o sistema gera código de 6 dígitos + link público `/epi-confirm/{token}` e envia
   automaticamente (ou gera link `wa.me` para envio manual);
2. **Link público** — o funcionário abre o link, digita o código e assina (desenho na tela);
3. **Portal do funcionário** — o próprio funcionário confirma pelo sistema (`confirmOwnReceipt`).

Existem **dois modos de confirmação**, decididos por `isPerItemMode(form)`:

| Condição | Modo |
|----------|------|
| `PRIMEIRA_ENTREGA` | **Por ficha** (um código + link para toda a ficha) |
| Substituição/Troca/Devolução **e** funcionário `ACTIVE` | **Por item** (código + link próprios por EPI) |
| Substituição/Troca/Devolução com funcionário **inativo** | **Por ficha** (fallback) |

---

## 🔀 Fluxos Implementados

### 1. Envio (`sendWhatsAppConfirmation`)

```
Enviar Confirmação (fichaId, AUTO|MANUAL)
├── Guards: ficha concluída? sem itens? funcionário sem telefone? telefone inválido?
├── isPerItemMode?
│   ├── SIM  → para cada item NÃO confirmado:
│   │          token + código(6) + validade(48h) individuais
│   │          ficha: token/código limpos, status DRAFT, signatureType=WHATSAPP_CONFIRM
│   │          se todos já confirmados → BusinessException
│   └── NÃO  → token + código(6) + validade(48h) NA FICHA
│             status DRAFT, signatureType=WHATSAPP_CONFIRM, signedAt=null
└── AUTO → whatsAppAgentService.sendTextMessage (com fallback de provedores)
    MANUAL → retorna wa.me para envio manual (sent=false)
```

### 2. Confirmações

| Método | Origem gravada em `signature_origin` | Quem confirma |
|--------|--------------------------------------|---------------|
| `confirmPublicReceipt(token, code, assinatura)` | `WHATSAPP_LINK` | Funcionário pelo link público |
| `confirmWithCode(formId, code)` | `ADMIN_CODE` | Operador digitando o código |
| `confirmOwnReceipt(formId, employeeId, code)` | `PORTAL_CODE` (WhatsApp) ou `PORTAL_SELF` (direto, `ON_SCREEN`) | Próprio funcionário no portal |

**Por ficha:** confirmação do código da ficha → ficha `COMPLETED`, `signedAt` gravado.
**Por item:** cada item é confirmado individualmente (`confirmed_at` por item); ao confirmar o
**último** item, a ficha é concluída (`COMPLETED`). Enquanto houver item pendente, a ficha segue `DRAFT`
e a baixa de estoque não é aplicada.

**Regras de validação comuns (`applyConfirmation` / `applyItemConfirmation`):**
- Ficha/item já confirmado → `BusinessException("Recebimento já confirmado." / "Este item já foi confirmado.")`
- Sem código gerado → `BusinessException("Nenhuma confirmação WhatsApp foi gerada...")`
- Código expirado (48h) → `BusinessException("O código de confirmação expirou...")`
- Código incorreto → `BusinessException("Código de confirmação inválido.")`
- Assinatura em branco **não sobrescreve** assinatura já registrada
- IP e User-Agent do cliente são arquivados (auditoria)

---

## 🗄️ Banco de Dados

| Migração | Tabela | Colunas |
|----------|--------|---------|
| `V1064__epi_whatsapp_confirmation.sql` | `epi_delivery_forms` | `confirmation_token`, `confirmation_code`, `confirmation_expires_at`, `confirmation_sent_at`, `signed_at`, `signature_origin`, `audit_ip`, `audit_user_agent` (+ índice único parcial em `confirmation_token`) |
| `V1075__add_item_confirmation_to_epi_delivery_items.sql` | `epi_delivery_form_items` | `confirmation_token`, `confirmation_code`, `confirmation_expires_at`, `confirmation_sent_at`, `confirmed_at`, `signature_base64` (+ índice único parcial em `confirmation_token`) |

> `V1075` foi criada para cobrir as colunas por item do modelo `EPIDeliveryFormItem`
> (a `V1064` só cobria o nível da ficha).

---

## ✅ Cobertura de Testes (33 testes)

Base compartilhada com mocks/helpers: **`AbstractEPIDeliveryFormConfirmationTest`**

| Classe de teste | Qtde | Cobre |
|-----------------|------|-------|
| `EPIDeliveryFormPerItemConfirmationTest` | **14** | Envio por item (AUTO/MANUAL), discriminador `isPerItemMode` (primeira entrega, funcionário inativo), guards (ficha concluída, sem telefone, telefone curto, todos confirmados), `confirmWithCode` parcial/completo, código inválido/confirmado/expirado, `confirmPublicReceipt` por item com assinatura |
| `EPIDeliveryFormConfirmationTest` | **10** | Envio por ficha (AUTO/MANUAL/falha de envio), `confirmWithCode` código da ficha (correto/inválido/expirado/já confirmado), `confirmPublicReceipt` por ficha (assinatura + auditoria, assinatura em branco, sem código gerado) |
| `EPIDeliveryFormPortalConfirmationTest` | **9** | `confirmOwnReceipt`: guardas de autorização (funcionário diferente, já confirmado, `signedAt` sem `COMPLETED`), código da ficha → `PORTAL_CODE`, código de item → `PORTAL_CODE` (parcial e último item), confirmação direta → `PORTAL_SELF`/`ON_SCREEN` |

### Como rodar

```bash
cd backend

# Apenas os testes de confirmação de EPI
./mvnw test -Dtest='EPIDeliveryForm*ConfirmationTest' -DfailIfNoTests=false

# Todos os testes unitários do backend
./mvnw test
```

**Resultado atual:** `33 testes, 0 falhas, 0 erros` (10 + 14 + 9).

---

## 📌 Observações

- A baixa de estoque ao concluir a ficha (`applyStockDeductionIfNeeded`) é coberta nos testes com
  vínculo a uma requisição de almoxarifado **não gerada pela ficha** (`REQ-2025-*`), mantendo o foco
  na lógica de confirmação; fichas com `REQ-EPI-*` continuam sincronizando estoque normalmente.
- As 3 classes de teste foram refatoradas para herdar a base comum e evitar duplicação de mocks.

---

**Última atualização:** 04/08/2026
**Status:** ✅ Funcionalidades implementadas e validadas por 33 testes unitários
