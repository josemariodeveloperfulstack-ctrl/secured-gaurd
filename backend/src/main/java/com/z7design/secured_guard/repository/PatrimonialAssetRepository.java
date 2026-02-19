package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.PatrimonialAsset;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatrimonialAssetRepository extends JpaRepository<PatrimonialAsset, UUID> {

    Optional<PatrimonialAsset> findByCode(String code);

    @Query("SELECT a FROM PatrimonialAsset a LEFT JOIN FETCH a.category LEFT JOIN FETCH a.location LEFT JOIN FETCH a.responsibleEmployee WHERE a.id = :id")
    Optional<PatrimonialAsset> findByIdWithAssociations(@Param("id") UUID id);

    Page<PatrimonialAsset> findByCategoryId(UUID categoryId, Pageable pageable);

    Page<PatrimonialAsset> findByLocationId(UUID locationId, Pageable pageable);

    Page<PatrimonialAsset> findByStatus(String status, Pageable pageable);

    @EntityGraph(attributePaths = { "category", "location", "responsibleEmployee" })
    @Query("SELECT a FROM PatrimonialAsset a WHERE " +
            "(LOWER(CAST(a.code AS string)) LIKE LOWER(CONCAT('%', COALESCE(CAST(:codeOrName AS string), ''), '%')) OR LOWER(CAST(a.name AS string)) LIKE LOWER(CONCAT('%', COALESCE(CAST(:codeOrName AS string), ''), '%'))) AND " +
            "(CAST(:categoryId AS string) = '00000000-0000-0000-0000-000000000000' OR a.category.id = :categoryId) AND " +
            "(CAST(:locationId AS string) = '00000000-0000-0000-0000-000000000000' OR a.location.id = :locationId) AND " +
            "(CAST(:status AS string) = '' OR a.status = :status) AND " +
            "a.acquisitionDate >= COALESCE(:acquisitionDateFrom, a.acquisitionDate) AND " +
            "a.acquisitionDate <= COALESCE(:acquisitionDateTo, a.acquisitionDate)")
    Page<PatrimonialAsset> findByFilters(
            @Param("codeOrName") String codeOrName,
            @Param("categoryId") UUID categoryId,
            @Param("locationId") UUID locationId,
            @Param("status") String status,
            @Param("acquisitionDateFrom") LocalDate acquisitionDateFrom,
            @Param("acquisitionDateTo") LocalDate acquisitionDateTo,
            Pageable pageable);

    @Query(value = "SELECT COALESCE(MAX(CAST(SUBSTRING(a.code FROM 10) AS INTEGER)), 0) FROM patrimonial_assets a WHERE a.code LIKE :prefix", nativeQuery = true)
    Integer findMaxSequenceForYear(@Param("prefix") String prefix);
}
