package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    /**
     * Busca token válido
     */
    @Query("SELECT prt FROM PasswordResetToken prt " +
           "WHERE prt.token = :token " +
           "AND prt.isUsed = FALSE " +
           "AND prt.isExpired = FALSE " +
           "AND prt.expiresAt > :now")
    Optional<PasswordResetToken> findValidToken(
        @Param("token") String token,
        @Param("now") LocalDateTime now
    );

    /**
     * Busca token por string (válido ou não)
     */
    Optional<PasswordResetToken> findByToken(String token);

    /**
     * Busca todos os tokens de um usuário
     */
    @Query("SELECT prt FROM PasswordResetToken prt " +
           "WHERE prt.user.id = :userId " +
           "ORDER BY prt.createdAt DESC")
    java.util.List<PasswordResetToken> findByUserId(@Param("userId") UUID userId);

    /**
     * Invalida todos os tokens antigos de um usuário
     */
    @Modifying
    @Transactional
    @Query("UPDATE PasswordResetToken prt " +
           "SET prt.isExpired = TRUE " +
           "WHERE prt.user.id = :userId " +
           "AND prt.isUsed = FALSE")
    void expireAllUserTokens(@Param("userId") UUID userId);

    /**
     * Deleta tokens expirados há mais de 7 dias
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM PasswordResetToken prt " +
           "WHERE prt.expiresAt < :cutoffDate")
    void deleteExpiredTokens(@Param("cutoffDate") LocalDateTime cutoffDate);
}
