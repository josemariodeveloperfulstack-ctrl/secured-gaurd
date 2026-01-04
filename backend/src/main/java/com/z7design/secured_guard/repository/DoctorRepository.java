package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, UUID> {
    List<Doctor> findByActiveTrueOrderByNameAsc();
    Optional<Doctor> findByCrmNumberAndCrmState(String crmNumber, String crmState);
    List<Doctor> findByNameContainingIgnoreCaseAndActiveTrue(String name);
}



