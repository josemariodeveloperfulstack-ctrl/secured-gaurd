# Plano de Implementação: Esteira de Prospecção de Leads (Google Places, Apify e Apollo.io)

## 🎯 Objetivo
Transformar a tela de **Prospecção Comercial de Leads** em uma esteira de busca e enriquecimento de alta eficiência e dados reais, integrando:
1. **Google Places API**: Busca oficial de estabelecimentos e locais com dados cadastrais e de contato (endereço, telefone, site e link no Google Maps).
2. **Apify (Google Maps Scraper)**: Raspagem eficiente e em lote no Google Maps via Actor do Apify para descoberta de estabelecimentos por nicho/região.
3. **Apollo.io**: Enriquecimento B2B de tomadores de decisão (sócios, diretores, e-mails corporativos verificados e LinkedIn).
4. **Gemini AI**: Inteligência de qualificação e fallback quando chaves externas não estiverem ativas.
5. **Higienização Inteligente de CNAE**: Conversão automática de códigos e descrições burocráticas (ex: `4683-4/00`) em termos comerciais pesquisáveis no Maps (ex: `defensivos agrícolas adubos`).

---

## 🏗️ Tarefas de Implementação

### Fase 1: Backend - Modelos de Integração e DTOs
- [ ] Atualizar `ProspectionController.java` e `GeminiProspectionService.java` para suportar `apifyApiToken` e `apolloApiKey`.
- [ ] Implementar o higienizador de termos de busca (`QuerySanitizer`): extrai termos-chave de CNAE e palavras-chave para o Maps.

### Fase 2: Backend - Clientes de Prospecção e Enriquecimento
- [ ] Implementar cliente do **Google Places API** (Text Search + Place Details para telefone, site e Maps URL).
- [ ] Implementar cliente do **Apify API** (Google Maps Scraper via Actor para extração completa de empresas por localidade).
- [ ] Implementar cliente do **Apollo.io** (Enriquecimento de tomadores de decisão e contatos diretos a partir do domínio/nome da empresa).
- [ ] Integrar a **Pipeline em Camadas**: Busca (Google Places / Apify) -> Enriquecimento (Apollo) -> Qualificação/Fallback (Gemini).

### Fase 3: Frontend - Interface e Modal de Chaves
- [ ] Expandir o modal "Chaves & IA" em `Prospeccao.tsx` para incluir campos de **Apify API Token** e **Apollo.io API Key**, com badges de status de configuração.
- [ ] Atualizar `prospectionService.ts` com as novas credenciais e fluxos de chamada.

### Fase 4: Verificação e Testes
- [ ] Compilar backend e frontend sem erros.
- [ ] Testar busca com termo simulado e com fallback inteligente.
