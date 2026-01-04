package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Repositório para gerenciamento de fichas de entrega de EPI
 */
@Repository
public interface EPIDeliveryFormRepository extends JpaRepository<EPIDeliveryForm, UUID> {

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

    /**
     * Busca fichas com filtros combinados
     */
    @Query("SELECT f FROM EPIDeliveryForm f WHERE " +
           "(:employeeId IS NULL OR f.employee.id = :employeeId) AND " +
           "(:companyId IS NULL OR f.company.id = :companyId) AND " +
           "(:startDate IS NULL OR f.deliveryDate >= :startDate) AND " +
           "(:endDate IS NULL OR f.deliveryDate <= :endDate)")
    Page<EPIDeliveryForm> findByFilters(
        @Param("employeeId") UUID employeeId,
        @Param("companyId") UUID companyId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        Pageable pageable
    );
}




