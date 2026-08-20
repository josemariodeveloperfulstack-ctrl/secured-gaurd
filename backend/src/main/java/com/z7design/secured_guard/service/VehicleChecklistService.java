package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.VehicleChecklistDTO;
import com.z7design.secured_guard.model.VehicleChecklist;
import com.z7design.secured_guard.model.VehicleChecklist.ShiftType;
import com.z7design.secured_guard.repository.VehicleChecklistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleChecklistService {

    private final VehicleChecklistRepository vehicleChecklistRepository;

    @Transactional(readOnly = true)
    public List<VehicleChecklistDTO> findAll(LocalDate startDate, LocalDate endDate, ShiftType shift, String search) {
        List<VehicleChecklist> list;
        if (startDate != null || endDate != null || shift != null || (search != null && !search.isBlank())) {
            list = vehicleChecklistRepository.findWithFilters(startDate, endDate, shift, search);
        } else {
            list = vehicleChecklistRepository.findAllByOrderByChecklistDateDescChecklistTimeDesc();
        }
        return list.stream().map(VehicleChecklistDTO::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VehicleChecklistDTO findById(Long id) {
        VehicleChecklist entity = vehicleChecklistRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Checklist de viatura não encontrado com ID: " + id));
        return VehicleChecklistDTO.fromEntity(entity);
    }

    @Transactional
    public VehicleChecklistDTO create(VehicleChecklistDTO dto) {
        VehicleChecklist entity = new VehicleChecklist();
        updateEntityFromDTO(entity, dto);

        VehicleChecklist saved = vehicleChecklistRepository.save(entity);
        log.info("Checklist de viatura criado com sucesso: ID {}, Placa: {}", saved.getId(), saved.getPlate());
        return VehicleChecklistDTO.fromEntity(saved);
    }

    @Transactional
    public VehicleChecklistDTO update(Long id, VehicleChecklistDTO dto) {
        VehicleChecklist entity = vehicleChecklistRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Checklist de viatura não encontrado com ID: " + id));

        updateEntityFromDTO(entity, dto);
        VehicleChecklist updated = vehicleChecklistRepository.save(entity);
        log.info("Checklist de viatura atualizado: ID {}", updated.getId());
        return VehicleChecklistDTO.fromEntity(updated);
    }

    @Transactional
    public void delete(Long id) {
        if (!vehicleChecklistRepository.existsById(id)) {
            throw new RuntimeException("Checklist de viatura não encontrado com ID: " + id);
        }
        vehicleChecklistRepository.deleteById(id);
        log.info("Checklist de viatura excluído: ID {}", id);
    }

    private void updateEntityFromDTO(VehicleChecklist entity, VehicleChecklistDTO dto) {
        entity.setPlate(dto.getPlate() != null ? dto.getPlate().toUpperCase().trim() : "");
        entity.setModel(dto.getModel());
        entity.setCurrentKm(dto.getCurrentKm());
        entity.setChecklistDate(dto.getChecklistDate() != null ? dto.getChecklistDate() : LocalDate.now());
        entity.setChecklistTime(dto.getChecklistTime() != null ? dto.getChecklistTime() : LocalTime.now());
        entity.setShift(dto.getShift() != null ? dto.getShift() : ShiftType.DIA);
        entity.setSupervisorName(dto.getSupervisorName());
        entity.setEmployeeName(dto.getEmployeeName());
        entity.setEmployeeRegistration(dto.getEmployeeRegistration());

        // 1. Inspeção Externa
        entity.setDianteira(dto.getDianteira() != null ? dto.getDianteira() : false);
        entity.setLaterais(dto.getLaterais() != null ? dto.getLaterais() : false);
        entity.setVidrosRetrovisores(dto.getVidrosRetrovisores() != null ? dto.getVidrosRetrovisores() : false);
        entity.setIdentificacaoVisual(dto.getIdentificacaoVisual() != null ? dto.getIdentificacaoVisual() : false);

        // 2. Iluminação
        entity.setFaroisLanternas(dto.getFaroisLanternas() != null ? dto.getFaroisLanternas() : false);
        entity.setGiroflexSirene(dto.getGiroflexSirene() != null ? dto.getGiroflexSirene() : false);
        entity.setBuzina(dto.getBuzina() != null ? dto.getBuzina() : false);

        // 3. Mecânica
        entity.setPneus(dto.getPneus() != null ? dto.getPneus() : false);
        entity.setNiveis(dto.getNiveis() != null ? dto.getNiveis() : false);
        entity.setPainel(dto.getPainel() != null ? dto.getPainel() : false);

        // 4. Kit de Bordo
        entity.setDocumentacao(dto.getDocumentacao() != null ? dto.getDocumentacao() : false);
        entity.setFerramentasEmergencia(dto.getFerramentasEmergencia() != null ? dto.getFerramentasEmergencia() : false);
        entity.setExtintorIncendio(dto.getExtintorIncendio() != null ? dto.getExtintorIncendio() : false);
        entity.setKitPrancheta(dto.getKitPrancheta() != null ? dto.getKitPrancheta() : false);

        // Avaliação de conformidade
        boolean allChecked = Boolean.TRUE.equals(entity.getDianteira()) &&
                             Boolean.TRUE.equals(entity.getLaterais()) &&
                             Boolean.TRUE.equals(entity.getVidrosRetrovisores()) &&
                             Boolean.TRUE.equals(entity.getIdentificacaoVisual()) &&
                             Boolean.TRUE.equals(entity.getFaroisLanternas()) &&
                             Boolean.TRUE.equals(entity.getGiroflexSirene()) &&
                             Boolean.TRUE.equals(entity.getBuzina()) &&
                             Boolean.TRUE.equals(entity.getPneus()) &&
                             Boolean.TRUE.equals(entity.getNiveis()) &&
                             Boolean.TRUE.equals(entity.getPainel()) &&
                             Boolean.TRUE.equals(entity.getDocumentacao()) &&
                             Boolean.TRUE.equals(entity.getFerramentasEmergencia()) &&
                             Boolean.TRUE.equals(entity.getExtintorIncendio()) &&
                             Boolean.TRUE.equals(entity.getKitPrancheta());

        if (dto.getConformityStatus() != null && !dto.getConformityStatus().isBlank()) {
            entity.setConformityStatus(dto.getConformityStatus());
        } else {
            entity.setConformityStatus(allChecked ? "CONFORME" : "COM_AVARIA");
        }

        entity.setObservations(dto.getObservations());
        entity.setSignatureBase64(dto.getSignatureBase64());
    }
}
