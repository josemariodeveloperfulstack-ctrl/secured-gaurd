# Módulo de Campanhas de Email Marketing

## Goal
Implementar um módulo completo de campanhas de email marketing com editor visual, importação de CSV/Excel, disparo em lote, e rastreamento de aberturas e cancelamentos de assinatura.

## Tasks
- [ ] Task 1: **Criar Migrations (Flyway)**: Adicionar tabelas `marketing_campaigns`, `marketing_leads`, e `marketing_events` (para registrar aberturas e cancelamentos). → Verify: Rodar o projeto e confirmar que as tabelas foram criadas.
- [ ] Task 2: **Backend - Entidades e Repositórios**: Mapear as 3 novas tabelas com JPA/Hibernate no Spring Boot. → Verify: Build da aplicação sem falhas.
- [ ] Task 3: **Backend - Importação CSV/Excel**: Criar serviço usando Apache POI/commons-csv para parsear e salvar leads recebidos (`POST /api/marketing/leads/import`). → Verify: Fazer upload de um CSV teste via Swagger e verificar se os leads salvam no DB.
- [ ] Task 4: **Backend - Endpoints Públicos de Tracking**: Criar `GET /api/marketing/track` (retorna imagem 1x1 base64 transparente e salva o evento `OPEN`) e `GET /api/marketing/unsubscribe`. Permitir acesso no Spring Security. → Verify: Acessar a rota de track no browser e verificar no log do backend.
- [ ] Task 5: **Backend - Disparo de Emails**: Implementar `EmailCampaignService` para enviar emails em background (usando `@Async`). Injetar automaticamente o pixel de rastreamento no HTML da campanha antes do envio. → Verify: Fazer um disparo teste e checar recebimento na caixa de entrada.
- [ ] Task 6: **Frontend - Editor Visual**: Criar tela de "Nova Campanha" instalando a biblioteca `react-email-editor` (Unlayer) para permitir montagem de blocos arrastáveis (drag-and-drop) incluindo botões do WhatsApp e Site. → Verify: Criar template visualmente, gerar HTML e JSON e salvar na API.
- [ ] Task 7: **Frontend - Dashboard e Upload**: Criar telas de listagem de campanhas (mostrando métricas de aberturas), e componente de upload de arquivo Excel/CSV. → Verify: Importar lista na UI, ver contagem de leads, disparar campanha e checar métricas atualizando.

## Done When
- [ ] O sistema permite importar contatos via Excel.
- [ ] O usuário consegue usar o editor visual para desenhar um email bonito e responsivo com botões de WhatsApp e Site.
- [ ] O sistema dispara o email em segundo plano e monitora quantas pessoas abriram (pixel tracking).
- [ ] O destinatário consegue clicar no botão "Cancelar Inscrição" no rodapé e não recebe mais envios.
