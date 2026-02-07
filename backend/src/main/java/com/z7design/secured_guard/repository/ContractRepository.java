package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.enums.ContractStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContractRepository extends JpaRepository<Contract, java.util.UUID> {
    
    // Buscar por status
    List<Contract> findByStatus(ContractStatus status);
    Page<Contract> findByStatus(ContractStatus status, Pageable pageable);
    
    // Buscar por cliente
    List<Contract> findByClientId(UUID clientId);
    Page<Contract> findByClientId(UUID clientId, Pageable pageable);
    
    // Buscar por número do contrato
    Optional<Contract> findByContractNumber(String contractNumber);
    
    // Buscar por data de início
    List<Contract> findByStartDate(LocalDate startDate);
    List<Contract> findByStartDateBetween(LocalDate startDate, LocalDate endDate);
    
    // Buscar por data de término
    List<Contract> findByEndDate(LocalDate endDate);
    List<Contract> findByEndDateBetween(LocalDate startDate, LocalDate endDate);
    
    // Buscar contratos ativos
    List<Contract> findByStatusAndEndDateAfter(ContractStatus status, LocalDate date);
    
    // Buscar contratos expirados
    List<Contract> findByStatusAndEndDateBefore(ContractStatus status, LocalDate date);
    
    // Buscar por cliente e status
    List<Contract> findByClientIdAndStatus(UUID clientId, ContractStatus status);
    Page<Contract> findByClientIdAndStatus(UUID clientId, ContractStatus status, Pageable pageable);
    
    // Busca com filtros combinados
    @Query("SELECT c FROM Contract c WHERE " +
           "(:clientId IS NULL OR c.client.id = :clientId) AND " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:responsibleCommercialId IS NULL OR c.responsibleCommercial.id = :responsibleCommercialId) AND " +
           "(:searchTerm IS NULL OR LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(c.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Contract> findByFilters(@Param("clientId") UUID clientId,
                                @Param("status") ContractStatus status,
                                @Param("responsibleCommercialId") UUID responsibleCommercialId,
                                @Param("searchTerm") String searchTerm,
                                Pageable pageable);

    // Buscar contratos por responsável comercial
    List<Contract> findByResponsibleCommercialId(UUID responsibleCommercialId);
    
    // Contar contratos por status
    long countByStatus(ContractStatus status);
    
    // Contar contratos por cliente
    long countByClientId(UUID clientId);
    
    // Buscar contratos que vencem em um período
    @Query("SELECT c FROM Contract c WHERE c.endDate BETWEEN :startDate AND :endDate")
    List<Contract> findContractsExpiringBetween(@Param("startDate") LocalDate startDate, 
                                               @Param("endDate") LocalDate endDate);

    // Buscar contratos ativos que vencem em um período
    @Query("SELECT c FROM Contract c WHERE c.status = 'ACTIVE' AND c.endDate IS NOT NULL AND c.endDate BETWEEN :startDate AND :endDate")
    List<Contract> findActiveContractsExpiringBetween(@Param("startDate") LocalDate startDate, 
                                                      @Param("endDate") LocalDate endDate);

    // Contar contratos ativos por responsável comercial
    @Query("SELECT COUNT(c) FROM Contract c WHERE c.status = :status AND c.responsibleCommercial.id = :userId")
    long countByResponsibleCommercialIdAndStatus(@Param("userId") java.util.UUID userId, @Param("status") ContractStatus status);

    // Contar contratos ativos por clientes (para listas de clientIds)
    @Query("SELECT COUNT(c) FROM Contract c WHERE c.status = :status AND c.client.id IN :clientIds")
    long countByClientIdInAndStatus(@Param("clientIds") java.util.List<java.util.UUID> clientIds, @Param("status") ContractStatus status);
} 