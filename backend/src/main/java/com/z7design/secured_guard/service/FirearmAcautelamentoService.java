package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.FirearmAcautelamentoDTO;
import com.z7design.secured_guard.model.FirearmAcautelamento;
import com.z7design.secured_guard.repository.FirearmAcautelamentoRepository;
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
public class FirearmAcautelamentoService {

    private final FirearmAcautelamentoRepository repository;

    @Transactional(readOnly = true)
    public List<FirearmAcautelamentoDTO> findAll(LocalDate startDate, LocalDate endDate, String status, String search) {
        List<FirearmAcautelamento> list;
        if (startDate != null || endDate != null || (status != null && !status.isBlank() && !status.equals("TODOS")) || (search != null && !search.isBlank())) {
            list = repository.findWithFilters(startDate, endDate, status, search);
        } else {
            list = repository.findAllByOrderByTermDateDescCreatedAtDesc();
        }
        return list.stream().map(FirearmAcautelamentoDTO::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FirearmAcautelamentoDTO findById(Long id) {
        FirearmAcautelamento entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Termo de Acautelamento não encontrado com ID: " + id));
        return FirearmAcautelamentoDTO.fromEntity(entity);
    }

    @Transactional
    public FirearmAcautelamentoDTO create(FirearmAcautelamentoDTO dto) {
        FirearmAcautelamento entity = new FirearmAcautelamento();
        updateEntityFromDTO(entity, dto);

        FirearmAcautelamento saved = repository.save(entity);
        log.info("Termo de acautelamento de arma criado: ID {}, Vigilante: {}, Arma: {}",
                saved.getId(), saved.getVigilanteName(), saved.getSerialNumber());
        return FirearmAcautelamentoDTO.fromEntity(saved);
    }

    @Transactional
    public FirearmAcautelamentoDTO update(Long id, FirearmAcautelamentoDTO dto) {
        FirearmAcautelamento entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Termo de Acautelamento não encontrado com ID: " + id));

        updateEntityFromDTO(entity, dto);
        FirearmAcautelamento updated = repository.save(entity);
        log.info("Termo de acautelamento de arma atualizado: ID {}", updated.getId());
        return FirearmAcautelamentoDTO.fromEntity(updated);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Termo de Acautelamento não encontrado com ID: " + id);
        }
        repository.deleteById(id);
        log.info("Termo de acautelamento excluído: ID {}", id);
    }

    private void updateEntityFromDTO(FirearmAcautelamento entity, FirearmAcautelamentoDTO dto) {
        entity.setCompanyName(dto.getCompanyName() != null ? dto.getCompanyName() : "SECURED GUARD SEGURANÇA PRIVADA");
        entity.setVigilanteName(dto.getVigilanteName());
        entity.setRegistration(dto.getRegistration());
        entity.setCnvNumber(dto.getCnvNumber());
        entity.setCpf(dto.getCpf());
        entity.setWorkPostName(dto.getWorkPostName());
        entity.setRecyclingExpirationDate(dto.getRecyclingExpirationDate());

        entity.setWeaponType(dto.getWeaponType());
        entity.setBrand(dto.getBrand());
        entity.setCaliber(dto.getCaliber());
        entity.setShotCapacity(dto.getShotCapacity());
        entity.setSerialNumber(dto.getSerialNumber() != null ? dto.getSerialNumber().trim() : "");
        entity.setCrafNumber(dto.getCrafNumber());
        entity.setAmmoQuantity(dto.getAmmoQuantity());
        entity.setAmmoType(dto.getAmmoType());
        entity.setAmmoLot(dto.getAmmoLot());
        entity.setAccessories(dto.getAccessories());

        entity.setMecanismoDisparoOk(dto.getMecanismoDisparoOk() != null ? dto.getMecanismoDisparoOk() : true);
        entity.setCanoDesobstruidoOk(dto.getCanoDesobstruidoOk() != null ? dto.getCanoDesobstruidoOk() : true);
        entity.setConservationState(dto.getConservationState() != null ? dto.getConservationState() : "Excelente");

        entity.setStatus(dto.getStatus() != null ? dto.getStatus() : "ATIVO");
        entity.setCityUf(dto.getCityUf() != null ? dto.getCityUf() : "São Paulo - SP");
        entity.setTermDate(dto.getTermDate() != null ? dto.getTermDate() : LocalDate.now());
        entity.setObservations(dto.getObservations());

        entity.setVigilanteSignatureBase64(dto.getVigilanteSignatureBase64());
        entity.setArmeiroName(dto.getArmeiroName());
        entity.setArmeiroSignatureBase64(dto.getArmeiroSignatureBase64());
    }
}
