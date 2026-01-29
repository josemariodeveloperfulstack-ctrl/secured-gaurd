package com.z7design.secured_guard.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;

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
        try {
            log.info("Alternando reação {} na mensagem {} pelo usuário {}", emoji, messageId, userId);

            if (messageId == null) {
                throw new BusinessException("ID da mensagem é obrigatório");
            }

            if (userId == null) {
                throw new BusinessException("ID do usuário é obrigatório");
            }

            if (emoji == null || emoji.trim().isEmpty()) {
                throw new BusinessException("Emoji é obrigatório");
            }

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
                reaction.setEmoji(emoji.trim());
                reactionRepository.save(reaction);
                log.info("Reação {} adicionada à mensagem {} pelo usuário {}", emoji, messageId, userId);
            }

            // Retornar resumo atualizado das reações
            return getReactionSummary(messageId, emoji, userId);
        } catch (BusinessException e) {
            log.error("Erro de negócio ao alternar reação: {}", e.getMessage());
            throw e;
        } catch (DataIntegrityViolationException e) {
            log.warn("Falha de integridade ao alternar reação (provável concorrência): {}", e.getMessage());
            // Em caso de erro de integridade (ex: unique constraint), o estado já mudou ou
            // está em transição.
            // Retornamos o resumo atual sem lançar exceção para o usuário.
            return getReactionSummary(messageId, emoji, userId);
        } catch (Exception e) {
            log.error("Erro inesperado ao alternar reação {} na mensagem {} pelo usuário {}: {}",
                    emoji, messageId, userId, e.getMessage(), e);
            throw new BusinessException("Erro ao processar reação: " + e.getMessage());
        }
    }

    /**
     * Busca resumo de reações para um emoji específico em uma mensagem
     */
    public ReactionSummaryDTO getReactionSummary(UUID messageId, String emoji, UUID currentUserId) {
        try {
            List<MessageReaction> reactions = reactionRepository.findByMessageId(messageId)
                    .stream()
                    .filter(r -> r != null && r.getEmoji() != null && r.getEmoji().equals(emoji))
                    .collect(Collectors.toList());

            List<UUID> userIds = reactions.stream()
                    .filter(r -> r.getUser() != null)
                    .map(r -> r.getUser().getId())
                    .collect(Collectors.toList());

            boolean currentUserReacted = currentUserId != null && userIds.contains(currentUserId);

            return new ReactionSummaryDTO(emoji, (long) reactions.size(), userIds, currentUserReacted);
        } catch (Exception e) {
            log.error("Erro ao buscar resumo de reações para mensagem {} e emoji {}: {}", messageId, emoji,
                    e.getMessage(), e);
            // Retornar resumo vazio em caso de erro
            return new ReactionSummaryDTO(emoji, 0L, new java.util.ArrayList<>(), false);
        }
    }

    /**
     * Busca todas as reações de uma mensagem agrupadas por emoji
     */
    public List<ReactionSummaryDTO> getAllReactionsForMessage(UUID messageId, UUID currentUserId) {
        try {
            if (messageId == null) {
                return new java.util.ArrayList<>();
            }
            List<MessageReaction> allReactions = reactionRepository.findByMessageId(messageId);

            if (allReactions == null || allReactions.isEmpty()) {
                return new java.util.ArrayList<>();
            }

            // Agrupar por emoji
            return allReactions.stream()
                    .filter(r -> r != null && r.getEmoji() != null)
                    .collect(Collectors.groupingBy(MessageReaction::getEmoji))
                    .entrySet()
                    .stream()
                    .map(entry -> {
                        String emoji = entry.getKey();
                        List<MessageReaction> reactions = entry.getValue();

                        List<UUID> userIds = reactions.stream()
                                .filter(r -> r.getUser() != null)
                                .map(r -> r.getUser().getId())
                                .collect(Collectors.toList());

                        boolean currentUserReacted = currentUserId != null && userIds.contains(currentUserId);

                        return new ReactionSummaryDTO(emoji, (long) reactions.size(), userIds, currentUserReacted);
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Erro ao buscar todas as reações para mensagem {}: {}", messageId, e.getMessage(), e);
            return new java.util.ArrayList<>();
        }
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
