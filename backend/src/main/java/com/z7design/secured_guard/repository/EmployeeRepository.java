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

        Optional<Employee> findByNameIgnoreCase(String name);

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

        // Buscar dados básicos COM relacionamentos de cargo, unidade, empresa, workPost
        // e department
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id", nativeQuery = true)
        List<Object[]> findBasicData();

        // Versão paginada (LIMIT/OFFSET) para ambientes com muitos registros
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "ORDER BY e.created_at DESC " +
                        "LIMIT :limit OFFSET :offset", nativeQuery = true)
        List<Object[]> findBasicDataPaged(@Param("limit") int limit, @Param("offset") int offset);

        // Buscar dados básicos COM relacionamentos por termo de busca (nome, CPF ou
        // email)
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "WHERE UPPER(e.name) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR (NULLIF(REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '') IS NOT NULL AND REGEXP_REPLACE(COALESCE(e.document, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%')) "
                        +
                        "OR UPPER(COALESCE(e.email, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%'))", nativeQuery = true)
        List<Object[]> findBasicDataBySearchTerm(@Param("searchTerm") String searchTerm);

        // Versão paginada com termo de busca
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "WHERE UPPER(e.name) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR (NULLIF(REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '') IS NOT NULL AND REGEXP_REPLACE(COALESCE(e.document, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%')) "
                        +
                        "OR UPPER(COALESCE(e.email, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "ORDER BY e.created_at DESC " +
                        "LIMIT :limit OFFSET :offset", nativeQuery = true)
        List<Object[]> findBasicDataBySearchTermPaged(@Param("searchTerm") String searchTerm,
                        @Param("limit") int limit,
                        @Param("offset") int offset);

        // Buscar apenas o nome por ID para evitar carregar toda a entidade (e colunas
        // inexistentes em alguns ambientes)
        @Query("SELECT e.name FROM Employee e WHERE e.id = :id")
        Optional<String> findNameById(@Param("id") UUID id);

        // Buscar por CPF (coluna cpf do banco)
        @Query(value = "SELECT * FROM employees WHERE REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = :cpf LIMIT 1", nativeQuery = true)
        Optional<Employee> findByCpf(@Param("cpf") String cpf);

        // Buscar por matrícula (registration_number)
        @Query(value = "SELECT * FROM employees WHERE UPPER(TRIM(registration_number)) = UPPER(TRIM(:registrationNumber)) LIMIT 1", nativeQuery = true)
        Optional<Employee> findByRegistrationNumber(@Param("registrationNumber") String registrationNumber);

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

        // Buscar por conta corrente (normaliza removendo espaços, hífens e pontos)
        @Query(value = "SELECT * FROM employees WHERE " +
                        "REGEXP_REPLACE(COALESCE(conta_corrente, ''), '[^0-9]', '', 'g') = :contaCorrente " +
                        "LIMIT 1", nativeQuery = true)
        Optional<Employee> findByContaCorrente(@Param("contaCorrente") String contaCorrente);

        /**
         * Busca funcionário por matrícula eSocial (exata, case insensitive).
         * Usado na importação Excel para atualizar registro existente quando CPF não for encontrado.
         */
        Optional<Employee> findByMatriculaEsocialIgnoreCase(String matriculaEsocial);
}