package com.z7design.secured_guard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.dto.PurchaseRequestDTO;
import com.z7design.secured_guard.dto.PurchaseRequestSizeEntryDTO;
import com.z7design.secured_guard.model.PurchaseRequest;
import com.z7design.secured_guard.model.PurchaseRequestItem;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.Unit;
import com.z7design.secured_guard.repository.PurchaseQuotationRepository;
import com.z7design.secured_guard.repository.PurchaseRequestRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseRequestService {
    
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseQuotationRepository purchaseQuotationRepository;
    private final UserRepository userRepository;
    private final UnitRepository unitRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> getAllPurchaseRequests() {
        return purchaseRequestRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public Optional<PurchaseRequestDTO> getPurchaseRequestById(UUID id) {
        return purchaseRequestRepository.findById(id)
                .map(this::convertToDTO);
    }
    
    @Transactional
    public PurchaseRequestDTO createPurchaseRequest(PurchaseRequestDTO requestDTO) {
        PurchaseRequest request = convertToEntity(requestDTO);
        request.setCreatedAt(LocalDateTime.now());
        request.setUpdatedAt(LocalDateTime.now());
        
        // Gerar número da requisição
        if (request.getRequestNumber() == null) {
            request.setRequestNumber(generateRequestNumber());
        }
        
        PurchaseRequest savedRequest = purchaseRequestRepository.save(request);
        return convertToDTO(savedRequest);
    }
    
    @Transactional
    public PurchaseRequestDTO updatePurchaseRequest(UUID id, PurchaseRequestDTO requestDTO) {
        Optional<PurchaseRequest> existingRequest = purchaseRequestRepository.findById(id);
        if (existingRequest.isPresent()) {
            PurchaseRequest request = existingRequest.get();
            updateRequestFromDTO(request, requestDTO);
            request.setUpdatedAt(LocalDateTime.now());
            
            PurchaseRequest savedRequest = purchaseRequestRepository.save(request);
            return convertToDTO(savedRequest);
        }
        throw new RuntimeException("Requisição de compra não encontrada");
    }
    
    @Transactional
    public void deletePurchaseRequest(UUID id) {
        // Excluir as cotações associadas antes de excluir a solicitação para evitar o erro 409 (Foreign Key Constraint)
        purchaseQuotationRepository.deleteByPurchaseRequestId(id);
        purchaseRequestRepository.deleteById(id);
    }
    
    @Transactional
    public PurchaseRequestDTO approveRequest(UUID id, String approverName, String approvalNotes) {
        Optional<PurchaseRequest> request = purchaseRequestRepository.findById(id);
        if (request.isPresent()) {
            PurchaseRequest purchaseRequest = request.get();
            purchaseRequest.setStatus("APPROVED");
            purchaseRequest.setApprovedBy(approverName);
            purchaseRequest.setApprovalNotes(approvalNotes);
            purchaseRequest.setApprovalDate(LocalDateTime.now());
            purchaseRequest.setUpdatedAt(LocalDateTime.now());
            
            PurchaseRequest savedRequest = purchaseRequestRepository.save(purchaseRequest);
            return convertToDTO(savedRequest);
        }
        throw new RuntimeException("Requisição de compra não encontrada");
    }
    
    @Transactional
    public PurchaseRequestDTO rejectRequest(UUID id, String rejectorName, String rejectionReason) {
        Optional<PurchaseRequest> request = purchaseRequestRepository.findById(id);
        if (request.isPresent()) {
            PurchaseRequest purchaseRequest = request.get();
            purchaseRequest.setStatus("REJECTED");
            purchaseRequest.setApprovedBy(rejectorName);
            purchaseRequest.setApprovalNotes(rejectionReason);
            purchaseRequest.setUpdatedAt(LocalDateTime.now());
            
            PurchaseRequest savedRequest = purchaseRequestRepository.save(purchaseRequest);
            return convertToDTO(savedRequest);
        }
        throw new RuntimeException("Requisição de compra não encontrada");
    }
    
    @Transactional
    public PurchaseRequestDTO completeRequest(UUID id) {
        Optional<PurchaseRequest> request = purchaseRequestRepository.findById(id);
        if (request.isPresent()) {
            PurchaseRequest purchaseRequest = request.get();
            purchaseRequest.setStatus("COMPLETED");
            purchaseRequest.setCompletionDate(LocalDateTime.now());
            purchaseRequest.setUpdatedAt(LocalDateTime.now());
            
            PurchaseRequest savedRequest = purchaseRequestRepository.save(purchaseRequest);
            return convertToDTO(savedRequest);
        }
        throw new RuntimeException("Requisição de compra não encontrada");
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> getRequestsByStatus(String status) {
        return purchaseRequestRepository.findByStatus(status).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> getRequestsByPriority(String priority) {
        return purchaseRequestRepository.findByPriority(priority).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> getRequestsByRequester(UUID requesterId) {
        return purchaseRequestRepository.findByRequesterId(requesterId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> getRequestsByApprover(UUID approverId) {
        return purchaseRequestRepository.findByApproverId(approverId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> getRequestsByUnit(UUID unitId) {
        return purchaseRequestRepository.findByUnitId(unitId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> getOverdueRequests() {
        return purchaseRequestRepository.findOverdueRequests(LocalDateTime.now()).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> getUrgentRequests() {
        return purchaseRequestRepository.findUrgentRequests().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> getPendingApprovalRequests() {
        return purchaseRequestRepository.findPendingApprovalRequests().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseRequestDTO> searchRequests(String searchTerm) {
        return purchaseRequestRepository.searchRequests(searchTerm).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public long getRequestsCountByStatus(String status) {
        return purchaseRequestRepository.countByStatus(status);
    }
    
    @Transactional(readOnly = true)
    public long getUrgentRequestsCount() {
        return purchaseRequestRepository.countUrgentRequests();
    }
    
    @Transactional(readOnly = true)
    public long getOverdueRequestsCount() {
        return purchaseRequestRepository.countOverdueRequests(LocalDateTime.now());
    }
    
    // Métodos auxiliares
    private String generateRequestNumber() {
        // Formato: REQ-YYYYMMDD-XXXX
        String date = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String random = String.format("%04d", (int) (Math.random() * 10000));
        return "REQ-" + date + "-" + random;
    }
    
    // Métodos de conversão
    private PurchaseRequestDTO convertToDTO(PurchaseRequest request) {
        PurchaseRequestDTO dto = PurchaseRequestDTO.builder()
                .id(request.getId())
                .requestNumber(request.getRequestNumber())
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority())
                .status(request.getStatus())
                .requesterName(request.getRequesterName())
                .department(request.getDepartment())
                .justification(request.getJustification())
                .estimatedTotal(request.getEstimatedTotal())
                .urgency(request.getUrgency())
                .requiredDate(request.getRequiredDate())
                .requestDate(request.getRequestDate())
                .approvalDate(request.getApprovalDate())
                .completionDate(request.getCompletionDate())
                .approvedBy(request.getApprovedBy())
                .approvalNotes(request.getApprovalNotes())
                .supplier(request.getSupplier())
                .paymentMethod(request.getPaymentMethod())
                .installments(request.getInstallments())
                .deliveryMethod(request.getDeliveryMethod())
                .deliveryAddress(request.getDeliveryAddress())
                .contactPerson(request.getContactPerson())
                .contactPhone(request.getContactPhone())
                .contactEmail(request.getContactEmail())
                .notes(request.getNotes())
                .unitId(request.getUnit() != null ? request.getUnit().getId() : null)
                .unitName(request.getUnit() != null ? request.getUnit().getName() : null)
                .requesterId(request.getRequester() != null ? request.getRequester().getId() : null)
                .approverId(request.getApprover() != null ? request.getApprover().getId() : null)
                .approverName(request.getApprover() != null ? request.getApprover().getName() : null)
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .category(request.getCategory())
                .unitOfMeasure(request.getUnitOfMeasure())
                .itemNumber(request.getItemNumber())
                .quantity(request.getQuantity())
                .sizeBreakdown(parseSizeBreakdown(request.getSizeBreakdown()))
                .build();
        
        // Campos calculados
        dto.setUrgent(request.isUrgent());
        dto.setCanBeApproved(request.canBeApproved());
        dto.setOverdue(request.isOverdue());
        dto.setDaysUntilRequired(request.getDaysUntilRequired());
        
        // Se não houver itens, usar estimatedTotal como totalValue
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            dto.setTotalValue(request.getEstimatedTotal() != null ? request.getEstimatedTotal() : BigDecimal.ZERO);
            dto.setTotalItems(0);
        }
        
        return dto;
    }
    
    private PurchaseRequest convertToEntity(PurchaseRequestDTO dto) {
        PurchaseRequest request = PurchaseRequest.builder()
                .requestNumber(dto.getRequestNumber())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .priority(dto.getPriority())
                .status(dto.getStatus())
                .requesterName(dto.getRequesterName())
                .department(dto.getDepartment())
                .justification(dto.getJustification())
                .estimatedTotal(dto.getEstimatedTotal())
                .urgency(dto.getUrgency())
                .requiredDate(dto.getRequiredDate())
                .requestDate(dto.getRequestDate())
                .approvalDate(dto.getApprovalDate())
                .completionDate(dto.getCompletionDate())
                .approvedBy(dto.getApprovedBy())
                .approvalNotes(dto.getApprovalNotes())
                .supplier(dto.getSupplier())
                .paymentMethod(dto.getPaymentMethod())
                .installments(dto.getInstallments())
                .deliveryMethod(dto.getDeliveryMethod())
                .deliveryAddress(dto.getDeliveryAddress())
                .contactPerson(dto.getContactPerson())
                .contactPhone(dto.getContactPhone())
                .contactEmail(dto.getContactEmail())
                .notes(dto.getNotes())
                .category(dto.getCategory())
                .unitOfMeasure(dto.getUnitOfMeasure())
                .itemNumber(dto.getItemNumber())
                .quantity(dto.getQuantity())
                .sizeBreakdown(serializeSizeBreakdown(dto.getSizeBreakdown()))
                .build();
        
        if (dto.getUnitId() != null) {
            Optional<Unit> unit = unitRepository.findById(dto.getUnitId());
            unit.ifPresent(request::setUnit);
        }
        
        if (dto.getRequesterId() != null) {
            Optional<User> requester = userRepository.findById(dto.getRequesterId());
            requester.ifPresent(request::setRequester);
        }
        
        if (dto.getApproverId() != null) {
            Optional<User> approver = userRepository.findById(dto.getApproverId());
            approver.ifPresent(request::setApprover);
        }
        
        return request;
    }
    
    private void updateRequestFromDTO(PurchaseRequest request, PurchaseRequestDTO dto) {
        request.setTitle(dto.getTitle());
        request.setDescription(dto.getDescription());
        request.setPriority(dto.getPriority());
        request.setStatus(dto.getStatus());
        request.setRequesterName(dto.getRequesterName());
        request.setDepartment(dto.getDepartment());
        request.setJustification(dto.getJustification());
        request.setEstimatedTotal(dto.getEstimatedTotal());
        request.setUrgency(dto.getUrgency());
        request.setRequiredDate(dto.getRequiredDate());
        request.setApprovedBy(dto.getApprovedBy());
        request.setApprovalNotes(dto.getApprovalNotes());
        request.setSupplier(dto.getSupplier());
        request.setPaymentMethod(dto.getPaymentMethod());
        request.setDeliveryMethod(dto.getDeliveryMethod());
        request.setDeliveryAddress(dto.getDeliveryAddress());
        request.setContactPerson(dto.getContactPerson());
        request.setContactPhone(dto.getContactPhone());
        request.setContactEmail(dto.getContactEmail());
        request.setNotes(dto.getNotes());
        request.setInstallments(dto.getInstallments());
        request.setCategory(dto.getCategory());
        request.setUnitOfMeasure(dto.getUnitOfMeasure());
        request.setItemNumber(dto.getItemNumber());
        request.setQuantity(dto.getQuantity());
        request.setSizeBreakdown(serializeSizeBreakdown(dto.getSizeBreakdown()));
        
        if (dto.getUnitId() != null) {
            Optional<Unit> unit = unitRepository.findById(dto.getUnitId());
            unit.ifPresent(request::setUnit);
        }
        
        if (dto.getRequesterId() != null) {
            Optional<User> requester = userRepository.findById(dto.getRequesterId());
            requester.ifPresent(request::setRequester);
        }
        
        if (dto.getApproverId() != null) {
            Optional<User> approver = userRepository.findById(dto.getApproverId());
            approver.ifPresent(request::setApprover);
        }
    }

    private List<PurchaseRequestSizeEntryDTO> parseSizeBreakdown(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<PurchaseRequestSizeEntryDTO>>() {});
        } catch (Exception e) {
            log.warn("Erro ao parsear sizeBreakdown: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private String serializeSizeBreakdown(List<PurchaseRequestSizeEntryDTO> entries) {
        if (entries == null || entries.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(entries);
        } catch (Exception e) {
            log.warn("Erro ao serializar sizeBreakdown: {}", e.getMessage());
            return null;
        }
    }
}