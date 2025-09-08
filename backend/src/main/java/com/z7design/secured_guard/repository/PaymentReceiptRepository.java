package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.PaymentReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentReceiptRepository extends JpaRepository<PaymentReceipt, UUID> {

    @Query("SELECT pr FROM PaymentReceipt pr WHERE pr.employee.id = :employeeId AND pr.month = :month AND pr.year = :year")
    Optional<PaymentReceipt> findByEmployeeAndMonthYear(@Param("employeeId") UUID employeeId, 
                                                       @Param("month") Integer month, 
                                                       @Param("year") Integer year);

    @Query("SELECT pr FROM PaymentReceipt pr WHERE pr.month = :month AND pr.year = :year")
    List<PaymentReceipt> findByMonthAndYear(@Param("month") Integer month, @Param("year") Integer year);

    @Query("SELECT pr FROM PaymentReceipt pr WHERE pr.status = :status")
    List<PaymentReceipt> findByStatus(@Param("status") PaymentReceipt.ReceiptStatus status);

    @Query("SELECT pr FROM PaymentReceipt pr WHERE pr.employeeName LIKE %:employeeName%")
    List<PaymentReceipt> findByEmployeeNameContaining(@Param("employeeName") String employeeName);
} 