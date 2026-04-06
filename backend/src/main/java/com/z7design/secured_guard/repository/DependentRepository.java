package com.z7design.secured_guard.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.Dependent;

@Repository
public interface DependentRepository extends JpaRepository<Dependent, UUID> {
    /** Resolvido por JPQL explícito — evita ambiguidade com o campo {@code employee} (ManyToOne). */
    @Query("SELECT d FROM Dependent d WHERE d.employee.id = :employeeId ORDER BY d.name ASC")
    List<Dependent> findByEmployeeId(@Param("employeeId") UUID employeeId);
    List<Dependent> findByCpf(String cpf);

    /**
     * IDs de dependentes cujo CPF, normalizado só com dígitos, coincide (PostgreSQL).
     */
    @Query(value = "SELECT d.id FROM dependents d WHERE regexp_replace(COALESCE(d.cpf, ''), '[^0-9]', '', 'g') = :digits",
            nativeQuery = true)
    List<UUID> findIdsByCpfDigitsNormalized(@Param("digits") String digits);
    List<Dependent> findByRelationship(String relationship);
} 