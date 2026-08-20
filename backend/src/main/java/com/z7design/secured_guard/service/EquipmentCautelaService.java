package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EquipmentCautelaDTO;
import com.z7design.secured_guard.model.EquipmentCautela;
import com.z7design.secured_guard.repository.EquipmentCautelaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EquipmentCautelaService {

    private final EquipmentCautelaRepository repository;

    @Transactional(readOnly = true)
    public List<EquipmentCautelaDTO> findAll(LocalDate startDate, LocalDate endDate, String status, String search) {
        List<EquipmentCautela> list;
        if (startDate != null || endDate != null || (status != null && !status.isBlank() && !status.equals("TODOS")) || (search != null && !search.isBlank())) {
            list = repository.findWithFilters(startDate, endDate, status, search);
        } else {
            list = repository.findAllByOrderByTermDateDescCreatedAtDesc();
        }
        return list.stream().map(EquipmentCautelaDTO::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EquipmentCautelaDTO findById(Long id) {
        EquipmentCautela entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Termo de Cautela não encontrado com ID: " + id));
        return EquipmentCautelaDTO.fromEntity(entity);
    }

    @Transactional
    public EquipmentCautelaDTO create(EquipmentCautelaDTO dto) {
        EquipmentCautela entity = new EquipmentCautela();
        updateEntityFromDTO(entity, dto);

        EquipmentCautela saved = repository.save(entity);
        log.info("Termo de cautela de equipamentos criado: ID {}, Colaborador: {}", saved.getId(), saved.getEmployeeName());
        return EquipmentCautelaDTO.fromEntity(saved);
    }

    @Transactional
    public EquipmentCautelaDTO update(Long id, EquipmentCautelaDTO dto) {
        EquipmentCautela entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Termo de Cautela não encontrado com ID: " + id));

        updateEntityFromDTO(entity, dto);
        EquipmentCautela updated = repository.save(entity);
        log.info("Termo de cautela de equipamentos atualizado: ID {}", updated.getId());
        return EquipmentCautelaDTO.fromEntity(updated);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Termo de Cautela não encontrado com ID: " + id);
        }
        repository.deleteById(id);
        log.info("Termo de cautela excluído: ID {}", id);
    }

    private void updateEntityFromDTO(EquipmentCautela entity, EquipmentCautelaDTO dto) {
        entity.setCompanyName(dto.getCompanyName() != null ? dto.getCompanyName() : "SECURED GUARD SEGURANÇA PRIVADA");
        entity.setEmployeeName(dto.getEmployeeName());
        entity.setRegistration(dto.getRegistration());
        entity.setCpf(dto.getCpf());
        entity.setJobTitle(dto.getJobTitle());
        entity.setWorkPostName(dto.getWorkPostName());

        entity.setItem1HtEntregue(dto.getItem1HtEntregue() != null ? dto.getItem1HtEntregue() : false);
        entity.setItem1HtMarcaModelo(dto.getItem1HtMarcaModelo());

        entity.setItem2CarregadorEntregue(dto.getItem2CarregadorEntregue() != null ? dto.getItem2CarregadorEntregue() : false);
        entity.setItem2CarregadorMarcaModelo(dto.getItem2CarregadorMarcaModelo());

        entity.setItem3LanternaEntregue(dto.getItem3LanternaEntregue() != null ? dto.getItem3LanternaEntregue() : false);
        entity.setItem3LanternaMarcaModelo(dto.getItem3LanternaMarcaModelo());

        entity.setItem4BastaoEntregue(dto.getItem4BastaoEntregue() != null ? dto.getItem4BastaoEntregue() : false);
        entity.setItem4BastaoMarcaModelo(dto.getItem4BastaoMarcaModelo());

        entity.setItem5OutrosDescricao(dto.getItem5OutrosDescricao());
        entity.setItem5OutrosMarcaModelo(dto.getItem5OutrosMarcaModelo());

        entity.setStatus(dto.getStatus() != null ? dto.getStatus() : "ATIVO");
        entity.setCityUf(dto.getCityUf() != null ? dto.getCityUf() : "São Paulo - SP");
        entity.setTermDate(dto.getTermDate() != null ? dto.getTermDate() : LocalDate.now());
        entity.setObservations(dto.getObservations());

        entity.setEmployeeSignatureBase64(dto.getEmployeeSignatureBase64());
        entity.setAlmoxarifeName(dto.getAlmoxarifeName());
        entity.setAlmoxarifeSignatureBase64(dto.getAlmoxarifeSignatureBase64());
    }
}
