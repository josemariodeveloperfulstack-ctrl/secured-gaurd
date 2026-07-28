package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.SubcategoriaDTO;
import com.z7design.secured_guard.model.CategoriaPai;
import com.z7design.secured_guard.model.Subcategoria;
import com.z7design.secured_guard.repository.CategoriaPaiRepository;
import com.z7design.secured_guard.repository.SubcategoriaRepository;
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
public class SubcategoriaService {

    private final SubcategoriaRepository repository;
    private final CategoriaPaiRepository categoriaPaiRepository;

    @Transactional(readOnly = true)
    public List<SubcategoriaDTO> findAll() {
        return repository.findAllByOrderByCategoriaPaiCodigoAscCodigoAsc().stream()
                .map(SubcategoriaDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SubcategoriaDTO> findByCategoriaPaiId(UUID categoriaPaiId) {
        return repository.findByCategoriaPaiIdOrderByCodigoAsc(categoriaPaiId).stream()
                .map(SubcategoriaDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<SubcategoriaDTO> findById(UUID id) {
        return repository.findById(id).map(SubcategoriaDTO::fromEntity);
    }

    public SubcategoriaDTO create(SubcategoriaDTO dto) {
        if (repository.existsByCodigo(dto.getCodigo())) {
            throw new IllegalArgumentException("Já existe uma subcategoria com o código " + dto.getCodigo());
        }
        CategoriaPai categoriaPai = categoriaPaiRepository.findById(dto.getCategoriaPaiId())
                .orElseThrow(() -> new RuntimeException("Categoria pai não encontrada com ID: " + dto.getCategoriaPaiId()));

        Subcategoria entity = new Subcategoria();
        entity.setCategoriaPai(categoriaPai);
        entity.setNome(dto.getNome());
        entity.setCodigo(dto.getCodigo());
        entity.setRequerVinculoFuncionario(dto.getRequerVinculoFuncionario() != null ? dto.getRequerVinculoFuncionario() : false);
        return SubcategoriaDTO.fromEntity(repository.save(entity));
    }

    public SubcategoriaDTO update(UUID id, SubcategoriaDTO dto) {
        return repository.findById(id).map(entity -> {
            if (!entity.getCodigo().equals(dto.getCodigo()) && repository.existsByCodigo(dto.getCodigo())) {
                throw new IllegalArgumentException("Já existe uma subcategoria com o código " + dto.getCodigo());
            }
            if (dto.getCategoriaPaiId() != null && (entity.getCategoriaPai() == null || !entity.getCategoriaPai().getId().equals(dto.getCategoriaPaiId()))) {
                CategoriaPai categoriaPai = categoriaPaiRepository.findById(dto.getCategoriaPaiId())
                        .orElseThrow(() -> new RuntimeException("Categoria pai não encontrada com ID: " + dto.getCategoriaPaiId()));
                entity.setCategoriaPai(categoriaPai);
            }
            entity.setNome(dto.getNome());
            entity.setCodigo(dto.getCodigo());
            entity.setRequerVinculoFuncionario(dto.getRequerVinculoFuncionario() != null ? dto.getRequerVinculoFuncionario() : false);
            return SubcategoriaDTO.fromEntity(repository.save(entity));
        }).orElseThrow(() -> new RuntimeException("Subcategoria não encontrada com ID: " + id));
    }

    public void deleteById(UUID id) {
        repository.deleteById(id);
    }
}
