package com.z7design.secured_guard.service.whatsapp.agent;

import com.z7design.secured_guard.dto.WhatsAppConversationDTO;
import com.z7design.secured_guard.dto.WhatsAppMessageDTO;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.WhatsAppConversation;
import com.z7design.secured_guard.model.WhatsAppMessage;
import com.z7design.secured_guard.model.enums.LeadSource;
import com.z7design.secured_guard.model.enums.WhatsAppConversationMode;
import com.z7design.secured_guard.model.enums.WhatsAppMessageDirection;
import com.z7design.secured_guard.model.enums.WhatsAppMessageSenderType;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.WhatsAppConversationRepository;
import com.z7design.secured_guard.repository.WhatsAppMessageRepository;
import com.z7design.secured_guard.service.whatsapp.WhatsAppPhoneUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppAgentConversationService {

    private final WhatsAppConversationRepository conversationRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final LeadRepository leadRepository;
    private final UserRepository userRepository;

    @Value("${whatsapp.agent.context.max-messages:40}")
    private int contextMaxMessages;

    @Transactional
    public WhatsAppConversation getOrCreateConversation(String phone, String contactName, String providerType) {
        String normalized = WhatsAppPhoneUtil.normalize(phone);
        return conversationRepository.findByPhoneNumber(normalized)
                .orElseGet(() -> createConversation(normalized, contactName, providerType));
    }

    private WhatsAppConversation createConversation(String phone, String contactName, String providerType) {
        WhatsAppConversation c = new WhatsAppConversation();
        c.setPhoneNumber(phone);
        c.setContactName(contactName);
        c.setProviderType(providerType);
        c.setMode(WhatsAppConversationMode.AI_ACTIVE);
        linkLead(c, phone);
        return conversationRepository.save(c);
    }

    private void linkLead(WhatsAppConversation conversation, String phone) {
        findLeadByPhone(phone).ifPresent(lead -> {
            conversation.setLead(lead);
            if (conversation.getContactName() == null || conversation.getContactName().isBlank()) {
                conversation.setContactName(lead.getName());
            }
        });
    }

    public Optional<Lead> findLeadByPhone(String phone) {
        String digits = WhatsAppPhoneUtil.normalize(phone);
        String suffix = digits.length() > 11 ? digits.substring(digits.length() - 11) : digits;
        return leadRepository.findAllActive().stream()
                .filter(l -> phoneMatches(l.getPhone(), suffix) || phoneMatches(l.getMobile(), suffix))
                .findFirst();
    }

    private boolean phoneMatches(String stored, String suffix) {
        if (stored == null || stored.isBlank()) {
            return false;
        }
        String d = stored.replaceAll("[^0-9]", "");
        return d.endsWith(suffix) || suffix.endsWith(d);
    }

    @Transactional
    public WhatsAppMessage appendMessage(
            WhatsAppConversation conversation,
            WhatsAppMessageDirection direction,
            WhatsAppMessageSenderType senderType,
            String body,
            User senderUser,
            String externalMessageId,
            String providerType,
            String rawPayload,
            String mediaUrl,
            String mediaType) {

        if (externalMessageId != null && !externalMessageId.isBlank()) {
            Optional<WhatsAppMessage> dup = messageRepository.findByExternalMessageId(externalMessageId);
            if (dup.isPresent()) {
                return dup.get();
            }
        }

        WhatsAppMessage msg = new WhatsAppMessage();
        msg.setConversation(conversation);
        msg.setDirection(direction);
        msg.setSenderType(senderType);
        msg.setSenderUser(senderUser);
        msg.setBody(body);
        msg.setMediaUrl(mediaUrl);
        msg.setMediaType(mediaType);
        msg.setExternalMessageId(externalMessageId);
        msg.setProviderType(providerType);
        msg.setRawPayload(rawPayload);

        WhatsAppMessage saved = messageRepository.save(msg);

        LocalDateTime now = LocalDateTime.now();
        conversation.setLastMessageAt(now);
        if (direction == WhatsAppMessageDirection.INBOUND) {
            conversation.setLastInboundAt(now);
        }
        conversationRepository.save(conversation);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<WhatsAppMessage> loadContextHistory(UUID conversationId) {
        List<WhatsAppMessage> recent = messageRepository.findByConversation_IdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(0, contextMaxMessages));
        Collections.reverse(recent);
        return recent;
    }

    @Transactional
    public void updateContextSummary(UUID conversationId, String summary) {
        conversationRepository.findById(conversationId).ifPresent(c -> {
            c.setContextSummary(summary);
            conversationRepository.save(c);
        });
    }

    @Transactional
    public void switchToHumanHandoff(WhatsAppConversation conversation, User human) {
        conversation.setMode(WhatsAppConversationMode.HUMAN_HANDOFF);
        conversation.setAiPausedAt(LocalDateTime.now());
        conversation.setAssignedUser(human);
        conversationRepository.save(conversation);
        appendMessage(conversation, WhatsAppMessageDirection.OUTBOUND, WhatsAppMessageSenderType.SYSTEM,
                "Atendimento assumido por um consultor da equipe. A assistente virtual está em pausa.",
                null, null, null, null, null, null);
        log.info("Conversa {} em HUMAN_HANDOFF (usuário {})", conversation.getId(),
                human != null ? human.getId() : "externo");
    }

    @Transactional
    public void assignUser(WhatsAppConversation conversation, User human) {
        conversation.setAssignedUser(human);
        conversationRepository.save(conversation);
    }

    @Transactional
    public void releaseToAi(UUID conversationId) {
        conversationRepository.findById(conversationId).ifPresent(c -> {
            c.setMode(WhatsAppConversationMode.AI_ACTIVE);
            c.setAiPausedAt(null);
            c.setAssignedUser(null);
            conversationRepository.save(c);
            appendMessage(c, WhatsAppMessageDirection.OUTBOUND, WhatsAppMessageSenderType.SYSTEM,
                    "A assistente virtual voltou a atender esta conversa.",
                    null, null, null, null, null, null);
        });
    }

    @Transactional(readOnly = true)
    public Page<WhatsAppConversationDTO> listConversations(Pageable pageable) {
        return conversationRepository.findAllByOrderByLastMessageAtDesc(pageable)
                .map(this::toConversationDto);
    }

    @Transactional(readOnly = true)
    public List<WhatsAppMessageDTO> listMessages(UUID conversationId) {
        return messageRepository.findByConversation_IdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(this::toMessageDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<WhatsAppConversation> findById(UUID id) {
        return conversationRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<WhatsAppConversationDTO> getConversationDto(UUID id) {
        return conversationRepository.findById(id).map(this::toConversationDto);
    }

    private WhatsAppConversationDTO toConversationDto(WhatsAppConversation c) {
        String preview = messageRepository.findByConversation_IdOrderByCreatedAtDesc(
                        c.getId(), PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(m -> truncate(m.getBody(), 120))
                .orElse(null);
        long count = messageRepository.findByConversation_IdOrderByCreatedAtAsc(c.getId()).size();
        return WhatsAppConversationDTO.builder()
                .id(c.getId())
                .phoneNumber(c.getPhoneNumber())
                .leadId(c.getLead() != null ? c.getLead().getId() : null)
                .leadName(c.getLead() != null ? c.getLead().getName() : c.getContactName())
                .mode(c.getMode())
                .assignedUserId(c.getAssignedUser() != null ? c.getAssignedUser().getId() : null)
                .assignedUserName(c.getAssignedUser() != null ? c.getAssignedUser().getName() : null)
                .contactName(c.getContactName())
                .contextSummary(c.getContextSummary())
                .lastMessageAt(c.getLastMessageAt())
                .lastMessagePreview(preview)
                .messageCount(count)
                .build();
    }

    private WhatsAppMessageDTO toMessageDto(WhatsAppMessage m) {
        return WhatsAppMessageDTO.builder()
                .id(m.getId())
                .conversationId(m.getConversation().getId())
                .direction(m.getDirection())
                .senderType(m.getSenderType())
                .senderUserId(m.getSenderUser() != null ? m.getSenderUser().getId() : null)
                .senderUserName(m.getSenderUser() != null ? m.getSenderUser().getName() : null)
                .body(m.getBody())
                .mediaUrl(m.getMediaUrl())
                .mediaType(m.getMediaType())
                .createdAt(m.getCreatedAt())
                .build();
    }

    private String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    @Transactional
    public Lead ensureLeadForConversation(WhatsAppConversation conversation, String nameHint) {
        if (conversation.getLead() != null) {
            return conversation.getLead();
        }
        Lead lead = new Lead();
        lead.setName(nameHint != null && !nameHint.isBlank() ? nameHint : "Lead WhatsApp");
        lead.setPhone(conversation.getPhoneNumber());
        lead.setMobile(conversation.getPhoneNumber());
        lead.setSource(LeadSource.OTHER);
        lead = leadRepository.save(lead);
        conversation.setLead(lead);
        conversationRepository.save(conversation);
        return lead;
    }

    public User resolveUser(UUID userId) {
        return userRepository.findById(userId).orElse(null);
    }
}
