package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailLog;
import com.z7design.secured_guard.model.enums.EmailLogStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
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
            where l.campaign.id = :campaignId
              and l.status in :statuses
            order by l.createdAt desc
            """)
    List<EmailLog> findByCampaignIdAndStatusIn(
            @Param("campaignId") UUID campaignId,
            @Param("statuses") java.util.Collection<com.z7design.secured_guard.model.enums.EmailLogStatus> statuses);

    @Query("""
            select l from EmailLog l
            join fetch l.recipient r
            where lower(r.email) = lower(:email)
            and l.status not in ('BOUNCED', 'DROPPED')
            order by l.createdAt desc
            """)
    List<EmailLog> findRecentByRecipientEmail(@Param("email") String email);

    // ===== Suporte ao scheduler de envio com throttling (Onda 2) =====

    /** Próximos PENDING da campanha, do mais antigo para o mais novo. */
    @Query("""
            select l from EmailLog l
            join fetch l.recipient r
            where l.campaign.id = :campaignId and l.status = 'PENDING'
            order by l.createdAt asc
            """)
    List<EmailLog> findPendingByCampaignOrderedByCreatedAt(@Param("campaignId") UUID campaignId);

    /** Conta envios efetivos (status SENT/DELIVERED/etc — sentAt não nulo) feitos a partir de um instante. */
    @Query("""
            select count(l) from EmailLog l
            where l.campaign.id = :campaignId
              and l.sentAt is not null
              and l.sentAt >= :from
            """)
    long countSentSinceForCampaign(@Param("campaignId") UUID campaignId, @Param("from") Instant from);

    /** Conta envios efetivos da campanha (qualquer momento). */
    long countByCampaign_IdAndSentAtIsNotNull(UUID campaignId);

    /** Último envio efetivo, usado para checar intervalo mínimo. */
    Optional<EmailLog> findFirstByCampaign_IdAndSentAtIsNotNullOrderBySentAtDesc(UUID campaignId);

    /** Conta logs por status, usado para decidir se a campanha terminou. */
    long countByCampaign_IdAndStatus(UUID campaignId, EmailLogStatus status);
}
