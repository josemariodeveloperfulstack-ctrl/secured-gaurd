package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.RadioChecklistDTO;
import com.z7design.secured_guard.model.RadioChecklist;
import com.z7design.secured_guard.model.RadioChecklist.MovementType;
import com.z7design.secured_guard.repository.RadioChecklistRepository;
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
public class RadioChecklistService {

    private final RadioChecklistRepository radioChecklistRepository;

    @Transactional(readOnly = true)
    public List<RadioChecklistDTO> findAll(LocalDate startDate, LocalDate endDate, MovementType movementType, String workPost, String vigilante) {
        List<RadioChecklist> list;
        if (startDate != null || endDate != null || movementType != null || (workPost != null && !workPost.isBlank()) || (vigilante != null && !vigilante.isBlank())) {
            list = radioChecklistRepository.findWithFilters(startDate, endDate, movementType, workPost, vigilante);
        } else {
            list = radioChecklistRepository.findAllByOrderByChecklistDateDescChecklistTimeDesc();
        }
        return list.stream().map(RadioChecklistDTO::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RadioChecklistDTO> findAll(LocalDate startDate, LocalDate endDate, MovementType movementType, String search) {
        return findAll(startDate, endDate, movementType, search, search);
    }

    @Transactional(readOnly = true)
    public RadioChecklistDTO findById(Long id) {
        RadioChecklist entity = radioChecklistRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Checklist de rádio não encontrado com ID: " + id));
        return RadioChecklistDTO.fromEntity(entity);
    }

    @Transactional
    public RadioChecklistDTO create(RadioChecklistDTO dto) {
        RadioChecklist entity = new RadioChecklist();
        updateEntityFromDTO(entity, dto);

        RadioChecklist saved = radioChecklistRepository.save(entity);
        log.info("Checklist de rádio criado com sucesso: ID {}, Tipo: {}, Vigilante: {}",
                saved.getId(), saved.getMovementType(), saved.getVigilanteName());
        return RadioChecklistDTO.fromEntity(saved);
    }

    @Transactional
    public RadioChecklistDTO update(Long id, RadioChecklistDTO dto) {
        RadioChecklist entity = radioChecklistRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Checklist de rádio não encontrado com ID: " + id));

        updateEntityFromDTO(entity, dto);
        RadioChecklist updated = radioChecklistRepository.save(entity);
        log.info("Checklist de rádio atualizado com sucesso: ID {}", updated.getId());
        return RadioChecklistDTO.fromEntity(updated);
    }

    @Transactional
    public void delete(Long id) {
        if (!radioChecklistRepository.existsById(id)) {
            throw new RuntimeException("Checklist de rádio não encontrado com ID: " + id);
        }
        radioChecklistRepository.deleteById(id);
        log.info("Checklist de rádio excluído com sucesso: ID {}", id);
    }

    private void updateEntityFromDTO(RadioChecklist entity, RadioChecklistDTO dto) {
        entity.setDocumentCode(dto.getDocumentCode() != null ? dto.getDocumentCode() : "CK-ALMOX-HT");
        entity.setDocumentVersion(dto.getDocumentVersion() != null ? dto.getDocumentVersion() : "02");
        entity.setDocumentDate(dto.getDocumentDate() != null ? dto.getDocumentDate() : LocalDate.now());
        entity.setMovementType(dto.getMovementType() != null ? dto.getMovementType() : MovementType.RETIRADA);
        
        entity.setChecklistDate(dto.getChecklistDate() != null ? dto.getChecklistDate() : LocalDate.now());
        entity.setChecklistTime(dto.getChecklistTime() != null ? dto.getChecklistTime() : LocalTime.now());
        entity.setVigilanteName(dto.getVigilanteName());
        entity.setVigilanteRegistration(dto.getVigilanteRegistration());
        entity.setWorkPostName(dto.getWorkPostName());
        entity.setRadioAssetId(dto.getRadioAssetId());
        entity.setRadioSerialNumber(dto.getRadioSerialNumber());

        // 1. Inspeção Física
        entity.setCarcacaExterna(dto.getCarcacaExterna() != null ? dto.getCarcacaExterna() : false);
        entity.setAntena(dto.getAntena() != null ? dto.getAntena() : false);
        entity.setClipCinto(dto.getClipCinto() != null ? dto.getClipCinto() : false);
        entity.setConectorAcessorios(dto.getConectorAcessorios() != null ? dto.getConectorAcessorios() : false);

        // 2. Alimentação e Bateria
        entity.setEncaixeBateria(dto.getEncaixeBateria() != null ? dto.getEncaixeBateria() : false);
        entity.setNivelCarga(dto.getNivelCarga() != null ? dto.getNivelCarga() : false);
        entity.setContatosCarga(dto.getContatosCarga() != null ? dto.getContatosCarga() : false);

        // 3. Teste Operacional
        entity.setBotaoVolume(dto.getBotaoVolume() != null ? dto.getBotaoVolume() : false);
        entity.setSeletorCanais(dto.getSeletorCanais() != null ? dto.getSeletorCanais() : false);
        entity.setBotaoPtt(dto.getBotaoPtt() != null ? dto.getBotaoPtt() : false);
        entity.setTesteComunicacaoPratica(dto.getTesteComunicacaoPratica() != null ? dto.getTesteComunicacaoPratica() : false);

        // 4. Acessórios
        entity.setFoneOuvidoLapela(dto.getFoneOuvidoLapela() != null ? dto.getFoneOuvidoLapela() : false);
        entity.setCarregadorMesaFonte(dto.getCarregadorMesaFonte() != null ? dto.getCarregadorMesaFonte() : false);

        // Avaliação de conformidade
        boolean allChecked = Boolean.TRUE.equals(entity.getCarcacaExterna()) &&
                             Boolean.TRUE.equals(entity.getAntena()) &&
                             Boolean.TRUE.equals(entity.getClipCinto()) &&
                             Boolean.TRUE.equals(entity.getConectorAcessorios()) &&
                             Boolean.TRUE.equals(entity.getEncaixeBateria()) &&
                             Boolean.TRUE.equals(entity.getNivelCarga()) &&
                             Boolean.TRUE.equals(entity.getContatosCarga()) &&
                             Boolean.TRUE.equals(entity.getBotaoVolume()) &&
                             Boolean.TRUE.equals(entity.getSeletorCanais()) &&
                             Boolean.TRUE.equals(entity.getBotaoPtt()) &&
                             Boolean.TRUE.equals(entity.getTesteComunicacaoPratica());

        if (dto.getConformityStatus() != null && !dto.getConformityStatus().isBlank()) {
            entity.setConformityStatus(dto.getConformityStatus());
        } else {
            entity.setConformityStatus(allChecked ? "CONFORME" : "COM_AVARIA");
        }

        entity.setObservations(dto.getObservations());
        entity.setVigilanteSignatureBase64(dto.getVigilanteSignatureBase64());
        entity.setAlmoxarifeName(dto.getAlmoxarifeName());
        entity.setAlmoxarifeSignatureBase64(dto.getAlmoxarifeSignatureBase64());
    }
}
