package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.CompanyContractTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyContractTemplateRepository extends JpaRepository<CompanyContractTemplate, UUID> {

    /**
     * Templates globais oficiais (company_id NULL).
     */
    List<CompanyContractTemplate> findByCompanyIdIsNullAndActiveTrueOrderByTemplateKeyAsc();

    /**
     * Templates específicos de uma empresa.
     */
    List<CompanyContractTemplate> findByCompanyIdAndActiveTrueOrderByTemplateKeyAsc(UUID companyId);

    Optional<CompanyContractTemplate> findFirstByCompanyIdAndTemplateKeyAndActiveTrueOrderByUpdatedAtDesc(
            UUID companyId, String templateKey);

    /**
     * Resolve um template global (company_id NULL) pela chave.
     */
    Optional<CompanyContractTemplate> findFirstByCompanyIdIsNullAndTemplateKeyAndActiveTrueOrderByUpdatedAtDesc(
            String templateKey);

    Optional<CompanyContractTemplate> findFirstByIdOrderByCreatedAtDesc(UUID id);
}
