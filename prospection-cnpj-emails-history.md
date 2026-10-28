# Plano: Busca Automática de CNPJ, E-mails de Sócios/Decisores/Compras e Histórico no Banco de Dados

## Objetivo
Implementar a automação completa na prospecção de empresas para:
1. Localizar o CNPJ oficial e dados cadastrais automaticamente.
2. Identificar e extrair e-mails e contatos específicos de:
   - Sócios e Administradores (QSA);
   - Decisores executivos (Diretores, CEOs, Gerentes Gerais);
   - Setor de Compras / Suprimentos / Procurement (ex: `compras@`, `suprimentos@`).
3. Gravar e persistir todo o histórico de pesquisas e contatos no banco de dados (`PostgreSQL`), permitindo consultar buscas anteriores em uma aba "Histórico" na interface web e promover prospectos para o CRM com 1 clique.

---

## Fases de Execução

### Fase 1: Banco de Dados e Modelagem (Flyway)
- Criar a migração `V1097__create_prospection_searches_and_contacts.sql`:
  - `prospection_searches`: Registro das buscas realizadas (data, usuário, tipo, filtros, cidade, UF).
  - `prospection_companies`: Empresas encontradas na busca (CNPJ, Razão Social, Fantasia, e-mail geral, e-mail de compras, telefone, payload JSON).
  - `prospection_contacts`: Contatos específicos de cada empresa (sócios, decisores, compradores, e-mails, cargos e LinkedIn).
- Criar as entidades JPA correspondentes:
  - `ProspectionSearch.java`
  - `ProspectionCompany.java`
  - `ProspectionContact.java`
- Criar repositórios Spring Data JPA:
  - `ProspectionSearchRepository.java`
  - `ProspectionCompanyRepository.java`

### Fase 2: Backend - Automação de Enriquecimento (Sócios, Decisores, Compras)
- Atualizar `CnpjLookupService.java` e `GeminiProspectionService.java`:
  - Integrar raspagem/inferência de e-mails de compras (`compras@`, `suprimentos@`, `contato@`).
  - Enriquecer sócios do QSA com busca de e-mails corporativos via IA Gemini e Apollo.
- Criar `ProspectionHistoryService.java`:
  - `saveSearch(searchDto, results)`: Persiste a pesquisa e seus resultados de forma transacional.
  - `listRecentSearches(pageable)`: Lista histórico paginado com contadores.
  - `getSearchDetails(searchId)`: Retorna os dados completos salvos daquela pesquisa sem custo de nova consulta.
- Atualizar `ProspectionController.java`:
  - `GET /api/prospection/history`: Retorna buscas anteriores gravadas.
  - `GET /api/prospection/history/{id}`: Retorna prospectos e contatos de uma pesquisa gravada.
  - `POST /api/prospection/auto-enrich`: Executa a busca automática de CNPJ + e-mails de decisores/compras.

### Fase 3: Frontend - Interface de Prospecção e Histórico
- Atualizar `prospectionService.ts`:
  - Tipagens para contatos de decisores, sócios e compras.
  - Métodos para consultar histórico de pesquisas (`getHistory`, `getHistoryDetails`).
- Atualizar `Prospeccao.tsx`:
  - Adicionar aba **"Histórico de Buscas"** com tabela de pesquisas anteriores (data, termo, cidade, quantidade, status).
  - Botão para recarregar qualquer busca anterior instantaneamente no grid.
  - Nos cards e no modal de detalhes do prospecto, exibir seções destacadas:
    - 👔 **Sócios e Administradores (QSA)** com e-mail e qualificações.
    - 🎯 **Decisores & Diretoria** com e-mail e cargo.
    - 🛒 **Setor de Compras / Suprimentos** com e-mail direto de cotações/compras.
    - Indicador de status de enriquecimento automático.

### Fase 4: Testes e Validação
- Compilar backend com `./mvnw compile`.
- Executar testes unitários e de integração de prospecção.
- Construir frontend com `npm run build`.
- Validar persistência no banco e fluxo ponta a ponta.
