package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailCampaignRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailCampaignRecipientRepository extends JpaRepository<EmailCampaignRecipient, UUID> {

    List<EmailCampaignRecipient> findByCampaign_Id(UUID campaignId);
    List<EmailCampaignRecipient> findByCampaign_IdAndEmailMarketingSuppressedFalse(UUID campaignId);
    List<EmailCampaignRecipient> findByCampaign_IdAndEmailMarketingSuppressedTrueOrderByCreatedAtDesc(UUID campaignId);
    Optional<EmailCampaignRecipient> findByIdAndCampaign_Id(UUID id, UUID campaignId);

    @Query("select r from EmailCampaignRecipient r where lower(r.email) = lower(:email)")
    Optional<EmailCampaignRecipient> findFirstByEmailIgnoreCase(@Param("email") String email);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update EmailCampaignRecipient r
            set r.emailMarketingSuppressed = true
            where lower(trim(r.email)) = lower(trim(:email))
            """)
    int suppressMarketingByEmailIgnoreCase(@Param("email") String email);
}
