package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CostCenterDTO;
import com.z7design.secured_guard.model.CostCenter;
import com.z7design.secured_guard.repository.CostCenterRepository;
import com.z7design.secured_guard.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CostCenterService {

    private final CostCenterRepository repository;
    private final InvoiceRepository invoiceRepository;

    public Page<CostCenter> list(String name, CostCenter.Status status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        if (name != null && !name.isBlank() && status != null) {
            return repository.findByStatusAndNameContainingIgnoreCase(status, name, pageable);
        } else if (name != null && !name.isBlank()) {
            return repository.findByNameContainingIgnoreCase(name, pageable);
        } else if (status != null) {
            List<CostCenter> items = repository.findByStatus(status);
            return new PageImpl<>(items, pageable, items.size());
        } else {
            return repository.findAll(pageable);
        }
    }

    public CostCenter create(CostCenterDTO dto) {
        repository.findByNameIgnoreCase(dto.getName()).ifPresent(cc -> {
            throw new IllegalArgumentException("Nome de centro de custo já existe");
        });
        CostCenter cc = new CostCenter();
        String code = (dto.getCode() == null || dto.getCode().isBlank()) ? generateNextCode() : dto.getCode();
        cc.setCode(code);
        cc.setName(dto.getName());
        cc.setDescription(dto.getDescription());
        cc.setOwner(dto.getOwner());
        cc.setStatus(dto.getStatus());
        return repository.save(cc);
    }

    private String generateNextCode() {
        // Gera CC001, CC002, ... garantindo unicidade
        long n = repository.count() + 1;
        String code;
        int guard = 0;
        do {
            code = String.format("CC%03d", n);
            n++;
        } while (repository.findByCode(code).isPresent() && guard++ < 10000);
        return code;
    }

    public Optional<CostCenter> findById(UUID id) {
        return repository.findById(id);
    }

    public CostCenter update(UUID id, CostCenterDTO dto) {
        return repository.findById(id).map(existing -> {
            existing.setName(dto.getName());
            existing.setDescription(dto.getDescription());
            existing.setOwner(dto.getOwner());
            existing.setStatus(dto.getStatus());
            return repository.save(existing);
        }).orElseThrow(() -> new IllegalArgumentException("Centro de custo não encontrado"));
    }

    public void delete(UUID id) {
        repository.findById(id).ifPresent(cc -> {
            long vinculos = invoiceRepository.countByCentroCusto(cc.getName());
            if (vinculos > 0) {
                throw new IllegalStateException("Não é possível excluir: existem despesas vinculadas. Inative o centro de custo.");
            }
            repository.deleteById(id);
        });
    }

    public CostCenter toggleStatus(UUID id) {
        return repository.findById(id).map(cc -> {
            cc.setStatus(cc.getStatus() == CostCenter.Status.ACTIVE ? CostCenter.Status.INACTIVE : CostCenter.Status.ACTIVE);
            return repository.save(cc);
        }).orElseThrow(() -> new IllegalArgumentException("Centro de custo não encontrado"));
    }
    
    public List<CostCenter> listActive() {
        return repository.findByStatus(CostCenter.Status.ACTIVE);
    }
}


