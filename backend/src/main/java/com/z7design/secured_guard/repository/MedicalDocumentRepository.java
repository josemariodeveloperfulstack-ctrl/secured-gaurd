package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.MedicalDocument;
import com.z7design.secured_guard.model.enums.MedicalDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface MedicalDocumentRepository extends JpaRepository<MedicalDocument, UUID>,
        JpaSpecificationExecutor<MedicalDocument> {

    List<MedicalDocument> findByEmployeeIdOrderByStartDateDesc(UUID employeeId);

    @Query("""
        SELECT d FROM MedicalDocument d
        LEFT JOIN FETCH d.employee e
        LEFT JOIN FETCH d.company
        LEFT JOIN FETCH d.createdBy
        WHERE d.id = :id
        """)
    java.util.Optional<MedicalDocument> findByIdWithDetails(@Param("id") UUID id);

    @Query("""
        SELECT d FROM MedicalDocument d
        WHERE d.employee.id = :employeeId
          AND d.status = 'ACTIVE'
          AND UPPER(d.cidCode) = UPPER(:cid)
          AND d.startDate <= :windowEnd
          AND COALESCE(d.endDate, d.startDate) >= :windowStart
        ORDER BY d.startDate ASC
        """)
    List<MedicalDocument> findRelatedByEmployeeAndCidInWindow(
            @Param("employeeId") UUID employeeId,
            @Param("cid") String cid,
            @Param("windowStart") LocalDate windowStart,
            @Param("windowEnd") LocalDate windowEnd);

    @Query("""
        SELECT d.cidDescription FROM MedicalDocument d
        WHERE UPPER(d.cidCode) = UPPER(:cid)
          AND d.cidDescription IS NOT NULL
          AND TRIM(d.cidDescription) <> ''
        ORDER BY d.updatedAt DESC
        """)
    List<String> findCidDescriptions(@Param("cid") String cid);
}
