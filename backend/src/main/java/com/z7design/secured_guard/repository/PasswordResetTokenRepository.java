package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    
    Optional<PasswordResetToken> findByToken(String token);
    
    void deleteByExpiryDateBefore(LocalDateTime date);
    
    void deleteByUserId(UUID userId);
}

