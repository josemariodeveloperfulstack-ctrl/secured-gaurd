// src/main/java/com/z7design/secured_guard/repository/EquipmentRepository.java
package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Equipment;
import com.z7design.secured_guard.model.enums.EquipmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, UUID> {
    Optional<Equipment> findBySerialNumber(String serialNumber);
    boolean existsBySerialNumber(String serialNumber);
    List<Equipment> findByStatus(EquipmentStatus status);
    long countByStatus(EquipmentStatus status);
    List<Equipment> findByCurrentUserId(UUID currentUserId);
    List<Equipment> findByValidityDateBefore(LocalDate date);
    long countByValidityDateBefore(LocalDate date);
    long countByValidityDateBetween(LocalDate start, LocalDate end);
    List<Equipment> findByWeaponRegistrationValidityBefore(LocalDate date);
    List<Equipment> findByIsDangerous(Boolean isDangerous);
    List<Equipment> findByIsDangerousTrue();
    long countByIsDangerousTrue();
    List<Equipment> findByBatch(String batch);
    List<Equipment> findByModel(String model);
    
    // Consultas específicas para controle de tipo e postos de trabalho (Cofre vs Alocado)
    long countByTypeAndWorkPostIdIsNull(com.z7design.secured_guard.model.enums.EquipmentType type);
    List<Equipment> findByWorkPostIdIsNull();
    List<Equipment> findByWorkPostId(UUID workPostId);
    
    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(e.quantity), 0) FROM Equipment e WHERE e.type = :type AND e.workPostId IS NULL")
    long sumQuantityByTypeAndWorkPostIdIsNull(@org.springframework.data.repository.query.Param("type") com.z7design.secured_guard.model.enums.EquipmentType type);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(e.quantity), 0) FROM Equipment e WHERE e.type = :type AND e.workPostId IS NOT NULL")
    long sumQuantityByTypeAndWorkPostIdIsNotNull(@org.springframework.data.repository.query.Param("type") com.z7design.secured_guard.model.enums.EquipmentType type);
}

