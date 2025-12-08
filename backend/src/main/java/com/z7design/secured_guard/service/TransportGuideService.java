package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.TransportGuideDTO;
import com.z7design.secured_guard.model.TransportGuide;
import com.z7design.secured_guard.model.enums.TransportGuideStatus;
import com.z7design.secured_guard.repository.TransportGuideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransportGuideService {

    private final TransportGuideRepository transportGuideRepository;
    private static final String UPLOAD_DIR = "uploads/transport-guides/";

    @Transactional(readOnly = true)
    public List<TransportGuideDTO> getAllTransportGuides() {
        log.info("Buscando todas as guias de transporte");
        return transportGuideRepository.findAll().stream()
                .map(TransportGuideDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TransportGuideDTO getTransportGuideById(Long id) {
        log.info("Buscando guia de transporte por ID: {}", id);
        TransportGuide guide = transportGuideRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Guia de transporte não encontrada"));
        return new TransportGuideDTO(guide);
    }

    @Transactional
    public TransportGuideDTO createTransportGuide(TransportGuideDTO dto, MultipartFile arquivo, String username) {
        log.info("Criando nova guia de transporte para empresa: {}", dto.getEmpresa());
        
        TransportGuide entity = dto.toEntity();
        entity.setCreatedBy(username);
        entity.setStatus(TransportGuideStatus.DRAFT);
        
        if (arquivo != null && !arquivo.isEmpty()) {
            String filePath = saveFile(arquivo);
            entity.setArquivoGuiaPath(filePath);
        }
        
        TransportGuide saved = transportGuideRepository.save(entity);
        log.info("✅ Guia de transporte criada com ID: {}", saved.getId());
        return new TransportGuideDTO(saved);
    }

    @Transactional
    public TransportGuideDTO updateTransportGuide(Long id, TransportGuideDTO dto, MultipartFile arquivo) {
        log.info("Atualizando guia de transporte ID: {}", id);
        TransportGuide existing = transportGuideRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Guia de transporte não encontrada"));

        existing.setCnpj(dto.getCnpj());
        existing.setEmpresa(dto.getEmpresa());
        existing.setNumeroColete(dto.getNumeroColete());
        existing.setNumeroArma(dto.getNumeroArma());
        existing.setCalibre(dto.getCalibre());
        existing.setQtdMunicoes(dto.getQtdMunicoes());
        existing.setOrigem(dto.getOrigem());
        existing.setDestino(dto.getDestino());
        existing.setTrajeto(dto.getTrajeto());
        existing.setMotivo(dto.getMotivo());
        
        if (dto.getStatus() != null) {
            existing.setStatus(dto.getStatus());
        }
        
        if (arquivo != null && !arquivo.isEmpty()) {
            // Deletar arquivo antigo se existir
            if (existing.getArquivoGuiaPath() != null) {
                deleteFile(existing.getArquivoGuiaPath());
            }
            String filePath = saveFile(arquivo);
            existing.setArquivoGuiaPath(filePath);
        }
        
        TransportGuide updated = transportGuideRepository.save(existing);
        log.info("✅ Guia de transporte ID {} atualizada com sucesso", id);
        return new TransportGuideDTO(updated);
    }

    @Transactional
    public void deleteTransportGuide(Long id) {
        log.info("Excluindo guia de transporte ID: {}", id);
        TransportGuide guide = transportGuideRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Guia de transporte não encontrada"));
        
        // Deletar arquivo associado se existir
        if (guide.getArquivoGuiaPath() != null) {
            deleteFile(guide.getArquivoGuiaPath());
        }
        
        transportGuideRepository.deleteById(id);
        log.info("✅ Guia de transporte ID {} excluída com sucesso", id);
    }

    @Transactional
    public TransportGuideDTO approveTransportGuide(Long id, String supervisorId) {
        log.info("Aprovando guia de transporte ID: {} por supervisor: {}", id, supervisorId);
        TransportGuide guide = transportGuideRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Guia de transporte não encontrada"));
        
        guide.setStatus(TransportGuideStatus.APPROVED);
        guide.setApprovedBy(supervisorId);
        guide.setApprovedAt(LocalDateTime.now());
        
        TransportGuide approved = transportGuideRepository.save(guide);
        log.info("✅ Guia de transporte ID {} aprovada com sucesso", id);
        return new TransportGuideDTO(approved);
    }

    @Transactional
    public TransportGuideDTO rejectTransportGuide(Long id, String supervisorId, String reason) {
        log.info("Rejeitando guia de transporte ID: {} por supervisor: {}", id, supervisorId);
        TransportGuide guide = transportGuideRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Guia de transporte não encontrada"));
        
        guide.setStatus(TransportGuideStatus.REJECTED);
        guide.setRejectedBy(supervisorId);
        guide.setRejectedAt(LocalDateTime.now());
        guide.setRejectionReason(reason);
        
        TransportGuide rejected = transportGuideRepository.save(guide);
        log.info("✅ Guia de transporte ID {} rejeitada com sucesso", id);
        return new TransportGuideDTO(rejected);
    }

    @Transactional(readOnly = true)
    public List<TransportGuideDTO> getTransportGuidesByFilters(TransportGuideStatus status, String empresa, String cnpj) {
        log.info("Buscando guias com filtros - Status: {}, Empresa: {}, CNPJ: {}", status, empresa, cnpj);
        
        List<TransportGuide> guides;
        
        if (status != null) {
            guides = transportGuideRepository.findByStatus(status);
        } else if (empresa != null) {
            guides = transportGuideRepository.findByEmpresa(empresa);
        } else if (cnpj != null) {
            guides = transportGuideRepository.findByCnpj(cnpj);
        } else {
            guides = transportGuideRepository.findAll();
        }
        
        return guides.stream()
                .map(TransportGuideDTO::new)
                .collect(Collectors.toList());
    }

    private String saveFile(MultipartFile file) {
        try {
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path filePath = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            log.info("✅ Arquivo salvo: {}", filePath.toString());
            return filePath.toString();
        } catch (IOException e) {
            log.error("❌ Erro ao salvar arquivo", e);
            throw new RuntimeException("Erro ao salvar arquivo", e);
        }
    }

    private void deleteFile(String filePath) {
        try {
            Path path = Paths.get(filePath);
            if (Files.exists(path)) {
                Files.delete(path);
                log.info("✅ Arquivo deletado: {}", filePath);
            }
        } catch (IOException e) {
            log.warn("⚠️ Erro ao deletar arquivo: {}", filePath, e);
        }
    }
}







