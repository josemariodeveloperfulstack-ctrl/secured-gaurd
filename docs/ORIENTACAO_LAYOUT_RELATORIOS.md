# Orientação de layout para relatórios

Este documento define quando usar **retrato** ou **paisagem** nos relatórios e como é o template de cada formato.

**Template paisagem (layout correto, sem distorção):** use a **segunda imagem** de referência — o template **em branco** com apenas: forma escura no canto superior esquerdo, faixa laranja→vermelho no topo, fundo branco e faixa fina no rodapé. O sistema desenha o logo e o bloco da empresa em cima desse PNG; com ele, tudo se ajusta perfeitamente.

---

## Regra de escolha da orientação

| Critério | Orientação |
|----------|------------|
| **Até 4 colunas** na tabela/conteúdo principal | **Retrato** (portrait) |
| **Mais de 4 colunas** na tabela/conteúdo principal | **Paisagem** (landscape) |

Exemplos:
- Relatório de funcionários com 4 colunas (Nome/CPF, Dados Profissionais, Contatos, Observações) → **retrato**.
- Relatório de veículos com 8 colunas (Placa, Marca/Modelo, Ano, etc.) → **paisagem** (quando aplicável no frontend) ou retrato conforme definição do módulo.

---

## Template em retrato (portrait)

- **Cabeçalho**
  - Barra horizontal em gradiente (amarelo → laranja → vermelho) no topo.
  - Forma escura (curva) no canto superior esquerdo.
  - **Logo da empresa** dentro da forma escura.
  - Título do relatório à direita da forma; nome da empresa abaixo.
- **Conteúdo**
  - Área branca para tabelas/texto.
- **Rodapé**
  - Linha fina em gradiente (mesmas cores).
  - Bloco com dados da empresa: nome, e-mail, endereço, telefone, data de geração.

**Onde está implementado**
- Frontend: `frontend/src/components/reporting/StandardReportTemplate.tsx` (quando `orientation !== 'landscape'`).
- Backend (PDF iText): `StandardReportLayoutService` (relatórios como Veículos, Funcionários).

---

## Template em paisagem (landscape)

O layout correto em paisagem é o **template em branco** (segunda imagem de referência). Tudo se ajusta sem distorção quando esse PNG é usado como fundo.

### Conteúdo do PNG (só o desenho, sem texto)

1. **Topo**
   - **Forma cinza escura/preta** no canto superior esquerdo (trapézio, borda curva inferior direita).
   - **Faixa horizontal** laranja → vermelho em toda a largura, logo abaixo.

2. **Meio**
   - **Fundo branco** (área de conteúdo).

3. **Rodapé**
   - Apenas **uma faixa fina** laranja → vermelho. Nenhum texto no PNG.

### O que o sistema desenha em cima

- **Logo da empresa** dentro da forma escura.
- **Título** e dados no cabeçalho.
- **Bloco da empresa** (nome, endereço, CNPJ) acima da faixa do rodapé.

**Onde colocar o template**

Salve a **segunda imagem** (template em branco, paisagem) como:

- `backend/src/main/resources/templates/reports/report-background-landscape.png`

Reinicie o backend. O `StandardReportLayoutService` usa esse arquivo como fundo em relatórios em paisagem.

### Resumo do template paisagem

| Elemento | No PNG (template) | Desenhado pelo sistema |
|----------|-------------------|-------------------------|
| Forma escura (canto superior esquerdo) | Sim | — |
| Faixa gradiente no topo | Sim | — |
| Logo dentro da forma | — | Sim |
| Fundo branco | Sim | — |
| Faixa gradiente no rodapé | Sim | — |
| Dados da empresa no rodapé | — | Sim |

---

## Uso no código

### Frontend (React)

Componente único com prop `orientation`:

```tsx
<StandardReportTemplate
  title="TÍTULO DO RELATÓRIO"
  company={company}
  orientation="portrait"   // ou "landscape"
  showBranding={true}
>
  {/* conteúdo: tabela, texto, etc. */}
</StandardReportTemplate>
```

- `orientation="portrait"`: logo no cabeçalho e rodapé completo.
- `orientation="landscape"`: template em branco como fundo; logo e rodapé com dados da empresa são desenhados pelo backend no PDF.

Arquivo: `frontend/src/components/reporting/StandardReportTemplate.tsx`.

### Backend (PDF com iText)

Os relatórios gerados no backend (ex.: Relatório de Veículos, Relatório de Funcionários) usam o `StandardReportLayoutService`, que hoje aplica o mesmo estilo de cabeçalho/rodapé (equivalente ao retrato). A definição de orientação da **página** (retrato/paisagem) é feita por `ReportLayoutConfig.landscape` no serviço de cada relatório.

---

## Quando usar o template em paisagem

Use o formato paisagem quando:

- O relatório tiver **mais de 4 colunas** (tabelas largas).
- For necessário **mais largura** para gráficos ou tabelas.
- O time/product definir que aquele relatório deve seguir o “template paisagem” (topo com barra + forma sem logo, rodapé só com linha).

O template em paisagem correto é a **segunda imagem** (template em branco); ao usá-la como `report-background-landscape.png`, o layout fica sem distorção.

---

## Documentos que usam o padrão de layout

Os relatórios e documentos em PDF gerados no backend utilizam o **StandardReportLayoutService** (cabeçalho com logo, gradiente, título e rodapé com dados da empresa). Abaixo, a lista dos documentos que seguem esse padrão:

| Documento (interface) | Serviço backend |
|------------------------|-----------------|
| Ficha de Registro do Funcionário | `EmployeeRecordPdfService` |
| Contrato de Trabalho | `EmploymentContractStandardPdfService` |
| Ficha de Entrega de EPI / EPI Manual | `EPIDeliveryStandardPdfService` |
| Termo de Responsabilidade de Equipamento | `EquipmentResponsibilityStandardPdfService` |
| Termo de Consentimento LGPD | `LGPDConsentStandardPdfService` |
| NPPS - Norma e Procedimento do Posto | `NppsStandardPdfService` |
| Ordem de Serviços | `OsStandardPdfService` + strategies |
| Advertência Disciplinar | `DisciplinaryWarningStandardPdfService` |
| Declaração | `DeclarationStandardPdfService` |
| Termo de Ciência do Prestador de Serviços | `ServiceProviderAwarenessStandardPdfService` |
| Termo de Compromisso de Vale-Transporte | `TransportVoucherStandardPdfService` |
| Relatório de Funcionários | `EmployeeReportPdfService` |
| Folha de Ponto | `FolhaDePontoStandardPdfService` |
| Contrato Cliente | `ClientContractStandardPdfService` |
| Formulário Contábil | `AccountingFormStandardPdfService` |
| Controle de EPI | `EPIControlPdfService` |
| Cotação / Proposta Comercial | `QuoteCommercialPdfService`, `ProposalCommercialPdfService` |
| Relatórios diversos (Veículos, Visitas, Pagamentos, etc.) | Vários em `ReportService`, `VehicleReportService`, `PaymentReportService`, etc. |

**Regra:** Todo PDF que deve ter o cabeçalho/rodapé padrão deve usar `ReportLayoutConfig` + `standardReportLayoutService.createDocumentWithLayout()`. Novos relatórios devem seguir o mesmo padrão.
