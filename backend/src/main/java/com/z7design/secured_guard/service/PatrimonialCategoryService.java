package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.PatrimonialCategoryDTO;
import com.z7design.secured_guard.model.PatrimonialCategory;
import com.z7design.secured_guard.repository.PatrimonialCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class PatrimonialCategoryService {

    private final PatrimonialCategoryRepository repository;

    public List<PatrimonialCategory> findAll() {
        return repository.findAll();
    }

    public Optional<PatrimonialCategory> findById(UUID id) {
        return repository.findById(id);
    }

    public PatrimonialCategory create(PatrimonialCategoryDTO dto) {
        PatrimonialCategory entity = new PatrimonialCategory();
        mapDtoToEntity(dto, entity);
        return repository.save(entity);
    }

    public PatrimonialCategory update(UUID id, PatrimonialCategoryDTO dto) {
        return repository.findById(id)
                .map(entity -> {
                    mapDtoToEntity(dto, entity);
                    return repository.save(entity);
                })
                .orElseThrow(() -> new com.z7design.secured_guard.exception.ResourceNotFoundException("Categoria patrimonial não encontrada"));
    }

    public void deleteById(UUID id) {
        if (!repository.existsById(id)) {
            throw new com.z7design.secured_guard.exception.ResourceNotFoundException("Categoria patrimonial não encontrada");
        }
        repository.deleteById(id);
    }

    private void mapDtoToEntity(PatrimonialCategoryDTO dto, PatrimonialCategory entity) {
        entity.setName(dto.getName());
        entity.setDescription(dto.getDescription());
        entity.setDefaultUsefulLifeYears(dto.getDefaultUsefulLifeYears());
        entity.setDefaultDepreciationRatePct(dto.getDefaultDepreciationRatePct());
    }
}
