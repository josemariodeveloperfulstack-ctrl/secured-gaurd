package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.SendWhatsAppHumanMessageRequest;
import com.z7design.secured_guard.dto.WhatsAppConversationDTO;
import com.z7design.secured_guard.dto.WhatsAppMessageDTO;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.WhatsAppConversation;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.whatsapp.agent.WhatsAppAgentConversationService;
import com.z7design.secured_guard.service.whatsapp.agent.WhatsAppInboundProcessorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/whatsapp/agent/conversations")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8080", "http://localhost:5173"},
        allowedHeaders = "*",
        methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class WhatsAppAgentConversationController {

    private final WhatsAppAgentConversationService conversationService;
    private final WhatsAppInboundProcessorService inboundProcessor;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Page<WhatsAppConversationDTO>> list(
            @PageableDefault(size = 30) Pageable pageable) {
        return ResponseEntity.ok(conversationService.listConversations(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WhatsAppConversationDTO> get(@PathVariable UUID id) {
        return conversationService.getConversationDto(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<WhatsAppMessageDTO>> messages(@PathVariable UUID id) {
        if (conversationService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(conversationService.listMessages(id));
    }

    @PostMapping("/{id}/takeover")
    public ResponseEntity<?> takeover(@PathVariable UUID id) {
        return conversationService.findById(id)
                .map(conversation -> {
                    User user = currentUser();
                    conversationService.switchToHumanHandoff(conversation, user);
                    return ResponseEntity.ok(Map.of("mode", "HUMAN_HANDOFF"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/release-ai")
    public ResponseEntity<?> releaseAi(@PathVariable UUID id) {
        if (conversationService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        conversationService.releaseToAi(id);
        return ResponseEntity.ok(Map.of("mode", "AI_ACTIVE"));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<?> sendHumanMessage(
            @PathVariable UUID id,
            @Valid @RequestBody SendWhatsAppHumanMessageRequest request) {

        return conversationService.findById(id)
                .map(conversation -> {
                    User user = currentUser();
                    boolean sent = inboundProcessor.sendHumanMessage(conversation, user, request.getBody());
                    if (!sent) {
                        return ResponseEntity.status(502)
                                .body(Map.of("error", "Falha ao enviar mensagem pelo provedor WhatsApp"));
                    }
                    return ResponseEntity.ok(Map.of("sent", true));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElse(null);
    }
}
