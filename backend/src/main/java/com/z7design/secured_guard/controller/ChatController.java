package com.z7design.secured_guard.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.z7design.secured_guard.dto.ChatMessageRequestDTO;
import com.z7design.secured_guard.dto.ChatMessageResponseDTO;
import com.z7design.secured_guard.dto.ReactionSummaryDTO;
// import com.z7design.secured_guard.dto.ChatUserDTO;
import com.z7design.secured_guard.service.ChatService;
import com.z7design.secured_guard.service.MessageReactionService;
import com.z7design.secured_guard.service.NotificationService;
import com.z7design.secured_guard.service.UserService;
import com.z7design.secured_guard.model.User;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;

import com.z7design.secured_guard.service.ChatFileService;
import com.z7design.secured_guard.service.ChatFileService.ChatFileInfo;
import com.z7design.secured_guard.exception.BusinessException;

import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/chat")
@Slf4j
public class ChatController {
    
    @Autowired
    private ChatService chatService;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private MessageReactionService reactionService;
    
    @Autowired
    private ChatFileService chatFileService;
    
    @Autowired
    private com.z7design.secured_guard.service.ChatMessageActionService actionService;
    
    /**
     * Envia mensagem de chat (texto)
     */
    @PostMapping("/send")
    public ResponseEntity<ChatMessageResponseDTO> sendMessage(
            @Valid @RequestBody ChatMessageRequestDTO request,
            Authentication authentication) {
        
        String username = authentication.getName();
        log.info("Enviando mensagem de chat para usuário: {}", username);
        
        ChatMessageResponseDTO response = chatService.sendChatMessage(request, username);
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Envia mensagem de chat com arquivo (imagem, áudio, vídeo, documento)
     */
    @PostMapping(value = "/send-with-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatMessageResponseDTO> sendMessageWithFile(
            @RequestParam(value = "content", required = false) String content,
            @RequestParam(value = "recipientId", required = false) UUID recipientId,
            @RequestParam(value = "groupId", required = false) UUID groupId,
            @RequestParam(value = "departmentId", required = false) UUID departmentId,
            @RequestParam(value = "type", required = false, defaultValue = "TEXT") String typeStr,
            @RequestParam(value = "replyToId", required = false) UUID replyToId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        
        String username = authentication.getName();
        log.info("Enviando mensagem de chat com arquivo para usuário: {}", username);
        
        try {
            // Validar que pelo menos um destinatário foi especificado
            if (recipientId == null && groupId == null && departmentId == null) {
                log.error("Nenhum destinatário especificado para mensagem com arquivo");
                return ResponseEntity.badRequest().build();
            }
            
            // Validar arquivo
            if (file == null || file.isEmpty()) {
                log.error("Arquivo não fornecido ou vazio");
                return ResponseEntity.badRequest().build();
            }
            
            // Determinar tipo de mensagem baseado no arquivo
            com.z7design.secured_guard.model.enums.ChatMessageType messageType = 
                determineMessageTypeFromFile(file);
            
            // Salvar arquivo
            ChatFileInfo fileInfo = chatFileService.saveChatFile(file, messageType);
            
            // Criar DTO da requisição
            ChatMessageRequestDTO request = new ChatMessageRequestDTO();
            request.setContent(content != null && !content.trim().isEmpty() ? content : "");
            request.setRecipientId(recipientId);
            request.setGroupId(groupId);
            request.setDepartmentId(departmentId);
            request.setType(messageType);
            request.setReplyToId(replyToId);
            request.setFileUrl(fileInfo.getUrl());
            request.setFileName(fileInfo.getOriginalName());
            request.setFileSize(fileInfo.getSize());
            request.setFileContentType(fileInfo.getContentType());
            
            ChatMessageResponseDTO response = chatService.sendChatMessage(request, username);
            
            return ResponseEntity.ok(response);
            
        } catch (BusinessException e) {
            log.error("Erro de negócio ao enviar mensagem com arquivo: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem com arquivo: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }
    
    /**
     * Determina o tipo de mensagem baseado no arquivo
     */
    private com.z7design.secured_guard.model.enums.ChatMessageType determineMessageTypeFromFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) {
            return com.z7design.secured_guard.model.enums.ChatMessageType.FILE;
        }
        
        if (contentType.startsWith("image/")) {
            return com.z7design.secured_guard.model.enums.ChatMessageType.IMAGE;
        } else if (contentType.startsWith("audio/")) {
            return com.z7design.secured_guard.model.enums.ChatMessageType.AUDIO;
        } else if (contentType.startsWith("video/")) {
            return com.z7design.secured_guard.model.enums.ChatMessageType.VIDEO;
        } else {
            return com.z7design.secured_guard.model.enums.ChatMessageType.FILE;
        }
    }
    
    /**
     * Busca conversa entre dois usuários
     */
    @GetMapping("/conversation/{userId}")
    public ResponseEntity<List<ChatMessageResponseDTO>> getConversation(
            @PathVariable UUID userId,
            Authentication authentication) {
        
        String currentUsername = authentication.getName();
        log.info("Buscando conversa para usuário: {} com: {}", currentUsername, userId);
        
        List<ChatMessageResponseDTO> messages = chatService.getConversation(currentUsername, userId);
        
        return ResponseEntity.ok(messages);
    }
    
    /**
     * Busca mensagens de um grupo
     */
    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<ChatMessageResponseDTO>> getGroupMessages(@PathVariable UUID groupId) {
        List<ChatMessageResponseDTO> messages = chatService.getGroupMessages(groupId);
        
        return ResponseEntity.ok(messages);
    }
    
    /**
     * Busca mensagens de um departamento
     */
    @GetMapping("/department/{departmentId}")
    public ResponseEntity<List<ChatMessageResponseDTO>> getDepartmentMessages(@PathVariable UUID departmentId) {
        List<ChatMessageResponseDTO> messages = chatService.getDepartmentMessages(departmentId);
        
        return ResponseEntity.ok(messages);
    }
    
    /**
     * Busca conversas recentes
     */
    @GetMapping("/recent")
    public ResponseEntity<List<ChatMessageResponseDTO>> getRecentConversations(Authentication authentication) {
        try {
            // Obter o ID do usuário a partir do username
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            List<ChatMessageResponseDTO> messages = chatService.getRecentConversations(userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Erro ao buscar conversas recentes: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /*
    /**
     * Busca usuários disponíveis para chat
     */
    /*
    @GetMapping("/users")
    public ResponseEntity<List<ChatUserDTO>> getAvailableUsers(Authentication authentication) {
        UUID currentUserId = UUID.fromString(authentication.getName());
        List<ChatUserDTO> users = chatService.getAvailableUsersForChat(currentUserId);
        return ResponseEntity.ok(users);
    }
    */
    
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
            
            chatService.markAsRead(messageId, userId);
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
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            Long count = chatService.countUnreadMessages(userId);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            log.error("Erro ao contar mensagens não lidas: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Busca mensagens não lidas
     */
    @GetMapping("/unread")
    public ResponseEntity<List<ChatMessageResponseDTO>> getUnreadMessages(Authentication authentication) {
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            List<ChatMessageResponseDTO> messages = chatService.getUnreadMessages(userId);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            log.error("Erro ao buscar mensagens não lidas: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Edita mensagem
     */
    @PutMapping("/{messageId}/edit")
    public ResponseEntity<ChatMessageResponseDTO> editMessage(
            @PathVariable UUID messageId,
            @RequestParam String content,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            ChatMessageResponseDTO response = chatService.editMessage(messageId, content, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Erro ao editar mensagem: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Adiciona ou remove reação de uma mensagem
     */
    @PostMapping("/{messageId}/reaction")
    public ResponseEntity<ReactionSummaryDTO> toggleReaction(
            @PathVariable UUID messageId,
            @RequestParam String emoji,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            ReactionSummaryDTO reaction = reactionService.toggleReaction(messageId, userId, emoji);
            
            // Publicar atualização via WebSocket
            messagingTemplate.convertAndSend("/topic/chat/message/" + messageId + "/reactions", reaction);
            
            return ResponseEntity.ok(reaction);
        } catch (Exception e) {
            log.error("Erro ao alternar reação: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Busca todas as reações de uma mensagem
     */
    @GetMapping("/{messageId}/reactions")
    public ResponseEntity<List<ReactionSummaryDTO>> getMessageReactions(
            @PathVariable UUID messageId,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            List<ReactionSummaryDTO> reactions = reactionService.getAllReactionsForMessage(messageId, userId);
            return ResponseEntity.ok(reactions);
        } catch (Exception e) {
            log.error("Erro ao buscar reações: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Fixa ou desfixa uma mensagem
     */
    @PostMapping("/{messageId}/pin")
    public ResponseEntity<Boolean> togglePin(
            @PathVariable UUID messageId,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            log.debug("Tentando alternar fixação da mensagem {} para usuário {}", messageId, userId);
            boolean isPinned = actionService.togglePin(messageId, userId);
            log.debug("Fixação alternada com sucesso: {}", isPinned);
            return ResponseEntity.ok(isPinned);
        } catch (org.springframework.dao.DataAccessException e) {
            log.error("Erro de acesso ao banco de dados ao alternar fixação: {}", e.getMessage(), e);
            if (e.getCause() != null) {
                log.error("Causa: {}", e.getCause().getMessage());
            }
            return ResponseEntity.internalServerError().build();
        } catch (com.z7design.secured_guard.exception.BusinessException e) {
            log.error("Erro de negócio ao alternar fixação: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Erro inesperado ao alternar fixação: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Verifica se uma mensagem está fixada
     */
    @GetMapping("/{messageId}/pin")
    public ResponseEntity<Boolean> isPinned(
            @PathVariable UUID messageId,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            boolean isPinned = actionService.isPinned(messageId, userId);
            return ResponseEntity.ok(isPinned);
        } catch (Exception e) {
            log.error("Erro ao verificar fixação: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Adiciona ou remove uma mensagem dos favoritos
     */
    @PostMapping("/{messageId}/favorite")
    public ResponseEntity<Boolean> toggleFavorite(
            @PathVariable UUID messageId,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            log.debug("Tentando alternar favorito da mensagem {} para usuário {}", messageId, userId);
            boolean isFavorite = actionService.toggleFavorite(messageId, userId);
            log.debug("Favorito alternado com sucesso: {}", isFavorite);
            return ResponseEntity.ok(isFavorite);
        } catch (org.springframework.dao.DataAccessException e) {
            log.error("Erro de acesso ao banco de dados ao alternar favorito: {}", e.getMessage(), e);
            if (e.getCause() != null) {
                log.error("Causa: {}", e.getCause().getMessage());
            }
            return ResponseEntity.internalServerError().build();
        } catch (com.z7design.secured_guard.exception.BusinessException e) {
            log.error("Erro de negócio ao alternar favorito: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Erro inesperado ao alternar favorito: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Verifica se uma mensagem está nos favoritos
     */
    @GetMapping("/{messageId}/favorite")
    public ResponseEntity<Boolean> isFavorite(
            @PathVariable UUID messageId,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            boolean isFavorite = actionService.isFavorite(messageId, userId);
            return ResponseEntity.ok(isFavorite);
        } catch (Exception e) {
            log.error("Erro ao verificar favorito: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Denuncia uma mensagem
     */
    @PostMapping("/{messageId}/report")
    public ResponseEntity<Void> reportMessage(
            @PathVariable UUID messageId,
            @RequestParam String reason,
            @RequestParam(required = false) String description,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            actionService.reportMessage(messageId, userId, reason, description);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao denunciar mensagem: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Encaminha uma mensagem para novos destinatários
     */
    @PostMapping("/{messageId}/forward")
    public ResponseEntity<Void> forwardMessage(
            @PathVariable UUID messageId,
            @RequestParam(required = false) UUID[] recipientIds,
            @RequestParam(required = false) UUID[] groupIds,
            @RequestParam(required = false) UUID[] departmentIds,
            Authentication authentication) {
        
        try {
            String username = authentication.getName();
            UUID userId = getUserIdFromUsername(username);
            
            if (userId == null) {
                log.error("Usuário não encontrado para username: {}", username);
                return ResponseEntity.badRequest().build();
            }
            
            actionService.forwardMessage(messageId, userId, recipientIds, groupIds, departmentIds);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao encaminhar mensagem: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Recebe evento de digitação via WebSocket e propaga para os destinatários
     */
    @MessageMapping("/chat/typing")
    public void handleTypingEvent(@Payload TypingEvent typingEvent, SimpMessageHeaderAccessor headerAccessor) {
        log.info("Usuário {} está digitando na conversa {}", typingEvent.getUserId(), typingEvent.getConversationId());
        // Enviar notificação de digitação para os participantes da conversa
        if (typingEvent.getRecipientId() != null) {
            notificationService.sendChatTypingNotification(typingEvent.getRecipientId(), typingEvent);
        }
        if (typingEvent.getGroupId() != null) {
            // Enviar para todos do grupo via tópico
            try {
                String destination = "/topic/chat/group/" + typingEvent.getGroupId() + "/typing";
                messagingTemplate.convertAndSend(destination, typingEvent);
                log.info("Evento de digitação publicado para grupo: {} (destino: {})", typingEvent.getGroupId(), destination);
            } catch (Exception e) {
                log.error("Erro ao publicar evento de digitação para grupo: {}", e.getMessage(), e);
            }
        }
        if (typingEvent.getDepartmentId() != null) {
            // Enviar para todos do departamento via tópico
            try {
                String destination = "/topic/chat/department/" + typingEvent.getDepartmentId() + "/typing";
                messagingTemplate.convertAndSend(destination, typingEvent);
                log.info("Evento de digitação publicado para departamento: {} (destino: {})", typingEvent.getDepartmentId(), destination);
            } catch (Exception e) {
                log.error("Erro ao publicar evento de digitação para departamento: {}", e.getMessage(), e);
            }
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

// DTO para evento de digitação
class TypingEvent {
    private String userId;
    private String userName;
    private String conversationId;
    private String recipientId;
    private String groupId;
    private String departmentId;
    // getters e setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public String getRecipientId() { return recipientId; }
    public void setRecipientId(String recipientId) { this.recipientId = recipientId; }
    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }
    public String getDepartmentId() { return departmentId; }
    public void setDepartmentId(String departmentId) { this.departmentId = departmentId; }
} 