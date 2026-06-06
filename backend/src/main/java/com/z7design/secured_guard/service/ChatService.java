package com.z7design.secured_guard.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.dto.ChatMessageRequestDTO;
import com.z7design.secured_guard.dto.ChatMessageResponseDTO;
// import com.z7design.secured_guard.dto.ChatUserDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.ChatMessage;
import com.z7design.secured_guard.model.Department;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.UserGroupEntity;
import com.z7design.secured_guard.repository.ChatMessageRepository;
import com.z7design.secured_guard.repository.DepartmentRepository;
import com.z7design.secured_guard.repository.UserGroupRepository;
import com.z7design.secured_guard.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@Transactional
public class ChatService {
    
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private UserGroupRepository userGroupRepository;
    
    @Autowired
    private DepartmentRepository departmentRepository;
    
    @Autowired
    private ObjectProvider<SimpMessagingTemplate> messagingTemplateProvider;
    
    /**
     * Envia mensagem de chat
     */
    public ChatMessageResponseDTO sendChatMessage(ChatMessageRequestDTO request, String senderUsername) {
        log.info("Enviando mensagem de chat de {} para {}", senderUsername, request.getRecipientId());
        
        User sender = userRepository.findByUsername(senderUsername)
            .orElseThrow(() -> new BusinessException("Usuário remetente não encontrado: " + senderUsername));
        
        ChatMessage chatMessage = new ChatMessage();
        
        // Se há arquivo, permitir conteúdo vazio; caso contrário, conteúdo é obrigatório
        String content = request.getContent();
        if (content == null || content.trim().isEmpty()) {
            if (request.getFileUrl() != null) {
                // Se há arquivo, permitir conteúdo vazio
                content = "";
            } else {
                // Se não há arquivo, conteúdo é obrigatório
                throw new BusinessException("Conteúdo da mensagem é obrigatório quando não há arquivo");
            }
        }
        chatMessage.setContent(content);
        chatMessage.setSender(sender);
        chatMessage.setType(request.getType());
        chatMessage.setReplyToId(request.getReplyToId());
        
        // Informações do arquivo (se houver)
        if (request.getFileUrl() != null) {
            chatMessage.setFileUrl(request.getFileUrl());
            chatMessage.setFileName(request.getFileName());
            chatMessage.setFileSize(request.getFileSize());
            chatMessage.setFileContentType(request.getFileContentType());
        }
        
        chatMessage.setCreatedAt(LocalDateTime.now());
        
        // Definir destinatário
        if (request.getRecipientId() != null) {
            User recipient = userRepository.findById(request.getRecipientId())
                .orElseThrow(() -> new BusinessException("Usuário destinatário não encontrado"));
            chatMessage.setRecipient(recipient);
        }
        
        // Definir grupo
        if (request.getGroupId() != null) {
            UserGroupEntity group = userGroupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new BusinessException("Grupo não encontrado"));
            chatMessage.setGroup(group);
        }
        
