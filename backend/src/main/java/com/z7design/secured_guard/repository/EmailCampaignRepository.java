package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailCampaignRepository extends JpaRepository<EmailCampaign, UUID> {

    @Query("select distinct c from EmailCampaign c left join fetch c.recipients where c.id = :id")
    Optional<EmailCampaign> findWithRecipientsById(@Param("id") UUID id);

    @Query("select distinct c from EmailCampaign c left join fetch c.recipients order by c.createdAt desc")
    List<EmailCampaign> findAllWithRecipientsOrderByCreatedAtDesc();
}
