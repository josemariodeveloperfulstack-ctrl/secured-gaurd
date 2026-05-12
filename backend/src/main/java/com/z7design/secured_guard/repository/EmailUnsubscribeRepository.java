package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailUnsubscribe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface EmailUnsubscribeRepository extends JpaRepository<EmailUnsubscribe, UUID> {

    Optional<EmailUnsubscribe> findByToken(String token);

    @Query("select u from EmailUnsubscribe u where lower(u.email) = lower(:email)")
    Optional<EmailUnsubscribe> findByEmailIgnoreCase(@Param("email") String email);

    boolean existsByEmailIgnoreCaseAndIsUnsubscribedTrue(String email);
}
