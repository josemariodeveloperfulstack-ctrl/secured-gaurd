package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CompanyConfigDTO;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.CompanyConfig;
import com.z7design.secured_guard.repository.CompanyConfigRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyConfigService {

    private final CompanyConfigRepository companyConfigRepository;
    private final CompanyRepository companyRepository;
    private final Validator validator;

    /**
     * Busca a configuração ativa da empresa
     */
    public Optional<CompanyConfigDTO> getActiveConfig() {
        log.info("Buscando configuração ativa da empresa");
        return companyConfigRepository.findFirstByActiveTrueOrderByCreatedAtDesc()
                .map(this::convertToDTO);
    }

    /**
     * Lista todas as configurações de empresa
     */
    public List<CompanyConfigDTO> getAllConfigs() {
        log.info("Listando todas as configurações de empresa");
        return companyConfigRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Verifica se existe configuração ativa
     */
    public boolean hasActiveConfig() {
        return companyConfigRepository.existsActiveConfig();
    }

    /**
     * Salva ou atualiza configuração da empresa
     */
    public CompanyConfigDTO saveConfig(CompanyConfigDTO configDTO) {
        log.info("Salvando configuração da empresa: {}", configDTO.getName());
        normalizeConfigFields(configDTO);

        // Se companyId informado, buscar dados da empresa na tabela companies
        if (configDTO.getCompanyId() != null) {
            Company company = companyRepository.findById(configDTO.getCompanyId())
                    .orElseThrow(() -> new RuntimeException("Empresa não encontrada com ID: " + configDTO.getCompanyId()));
            configDTO.setName(company.getName() != null && !company.getName().isEmpty() ? company.getName() : nonBlank(configDTO.getName()) ? configDTO.getName() : "Empresa");
            configDTO.setCnpj(nonBlank(company.getCnpj()) ? company.getCnpj() : nonBlank(configDTO.getCnpj()) ? configDTO.getCnpj() : "00.000.000/0001-00");
            String fullAddress = CompanyDataFormatter.formatFullAddress(company);
            configDTO.setAddress(nonBlank(fullAddress) ? fullAddress : nonBlank(configDTO.getAddress()) ? configDTO.getAddress() : "-");
            configDTO.setCity(nonBlank(company.getCity()) ? company.getCity() : nonBlank(configDTO.getCity()) ? configDTO.getCity() : "-");
            configDTO.setState(nonBlank(company.getState()) ? company.getState() : nonBlank(configDTO.getState()) ? configDTO.getState() : "SP");
            configDTO.setZipCode(nonBlank(company.getZipCode()) ? company.getZipCode() : nonBlank(configDTO.getZipCode()) ? configDTO.getZipCode() : "00000-000");
            configDTO.setPhone(nonBlank(company.getPhone()) ? company.getPhone() : nonBlank(configDTO.getPhone()) ? configDTO.getPhone() : "-");
            configDTO.setEmail(nonBlank(company.getEmail()) ? company.getEmail() : nonBlank(configDTO.getEmail()) ? configDTO.getEmail() : "contato@empresa.com");
            configDTO.setWebsite(company.getWebsite() != null ? company.getWebsite() : configDTO.getWebsite());
            if (configDTO.getLogoUrl() == null && company.getLogoUrl() != null) {
                configDTO.setLogoUrl(company.getLogoUrl());
            }
        }

        validateConfig(configDTO);

        // Verificar se CNPJ já existe para outra empresa
        if (configDTO.getId() != null) {
            if (companyConfigRepository.existsByCnpjAndIdNotAndActiveTrue(
                    configDTO.getCnpj(), configDTO.getId())) {
                throw new RuntimeException("CNPJ já cadastrado para outra empresa");
            }
        } else {
            if (companyConfigRepository.findByCnpjAndActiveTrue(configDTO.getCnpj()).isPresent()) {
                throw new RuntimeException("CNPJ já cadastrado");
            }
        }

        CompanyConfig config;
        
        if (configDTO.getId() != null) {
            // Atualizar configuração existente
            config = companyConfigRepository.findFirstByIdOrderByCreatedAtDesc(configDTO.getId())
                    .orElseThrow(() -> new RuntimeException("Configuração não encontrada"));
            
            // Desativar todas as outras configurações
            deactivateAllConfigs();
            
            // Atualizar campos
            updateConfigFromDTO(config, configDTO);
        } else {
            // Criar nova configuração
            // Desativar todas as configurações existentes
            deactivateAllConfigs();
            
            config = new CompanyConfig();
            updateConfigFromDTO(config, configDTO);
            config.setActive(true);
        }

        config = companyConfigRepository.save(config);
        log.info("Configuração da empresa salva com ID: {}", config.getId());
        
        return convertToDTO(config);
    }

    /**
     * Busca configuração por ID
     */
    public Optional<CompanyConfigDTO> getConfigById(UUID id) {
        return companyConfigRepository.findFirstByIdOrderByCreatedAtDesc(id)
                .map(this::convertToDTO);
    }

    /**
     * Desativa uma configuração
     */
    public void deactivateConfig(UUID id) {
        log.info("Desativando configuração: {}", id);
        companyConfigRepository.findFirstByIdOrderByCreatedAtDesc(id)
                .ifPresent(config -> {
                    config.setActive(false);
                    companyConfigRepository.save(config);
                });
    }

    /**
     * Desativa todas as configurações
     */
    private void deactivateAllConfigs() {
        companyConfigRepository.findAll()
                .forEach(config -> {
                    config.setActive(false);
                    companyConfigRepository.save(config);
                });
    }

    /**
     * Atualiza entidade com dados do DTO
     */
    private void updateConfigFromDTO(CompanyConfig config, CompanyConfigDTO dto) {
        config.setCompanyId(dto.getCompanyId());
        config.setName(dto.getName());
        config.setCnpj(dto.getCnpj());
        config.setAddress(dto.getAddress());
        config.setCity(dto.getCity());
        config.setState(dto.getState());
        config.setZipCode(dto.getZipCode());
        config.setPhone(dto.getPhone());
        config.setEmail(dto.getEmail());
        config.setWebsite(dto.getWebsite());
        config.setLogoUrl(dto.getLogoUrl());
        config.setHeaderText(dto.getHeaderText());
        config.setFooterText(dto.getFooterText());
        config.setContractTerms(dto.getContractTerms());
        config.setActive(true);
    }

    private static boolean nonBlank(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private void normalizeConfigFields(CompanyConfigDTO configDTO) {
        if (configDTO.getState() != null) {
            String state = configDTO.getState().trim().toUpperCase();
            configDTO.setState(state.length() >= 2 ? state.substring(0, 2) : state);
        }
        if (configDTO.getZipCode() != null) {
            configDTO.setZipCode(configDTO.getZipCode().trim());
        }
        if (configDTO.getCnpj() != null) {
            configDTO.setCnpj(configDTO.getCnpj().trim());
        }
    }

    private void validateConfig(CompanyConfigDTO configDTO) {
        Set<ConstraintViolation<CompanyConfigDTO>> violations = validator.validate(configDTO);
        if (violations.isEmpty()) {
            return;
        }
        String message = violations.stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .collect(Collectors.joining("; "));
        throw new IllegalArgumentException(message);
    }

    /**
     * Converte entidade para DTO
     */
    private CompanyConfigDTO convertToDTO(CompanyConfig config) {
        CompanyConfigDTO dto = new CompanyConfigDTO();
        BeanUtils.copyProperties(config, dto);
        return dto;
    }
}
