package com.z7design.secured_guard.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.enums.EmploymentStatus;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    
    Optional<Employee> findByEmail(String email);
    
    List<Employee> findByStatus(EmploymentStatus status);
    
    List<Employee> findByUnitId(UUID unitId);
    
    List<Employee> findByPositionId(UUID positionId);
    
    boolean existsByEmail(String email);
    
    boolean existsByDocument(String document);
    
    Optional<Employee> findByDocument(String document);
    
    // Métodos para envio de holerites
    List<Employee> findByEmailIsNotNullAndEmailNot(String empty);
    
    // Busca por nome (case insensitive)
    List<Employee> findByNameContainingIgnoreCase(String name);
    
    // Busca por nome ou documento (case insensitive)
    List<Employee> findByNameContainingIgnoreCaseOrDocumentContainingIgnoreCase(String name, String document);
    
    // Buscar apenas IDs
    @Query("SELECT e.id FROM Employee e")
    List<UUID> findAllIds();
    
    // Buscar dados básicos sem relacionamentos
    @Query(value = "SELECT id, name, document, birth_date, registration_number, hire_date, termination_date, status, notes, address, phone, email, cnh_number, ctps, cbo, pis, salario, created_at, updated_at FROM employees", nativeQuery = true)
    List<Object[]> findBasicData();

    // Buscar apenas o nome por ID para evitar carregar toda a entidade (e colunas inexistentes em alguns ambientes)
    @Query("SELECT e.name FROM Employee e WHERE e.id = :id")
    Optional<String> findNameById(@Param("id") UUID id);
    
    // List<Employee> findByPossuiWhatsappTrue();
} 