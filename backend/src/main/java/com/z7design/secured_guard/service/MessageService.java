package com.z7design.secured_guard.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.dto.MessageRequestDTO;
import com.z7design.secured_guard.dto.MessageResponseDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.Department;
import com.z7design.secured_guard.model.Message;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.MessageType;
import com.z7design.secured_guard.model.enums.MessageStatus;
import com.z7design.secured_guard.model.enums.MessagePriority;
import com.z7design.secured_guard.model.MessageDeletionLog;
import com.z7design.secured_guard.repository.DepartmentRepository;
import com.z7design.secured_guard.repository.MessageRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.UserGroupRepository;
import com.z7design.secured_guard.repository.MessageDeletionLogRepository;

import lombok.extern.slf4j.Slf4j;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import com.z7design.secured_guard.dto.UserResponseDTO;
import com.z7design.secured_guard.dto.DepartmentDTO;

@Service
@Slf4j
@Transactional
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UserGroupRepository userGroupRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private MessageDeletionLogRepository messageDeletionLogRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Cria uma mensagem (método usado por outros serviços)
     */
    public Message createMessage(MessageRequestDTO request, User sender) {
        log.info("Criando mensagem: {}", request.getTitle());

        Message message = new Message();
        message.setTitle(request.getTitle());
        message.setContent(request.getContent());
        message.setType(request.getType());
        message.setPriority(request.getPriority());
        message.setSender(sender);
        message.setSendEmail(request.getSendEmail());
        message.setSendNotification(request.getSendNotification());
        message.setScheduledAt(request.getScheduledAt());

        // Definir destinatários baseado no tipo
        Set<User> recipients = getRecipients(request);
        message.setRecipients(recipients);

        // Definir departamentos se aplicável
        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            Set<Department> departments = departmentRepository.findAllById(request.getDepartmentIds())
                    .stream().collect(Collectors.toSet());
            message.setDepartments(departments);
        }

        message = messageRepository.save(message);

        // Enviar imediatamente se não for agendada
        if (message.getScheduledAt() == null) {
            sendMessageNow(message);
        }

        return message;
    }

    /**
     * Envia uma mensagem
     */
    public MessageResponseDTO sendMessage(MessageRequestDTO request, UUID senderId) {
        log.info("Enviando mensagem: {}", request.getTitle());

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new BusinessException("Usuário remetente não encontrado"));

        Message message = new Message();
        message.setTitle(request.getTitle());
        message.setContent(request.getContent());
        message.setType(request.getType());
        message.setPriority(request.getPriority());
        message.setSender(sender);
        message.setSendEmail(request.getSendEmail());
        message.setSendNotification(request.getSendNotification());
        message.setScheduledAt(request.getScheduledAt());

        // Se for uma resposta, definir a mensagem original
        if (request.getReplyToId() != null) {
            Message replyToMessage = messageRepository.findById(request.getReplyToId())
                    .orElseThrow(() -> new BusinessException("Mensagem original não encontrada"));
            message.setReplyTo(replyToMessage);

            // Se não foram especificados destinatários, usar o remetente da mensagem
            // original
            if (request.getRecipientIds() == null || request.getRecipientIds().isEmpty()) {
                Set<User> replyRecipients = new HashSet<>();
                replyRecipients.add(replyToMessage.getSender());
                message.setRecipients(replyRecipients);
                message.setType(MessageType.INDIVIDUAL);
            } else {
                Set<User> recipients = getRecipients(request);
                message.setRecipients(recipients);
            }
        } else {
            // Definir destinatários baseado no tipo
            Set<User> recipients = getRecipients(request);
            message.setRecipients(recipients);
        }

        // Definir departamentos se aplicável
        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            Set<Department> departments = departmentRepository.findAllById(request.getDepartmentIds())
                    .stream().collect(Collectors.toSet());
            message.setDepartments(departments);
        }

        message = messageRepository.save(message);

        // Enviar imediatamente se não for agendada
        if (message.getScheduledAt() == null) {
            sendMessageNow(message);
        }

        return convertToDTO(message);
    }

    /**
     * Busca mensagens recebidas por um usuário (excluindo arquivadas)
     */
    public Page<MessageResponseDTO> getReceivedMessages(UUID userId, Pageable pageable) {
        log.info("Buscando mensagens recebidas para usuário: {} (excluindo arquivadas)", userId);

        // Buscar apenas mensagens não arquivadas onde o usuário é destinatário
        Page<Message> messages = messageRepository.findNonArchivedByUserId(userId, pageable);
        // Filtrar apenas mensagens onde o usuário é destinatário (não remetente)
        List<Message> receivedMessages = messages.getContent().stream()
                .filter(m -> {
                    boolean isRecipient = m.getRecipients() != null &&
                            m.getRecipients().stream()
                                    .anyMatch(user -> user.getId().equals(userId));
                    boolean isNotSender = !m.getSender().getId().equals(userId);
                    return isRecipient && isNotSender;
                })
                .collect(java.util.stream.Collectors.toList());

        Page<Message> filteredPage = new org.springframework.data.domain.PageImpl<>(
                receivedMessages,
                pageable,
                receivedMessages.size());

        log.info("Encontradas {} mensagens recebidas não arquivadas para usuário {}", filteredPage.getTotalElements(),
                userId);
        return filteredPage.map(this::convertToDTO);
    }

    /**
     * Busca mensagens enviadas por um usuário (excluindo arquivadas)
     */
    public Page<MessageResponseDTO> getSentMessages(UUID userId, Pageable pageable) {
        log.info("Buscando mensagens enviadas por usuário: {} (excluindo arquivadas)", userId);

        // Buscar apenas mensagens não arquivadas enviadas pelo usuário
        Page<Message> messages = messageRepository.findNonArchivedByUserId(userId, pageable);
        // Filtrar apenas as mensagens onde o usuário é remetente
        List<Message> sentMessages = messages.getContent().stream()
                .filter(m -> m.getSender().getId().equals(userId))
                .collect(java.util.stream.Collectors.toList());

        Page<Message> filteredPage = new org.springframework.data.domain.PageImpl<>(
                sentMessages,
                pageable,
                sentMessages.size());

        log.info("Encontradas {} mensagens enviadas não arquivadas para usuário {}", filteredPage.getTotalElements(),
                userId);
        return filteredPage.map(this::convertToDTO);
    }

    /**
     * Marca mensagem como lida
     */
    public void markAsRead(UUID messageId, UUID userId) {
        log.info("Marcando mensagem {} como lida pelo usuário {}", messageId, userId);

        try {
            Message message = messageRepository.findById(messageId)
                    .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));

            // Verificar se o usuário é o remetente
            boolean isSender = message.getSender() != null && message.getSender().getId().equals(userId);

            // Verificar se o usuário é destinatário
            boolean isRecipient = false;
            if (message.getRecipients() != null && !message.getRecipients().isEmpty()) {
                isRecipient = message.getRecipients().stream()
                        .anyMatch(user -> user.getId().equals(userId));
            }

            // Verificar tipo de mensagem
            boolean isGlobalOrDepartment = message.getType() == MessageType.GLOBAL ||
                    message.getType() == MessageType.DEPARTMENT;

            // Permitir marcar como lida se:
            // 1. O usuário é o remetente, OU
            // 2. O usuário é destinatário, OU
            // 3. É mensagem GLOBAL ou DEPARTMENT (qualquer usuário autenticado pode marcar)
            if (!isSender && !isRecipient && !isGlobalOrDepartment) {
                log.warn(
                        "Usuário {} não tem permissão para marcar mensagem {} como lida (não é remetente, destinatário, nem mensagem global/departamento)",
                        userId, messageId);
                throw new BusinessException("Usuário não tem permissão para marcar esta mensagem como lida");
            }

            message.setReadAt(LocalDateTime.now());
            message.setStatus(MessageStatus.READ);
            messageRepository.save(message);
            log.info(
                    "Mensagem {} marcada como lida com sucesso pelo usuário {} (remetente: {}, destinatário: {}, tipo: {})",
                    messageId, userId, isSender, isRecipient, message.getType());
        } catch (BusinessException e) {
            log.error("Erro de negócio ao marcar mensagem como lida: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Erro inesperado ao marcar mensagem {} como lida: {}", messageId, e.getMessage(), e);
            throw new BusinessException("Erro ao marcar mensagem como lida: " + e.getMessage());
        }
    }

    /**
     * Conta mensagens não lidas (considerando remetente ou destinatário)
     */
    public Long countUnreadMessages(UUID userId) {
        return messageRepository.countUnreadByUserIdIncludingSender(userId);
    }

    /**
     * Obtém estatísticas de mensagens para o usuário
     */
    public MessageStatistics getMessageStatistics(UUID userId) {
        Long total = messageRepository.countTotalByUserId(userId);
        Long unread = messageRepository.countUnreadByUserIdIncludingSender(userId);
        Long read = messageRepository.countByUserIdAndStatus(userId, MessageStatus.READ);
        Long archived = messageRepository.countByUserIdAndStatus(userId, MessageStatus.ARCHIVED);

        return MessageStatistics.builder()
                .total(total != null ? total : 0L)
                .unread(unread != null ? unread : 0L)
                .read(read != null ? read : 0L)
                .archived(archived != null ? archived : 0L)
                .build();
    }

    /**
     * Classe interna para estatísticas de mensagens
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MessageStatistics {
        private Long total;
        private Long unread;
        private Long read;
        private Long archived;
    }

    /**
     * Busca mensagens por tipo
     */
    public List<MessageResponseDTO> getMessagesByType(MessageType type) {
        List<Message> messages = messageRepository.findByTypeOrderByCreatedAtDesc(type);
        return messages.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    /**
     * Agenda mensagens para envio
     */
    @Scheduled(fixedRate = 60000) // Executa a cada minuto
    @Transactional
    public void processScheduledMessages() {
        try {
            log.info("Processando mensagens agendadas");

            // Verificar se existem mensagens antes de processar
            long messageCount = messageRepository.count();
            if (messageCount == 0) {
                log.debug("Nenhuma mensagem encontrada no banco. Pulando processamento.");
                return;
            }

            List<Message> scheduledMessages = messageRepository.findScheduledMessages(LocalDateTime.now());

            for (Message message : scheduledMessages) {
                try {
                    sendMessageNow(message);
                    message.setSentAt(LocalDateTime.now());
                    messageRepository.save(message);
                    log.info("Mensagem agendada enviada: {}", message.getId());
                } catch (Exception e) {
                    log.error("Erro ao enviar mensagem agendada: {}", message.getId(), e);
                }
            }
        } catch (Exception e) {
            log.error("Erro durante processamento de mensagens agendadas: {}", e.getMessage(), e);
        }
    }

    /**
     * Envia mensagem imediatamente
     */
    private void sendMessageNow(Message message) {
        try {
            // Enviar notificação
            if (message.getSendNotification()) {
                notificationService.sendNotification(message);
            }

            // Enviar email
            if (message.getSendEmail()) {
                // TODO: Implementar envio de email para mensagens
                // Por enquanto, apenas log
                log.info("📧 Email solicitado para mensagem: {} - Implementação pendente", message.getId());
            }

            message.setSentAt(LocalDateTime.now());
            messageRepository.save(message);

            log.info("Mensagem enviada com sucesso: {}", message.getId());
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem: {}", message.getId(), e);
            throw new BusinessException("Erro ao enviar mensagem: " + e.getMessage());
        }
    }

    /**
     * Define destinatários baseado no tipo de mensagem.
     * Usa if/else (em vez de switch em enum) para evitar classe sintética MessageService$1,
     * que falha com NoClassDefFoundError após hot-reload do DevTools.
     */
    private Set<User> getRecipients(MessageRequestDTO request) {
        MessageType type = request.getType();
        if (type == null) {
            throw new BusinessException("Tipo de mensagem não suportado");
        }

        if (type == MessageType.INDIVIDUAL) {
            if (request.getRecipientIds() == null || request.getRecipientIds().isEmpty()) {
                throw new BusinessException("Destinatários são obrigatórios para mensagens individuais");
            }
            return userRepository.findAllById(request.getRecipientIds())
                    .stream().collect(Collectors.toSet());
        }

        if (type == MessageType.GROUP) {
            if (request.getGroupIds() == null || request.getGroupIds().isEmpty()) {
                throw new BusinessException("Grupos são obrigatórios para mensagens de grupo");
            }
            return userGroupRepository.findAllById(request.getGroupIds())
                    .stream()
                    .flatMap(group -> group.getUsers().stream())
                    .collect(Collectors.toSet());
        }

        if (type == MessageType.DEPARTMENT) {
            if (request.getDepartmentIds() == null || request.getDepartmentIds().isEmpty()) {
                log.warn(
                        "Nenhum departamento informado para mensagem de departamento; enviando para todos usuários ativos");
            }
            return userRepository.findByActiveTrue()
                    .stream().collect(Collectors.toSet());
        }

        if (type == MessageType.GLOBAL) {
            return userRepository.findByActiveTrue()
                    .stream().collect(Collectors.toSet());
        }

        throw new BusinessException("Tipo de mensagem não suportado");
    }

    /**
     * Busca mensagens por status (considerando remetente ou destinatário)
     */
    public Page<MessageResponseDTO> getMessagesByStatus(UUID userId, MessageStatus status, Pageable pageable) {
        log.info("Buscando mensagens com status {} para usuário: {} (remetente ou destinatário)", status, userId);

        // Buscar mensagens onde o usuário é remetente ou destinatário
        Page<Message> messages = messageRepository.findByUserIdAndStatus(userId, status, pageable);
        log.info("Encontradas {} mensagens com status {} para usuário {}", messages.getTotalElements(), status, userId);
        return messages.map(this::convertToDTO);
    }

    /**
     * Busca mensagens não lidas
     */
    public List<MessageResponseDTO> getUnreadMessages(UUID userId) {
        log.info("Buscando mensagens não lidas para usuário: {}", userId);

        List<Message> messages = messageRepository.findUnreadByUserId(userId);
        return messages.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    /**
     * Marca todas as mensagens não lidas como lidas
     */
    public void markAllAsRead(UUID userId) {
        log.info("Marcando todas as mensagens como lidas para usuário: {}", userId);

        List<Message> unreadMessages = messageRepository.findUnreadByUserId(userId);

        for (Message message : unreadMessages) {
            message.setStatus(MessageStatus.READ);
            message.setReadAt(LocalDateTime.now());
        }

        messageRepository.saveAll(unreadMessages);
        log.info("{} mensagens marcadas como lidas", unreadMessages.size());
    }

    /**
     * Arquiva mensagem
     */
    public void archiveMessage(UUID messageId, UUID userId) {
        log.info("Arquivando mensagem {} para usuário {}", messageId, userId);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));

        // Verificar se o usuário é remetente ou destinatário
        boolean isSender = message.getSender().getId().equals(userId);
        boolean isRecipient = message.getRecipients() != null &&
                message.getRecipients().stream()
                        .anyMatch(user -> user.getId().equals(userId));

        if (!isSender && !isRecipient) {
            throw new BusinessException(
                    "Usuário não tem permissão para arquivar esta mensagem. Apenas remetente ou destinatários podem arquivar.");
        }

        message.setStatus(MessageStatus.ARCHIVED);
        messageRepository.save(message);
        log.info("Mensagem {} arquivada com sucesso pelo usuário {}", messageId, userId);
    }

    /**
     * Restaura mensagem arquivada
     */
    public void restoreMessage(UUID messageId, UUID userId) {
        log.info("Restaurando mensagem {} para usuário {}", messageId, userId);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));

        // Verificar se a mensagem está arquivada
        if (message.getStatus() != MessageStatus.ARCHIVED) {
            throw new BusinessException(
                    "A mensagem não está arquivada. Apenas mensagens arquivadas podem ser restauradas.");
        }

        // Verificar se o usuário é remetente ou destinatário
        boolean isSender = message.getSender().getId().equals(userId);
        boolean isRecipient = message.getRecipients() != null &&
                message.getRecipients().stream()
                        .anyMatch(user -> user.getId().equals(userId));

        if (!isSender && !isRecipient) {
            throw new BusinessException(
                    "Usuário não tem permissão para restaurar esta mensagem. Apenas remetente ou destinatários podem restaurar.");
        }

        // Restaurar para status lido (se foi lida antes) ou não lida (se nunca foi
        // lida)
        MessageStatus restoredStatus = message.getReadAt() != null ? MessageStatus.READ : MessageStatus.UNREAD;
        message.setStatus(restoredStatus);
        messageRepository.save(message);
        log.info("Mensagem {} restaurada com sucesso pelo usuário {} com status {}", messageId, userId, restoredStatus);
    }

    /**
     * Deleta mensagem com registro de motivo
     */
    public void deleteMessage(UUID messageId, UUID userId, String deletionReason, String ipAddress) {
        log.info("Deletando mensagem {} pelo usuário {}", messageId, userId);

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        // Criar log de exclusão
        MessageDeletionLog deletionLog = MessageDeletionLog.builder()
                .messageId(messageId)
                .messageTitle(message.getTitle())
                .deletedBy(user)
                .deletionReason(deletionReason)
                .ipAddress(ipAddress)
                .build();

        messageDeletionLogRepository.save(deletionLog);

        // Deletar mensagem
        messageRepository.delete(message);

        log.info("Mensagem {} deletada com sucesso. Motivo: {}", messageId, deletionReason);
    }

    /**
     * Busca logs de exclusão de mensagens
     */
    public List<MessageDeletionLog> getDeletionLogs(UUID userId) {
        log.info("Buscando logs de exclusão para usuário: {}", userId);
        return messageDeletionLogRepository.findAll();
    }

    /**
     * Converte entidade para DTO
     */
    private MessageResponseDTO convertToDTO(Message message) {
        MessageResponseDTO dto = new MessageResponseDTO();
        dto.setId(message.getId());
        dto.setTitle(message.getTitle());
        dto.setContent(message.getContent());
        dto.setType(message.getType());
        dto.setPriority(message.getPriority());
        dto.setStatus(message.getStatus());
        dto.setSendEmail(message.getSendEmail());
        dto.setSendNotification(message.getSendNotification());
        dto.setScheduledAt(message.getScheduledAt());
        dto.setSentAt(message.getSentAt());
        dto.setReadAt(message.getReadAt());
        dto.setCreatedAt(message.getCreatedAt());
        dto.setUpdatedAt(message.getUpdatedAt());

        // Converter replyTo
        if (message.getReplyTo() != null) {
            dto.setReplyToId(message.getReplyTo().getId());
            // Evitar recursão infinita - não incluir o replyTo completo por padrão
            // Se necessário, pode ser carregado separadamente
        }

        // Converter sender
        if (message.getSender() != null) {
            try {
                UserResponseDTO senderDTO = new UserResponseDTO();
                senderDTO.setId(message.getSender().getId());
                senderDTO.setName(message.getSender().getName());
                senderDTO.setEmail(message.getSender().getEmail());
                dto.setSender(senderDTO);
            } catch (jakarta.persistence.EntityNotFoundException | org.hibernate.ObjectNotFoundException e) {
                log.warn("⚠️ Remetente original não encontrado ou foi excluído para a mensagem: {}", message.getId());
                UserResponseDTO deletedUserDTO = new UserResponseDTO();
                deletedUserDTO.setName("Usuário excluído");
                dto.setSender(deletedUserDTO);
            }
        }

        // Converter recipients
        if (message.getRecipients() != null) {
            Set<UserResponseDTO> recipientDTOs = message.getRecipients().stream()
                    .map(user -> {
                        try {
                            UserResponseDTO userDTO = new UserResponseDTO();
                            userDTO.setId(user.getId());
                            userDTO.setName(user.getName());
                            userDTO.setEmail(user.getEmail());
                            return userDTO;
                        } catch (jakarta.persistence.EntityNotFoundException
                                | org.hibernate.ObjectNotFoundException e) {
                            UserResponseDTO deletedUserDTO = new UserResponseDTO();
                            deletedUserDTO.setName("Usuário excluído");
                            return deletedUserDTO;
                        }
                    }).collect(Collectors.toSet());
            dto.setRecipients(recipientDTOs);
        }

        // Converter departments
        if (message.getDepartments() != null) {
            Set<DepartmentDTO> departmentDTOs = message.getDepartments().stream()
                    .map(dept -> {
                        DepartmentDTO deptDTO = new DepartmentDTO();
                        deptDTO.setId(dept.getId());
                        deptDTO.setName(dept.getName());
                        deptDTO.setDescription(dept.getDescription());
                        deptDTO.setIsActive(dept.getIsActive());
                        return deptDTO;
                    }).collect(Collectors.toSet());
            dto.setDepartments(departmentDTOs);
        }

        return dto;
    }

    /**
     * Envia notificação em tempo real para todos os setores sobre novo cliente ou posto.
     * Transação própria para não derrubar o cadastro do cliente se a mensagem falhar.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifyNewClientOrWorkPost(String title, String content, User sender) {
        try {
            log.info("Notificando setores sobre novo cliente/posto: {}", title);
            
            // Buscar todos os usuários ativos exceto Colaborador, TI e Auditor
            Set<User> recipients = userRepository.findAll().stream()
                    .filter(u -> u.isActive() && u.getRoles().stream().anyMatch(role -> {
                        String rName = role.getName().replace("ROLE_", "").toUpperCase();
                        return !rName.equals("COLABORADOR") && 
                               !rName.equals("TI_SUPORTE") && 
                               !rName.equals("AUDITOR");
                    }))
                    .collect(Collectors.toSet());
            
            if (recipients.isEmpty()) {
                log.warn("Nenhum destinatário elegível encontrado para a notificação");
                return;
            }
            
            Message message = new Message();
            message.setTitle(title);
            message.setContent(content);
            message.setType(MessageType.NOTIFICATION);
            message.setPriority(MessagePriority.HIGH);
            message.setSender(sender);
            message.setRecipients(recipients);
            message.setSendEmail(false);
            message.setSendNotification(true);
            message.setCreatedAt(LocalDateTime.now());
            message.setUpdatedAt(LocalDateTime.now());
            
            message = messageRepository.saveAndFlush(message);
            sendMessageNow(message);
            
            log.info("Notificação de novo cliente/posto enviada para {} destinatários", recipients.size());
        } catch (Exception e) {
            log.error("Erro ao enviar notificação de novo cliente/posto", e);
        }
    }
}