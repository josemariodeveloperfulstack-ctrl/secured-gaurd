package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailMarketingRejectedAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailMarketingRejectedAddressRepository extends JpaRepository<EmailMarketingRejectedAddress, UUID> {

    Optional<EmailMarketingRejectedAddress> findByEmailIgnoreCase(String email);

    List<EmailMarketingRejectedAddress> findByCampaign_IdOrderByRejectedAtDesc(UUID campaignId);

    void deleteByEmailIgnoreCase(String email);

    void deleteByRecipientId(UUID recipientId);

    @Query("""
            select lower(trim(r.email)) from EmailMarketingRejectedAddress r
            where lower(trim(r.email)) in :emailsLower
            """)
    List<String> findExistingEmailsLower(@Param("emailsLower") Collection<String> emailsLower);
}
