package com.z7design.secured_guard.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
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
        long countByStatus(EmploymentStatus status);

        List<Employee> findByUnitId(UUID unitId);

        List<Employee> findByPositionId(UUID positionId);

        boolean existsByEmail(String email);

        boolean existsByDocument(String document);

        @Query(value = "SELECT EXISTS(SELECT 1 FROM employees WHERE "
                        + "REGEXP_REPLACE(COALESCE(document, ''), '[^0-9]', '', 'g') = :normalizedDocument OR "
                        + "REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = :normalizedDocument)",
                        nativeQuery = true)
        boolean existsByNormalizedDocument(@Param("normalizedDocument") String normalizedDocument);

        @Query(value = "SELECT EXISTS(SELECT 1 FROM employees WHERE id != :excludeId AND ("
                        + "REGEXP_REPLACE(COALESCE(document, ''), '[^0-9]', '', 'g') = :normalizedDocument OR "
                        + "REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = :normalizedDocument))",
                        nativeQuery = true)
        boolean existsByNormalizedDocumentExcludingId(
                        @Param("normalizedDocument") String normalizedDocument,
                        @Param("excludeId") UUID excludeId);

        /**
         * Verifica se existe funcionário com este CPF/documento que NÃO esteja demitido (TERMINATED).
         * Usado para permitir nova admissão quando o cadastro anterior foi encerrado.
         */
        @Query(value = "SELECT EXISTS(" +
                        "SELECT 1 FROM employees WHERE " +
                        "(REGEXP_REPLACE(COALESCE(document, ''), '[^0-9]', '', 'g') = :normalizedDocument " +
                        " OR REGEXP_REPLACE(COALESCE(cpf, ''), '[^0-9]', '', 'g') = :normalizedDocument) " +
                        "AND CAST(status AS text) <> 'TERMINATED')",
                        nativeQuery = true)
        boolean existsByNormalizedDocumentAndNotTerminated(@Param("normalizedDocument") String normalizedDocument);

        Optional<Employee> findByNameIgnoreCase(String name);

        Optional<Employee> findByDocument(String document);

        // Métodos para envio de holerites
        List<Employee> findByEmailIsNotNullAndEmailNot(String empty);

        // Busca por nome (case insensitive)
        List<Employee> findByNameContainingIgnoreCase(String name);

        // Busca por nome ou documento (case insensitive)
        List<Employee> findByNameContainingIgnoreCaseOrDocumentContainingIgnoreCase(String name, String document);

        /** Busca para autocomplete com relacionamentos (setor, posto, cargo). */
        @Query("SELECT DISTINCT e FROM Employee e " +
                        "LEFT JOIN FETCH e.position " +
                        "LEFT JOIN FETCH e.unit " +
                        "LEFT JOIN FETCH e.company " +
                        "LEFT JOIN FETCH e.workPost " +
                        "LEFT JOIN FETCH e.department " +
                        "WHERE LOWER(e.name) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
                        "LOWER(COALESCE(e.document, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
                        "LOWER(COALESCE(e.cpf, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
                        "LOWER(COALESCE(e.matriculaEsocial, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
                        "LOWER(COALESCE(e.registrationNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')) " +
                        "ORDER BY e.name ASC")
        List<Employee> findForSimpleSearch(@Param("q") String q);

        @EntityGraph(attributePaths = { "position", "department", "workPost", "unit", "company" })
        @Query("SELECT e FROM Employee e WHERE e.id = :id")
        Optional<Employee> findWithOrgContextById(@Param("id") UUID id);

        // Buscar apenas IDs
        @Query("SELECT e.id FROM Employee e")
        List<UUID> findAllIds();

        // Busca customizada com FETCH JOIN para carregar relacionamentos essenciais em uma única consulta
        // Evita N+1 e garante que LazyInitializationException não ocorra durante a exportação
        @Query("SELECT DISTINCT e FROM Employee e " +
                        "LEFT JOIN FETCH e.position " +
                        "LEFT JOIN FETCH e.unit " +
                        "LEFT JOIN FETCH e.company " +
                        "LEFT JOIN FETCH e.workPost " +
                        "LEFT JOIN FETCH e.department " +
                        "WHERE e.id IN :ids")
        java.util.Set<Employee> findAllByIdIn(@Param("ids") List<UUID> ids);

        @Query("SELECT DISTINCT e FROM Employee e")
        java.util.Set<Employee> findAllDistinct();

        // Buscar dados básicos COM relacionamentos de cargo, unidade, empresa, workPost
        // e department
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name, e.unit_id, e.company_id, e.work_post_id, e.position_id, e.department_id, e.escala_trabalho, e.horario_trabalho, e.data_rescisao "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "ORDER BY e.name ASC", nativeQuery = true)
        List<Object[]> findBasicData();

        // Versão paginada SEM filtro de empresa (status opcional)
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name, e.unit_id, e.company_id, e.work_post_id, e.position_id, e.department_id, e.escala_trabalho, e.horario_trabalho, e.data_rescisao "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "WHERE (:status IS NULL OR CAST(e.status AS text) = :status) " +
                        "ORDER BY e.name ASC " +
                        "LIMIT :limit OFFSET :offset", nativeQuery = true)
        List<Object[]> findBasicDataPaged(@Param("limit") int limit, @Param("offset") int offset, @Param("status") String status);

        // Versão paginada COM filtro de empresa (status opcional)
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name, e.unit_id, e.company_id, e.work_post_id, e.position_id, e.department_id, e.escala_trabalho, e.horario_trabalho, e.data_rescisao "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "WHERE e.company_id = :companyId AND (:status IS NULL OR CAST(e.status AS text) = :status) " +
                        "ORDER BY e.name ASC " +
                        "LIMIT :limit OFFSET :offset", nativeQuery = true)
        List<Object[]> findBasicDataPagedByCompany(@Param("limit") int limit, @Param("offset") int offset, @Param("companyId") UUID companyId, @Param("status") String status);

        // Buscar dados básicos COM relacionamentos por termo de busca (nome, CPF ou
        // email)
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name, e.unit_id, e.company_id, e.work_post_id, e.position_id, e.department_id, e.escala_trabalho, e.horario_trabalho, e.data_rescisao "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "WHERE (UPPER(e.name) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.document, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.cpf, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.matricula_esocial, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.registration_number, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR (NULLIF(REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '') IS NOT NULL AND (" +
                        "    REGEXP_REPLACE(COALESCE(e.document, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        "    OR REGEXP_REPLACE(COALESCE(e.cpf, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        "    OR REGEXP_REPLACE(COALESCE(e.matricula_esocial, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        "    OR REGEXP_REPLACE(COALESCE(e.registration_number, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        ")) " +
                        "OR UPPER(COALESCE(e.email, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%'))) " +
                        "ORDER BY e.name ASC", nativeQuery = true)
        List<Object[]> findBasicDataBySearchTerm(@Param("searchTerm") String searchTerm);

        // Versão paginada com termo de busca SEM filtro de empresa (status opcional)
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name, e.unit_id, e.company_id, e.work_post_id, e.position_id, e.department_id, e.escala_trabalho, e.horario_trabalho, e.data_rescisao "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "WHERE (UPPER(e.name) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.document, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.cpf, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.matricula_esocial, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.registration_number, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR (NULLIF(REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '') IS NOT NULL AND (" +
                        "    REGEXP_REPLACE(COALESCE(e.document, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        "    OR REGEXP_REPLACE(COALESCE(e.cpf, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        "    OR REGEXP_REPLACE(COALESCE(e.matricula_esocial, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        "    OR REGEXP_REPLACE(COALESCE(e.registration_number, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        ")) " +
                        "OR UPPER(COALESCE(e.email, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%'))) " +
                        "AND (:status IS NULL OR CAST(e.status AS text) = :status) " +
                        "ORDER BY e.name ASC " +
                        "LIMIT :limit OFFSET :offset", nativeQuery = true)
        List<Object[]> findBasicDataBySearchTermPaged(@Param("searchTerm") String searchTerm,
                        @Param("limit") int limit,
                        @Param("offset") int offset,
                        @Param("status") String status);

        // Versão paginada com termo de busca COM filtro de empresa (status opcional)
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name, e.unit_id, e.company_id, e.work_post_id, e.position_id, e.department_id, e.escala_trabalho, e.horario_trabalho, e.data_rescisao "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "WHERE (UPPER(e.name) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.document, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.cpf, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.matricula_esocial, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR UPPER(COALESCE(e.registration_number, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%')) " +
                        "OR (NULLIF(REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '') IS NOT NULL AND (" +
                        "    REGEXP_REPLACE(COALESCE(e.document, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        "    OR REGEXP_REPLACE(COALESCE(e.cpf, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        "    OR REGEXP_REPLACE(COALESCE(e.matricula_esocial, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        "    OR REGEXP_REPLACE(COALESCE(e.registration_number, ''), '[^0-9]', '', 'g') LIKE CONCAT('%', REGEXP_REPLACE(:searchTerm, '[^0-9]', '', 'g'), '%') " +
                        ")) " +
                        "OR UPPER(COALESCE(e.email, '')) LIKE UPPER(CONCAT('%', :searchTerm, '%'))) " +
                        "AND e.company_id = :companyId AND (:status IS NULL OR CAST(e.status AS text) = :status) " +
                        "ORDER BY e.name ASC " +
                        "LIMIT :limit OFFSET :offset", nativeQuery = true)
        List<Object[]> findBasicDataBySearchTermPagedByCompany(@Param("searchTerm") String searchTerm,
                        @Param("limit") int limit,
                        @Param("offset") int offset,
                        @Param("companyId") UUID companyId,
                        @Param("status") String status);

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

        /**
         * Busca funcionário pelo token opaco do QR Code (usado pelo Supervisor durante visita).
         * O token é único e nunca null (filtra por NOT NULL para evitar colisão em registros antigos).
         */
        @Query("SELECT e FROM Employee e WHERE e.qrCodeToken IS NOT NULL AND e.qrCodeToken = :token")
        Optional<Employee> findByQrCodeToken(@Param("token") String token);

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

        // Contagens para estatísticas por empresa
        long countByCompanyId(UUID companyId);
        long countByCompanyIdAndStatus(UUID companyId, EmploymentStatus status);

        @Query("SELECT DISTINCT e.workPost.id FROM Employee e WHERE e.company.id = :companyId AND e.workPost IS NOT NULL")
        List<UUID> findDistinctWorkPostIdsByCompanyId(@Param("companyId") UUID companyId);

        /**
         * Aniversariantes do mês (mesma projeção de {@link #findBasicData()}).
         * {@code onlyActive}: 1 = apenas ACTIVE; 0 = todos os status.
         * {@code companyFilter}: 0 = todas as empresas; 1 = filtrar por {@code companyId}.
         * Evita {@code :companyId IS NULL} na SQL nativa — PostgreSQL não infere tipo do parâmetro em {@code IS NULL}.
         */
        @Query(value = "SELECT e.id, e.name, e.document, e.birth_date, e.registration_number, e.hire_date, e.termination_date, e.status, e.notes, e.address, e.phone, e.email, e.cnh_number, e.ctps, e.cbo, e.pis, e.salario, e.created_at, e.updated_at, p.name as position_name, u.name as unit_name, c.sigla as company_sigla, e.user_id, wp.name as work_post_name, d.name as department_name, e.unit_id, e.company_id, e.work_post_id, e.position_id, e.department_id, e.escala_trabalho, e.horario_trabalho, e.data_rescisao "
                        +
                        "FROM employees e " +
                        "LEFT JOIN positions p ON e.position_id = p.id " +
                        "LEFT JOIN units u ON e.unit_id = u.id " +
                        "LEFT JOIN companies c ON e.company_id = c.id " +
                        "LEFT JOIN work_posts wp ON e.work_post_id = wp.id " +
                        "LEFT JOIN departments d ON e.department_id = d.id " +
                        "WHERE e.birth_date IS NOT NULL " +
                        "AND EXTRACT(MONTH FROM e.birth_date) = :month " +
                        "AND (:onlyActive = 0 OR CAST(e.status AS text) = 'ACTIVE') " +
                        "AND (:companyFilter = 0 OR e.company_id = :companyId) " +
                        "ORDER BY EXTRACT(DAY FROM e.birth_date) ASC, e.name ASC", nativeQuery = true)
        List<Object[]> findBasicDataByBirthMonth(@Param("month") int month, @Param("onlyActive") int onlyActive,
                        @Param("companyFilter") int companyFilter, @Param("companyId") UUID companyId);

        /** Última admissão conhecida entre funcionários ativos (maior data de contratação). */
        Optional<Employee> findTopByStatusAndHireDateIsNotNullOrderByHireDateDesc(EmploymentStatus status);

        /** Último desligamento conhecido entre demitidos (maior data de término). */
        Optional<Employee> findTopByStatusAndTerminationDateIsNotNullOrderByTerminationDateDesc(EmploymentStatus status);

        @Query(value = "SELECT * FROM employees e WHERE "
                        + "REGEXP_REPLACE(COALESCE(e.cpf, e.document, ''), '[^0-9]', '', 'g') = :digits "
                        + "ORDER BY e.updated_at DESC NULLS LAST LIMIT 1", nativeQuery = true)
        Optional<Employee> findFirstByNormalizedCpfOrDocument(@Param("digits") String digits);
}