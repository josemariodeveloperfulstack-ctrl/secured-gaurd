package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailCache;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailCacheRepository extends JpaRepository<EmailCache, UUID> {
    Page<EmailCache> findByAccountIdAndFolderOrderByReceivedDateDesc(UUID accountId, String folder, Pageable pageable);
    Optional<EmailCache> findByAccountIdAndProviderUid(UUID accountId, Long providerUid);
    void deleteByAccountIdAndFolder(UUID accountId, String folder);
}
