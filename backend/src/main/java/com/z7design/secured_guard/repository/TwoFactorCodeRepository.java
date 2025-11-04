package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.TwoFactorCode;
import com.z7design.secured_guard.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TwoFactorCodeRepository extends JpaRepository<TwoFactorCode, UUID> {
    
    Optional<TwoFactorCode> findByUserAndCodeAndPurposeAndUsedFalseAndExpiryDateAfter(
            User user, String code, String purpose, LocalDateTime now);
    
    List<TwoFactorCode> findByUserAndPurpose(User user, String purpose);
    
    void deleteByExpiryDateBefore(LocalDateTime date);
    
    void deleteByUser(User user);
}

