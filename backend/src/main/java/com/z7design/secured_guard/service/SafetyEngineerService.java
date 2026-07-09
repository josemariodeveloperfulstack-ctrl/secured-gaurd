package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.SafetyEngineerDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.SafetyEngineer;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.SafetyEngineerRepository;

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
public class SafetyEngineerService {
    private final SafetyEngineerRepository safetyEngineerRepository;
    private final CompanyRepository companyRepository;

    public List<SafetyEngineerDTO> getAllByCompanyId(UUID companyId) {
        log.info("Buscando engenheiros de segurança para empresa ID: {}", companyId);
        return safetyEngineerRepository.findByCompanyIdOrderByNameAsc(companyId)
                .stream()
                .map(SafetyEngineerDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public SafetyEngineerDTO getById(UUID id) {
        log.info("Buscando engenheiro de segurança por ID: {}", id);
        SafetyEngineer engineer = safetyEngineerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Engenheiro de segurança não encontrado com ID: " + id));
        return SafetyEngineerDTO.fromEntity(engineer);
    }

    public SafetyEngineerDTO create(SafetyEngineerDTO dto) {
        log.info("Criando engenheiro de segurança: {}", dto.getName());
        Company company = companyRepository.findById(dto.getCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + dto.getCompanyId()));

        SafetyEngineer engineer = dto.toEntity(company);
        engineer = safetyEngineerRepository.save(engineer);

        log.info("Engenheiro de segurança criado com sucesso - ID: {}", engineer.getId());
        return SafetyEngineerDTO.fromEntity(engineer);
    }

    public SafetyEngineerDTO update(UUID id, SafetyEngineerDTO dto) {
        log.info("Atualizando engenheiro de segurança ID: {}", id);
        SafetyEngineer engineer = safetyEngineerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Engenheiro de segurança não encontrado com ID: " + id));

        Company company = engineer.getCompany();
        if (dto.getCompanyId() != null && !dto.getCompanyId().equals(company.getId())) {
            company = companyRepository.findById(dto.getCompanyId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + dto.getCompanyId()));
        }

        engineer.setName(dto.getName());
        engineer.setCreaNumber(dto.getCreaNumber());
        if (dto.getStampImageUrl() != null) {
            engineer.setStampImageUrl(dto.getStampImageUrl());
        }
        engineer.setCompany(company);

        engineer = safetyEngineerRepository.save(engineer);
        log.info("Engenheiro de segurança atualizado com sucesso - ID: {}", engineer.getId());
        return SafetyEngineerDTO.fromEntity(engineer);
    }

    public void delete(UUID id) {
        log.info("Excluindo engenheiro de segurança ID: {}", id);
        if (!safetyEngineerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Engenheiro de segurança não encontrado com ID: " + id);
        }
        safetyEngineerRepository.deleteById(id);
        log.info("Engenheiro de segurança excluído com sucesso - ID: {}", id);
    }

    public SafetyEngineerDTO updateStampImageUrl(UUID id, String stampImageUrl) {
        log.info("Atualizando URL do carimbo para engenheiro ID: {}", id);
        SafetyEngineer engineer = safetyEngineerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Engenheiro de segurança não encontrado com ID: " + id));
        engineer.setStampImageUrl(stampImageUrl);
        engineer = safetyEngineerRepository.save(engineer);
        return SafetyEngineerDTO.fromEntity(engineer);
    }
}
