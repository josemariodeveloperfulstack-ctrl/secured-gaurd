package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.ContractDocumentType;
import com.z7design.secured_guard.model.enums.DocumentSignatureStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "contract_documents")
public class ContractDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    private Contract contract;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private ContractDocumentType type;

    @Column(name = "file_url", length = 1000)
    private String fileUrl;

    @Column(name = "file_name")
    private String fileName;

    @Enumerated(EnumType.STRING)
    @Column(name = "signature_status", nullable = false)
    private DocumentSignatureStatus signatureStatus = DocumentSignatureStatus.PENDING;

    @Column(name = "signed_at")
    private LocalDateTime signedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "signed_by_id")
    private User signedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public ContractDocument() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Contract getContract() { return contract; }
    public void setContract(Contract contract) { this.contract = contract; }

    public ContractDocumentType getType() { return type; }
    public void setType(ContractDocumentType type) { this.type = type; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public DocumentSignatureStatus getSignatureStatus() { return signatureStatus; }
    public void setSignatureStatus(DocumentSignatureStatus signatureStatus) { this.signatureStatus = signatureStatus; }

    public LocalDateTime getSignedAt() { return signedAt; }
    public void setSignedAt(LocalDateTime signedAt) { this.signedAt = signedAt; }

    public User getSignedBy() { return signedBy; }
    public void setSignedBy(User signedBy) { this.signedBy = signedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