        // Definir departamento
        if (request.getDepartmentId() != null) {
            Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new BusinessException("Departamento não encontrado"));
            chatMessage.setDepartment(department);
        }
        
        chatMessage = chatMessageRepository.save(chatMessage);
        
        // Converter para DTO antes de enviar via WebSocket
        ChatMessageResponseDTO messageDTO = convertToDTO(chatMessage);
        
        // Log detalhado para mensagens com arquivo
        if (messageDTO.getFileUrl() != null) {
            log.info("📎 Mensagem com arquivo - URL: {}, Nome: {}, Tamanho: {}, Tipo: {}", 
                messageDTO.getFileUrl(), 
                messageDTO.getFileName(), 
                messageDTO.getFileSize(), 
                messageDTO.getFileContentType());
        }
        
        // Publicar mensagem via WebSocket
        try {
            SimpMessagingTemplate messagingTemplate = messagingTemplateProvider.getIfAvailable();
            if (messagingTemplate == null) {
                log.debug("WebSocket indisponível; mensagem {} persistida sem broadcast em tempo real", chatMessage.getId());
            } else if (chatMessage.getRecipient() != null) {
                // Mensagem individual: enviar para o destinatário
                String recipientUsername = chatMessage.getRecipient().getUsername();
                String destination = "/user/" + recipientUsername + "/queue/messages";
                messagingTemplate.convertAndSend(destination, messageDTO);
                log.info("✅ Mensagem publicada via WebSocket para usuário: {} (destino: {}) - Tipo: {}, Tem arquivo: {}", 
                    recipientUsername, destination, messageDTO.getType(), messageDTO.getFileUrl() != null);
                
                // Também enviar para o remetente para atualização em tempo real
                String senderDestination = "/user/" + senderUsername + "/queue/messages";
                messagingTemplate.convertAndSend(senderDestination, messageDTO);
                log.info("✅ Mensagem publicada via WebSocket para remetente: {} (destino: {}) - Tipo: {}, Tem arquivo: {}", 
                    senderUsername, senderDestination, messageDTO.getType(), messageDTO.getFileUrl() != null);
            } else if (chatMessage.getGroup() != null) {
                // Mensagem de grupo: enviar para todos os membros do grupo
                String destination = "/topic/chat/group/" + chatMessage.getGroup().getId();
                messagingTemplate.convertAndSend(destination, messageDTO);
                log.info("Mensagem publicada via WebSocket para grupo: {} (destino: {})", chatMessage.getGroup().getId(), destination);
            } else if (chatMessage.getDepartment() != null) {
                // Mensagem de departamento: enviar para todos os membros do departamento
                String destination = "/topic/chat/department/" + chatMessage.getDepartment().getId();
                messagingTemplate.convertAndSend(destination, messageDTO);
                log.info("Mensagem publicada via WebSocket para departamento: {} (destino: {})", chatMessage.getDepartment().getId(), destination);
            }
        } catch (Exception e) {
            log.error("Erro ao publicar mensagem via WebSocket: {}", e.getMessage(), e);
            // Não lançar exceção para não quebrar o fluxo, apenas logar o erro
        }
        
        log.info("Mensagem de chat enviada: {}", chatMessage.getId());
        return messageDTO;
    }
    
    /**
     * Busca conversa entre dois usuários
     */
    public List<ChatMessageResponseDTO> getConversation(String currentUsername, UUID otherUserId) {
        log.info("Buscando conversa entre {} e {}", currentUsername, otherUserId);
        
        User currentUser = userRepository.findByUsername(currentUsername)
            .orElseThrow(() -> new BusinessException("Usuário atual não encontrado: " + currentUsername));
        
        List<ChatMessage> messages = chatMessageRepository.findConversationBetweenUsers(currentUser.getId(), otherUserId);
        return messages.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    /**
     * Busca mensagens de um grupo
     */
    public List<ChatMessageResponseDTO> getGroupMessages(UUID groupId) {
        log.info("Buscando mensagens do grupo: {}", groupId);
        
        List<ChatMessage> messages = chatMessageRepository.findByGroupIdOrderByCreatedAtAsc(groupId);
        return messages.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    /**
     * Busca mensagens de um departamento
     */
    public List<ChatMessageResponseDTO> getDepartmentMessages(UUID departmentId) {
        log.info("Buscando mensagens do departamento: {}", departmentId);
        
        List<ChatMessage> messages = chatMessageRepository.findByDepartmentIdOrderByCreatedAtAsc(departmentId);
        return messages.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    /**
     * Busca conversas recentes de um usuário
     */
    public List<ChatMessageResponseDTO> getRecentConversations(UUID userId) {
        log.info("Buscando conversas recentes para usuário: {}", userId);
        
        List<ChatMessage> messages = chatMessageRepository.findRecentConversationsForUser(userId);
        return messages.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    /**
     * Marca mensagem como lida
     */
    public void markAsRead(UUID messageId, UUID userId) {
        log.info("Marcando mensagem de chat {} como lida pelo usuário {}", messageId, userId);
        
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));
        
        // Verificar se o usuário é destinatário
        boolean isRecipient = (message.getRecipient() != null && message.getRecipient().getId().equals(userId)) ||
                             (message.getGroup() != null && message.getGroup().getUsers().stream()
                                 .anyMatch(user -> user.getId().equals(userId)));
        
        if (!isRecipient) {
            throw new BusinessException("Usuário não é destinatário desta mensagem");
        }
        
        message.setIsRead(true);
        message.setReadAt(LocalDateTime.now());
        chatMessageRepository.save(message);
    }
    
    /**
     * Conta mensagens não lidas
     */
    public Long countUnreadMessages(UUID userId) {
        return chatMessageRepository.countUnreadMessagesForUser(userId);
    }
    
    /**
     * Busca mensagens não lidas
     */
    public List<ChatMessageResponseDTO> getUnreadMessages(UUID userId) {
        List<ChatMessage> messages = chatMessageRepository.findUnreadMessagesForUser(userId);
        return messages.stream().map(this::convertToDTO).collect(Collectors.toList());
    }
    
    /**
     * Edita mensagem
     */
    public ChatMessageResponseDTO editMessage(UUID messageId, String newContent, UUID userId) {
        log.info("Editando mensagem de chat: {}", messageId);
        
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));
        
        // Verificar se o usuário é o remetente
        if (!message.getSender().getId().equals(userId)) {
            throw new BusinessException("Apenas o remetente pode editar a mensagem");
        }
        
        message.setContent(newContent);
        message.setEditedAt(LocalDateTime.now());
        message = chatMessageRepository.save(message);
        
        return convertToDTO(message);
    }

    /*
    /**
     * Busca usuários disponíveis para chat
     */
    /*
    public List<com.z7design.secured_guard.dto.ChatUserDTO> getAvailableUsersForChat(UUID currentUserId) {
        log.info("Buscando usuários disponíveis para chat para o usuário: {}", currentUserId);

        List<User> allUsers = userRepository.findAll();
        return allUsers.stream()
            .filter(user -> !user.getId().equals(currentUserId) && user.isActive())
            .map(user -> {
                com.z7design.secured_guard.dto.ChatUserDTO userDTO = new com.z7design.secured_guard.dto.ChatUserDTO();
                userDTO.setId(user.getId());
                userDTO.setName(user.getName());
                userDTO.setUsername(user.getUsername());
                userDTO.setEmail(user.getEmail());
                userDTO.setActive(user.isActive());
                userDTO.setOnline(false); // TODO: implementar status online/offline
                return userDTO;
            })
            .collect(Collectors.toList());
    }
    */
    
    /**
     * Converte entidade para DTO
     */
    private ChatMessageResponseDTO convertToDTO(ChatMessage message) {
        ChatMessageResponseDTO dto = new ChatMessageResponseDTO();
        dto.setId(message.getId());
        dto.setContent(message.getContent());
        dto.setType(message.getType());
        dto.setIsRead(message.getIsRead());
        dto.setReadAt(message.getReadAt());
        dto.setEditedAt(message.getEditedAt());
        dto.setReplyToId(message.getReplyToId());
        
        // Informações do arquivo
        dto.setFileUrl(message.getFileUrl());
        dto.setFileName(message.getFileName());
        dto.setFileSize(message.getFileSize());
        dto.setFileContentType(message.getFileContentType());
        
        dto.setCreatedAt(message.getCreatedAt());
        dto.setUpdatedAt(message.getUpdatedAt());
        
        // Converter sender
        if (message.getSender() != null) {
            com.z7design.secured_guard.dto.UserResponseDTO senderDTO = new com.z7design.secured_guard.dto.UserResponseDTO();
            senderDTO.setId(message.getSender().getId());
            senderDTO.setName(message.getSender().getName());
            senderDTO.setEmail(message.getSender().getEmail());
            dto.setSender(senderDTO);
        }
        
        // Converter recipient
        if (message.getRecipient() != null) {
            com.z7design.secured_guard.dto.UserResponseDTO recipientDTO = new com.z7design.secured_guard.dto.UserResponseDTO();
            recipientDTO.setId(message.getRecipient().getId());
            recipientDTO.setName(message.getRecipient().getName());
            recipientDTO.setEmail(message.getRecipient().getEmail());
            dto.setRecipient(recipientDTO);
        }
        
        // Converter group
        if (message.getGroup() != null) {
            com.z7design.secured_guard.dto.UserGroupDTO groupDTO = new com.z7design.secured_guard.dto.UserGroupDTO();
            groupDTO.setId(message.getGroup().getId());
            groupDTO.setName(message.getGroup().getDisplayName());
            dto.setGroup(groupDTO);
        }
        
        // Converter department
        if (message.getDepartment() != null) {
            com.z7design.secured_guard.dto.DepartmentDTO deptDTO = new com.z7design.secured_guard.dto.DepartmentDTO();
            deptDTO.setId(message.getDepartment().getId());
            deptDTO.setName(message.getDepartment().getName());
            deptDTO.setDescription(message.getDepartment().getDescription());
            dto.setDepartment(deptDTO);
        }
        
        // Reações serão carregadas via endpoint específico quando necessário
        // Não carregar aqui para evitar dependência circular e melhorar performance
        
        return dto;
    }
} 