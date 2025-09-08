package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.CalculationMemory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CalculationMemoryRepository extends JpaRepository<CalculationMemory, UUID> {

    // Buscar memória de cálculo por boletim
    Optional<CalculationMemory> findByBulletinId(UUID bulletinId);

    // Deletar memória de cálculo por boletim
    void deleteByBulletinId(UUID bulletinId);
}