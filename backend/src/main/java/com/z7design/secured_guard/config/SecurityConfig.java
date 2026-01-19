package com.z7design.secured_guard.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
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
public class SecurityConfig {

    private final CustomUserDetailsService customUserDetailsService;
    @Lazy
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(CustomUserDetailsService customUserDetailsService, @Lazy JwtAuthenticationFilter jwtAuthenticationFilter) {
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
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .frameOptions(frame -> frame.disable())
                .contentTypeOptions(contentType -> {})
            )
            .authorizeHttpRequests(auth -> auth
                // Endpoints públicos (sem autenticação)
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/files/**").permitAll()
                .requestMatchers("/api/test/**").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/diagnostic/**").permitAll()
                .requestMatchers("/api/debug/**").permitAll()
                // WebSocket endpoints - permitir todos os transportes do SockJS (info, websocket, xhr, eventsource, htmlfile, jsonp, iframe)
                // O SockJS faz requisições HTTP iniciais que não incluem o token JWT
                // A autenticação real acontece quando a conexão STOMP é estabelecida (via WebSocketSecurityConfig)
                // IMPORTANTE: Permitir todos os padrões do SockJS, mas a conexão STOMP será autenticada no WebSocketSecurityConfig
                // NOTA: Padrões com ** devem ser os últimos elementos, então usamos um RequestMatcher customizado
                .requestMatchers("/ws/info").permitAll()
                .requestMatchers("/ws/iframe.html").permitAll()
                // Permitir todos os transportes do SockJS usando um RequestMatcher customizado
                // O SockJS usa URLs como: /ws/{server-id}/{session-id}/websocket, /ws/{server-id}/{session-id}/xhr, etc.
                .requestMatchers(new RequestMatcher() {
                    @Override
                    public boolean matches(HttpServletRequest request) {
                        String path = request.getRequestURI();
                        if (path.startsWith("/ws/") && path.length() > 4) {
                            String subPath = path.substring(4); // Remove "/ws/"
                            return subPath.contains("/websocket") ||
                                   subPath.contains("/xhr") ||
                                   subPath.contains("/eventsource") ||
                                   subPath.contains("/htmlfile") ||
                                   subPath.contains("/jsonp");
                        }
                        return false;
                    }
                }).permitAll()
                .requestMatchers("/ws/**").authenticated()
                .requestMatchers("/ws").authenticated()
                .requestMatchers("/api/email/test").authenticated()
                .requestMatchers("/api/email/config").authenticated()
                // Endpoints públicos do portal (vagas, etc)
                .requestMatchers("/api/public/**").permitAll()
                // WhatsApp controller - público para pareamento/health em dev
                .requestMatchers("/api/whatsapp/**").permitAll()
                .requestMatchers("/api/payslips/test-download/**").permitAll()
                .requestMatchers("/api/invoices/public/test-cost-centers").permitAll()
                .requestMatchers("/api/invoices/public/debug-cost-centers").permitAll()
                .requestMatchers("/api/invoices/cost-centers").permitAll()
                .requestMatchers("/api/accounts-receivable/public/test").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/v1/document-processing/**").authenticated()
                // Arquivos públicos (imagens e uploads)
                .requestMatchers("/uploads/**").permitAll()
                // Logos de empresas - permitir acesso público (para exibição em relatórios)
                .requestMatchers("/api/uploads/companies/logos/**").permitAll()
                .requestMatchers("/api/uploads/**").authenticated() // Outros arquivos do chat requerem autenticação
                .requestMatchers("/files/**").permitAll()
                // Endpoints HR - requerem permissões específicas
                .requestMatchers("/api/hr/**").hasAnyAuthority("EMPLOYEES_READ", "EMPLOYEES_WRITE", "EMPLOYEES_CREATE", "EMPLOYEES_DELETE", "SUPER_ADMIN", "ADMIN", "HR", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_HR", "ROLE_RH")
                // Endpoints SST - requerem permissões específicas
                .requestMatchers("/api/sst/**").hasAnyAuthority("EMPLOYEES_READ", "EMPLOYEES_WRITE", "EMPLOYEES_CREATE", "EMPLOYEES_DELETE", "SUPER_ADMIN", "ADMIN", "HR", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_HR", "ROLE_RH")
                // Endpoints de usuários - permitir leitura para usuários autenticados (para chat), escrita requer permissões específicas
                // IMPORTANTE: Regras específicas devem vir ANTES das genéricas
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users").authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/users/{id}").authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/users/**").hasAnyAuthority("USERS_CREATE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/users/**").hasAnyAuthority("USERS_WRITE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/users/**").hasAnyAuthority("USERS_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                .requestMatchers("/api/users/**").hasAnyAuthority("USERS_READ", "USERS_WRITE", "USERS_CREATE", "USERS_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                // Endpoints de grupos - permitir consulta de próprios grupos para usuários autenticados
                .requestMatchers("/api/groups/user/**").authenticated()
                // Endpoints de grupos - operações administrativas requerem permissões específicas
                .requestMatchers("/api/groups/**").hasAnyAuthority("GROUPS_READ", "GROUPS_WRITE", "GROUPS_CREATE", "GROUPS_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "RH", "DEPARTAMENTO_PESSOAL", "ROLE_RH", "ROLE_DEPARTAMENTO_PESSOAL")
                // Endpoints de equipamentos - requerem permissões específicas
                .requestMatchers("/api/equipments/**").hasAnyAuthority("EQUIPMENTS_READ", "EQUIPMENTS_WRITE", "EQUIPMENTS_CREATE", "EQUIPMENTS_DELETE", "EQUIPMENTS_ASSIGN", "SUPER_ADMIN", "ADMIN", "GESTOR", "SUPERVISOR", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR", "ROLE_SUPERVISOR")
                // Endpoints de EPIs - requerem permissões específicas
                .requestMatchers("/api/epis/**").hasAnyAuthority("EQUIPMENTS_READ", "EQUIPMENTS_WRITE", "EQUIPMENTS_CREATE", "EQUIPMENTS_DELETE", "EQUIPMENTS_ASSIGN", "SUPER_ADMIN", "ADMIN", "GESTOR", "SUPERVISOR", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR", "ROLE_SUPERVISOR")
                // Endpoints de controle de EPI - requerem permissões específicas
                .requestMatchers("/api/epi-control/**").hasAnyAuthority("EQUIPMENTS_READ", "EQUIPMENTS_WRITE", "EQUIPMENTS_CREATE", "EQUIPMENTS_DELETE", "EQUIPMENTS_ASSIGN", "SUPER_ADMIN", "ADMIN", "GESTOR", "SUPERVISOR", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR", "ROLE_SUPERVISOR")
                // Endpoints da frota - requerem apenas autenticação (temporário para desenvolvimento)
                .requestMatchers("/api/frota/**").authenticated()
                // Endpoints de fuel-records - requerem apenas autenticação (temporário para desenvolvimento)
                .requestMatchers("/api/fuel-records/**").authenticated()
                // Endpoints de fuel-stations - requerem apenas autenticação (temporário para desenvolvimento)
                .requestMatchers("/api/fuel-stations/**").authenticated()
                // Endpoints de veículos - requerem apenas autenticação (temporário para desenvolvimento)
                .requestMatchers("/api/vehicles/**").authenticated()
                // Endpoints de work-posts - temporariamente públicos para debug
                .requestMatchers("/api/work-posts/**").permitAll()
                // Endpoints de guias de transporte - requerem autenticação
                .requestMatchers("/api/transport-guides/**").authenticated()
                // Endpoints de reconhecimento facial - requerem apenas autenticação
                .requestMatchers("/api/facial-recognition/recognize").authenticated()
                .requestMatchers("/api/facial-recognition/test").permitAll()
                .requestMatchers("/api/facial-recognition/**").hasAnyAuthority("SUPER_ADMIN", "ADMIN", "HR_READ", "HR_WRITE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                // Endpoints de autenticação de supervisores - públicos para login
                .requestMatchers("/api/supervisor-auth/**").permitAll()
                // Endpoints de supervisores - requerem permissões administrativas
                .requestMatchers("/api/supervisors/**").hasAnyAuthority("SUPER_ADMIN", "ADMIN", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                // Endpoints de consentimento LGPD - públicos para verificação e aceitação
                .requestMatchers("/api/first-access/**").authenticated()
                .requestMatchers("/api/user-terms-consent/check/**").permitAll()
                .requestMatchers("/api/user-terms-consent/accept").permitAll()
                .requestMatchers("/api/user-terms-consent/versions").permitAll()
                .requestMatchers("/api/user-terms-consent/**").hasAnyAuthority("SUPER_ADMIN", "ADMIN", "ROLE_SUPER_ADMIN", "ROLE_ADMIN")
                // Endpoints de contratos - requerem permissões específicas
                .requestMatchers("/api/contracts/**").hasAnyAuthority("CONTRACTS_READ", "CONTRACTS_WRITE", "CONTRACTS_CREATE", "CONTRACTS_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR")
                // Endpoints de propostas - requerem permissões específicas
                .requestMatchers("/api/proposals/**").hasAnyAuthority("PROPOSALS_READ", "PROPOSALS_WRITE", "PROPOSALS_CREATE", "PROPOSALS_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_COMERCIAL")
                // Endpoints financeiros - requerem permissões específicas
                .requestMatchers("/api/financial/**").hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE", "FINANCIAL_CREATE", "FINANCIAL_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                // Endpoints de invoices (contas a pagar)
                .requestMatchers("/api/invoices/**").hasAnyAuthority("SUPER_ADMIN", "ADMIN", "FINANCEIRO", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                // Endpoints de suppliers (fornecedores) - requerem permissões administrativas ou financeiras
                .requestMatchers("/api/suppliers/**").hasAnyAuthority("SUPER_ADMIN", "ADMIN", "FINANCEIRO", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO", "FINANCIAL_READ", "FINANCIAL_WRITE", "FINANCIAL_CREATE", "FINANCIAL_DELETE")
                // Endpoints de accounts-receivable (contas a receber) - requerem permissões específicas
                .requestMatchers("/api/accounts-receivable/**").hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE", "FINANCIAL_CREATE", "FINANCIAL_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                // Endpoints de scheduled-payments (pagamentos agendados) - requerem permissões específicas
                .requestMatchers("/api/scheduled-payments/**").hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE", "FINANCIAL_CREATE", "FINANCIAL_DELETE", "SUPER_ADMIN", "ADMIN", "FINANCEIRO", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                // Endpoints de bank-reconciliation (conciliação bancária) - requerem permissões específicas
                .requestMatchers("/api/bank-reconciliation/**").hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE", "FINANCIAL_CREATE", "FINANCIAL_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                // Endpoints de bancos e agências - requerem permissões específicas
                .requestMatchers("/api/banks/**").hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE", "FINANCIAL_CREATE", "FINANCIAL_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                .requestMatchers("/api/agencies/**").hasAnyAuthority("FINANCIAL_READ", "FINANCIAL_WRITE", "FINANCIAL_CREATE", "FINANCIAL_DELETE", "SUPER_ADMIN", "ADMIN", "FINANCEIRO", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                // Endpoints de holerites - requerem permissões específicas
                .requestMatchers("/api/payslips/**").hasAnyAuthority("PAYSLIPS_READ", "PAYSLIPS_WRITE", "PAYSLIPS_CREATE", "PAYSLIPS_DELETE", "PAYSLIPS_PUBLISH", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH", "ROLE_FINANCEIRO", "ROLE_COLABORADOR")
                // Endpoints de recibos - requerem permissões específicas
                .requestMatchers("/api/receipts/**").hasAnyAuthority("PAYSLIPS_READ", "PAYSLIPS_WRITE", "PAYSLIPS_CREATE", "PAYSLIPS_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH", "ROLE_FINANCEIRO", "ROLE_COLABORADOR")
                // Endpoints de documentos unificados - arquivos públicos para download/visualização
                .requestMatchers("/api/unified-documents/public/**").permitAll()
                .requestMatchers("/api/unified-documents/download/**").permitAll()
                // Endpoints de documentos unificados - operações requerem permissões
                .requestMatchers("/api/unified-documents/**").hasAnyAuthority("PAYSLIPS_READ", "PAYSLIPS_WRITE", "PAYSLIPS_CREATE", "PAYSLIPS_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH", "ROLE_FINANCEIRO", "ROLE_COLABORADOR")
                // Endpoints de organização por setor - temporariamente público para debug
                .requestMatchers("/api/sector-organization/**").permitAll()
                // Endpoints de relatórios - requerem permissões específicas
                .requestMatchers("/api/reports/**").hasAnyAuthority("REPORTS_READ", "REPORTS_GENERATE", "REPORTS_EXPORT", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR", "ROLE_SUPERVISOR")
                // Endpoints de chat - permitir para todos os roles principais, incluindo Departamento Pessoal
                .requestMatchers("/api/v1/chat/**").hasAnyRole(
                    "SUPER_ADMIN",
                    "ADMIN",
                    "SUPERVISOR",
                    "COLABORADOR",
                    "VIGILANTE",
                    "RH",
                    "DEPARTAMENTO_PESSOAL",
                    "FINANCEIRO",
                    "GESTOR"
                )
                // Endpoints de mensagens - permitir para todos os roles principais, incluindo Departamento Pessoal
                .requestMatchers("/api/v1/messages/**").hasAnyAuthority(
                    "SUPER_ADMIN",
                    "ADMIN",
                    "SUPERVISOR",
                    "COLABORADOR",
                    "VIGILANTE",
                    "RH",
                    "DEPARTAMENTO_PESSOAL",
                    "FINANCEIRO",
                    "GESTOR",
                    "ROLE_SUPER_ADMIN",
                    "ROLE_ADMIN",
                    "ROLE_SUPERVISOR",
                    "ROLE_COLABORADOR",
                    "ROLE_VIGILANTE",
                    "ROLE_RH",
                    "ROLE_DEPARTAMENTO_PESSOAL",
                    "ROLE_FINANCEIRO",
                    "ROLE_GESTOR"
                )
                // Endpoints de suporte e atendimento - requerem permissões específicas
                .requestMatchers("/api/v1/support/**").hasAnyAuthority("SUPPORT_READ", "SUPPORT_WRITE", "SUPPORT_CREATE", "SUPPORT_DELETE", "SUPPORT_MANAGE", "ATTENDANCE_READ", "ATTENDANCE_WRITE", "ATTENDANCE_MANAGE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH", "ROLE_DEPARTAMENTO_PESSOAL", "ROLE_FINANCEIRO", "ROLE_COMERCIAL", "ROLE_SUPERVISOR")
                // Endpoints de chatbot - mesmas permissões de suporte
                .requestMatchers("/api/v1/support/chatbot/**").hasAnyAuthority("SUPPORT_READ", "SUPPORT_WRITE", "SUPPORT_CREATE", "SUPPORT_DELETE", "SUPPORT_MANAGE", "ATTENDANCE_READ", "ATTENDANCE_WRITE", "ATTENDANCE_MANAGE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_RH", "ROLE_DEPARTAMENTO_PESSOAL", "ROLE_FINANCEIRO", "ROLE_COMERCIAL", "ROLE_SUPERVISOR")
                // Endpoints de funcionários - temporariamente públicos para debug
                .requestMatchers("/api/employees/**").permitAll()
                // Endpoints de unidades - temporariamente públicos para debug
                .requestMatchers("/api/units/**").permitAll()
                // Endpoints de empresas - temporariamente públicos para debug
                .requestMatchers("/api/companies/**").permitAll()
                // Endpoints de cargos/posições - temporariamente públicos para debug
                .requestMatchers("/api/positions/**").permitAll()
                // Endpoints de clientes - temporariamente públicos para debug
                .requestMatchers("/api/clients/**").permitAll()
                // Endpoints de documentos - temporariamente públicos para debug
                .requestMatchers("/api/documents/**").permitAll()
                // Endpoints de certificações de funcionários - temporariamente públicos para debug
                .requestMatchers("/api/employee-certifications/**").permitAll()
                // Endpoints de multas - requerem apenas autenticação (temporário para desenvolvimento)
                .requestMatchers("/api/fines/**").authenticated()
                // Endpoints de dashboard - requerem apenas autenticação para usuários logados
                .requestMatchers("/api/dashboard/**").authenticated()
                // Endpoints operacionais - temporariamente públicos para teste de integração
                .requestMatchers("/api/schedules/**").permitAll()
                .requestMatchers("/api/activity-reports/**").permitAll()
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
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/api/visit-control-reports/**").permitAll()
                .requestMatchers("/api/visit-control-reports/**").authenticated()
                // Endpoints de dados de teste - públicos para desenvolvimento
                .requestMatchers("/api/test-data/**").permitAll()
                // Endpoints de controle de visitas - temporariamente públicos para desenvolvimento
                .requestMatchers("/api/visits/**").permitAll()
                // Endpoints de medições - liberar GET autenticado e manter POST/PUT/DELETE restritos
                .requestMatchers("/api/measurements/test-pdf").permitAll()
                .requestMatchers("/api/measurements/*/pdf").permitAll()
                .requestMatchers("/api/measurements/*/excel").permitAll()
                .requestMatchers("/api/measurements/bulk/pdf").permitAll()
                .requestMatchers("/api/measurements/bulk/excel").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/measurements/**").authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/measurements/**").hasAnyAuthority("FINANCIAL_WRITE", "FINANCIAL_CREATE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                .requestMatchers(org.springframework.http.HttpMethod.PUT, "/api/measurements/**").hasAnyAuthority("FINANCIAL_WRITE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/measurements/**").hasAnyAuthority("FINANCIAL_WRITE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/api/measurements/**").hasAnyAuthority("FINANCIAL_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_FINANCEIRO")
                // Endpoints de estoque - requerem permissões específicas ou autenticação
                .requestMatchers("/api/stock/**").hasAnyAuthority("EQUIPMENTS_READ", "EQUIPMENTS_WRITE", "EQUIPMENTS_CREATE", "EQUIPMENTS_DELETE", "EQUIPMENTS_ASSIGN", "STOCK_READ", "STOCK_WRITE", "STOCK_CREATE", "STOCK_DELETE", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR", "ROLE_SUPERVISOR")
                // Endpoints de modelos de documentos - temporariamente público para teste
                .requestMatchers("/api/modelos-documentos/**").permitAll()
                // Endpoints de documentos gerados - temporariamente público para teste
                .requestMatchers("/api/documentos-gerados/**").permitAll()
                // Endpoints de assinaturas de documentos - temporariamente público para teste
                .requestMatchers("/api/assinaturas-documentos/**").permitAll()
                // Endpoints de dependentes - leitura requer permissões básicas, escrita requer permissões específicas
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/dependents/**").hasAnyAuthority(
                    "SUPER_ADMIN",
                    "ADMIN",
                    "GESTOR",
                    "RH",
                    "ROLE_SUPER_ADMIN",
                    "ROLE_ADMIN",
                    "ROLE_GESTOR",
                    "ROLE_RH",
                    "EMPLOYEES_READ",
                    "EMPLOYEES_WRITE"
                )
                .requestMatchers("/api/dependents/**").hasAnyAuthority("SUPER_ADMIN", "ADMIN", "GESTOR", "RH", "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_GESTOR", "ROLE_RH", "EMPLOYEES_READ", "EMPLOYEES_WRITE")
                // Endpoints de folha de ponto (time-sheets)
                .requestMatchers("/api/time-sheets/**").hasAnyAuthority(
                        "TIME_RECORD_READ",
                        "SUPER_ADMIN",
                        "ADMIN",
                        "RH",
                        "DEPARTAMENTO_PESSOAL",
                        "ROLE_SUPER_ADMIN",
                        "ROLE_ADMIN",
                        "ROLE_RH",
                        "ROLE_DEPARTAMENTO_PESSOAL"
                )
                // Todo o resto requer autenticação
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        // Parâmetros recomendados (saltLength, hashLength, parallelism, memory, iterations)
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

    // Ajusta o prefixo padrão de roles para vazio, permitindo usar nomes como "SUPER_ADMIN"
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Permitir todas as origens para desenvolvimento (incluindo diferentes portas do frontend)
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        // Configurar exposição de headers para imagens
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}