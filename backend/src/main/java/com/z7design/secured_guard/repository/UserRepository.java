package com.z7design.secured_guard.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    @Query("SELECT DISTINCT u FROM User u")
    java.util.Set<User> findAllDistinct();

    Optional<User> findByUsername(String username);
    Optional<User> findByCpf(String cpf);
    boolean existsByUsername(String username);
    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByWhatsapp(String whatsapp);
    boolean existsByEmail(String email);
    
    /**
     * Busca usuários ativos
     */
    List<User> findByActiveTrue();
    
    /**
     * Busca usuários com permissões financeiras
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "JOIN u.roles r " +
           "WHERE u.active = true AND " +
           "(r.name IN ('SUPER_ADMIN', 'ADMIN', 'FINANCEIRO') OR " +
           "EXISTS (SELECT p FROM u.permissions p WHERE p.name IN ('FINANCIAL_READ', 'FINANCIAL_WRITE', 'FINANCIAL_CREATE')))")
    List<User> findUsersWithFinancialPermissions();
    
    /**
     * Busca usuários que são supervisores
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "JOIN u.roles r " +
           "WHERE u.active = true AND r.name = 'SUPERVISOR'")
    List<User> findSupervisors();

    /**
     * Busca usuários que são Gestores Operacionais (papel responsável por
     * aprovar/rejeitar remanejamentos solicitados pelos supervisores).
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "JOIN u.roles r " +
           "WHERE u.active = true " +
           "AND r.name IN ('GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'ADMIN', 'SUPER_ADMIN')")
    List<User> findOperationalManagers();

    /**
     * Busca um usuário supervisor ativo pelo CPF, ignorando formatação
     * (pontos e traços) tanto na coluna quanto no parâmetro. Útil para o
     * fluxo de login da aba "Supervisor", que aceita o CPF formatado ou
     * apenas dígitos.
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "JOIN u.roles r " +
           "WHERE u.active = true " +
           "AND r.name = 'SUPERVISOR' " +
           "AND u.cpf IS NOT NULL " +
           "AND REPLACE(REPLACE(u.cpf, '.', ''), '-', '') = :cpfDigits")
    Optional<User> findActiveSupervisorByCpfDigits(@Param("cpfDigits") String cpfDigits);

    /**
     * Busca usuários por nome, email ou username
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "WHERE u.active = true AND " +
           "(LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY u.name ASC")
    List<User> searchUsers(@Param("query") String query);
    
    /**
     * Busca usuário através do CPF do funcionário associado
     */
    @Query("SELECT DISTINCT u FROM User u " +
           "JOIN Employee e ON e.user.id = u.id " +
           "WHERE e.document = :cpf")
    Optional<User> findByEmployeeCpf(@Param("cpf") String cpf);

    @Query(
            value = "SELECT DISTINCT u FROM User u LEFT JOIN u.roles r WHERE "
                    + "(:search IS NULL OR :search = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) "
                    + "OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :search, '%')) "
                    + "OR LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :search, '%'))) "
                    + "AND (:role IS NULL OR :role = '' OR r.name = :role "
                    + "OR (:role = 'ADMINISTRADOR' AND r.name = 'ADMIN'))",
            countQuery = "SELECT COUNT(DISTINCT u) FROM User u LEFT JOIN u.roles r WHERE "
                    + "(:search IS NULL OR :search = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) "
                    + "OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :search, '%')) "
                    + "OR LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :search, '%'))) "
                    + "AND (:role IS NULL OR :role = '' OR r.name = :role "
                    + "OR (:role = 'ADMINISTRADOR' AND r.name = 'ADMIN'))")
    Page<User> findPagedFiltered(
            @Param("search") String search,
            @Param("role") String role,
            Pageable pageable);

    @Query(
            value = "SELECT DISTINCT u FROM User u LEFT JOIN u.roles r WHERE "
                    + "u.id IN :userIds AND "
                    + "(:search IS NULL OR :search = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) "
                    + "OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :search, '%')) "
                    + "OR LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :search, '%'))) "
                    + "AND (:role IS NULL OR :role = '' OR r.name = :role "
                    + "OR (:role = 'ADMINISTRADOR' AND r.name = 'ADMIN'))",
            countQuery = "SELECT COUNT(DISTINCT u) FROM User u LEFT JOIN u.roles r WHERE "
                    + "u.id IN :userIds AND "
                    + "(:search IS NULL OR :search = '' OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%')) "
                    + "OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :search, '%')) "
                    + "OR LOWER(COALESCE(u.username, '')) LIKE LOWER(CONCAT('%', :search, '%'))) "
                    + "AND (:role IS NULL OR :role = '' OR r.name = :role "
                    + "OR (:role = 'ADMINISTRADOR' AND r.name = 'ADMIN'))")
    Page<User> findPagedFilteredOnline(
            @Param("search") String search,
            @Param("role") String role,
            @Param("userIds") java.util.Collection<UUID> userIds,
            Pageable pageable);
} 