package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailLogRepository extends JpaRepository<EmailLog, UUID> {

    Optional<EmailLog> findByProviderMessageId(String providerMessageId);

    List<EmailLog> findByCampaign_IdOrderByCreatedAtDesc(UUID campaignId);

    @Query("""
            select l from EmailLog l
            join fetch l.recipient r
            where l.campaign.id = :campaignId
            order by l.createdAt desc
            """)
    List<EmailLog> findByCampaignIdWithRecipient(@Param("campaignId") UUID campaignId);

    @Query("""
            select l from EmailLog l
            join fetch l.recipient r
            where lower(r.email) = lower(:email)
            and l.status not in ('BOUNCED', 'DROPPED')
            order by l.createdAt desc
            """)
    List<EmailLog> findRecentByRecipientEmail(@Param("email") String email);
}
