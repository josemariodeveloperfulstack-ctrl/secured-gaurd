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
    @Query("""
            SELECT d FROM Dependent d
            JOIN FETCH d.employee
            WHERE d.employee.id = :employeeId
            ORDER BY d.name ASC
            """)
    List<Dependent> findByEmployeeId(@Param("employeeId") UUID employeeId);

    @Query("SELECT d FROM Dependent d JOIN FETCH d.employee WHERE d.id = :id")
    java.util.Optional<Dependent> findByIdWithEmployee(@Param("id") UUID id);

    @Query("SELECT d FROM Dependent d JOIN FETCH d.employee ORDER BY d.name ASC")
    List<Dependent> findAllWithEmployee();

    @Query("SELECT d FROM Dependent d JOIN FETCH d.employee WHERE d.cpf = :cpf")
    List<Dependent> findByCpfWithEmployee(@Param("cpf") String cpf);

    @Query("SELECT d FROM Dependent d JOIN FETCH d.employee WHERE d.relationship = :relationship ORDER BY d.name ASC")
    List<Dependent> findByRelationshipWithEmployee(@Param("relationship") String relationship);

    /**
     * IDs de dependentes cujo CPF, normalizado só com dígitos, coincide (PostgreSQL).
     */
    @Query(value = "SELECT d.id FROM dependents d WHERE regexp_replace(COALESCE(d.cpf, ''), '[^0-9]', '', 'g') = :digits",
            nativeQuery = true)
    List<UUID> findIdsByCpfDigitsNormalized(@Param("digits") String digits);
}