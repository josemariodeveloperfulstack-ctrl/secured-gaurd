package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.AcordoRecolhimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AcordoRecolhimentoRepository extends JpaRepository<AcordoRecolhimento, UUID> {
    Optional<AcordoRecolhimento> findByNumeroAcordo(String numeroAcordo);
    
    boolean existsByNumeroAcordo(String numeroAcordo);
}
