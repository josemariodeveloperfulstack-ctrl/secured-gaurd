package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.StorageShelfDTO;
import com.z7design.secured_guard.model.StorageShelf;
import com.z7design.secured_guard.repository.StorageShelfRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StorageShelfService {

    private final StorageShelfRepository storageShelfRepository;

    public List<StorageShelfDTO> getAllActiveShelves() {
        log.info("Buscando todas as prateleiras ativas");
        return storageShelfRepository.findByActiveTrue().stream()
                .map(StorageShelfDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public StorageShelfDTO getShelfById(UUID id) {
        log.info("Buscando prateleira por ID: {}", id);
        StorageShelf shelf = storageShelfRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prateleira não encontrada: " + id));
        return StorageShelfDTO.fromEntity(shelf);
    }

    public StorageShelfDTO createShelf(StorageShelfDTO dto) {
        log.info("Criando nova prateleira: {}", dto.getIdentification());

        if (storageShelfRepository.existsByIdentification(dto.getIdentification())) {
            throw new IllegalArgumentException("Já existe uma prateleira com a identificação: " + dto.getIdentification());
        }

        StorageShelf shelf = StorageShelfDTO.toEntity(dto);
        shelf = storageShelfRepository.save(shelf);

        log.info("Prateleira criada com sucesso - ID: {}", shelf.getId());
        return StorageShelfDTO.fromEntity(shelf);
    }

    public StorageShelfDTO updateShelf(UUID id, StorageShelfDTO dto) {
        log.info("Atualizando prateleira: {}", id);

        StorageShelf existingShelf = storageShelfRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prateleira não encontrada: " + id));

        if (dto.getIdentification() != null && !dto.getIdentification().equals(existingShelf.getIdentification()) &&
                storageShelfRepository.existsByIdentificationAndIdNot(dto.getIdentification(), id)) {
            throw new IllegalArgumentException("Já existe outra prateleira com a identificação: " + dto.getIdentification());
        }

        existingShelf.setIdentification(dto.getIdentification());
        existingShelf.setBlock(dto.getBlock());
        existingShelf.setSection(dto.getSection());
        existingShelf.setAisle(dto.getAisle());
        existingShelf.setRoom(dto.getRoom());
        existingShelf.setCompartmentInfo(dto.getCompartmentInfo());
        if (dto.getActive() != null) {
            existingShelf.setActive(dto.getActive());
        }

        existingShelf = storageShelfRepository.save(existingShelf);

        log.info("Prateleira atualizada com sucesso: {}", id);
        return StorageShelfDTO.fromEntity(existingShelf);
    }

    public void deleteShelf(UUID id) {
        log.info("Desativando prateleira: {}", id);
        StorageShelf shelf = storageShelfRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prateleira não encontrada: " + id));
        
        shelf.setActive(false);
        storageShelfRepository.save(shelf);
        log.info("Prateleira desativada: {}", id);
    }
}
