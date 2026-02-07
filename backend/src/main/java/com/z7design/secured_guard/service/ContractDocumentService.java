package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ContractDocumentDTO;
import com.z7design.secured_guard.dto.CreateContractDocumentRequest;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.ContractDocument;
import com.z7design.secured_guard.model.enums.ContractDocumentType;
import com.z7design.secured_guard.model.enums.DocumentSignatureStatus;
import com.z7design.secured_guard.repository.ContractDocumentRepository;
import com.z7design.secured_guard.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ContractDocumentService {

    private final ContractDocumentRepository documentRepository;
    private final ContractRepository contractRepository;

    @Transactional(readOnly = true)
    public List<ContractDocumentDTO> findByContractId(UUID contractId) {
        List<ContractDocument> docs = documentRepository.findByContract_IdOrderByCreatedAtDesc(contractId);
        return docs.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public ContractDocumentDTO create(UUID contractId, CreateContractDocumentRequest request) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato não encontrado com ID: " + contractId));

        ContractDocument doc = new ContractDocument();
        doc.setContract(contract);
        doc.setType(request.getType());
        doc.setFileUrl(request.getFileUrl());
        doc.setFileName(request.getFileName());
        doc.setSignatureStatus(DocumentSignatureStatus.PENDING);

        ContractDocument saved = documentRepository.save(doc);
        return convertToDTO(saved);
    }

    public void delete(UUID documentId) {
        if (!documentRepository.existsById(documentId)) {
            throw new ResourceNotFoundException("Documento não encontrado com ID: " + documentId);
        }
        documentRepository.deleteById(documentId);
    }

    private ContractDocumentDTO convertToDTO(ContractDocument d) {
        ContractDocumentDTO dto = new ContractDocumentDTO();
        dto.setId(d.getId());
        dto.setContractId(d.getContract().getId());
        dto.setType(d.getType());
        dto.setFileUrl(d.getFileUrl());
        dto.setFileName(d.getFileName());
        dto.setSignatureStatus(d.getSignatureStatus());
        dto.setSignedAt(d.getSignedAt());
        dto.setCreatedAt(d.getCreatedAt());
        dto.setUpdatedAt(d.getUpdatedAt());
        if (d.getSignedBy() != null) {
            dto.setSignedById(d.getSignedBy().getId());
            dto.setSignedByName(d.getSignedBy().getName());
        }
        return dto;
    }
}
