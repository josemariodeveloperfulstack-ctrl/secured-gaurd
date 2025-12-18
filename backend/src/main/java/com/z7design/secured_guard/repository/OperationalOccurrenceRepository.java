package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.OperationalOccurrence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface OperationalOccurrenceRepository extends JpaRepository<OperationalOccurrence, UUID> {
    
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee")
    List<OperationalOccurrence> findAllWithRelationships();
    
    // Buscar ocorrências por funcionário
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE o.employee.id = :employeeId ORDER BY o.date DESC")
    List<OperationalOccurrence> findByEmployeeIdOrderByDateDesc(@Param("employeeId") UUID employeeId);
    
    // Buscar ocorrências por tipo
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE o.type = :type ORDER BY o.date DESC")
    List<OperationalOccurrence> findByTypeOrderByDateDesc(@Param("type") OperationalOccurrence.OccurrenceType type);
    
    // Buscar ocorrências por status
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE o.status = :status ORDER BY o.date DESC")
    List<OperationalOccurrence> findByStatusOrderByDateDesc(@Param("status") OperationalOccurrence.OccurrenceStatus status);
    
    // Buscar ocorrências por prioridade
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE o.priority = :priority ORDER BY o.date DESC")
    List<OperationalOccurrence> findByPriorityOrderByDateDesc(@Param("priority") OperationalOccurrence.OccurrencePriority priority);
    
    // Buscar ocorrências por período
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE o.date BETWEEN :startDate AND :endDate ORDER BY o.date DESC")
    List<OperationalOccurrence> findByDateBetweenOrderByDateDesc(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Buscar ocorrências por funcionário e período
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE o.employee.id = :employeeId AND o.date BETWEEN :startDate AND :endDate ORDER BY o.date DESC")
    List<OperationalOccurrence> findByEmployeeIdAndDateBetweenOrderByDateDesc(
        @Param("employeeId") UUID employeeId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Buscar ocorrências por tipo e período
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE o.type = :type AND o.date BETWEEN :startDate AND :endDate ORDER BY o.date DESC")
    List<OperationalOccurrence> findByTypeAndDateBetweenOrderByDateDesc(
        @Param("type") OperationalOccurrence.OccurrenceType type, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Buscar ocorrências pendentes
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE o.status = :status ORDER BY o.priority DESC, o.date ASC")
    List<OperationalOccurrence> findByStatusOrderByPriorityDescDateAsc(@Param("status") OperationalOccurrence.OccurrenceStatus status);
    
    // Buscar ocorrências por responsável
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE o.responsible = :responsible ORDER BY o.date DESC")
    List<OperationalOccurrence> findByResponsibleOrderByDateDesc(@Param("responsible") String responsible);
    
    // Buscar ocorrências por local
    @Query("SELECT DISTINCT o FROM OperationalOccurrence o LEFT JOIN FETCH o.employee WHERE LOWER(o.location) LIKE LOWER(CONCAT('%', :location, '%')) ORDER BY o.date DESC")
    List<OperationalOccurrence> findByLocationContainingIgnoreCaseOrderByDateDesc(@Param("location") String location);
    
    // Contar ocorrências por funcionário e período
    @Query("SELECT COUNT(o) FROM OperationalOccurrence o WHERE o.employee.id = :employeeId AND o.date BETWEEN :startDate AND :endDate")
    long countByEmployeeAndPeriod(@Param("employeeId") UUID employeeId, 
                                  @Param("startDate") LocalDateTime startDate, 
                                  @Param("endDate") LocalDateTime endDate);
    
    // Contar ocorrências por tipo e período
    @Query("SELECT COUNT(o) FROM OperationalOccurrence o WHERE o.type = :type AND o.date BETWEEN :startDate AND :endDate")
    long countByTypeAndPeriod(@Param("type") OperationalOccurrence.OccurrenceType type,
                              @Param("startDate") LocalDateTime startDate, 
                              @Param("endDate") LocalDateTime endDate);
    
    // Buscar ocorrências por número de advertência
    OperationalOccurrence findByWarningNumber(Integer warningNumber);
    
    // Verificar se existe ocorrência com número de advertência
    boolean existsByWarningNumber(Integer warningNumber);
    
    // Buscar ocorrências não resolvidas por funcionário
    @Query("SELECT o FROM OperationalOccurrence o WHERE o.employee.id = :employeeId AND o.status NOT IN ('RESOLVIDO', 'CONCLUIDO') ORDER BY o.date DESC")
    List<OperationalOccurrence> findUnresolvedByEmployee(@Param("employeeId") UUID employeeId);
}
