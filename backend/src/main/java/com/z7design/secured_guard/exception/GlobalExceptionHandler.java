package com.z7design.secured_guard.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.apache.catalina.connector.ClientAbortException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(EmailAuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleEmailAuthentication(EmailAuthenticationException ex,
            WebRequest request) {
        log.warn("Falha de autenticação de e-mail: {}", ex.getMessage());
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.UNAUTHORIZED.value());
        body.put("error", "EMAIL_AUTH_FAILED");
        body.put("message", ex.getMessage());
        body.put("path", request.getDescription(false).replace("uri=", ""));
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex, WebRequest request) {
        log.warn("Recurso não encontrado: {}", ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("RESOURCE_NOT_FOUND")
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex, WebRequest request) {
        log.warn("Erro de negócio: {}", ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.CONFLICT.value())
                .error("BUSINESS_ERROR")
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(MethodArgumentNotValidException ex,
            WebRequest request) {
        log.warn("Erro de validação: {}", ex.getMessage());

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });

        ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("VALIDATION_ERROR")
                .message("Dados inválidos fornecidos")
                .path(request.getDescription(false).replace("uri=", ""))
                .fieldErrors(fieldErrors)
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ValidationErrorResponse> handleConstraintViolation(ConstraintViolationException ex,
            WebRequest request) {
        log.warn("Erro de constraint: {}", ex.getMessage());

        Map<String, String> fieldErrors = ex.getConstraintViolations().stream()
                .collect(Collectors.toMap(
                        violation -> violation.getPropertyPath().toString(),
                        ConstraintViolation::getMessage));

        ValidationErrorResponse errorResponse = ValidationErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("CONSTRAINT_VIOLATION")
                .message("Violação de restrições de dados")
                .path(request.getDescription(false).replace("uri=", ""))
                .fieldErrors(fieldErrors)
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        log.warn("Acesso negado para {}: {}", request.getDescription(false), ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.FORBIDDEN.value())
                .error("ACCESS_DENIED")
                .message("Acesso negado. Você não tem permissão para realizar esta operação.")
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, WebRequest request) {
        log.warn("Corpo da requisição inválido: {}", ex.getMessage());
        String message = "Dados inválidos no corpo da requisição.";
        Throwable cause = ex.getCause();
        if (cause != null && cause.getMessage() != null) {
            String causeMsg = cause.getMessage();
            if (causeMsg.contains("WorkPostStatus") || causeMsg.contains("WorkPostType")) {
                message = "Tipo ou status do posto inválido. Use os valores do sistema (ex.: POSTO_24H, EM_IMPLANTACAO).";
            } else if (causeMsg.contains("not one of the values accepted")) {
                message = "Um dos valores enviados não é aceito pelo servidor: " + causeMsg;
            }
        }

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("INVALID_REQUEST_BODY")
                .message(message)
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex, WebRequest request) {
        log.warn("Argumento inválido: {}", ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("INVALID_ARGUMENT")
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex,
            WebRequest request) {
        String path = request.getDescription(false).replace("uri=", "");
        log.warn("Violação de integridade de dados: {} | path: {}", ex.getMessage(), path);
        if (ex.getCause() != null) {
            log.warn("Causa: {}", ex.getCause().getMessage());
        }

        String message = "Erro ao salvar dados. Verifique se há informações duplicadas ou inválidas.";

        // Tentar extrair uma mensagem mais específica da exceção
        String msg = ex.getMessage() != null ? ex.getMessage() : "";
        String causeMsg = ex.getCause() != null ? ex.getCause().getMessage() : "";
        String rootMsg = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : "";
        String fullMsg = (msg + " " + causeMsg + " " + rootMsg).toLowerCase();
        boolean isClientsPath = path.contains("/clients") || path.contains("clients");

        // Importante: o SQL do Hibernate lista colunas (ex.: email) em qualquer INSERT/UPDATE.
        // Não usar contains("email") genérico — isso gerava "Email já está em uso" falso.
        boolean emailUniqueViolation = fullMsg.contains("key (email)")
                || fullMsg.contains("(email)=")
                || fullMsg.contains("users_email")
                || fullMsg.contains("uk_users_email")
                || (fullMsg.contains("uq_") && fullMsg.contains("email") && fullMsg.contains("duplicate"))
                || (fullMsg.contains("unique") && fullMsg.contains("email")
                        && (fullMsg.contains("users") || fullMsg.contains("supervisors") || fullMsg.contains("units")));

        if (isClientsPath && (fullMsg.contains("clients_cnpj")
                || fullMsg.contains("cnpj_key")
                || (fullMsg.contains("duplicate") && fullMsg.contains("cnpj"))
                || (fullMsg.contains("unique") && fullMsg.contains("cnpj")))) {
            message = "Já existe um cliente cadastrado com este CNPJ.";
        } else if (fullMsg.contains("chk_messages_type")) {
            message = "Falha ao registrar notificação interna (tipo de mensagem inválido). O cadastro principal pode ter sido concluído — atualize a lista e tente novamente se necessário.";
        } else if (isClientsPath && fullMsg.contains("company_id")) {
            message = "Empresa é obrigatória ou inválida para o cliente.";
        } else if (isClientsPath && (fullMsg.contains("22001") || fullMsg.contains("too long") || fullMsg.contains("value too long"))) {
            message = "Um dos campos do cliente excede o tamanho permitido (verifique UF com 2 letras, telefone e CEP).";
        } else if (isClientsPath) {
            message = "Não foi possível salvar o cliente. Verifique CNPJ, empresa vinculada e demais campos obrigatórios.";
        } else if (fullMsg.contains("username") || (fullMsg.contains("uk_") && fullMsg.contains("username"))) {
            message = "Nome de usuário já está em uso";
        } else if (emailUniqueViolation) {
            message = "Email já está em uso";
        } else if (fullMsg.contains("contract_number") || fullMsg.contains("contracts_contract_number")) {
            message = "Número do contrato já está em uso por outro contrato.";
        } else if (path.contains("employee-certifications")) {
            message = "Erro ao salvar treinamento/certificação. Verifique se o número da certificação ou os dados já existem.";
        } else if (path.contains("remanejamentos") && (fullMsg.contains("remanejamento_id") || fullMsg.contains("remanejamentos_historico") || fullMsg.contains("not-null"))) {
            message = "Não foi possível concluir a exclusão do remanejamento (integridade dos dados). Execute as migrações do banco (Flyway) ou contate o suporte.";
        } else if (path.contains("/dependents") || path.contains("dependents")) {
            if (fullMsg.contains("muito longo") || fullMsg.contains("22001")) {
                if (fullMsg.contains("rg")) {
                    message = "RG do dependente é muito longo (máximo 50 caracteres). Use só o número ou abrevie órgão/UF.";
                } else {
                    message = "Um dos campos do dependente excede o tamanho permitido. Revise RG, nome e demais textos.";
                }
            } else if (fullMsg.contains("cpf") || fullMsg.contains("dependents")) {
                message = "Este CPF já está cadastrado como dependente (restrição no banco de dados). Use outro CPF ou edite o registo existente.";
            }
        }

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.CONFLICT.value())
                .error("DATA_INTEGRITY_VIOLATION")
                .message(message)
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    /**
     * SockJS/WebSocket: ao desconectar, o transporte xhr_streaming usa Content-Type
     * application/javascript.
     * Não há converter para serializar ErrorResponse/Map nesse formato. Retornar
     * 500 vazio evita erro em cascata.
     */
    @ExceptionHandler(HttpMessageNotWritableException.class)
    public ResponseEntity<Void> handleHttpMessageNotWritable(HttpMessageNotWritableException ex, WebRequest request) {
        String path = request.getDescription(false);
        if (path.contains("/ws/") || path.contains("/websocket")) {
            log.debug("WebSocket/SockJS: ignorando erro de serialização (cliente desconectado): {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
        log.warn("Erro de serialização HTTP: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }

    @ExceptionHandler(ClientAbortException.class)
    public ResponseEntity<Void> handleClientAbortException(ClientAbortException ex, WebRequest request) {
        // ClientAbortException é uma exceção normal quando o cliente cancela a conexão
        // Não é um erro real do servidor, então apenas logamos em debug
        String path = request.getDescription(false);
        log.debug("Cliente cancelou a conexão para: {} - {}", path, ex.getMessage());

        // Retornar null para não enviar resposta (a conexão já foi fechada)
        return null;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGenericException(Exception ex, WebRequest request) {
        // Ignorar ClientAbortException no handler genérico (já tratado acima)
        if (ex instanceof ClientAbortException ||
                (ex.getCause() != null && ex.getCause() instanceof ClientAbortException)) {
            return null;
        }

        log.error("Erro interno do servidor: {}", ex.getMessage(), ex);

        // Log específico para debugging
        String requestPath = request.getDescription(false);
        if (requestPath.contains("/ws/") || requestPath.contains("/websocket")) {
            log.error("❌ [WebSocket] ERRO NO WEBSOCKET - Path: {}", requestPath);
            log.error("❌ [WebSocket] Classe da exceção: {}", ex.getClass().getName());
            log.error("❌ [WebSocket] Mensagem: {}", ex.getMessage());
            log.error("❌ [WebSocket] Stack trace completo: ", ex);
            if (ex.getCause() != null) {
                log.error("❌ [WebSocket] Causa raiz: {}", ex.getCause().getMessage());
                if (ex.getCause().getCause() != null) {
                    log.error("❌ [WebSocket] Causa da causa: {}", ex.getCause().getCause().getMessage());
                }
            }
        } else if (requestPath.contains("/auth/login")) {
            log.error("ERRO NO LOGIN - Classe da exceção: {}", ex.getClass().getName());
            log.error("ERRO NO LOGIN - Stack trace completo: ", ex);
            if (ex.getCause() != null) {
                log.error("ERRO NO LOGIN - Causa raiz: {}", ex.getCause().getMessage());
            }
        } else if (requestPath.contains("/work-posts/all")) {
            log.error("ERRO NO WORK-POSTS/ALL - Classe da exceção: {}", ex.getClass().getName());
            log.error("ERRO NO WORK-POSTS/ALL - Mensagem: {}", ex.getMessage());
            log.error("ERRO NO WORK-POSTS/ALL - Stack trace completo: ", ex);
            if (ex.getCause() != null) {
                log.error("ERRO NO WORK-POSTS/ALL - Causa raiz: {}", ex.getCause().getMessage());
                if (ex.getCause().getCause() != null) {
                    log.error("ERRO NO WORK-POSTS/ALL - Causa da causa: {}", ex.getCause().getCause().getMessage());
                }
            }
        }

        // Em rotas WebSocket/SockJS não retornar body JSON (Content-Type
        // application/javascript incompatível)
        if (requestPath.contains("/ws/") || requestPath.contains("/websocket")) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        String path = request.getDescription(false).replace("uri=", "");
        try {
            ErrorResponse errorResponse = ErrorResponse.builder()
                    .timestamp(LocalDateTime.now())
                    .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                    .error("INTERNAL_SERVER_ERROR")
                    .message("Erro interno do servidor. Tente novamente mais tarde.")
                    .path(path)
                    .build();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        } catch (Throwable serializationFailure) {
            log.error("Fallback de erro HTTP (classloader): {}", serializationFailure.getMessage());
            Map<String, Object> body = new HashMap<>();
            body.put("timestamp", LocalDateTime.now().toString());
            body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
            body.put("error", "INTERNAL_SERVER_ERROR");
            body.put("message", ex.getMessage() != null ? ex.getMessage() : "Erro interno do servidor");
            body.put("path", path);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        }
    }

    // Exceções específicas do módulo operacional
    @ExceptionHandler(EquipmentNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEquipmentNotFound(EquipmentNotFoundException ex, WebRequest request) {
        log.warn("Equipamento não encontrado: {}", ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("EQUIPMENT_NOT_FOUND")
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(UnitNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUnitNotFound(UnitNotFoundException ex, WebRequest request) {
        log.warn("Unidade não encontrada: {}", ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("UNIT_NOT_FOUND")
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(WorkPostNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleWorkPostNotFound(WorkPostNotFoundException ex, WebRequest request) {
        log.warn("Posto de trabalho não encontrado: {}", ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("WORK_POST_NOT_FOUND")
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(EquipmentAlreadyAssignedException.class)
    public ResponseEntity<ErrorResponse> handleEquipmentAlreadyAssigned(EquipmentAlreadyAssignedException ex,
            WebRequest request) {
        log.warn("Equipamento já atribuído: {}", ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.CONFLICT.value())
                .error("EQUIPMENT_ALREADY_ASSIGNED")
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    @ExceptionHandler(EquipmentExpiredException.class)
    public ResponseEntity<ErrorResponse> handleEquipmentExpired(EquipmentExpiredException ex, WebRequest request) {
        log.warn("Equipamento expirado: {}", ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("EQUIPMENT_EXPIRED")
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }
}
