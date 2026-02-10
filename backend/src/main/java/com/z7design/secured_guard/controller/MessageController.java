package com.z7design.secured_guard.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMethod;

import com.z7design.secured_guard.dto.MessageRequestDTO;
import com.z7design.secured_guard.dto.MessageResponseDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.enums.MessageType;
import com.z7design.secured_guard.model.enums.MessageStatus;
import com.z7design.secured_guard.service.MessageService;
import com.z7design.secured_guard.service.UserService;
import com.z7design.secured_guard.model.User;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/messages")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "http://localhost:5173"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
@Slf4j
public class MessageController {
    
    @Autowired
    private MessageService messageService;
    
    @Autowired
    private UserService userService;
    
    /**
     * Envia uma mensagem
     */
    @PostMapping
    public ResponseEntity<MessageResponseDTO> sendMessage(
            @Valid @RequestBody MessageRequestDTO request,
            Authentication authentication) {
        
        try {
            log.info("Recebendo requisição para enviar mensagem: {}", request);
            
            String username = authentication.getName();
            log.info("Username autenticado: {}", username);
            
            UUID senderId = getUserIdFromUsername(username);
            
            if (senderId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            log.info("Sender ID encontrado: {}", senderId);
            
            MessageResponseDTO response = messageService.sendMessage(request, senderId);
            log.info("Mensagem enviada com sucesso: {}", response.getId());
            
            return ResponseEntity.ok(response);
        } catch (BusinessException e) {
            // Deixar o GlobalExceptionHandler tratar e retornar 409 com mensagem clara
            log.warn("Erro de negócio ao enviar mensagem: {}", e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            log.error("Erro inesperado ao enviar mensagem: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Busca mensagens recebidas
     */
    @GetMapping("/received")
    public ResponseEntity<Page<MessageResponseDTO>> getReceivedMessages(
            Authentication authentication,
            Pageable pageable) {
        
        try {
            // Garantir que pageable não seja null ou unpaged
            Pageable safePageable = (pageable == null || pageable.isUnpaged()) 
                ? PageRequest.of(0, 10) 
                : pageable;
            
            if (authentication == null) {
                log.error("Autenticação é null");
                return ResponseEntity.ok(new PageImpl<>(List.of(), safePageable, 0));
            }
            
            String username = authentication.getName();
            if (username == null || username.isEmpty()) {
                log.error("Username é null ou vazio");
                return ResponseEntity.ok(new PageImpl<>(List.of(), safePageable, 0));
            }
            
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                // Retornar página vazia ao invés de erro 400
                return ResponseEntity.ok(new PageImpl<>(List.of(), safePageable, 0));
            }
            
            Page<MessageResponseDTO> messages = messageService.getReceivedMessages(userId, safePageable);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Erro ao buscar mensagens recebidas: {}", e.getMessage(), e);
            // Retornar página vazia ao invés de erro 500 para não quebrar o frontend
            Pageable safePageable = (pageable == null || pageable.isUnpaged()) 
                ? PageRequest.of(0, 10) 
                : pageable;
            return ResponseEntity.ok(new PageImpl<>(List.of(), safePageable, 0));
        }
    }
    
    /**
     * Busca mensagens enviadas
     */
    @GetMapping("/sent")
    public ResponseEntity<Page<MessageResponseDTO>> getSentMessages(
            Authentication authentication,
            Pageable pageable) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            Page<MessageResponseDTO> messages = messageService.getSentMessages(userId, pageable);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Erro ao buscar mensagens enviadas: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Marca mensagem como lida
     */
    @PutMapping("/{messageId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID messageId,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            messageService.markAsRead(messageId, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao marcar mensagem como lida: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Conta mensagens não lidas
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Long> countUnreadMessages(Authentication authentication) {
        try {
            if (authentication == null) {
                log.error("Autenticação é null");
                return ResponseEntity.ok(0L);
            }
            
            String username = authentication.getName();
            if (username == null || username.isEmpty()) {
                log.error("Username é null ou vazio");
                return ResponseEntity.ok(0L);
            }
            
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                // Retornar 0 ao invés de erro 400
                return ResponseEntity.ok(0L);
            }
            
            try {
                Long count = messageService.countUnreadMessages(userId);
                return ResponseEntity.ok(count != null ? count : 0L);
            } catch (org.springframework.dao.DataAccessException e) {
                log.error("Erro de acesso ao banco de dados ao contar mensagens não lidas para usuário {}: {}", userId, e.getMessage(), e);
                return ResponseEntity.ok(0L);
            } catch (Exception e) {
                log.error("Erro inesperado ao contar mensagens não lidas para usuário {}: {}", userId, e.getMessage(), e);
                return ResponseEntity.ok(0L);
            }
        } catch (Exception e) {
            log.error("Erro ao contar mensagens não lidas: {}", e.getMessage(), e);
            // Retornar 0 ao invés de erro 500 para não quebrar o frontend
            return ResponseEntity.ok(0L);
        }
    }
    
    /**
     * Busca mensagens por tipo
     */
    @GetMapping("/type/{type}")
    public ResponseEntity<List<MessageResponseDTO>> getMessagesByType(@PathVariable MessageType type) {
        List<MessageResponseDTO> messages = messageService.getMessagesByType(type);
        
        return ResponseEntity.ok(messages);
    }
    
    /**
     * Busca mensagens por status
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<Page<MessageResponseDTO>> getMessagesByStatus(
            @PathVariable MessageStatus status,
            Authentication authentication,
            Pageable pageable) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            Page<MessageResponseDTO> messages = messageService.getMessagesByStatus(userId, status, pageable);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Erro ao buscar mensagens por status: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Obtém estatísticas de mensagens
     */
    @GetMapping("/stats")
    public ResponseEntity<MessageService.MessageStatistics> getMessageStatistics(Authentication authentication) {
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            MessageService.MessageStatistics stats = messageService.getMessageStatistics(userId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Erro ao buscar estatísticas de mensagens: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Busca mensagens não lidas
     */
    @GetMapping("/unread")
    public ResponseEntity<List<MessageResponseDTO>> getUnreadMessages(Authentication authentication) {
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            List<MessageResponseDTO> messages = messageService.getUnreadMessages(userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Erro ao buscar mensagens não lidas: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Marca todas as mensagens como lidas
     */
    @PutMapping("/mark-all-read")
    public ResponseEntity<Void> markAllAsRead(Authentication authentication) {
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            messageService.markAllAsRead(userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao marcar todas as mensagens como lidas: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Arquiva mensagem
     */
    @PutMapping("/{messageId}/archive")
    public ResponseEntity<Void> archiveMessage(
            @PathVariable UUID messageId,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            messageService.archiveMessage(messageId, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao arquivar mensagem: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Restaura mensagem arquivada
     */
    @PutMapping("/{messageId}/restore")
    public ResponseEntity<Void> restoreMessage(
            @PathVariable UUID messageId,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            messageService.restoreMessage(messageId, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao restaurar mensagem: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Deleta mensagem com motivo
     */
    @DeleteMapping("/{messageId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID messageId,
            @RequestParam String reason,
            Authentication authentication,
            @RequestHeader(value = "X-Forwarded-For", required = false) String ipAddress) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            if (reason == null || reason.trim().isEmpty()) {
                log.error("Motivo da exclusão é obrigatório");
                return ResponseEntity.badRequest().build();
            }
            
            messageService.deleteMessage(messageId, userId, reason, ipAddress);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao deletar mensagem: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Método auxiliar para obter o ID do usuário a partir do username
     */
    private UUID getUserIdFromUsername(String username) {
        try {
            return userService.findByUsername(username)
                .map(User::getId)
                .orElse(null);
        } catch (Exception e) {
            log.error("Erro ao buscar usuário por username: {}", username, e);
            return null;
        }
    }
} 