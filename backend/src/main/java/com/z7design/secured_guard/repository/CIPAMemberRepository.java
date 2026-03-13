package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.CIPAMember;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CIPAMemberRepository extends JpaRepository<CIPAMember, UUID> {

    @Query("SELECT m FROM CIPAMember m LEFT JOIN FETCH m.employee e LEFT JOIN FETCH e.workPost LEFT JOIN FETCH e.unit LEFT JOIN FETCH e.department WHERE m.isActive = true ORDER BY m.startDate DESC")
    List<CIPAMember> findAllActiveMembers();

    List<CIPAMember> findByEmployeeId(UUID employeeId);

    List<CIPAMember> findByMandateYear(Integer mandateYear);
}
