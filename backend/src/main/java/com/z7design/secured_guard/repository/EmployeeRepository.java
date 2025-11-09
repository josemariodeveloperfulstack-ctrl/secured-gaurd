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
    
    Optional<Employee> findByUserId(UUID userId);
    
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
    
    // Buscar por CPF (coluna cpf do banco)
    @Query(value = "SELECT * FROM employees WHERE REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = :cpf LIMIT 1", nativeQuery = true)
    Optional<Employee> findByCpf(@Param("cpf") String cpf);
    
    // Buscar por nome (exato, case insensitive)
    @Query(value = "SELECT * FROM employees WHERE UPPER(TRIM(name)) = UPPER(TRIM(:name)) LIMIT 1", nativeQuery = true)
    Optional<Employee> findByNameExact(@Param("name") String name);
    
    // Buscar por WhatsApp/phone normalizado (remove caracteres não numéricos)
    // A normalização acontece no código Java, aqui busca por valores normalizados
    @Query(value = "SELECT * FROM employees WHERE " +
            "REGEXP_REPLACE(COALESCE(whatsapp, ''), '[^0-9]', '', 'g') = :whatsapp OR " +
            "REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') = :whatsapp " +
            "LIMIT 1", nativeQuery = true)
    Optional<Employee> findByWhatsApp(@Param("whatsapp") String whatsapp);
    
    // List<Employee> findByPossuiWhatsappTrue();
} 