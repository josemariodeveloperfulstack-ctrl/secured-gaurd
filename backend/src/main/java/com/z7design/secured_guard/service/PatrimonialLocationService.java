package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.PatrimonialLocationDTO;
import com.z7design.secured_guard.model.PatrimonialLocation;
import com.z7design.secured_guard.repository.PatrimonialLocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PatrimonialLocationService {

    private final PatrimonialLocationRepository repository;

    public List<PatrimonialLocation> findAll() {
        return repository.findAll();
    }

    public Optional<PatrimonialLocation> findById(UUID id) {
        return repository.findById(id);
    }

    public PatrimonialLocation create(PatrimonialLocationDTO dto) {
        PatrimonialLocation entity = new PatrimonialLocation();
        mapDtoToEntity(dto, entity);
        return repository.save(entity);
    }

    public PatrimonialLocation update(UUID id, PatrimonialLocationDTO dto) {
        return repository.findById(id)
                .map(entity -> {
                    mapDtoToEntity(dto, entity);
                    return repository.save(entity);
                })
                .orElseThrow(() -> new com.z7design.secured_guard.exception.ResourceNotFoundException("Localização patrimonial não encontrada"));
    }

    public void deleteById(UUID id) {
        if (!repository.existsById(id)) {
            throw new com.z7design.secured_guard.exception.ResourceNotFoundException("Localização patrimonial não encontrada");
        }
        repository.deleteById(id);
    }

    private void mapDtoToEntity(PatrimonialLocationDTO dto, PatrimonialLocation entity) {
        entity.setCode(dto.getCode());
        entity.setName(dto.getName());
        entity.setAddressOrRoom(dto.getAddressOrRoom());
        entity.setNotes(dto.getNotes());
    }
}
