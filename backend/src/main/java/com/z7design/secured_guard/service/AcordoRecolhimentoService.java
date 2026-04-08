package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.AcordoRecolhimento;
import com.z7design.secured_guard.model.AcordoRecolhimentoItem;
import com.z7design.secured_guard.repository.AcordoRecolhimentoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AcordoRecolhimentoService {

    private final AcordoRecolhimentoRepository repository;

    @Transactional(readOnly = true)
    public List<AcordoRecolhimento> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public AcordoRecolhimento findById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Acordo de Recolhimento não encontrado: " + id));
    }

    @Transactional
    public AcordoRecolhimento create(AcordoRecolhimento acordo) {
        acordo.setNumeroAcordo(generateNumeroAcordo());
        acordo.setStatus("PENDENTE");
        
        // Vincular itens ao acordo
        if (acordo.getItens() != null) {
            acordo.getItens().forEach(item -> item.setAcordo(acordo));
        }
        
        return repository.save(acordo);
    }

    @Transactional
    public AcordoRecolhimento update(UUID id, AcordoRecolhimento acordoDetails) {
        AcordoRecolhimento acordo = findById(id);
        
        acordo.setMotivo(acordoDetails.getMotivo());
        acordo.setDataAcordo(acordoDetails.getDataAcordo());
        acordo.setObservacoes(acordoDetails.getObservacoes());
        acordo.setFornecedorId(acordoDetails.getFornecedorId());
        acordo.setFornecedorNome(acordoDetails.getFornecedorNome());
        acordo.setFornecedorCnpj(acordoDetails.getFornecedorCnpj());
        
        // Atualizar itens
        acordo.getItens().clear();
        if (acordoDetails.getItens() != null) {
            acordoDetails.getItens().forEach(item -> {
                item.setAcordo(acordo);
                acordo.getItens().add(item);
            });
        }
        
        return repository.save(acordo);
    }

    @Transactional
    public void delete(UUID id) {
        repository.deleteById(id);
    }

    @Transactional
    public AcordoRecolhimento approve(UUID id, UUID approvedBy) {
        AcordoRecolhimento acordo = findById(id);
        acordo.setStatus("APROVADO");
        acordo.setApprovedById(approvedBy);
        acordo.setApprovedAt(LocalDateTime.now());
        return repository.save(acordo);
    }

    @Transactional
    public AcordoRecolhimento reject(UUID id, UUID rejectedBy) {
        AcordoRecolhimento acordo = findById(id);
        acordo.setStatus("REJEITADO");
        // Nota: Poderíamos adicionar campos rejectedBy e rejectedAt se necessário
        return repository.save(acordo);
    }

    private String generateNumeroAcordo() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = repository.count() + 1;
        String numero = "REC-" + datePart + "-" + String.format("%04d", count);
        
        // Garantir unicidade
        while (repository.existsByNumeroAcordo(numero)) {
            count++;
            numero = "REC-" + datePart + "-" + String.format("%04d", count);
        }
        
        return numero;
    }
}
