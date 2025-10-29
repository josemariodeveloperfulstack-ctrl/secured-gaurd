package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EnvioRequest;
import com.z7design.secured_guard.dto.EnvioResponse;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.DeliveryChannel;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.model.PayslipDeliveryLog;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.PayslipDeliveryLogRepository;
import com.z7design.secured_guard.repository.PayslipRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class EnvioService {
    
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final WhatsAppService whatsAppService;
    private final PayslipRepository payslipRepository;
    private final PayslipDeliveryLogRepository deliveryLogRepository;
    private final PayslipService payslipService;
    
    // WhatsApp provider: Baileys REST API
    @Autowired(required = false)
    private BaileysRestService baileysRestService;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    
    // Construtor
    public EnvioService(
            EmployeeRepository employeeRepository,
            UserRepository userRepository,
            EmailService emailService,
            WhatsAppService whatsAppService,
            PayslipRepository payslipRepository,
            PayslipDeliveryLogRepository deliveryLogRepository,
            PayslipService payslipService) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.whatsAppService = whatsAppService;
        this.payslipRepository = payslipRepository;
        this.deliveryLogRepository = deliveryLogRepository;
        this.payslipService = payslipService;
    }
    
    public EnvioResponse enviarIndividual(EnvioRequest request) {
        log.info("🚀 Iniciando envio individual - Tipo: {}, FuncionarioId: {}, CPF: {}", 
                request.getTipo(), request.getFuncionarioId(), request.getCpf());
        
        EnvioResponse response = EnvioResponse.builder()
                .sucesso(false)
                .dataEnvio(LocalDateTime.now())
                .tipoEnvio(request.getTipo())
                .totalEnviados(0)
                .totalFalhas(0)
                .detalhes(new ArrayList<>())
                .build();
        
        try {
            Employee employee = null;
            User user = null;
            
            // NOVA LÓGICA: Buscar primeiro na tabela USERS por CPF
            if (request.getCpf() != null && !request.getCpf().trim().isEmpty()) {
                String cpfBusca = request.getCpf();
                String cpfNormalizado = cpfBusca.replaceAll("[^0-9]", "");
                
                log.info("🔍 PASSO 1: Buscando USER por CPF: {}", cpfBusca);
                
                // Buscar user por username (que é o CPF)
                Optional<User> userOpt = userRepository.findByUsername(cpfNormalizado);
                
                if (userOpt.isEmpty()) {
                    // Tentar com CPF formatado
                    userOpt = userRepository.findByUsername(cpfBusca);
                }
                
                if (userOpt.isPresent()) {
                    user = userOpt.get();
                    log.info("✅ USER encontrado: {} (username: {})", user.getName(), user.getUsername());
                    log.info("📋 Dados do USER: ID={}, Email={}, WhatsApp='{}'", 
                            user.getId(), user.getEmail(), user.getWhatsapp());
                    
                    // Verificar se tem WhatsApp
                    if (user.getWhatsapp() == null) {
                        log.warn("⚠️ Campo WhatsApp é NULL!");
                        response.setMensagem("WhatsApp não cadastrado na tabela users para CPF: " + cpfBusca);
                        return response;
                    }
                    
                    if (user.getWhatsapp().trim().isEmpty()) {
                        log.warn("⚠️ Campo WhatsApp está vazio (string vazia)!");
                        response.setMensagem("WhatsApp não cadastrado na tabela users para CPF: " + cpfBusca);
                        return response;
                    }
                    
                    log.info("✅ WhatsApp encontrado: '{}' (tamanho: {} caracteres)", 
                            user.getWhatsapp(), user.getWhatsapp().length());
                    
                    // Agora buscar Employee correspondente (opcional, para pegar dados adicionais)
                    log.info("🔍 PASSO 2: Buscando EMPLOYEE correspondente...");
                    Optional<Employee> employeeOpt = employeeRepository.findByDocument(cpfNormalizado);
                    
                    if (employeeOpt.isEmpty()) {
                        // Tentar buscar todos e normalizar
                        List<Employee> allEmployees = employeeRepository.findAll();
                        employeeOpt = allEmployees.stream()
                            .filter(e -> e.getDocument() != null)
                            .filter(e -> e.getDocument().replaceAll("[^0-9]", "").equals(cpfNormalizado))
                            .findFirst();
                    }
                    
                    if (employeeOpt.isPresent()) {
                        employee = employeeOpt.get();
                        log.info("✅ EMPLOYEE encontrado: {}", employee.getName());
                    } else {
                        log.warn("⚠️ EMPLOYEE não encontrado, usando dados do USER");
                        // Criar Employee temporário com dados do User
                        employee = new Employee();
                        employee.setId(UUID.randomUUID());
                        employee.setName(user.getName());
                        employee.setDocument(cpfNormalizado);
                        employee.setEmail(user.getEmail());
                    }
                    
                } else {
                    log.error("❌ USER não encontrado com CPF: {}", cpfBusca);
                    response.setMensagem("Usuário não encontrado na tabela users para CPF: " + cpfBusca);
                    return response;
                }
                
            } else if (request.getFuncionarioId() != null && !request.getFuncionarioId().trim().isEmpty()) {
                // Busca por ID (mantém lógica antiga)
                log.info("🔍 Buscando funcionário por ID: {}", request.getFuncionarioId());
                Optional<Employee> employeeOpt = employeeRepository.findById(UUID.fromString(request.getFuncionarioId()));
                
                if (employeeOpt.isEmpty()) {
                    log.error("❌ Funcionário não encontrado por ID");
                    response.setMensagem("Funcionário não encontrado");
                    return response;
                }
                
                employee = employeeOpt.get();
                log.info("✅ EMPLOYEE encontrado: {}", employee.getName());
                
                // Buscar User correspondente
                Optional<User> userOpt = userRepository.findByUsername(employee.getDocument());
                if (userOpt.isEmpty()) {
                    log.error("❌ USER não encontrado para o funcionário");
                    response.setMensagem("Usuário não encontrado na tabela users para CPF: " + employee.getDocument());
                    return response;
                }
                
                user = userOpt.get();
                
                if (user.getWhatsapp() == null || user.getWhatsapp().trim().isEmpty()) {
                    log.warn("⚠️ USER não tem WhatsApp cadastrado!");
                    response.setMensagem("WhatsApp não cadastrado na tabela users para CPF: " + employee.getDocument());
                    return response;
                }
                
            } else {
                log.error("❌ Nenhum ID ou CPF fornecido!");
                response.setMensagem("ID do funcionário ou CPF é obrigatório");
                return response;
            }
            
            // Processar envio com Employee e User
            EnvioResponse.DetalheEnvio detalhe = processarEnvio(employee, request);
            
            response.getDetalhes().add(detalhe);
            
            if (detalhe.isEnviado()) {
                response.setTotalEnviados(1);
                response.setSucesso(true);
                response.setMensagem("Envio realizado com sucesso");
            } else {
                response.setTotalFalhas(1);
                response.setMensagem("Falha no envio: " + detalhe.getErro());
            }
            
        } catch (Exception e) {
            log.error("❌ Erro no envio individual: {}", e.getMessage());
            response.setMensagem("Erro interno: " + e.getMessage());
        }
        
        return response;
    }
    
    public EnvioResponse enviarEmMassa(EnvioRequest request) {
        final int BATCH_SIZE = 20;
        final long DELAY_BETWEEN_ITEMS_MS = 250;      // pequena pausa entre envios
        final long DELAY_BETWEEN_BATCHES_MS = 2000;   // pausa entre lotes
        log.info("🚀 Iniciando envio em massa para {} funcionários (batch size={})", 
                request.getFuncionarioIds().size(), BATCH_SIZE);
        
        EnvioResponse response = EnvioResponse.builder()
                .sucesso(false)
                .dataEnvio(LocalDateTime.now())
                .tipoEnvio(request.getTipo())
                .totalEnviados(0)
                .totalFalhas(0)
                .detalhes(new ArrayList<>())
                .build();
        
        try {
            List<UUID> employeeIds = request.getFuncionarioIds().stream()
                    .map(UUID::fromString)
                    .toList();
            List<Employee> employees = employeeRepository.findAllById(employeeIds);
            int index = 0;
            for (Employee employee : employees) {
                EnvioResponse.DetalheEnvio detalhe = processarEnvio(employee, request);
                response.getDetalhes().add(detalhe);
                
                if (detalhe.isEnviado()) {
                    response.setTotalEnviados(response.getTotalEnviados() + 1);
                } else {
                    response.setTotalFalhas(response.getTotalFalhas() + 1);
                }
                index++;
                // pacing entre itens
                try { Thread.sleep(DELAY_BETWEEN_ITEMS_MS); } catch (InterruptedException ignored) {}
                // pausa a cada BATCH_SIZE itens
                if (index % BATCH_SIZE == 0) {
                    log.info("⏸️ Pausa entre lotes... ({} itens processados)", index);
                    try { Thread.sleep(DELAY_BETWEEN_BATCHES_MS); } catch (InterruptedException ignored) {}
                }
            }
            
            response.setSucesso(response.getTotalFalhas() == 0);
            response.setMensagem(String.format("Envio em massa concluído. Enviados: %d, Falhas: %d", 
                    response.getTotalEnviados(), response.getTotalFalhas()));
            
        } catch (Exception e) {
            log.error("❌ Erro no envio em massa: {}", e.getMessage());
            response.setMensagem("Erro interno: " + e.getMessage());
        }
        
        return response;
    }
    
    public EnvioResponse enviarTodosPorTipo(EnvioRequest request) {
        final int BATCH_SIZE = 20;
        final long DELAY_BETWEEN_ITEMS_MS = 250;
        final long DELAY_BETWEEN_BATCHES_MS = 2000;
        log.info("🚀 Iniciando envio em lote via {}", request.getTipo());
        
        EnvioResponse response = EnvioResponse.builder()
                .sucesso(false)
                .dataEnvio(LocalDateTime.now())
                .tipoEnvio(request.getTipo())
                .totalEnviados(0)
                .totalFalhas(0)
                .detalhes(new ArrayList<>())
                .build();
        
        try {
            List<String> cpfsParaEnvio = new ArrayList<>();
            
            if ("email".equals(request.getTipo())) {
                // Para email, buscar users com email cadastrado
                log.info("📧 Buscando users com EMAIL cadastrado...");
                List<User> usersComEmail = userRepository.findAll().stream()
                    .filter(user -> user.getEmail() != null && !user.getEmail().trim().isEmpty())
                    .toList();
                cpfsParaEnvio = usersComEmail.stream()
                    .map(User::getUsername)  // username = CPF
                    .toList();
                log.info("✅ Encontrados {} users com email", cpfsParaEnvio.size());
                
            } else if ("whatsapp".equals(request.getTipo())) {
                // Para WhatsApp, buscar APENAS na tabela USERS
                log.info("📱 Buscando users com WHATSAPP cadastrado...");
                List<User> usersComWhatsApp = userRepository.findAll().stream()
                    .filter(user -> user.getWhatsapp() != null && !user.getWhatsapp().trim().isEmpty())
                    .toList();
                cpfsParaEnvio = usersComWhatsApp.stream()
                    .map(User::getUsername)  // username = CPF
                    .toList();
                log.info("✅ Encontrados {} users com WhatsApp", cpfsParaEnvio.size());
                
            } else {
                response.setMensagem("Tipo de envio inválido");
                return response;
            }
            
            if (cpfsParaEnvio.isEmpty()) {
                response.setMensagem("Nenhum destinatário encontrado para envio via " + request.getTipo());
                return response;
            }
            
            log.info("📋 Processando {} envios...", cpfsParaEnvio.size());
            
            // Processar cada CPF em lotes
            int index = 0;
            for (String cpf : cpfsParaEnvio) {
                log.info("📤 Processando envio para CPF: {}", cpf);
                
                // Criar request individual por CPF
                EnvioRequest individualRequest = new EnvioRequest();
                individualRequest.setTipo(request.getTipo());
                individualRequest.setCpf(cpf);
                individualRequest.setMensagem(request.getMensagem());
                individualRequest.setAssunto(request.getAssunto());
                
                // Processar envio individual (já vai buscar na tabela users)
                EnvioResponse individualResponse = enviarIndividual(individualRequest);
                
                // Adicionar detalhes à resposta
                if (individualResponse.getDetalhes() != null && !individualResponse.getDetalhes().isEmpty()) {
                    EnvioResponse.DetalheEnvio detalhe = individualResponse.getDetalhes().get(0);
                    response.getDetalhes().add(detalhe);
                    
                    if (detalhe.isEnviado()) {
                        response.setTotalEnviados(response.getTotalEnviados() + 1);
                    } else {
                        response.setTotalFalhas(response.getTotalFalhas() + 1);
                    }
                }
                index++;
                try { Thread.sleep(DELAY_BETWEEN_ITEMS_MS); } catch (InterruptedException ignored) {}
                if (index % BATCH_SIZE == 0) {
                    log.info("⏸️ Pausa entre lotes... ({} itens processados)", index);
                    try { Thread.sleep(DELAY_BETWEEN_BATCHES_MS); } catch (InterruptedException ignored) {}
                }
            }
            
            response.setSucesso(response.getTotalEnviados() > 0);
            response.setMensagem(String.format("✅ Envio em lote concluído. Enviados: %d, Falhas: %d", 
                    response.getTotalEnviados(), response.getTotalFalhas()));
            
        } catch (Exception e) {
            log.error("❌ Erro no envio em lote: {}", e.getMessage(), e);
            response.setMensagem("Erro interno: " + e.getMessage());
        }
        
        return response;
    }
    
    private EnvioResponse.DetalheEnvio processarEnvio(Employee employee, EnvioRequest request) {
        EnvioResponse.DetalheEnvio detalhe = EnvioResponse.DetalheEnvio.builder()
                .funcionarioId(employee.getId().toString())
                .nome(employee.getName())
                .cpf(employee.getDocument())
                .email(employee.getEmail())
                .telefone(employee.getPhone())
                .enviado(false)
                .build();
        
        try {
            if ("email".equals(request.getTipo())) {
                if (employee.getEmail() == null || employee.getEmail().trim().isEmpty()) {
                    detalhe.setErro("Email não cadastrado");
                    registrarLog(employee.getDocument(), null, null, DeliveryChannel.EMAIL, false, 1, detalhe.getErro());
                    return detalhe;
                }
                // Resolver último holerite disponível (maior ano/mes)
                var ultimoRegistro = obterUltimoPayslip(employee.getDocument());
                Optional<String> resolvedPathOpt = ultimoRegistro.map(p ->
                        payslipService.resolvePayslipPathByCpfMonthYear(p.getCpf(), p.getMonth(), p.getYear()).orElse(null)
                );
                String filePath = resolvedPathOpt.orElse(null);
                if (filePath == null || !Files.exists(Path.of(filePath))) {
                    detalhe.setErro("Arquivo de holerite não encontrado para envio por email");
                    registrarLog(employee.getDocument(), ultimoRegistro.map(Payslip::getMonth).orElse(null), ultimoRegistro.map(Payslip::getYear).orElse(null), DeliveryChannel.EMAIL, false, 1, detalhe.getErro());
                    return detalhe;
                }

                byte[] bytes = Files.readAllBytes(Path.of(filePath));
                boolean emailOk = emailService.sendEmailWithAttachment(
                        employee.getEmail(),
                        request.getAssunto() != null ? request.getAssunto() : "Holerite",
                        request.getMensagem() != null ? request.getMensagem() : "Segue seu holerite em anexo.",
                        bytes,
                        Path.of(filePath).getFileName().toString());
                detalhe.setEnviado(emailOk);
                if (!emailOk) {
                    detalhe.setErro("Falha no envio de email");
                }
                registrarLog(employee.getDocument(), ultimoRegistro.map(Payslip::getMonth).orElse(null), ultimoRegistro.map(Payslip::getYear).orElse(null), DeliveryChannel.EMAIL, detalhe.isEnviado(), 1, detalhe.getErro());
                
            } else if ("whatsapp".equals(request.getTipo())) {
                // 🔍 VALIDAÇÃO: Verificar se existe User com CPF correspondente e WhatsApp cadastrado
                String cpf = employee.getDocument();
                Optional<User> userOpt = userRepository.findByUsername(cpf);
                
                if (userOpt.isEmpty()) {
                    detalhe.setErro("Usuário não encontrado na tabela users para CPF: " + cpf);
                    registrarLog(cpf, null, null, DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    return detalhe;
                }
                
                User user = userOpt.get();
                String whatsappNumber = user.getWhatsapp();
                
                if (whatsappNumber == null || whatsappNumber.trim().isEmpty()) {
                    detalhe.setErro("WhatsApp não cadastrado na tabela users para CPF: " + cpf);
                    registrarLog(cpf, null, null, DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    return detalhe;
                }
                
                log.info("✅ WhatsApp encontrado para {} (CPF: {}): {}", 
                        employee.getName(), cpf, whatsappNumber);
                
                // Atualizar o telefone no detalhe para mostrar o número do WhatsApp
                detalhe.setTelefone(whatsappNumber);
                
                // Limpar número (remover caracteres não numéricos)
                String normalized = whatsappNumber.replaceAll("[^0-9]", "");
                // Regra BR opcional: se vier 55 + DDD + 9 + 8 dígitos, remover o 9 extra
                if (normalized.startsWith("55") && normalized.length() == 13) {
                    // 55 (0-1), DDD (2-3), possivel 9 em (4)
                    if (normalized.charAt(4) == '9') {
                        normalized = normalized.substring(0, 4) + normalized.substring(5);
                    }
                }
                detalhe.setDestinoNormalizado(normalized);
                log.info("🎯 Destino final normalizado: {}", normalized);
                
                // Validar tamanho (aceitar 10/11/12/13 para compatibilidade)
                int len = normalized.length();
                if (len != 10 && len != 11 && len != 12 && len != 13) {
                    detalhe.setErro("Número de WhatsApp em formato inválido (tamanhos aceitos: 10, 11, 12, 13)");
                    registrarLog(cpf, null, null, DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    return detalhe;
                }

                var ultimoRegistro = obterUltimoPayslip(cpf);
                
                if (ultimoRegistro.isEmpty()) {
                    log.warn("⚠️ Nenhum holerite encontrado para CPF: {}", cpf);
                    detalhe.setErro("Nenhum holerite encontrado para este funcionário");
                    registrarLog(cpf, null, null, DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    return detalhe;
                }
                
                Payslip payslip = ultimoRegistro.get();
                log.info("📋 Holerite encontrado: CPF={}, Mês={}, Ano={}, Arquivo={}", 
                        payslip.getCpf(), payslip.getMonth(), payslip.getYear(), payslip.getFileName());
                
                Optional<String> resolvedPathOpt = payslipService.resolvePayslipPathByCpfMonthYear(
                        payslip.getCpf(), payslip.getMonth(), payslip.getYear());
                
                String filePath = resolvedPathOpt.orElse(null);
                
                if (filePath == null) {
                    log.error("❌ Caminho do arquivo não pôde ser resolvido para: {}", payslip.getFileName());
                    detalhe.setErro("Caminho do arquivo não pôde ser determinado");
                    registrarLog(cpf, payslip.getMonth(), payslip.getYear(), DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    return detalhe;
                }
                
                log.info("🔍 Verificando arquivo em: {}", filePath);
                Path arquivoPath = Path.of(filePath);
                
                if (!Files.exists(arquivoPath)) {
                    log.error("❌ Arquivo não existe: {}", filePath);
                    log.info("📂 Diretório pai existe? {}", Files.exists(arquivoPath.getParent()));
                    detalhe.setErro("Arquivo de holerite não encontrado: " + arquivoPath.getFileName());
                    registrarLog(cpf, payslip.getMonth(), payslip.getYear(), DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    return detalhe;
                }
                
                // Obter caminho absoluto para enviar ao Baileys
                String absolutePath = arquivoPath.toAbsolutePath().toString();
                log.info("✅ Arquivo existe! Caminho absoluto: {}", absolutePath);
                log.info("📊 Tamanho do arquivo: {} bytes", Files.size(arquivoPath));

                String message = request.getMensagem() != null ? request.getMensagem() :
                        "Olá, segue seu holerite do mês. Em caso de dúvidas, contate o RH.";
                
                final String normalizedFinal = normalized;
                log.info("📤 Enviando via Baileys: phone={}, path={}", normalizedFinal, absolutePath);
                boolean sent = sendWhatsAppMessage(normalizedFinal, message, absolutePath);
                detalhe.setEnviado(sent);
                if (!sent) {
                    detalhe.setErro("Falha no envio via WhatsApp");
                    registrarLog(cpf, payslip.getMonth(), payslip.getYear(), DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    // Retry em 5 minutos, apenas 1 vez
                    scheduler.schedule(() -> retryWhatsApp(normalizedFinal, message, absolutePath, cpf, payslip.getMonth(), payslip.getYear()), 5, TimeUnit.MINUTES);
                } else {
                    log.info("✅ Holerite enviado com sucesso via WhatsApp para {}", normalizedFinal);
                    registrarLog(cpf, payslip.getMonth(), payslip.getYear(), DeliveryChannel.WHATSAPP, true, 1, null);
                }
                
            } else {
                detalhe.setErro("Tipo de envio inválido");
            }
            
        } catch (Exception e) {
            String empName = (employee != null ? employee.getName() : "desconhecido");
            String empDoc = (employee != null ? employee.getDocument() : (request.getCpf() != null ? request.getCpf() : "-"));
            log.error("❌ Erro ao enviar para {} ({}): {}", empName, empDoc, e.getMessage());
            detalhe.setErro("Erro interno: " + e.getMessage());
        }
        
        return detalhe;
    }

    private void registrarLog(String cpf, Integer month, Integer year, DeliveryChannel channel, boolean success, int attempts, String error) {
        PayslipDeliveryLog log = PayslipDeliveryLog.builder()
                .cpf(cpf)
                .month(month != null ? month : 0)
                .year(year != null ? year : 0)
                .channel(channel)
                .success(success)
                .attempts(attempts)
                .errorMessage(error)
                .build();
        deliveryLogRepository.save(log);
    }

    private Optional<Payslip> obterUltimoPayslip(String cpf) {
        List<Payslip> lista = payslipRepository.findAllByCpf(cpf);
        return lista == null || lista.isEmpty() ? Optional.empty() :
                Optional.of(lista.stream()
                        .filter(p -> p.getMonth() != null && p.getYear() != null)
                        .max(Comparator.comparing(Payslip::getYear).thenComparing(Payslip::getMonth))
                        .orElse(lista.get(0)));
    }

    /**
     * Envia mensagem via WhatsApp usando Baileys REST API (com correção DDI 55)
     */
    private boolean sendWhatsAppMessage(String phoneNumber, String message, String filePath) {
        log.info("📤 Enviando via Baileys REST API (porta 3333)");
        
        if (baileysRestService == null) {
            log.error("❌ BaileysRestService não disponível!");
            return false;
        }
        
        return baileysRestService.sendFileMessage(phoneNumber, message, filePath);
    }
    
    private void retryWhatsApp(String phone, String message, String filePath, String cpf, Integer month, Integer year) {
        try {
            boolean sent = sendWhatsAppMessage(phone, message, filePath);
            registrarLog(cpf, month, year, DeliveryChannel.WHATSAPP, sent, 2, sent ? null : "Retry falhou");
        } catch (Exception e) {
            registrarLog(cpf, month, year, DeliveryChannel.WHATSAPP, false, 2, e.getMessage());
        }
    }
    
    public EnvioResponse reenviarPorLogId(String logId) {
        EnvioResponse response = EnvioResponse.builder()
                .sucesso(false)
                .dataEnvio(LocalDateTime.now())
                .tipoEnvio("whatsapp")
                .totalEnviados(0)
                .totalFalhas(0)
                .detalhes(new ArrayList<>())
                .build();
        try {
            var log = deliveryLogRepository.findById(java.util.UUID.fromString(logId)).orElse(null);
            if (log == null) {
                response.setMensagem("Log não encontrado");
                return response;
            }
            var employeeOpt = employeeRepository.findByDocument(log.getCpf());
            if (employeeOpt.isEmpty()) {
                response.setMensagem("Funcionário não encontrado para o CPF do log");
                return response;
            }
            EnvioRequest req = new EnvioRequest();
            req.setTipo(log.getChannel() == DeliveryChannel.EMAIL ? "email" : "whatsapp");
            req.setFuncionarioId(employeeOpt.get().getId().toString());
            var det = processarEnvio(employeeOpt.get(), req);
            response.getDetalhes().add(det);
            if (det.isEnviado()) {
                response.setSucesso(true);
                response.setTotalEnviados(1);
                response.setMensagem("Reenvio realizado com sucesso");
            } else {
                response.setTotalFalhas(1);
                response.setMensagem(det.getErro());
            }
        } catch (Exception e) {
            response.setMensagem("Erro interno: " + e.getMessage());
        }
        return response;
    }

    public java.util.List<PayslipDeliveryLog> listarLogs(String cpf, Integer month, Integer year) {
        if (month != null && year != null) {
            return deliveryLogRepository.findByCpfAndMonthAndYear(cpf, month, year);
        }
        return deliveryLogRepository.findByCpfAndMonthAndYear(cpf, 0, 0);
    }
    
    /**
     * 🔍 Verifica se um funcionário tem WhatsApp disponível na tabela users
     */
    public boolean funcionarioTemWhatsApp(String cpf) {
        Optional<User> userOpt = userRepository.findByUsername(cpf);
        if (userOpt.isEmpty()) {
            return false;
        }
        
        String whatsapp = userOpt.get().getWhatsapp();
        return whatsapp != null && !whatsapp.trim().isEmpty();
    }
    
    /**
     * 📱 Obtém o número de WhatsApp de um funcionário
     */
    public String obterWhatsAppFuncionario(String cpf) {
        Optional<User> userOpt = userRepository.findByUsername(cpf);
        if (userOpt.isEmpty()) {
            return null;
        }
        
        return userOpt.get().getWhatsapp();
    }
} 