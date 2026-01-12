# 📄 Padrão de Layout para Relatórios - Secured Guard

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Especificações Técnicas](#especificações-técnicas)
3. [Estrutura do Layout](#estrutura-do-layout)
4. [Cabeçalho](#cabeçalho)
5. [Rodapé](#rodapé)
6. [Marca d'Água](#marca-dágua)
7. [Área de Conteúdo](#área-de-conteúdo)
8. [Cores e Tipografia](#cores-e-tipografia)
9. [Padrões de Uso](#padrões-de-uso)
10. [Exemplos de Implementação](#exemplos-de-implementação)

---

## 🎯 Visão Geral

Este documento define o padrão visual unificado para todos os relatórios gerados no sistema Secured Guard, garantindo consistência visual e profissionalismo em todos os módulos.

### Objetivos
- ✅ Padronizar visualmente todos os relatórios (PDF e Excel)
- ✅ Permitir personalização por empresa (cabeçalho e rodapé dinâmicos)
- ✅ Oferecer dois padrões: com e sem marca d'água
- ✅ Garantir legibilidade e profissionalismo

---

## 📐 Especificações Técnicas

### Dimensões do Documento
- **Formato padrão**: A4 (210mm x 297mm / 8.27" x 11.69")
- **Orientação**: Retrato (Portrait)
- **Resolução**: 300 DPI para imagens

### Margens
- **Superior**: 80mm (reservado para cabeçalho)
- **Inferior**: 50mm (reservado para rodapé)
- **Esquerda**: 20mm
- **Direita**: 20mm
- **Área útil de conteúdo**: 170mm x 167mm

### Logo da Empresa
- **Dimensões**: 297px (largura) x 217px (altura)
- **Proporção**: ~1.37:1 (aproximadamente 4:3)
- **Formato suportado**: PNG, JPG, SVG (convertido para PNG)
- **Resolução mínima**: 300 DPI
- **Posicionamento**: Canto superior esquerdo do cabeçalho
- **Espaçamento**: 10mm da borda esquerda e superior

---

## 🏗️ Estrutura do Layout

```
┌─────────────────────────────────────────────────┐
│  CABEÇALHO (80mm altura)                        │
│  ┌──────────┐  [Gradiente]                      │
│  │   LOGO   │  [Informações da Empresa]         │
│  │ 297x217  │  [Título do Relatório]            │
│  └──────────┘                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ÁREA DE CONTEÚDO (167mm altura)                │
│  [Conteúdo específico do relatório]             │
│  [Tabelas, gráficos, dados]                     │
│                                                 │
│  [Marca d'água - apenas em documentos          │
│   importantes/contratos]                        │
│                                                 │
├─────────────────────────────────────────────────┤
│  RODAPÉ (50mm altura)                           │
│  [Informações da empresa]                       │
│  [CNPJ, endereço, contato]                      │
│  [Gradiente inferior]                           │
│  [Número da página]                             │
└─────────────────────────────────────────────────┘
```

---

## 📊 Cabeçalho

### Dimensões e Posicionamento
- **Altura total**: 80mm
- **Largura**: 100% da página (170mm útil)

### Estrutura do Cabeçalho

#### 1. Logo da Empresa
- **Posição**: Canto superior esquerdo
- **Coordenadas**: X: 10mm, Y: 10mm (a partir do topo)
- **Tamanho**: 297px x 217px (convertido para mm: ~78mm x 57mm)
- **Alinhamento**: Esquerda
- **Espaçamento direito**: 15mm

#### 2. Banda de Gradiente Superior
- **Posição**: Topo da página
- **Altura**: 5-7mm
- **Cores**: Gradiente horizontal
  - **Início (esquerda)**: Amarelo (#FFD700 / RGB: 255, 215, 0)
  - **Meio**: Laranja (#FF8C00 / RGB: 255, 140, 0)
  - **Fim (direita)**: Vermelho (#FF4500 / RGB: 255, 69, 0)
- **Transparência**: 100% opaco

#### 3. Forma Escura (Topo Esquerdo)
- **Posição**: Sobrepondo parcialmente o gradiente superior esquerdo
- **Cor**: Preto (#000000) ou Cinza Escuro (#1a1a1a)
- **Forma**: Curva orgânica côncava
- **Propósito**: Elemento de design para separação visual
- **Transparência**: 100% opaco

#### 4. Informações da Empresa
- **Posição**: À direita do logo
- **Alinhamento**: Esquerda
- **Fonte**: 
  - **Nome**: 16pt, Negrito, Cor: #333333
  - **CNPJ/Info**: 10pt, Regular, Cor: #666666
- **Espaçamento**: 15mm da logo

**Exemplo de Layout:**
```
[LOGO]  NOME DA EMPRESA LTDA
        CNPJ: 00.000.000/0001-00
        Endereço: Rua Exemplo, 123
        Telefone: (11) 99999-9999
```

#### 5. Título do Relatório
- **Posição**: Centralizado abaixo das informações da empresa
- **Fonte**: 18pt, Negrito, Cor: #333333
- **Espaçamento superior**: 10mm
- **Espaçamento inferior**: 5mm

---

## 📌 Rodapé

### Dimensões e Posicionamento
- **Altura total**: 50mm
- **Largura**: 100% da página (170mm útil)
- **Posição**: Fixo na parte inferior

### Estrutura do Rodapé

#### 1. Banda de Gradiente Inferior
- **Posição**: Base da página
- **Altura**: 1-2mm (linha fina)
- **Cores**: Gradiente horizontal (mesmo do cabeçalho)
  - **Início (esquerda)**: Amarelo (#FFD700)
  - **Meio**: Laranja (#FF8C00)
  - **Fim (direita)**: Vermelho (#FF4500)

#### 2. Informações da Empresa
- **Posição**: Acima do gradiente
- **Alinhamento**: Centralizado
- **Fonte**: 8pt, Regular, Cor: #666666
- **Conteúdo**:
  - Nome da empresa
  - CNPJ
  - Endereço completo
  - Telefone e Email
  - Website (se disponível)

#### 3. Número da Página
- **Posição**: Canto inferior direito
- **Formato**: "Página X de Y"
- **Fonte**: 8pt, Regular, Cor: #999999
- **Espaçamento**: 5mm da borda direita e inferior

**Exemplo de Layout:**
```
─────────────────────────────────────────────
  Nome da Empresa LTDA | CNPJ: 00.000.000/0001-00
  Rua Exemplo, 123 - Centro - São Paulo/SP - CEP: 01234-567
  Tel: (11) 99999-9999 | Email: contato@empresa.com.br
  www.empresa.com.br                    Página 1 de 3
═════════════════════════════════════════════
```

---

## 💧 Marca d'Água

### Quando Usar
- ✅ **COM marca d'água**: Contratos, documentos legais, ordens de serviço, documentos oficiais
- ❌ **SEM marca d'água**: Relatórios operacionais (estoque, vendas, financeiro, atividades)

### Especificações da Marca d'Água

#### Padrão Visual
- **Formas abstratas**: Duas formas grandes e suaves
  - **Forma 1 (Amarelo Pálido)**: 
    - Cor: #FFF9C4 (amarelo muito claro)
    - Posição: Lado esquerdo do centro
    - Forma: Estilizada (similar a "p" ou "r")
    - Transparência: 15-20%
  
  - **Forma 2 (Rosa Pálido)**:
    - Cor: #F8BBD0 (rosa muito claro)
    - Posição: Lado direito do centro, ligeiramente acima
    - Forma: Crescente ou "bowl" de "p"
    - Transparência: 15-20%

#### Posicionamento
- **Centralizado**: Vertical e horizontalmente na área de conteúdo
- **Tamanho**: Ocupa aproximadamente 60-70% da área de conteúdo
- **Rotação**: Opcional, leve rotação (-5° a +5°) para evitar sobreposição com texto

#### Implementação Técnica
- **Camada**: Background (atrás do conteúdo)
- **Z-index**: Mais baixo que o conteúdo
- **Interação**: Não deve interferir na legibilidade

---

## 📝 Área de Conteúdo

### Dimensões
- **Largura útil**: 170mm (após margens laterais)
- **Altura útil**: 167mm (após cabeçalho e rodapé)
- **Margem interna**: 5mm de todos os lados

### Regras de Conteúdo
1. **Tabelas**:
   - Largura máxima: 100% da área útil
   - Cabeçalhos: Fundo cinza claro (#F5F5F5), texto negrito
   - Bordas: 0.5pt, cor #CCCCCC
   - Espaçamento entre células: 2mm

2. **Títulos de Seção**:
   - Fonte: 14pt, Negrito, Cor: #333333
   - Espaçamento superior: 10mm
   - Espaçamento inferior: 5mm

3. **Texto Corpo**:
   - Fonte: 10pt, Regular, Cor: #333333
   - Espaçamento entre linhas: 1.2

4. **Gráficos**:
   - Largura máxima: 100% da área útil
   - Altura: Proporcional, máximo 80mm
   - Resolução: 300 DPI

---

## 🎨 Cores e Tipografia

### Paleta de Cores

#### Cores Principais
- **Amarelo**: #FFD700 (RGB: 255, 215, 0)
- **Laranja**: #FF8C00 (RGB: 255, 140, 0)
- **Vermelho**: #FF4500 (RGB: 255, 69, 0)

#### Cores de Texto
- **Título Principal**: #333333 (Cinza Escuro)
- **Texto Corpo**: #333333 (Cinza Escuro)
- **Texto Secundário**: #666666 (Cinza Médio)
- **Texto Terciário**: #999999 (Cinza Claro)

#### Cores de Fundo
- **Fundo Principal**: #FFFFFF (Branco)
- **Cabeçalho de Tabela**: #F5F5F5 (Cinza Muito Claro)
- **Linhas/Bordas**: #CCCCCC (Cinza Claro)

### Tipografia

#### Fontes Recomendadas
- **Primária**: Helvetica / Arial (sans-serif)
- **Secundária**: Times New Roman (serif) - apenas para documentos formais
- **Monospace**: Courier New - apenas para códigos

#### Tamanhos de Fonte
- **Título Principal**: 18pt
- **Título de Seção**: 14pt
- **Subtítulo**: 12pt
- **Texto Corpo**: 10pt
- **Texto Pequeno**: 8pt
- **Rodapé**: 8pt

#### Pesos de Fonte
- **Negrito**: Títulos, cabeçalhos de tabela, destaques
- **Regular**: Texto corpo, dados
- **Itálico**: Citações, notas

---

## 📋 Padrões de Uso

### Padrão 1: COM Marca d'Água
**Uso**: Documentos importantes, contratos, ordens de serviço

**Características**:
- ✅ Logo da empresa no cabeçalho
- ✅ Gradiente superior e inferior
- ✅ Marca d'água centralizada
- ✅ Informações completas no rodapé
- ✅ Numeração de páginas

**Módulos que usam**:
- Comercial (contratos)
- Ordens de Serviço
- Documentos Legais
- Certificados

### Padrão 2: SEM Marca d'Água
**Uso**: Relatórios operacionais, análises, dados

**Características**:
- ✅ Logo da empresa no cabeçalho
- ✅ Gradiente superior e inferior
- ❌ Sem marca d'água
- ✅ Informações completas no rodapé
- ✅ Numeração de páginas

**Módulos que usam**:
- Financeiro (relatórios)
- Estoque
- Vendas
- Atividades
- Operacional (relatórios)

---

## 🔧 Exemplos de Implementação

### Estrutura de Dados Necessária

```java
public class ReportLayoutConfig {
    private Company company;              // Empresa selecionada
    private String reportTitle;            // Título do relatório
    private boolean withWatermark;         // Com ou sem marca d'água
    private ReportType reportType;         // Tipo de relatório
    private Map<String, Object> metadata;  // Metadados adicionais
}
```

### Informações da Empresa (do Banco de Dados)

```java
public class Company {
    private String name;           // Nome da empresa
    private String cnpj;           // CNPJ
    private String logoUrl;        // URL/caminho da logo
    private String address;        // Endereço completo
    private String phone;          // Telefone
    private String email;          // Email
    private String website;        // Website
    // ... outros campos
}
```

---

## 📊 Checklist de Implementação

### Para cada relatório, verificar:
- [ ] Logo da empresa carregada corretamente (297x217px)
- [ ] Cabeçalho com gradiente superior
- [ ] Informações da empresa no cabeçalho
- [ ] Título do relatório centralizado
- [ ] Área de conteúdo respeitando margens
- [ ] Marca d'água (se aplicável)
- [ ] Rodapé com informações da empresa
- [ ] Gradiente inferior
- [ ] Numeração de páginas
- [ ] Cores e fontes conforme padrão

---

## 🔄 Versionamento

- **Versão**: 1.0
- **Data**: 2026-01-09
- **Autor**: Equipe Secured Guard
- **Status**: Proposta para Aprovação

---

## 📝 Notas Finais

Este padrão deve ser aplicado a **TODOS** os relatórios do sistema, garantindo:
- Consistência visual
- Profissionalismo
- Identidade da empresa
- Legibilidade
- Facilidade de manutenção

Qualquer alteração neste padrão deve ser documentada e aprovada pela equipe.
