package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailMarketingImportedList;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface EmailMarketingImportedListRepository extends JpaRepository<EmailMarketingImportedList, UUID> {

    List<EmailMarketingImportedList> findAllByOrderByUpdatedAtDesc();
}
