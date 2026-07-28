package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CategoriaPaiDTO;
import com.z7design.secured_guard.model.CategoriaPai;
import com.z7design.secured_guard.repository.CategoriaPaiRepository;
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
public class CategoriaPaiService {

    private final CategoriaPaiRepository repository;

    @Transactional(readOnly = true)
    public List<CategoriaPaiDTO> findAll() {
        return repository.findAllByOrderByCodigoAsc().stream()
                .map(CategoriaPaiDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<CategoriaPaiDTO> findById(UUID id) {
        return repository.findById(id).map(CategoriaPaiDTO::fromEntity);
    }

    public CategoriaPaiDTO create(CategoriaPaiDTO dto) {
        if (repository.existsByCodigo(dto.getCodigo())) {
            throw new IllegalArgumentException("Já existe uma categoria com o código " + dto.getCodigo());
        }
        CategoriaPai entity = new CategoriaPai();
        entity.setNome(dto.getNome());
        entity.setCodigo(dto.getCodigo());
        return CategoriaPaiDTO.fromEntity(repository.save(entity));
    }

    public CategoriaPaiDTO update(UUID id, CategoriaPaiDTO dto) {
        return repository.findById(id).map(entity -> {
            if (!entity.getCodigo().equals(dto.getCodigo()) && repository.existsByCodigo(dto.getCodigo())) {
                throw new IllegalArgumentException("Já existe uma categoria com o código " + dto.getCodigo());
            }
            entity.setNome(dto.getNome());
            entity.setCodigo(dto.getCodigo());
            return CategoriaPaiDTO.fromEntity(repository.save(entity));
        }).orElseThrow(() -> new RuntimeException("Categoria pai não encontrada com ID: " + id));
    }

    public void deleteById(UUID id) {
        repository.deleteById(id);
    }
}
