package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.PatrimonialAssetDTO;
import com.z7design.secured_guard.dto.PatrimonialDepreciationDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.PatrimonialAsset;
import com.z7design.secured_guard.model.PatrimonialCategory;
import com.z7design.secured_guard.repository.PatrimonialAssetRepository;
import com.z7design.secured_guard.repository.PatrimonialCategoryRepository;
import com.z7design.secured_guard.repository.PatrimonialLocationRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Year;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PatrimonialAssetService {

    private static final int CODE_SEQUENCE_LENGTH = 5;
    /** Sentinel UUID usado na query para "sem filtro" (evita parâmetro null no PostgreSQL). */
    private static final UUID NO_FILTER_UUID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    private final PatrimonialAssetRepository assetRepository;
    private final PatrimonialCategoryRepository categoryRepository;
    private final PatrimonialLocationRepository locationRepository;
    private final EmployeeRepository employeeRepository;

    public Page<PatrimonialAsset> findAll(Pageable pageable) {
        return assetRepository.findAll(pageable);
    }

    public Page<PatrimonialAsset> findByFilters(String codeOrName, UUID categoryId, UUID locationId, String status,
                                                 LocalDate acquisitionDateFrom, LocalDate acquisitionDateTo,
                                                 Pageable pageable) {
        UUID cat = categoryId != null ? categoryId : NO_FILTER_UUID;
        UUID loc = locationId != null ? locationId : NO_FILTER_UUID;
        String st = (status != null && !status.isBlank()) ? status : "";
        return assetRepository.findByFilters(codeOrName, cat, loc, st,
                acquisitionDateFrom, acquisitionDateTo, pageable);
    }

    public Optional<PatrimonialAsset> findById(UUID id) {
        return assetRepository.findByIdWithAssociations(id);
    }

    public Optional<PatrimonialAsset> findByCode(String code) {
        return assetRepository.findByCode(code);
    }

    public PatrimonialAsset create(PatrimonialAssetDTO dto) {
        PatrimonialAsset entity = new PatrimonialAsset();
        entity.setCode(generateNextCode());
        mapDtoToEntity(dto, entity);
        return assetRepository.save(entity);
    }

    public PatrimonialAsset update(UUID id, PatrimonialAssetDTO dto) {
        return assetRepository.findById(id)
                .map(entity -> {
                    mapDtoToEntity(dto, entity);
                    return assetRepository.save(entity);
                })
                .orElseThrow(() -> new ResourceNotFoundException("Bem patrimonial não encontrado"));
    }

    public void deleteById(UUID id) {
        if (!assetRepository.existsById(id)) {
            throw new ResourceNotFoundException("Bem patrimonial não encontrado");
        }
        assetRepository.deleteById(id);
    }

    public PatrimonialDepreciationDTO calculateDepreciation(UUID assetId, LocalDate asOfDate) {
        PatrimonialAsset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Bem patrimonial não encontrado"));

        int year = asset.getAcquisitionDate().getYear();
        int month = asset.getAcquisitionDate().getMonthValue();
        int usefulLifeMonths = asset.getUsefulLifeYears() * 12;

        int monthsFromAcquisition = (asOfDate.getYear() - year) * 12 + (asOfDate.getMonthValue() - month);
        if (monthsFromAcquisition < 0) {
            monthsFromAcquisition = 0;
        }
        int monthsDepreciated = Math.min(monthsFromAcquisition, usefulLifeMonths);

        BigDecimal residualPct = asset.getResidualValuePct() != null ? asset.getResidualValuePct() : BigDecimal.ZERO;
        BigDecimal depreciable = asset.getAcquisitionValue().multiply(BigDecimal.ONE.subtract(residualPct.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP)));
        BigDecimal accumulatedDepreciation = usefulLifeMonths > 0
                ? depreciable.multiply(BigDecimal.valueOf(monthsDepreciated)).divide(BigDecimal.valueOf(usefulLifeMonths), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal bookValue = asset.getAcquisitionValue().subtract(accumulatedDepreciation).max(BigDecimal.ZERO);

        PatrimonialDepreciationDTO result = new PatrimonialDepreciationDTO();
        result.setAsOfDate(asOfDate);
        result.setAcquisitionValue(asset.getAcquisitionValue());
        result.setAccumulatedDepreciation(accumulatedDepreciation);
        result.setBookValue(bookValue);
        result.setMonthsDepreciated(monthsDepreciated);
        result.setUsefulLifeMonths(usefulLifeMonths);
        return result;
    }

    private String generateNextCode() {
        int year = Year.now().getValue();
        String prefix = "PAT-" + year + "-";
        Integer maxSeq = assetRepository.findMaxSequenceForYear(prefix + "%");
        if (maxSeq == null) {
            maxSeq = 0;
        }
        int next = maxSeq + 1;
        String seq = String.format("%0" + CODE_SEQUENCE_LENGTH + "d", next);
        return prefix + seq;
    }

    private void mapDtoToEntity(PatrimonialAssetDTO dto, PatrimonialAsset entity) {
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());

        PatrimonialCategory category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Categoria patrimonial não encontrada"));
        entity.setCategory(category);

        if (dto.getLocationId() != null) {
            entity.setLocation(locationRepository.findById(dto.getLocationId()).orElse(null));
        } else {
            entity.setLocation(null);
        }

        entity.setAcquisitionDate(dto.getAcquisitionDate());
        entity.setAcquisitionValue(dto.getAcquisitionValue());
        entity.setUsefulLifeYears(dto.getUsefulLifeYears());
        entity.setResidualValuePct(dto.getResidualValuePct() != null ? dto.getResidualValuePct() : BigDecimal.ZERO);
        entity.setStatus(dto.getStatus() != null ? dto.getStatus() : "EM_USO");
        entity.setSerialNumber(dto.getSerialNumber());
        entity.setInvoiceNumber(dto.getInvoiceNumber());
        entity.setNotes(dto.getNotes());

        if (dto.getResponsibleEmployeeId() != null) {
            entity.setResponsibleEmployee(employeeRepository.findById(dto.getResponsibleEmployeeId()).orElse(null));
        } else {
            entity.setResponsibleEmployee(null);
        }
    }
}
