# Template de Fundo para Relatórios

Este diretório contém os templates de fundo usados nos relatórios PDF do sistema.

## Arquivos

| Uso        | Nome do arquivo                    | Observação                          |
|-----------|-------------------------------------|-------------------------------------|
| Retrato   | `report-background-template.png`    | Páginas em orientação retrato (A4). |
| Paisagem  | `report-background-landscape.png`   | Template correto em paisagem (sem distorção). |

**Localização:** `backend/src/main/resources/templates/reports/`

## Template PAISAGEM (layout correto — use a segunda imagem)

O layout correto em paisagem é o **template em branco** (segunda imagem de referência):

- **Cabeçalho:** forma cinza escura/preta no canto superior esquerdo (trapézio, borda curva inferior direita) + faixa horizontal laranja→vermelho no topo.
- **Centro:** fundo branco (área de conteúdo).
- **Rodapé:** só a faixa fina laranja→vermelho; **não** coloque texto no PNG.

O sistema desenha em cima: **logo** na forma escura, **título** e **bloco da empresa** no rodapé. Com esse PNG, tudo se ajusta sem distorção.

**Como ativar:** salve essa imagem como `report-background-landscape.png` neste diretório e reinicie o backend.

---

## Especificações do Template (retrato)

O template de fundo em retrato pode conter:

1. **Gradiente horizontal no topo** (amarelo → laranja → vermelho)
2. **Forma curva escura** no canto superior esquerdo
3. **Marca d'água translúcida** (formas abstratas tipo "p") no centro da página
4. **Linha gradiente fina** na parte inferior (amarelo → laranja → vermelho)
5. **Fundo branco** para o conteúdo do relatório

## Dimensões

- **Formato:** PNG com transparência
- **Resolução:** Recomendado 300 DPI para qualidade de impressão
- **Tamanho:** A4 (210mm × 297mm ou 595pt × 842pt)

## Elementos Dinâmicos Adicionados Sobre o Template

O sistema adiciona automaticamente sobre o template:

- **Logo da empresa** (297x217px) no canto superior esquerdo
- **Título do relatório** (centralizado no topo)
- **Nome da empresa e CNPJ** (no cabeçalho)
- **Tabela de dados** (no corpo do relatório)
- **Informações do rodapé** (endereço, telefone, email, CNPJ)
- **Data de geração** (no rodapé)

## Como Adicionar os Templates

1. **Retrato:** salve a imagem como `report-background-template.png` e coloque neste diretório.
2. **Paisagem:** use **só** o template em branco (segunda imagem): forma escura no canto + faixa laranja→vermelho no topo + fundo branco + faixa fina no rodapé. Salve como `report-background-landscape.png` neste diretório. O sistema sobrepõe o logo e o texto do rodapé. Esse é o layout correto, sem distorção.
3. Reinicie a aplicação para que os templates sejam carregados.

## Fallback

Se o template não for encontrado, o sistema usará um fallback programático para desenhar os elementos básicos (gradiente e forma curva), mas a marca d'água não será exibida.
