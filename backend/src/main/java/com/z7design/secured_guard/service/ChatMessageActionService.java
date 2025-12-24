package com.z7design.secured_guard.service;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.ChatMessage;
import com.z7design.secured_guard.model.ChatMessageFavorite;
import com.z7design.secured_guard.model.ChatMessagePin;
import com.z7design.secured_guard.model.ChatMessageReport;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.ChatMessageFavoriteRepository;
import com.z7design.secured_guard.repository.ChatMessagePinRepository;
import com.z7design.secured_guard.repository.ChatMessageReportRepository;
import com.z7design.secured_guard.repository.ChatMessageRepository;
import com.z7design.secured_guard.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@Transactional
public class ChatMessageActionService {
    
    @Autowired
    private ChatMessagePinRepository pinRepository;
    
    @Autowired
    private ChatMessageFavoriteRepository favoriteRepository;
    
    @Autowired
    private ChatMessageReportRepository reportRepository;
    
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Fixa ou desfixa uma mensagem
     */
    public boolean togglePin(UUID messageId, UUID userId) {
        log.info("Alternando fixação da mensagem {} para usuário {}", messageId, userId);
        
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        
        boolean isPinned = pinRepository.existsByMessageIdAndUserId(messageId, userId);
        
        if (isPinned) {
            pinRepository.deleteByMessageIdAndUserId(messageId, userId);
            log.info("Mensagem {} desfixada para usuário {}", messageId, userId);
            return false;
        } else {
            ChatMessagePin pin = new ChatMessagePin();
            pin.setMessage(message);
            pin.setUser(user);
            pinRepository.save(pin);
            log.info("Mensagem {} fixada para usuário {}", messageId, userId);
            return true;
        }
    }
    
    /**
     * Verifica se uma mensagem está fixada para um usuário
     */
    public boolean isPinned(UUID messageId, UUID userId) {
        return pinRepository.existsByMessageIdAndUserId(messageId, userId);
    }
    
    /**
     * Adiciona ou remove uma mensagem dos favoritos
     */
    public boolean toggleFavorite(UUID messageId, UUID userId) {
        log.info("Alternando favorito da mensagem {} para usuário {}", messageId, userId);
        
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        
        boolean isFavorite = favoriteRepository.existsByMessageIdAndUserId(messageId, userId);
        
        if (isFavorite) {
            favoriteRepository.deleteByMessageIdAndUserId(messageId, userId);
            log.info("Mensagem {} removida dos favoritos para usuário {}", messageId, userId);
            return false;
        } else {
            ChatMessageFavorite favorite = new ChatMessageFavorite();
            favorite.setMessage(message);
            favorite.setUser(user);
            favoriteRepository.save(favorite);
            log.info("Mensagem {} adicionada aos favoritos para usuário {}", messageId, userId);
            return true;
        }
    }
    
    /**
     * Verifica se uma mensagem está nos favoritos de um usuário
     */
    public boolean isFavorite(UUID messageId, UUID userId) {
        return favoriteRepository.existsByMessageIdAndUserId(messageId, userId);
    }
    
    /**
     * Cria uma denúncia de mensagem
     */
    public ChatMessageReport reportMessage(UUID messageId, UUID reporterId, String reason, String description) {
        log.info("Criando denúncia da mensagem {} por usuário {}", messageId, reporterId);
        
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));
        
        User reporter = userRepository.findById(reporterId)
            .orElseThrow(() -> new BusinessException("Usuário denunciante não encontrado"));
        
        // Verificar se já existe denúncia do mesmo usuário para a mesma mensagem
        if (reportRepository.existsByMessageIdAndReporterId(messageId, reporterId)) {
            throw new BusinessException("Você já denunciou esta mensagem");
        }
        
        ChatMessageReport report = new ChatMessageReport();
        report.setMessage(message);
        report.setReporter(reporter);
        report.setReason(reason);
        report.setDescription(description);
        report.setStatus("PENDING");
        
        report = reportRepository.save(report);
        log.info("Denúncia {} criada com sucesso", report.getId());
        
        return report;
    }
    
    /**
     * Encaminha uma mensagem para novos destinatários
     */
    public void forwardMessage(UUID messageId, UUID senderId, UUID[] recipientIds, UUID[] groupIds, UUID[] departmentIds) {
        log.info("Encaminhando mensagem {} de {} para {} destinatários", messageId, senderId, 
            (recipientIds != null ? recipientIds.length : 0) + 
            (groupIds != null ? groupIds.length : 0) + 
            (departmentIds != null ? departmentIds.length : 0));
        
        ChatMessage originalMessage = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new BusinessException("Mensagem original não encontrada"));
        
        User sender = userRepository.findById(senderId)
            .orElseThrow(() -> new BusinessException("Usuário remetente não encontrado"));
        
        // Criar nova mensagem com conteúdo da original
        ChatMessage forwardedMessage = new ChatMessage();
        forwardedMessage.setContent("Encaminhado: " + originalMessage.getContent());
        forwardedMessage.setSender(sender);
        forwardedMessage.setType(originalMessage.getType());
        // Não usar replyToId para encaminhamento, apenas para respostas diretas
        
        // Copiar informações do arquivo se houver
        if (originalMessage.getFileUrl() != null) {
            forwardedMessage.setFileUrl(originalMessage.getFileUrl());
            forwardedMessage.setFileName(originalMessage.getFileName());
            forwardedMessage.setFileSize(originalMessage.getFileSize());
            forwardedMessage.setFileContentType(originalMessage.getFileContentType());
            forwardedMessage.setType(originalMessage.getType());
        }
        
        // Definir destinatários individuais
        if (recipientIds != null && recipientIds.length > 0) {
            // Para múltiplos destinatários, criar uma mensagem para cada um
            for (UUID recipientId : recipientIds) {
                User recipient = userRepository.findById(recipientId)
                    .orElseThrow(() -> new BusinessException("Usuário destinatário não encontrado: " + recipientId));
                
                ChatMessage msg = new ChatMessage();
                msg.setContent(forwardedMessage.getContent());
                msg.setSender(sender);
                msg.setRecipient(recipient);
                msg.setType(originalMessage.getType());
                msg.setReplyToId(originalMessage.getId());
                
                if (originalMessage.getFileUrl() != null) {
                    msg.setFileUrl(originalMessage.getFileUrl());
                    msg.setFileName(originalMessage.getFileName());
                    msg.setFileSize(originalMessage.getFileSize());
                    msg.setFileContentType(originalMessage.getFileContentType());
                    msg.setType(originalMessage.getType());
                }
                
                chatMessageRepository.save(msg);
            }
        }
        
        // TODO: Implementar encaminhamento para grupos e departamentos
        // Por enquanto, apenas destinatários individuais são suportados
        
        log.info("Mensagem {} encaminhada com sucesso", messageId);
    }
}

