package com.z7design.secured_guard.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.z7design.secured_guard.security.JwtAuthenticationFilter;
import com.z7design.secured_guard.service.CustomUserDetailsService;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

        private final CustomUserDetailsService customUserDetailsService;
        @Lazy
        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        public SecurityConfig(CustomUserDetailsService customUserDetailsService,
                        @Lazy JwtAuthenticationFilter jwtAuthenticationFilter) {
                this.customUserDetailsService = customUserDetailsService;
                this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        }

        @Bean
        public UserDetailsService userDetailsService() {
                return customUserDetailsService;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .headers(headers -> headers
                                                .frameOptions(frame -> frame.disable())
                                                .contentTypeOptions(contentType -> {
                                                }))
                                .authorizeHttpRequests(auth -> auth
                                                 // Permitir todos os pre-flights OPTIONS para evitar loops e erros de CORS
                                                 .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                                                 // Aliases fora de /api/users/** e /api/v1/** (evita ERR_TOO_MANY_REDIRECTS em alguns proxies)
                                                 .requestMatchers("/api/session/current-role").authenticated()
                                                 .requestMatchers("/api/messages/unread/count").authenticated()
                                                 // Endpoints públicos
                                                 .requestMatchers("/api/auth/**").permitAll()
                                                .requestMatchers("/api/security-settings/**").hasAuthority("ROLE_SUPER_ADMIN")
                                                .requestMatchers("/api/backup/**").hasAuthority("ROLE_SUPER_ADMIN")
                                                .requestMatchers("/api/files/**").permitAll()
                                                .requestMatchers("/api/test/**").permitAll()
                                                .requestMatchers("/api/health").permitAll()
                                                .requestMatchers("/api/webhooks/sendgrid/**").permitAll()
                                                 .requestMatchers("/api/public/**").permitAll()
                                                 .requestMatchers("/api/diagnostic/**").permitAll()
                                                 .requestMatchers("/api/debug/**").permitAll()
                                                 .requestMatchers("/api/users/public/**").permitAll()
                                                // WebSocket endpoints - permitir todos os transportes do SockJS (info,
                                                // websocket, xhr, eventsource, htmlfile, jsonp, iframe)
                                                // O SockJS faz requisições HTTP iniciais que não incluem o token JWT
                                                // A autenticação real acontece quando a conexão STOMP é estabelecida
                                                // (via
                                                // WebSocketSecurityConfig)
                                                // IMPORTANTE: Permitir todos os padrões do SockJS, mas a conexão STOMP
                                                // será
                                                // autenticada no WebSocketSecurityConfig
                                                // NOTA: Padrões com ** devem ser os últimos elementos, então usamos um
                                                // RequestMatcher customizado
                                                .requestMatchers("/ws/info").permitAll()
                                                .requestMatchers("/ws/iframe.html").permitAll()
                                                // Permitir todos os transportes do SockJS usando um RequestMatcher
                                                // customizado
                                                // O SockJS usa URLs como: /ws/{server-id}/{session-id}/websocket,
                                                // /ws/{server-id}/{session-id}/xhr, etc.
                                                .requestMatchers(new RequestMatcher() {
                                                        @Override
                                                        public boolean matches(HttpServletRequest request) {
                                                                String path = request.getRequestURI();
                                                                if (path.startsWith("/ws/") && path.length() > 4) {
                                                                        String subPath = path.substring(4); // Remove
                                                                                                            // "/ws/"
                                                                        return subPath.contains("/websocket") ||
                                                                                        subPath.contains("/xhr") ||
                                                                                        subPath.contains("/eventsource")
                                                                                        ||
                                                                                        subPath.contains("/htmlfile") ||
                                                                                        subPath.contains("/jsonp");
                                                                }
                                                                return false;
                                                        }
                                                }).permitAll()
                                                .requestMatchers("/ws/**").authenticated()
                                                .requestMatchers("/ws").authenticated()
                                                .requestMatchers("/api/email/test", "/api/email/config").hasAuthority("ROLE_SUPER_ADMIN")
                                                // WhatsApp controller - restrito a SUPER_ADMIN
                                                .requestMatchers("/api/whatsapp/**").hasAuthority("ROLE_SUPER_ADMIN")
                                                .requestMatchers("/api/payslips/test-download/**").permitAll()
                                                .requestMatchers("/api/invoices/public/test-cost-centers").permitAll()
                                                .requestMatchers("/api/invoices/public/debug-cost-centers").permitAll()
                                                .requestMatchers("/api/invoices/cost-centers").permitAll()
                                                .requestMatchers("/api/accounts-receivable/public/test").permitAll()
                                                .requestMatchers("/error").permitAll()
                                                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**",
                                                                "/swagger-ui.html")
                                                .permitAll()
                                                .requestMatchers("/api/v1/document-processing/**").authenticated()
                                                // Arquivos públicos (imagens e uploads)
                                                .requestMatchers("/uploads/**").permitAll()
                                                // Logos de empresas - permitir acesso público (para exibição em
                                                // relatórios)
                                                .requestMatchers("/api/uploads/companies/logos/**").permitAll()
                                                .requestMatchers("/api/uploads/**").authenticated() // Outros arquivos
                                                                                                    // do chat requerem
                                                                                                    // autenticação
                                                .requestMatchers("/files/**").permitAll()
                                                // Endpoints HR - requerem permissões específicas
                                                .requestMatchers("/api/hr/**")
                                                .hasAnyAuthority("EMPLOYEES_READ", "EMPLOYEES_WRITE",
                                                                "EMPLOYEES_CREATE", "EMPLOYEES_DELETE",
                                                                "SUPER_ADMIN", "ADMIN", "HR", "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN", "ROLE_HR", "ROLE_RH",
                                                                "DEPARTAMENTO_PESSOAL", "ROLE_DEPARTAMENTO_PESSOAL")
                                                // Endpoints SST - requerem permissões específicas
                                                .requestMatchers("/api/sst/**")
                                                .hasAnyAuthority("EMPLOYEES_READ", "EMPLOYEES_WRITE",
                                                                "EMPLOYEES_CREATE", "EMPLOYEES_DELETE",
                                                                "SUPER_ADMIN", "ADMIN", "HR", "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN", "ROLE_HR", "ROLE_RH",
                                                                "DEPARTAMENTO_PESSOAL", "ROLE_DEPARTAMENTO_PESSOAL")
                                                // Endpoints de usuários - permitir leitura para usuários autenticados
                                                // (para
                                                // chat), escrita requer permissões específicas
                                                // IMPORTANTE: Regras específicas devem vir ANTES das genéricas
                                                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users")
                                                .authenticated()
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/users/{id}")
                                                .authenticated()
                                                .requestMatchers(org.springframework.http.HttpMethod.POST,
                                                                "/api/users/**")
                                                .hasAnyAuthority("USERS_CREATE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                                                .requestMatchers(org.springframework.http.HttpMethod.PUT,
                                                                "/api/users/**")
                                                .hasAnyAuthority("USERS_WRITE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                                                .requestMatchers(org.springframework.http.HttpMethod.DELETE,
                                                                "/api/users/**")
                                                .hasAnyAuthority("USERS_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                                                .requestMatchers("/api/users/me/current-role").authenticated()
                                                .requestMatchers("/api/users/**")
                                                .hasAnyAuthority("USERS_READ", "USERS_WRITE", "USERS_CREATE",
                                                                "USERS_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                                                // Endpoints de grupos - permitir consulta de próprios grupos para
                                                // usuários
                                                // autenticados
                                                .requestMatchers("/api/groups/user/**").authenticated()
                                                // Endpoints de grupos - operações administrativas requerem permissões
                                                // específicas
                                                .requestMatchers("/api/groups/**")
                                                .hasAnyAuthority("GROUPS_READ", "GROUPS_WRITE", "GROUPS_CREATE",
                                                                "GROUPS_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "RH",
                                                                "DEPARTAMENTO_PESSOAL", "ROLE_RH",
                                                                "ROLE_DEPARTAMENTO_PESSOAL")
                                                // Endpoints de equipamentos e EPIs - requerem permissões
                                                // administrativas ou
                                                // operacionais
                                                .requestMatchers("/api/equipments/**")
                                                .hasAnyAuthority("EQUIPMENTS_READ", "EQUIPMENTS_WRITE",
                                                                "EQUIPMENTS_CREATE",
                                                                "EQUIPMENTS_DELETE", "EQUIPMENTS_ASSIGN", "SUPER_ADMIN",
                                                                "ADMIN", "GESTOR",
                                                                "SUPERVISOR", "OPERACIONAL", "GESTOR_OPERACIONAL", "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN", "ROLE_GESTOR",
                                                                "ROLE_SUPERVISOR", "ROLE_OPERACIONAL", "ROLE_GESTOR_OPERACIONAL")
                                                .requestMatchers("/api/epis/**")
                                                .hasAnyAuthority("EQUIPMENTS_READ", "EQUIPMENTS_WRITE",
                                                                "EQUIPMENTS_CREATE",
                                                                "EQUIPMENTS_DELETE", "EQUIPMENTS_ASSIGN", "SUPER_ADMIN",
                                                                "ADMIN", "GESTOR",
                                                                "SUPERVISOR", "OPERACIONAL", "GESTOR_OPERACIONAL", "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN", "ROLE_GESTOR",
                                                                "ROLE_SUPERVISOR", "ROLE_OPERACIONAL", "ROLE_GESTOR_OPERACIONAL")
                                                .requestMatchers("/api/epi-control/**")
                                                .hasAnyAuthority("EQUIPMENTS_READ", "EQUIPMENTS_WRITE",
                                                                "EQUIPMENTS_CREATE",
                                                                "EQUIPMENTS_DELETE", "EQUIPMENTS_ASSIGN", "SUPER_ADMIN",
                                                                "ADMIN", "GESTOR",
                                                                "SUPERVISOR", "OPERACIONAL", "GESTOR_OPERACIONAL", "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN", "ROLE_GESTOR",
                                                                "ROLE_SUPERVISOR", "ROLE_OPERACIONAL", "ROLE_GESTOR_OPERACIONAL")
                                                // Endpoints da frota - requerem permissões operacionais
                                                .requestMatchers("/api/frota/**")
                                                .hasAnyAuthority("OPERACIONAL", "GESTOR_OPERACIONAL", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_OPERACIONAL", "ROLE_GESTOR_OPERACIONAL",
                                                                "ROLE_GESTOR", "ROLE_SUPERVISOR")
                                                // Endpoints de fuel-records
                                                .requestMatchers("/api/fuel-records/**")
                                                .hasAnyAuthority("OPERACIONAL", "GESTOR_OPERACIONAL", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_OPERACIONAL", "ROLE_GESTOR_OPERACIONAL",
                                                                "ROLE_GESTOR", "ROLE_SUPERVISOR")
                                                // Endpoints de veículos
                                                .requestMatchers("/api/vehicles/**")
                                                .hasAnyAuthority("OPERACIONAL", "GESTOR_OPERACIONAL", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_OPERACIONAL", "ROLE_GESTOR_OPERACIONAL",
                                                                "ROLE_GESTOR", "ROLE_SUPERVISOR")
                                                // Endpoints de work-posts
                                                .requestMatchers("/api/work-posts/**")
                                                .hasAnyAuthority("OPERACIONAL", "GESTOR_OPERACIONAL", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_OPERACIONAL", "ROLE_GESTOR_OPERACIONAL",
                                                                "ROLE_GESTOR", "ROLE_SUPERVISOR",
                                                                "DEPARTAMENTO_PESSOAL", "ROLE_DEPARTAMENTO_PESSOAL",
                                                                "ROLE_RH")
                                                // Endpoints de solicitações de admissão/demissão
                                                .requestMatchers("/api/admission-requests/**")
                                                .hasAnyAuthority("RH", "DEPARTAMENTO_PESSOAL", "SUPER_ADMIN", "ADMIN",
                                                                "ROLE_RH", "ROLE_DEPARTAMENTO_PESSOAL",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                                                // Endpoints de guias de transporte - requerem autenticação
                                                .requestMatchers("/api/transport-guides/**").authenticated()
                                                // Endpoints de reconhecimento facial - requerem apenas autenticação
                                                .requestMatchers("/api/facial-recognition/recognize").authenticated()
                                                .requestMatchers("/api/facial-recognition/test").permitAll()
                                                .requestMatchers("/api/facial-recognition/**")
                                                .hasAnyAuthority("SUPER_ADMIN", "ADMIN", "HR_READ", "HR_WRITE",
                                                                "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN")
                                                // Endpoints de autenticação de supervisores - públicos para login
                                                .requestMatchers("/api/supervisor-auth/**").permitAll()
                                                // Endpoints de supervisores - requerem permissões administrativas
                                                .requestMatchers("/api/supervisors/**")
                                                .hasAnyAuthority("SUPER_ADMIN", "ADMIN", "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN")
                                                // Endpoints de consentimento LGPD - públicos para verificação e
                                                // aceitação
                                                .requestMatchers("/api/first-access/**").authenticated()
                                                .requestMatchers("/api/user-terms-consent/check/**").permitAll()
                                                .requestMatchers("/api/user-terms-consent/accept").permitAll()
                                                .requestMatchers("/api/user-terms-consent/versions").permitAll()
                                                .requestMatchers("/api/user-terms-consent/**")
                                                .hasAnyAuthority("SUPER_ADMIN", "ADMIN", "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN")
                                                // Endpoints de contratos - requerem permissões específicas (Comercial
                                                // também
                                                // precisa ver contratos)
                                                .requestMatchers("/api/contracts/**")
                                                .hasAnyAuthority("CONTRACTS_READ", "CONTRACTS_WRITE",
                                                                "CONTRACTS_CREATE", "CONTRACTS_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR",
                                                                "ROLE_COMERCIAL", "ROLE_GESTOR_COMERCIAL")
                                                // Endpoints de estoque - requerem permissões específicas ou
                                                // autenticação
                                                .requestMatchers("/api/stock/**")
                                                .hasAnyAuthority("EQUIPMENTS_READ", "EQUIPMENTS_WRITE",
                                                                "EQUIPMENTS_CREATE",
                                                                "EQUIPMENTS_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_STOCK_MANAGER",
                                                                "ROLE_OPERATIONAL_MANAGER",
                                                                "ROLE_FINANCEIRO",
                                                                "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_OPERATIONAL_SUPERVISOR",
                                                                "ROLE_ANALISTA_SUPRIMENTOS",
                                                                "ROLE_ESTOQUE", "ROLE_SUPRIMENTOS", "ROLE_COMPRAS", "ROLE_ALMOXARIFADO",
                                                                "ROLE_RH", "RH", "ROLE_DEPARTAMENTO_PESSOAL", "DEPARTAMENTO_PESSOAL")
                                                // Endpoints de requisições de compras - requerem permissões financeiras
                                                // ou administrativas
                                                .requestMatchers("/api/purchase-requests", "/api/purchase-requests/**")
                                                .hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE", "FINANCIAL_DELETE",
                                                                "EQUIPMENTS_READ", "EQUIPMENTS_WRITE",
                                                                "PURCHASE_REQUESTS_READ", "PURCHASE_REQUESTS_WRITE", "PURCHASE_REQUESTS_CREATE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO", "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ASSISTENTE_ADMINISTRATIVO",
                                                                "ANALISTA_SUPRIMENTOS", "ROLE_ANALISTA_SUPRIMENTOS",
                                                                "ROLE_SUPRIMENTOS", "ROLE_COMPRAS", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO")
                                                // Endpoints de cotações de compras - requerem permissões financeiras ou
                                                // administrativas
                                                .requestMatchers("/api/purchase-quotations/**")
                                                .hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE", "FINANCIAL_DELETE",
                                                                "EQUIPMENTS_READ", "EQUIPMENTS_WRITE",
                                                                "PURCHASE_REQUESTS_READ", "PURCHASE_REQUESTS_WRITE", "PURCHASE_REQUESTS_CREATE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO", "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ASSISTENTE_ADMINISTRATIVO", "ROLE_ANALISTA_SUPRIMENTOS",
                                                                "ROLE_SUPRIMENTOS", "ROLE_COMPRAS", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO")
                                                // Endpoints de compras - requerem permissões financeiras ou de estoque
                                                .requestMatchers("/api/purchases/**")
                                                .hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE", "FINANCIAL_DELETE",
                                                                "EQUIPMENTS_READ", "EQUIPMENTS_WRITE",
                                                                "PURCHASE_REQUESTS_READ", "PURCHASE_REQUESTS_WRITE", "PURCHASE_REQUESTS_CREATE",
                                                                "PURCHASE_AGREEMENT_READ", "PURCHASE_AGREEMENT_WRITE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO", "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ASSISTENTE_ADMINISTRATIVO", "ROLE_ANALISTA_SUPRIMENTOS",
                                                                "ROLE_SUPRIMENTOS", "ROLE_COMPRAS", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO")
                                                // Endpoints de propostas e leads - requerem permissões comerciais
                                                .requestMatchers("/api/leads/**")
                                                .hasAnyAuthority("LEADS_READ", "LEADS_WRITE", "LEADS_CREATE",
                                                                "LEADS_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR",
                                                                "ROLE_COMERCIAL",
                                                                "ROLE_GESTOR_COMERCIAL", "ROLE_ASSISTENTE_COMERCIAL")
                                                // CRM, oportunidades, Kanban, dashboard comercial e metas
                                                .requestMatchers("/api/crm/**", "/api/opportunities/**",
                                                                "/api/kanban-status/**",
                                                                "/api/commercial-dashboard/**", "/api/sales-goals/**")
                                                .hasAnyRole("SUPER_ADMIN", "ADMIN", "GESTOR", "COMERCIAL",
                                                                "GESTOR_COMERCIAL", "ASSISTENTE_COMERCIAL")
                                                .requestMatchers("/api/proposals/**")
                                                .hasAnyAuthority("PROPOSALS_READ", "PROPOSALS_WRITE",
                                                                "PROPOSALS_CREATE", "PROPOSALS_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_COMERCIAL",
                                                                "ROLE_GESTOR_COMERCIAL", "ROLE_ASSISTENTE_COMERCIAL")
                                                // Campanhas de e-mail (SendGrid) — mesmo perfil comercial/admin
                                                .requestMatchers("/api/v1/email-campaigns/**")
                                                .hasAnyAuthority("LEADS_READ", "LEADS_WRITE", "LEADS_CREATE",
                                                                "LEADS_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR",
                                                                "ROLE_COMERCIAL", "ROLE_GESTOR_COMERCIAL",
                                                                "ROLE_ASSISTENTE_COMERCIAL")
                                                // Endpoints financeiros - requerem permissões específicas
                                                .requestMatchers("/api/financial/**")
                                                .hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE", "FINANCIAL_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO",
                                                                "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS")
                                                // Endpoints de invoices (contas a pagar)
                                                .requestMatchers("/api/invoices/**")
                                                .hasAnyAuthority("SUPER_ADMIN", "ADMIN", "FINANCEIRO",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO", "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS", "ROLE_SUPRIMENTOS", "SUPRIMENTOS")
                                                // Endpoints de suppliers (fornecedores) - requerem permissões
                                                // administrativas
                                                // ou financeiras
                                                .requestMatchers("/api/suppliers/**")
                                                .hasAnyAuthority("SUPER_ADMIN", "ADMIN", "FINANCEIRO",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO", "FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE",
                                                                "FINANCIAL_DELETE", "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO", "ROLE_COMPRAS")
                                                .requestMatchers("/api/patrimonial/**")
                                                .hasAnyAuthority("PATRIMONIAL_READ", "PATRIMONIAL_WRITE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                                                .requestMatchers("/api/fiscal/**")
                                                .hasAnyAuthority("FISCAL_READ", "FISCAL_WRITE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                                                // Endpoints de accounts-receivable (contas a receber) - requerem
                                                // permissões
                                                // específicas
                                                .requestMatchers("/api/accounts-receivable/**")
                                                .hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE", "FINANCIAL_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO",
                                                                "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS")
                                                // Endpoints de scheduled-payments (pagamentos agendados) - requerem
                                                // permissões
                                                // específicas
                                                .requestMatchers("/api/scheduled-payments/**")
                                                .hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE", "FINANCIAL_DELETE",
                                                                "SUPER_ADMIN", "ADMIN", "FINANCEIRO",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO", "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS", "ROLE_SUPRIMENTOS", "SUPRIMENTOS")
                                                // Endpoints de bank-reconciliation (conciliação bancária) - requerem
                                                // permissões
                                                // específicas
                                                .requestMatchers("/api/bank-reconciliation/**")
                                                .hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE", "FINANCIAL_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO",
                                                                "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS")
                                                // Endpoints de bancos e agências - requerem permissões específicas
                                                .requestMatchers("/api/banks/**")
                                                .hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE", "FINANCIAL_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO",
                                                                "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS")
                                                .requestMatchers("/api/agencies/**")
                                                .hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE",
                                                                "FINANCIAL_CREATE", "FINANCIAL_DELETE",
                                                                "SUPER_ADMIN", "ADMIN", "FINANCEIRO",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO", "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS")
                                                // Endpoints de holerites - requerem permissões específicas
                                                .requestMatchers("/api/payslips/**")
                                                .hasAnyAuthority("PAYSLIPS_READ", "PAYSLIPS_WRITE", "PAYSLIPS_CREATE",
                                                                "PAYSLIPS_DELETE",
                                                                "PAYSLIPS_PUBLISH", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_RH", "ROLE_FINANCEIRO",
                                                                "ROLE_COLABORADOR", "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS", "ROLE_SUPRIMENTOS",
                                                                "ROLE_COMPRAS", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO")
                                                // Endpoints de recibos - requerem permissões específicas
                                                .requestMatchers("/api/receipts/**")
                                                .hasAnyAuthority("PAYSLIPS_READ", "PAYSLIPS_WRITE", "PAYSLIPS_CREATE",
                                                                "PAYSLIPS_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH",
                                                                "ROLE_FINANCEIRO", "ROLE_COLABORADOR",
                                                                "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS", "ROLE_SUPRIMENTOS",
                                                                "ROLE_COMPRAS", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO")
                                                // Endpoints de documentos unificados - arquivos públicos para
                                                // download/visualização
                                                .requestMatchers("/api/unified-documents/public/**").permitAll()
                                                .requestMatchers("/api/unified-documents/download/**").permitAll()
                                                // Endpoints de documentos unificados - operações requerem permissões
                                                .requestMatchers("/api/unified-documents/**")
                                                .hasAnyAuthority("PAYSLIPS_READ", "PAYSLIPS_WRITE", "PAYSLIPS_CREATE",
                                                                "PAYSLIPS_DELETE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH",
                                                                "ROLE_FINANCEIRO", "ROLE_COLABORADOR",
                                                                "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS", "ROLE_SUPRIMENTOS",
                                                                "ROLE_COMPRAS", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO")
                                                // Endpoints de organização por setor - temporariamente público para
                                                // debug
                                                .requestMatchers("/api/sector-organization/**").permitAll()
                                                // Endpoints de relatórios - requerem permissões específicas
                                                .requestMatchers("/api/reports/**")
                                                .hasAnyAuthority("REPORTS_READ", "REPORTS_GENERATE", "REPORTS_EXPORT",
                                                                "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN", "ROLE_GESTOR", "ROLE_SUPERVISOR",
                                                                "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ROLE_ANALISTA_SUPRIMENTOS", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO")
                                                // Endpoints de chat - permitir para todos os roles principais,
                                                // incluindo
                                                // Departamento Pessoal
                                                .requestMatchers("/api/v1/chat/**").hasAnyRole(
                                                                "SUPER_ADMIN",
                                                                "ADMIN",
                                                                "SUPERVISOR",
                                                                "COLABORADOR",
                                                                "VIGILANTE",
                                                                "RH",
                                                                "DEPARTAMENTO_PESSOAL",
                                                                "FINANCEIRO",
                                                                "GESTOR",
                                                                "COMERCIAL",
                                                                "GESTOR_COMERCIAL",
                                                                "ASSISTENTE_COMERCIAL",
                                                                "ASSISTENTE_ADMINISTRATIVO",
                                                                "ANALISTA_SUPRIMENTOS",
                                                                "ESTOQUE",
                                                                "COMPRAS",
                                                                "SUPRIMENTOS", "ALMOXARIFADO")
                                                // Endpoints de mensagens - qualquer usuário autenticado pode
                                                // enviar/receber
                                                .requestMatchers("/api/v1/messages/**").authenticated()
                                                // Emails dos departamentos - Comercial precisa para página de Contratos
                                                .requestMatchers("/api/department-emails").hasAnyRole(
                                                                "SUPER_ADMIN",
                                                                "ADMIN",
                                                                "GESTOR",
                                                                "RH",
                                                                "FINANCEIRO",
                                                                "OPERACIONAL",
                                                                "COMERCIAL",
                                                                "GESTOR_COMERCIAL",
                                                                "ESTOQUE",
                                                                "COMPRAS",
                                                                "SUPRIMENTOS", "ALMOXARIFADO")
                                                // Endpoints de suporte e atendimento - requerem permissões específicas
                                                .requestMatchers("/api/v1/support/**")
                                                .hasAnyAuthority("SUPPORT_READ", "SUPPORT_WRITE", "SUPPORT_CREATE",
                                                                "SUPPORT_DELETE",
                                                                "SUPPORT_MANAGE", "ATTENDANCE_READ", "ATTENDANCE_WRITE",
                                                                "ATTENDANCE_MANAGE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH",
                                                                "ROLE_DEPARTAMENTO_PESSOAL",
                                                                "ROLE_FINANCEIRO", "ROLE_COMERCIAL",
                                                                "ROLE_GESTOR_COMERCIAL", "ROLE_ASSISTENTE_COMERCIAL",
                                                                "ROLE_SUPERVISOR",
                                                                "ROLE_ESTOQUE", "ROLE_COMPRAS", "ROLE_SUPRIMENTOS", "ROLE_ALMOXARIFADO")
                                                // Endpoints de chatbot - mesmas permissões de suporte
                                                .requestMatchers("/api/v1/support/chatbot/**")
                                                .hasAnyAuthority("SUPPORT_READ", "SUPPORT_WRITE", "SUPPORT_CREATE",
                                                                "SUPPORT_DELETE",
                                                                "SUPPORT_MANAGE", "ATTENDANCE_READ", "ATTENDANCE_WRITE",
                                                                "ATTENDANCE_MANAGE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH",
                                                                "ROLE_DEPARTAMENTO_PESSOAL",
                                                                "ROLE_FINANCEIRO", "ROLE_COMERCIAL",
                                                                "ROLE_GESTOR_COMERCIAL", "ROLE_ASSISTENTE_COMERCIAL",
                                                                "ROLE_SUPERVISOR",
                                                                "ROLE_ESTOQUE", "ROLE_COMPRAS", "ROLE_SUPRIMENTOS", "ROLE_ALMOXARIFADO")
                                                // Endpoints de departamentos - requerem permissões de RH ou admin
                                                .requestMatchers("/api/departments/**")
                                                .hasAnyAuthority("SUPER_ADMIN", "ADMIN", "RH", "DEPARTAMENTO_PESSOAL",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH",
                                                                "ROLE_DEPARTAMENTO_PESSOAL",
                                                                "EMPLOYEES_READ", "EMPLOYEES_WRITE",
                                                                "OPERACIONAL", "ROLE_OPERACIONAL", "GESTOR_OPERACIONAL", "ROLE_GESTOR_OPERACIONAL",
                                                                "FINANCEIRO", "ROLE_FINANCEIRO", "GESTOR", "ROLE_GESTOR", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO")
                                                // Endpoints de funcionários, unidades, empresas e cargos - requerem
                                                // permissões de RH, admin ou financeiro (empresas usadas em Contas a Pagar)
                                                .requestMatchers("/api/employees/**", "/api/units/**",
                                                                "/api/companies/**", "/api/positions/**",
                                                                "/api/doctors/**", "/api/work-posts/**")
                                                .hasAnyAuthority("SUPER_ADMIN", "ADMIN", "RH", "DEPARTAMENTO_PESSOAL",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH",
                                                                "ROLE_DEPARTAMENTO_PESSOAL",
                                                                "EMPLOYEES_READ", "EMPLOYEES_WRITE",
                                                                "OPERACIONAL", "ROLE_OPERACIONAL", "GESTOR_OPERACIONAL", "ROLE_GESTOR_OPERACIONAL",
                                                                "FINANCEIRO", "ROLE_FINANCEIRO", "GESTOR", "ROLE_GESTOR",
                                                                "COMERCIAL", "ROLE_COMERCIAL",
                                                                "ASSISTENTE_ADMINISTRATIVO", "ROLE_ASSISTENTE_ADMINISTRATIVO",
                                                                "ANALISTA_SUPRIMENTOS", "ROLE_ANALISTA_SUPRIMENTOS", "ROLE_ESTOQUE", "ROLE_ALMOXARIFADO")
                                                // Endpoints de clientes - temporariamente públicos para debug
                                                .requestMatchers("/api/clients/**").permitAll()
                                                // Endpoints de documentos e certificações - restritos a RH e Admins
                                                .requestMatchers("/api/documents/**", "/api/employee-certifications/**")
                                                .hasAnyAuthority("ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH", "ROLE_DEPARTAMENTO_PESSOAL", "RH", "ADMIN", "SUPER_ADMIN")
                                                // Endpoints de multas - requerem apenas autenticação (temporário para
                                                // desenvolvimento)
                                                .requestMatchers("/api/fines/**").authenticated()
                                                // Endpoints de dashboard - requerem apenas autenticação para usuários
                                                // logados
                                                .requestMatchers("/api/dashboard/**").authenticated()
                                                // Endpoints operacionais - temporariamente públicos para teste de
                                                // integração
                                                .requestMatchers("/api/schedules/**").permitAll()
                                                .requestMatchers("/api/activity-logs/**").hasAuthority("ROLE_SUPER_ADMIN")
                                                .requestMatchers("/api/activity-reports/**").hasAuthority("ROLE_SUPER_ADMIN")
                                                .requestMatchers("/api/orders-of-service/**").permitAll()
                                                .requestMatchers("/api/operational/**").permitAll()
                                                .requestMatchers("/api/occurrences/**").permitAll()
                                                .requestMatchers("/api/vacation-coverages/**").permitAll()
                                                .requestMatchers("/api/work-post-assignments/**").permitAll()
                                                .requestMatchers("/api/specific-activities/**").permitAll()
                                                .requestMatchers("/api/absences/**").permitAll()
                                                // Endpoints operacionais - temporariamente públicos para debug
                                                .requestMatchers("/api/equipment/**").permitAll()
                                                .requestMatchers("/api/alerts/**").permitAll()
                                                .requestMatchers("/api/visit-controls/**").permitAll()
                                                // Endpoints de relatórios de visitas - requerem autenticação
                                                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS,
                                                                "/api/visit-control-reports/**")
                                                .permitAll()
                                                .requestMatchers("/api/visit-control-reports/**").authenticated()
                                                // Endpoints de dados de teste - públicos para desenvolvimento
                                                .requestMatchers("/api/test-data/**").permitAll()
                                                // Endpoints de controle de visitas - temporariamente públicos para
                                                // desenvolvimento
                                                .requestMatchers("/api/visits/**").permitAll()
                                                // Endpoints de medições - liberar GET autenticado e manter
                                                // POST/PUT/DELETE
                                                // restritos
                                                .requestMatchers("/api/measurements/test-pdf").permitAll()
                                                .requestMatchers("/api/measurements/*/pdf").permitAll()
                                                .requestMatchers("/api/measurements/*/excel").permitAll()
                                                .requestMatchers("/api/measurements/bulk/pdf").permitAll()
                                                .requestMatchers("/api/measurements/bulk/excel").permitAll()
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/measurements/**")
                                                .authenticated()
                                                .requestMatchers(org.springframework.http.HttpMethod.POST,
                                                                "/api/measurements/**")
                                                .hasAnyAuthority("FINANCIAL_WRITE", "FINANCIAL_CREATE",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO")
                                                .requestMatchers(org.springframework.http.HttpMethod.PUT,
                                                                "/api/measurements/**")
                                                .hasAnyAuthority("FINANCIAL_WRITE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO")
                                                .requestMatchers(org.springframework.http.HttpMethod.PATCH,
                                                                "/api/measurements/**")
                                                .hasAnyAuthority("FINANCIAL_WRITE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO")
                                                .requestMatchers(org.springframework.http.HttpMethod.DELETE,
                                                                "/api/measurements/**")
                                                .hasAnyAuthority("FINANCIAL_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_FINANCEIRO")
                                                // Endpoints de estoque - requerem permissões específicas ou
                                                // autenticação
                                                .requestMatchers("/api/stock/**", "/api/products/**")
                                                .hasAnyAuthority("EQUIPMENTS_READ", "EQUIPMENTS_WRITE",
                                                                "EQUIPMENTS_CREATE",
                                                                "EQUIPMENTS_DELETE", "EQUIPMENTS_ASSIGN", "STOCK_READ",
                                                                "STOCK_WRITE", "STOCK_CREATE",
                                                                "STOCK_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "SUPER_ADMIN", "ADMIN",
                                                                "ROLE_GESTOR", "ROLE_SUPERVISOR",
                                                                "ROLE_ESTOQUE", "ROLE_SUPRIMENTOS", "ROLE_COMPRAS", "ROLE_ALMOXARIFADO",
                                                                "ROLE_RH", "RH", "ROLE_DEPARTAMENTO_PESSOAL", "DEPARTAMENTO_PESSOAL")
                                                // Endpoints de modelos de documentos - temporariamente público para
                                                // teste
                                                .requestMatchers("/api/modelos-documentos/**").permitAll()
                                                // Endpoints de documentos gerados - temporariamente público para teste
                                                .requestMatchers("/api/documentos-gerados/**").permitAll()
                                                // Endpoints de assinaturas de documentos - temporariamente público para
                                                // teste
                                                .requestMatchers("/api/assinaturas-documentos/**").permitAll()
                                                // Endpoints de dependentes - listar por funcionário disponível para
                                                // qualquer usuário autenticado (ex.: ponto eletrônico, ficha do
                                                // funcionário)
                                                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS,
                                                                "/api/dependents/**")
                                                .permitAll()
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/dependents/employee/**")
                                                .authenticated()
                                                // Demais acessos a dependentes requerem permissões de RH/funcionários
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/dependents/**")
                                                .hasAnyAuthority(
                                                                "SUPER_ADMIN",
                                                                "ADMIN",
                                                                "GESTOR",
                                                                "RH",
                                                                "ROLE_SUPER_ADMIN",
                                                                "ROLE_ADMIN",
                                                                "ROLE_GESTOR",
                                                                "ROLE_RH",
                                                                "EMPLOYEES_READ",
                                                                "EMPLOYEES_WRITE",
                                                                "EMPLOYEES_CREATE",
                                                                "DEPARTAMENTO_PESSOAL",
                                                                "ROLE_DEPARTAMENTO_PESSOAL",
                                                                "COLABORADOR",
                                                                "ROLE_COLABORADOR")
                                                .requestMatchers("/api/dependents/**")
                                                .hasAnyAuthority("SUPER_ADMIN", "ADMIN", "GESTOR", "RH",
                                                                "ROLE_SUPER_ADMIN", "ROLE_ADMIN",
                                                                "ROLE_GESTOR", "ROLE_RH", "EMPLOYEES_READ",
                                                                "EMPLOYEES_WRITE", "EMPLOYEES_CREATE",
                                                                "DEPARTAMENTO_PESSOAL", "ROLE_DEPARTAMENTO_PESSOAL")
                                                // Endpoints de ponto eletrônico - qualquer usuário autenticado (dados
                                                // filtrados por CPF no serviço)
                                                .requestMatchers("/api/time-records/**").authenticated()
                                                // Endpoints de folha de ponto (time-sheets) - qualquer autenticado
                                                // (dados por funcionário/CPF no serviço)
                                                .requestMatchers("/api/time-sheets/**").authenticated()
                                                // Todo o resto requer autenticação
                                .anyRequest().authenticated())
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) -> {
                                response.setContentType("application/json");
                                response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                                response.getWriter().write("{\"error\": \"Unauthorized\", \"message\": \"" + authException.getMessage() + "\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                                response.setContentType("application/json");
                                response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN);
                                response.getWriter().write("{\"error\": \"Forbidden\", \"message\": \"Access denied\"}");
                        }))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                // Parâmetros recomendados (saltLength, hashLength, parallelism, memory,
                // iterations)
                return new Argon2PasswordEncoder(16, 32, 1, 1 << 16, 3);
        }

        @Bean
        public AuthenticationProvider authenticationProvider() {
                DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
                authProvider.setUserDetailsService(customUserDetailsService);
                authProvider.setPasswordEncoder(passwordEncoder());
                return authProvider;
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
                return config.getAuthenticationManager();
        }

        // Ajusta o prefixo padrão de roles para vazio, permitindo usar nomes como
        // "SUPER_ADMIN"
        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                // Permitir todas as origens para desenvolvimento (incluindo diferentes portas
                // do frontend)
                configuration.setAllowedOriginPatterns(Arrays.asList("*"));
                configuration.setAllowedMethods(
                                Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
                configuration.setAllowedHeaders(Arrays.asList("*"));
                configuration.setAllowCredentials(true);
                // Configurar exposição de headers para imagens
                configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With",
                                "Accept",
                                "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
                configuration.setMaxAge(3600L);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}