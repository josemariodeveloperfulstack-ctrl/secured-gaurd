package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "tb_scheduled_email")
public class ScheduledEmail {

    public ScheduledEmail() {
    }

    public ScheduledEmail(UUID id, EmailAccount account, String toAddress, String ccAddress, String bccAddress, String subject, String body, LocalDateTime scheduledTime, String status, List<ScheduledEmailAttachment> attachments, LocalDateTime createdAt) {
        this.id = id;
        this.account = account;
        this.toAddress = toAddress;
        this.ccAddress = ccAddress;
        this.bccAddress = bccAddress;
        this.subject = subject;
        this.body = body;
        this.scheduledTime = scheduledTime;
        this.status = status != null ? status : "PENDING";
        this.attachments = attachments;
        this.createdAt = createdAt;
    }

    public static ScheduledEmailBuilder builder() {
        return new ScheduledEmailBuilder();
    }

    public static class ScheduledEmailBuilder {
        private UUID id;
        private EmailAccount account;
        private String toAddress;
        private String ccAddress;
        private String bccAddress;
        private String subject;
        private String body;
        private LocalDateTime scheduledTime;
        private String status = "PENDING";
        private List<ScheduledEmailAttachment> attachments;
        private LocalDateTime createdAt;

        public ScheduledEmailBuilder() {
        }

        public ScheduledEmailBuilder id(UUID id) {
            this.id = id;
            return this;
        }

        public ScheduledEmailBuilder account(EmailAccount account) {
            this.account = account;
            return this;
        }

        public ScheduledEmailBuilder toAddress(String toAddress) {
            this.toAddress = toAddress;
            return this;
        }

        public ScheduledEmailBuilder ccAddress(String ccAddress) {
            this.ccAddress = ccAddress;
            return this;
        }

        public ScheduledEmailBuilder bccAddress(String bccAddress) {
            this.bccAddress = bccAddress;
            return this;
        }

        public ScheduledEmailBuilder subject(String subject) {
            this.subject = subject;
            return this;
        }

        public ScheduledEmailBuilder body(String body) {
            this.body = body;
            return this;
        }

        public ScheduledEmailBuilder scheduledTime(LocalDateTime scheduledTime) {
            this.scheduledTime = scheduledTime;
            return this;
        }

        public ScheduledEmailBuilder status(String status) {
            this.status = status;
            return this;
        }

        public ScheduledEmailBuilder attachments(List<ScheduledEmailAttachment> attachments) {
            this.attachments = attachments;
            return this;
        }

        public ScheduledEmailBuilder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public ScheduledEmail build() {
            return new ScheduledEmail(id, account, toAddress, ccAddress, bccAddress, subject, body, scheduledTime, status, attachments, createdAt);
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private EmailAccount account;

    @Column(name = "to_address", nullable = false)
    private String toAddress;

    @Column(name = "cc_address")
    private String ccAddress;

    @Column(name = "bcc_address")
    private String bccAddress;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "scheduled_time", nullable = false)
    private LocalDateTime scheduledTime;

    @Column(nullable = false)
    private String status = "PENDING";

    @OneToMany(mappedBy = "scheduledEmail", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScheduledEmailAttachment> attachments;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public EmailAccount getAccount() {
        return account;
    }

    public void setAccount(EmailAccount account) {
        this.account = account;
    }

    public String getToAddress() {
        return toAddress;
    }

    public void setToAddress(String toAddress) {
        this.toAddress = toAddress;
    }

    public String getCcAddress() {
        return ccAddress;
    }

    public void setCcAddress(String ccAddress) {
        this.ccAddress = ccAddress;
    }

    public String getBccAddress() {
        return bccAddress;
    }

    public void setBccAddress(String bccAddress) {
        this.bccAddress = bccAddress;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public LocalDateTime getScheduledTime() {
        return scheduledTime;
    }

    public void setScheduledTime(LocalDateTime scheduledTime) {
        this.scheduledTime = scheduledTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<ScheduledEmailAttachment> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<ScheduledEmailAttachment> attachments) {
        this.attachments = attachments;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
