package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositório para gerenciamento de fichas de entrega de EPI
 */
@Repository
public interface EPIDeliveryFormRepository extends JpaRepository<EPIDeliveryForm, UUID>, JpaSpecificationExecutor<EPIDeliveryForm> {

    /**
     * Busca fichas por funcionário
     */
    List<EPIDeliveryForm> findByEmployee(Employee employee);

    /**
     * Busca fichas por ID do funcionário
     */
    List<EPIDeliveryForm> findByEmployeeId(UUID employeeId);

    /**
     * Busca fichas por empresa
     */
    List<EPIDeliveryForm> findByCompany(Company company);

    /**
     * Busca fichas por ID da empresa
     */
    List<EPIDeliveryForm> findByCompanyId(UUID companyId);

    /**
     * Busca fichas por período
     */
    List<EPIDeliveryForm> findByDeliveryDateBetween(LocalDate startDate, LocalDate endDate);

    /**
     * Busca fichas por funcionário e período
     */
    List<EPIDeliveryForm> findByEmployeeAndDeliveryDateBetween(Employee employee, LocalDate startDate, LocalDate endDate);

    /**
     * Busca fichas com paginação
     */
    Page<EPIDeliveryForm> findAll(Pageable pageable);

    /**
     * Busca fichas por funcionário com paginação
     */
    Page<EPIDeliveryForm> findByEmployeeId(UUID employeeId, Pageable pageable);

    /**
     * Busca fichas por empresa com paginação
     */
    Page<EPIDeliveryForm> findByCompanyId(UUID companyId, Pageable pageable);

    /**
     * Busca fichas por período com paginação
     */
    Page<EPIDeliveryForm> findByDeliveryDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);

    @Query("""
        SELECT f FROM EPIDeliveryForm f
        LEFT JOIN FETCH f.employee
        LEFT JOIN FETCH f.company
        LEFT JOIN FETCH f.responsibleEmployee
        LEFT JOIN FETCH f.createdBy
        LEFT JOIN FETCH f.items
        WHERE f.id = :id
        """)
    java.util.Optional<EPIDeliveryForm> findByIdWithDetails(@Param("id") UUID id);

    /**
     * Histórico de entregas concluídas do funcionário (com itens), ordenado por data.
     */
    @Query("""
        SELECT DISTINCT f FROM EPIDeliveryForm f
        LEFT JOIN FETCH f.items
        WHERE f.employee.id = :employeeId
        AND f.status = :status
        ORDER BY f.deliveryDate ASC, f.createdAt ASC
        """)
    List<EPIDeliveryForm> findByEmployeeIdAndStatusWithItemsOrderByDeliveryDateAsc(
            @Param("employeeId") UUID employeeId,
            @Param("status") com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus status);

    /**
     * Ficha de EPI vinculada a uma requisição de almoxarifado (campo {@code stock_requisition_id}).
     */
    Optional<EPIDeliveryForm> findFirstByStockRequisitionIdOrderByCreatedAtDesc(UUID stockRequisitionId);

    long countByEmployeeIdAndStatus(UUID employeeId, com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus status);

    @Query("""
        SELECT f FROM EPIDeliveryForm f
        LEFT JOIN FETCH f.employee
        LEFT JOIN FETCH f.company
        LEFT JOIN FETCH f.items
        WHERE f.confirmationToken = :token
        """)
    Optional<EPIDeliveryForm> findByConfirmationTokenWithDetails(@Param("token") UUID token);

    @Query("""
        SELECT DISTINCT f FROM EPIDeliveryForm f
        LEFT JOIN FETCH f.employee
        LEFT JOIN FETCH f.company
        LEFT JOIN FETCH f.items
        WHERE EXISTS (SELECT i FROM f.items i WHERE i.confirmationToken = :token)
        """)
    Optional<EPIDeliveryForm> findByItemsConfirmationTokenWithDetails(@Param("token") UUID token);
}









