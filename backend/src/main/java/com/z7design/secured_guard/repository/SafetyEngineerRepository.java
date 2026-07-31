package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.SafetyEngineer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SafetyEngineerRepository extends JpaRepository<SafetyEngineer, UUID> {
    List<SafetyEngineer> findAllByOrderByNameAsc();

    List<SafetyEngineer> findByCompanyIdOrderByNameAsc(UUID companyId);

    Optional<SafetyEngineer> findFirstByCompanyIdOrderByNameAsc(UUID companyId);

    Optional<SafetyEngineer> findFirstByCompanyIdAndActiveTrueOrderByNameAsc(UUID companyId);

    @Query("""
            SELECT DISTINCT se FROM SafetyEngineer se
            LEFT JOIN FETCH se.companies
            LEFT JOIN FETCH se.company
            """)
    List<SafetyEngineer> findAllWithCompanies();

    @Query("""
            SELECT DISTINCT se FROM SafetyEngineer se
            LEFT JOIN se.companies linked
            WHERE se.company.id = :companyId OR linked.id = :companyId
            ORDER BY se.name ASC
            """)
    List<SafetyEngineer> findLinkedToCompany(@Param("companyId") UUID companyId);
}
