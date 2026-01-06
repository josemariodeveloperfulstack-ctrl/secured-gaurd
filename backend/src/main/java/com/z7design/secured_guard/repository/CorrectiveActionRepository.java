package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.CorrectiveAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Repositório para gerenciamento de ações corretivas
 */
@Repository
public interface CorrectiveActionRepository extends JpaRepository<CorrectiveAction, UUID> {

    /**
     * Busca ações por status
     */
    List<CorrectiveAction> findByStatus(String status);

    /**
     * Busca ações por prioridade
     */
    List<CorrectiveAction> findByPriority(String priority);

    /**
     * Busca ações por origem
     */
    List<CorrectiveAction> findByOrigin(String origin);

    /**
     * Busca ações por responsável
     */
    @Query("SELECT ca FROM CorrectiveAction ca WHERE ca.responsibleUser.id = :userId OR ca.responsibleName = :name")
    List<CorrectiveAction> findByResponsible(@Param("userId") UUID userId, @Param("name") String name);

    /**
     * Busca ações vencidas
     */
    @Query("SELECT ca FROM CorrectiveAction ca WHERE ca.dueDate < :date AND ca.status NOT IN ('CONCLUIDA', 'CANCELADA')")
    List<CorrectiveAction> findOverdueActions(@Param("date") LocalDate date);

    /**
     * Busca ações próximas do vencimento
     */
    @Query("SELECT ca FROM CorrectiveAction ca WHERE ca.dueDate BETWEEN :today AND :futureDate AND ca.status NOT IN ('CONCLUIDA', 'CANCELADA')")
    List<CorrectiveAction> findActionsDueSoon(@Param("today") LocalDate today, @Param("futureDate") LocalDate futureDate);

    /**
     * Busca ações pendentes
     */
    @Query("SELECT ca FROM CorrectiveAction ca WHERE ca.status IN ('PENDENTE', 'EM_ANDAMENTO')")
    List<CorrectiveAction> findPendingActions();
}

