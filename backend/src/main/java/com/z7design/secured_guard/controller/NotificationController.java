package com.z7design.secured_guard.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.z7design.secured_guard.model.Notification;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.NotificationStatus;
import com.z7design.secured_guard.model.enums.NotificationType;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.NotificationService;
import com.z7design.secured_guard.service.EmailService;
import com.z7design.secured_guard.dto.ErrorResponse;
import com.z7design.secured_guard.dto.EmailNotificationDTO;
import com.z7design.secured_guard.dto.PanelNotificationDTO;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.Parameter;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notificações", description = "Endpoints para gestão de notificações.")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

        private final NotificationService notificationService;
        private final EmailService emailService;
        private final UserRepository userRepository;

        @PostMapping
        public ResponseEntity<com.z7design.secured_guard.model.Notification> create(
                        @RequestBody com.z7design.secured_guard.model.Notification notification) {
                notificationService.create(notification);
                return ResponseEntity.ok(notification);
        }

        @PutMapping("/{id}/read")
        public ResponseEntity<com.z7design.secured_guard.model.Notification> markAsRead(@PathVariable UUID id) {
                notificationService.markAsRead(id);
                return ResponseEntity.ok().build();
        }

        @PutMapping("/{id}/unread")
        public ResponseEntity<com.z7design.secured_guard.model.Notification> markAsUnread(@PathVariable UUID id) {
                notificationService.markAsUnread(id);
                return ResponseEntity.ok().build();
        }

        @DeleteMapping("/{id}")
        public ResponseEntity<Void> delete(@PathVariable UUID id) {
                notificationService.delete(id);
                return ResponseEntity.noContent().build();
        }

        @GetMapping("/{id}")
        public ResponseEntity<com.z7design.secured_guard.model.Notification> findById(@PathVariable UUID id) {
                com.z7design.secured_guard.model.Notification notification = notificationService.findById(id);
                if (notification != null) {
                        return ResponseEntity.ok(notification);
                } else {
                        return ResponseEntity.notFound().build();
                }
        }

        @GetMapping("/user/{userId}")
        public ResponseEntity<List<com.z7design.secured_guard.model.Notification>> findByUserId(
                        @PathVariable UUID userId) {
                return ResponseEntity.ok(notificationService.findByUserId(userId));
        }

        @GetMapping("/user/{userId}/status/{status}")
        public ResponseEntity<List<com.z7design.secured_guard.model.Notification>> findByUserIdAndStatus(
                        @PathVariable UUID userId,
                        @PathVariable com.z7design.secured_guard.model.enums.NotificationStatus status) {
                return ResponseEntity.ok(notificationService.findByUserIdAndStatus(userId, status));
        }

        @GetMapping("/user/{userId}/type/{type}")
        public ResponseEntity<List<com.z7design.secured_guard.model.Notification>> findByUserIdAndType(
                        @PathVariable UUID userId,
                        @PathVariable com.z7design.secured_guard.model.enums.NotificationType type) {
                return ResponseEntity.ok(notificationService.findByUserIdAndType(userId, type));
        }

        @GetMapping("/date-range")
        public ResponseEntity<List<com.z7design.secured_guard.model.Notification>> findByCreatedAtBetween(
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
                return ResponseEntity.ok(notificationService.findByCreatedAtBetween(startDate, endDate));
        }

        @GetMapping
        public ResponseEntity<List<com.z7design.secured_guard.model.Notification>> findAll() {
                try {
                        return ResponseEntity.ok(notificationService.findAll());
                } catch (Exception e) {
                        e.printStackTrace();
                        return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
                }
        }

        @PostMapping("/email")
        public ResponseEntity<?> sendEmail(@RequestBody EmailNotificationDTO emailDTO) {
                if (emailDTO == null || emailDTO.getTo() == null || emailDTO.getTo().isBlank()) {
                        return ResponseEntity.badRequest()
                                        .body(java.util.Map.of("error", "Bad Request",
                                                        "message", "Destinatário (to) é obrigatório."));
                }
                String subject = emailDTO.getSubject() != null ? emailDTO.getSubject() : "(sem assunto)";
                String body = emailDTO.getBody() != null ? emailDTO.getBody() : "";
                try {
                        boolean success = emailService.sendEmail(emailDTO.getTo().trim(), subject, body);
                        if (success) {
                                return ResponseEntity.ok().build();
                        }
                        return ResponseEntity.status(503)
                                        .body(java.util.Map.of("error", "Service Unavailable",
                                                        "message",
                                                        "Falha ao enviar e-mail. Verifique a configuração SMTP ou use app.email.mock=true em local."));
                } catch (Exception e) {
                        return ResponseEntity.status(500)
                                        .body(java.util.Map.of("error", "Internal Server Error",
                                                        "message", "Erro ao enviar e-mail: " + e.getMessage()));
                }
        }

        @PostMapping("/panel")
        public ResponseEntity<PanelNotificationDTO> createPanelNotification(
                        @RequestBody PanelNotificationDTO notificationDTO) {
                User targetUser = resolveTargetUser(notificationDTO.getDestinatario());
                if (targetUser == null) {
                        return ResponseEntity.badRequest().build();
                }
                String titulo = notificationDTO.getTitulo() != null ? notificationDTO.getTitulo() : "Notificação";
                String descricao = notificationDTO.getDescricao() != null ? notificationDTO.getDescricao() : "";
                String message = (titulo + ": " + descricao).trim();
                if (message.length() < 10) {
                        message = message + " (painel)";
                }
                if (message.length() > 1000) {
                        message = message.substring(0, 997) + "...";
                }
                Notification n = Notification.builder()
                        .user(targetUser)
                        .title(titulo.length() > 100 ? titulo.substring(0, 97) + "..." : titulo)
                        .message(message)
                        .type(NotificationType.INFO)
                        .status(NotificationStatus.UNREAD)
                        .build();
                notificationService.create(n);
                return ResponseEntity.ok(notificationDTO);
        }

        private User resolveTargetUser(String destinatario) {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth == null || !auth.isAuthenticated()) {
                        return null;
                }
                if (destinatario != null && !destinatario.isBlank() && destinatario.contains("@")) {
                        Optional<User> byEmail = userRepository.findByEmail(destinatario.trim());
                        if (byEmail.isPresent()) {
                                return byEmail.get();
                        }
                }
                return userRepository.findByUsername(auth.getName()).orElse(null);
        }
}