package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.PurchaseQuotationDTO;
import com.z7design.secured_guard.model.PurchaseQuotation;
import com.z7design.secured_guard.model.Supplier;
import com.z7design.secured_guard.model.Unit;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.PurchaseQuotationStatus;
import com.z7design.secured_guard.repository.PurchaseQuotationRepository;
import com.z7design.secured_guard.repository.SupplierRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PurchaseQuotationService {
    
    private final PurchaseQuotationRepository purchaseQuotationRepository;
    private final SupplierRepository supplierRepository;
    private final UnitRepository unitRepository;
    private final UserRepository userRepository;
    
    @Transactional(readOnly = true)
    public List<PurchaseQuotationDTO> getAllQuotations() {
        return purchaseQuotationRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public Optional<PurchaseQuotationDTO> getQuotationById(UUID id) {
        return purchaseQuotationRepository.findById(id)
                .map(this::convertToDTO);
    }
    
    @Transactional
    public PurchaseQuotationDTO createQuotation(PurchaseQuotationDTO quotationDTO, UUID createdById) {
        PurchaseQuotation quotation = convertToEntity(quotationDTO);
        
        // Definir usuário criador
        User createdBy = userRepository.findById(createdById)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        quotation.setCreatedBy(createdBy);
        
        // Gerar número da cotação se não fornecido
        if (quotation.getQuoteNumber() == null || quotation.getQuoteNumber().isEmpty()) {
            quotation.setQuoteNumber(generateQuoteNumber());
        }
        
        // Definir status padrão
        if (quotation.getStatus() == null) {
            quotation.setStatus(PurchaseQuotationStatus.DRAFT);
        }
        
        PurchaseQuotation savedQuotation = purchaseQuotationRepository.save(quotation);
        return convertToDTO(savedQuotation);
    }
    
    @Transactional
    public PurchaseQuotationDTO updateQuotation(UUID id, PurchaseQuotationDTO quotationDTO) {
        Optional<PurchaseQuotation> existingQuotation = purchaseQuotationRepository.findById(id);
        if (existingQuotation.isPresent()) {
            PurchaseQuotation quotation = existingQuotation.get();
            updateQuotationFromDTO(quotation, quotationDTO);
            
            PurchaseQuotation savedQuotation = purchaseQuotationRepository.save(quotation);
            return convertToDTO(savedQuotation);
        }
        throw new RuntimeException("Cotação não encontrada");
    }
    
    @Transactional
    public void deleteQuotation(UUID id) {
        purchaseQuotationRepository.deleteById(id);
    }
    
    @Transactional
    public PurchaseQuotationDTO updateStatus(UUID id, String status) {
        Optional<PurchaseQuotation> quotation = purchaseQuotationRepository.findById(id);
        if (quotation.isPresent()) {
            PurchaseQuotation pq = quotation.get();
            try {
                PurchaseQuotationStatus newStatus = PurchaseQuotationStatus.valueOf(status.toUpperCase());
                pq.setStatus(newStatus);
                
                // Se expirou, atualizar status automaticamente
                if (pq.isExpired() && newStatus != PurchaseQuotationStatus.EXPIRED) {
                    pq.setStatus(PurchaseQuotationStatus.EXPIRED);
                }
                
                PurchaseQuotation savedQuotation = purchaseQuotationRepository.save(pq);
                return convertToDTO(savedQuotation);
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Status inválido: " + status);
            }
        }
        throw new RuntimeException("Cotação não encontrada");
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseQuotationDTO> findByStatus(String status) {
        try {
            PurchaseQuotationStatus quotationStatus = PurchaseQuotationStatus.valueOf(status.toUpperCase());
            return purchaseQuotationRepository.findByStatus(quotationStatus).stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Status inválido: " + status);
        }
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseQuotationDTO> findBySupplier(UUID supplierId) {
        return purchaseQuotationRepository.findBySupplierId(supplierId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseQuotationDTO> findByUnit(UUID unitId) {
        return purchaseQuotationRepository.findByUnitId(unitId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseQuotationDTO> findByAssignedTo(UUID userId) {
        return purchaseQuotationRepository.findByAssignedToId(userId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseQuotationDTO> findExpiredQuotations() {
        return purchaseQuotationRepository.findExpiredQuotations(
                LocalDate.now(), 
                PurchaseQuotationStatus.EXPIRED
        ).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseQuotationDTO> findQuotationsExpiringSoon(int days) {
        LocalDate today = LocalDate.now();
        LocalDate futureDate = today.plusDays(days);
        return purchaseQuotationRepository.findQuotationsExpiringSoon(today, futureDate).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<PurchaseQuotationDTO> searchQuotations(String term) {
        return purchaseQuotationRepository.searchQuotations(term).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public long countByStatus(PurchaseQuotationStatus status) {
        return purchaseQuotationRepository.countByStatus(status);
    }
    
    // Métodos auxiliares
    private String generateQuoteNumber() {
        // Formato: COT-YYYYMMDD-XXXX
        String date = LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String random = String.format("%04d", (int) (Math.random() * 10000));
        return "COT-" + date + "-" + random;
    }
    
    // Métodos de conversão
    private PurchaseQuotationDTO convertToDTO(PurchaseQuotation quotation) {
        PurchaseQuotationDTO dto = PurchaseQuotationDTO.builder()
                .id(quotation.getId())
                .quoteNumber(quotation.getQuoteNumber())
                .title(quotation.getTitle())
                .description(quotation.getDescription())
                .supplierId(quotation.getSupplier() != null ? quotation.getSupplier().getId() : null)
                .supplierName(quotation.getSupplier() != null ? quotation.getSupplier().getName() : null)
                .unitId(quotation.getUnit() != null ? quotation.getUnit().getId() : null)
                .unitName(quotation.getUnit() != null ? quotation.getUnit().getName() : null)
                .status(quotation.getStatus())
                .totalValue(quotation.getTotalValue())
                .validUntil(quotation.getValidUntil())
                .terms(quotation.getTerms())
                .paymentMethod(quotation.getPaymentMethod())
                .deliveryMethod(quotation.getDeliveryMethod())
                .notes(quotation.getNotes())
                .createdById(quotation.getCreatedBy() != null ? quotation.getCreatedBy().getId() : null)
                .createdByName(quotation.getCreatedBy() != null ? quotation.getCreatedBy().getName() : null)
                .assignedToId(quotation.getAssignedTo() != null ? quotation.getAssignedTo().getId() : null)
                .assignedToName(quotation.getAssignedTo() != null ? quotation.getAssignedTo().getName() : null)
                .createdAt(quotation.getCreatedAt())
                .updatedAt(quotation.getUpdatedAt())
                .build();
        
        // Campos calculados
        dto.setExpired(quotation.isExpired());
        dto.setExpiringSoon(quotation.isExpiringSoon(7)); // 7 dias
        dto.setCanBeApproved(quotation.canBeApproved());
        dto.setCanBeRejected(quotation.canBeRejected());
        
        return dto;
    }
    
    private PurchaseQuotation convertToEntity(PurchaseQuotationDTO dto) {
        PurchaseQuotation quotation = new PurchaseQuotation();
        quotation.setQuoteNumber(dto.getQuoteNumber());
        quotation.setTitle(dto.getTitle());
        quotation.setDescription(dto.getDescription());
        quotation.setStatus(dto.getStatus() != null ? dto.getStatus() : PurchaseQuotationStatus.DRAFT);
        quotation.setTotalValue(dto.getTotalValue());
        quotation.setValidUntil(dto.getValidUntil());
        quotation.setTerms(dto.getTerms());
        quotation.setPaymentMethod(dto.getPaymentMethod());
        quotation.setDeliveryMethod(dto.getDeliveryMethod());
        quotation.setNotes(dto.getNotes());
        
        if (dto.getSupplierId() != null) {
            Optional<Supplier> supplier = supplierRepository.findById(dto.getSupplierId());
            supplier.ifPresent(quotation::setSupplier);
        }
        
        if (dto.getUnitId() != null) {
            Optional<Unit> unit = unitRepository.findById(dto.getUnitId());
            unit.ifPresent(quotation::setUnit);
        }
        
        if (dto.getAssignedToId() != null) {
            Optional<User> assignedTo = userRepository.findById(dto.getAssignedToId());
            assignedTo.ifPresent(quotation::setAssignedTo);
        }
        
        return quotation;
    }
    
    private void updateQuotationFromDTO(PurchaseQuotation quotation, PurchaseQuotationDTO dto) {
        if (dto.getTitle() != null) {
            quotation.setTitle(dto.getTitle());
        }
        if (dto.getDescription() != null) {
            quotation.setDescription(dto.getDescription());
        }
        if (dto.getStatus() != null) {
            quotation.setStatus(dto.getStatus());
        }
        if (dto.getTotalValue() != null) {
            quotation.setTotalValue(dto.getTotalValue());
        }
        if (dto.getValidUntil() != null) {
            quotation.setValidUntil(dto.getValidUntil());
        }
        if (dto.getTerms() != null) {
            quotation.setTerms(dto.getTerms());
        }
        if (dto.getPaymentMethod() != null) {
            quotation.setPaymentMethod(dto.getPaymentMethod());
        }
        if (dto.getDeliveryMethod() != null) {
            quotation.setDeliveryMethod(dto.getDeliveryMethod());
        }
        if (dto.getNotes() != null) {
            quotation.setNotes(dto.getNotes());
        }
        
        if (dto.getSupplierId() != null) {
            Optional<Supplier> supplier = supplierRepository.findById(dto.getSupplierId());
            supplier.ifPresent(quotation::setSupplier);
        } else if (dto.getSupplierId() == null && quotation.getSupplier() != null) {
            quotation.setSupplier(null);
        }
        
        if (dto.getUnitId() != null) {
            Optional<Unit> unit = unitRepository.findById(dto.getUnitId());
            unit.ifPresent(quotation::setUnit);
        } else if (dto.getUnitId() == null && quotation.getUnit() != null) {
            quotation.setUnit(null);
        }
        
        if (dto.getAssignedToId() != null) {
            Optional<User> assignedTo = userRepository.findById(dto.getAssignedToId());
            assignedTo.ifPresent(quotation::setAssignedTo);
        } else if (dto.getAssignedToId() == null && quotation.getAssignedTo() != null) {
            quotation.setAssignedTo(null);
        }
    }
}





