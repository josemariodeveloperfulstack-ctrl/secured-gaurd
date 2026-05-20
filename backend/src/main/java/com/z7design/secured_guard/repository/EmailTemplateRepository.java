package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, UUID> {

    List<EmailTemplate> findAllByOrderByIsDefaultDescNameAsc();

    List<EmailTemplate> findByIsActiveTrueOrderByIsDefaultDescNameAsc();

    Optional<EmailTemplate> findByCode(String code);
}
