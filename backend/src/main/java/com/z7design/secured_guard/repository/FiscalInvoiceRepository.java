package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.FiscalInvoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FiscalInvoiceRepository extends JpaRepository<FiscalInvoice, UUID> {

    @Query("SELECT f FROM FiscalInvoice f WHERE " +
            "(:periodYear <= 0 OR f.periodYear = :periodYear) AND " +
            "(:periodMonth <= 0 OR f.periodMonth = :periodMonth) AND " +
            "(:clientName = '' OR LOWER(CAST(f.clientName AS string)) LIKE LOWER(CONCAT('%', CAST(:clientName AS string), '%'))) AND " +
            "(:fileType = '' OR f.fileType = :fileType)")
    Page<FiscalInvoice> findByFilters(
            @Param("periodYear") Integer periodYear,
            @Param("periodMonth") Integer periodMonth,
            @Param("clientName") String clientName,
            @Param("fileType") String fileType,
            Pageable pageable);

    @Query("SELECT f FROM FiscalInvoice f WHERE " +
            "(:periodYear <= 0 OR f.periodYear = :periodYear) AND " +
            "(:periodMonth <= 0 OR f.periodMonth = :periodMonth) AND " +
            "(:clientName = '' OR LOWER(CAST(f.clientName AS string)) LIKE LOWER(CONCAT('%', CAST(:clientName AS string), '%'))) AND " +
            "(:fileType = '' OR f.fileType = :fileType)")
    List<FiscalInvoice> findAllByFilters(
            @Param("periodYear") Integer periodYear,
            @Param("periodMonth") Integer periodMonth,
            @Param("clientName") String clientName,
            @Param("fileType") String fileType);
}
