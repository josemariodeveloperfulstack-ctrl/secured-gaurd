package com.z7design.secured_guard.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.dto.MessageReactionDTO;
import com.z7design.secured_guard.dto.ReactionSummaryDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.ChatMessage;
import com.z7design.secured_guard.model.MessageReaction;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.ChatMessageRepository;
import com.z7design.secured_guard.repository.MessageReactionRepository;
import com.z7design.secured_guard.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@Transactional
public class MessageReactionService {
    
    @Autowired
    private MessageReactionRepository reactionRepository;
    
    @Autowired
    private ChatMessageRepository chatMessageRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Adiciona ou remove uma reação de uma mensagem
     * Se a reação já existe, remove; caso contrário, adiciona
     */
    public ReactionSummaryDTO toggleReaction(UUID messageId, UUID userId, String emoji) {
        log.info("Alternando reação {} na mensagem {} pelo usuário {}", emoji, messageId, userId);
        
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new BusinessException("Mensagem não encontrada"));
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        
        // Verificar se a reação já existe
        var existingReaction = reactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, userId, emoji);
        
        if (existingReaction.isPresent()) {
            // Remover reação existente
            reactionRepository.delete(existingReaction.get());
            log.info("Reação {} removida da mensagem {} pelo usuário {}", emoji, messageId, userId);
        } else {
            // Adicionar nova reação
            MessageReaction reaction = new MessageReaction();
            reaction.setMessage(message);
            reaction.setUser(user);
            reaction.setEmoji(emoji);
            reactionRepository.save(reaction);
            log.info("Reação {} adicionada à mensagem {} pelo usuário {}", emoji, messageId, userId);
        }
        
        // Retornar resumo atualizado das reações
        return getReactionSummary(messageId, emoji, userId);
    }
    
    /**
     * Busca resumo de reações para um emoji específico em uma mensagem
     */
    public ReactionSummaryDTO getReactionSummary(UUID messageId, String emoji, UUID currentUserId) {
        List<MessageReaction> reactions = reactionRepository.findByMessageId(messageId)
            .stream()
            .filter(r -> r.getEmoji().equals(emoji))
            .collect(Collectors.toList());
        
        List<UUID> userIds = reactions.stream()
            .map(r -> r.getUser().getId())
            .collect(Collectors.toList());
        
        boolean currentUserReacted = userIds.contains(currentUserId);
        
        return new ReactionSummaryDTO(emoji, (long) reactions.size(), userIds, currentUserReacted);
    }
    
    /**
     * Busca todas as reações de uma mensagem agrupadas por emoji
     */
    public List<ReactionSummaryDTO> getAllReactionsForMessage(UUID messageId, UUID currentUserId) {
        if (messageId == null) {
            return new java.util.ArrayList<>();
        }
        List<MessageReaction> allReactions = reactionRepository.findByMessageId(messageId);
        
        // Agrupar por emoji
        return allReactions.stream()
            .collect(Collectors.groupingBy(MessageReaction::getEmoji))
            .entrySet()
            .stream()
            .map(entry -> {
                String emoji = entry.getKey();
                List<MessageReaction> reactions = entry.getValue();
                
                List<UUID> userIds = reactions.stream()
                    .map(r -> r.getUser().getId())
                    .collect(Collectors.toList());
                
                boolean currentUserReacted = userIds.contains(currentUserId);
                
                return new ReactionSummaryDTO(emoji, (long) reactions.size(), userIds, currentUserReacted);
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Remove todas as reações de um usuário em uma mensagem
     */
    public void removeAllUserReactionsFromMessage(UUID messageId, UUID userId) {
        log.info("Removendo todas as reações do usuário {} da mensagem {}", userId, messageId);
        reactionRepository.findByMessageIdAndUserId(messageId, userId)
            .forEach(reactionRepository::delete);
    }
}

