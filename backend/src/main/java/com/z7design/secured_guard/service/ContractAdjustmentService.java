package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ContractAdjustmentDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.ContractAdjustment;
import com.z7design.secured_guard.model.enums.AdjustmentType;
import com.z7design.secured_guard.repository.ContractAdjustmentRepository;
import com.z7design.secured_guard.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ContractAdjustmentService {

    private final ContractAdjustmentRepository adjustmentRepository;
    private final ContractRepository contractRepository;

    @Transactional(readOnly = true)
    public List<ContractAdjustmentDTO> findByContractId(UUID contractId) {
        List<ContractAdjustment> adjustments = adjustmentRepository.findByContract_IdOrderByAdjustmentDateDesc(contractId);
        return adjustments.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public ContractAdjustmentDTO create(UUID contractId, AdjustmentType adjustmentType,
                                        BigDecimal previousValue, BigDecimal newValue, LocalDate adjustmentDate) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato não encontrado com ID: " + contractId));

        ContractAdjustment adjustment = new ContractAdjustment();
        adjustment.setContract(contract);
        adjustment.setAdjustmentType(adjustmentType);
        adjustment.setPreviousValue(previousValue != null ? previousValue : BigDecimal.ZERO);
        adjustment.setNewValue(newValue != null ? newValue : BigDecimal.ZERO);
        adjustment.setAdjustmentDate(adjustmentDate != null ? adjustmentDate : LocalDate.now());

        ContractAdjustment saved = adjustmentRepository.save(adjustment);

        contract.setValue(newValue);
        contractRepository.save(contract);

        return convertToDTO(saved);
    }

    private ContractAdjustmentDTO convertToDTO(ContractAdjustment a) {
        ContractAdjustmentDTO dto = new ContractAdjustmentDTO();
        dto.setId(a.getId());
        dto.setContractId(a.getContract().getId());
        dto.setAdjustmentType(a.getAdjustmentType());
        dto.setPreviousValue(a.getPreviousValue());
        dto.setNewValue(a.getNewValue());
        dto.setAdjustmentDate(a.getAdjustmentDate());
        dto.setCreatedAt(a.getCreatedAt());
        return dto;
    }
}
