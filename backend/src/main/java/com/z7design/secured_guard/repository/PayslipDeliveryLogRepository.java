package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.PayslipDeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PayslipDeliveryLogRepository extends JpaRepository<PayslipDeliveryLog, UUID> {
    List<PayslipDeliveryLog> findByCpfAndMonthAndYear(String cpf, Integer month, Integer year);
    List<PayslipDeliveryLog> findByCpf(String cpf);
}


