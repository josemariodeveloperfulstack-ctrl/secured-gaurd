package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "tb_scheduled_email_attachment")
public class ScheduledEmailAttachment {

    public ScheduledEmailAttachment() {
    }

    public ScheduledEmailAttachment(UUID id, ScheduledEmail scheduledEmail, String filename, String contentType, byte[] content) {
        this.id = id;
        this.scheduledEmail = scheduledEmail;
        this.filename = filename;
        this.contentType = contentType;
        this.content = content;
    }

    public static ScheduledEmailAttachmentBuilder builder() {
        return new ScheduledEmailAttachmentBuilder();
    }

    public static class ScheduledEmailAttachmentBuilder {
        private UUID id;
        private ScheduledEmail scheduledEmail;
        private String filename;
        private String contentType;
        private byte[] content;

        public ScheduledEmailAttachmentBuilder() {
        }

        public ScheduledEmailAttachmentBuilder id(UUID id) {
            this.id = id;
            return this;
        }

        public ScheduledEmailAttachmentBuilder scheduledEmail(ScheduledEmail scheduledEmail) {
            this.scheduledEmail = scheduledEmail;
            return this;
        }

        public ScheduledEmailAttachmentBuilder filename(String filename) {
            this.filename = filename;
            return this;
        }

        public ScheduledEmailAttachmentBuilder contentType(String contentType) {
            this.contentType = contentType;
            return this;
        }

        public ScheduledEmailAttachmentBuilder content(byte[] content) {
            this.content = content;
            return this;
        }

        public ScheduledEmailAttachment build() {
            return new ScheduledEmailAttachment(id, scheduledEmail, filename, contentType, content);
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scheduled_email_id", nullable = false)
    private ScheduledEmail scheduledEmail;

    @Column(nullable = false)
    private String filename;

    @Column(name = "content_type")
    private String contentType;

    @Lob
    @Column(nullable = false, length = 30000000)
    private byte[] content;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public ScheduledEmail getScheduledEmail() {
        return scheduledEmail;
    }

    public void setScheduledEmail(ScheduledEmail scheduledEmail) {
        this.scheduledEmail = scheduledEmail;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public byte[] getContent() {
        return content;
    }

    public void setContent(byte[] content) {
        this.content = content;
    }
}
