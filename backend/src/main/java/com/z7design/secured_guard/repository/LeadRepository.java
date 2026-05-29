package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.model.enums.LeadSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface LeadRepository extends JpaRepository<Lead, UUID> {
    
    @Query("SELECT l FROM Lead l WHERE l.isDeleted = false")
    List<Lead> findAllActive();

    @Query("SELECT COUNT(l) FROM Lead l WHERE l.isDeleted = false")
    long countActive();
    
    // Buscar leads por status
    List<Lead> findByStatus(LeadStatus status);
    
    // Buscar leads por status com paginação
    Page<Lead> findByStatus(LeadStatus status, Pageable pageable);
    
    // Buscar leads por empresa
    List<Lead> findByCompanyContainingIgnoreCase(String company);
    
    // Buscar leads por email
    List<Lead> findByEmailContainingIgnoreCase(String email);

    // Buscar primeiro Lead ativo por email exato (ignorando case)
    @Query("SELECT l FROM Lead l WHERE l.isDeleted = false AND lower(l.email) = lower(:email) ORDER BY l.createdAt DESC")
    java.util.Optional<Lead> findFirstByEmailIgnoreCaseOrderByCreatedAtDesc(@Param("email") String email);

    /** Inclui soft-deleted — usado na importação marketing para reativar em vez de duplicar. */
    @Query(
            value = "SELECT * FROM leads l WHERE lower(l.email) = lower(:email) ORDER BY l.created_at DESC LIMIT 1",
            nativeQuery = true)
    java.util.Optional<Lead> findTopByEmailIncludingDeleted(@Param("email") String email);
    
    // Buscar leads por nome
    List<Lead> findByNameContainingIgnoreCase(String name);
    
    // Buscar leads por responsável
    List<Lead> findByAssignedToId(UUID assignedToId);
    
    // Buscar leads por criador
    List<Lead> findByCreatedById(UUID createdById);
    
    // Buscar leads que precisam de follow-up
    @Query("SELECT l FROM Lead l WHERE l.nextFollowUp <= :date AND l.status NOT IN ('WON', 'LOST', 'INACTIVE')")
    List<Lead> findLeadsNeedingFollowUp(@Param("date") LocalDateTime date);
    
    // Buscar leads por fonte
    List<Lead> findBySource(LeadSource source);
    
    // Buscar leads criados em um período
    @Query("SELECT l FROM Lead l WHERE l.createdAt BETWEEN :startDate AND :endDate")
    List<Lead> findByCreatedAtBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Buscar leads criados após uma data
    List<Lead> findByCreatedAtAfter(LocalDateTime since);
    
    /** Contagem por status (agregação). Nome distinto de {@link #countByStatus(LeadStatus)} para evitar ambiguidade no Spring Data JPA. */
    @Query("SELECT l.status, COUNT(l) FROM Lead l WHERE l.isDeleted = false GROUP BY l.status")
    List<Object[]> countGroupedByStatus();

    @Query("SELECT COUNT(l) FROM Lead l WHERE l.status = :status AND l.isDeleted = false")
    long countByStatus(@Param("status") LeadStatus status);
    
    // Contar leads por fonte
    long countBySource(LeadSource source);
    
    // Buscar leads com valor estimado acima de um valor
    @Query("SELECT l FROM Lead l WHERE l.estimatedValue >= :minValue")
    List<Lead> findByEstimatedValueGreaterThanEqual(@Param("minValue") java.math.BigDecimal minValue);
    
    // Buscar leads por múltiplos critérios
    @Query("SELECT l FROM Lead l WHERE " +
           "(:status IS NULL OR l.status = :status) AND " +
           "(:source IS NULL OR l.source = :source) AND " +
           "(:assignedToId IS NULL OR l.assignedTo.id = :assignedToId) AND " +
           "(:company IS NULL OR l.company LIKE %:company%)")
    Page<Lead> findByFilters(
        @Param("status") LeadStatus status,
        @Param("source") LeadSource source,
        @Param("assignedToId") UUID assignedToId,
        @Param("company") String company,
        Pageable pageable
    );
    
    // Buscar leads por texto (busca em nome, email, empresa, observações)
    @Query("SELECT l FROM Lead l WHERE " +
           "l.name LIKE %:searchTerm% OR " +
           "l.email LIKE %:searchTerm% OR " +
           "l.company LIKE %:searchTerm% OR " +
           "l.notes LIKE %:searchTerm%")
    List<Lead> searchLeads(@Param("searchTerm") String searchTerm);

    // --- KPIs por usuário ---

    // Contar leads por responsável e status
    long countByAssignedToIdAndStatus(UUID assignedToId, LeadStatus status);

    // Contar leads por responsável e status dentro de um período
    @Query("SELECT COUNT(l) FROM Lead l WHERE l.assignedTo.id = :userId AND l.status = :status AND l.createdAt BETWEEN :startDate AND :endDate")
    long countByAssignedToIdAndStatusAndPeriod(@Param("userId") UUID userId, @Param("status") LeadStatus status,
                                               @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // Contar leads por status dentro de um período (sem filtro de usuário)
    @Query("SELECT COUNT(l) FROM Lead l WHERE l.status = :status AND l.createdAt BETWEEN :startDate AND :endDate")
    long countByStatusAndPeriod(@Param("status") LeadStatus status,
                                @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // Contar todos os leads de um responsável dentro de um período
    @Query("SELECT COUNT(l) FROM Lead l WHERE l.assignedTo.id = :userId AND l.createdAt BETWEEN :startDate AND :endDate")
    long countByAssignedToIdAndPeriod(@Param("userId") UUID userId,
                                      @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // Contar todos os leads dentro de um período (sem filtro de usuário)
    @Query("SELECT COUNT(l) FROM Lead l WHERE l.createdAt BETWEEN :startDate AND :endDate")
    long countByPeriod(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    /** Intervalo meio-aberto [start, end) — alinhado a filtros por mês no dashboard CRM. */
    @Query("SELECT COUNT(l) FROM Lead l WHERE l.isDeleted = false AND l.createdAt >= :start AND l.createdAt < :end")
    long countByCreatedAtRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(l) FROM Lead l WHERE l.isDeleted = false AND l.status = :status AND l.createdAt >= :start AND l.createdAt < :end")
    long countByStatusAndCreatedAtRange(@Param("status") LeadStatus status,
                                        @Param("start") LocalDateTime start,
                                        @Param("end") LocalDateTime end);

    // Buscar leads por responsável dentro de um período
    @Query("SELECT l FROM Lead l WHERE l.assignedTo.id = :userId AND l.createdAt BETWEEN :startDate AND :endDate")
    List<Lead> findByAssignedToIdAndPeriod(@Param("userId") UUID userId,
                                           @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
} 