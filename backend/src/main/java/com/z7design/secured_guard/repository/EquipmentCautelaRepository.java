package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.EquipmentCautela;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EquipmentCautelaRepository extends JpaRepository<EquipmentCautela, Long> {

    List<EquipmentCautela> findAllByOrderByTermDateDescCreatedAtDesc();

    @Query("SELECT e FROM EquipmentCautela e WHERE " +
           "(:startDate IS NULL OR e.termDate >= :startDate) AND " +
           "(:endDate IS NULL OR e.termDate <= :endDate) AND " +
           "(:status IS NULL OR e.status = :status) AND " +
           "(:search IS NULL OR (" +
           "LOWER(e.employeeName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.registration) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.cpf) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.workPostName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.jobTitle) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.item1HtMarcaModelo) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.item3LanternaMarcaModelo) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(e.item4BastaoMarcaModelo) LIKE LOWER(CONCAT('%', :search, '%'))" +
           ")) " +
           "ORDER BY e.termDate DESC, e.createdAt DESC")
    List<EquipmentCautela> findWithFilters(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("status") String status,
            @Param("search") String search
    );
}
