package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.FirearmAcautelamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FirearmAcautelamentoRepository extends JpaRepository<FirearmAcautelamento, Long> {

    List<FirearmAcautelamento> findAllByOrderByTermDateDescCreatedAtDesc();

    @Query("SELECT f FROM FirearmAcautelamento f WHERE " +
           "(:startDate IS NULL OR f.termDate >= :startDate) AND " +
           "(:endDate IS NULL OR f.termDate <= :endDate) AND " +
           "(:status IS NULL OR f.status = :status) AND " +
           "(:search IS NULL OR (" +
           "LOWER(f.vigilanteName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(f.serialNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(f.crafNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(f.weaponType) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(f.brand) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(f.workPostName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(f.cpf) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(f.registration) LIKE LOWER(CONCAT('%', :search, '%'))" +
           ")) " +
           "ORDER BY f.termDate DESC, f.createdAt DESC")
    List<FirearmAcautelamento> findWithFilters(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("status") String status,
            @Param("search") String search
    );
}
