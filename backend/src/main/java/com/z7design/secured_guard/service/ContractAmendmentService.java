package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ContractAmendmentDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.ContractAmendment;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.AmendmentStatus;
import com.z7design.secured_guard.model.enums.AmendmentType;
import com.z7design.secured_guard.repository.ContractAmendmentRepository;
import com.z7design.secured_guard.repository.ContractRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ContractAmendmentService {

    private final ContractAmendmentRepository amendmentRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ContractAmendmentDTO> findByContractId(UUID contractId) {
        List<ContractAmendment> amendments = amendmentRepository.findByContract_IdOrderByCreatedAtDesc(contractId);
        return amendments.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ContractAmendmentDTO getById(UUID id) {
        ContractAmendment amendment = amendmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aditivo não encontrado com ID: " + id));
        return convertToDTO(amendment);
    }

    public ContractAmendmentDTO create(UUID contractId, AmendmentType type, String description,
                                       LocalDate effectiveDate, BigDecimal financialImpact) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato não encontrado com ID: " + contractId));

        ContractAmendment amendment = new ContractAmendment();
        amendment.setContract(contract);
        amendment.setType(type);
        amendment.setDescription(description);
        amendment.setEffectiveDate(effectiveDate);
        amendment.setFinancialImpact(financialImpact != null ? financialImpact : BigDecimal.ZERO);
        amendment.setStatus(AmendmentStatus.PENDING);

        ContractAmendment saved = amendmentRepository.save(amendment);
        return convertToDTO(saved);
    }

    public ContractAmendmentDTO approve(UUID amendmentId) {
        ContractAmendment amendment = amendmentRepository.findById(amendmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Aditivo não encontrado com ID: " + amendmentId));

        if (amendment.getStatus() != AmendmentStatus.PENDING) {
            throw new BusinessException("Apenas aditivos pendentes podem ser aprovados.");
        }

        User currentUser = getCurrentUser();
        amendment.setApprovedBy(currentUser);
        amendment.setApprovedAt(LocalDateTime.now());
        amendment.setStatus(AmendmentStatus.APPROVED);

        Contract contract = amendment.getContract();
        if (amendment.getFinancialImpact() != null && amendment.getFinancialImpact().compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal newValue = contract.getValue().add(amendment.getFinancialImpact());
            contract.setValue(newValue);
            if (contract.getMonthlyValue() != null) {
                contract.setMonthlyValue(contract.getMonthlyValue().add(amendment.getFinancialImpact()));
            }
            contractRepository.save(contract);
        }

        ContractAmendment saved = amendmentRepository.save(amendment);
        return convertToDTO(saved);
    }

    public ContractAmendmentDTO reject(UUID amendmentId) {
        ContractAmendment amendment = amendmentRepository.findById(amendmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Aditivo não encontrado com ID: " + amendmentId));

        if (amendment.getStatus() != AmendmentStatus.PENDING) {
            throw new BusinessException("Apenas aditivos pendentes podem ser rejeitados.");
        }

        amendment.setStatus(AmendmentStatus.REJECTED);
        ContractAmendment saved = amendmentRepository.save(amendment);
        return convertToDTO(saved);
    }

    public void delete(UUID amendmentId) {
        ContractAmendment amendment = amendmentRepository.findById(amendmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Aditivo não encontrado com ID: " + amendmentId));
        if (amendment.getStatus() == AmendmentStatus.APPROVED) {
            throw new BusinessException("Não é possível excluir um aditivo aprovado.");
        }
        amendmentRepository.delete(amendment);
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        String principal = auth.getName();
        return userRepository.findByUsername(principal)
                .or(() -> userRepository.findByEmail(principal))
                .orElse(null);
    }

    private ContractAmendmentDTO convertToDTO(ContractAmendment a) {
        ContractAmendmentDTO dto = new ContractAmendmentDTO();
        dto.setId(a.getId());
        dto.setContractId(a.getContract().getId());
        dto.setType(a.getType());
        dto.setDescription(a.getDescription());
        dto.setEffectiveDate(a.getEffectiveDate());
        dto.setFinancialImpact(a.getFinancialImpact());
        dto.setStatus(a.getStatus());
        dto.setCreatedAt(a.getCreatedAt());
        dto.setUpdatedAt(a.getUpdatedAt());
        if (a.getApprovedBy() != null) {
            dto.setApprovedById(a.getApprovedBy().getId());
            dto.setApprovedByName(a.getApprovedBy().getName());
        }
        dto.setApprovedAt(a.getApprovedAt());
        return dto;
    }
}
