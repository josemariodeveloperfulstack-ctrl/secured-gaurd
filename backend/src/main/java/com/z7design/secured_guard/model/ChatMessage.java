package com.z7design.secured_guard.model;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import com.z7design.secured_guard.model.enums.ChatMessageType;
import org.hibernate.proxy.HibernateProxy;

@Entity
@Table(name = "chat_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Conteúdo pode ser vazio quando há arquivo
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    @NotNull(message = "Remetente é obrigatório")
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id")
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private UserGroupEntity group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;

    @NotNull(message = "Tipo de mensagem é obrigatório")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChatMessageType type = ChatMessageType.TEXT;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "edited_at")
    private LocalDateTime editedAt;

    @Column(name = "reply_to_id")
    private UUID replyToId;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "file_content_type")
    private String fileContentType;

    @Column(name = "created_at", nullable = false)
    @NotNull(message = "Data de criação é obrigatória")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Defensive Getters for Orphan References
    public User getSender() {
        if (sender == null) {
            return null;
        }
        try {
            if (sender instanceof HibernateProxy) {
                HibernateProxy proxy = (HibernateProxy) sender;
                try {
                    proxy.getHibernateLazyInitializer().initialize();
                } catch (jakarta.persistence.EntityNotFoundException e) {
                    this.sender = null;
                    return null;
                }
            }
            sender.getId();
            return sender;
        } catch (jakarta.persistence.EntityNotFoundException e) {
            this.sender = null;
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public User getRecipient() {
        if (recipient == null) {
            return null;
        }
        try {
            if (recipient instanceof HibernateProxy) {
                HibernateProxy proxy = (HibernateProxy) recipient;
                try {
                    proxy.getHibernateLazyInitializer().initialize();
                } catch (jakarta.persistence.EntityNotFoundException e) {
                    this.recipient = null;
                    return null;
                }
            }
            recipient.getId();
            return recipient;
        } catch (jakarta.persistence.EntityNotFoundException e) {
            this.recipient = null;
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public UserGroupEntity getGroup() {
        if (group == null) {
            return null;
        }
        try {
            if (group instanceof HibernateProxy) {
                HibernateProxy proxy = (HibernateProxy) group;
                try {
                    proxy.getHibernateLazyInitializer().initialize();
                } catch (jakarta.persistence.EntityNotFoundException e) {
                    this.group = null;
                    return null;
                }
            }
            group.getId();
            return group;
        } catch (jakarta.persistence.EntityNotFoundException e) {
            this.group = null;
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    public Department getDepartment() {
        if (department == null) {
            return null;
        }
        try {
            if (department instanceof HibernateProxy) {
                HibernateProxy proxy = (HibernateProxy) department;
                try {
                    proxy.getHibernateLazyInitializer().initialize();
                } catch (jakarta.persistence.EntityNotFoundException e) {
                    this.department = null;
                    return null;
                }
            }
            department.getId();
            return department;
        } catch (jakarta.persistence.EntityNotFoundException e) {
            this.department = null;
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}