package com.z7design.secured_guard.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.Document;
import com.z7design.secured_guard.model.enums.DocumentType;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {
    
    List<Document> findByEmployeeId(UUID employeeId);
    
    List<Document> findByType(DocumentType type);
    
    List<Document> findByExpirationDateBefore(LocalDateTime date);
    
    List<Document> findByEmployeeIdAndType(UUID employeeId, DocumentType type);
    
    // Métodos de contagem para estatísticas
    long countBySignedTrue();
    long countBySignedFalse();
    long countByExpirationDateBefore(LocalDateTime date);
}