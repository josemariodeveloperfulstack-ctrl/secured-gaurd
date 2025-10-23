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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@RequiredArgsConstructor
@Slf4j
public class EnvioService {
    
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final WhatsAppService whatsAppService;
    private final BaileysRestService baileysRestService;
    private final PayslipRepository payslipRepository;
    private final PayslipDeliveryLogRepository deliveryLogRepository;
    private final PayslipService payslipService;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    
    public EnvioResponse enviarIndividual(EnvioRequest request) {
        log.info("🚀 Iniciando envio individual para funcionário ID: {}", request.getFuncionarioId());
        
        EnvioResponse response = EnvioResponse.builder()
                .sucesso(false)
                .dataEnvio(LocalDateTime.now())
                .tipoEnvio(request.getTipo())
                .totalEnviados(0)
                .totalFalhas(0)
                .detalhes(new ArrayList<>())
                .build();
        
        try {
            Optional<Employee> employeeOpt;
            
            // Buscar funcionário por ID ou CPF
            if (request.getFuncionarioId() != null && !request.getFuncionarioId().trim().isEmpty()) {
                employeeOpt = employeeRepository.findById(UUID.fromString(request.getFuncionarioId()));
            } else if (request.getCpf() != null && !request.getCpf().trim().isEmpty()) {
                employeeOpt = employeeRepository.findByDocument(request.getCpf());
            } else {
                response.setMensagem("ID do funcionário ou CPF é obrigatório");
                return response;
            }
            
            if (employeeOpt.isEmpty()) {
                response.setMensagem("Funcionário não encontrado");
                return response;
            }
            
            Employee employee = employeeOpt.get();
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
        log.info("🚀 Iniciando envio em massa para {} funcionários", request.getFuncionarioIds().size());
        
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
            
            for (Employee employee : employees) {
                EnvioResponse.DetalheEnvio detalhe = processarEnvio(employee, request);
                response.getDetalhes().add(detalhe);
                
                if (detalhe.isEnviado()) {
                    response.setTotalEnviados(response.getTotalEnviados() + 1);
                } else {
                    response.setTotalFalhas(response.getTotalFalhas() + 1);
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
        log.info("🚀 Iniciando envio para todos os funcionários com {}", request.getTipo());
        
        EnvioResponse response = EnvioResponse.builder()
                .sucesso(false)
                .dataEnvio(LocalDateTime.now())
                .tipoEnvio(request.getTipo())
                .totalEnviados(0)
                .totalFalhas(0)
                .detalhes(new ArrayList<>())
                .build();
        
        try {
            List<Employee> employees;
            
            if ("email".equals(request.getTipo())) {
                employees = employeeRepository.findByEmailIsNotNullAndEmailNot("");
            } else if ("whatsapp".equals(request.getTipo())) {
                // 🔍 Para WhatsApp, buscar funcionários que têm User correspondente com WhatsApp cadastrado
                employees = employeeRepository.findAll().stream()
                    .filter(employee -> {
                        String cpf = employee.getDocument();
                        Optional<User> userOpt = userRepository.findByUsername(cpf);
                        return userOpt.isPresent() && 
                               userOpt.get().getWhatsapp() != null && 
                               !userOpt.get().getWhatsapp().trim().isEmpty();
                    })
                    .toList();
            } else {
                response.setMensagem("Tipo de envio inválido");
                return response;
            }
            
            log.info("📋 Encontrados {} funcionários para envio via {}", employees.size(), request.getTipo());
            
            for (Employee employee : employees) {
                EnvioResponse.DetalheEnvio detalhe = processarEnvio(employee, request);
                response.getDetalhes().add(detalhe);
                
                if (detalhe.isEnviado()) {
                    response.setTotalEnviados(response.getTotalEnviados() + 1);
                } else {
                    response.setTotalFalhas(response.getTotalFalhas() + 1);
                }
            }
            
            response.setSucesso(response.getTotalFalhas() == 0);
            response.setMensagem(String.format("Envio para todos concluído. Enviados: %d, Falhas: %d", 
                    response.getTotalEnviados(), response.getTotalFalhas()));
            
        } catch (Exception e) {
            log.error("❌ Erro no envio para todos: {}", e.getMessage());
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
                // Normalizar número para formato 55...
                String tmp = whatsappNumber.replaceAll("[^0-9]", "");
                if (!tmp.startsWith("55")) {
                    tmp = "55" + tmp;
                }
                final String normalized = tmp;
                if (normalized.length() < 12 || normalized.length() > 13) {
                    detalhe.setErro("Número de WhatsApp em formato inválido");
                    registrarLog(cpf, null, null, DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    return detalhe;
                }

                var ultimoRegistro = obterUltimoPayslip(cpf);
                Optional<String> resolvedPathOpt = ultimoRegistro.map(p ->
                        payslipService.resolvePayslipPathByCpfMonthYear(p.getCpf(), p.getMonth(), p.getYear()).orElse(null)
                );
                String filePath = resolvedPathOpt.orElse(null);
                if (filePath == null || !Files.exists(Path.of(filePath))) {
                    detalhe.setErro("Arquivo de holerite não encontrado para envio via WhatsApp");
                    registrarLog(cpf, ultimoRegistro.map(Payslip::getMonth).orElse(null), ultimoRegistro.map(Payslip::getYear).orElse(null), DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    return detalhe;
                }

                String message = request.getMensagem() != null ? request.getMensagem() :
                        "Olá, segue seu holerite do mês. Em caso de dúvidas, contate o RH.";
                boolean sent = baileysRestService.sendFileMessage(normalized, message, filePath);
                detalhe.setEnviado(sent);
                if (!sent) {
                    detalhe.setErro("Falha no envio via WhatsApp");
                    registrarLog(cpf, ultimoRegistro.map(Payslip::getMonth).orElse(null), ultimoRegistro.map(Payslip::getYear).orElse(null), DeliveryChannel.WHATSAPP, false, 1, detalhe.getErro());
                    // Retry em 5 minutos, apenas 1 vez
                    scheduler.schedule(() -> retryWhatsApp(normalized, message, filePath, cpf, ultimoRegistro.map(Payslip::getMonth).orElse(null), ultimoRegistro.map(Payslip::getYear).orElse(null)), 5, TimeUnit.MINUTES);
                } else {
                    registrarLog(cpf, ultimoRegistro.map(Payslip::getMonth).orElse(null), ultimoRegistro.map(Payslip::getYear).orElse(null), DeliveryChannel.WHATSAPP, true, 1, null);
                }
                
            } else {
                detalhe.setErro("Tipo de envio inválido");
            }
            
        } catch (Exception e) {
            log.error("❌ Erro ao enviar para {} ({}): {}", 
                    employee.getName(), employee.getDocument(), e.getMessage());
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

    private void retryWhatsApp(String phone, String message, String filePath, String cpf, Integer month, Integer year) {
        try {
            boolean sent = baileysRestService.sendFileMessage(phone, message, filePath);
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