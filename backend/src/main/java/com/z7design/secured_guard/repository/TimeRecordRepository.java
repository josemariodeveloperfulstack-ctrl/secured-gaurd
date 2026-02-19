package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.TimeRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimeRecordRepository extends JpaRepository<TimeRecord, UUID> {

    List<TimeRecord> findByEmployeeIdAndRecordedAtBetweenOrderByRecordedAtAsc(
            UUID employeeId, LocalDateTime start, LocalDateTime end);

    Page<TimeRecord> findByEmployeeIdOrderByRecordedAtDesc(UUID employeeId, Pageable pageable);

    Page<TimeRecord> findByWorkPostIdOrderByRecordedAtDesc(UUID workPostId, Pageable pageable);

    /** Usa :date para garantir mesma noção de "hoje" que o registro (JVM), evitando timezone do DB. */
    @Query("SELECT tr FROM TimeRecord tr WHERE tr.employee.id = :employeeId " +
           "AND CAST(tr.recordedAt AS date) = :date ORDER BY tr.recordedAt DESC")
    List<TimeRecord> findTodayRecordsByEmployeeIdAndDate(
            @Param("employeeId") UUID employeeId, @Param("date") LocalDate date);

    @Query(value = "SELECT * FROM time_records tr WHERE tr.employee_id = :employeeId " +
           "ORDER BY tr.recorded_at DESC LIMIT 1", nativeQuery = true)
    Optional<TimeRecord> findLastRecordByEmployeeId(@Param("employeeId") UUID employeeId);

    @Query(value = "SELECT COUNT(*) FROM time_records tr WHERE tr.employee_id = :employeeId " +
           "AND EXTRACT(YEAR FROM tr.recorded_at) = :year " +
           "AND EXTRACT(MONTH FROM tr.recorded_at) = :month", nativeQuery = true)
    Long countByEmployeeIdAndMonthYear(
            @Param("employeeId") UUID employeeId,
            @Param("month") int month,
            @Param("year") int year);

    Page<TimeRecord> findByStatusOrderByRecordedAtDesc(TimeRecord.RecordStatus status, Pageable pageable);

    @Query("SELECT tr FROM TimeRecord tr WHERE tr.employee.id = :employeeId " +
           "AND CAST(tr.recordedAt AS date) = :date AND tr.isManual = true ORDER BY tr.recordedAt ASC")
    List<TimeRecord> findManualRecordsByEmployeeIdAndDate(
            @Param("employeeId") UUID employeeId, @Param("date") LocalDate date);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM TimeRecord tr WHERE tr.employee.id = :employeeId " +
           "AND CAST(tr.recordedAt AS date) = :date AND tr.isManual = true")
    void deleteManualRecordsByEmployeeIdAndDate(
            @Param("employeeId") UUID employeeId, @Param("date") LocalDate date);
}
