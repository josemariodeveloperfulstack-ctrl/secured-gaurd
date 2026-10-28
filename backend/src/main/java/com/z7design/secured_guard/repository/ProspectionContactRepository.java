package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.prospection.ProspectionContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProspectionContactRepository extends JpaRepository<ProspectionContact, UUID> {
    List<ProspectionContact> findByCompanyId(UUID companyId);
    List<ProspectionContact> findByCargoTipo(String cargoTipo);
}
