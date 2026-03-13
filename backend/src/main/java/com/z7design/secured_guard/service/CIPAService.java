package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.CIPAMember;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CIPAMemberRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CIPAService {

    private final CIPAMemberRepository cipaMemberRepository;

    public List<CIPAMember> findAllMembers() {
        return cipaMemberRepository.findAllActiveMembers();
    }

    public List<CIPAMember> findAllMembersIncludingInactive() {
        return cipaMemberRepository.findAll();
    }

    public CIPAMember findMemberById(UUID id) {
        return cipaMemberRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Membro da CIPA não encontrado: " + id));
    }

    @Transactional
    public void deleteMember(UUID id) {
        CIPAMember member = findMemberById(id);
        cipaMemberRepository.delete(member);
        log.info("Membro da CIPA removido: {} (ID: {})", member.getEmployee().getName(), id);
    }

    /**
     * Converte CIPAMember para formato simplificado para o frontend.
     */
    public static java.util.Map<String, Object> toResponseDTO(CIPAMember m) {
        String dept = "-";
        Employee emp = m.getEmployee();
        if (emp.getWorkPost() != null && emp.getWorkPost().getName() != null) {
            dept = emp.getWorkPost().getName();
        } else if (emp.getUnit() != null && emp.getUnit().getName() != null) {
            dept = emp.getUnit().getName();
        } else if (emp.getDepartment() != null && emp.getDepartment().getName() != null) {
            dept = emp.getDepartment().getName();
        }
        return java.util.Map.of(
                "id", m.getId().toString(),
                "employeeId", emp.getId().toString(),
                "employeeName", emp.getName() != null ? emp.getName() : "N/A",
                "position", m.getFunction() != null ? m.getFunction() : "MEMBRO",
                "department", dept,
                "startDate", m.getStartDate().toString(),
                "endDate", m.getEndDate().toString(),
                "status", Boolean.TRUE.equals(m.getIsActive()) ? "ATIVO" : "INATIVO",
                "createdAt", m.getCreatedAt() != null ? m.getCreatedAt().toString() : "",
                "updatedAt", m.getUpdatedAt() != null ? m.getUpdatedAt().toString() : ""
        );
    }
}
