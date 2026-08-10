package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CompanyDTO;
import com.z7design.secured_guard.dto.CompanyDefaultEPIDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.CompanyDefaultEPI;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.CompanyDefaultEPIRepository;

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
public class CompanyService {
    
    private final CompanyRepository companyRepository;
    private final CompanyDefaultEPIRepository companyDefaultEPIRepository;
    
    /**
     * Buscar todas as empresas
     */
    public List<CompanyDTO> getAllCompanies() {
        try {
            log.info("Buscando todas as empresas");
            List<Company> companies = companyRepository.findAllByOrderByNameAsc();
            if (companies.isEmpty()) {
                companies = companyRepository.findAllWithDefaultEpis();
            }
            log.info("Encontradas {} empresas", companies.size());
            
            if (companies.isEmpty()) {
                log.warn("Nenhuma empresa encontrada no banco de dados. Criando empresas padrão do grupo...");
                seedDefaultCompanies();
                companies = companyRepository.findAllByOrderByNameAsc();
            }
            
            return companies.stream()
                .map(comp -> {
                    try {
                        return CompanyDTO.fromEntity(comp);
                    } catch (Exception e) {
                        log.error("Erro ao converter empresa {}: {}", comp.getName(), e.getMessage());
                        return null;
                    }
                })
                .filter(dto -> dto != null)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Erro ao buscar empresas: {}", e.getMessage(), e);
            log.warn("Retornando lista vazia devido ao erro");
            return java.util.Collections.emptyList();
        }
    }

    private void seedDefaultCompanies() {
        try {
            Company terc = new Company();
            terc.setName("PROMOVER TERCEIRIZAÇÃO & SERVIÇOS LTDA");
            terc.setSigla("TERC");
            terc.setCnpj("12.345.678/0001-90");
            terc.setStatus(CompanyStatus.ACTIVE);
            companyRepository.save(terc);

            Company vig = new Company();
            vig.setName("PROMOVER VIGILÂNCIA PATRIMONIAL LTDA");
            vig.setSigla("VIG");
            vig.setCnpj("98.765.432/0001-10");
            vig.setStatus(CompanyStatus.ACTIVE);
            companyRepository.save(vig);

            Company adm = new Company();
            adm.setName("PROMOVER ADMINISTRAÇÃO & GESTÃO LTDA");
            adm.setSigla("ADM");
            adm.setCnpj("45.678.901/0001-23");
            adm.setStatus(CompanyStatus.ACTIVE);
            companyRepository.save(adm);
            
            log.info("Empresas padrão criadas com sucesso no banco de dados (TERC, VIG, ADM)");
        } catch (Exception e) {
            log.error("Erro ao criar empresas padrão: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Buscar empresas com filtro dinâmico
     */
    public List<CompanyDTO> searchCompanies(String query) {
        log.info("Buscando empresas com query: {}", query);
        List<Company> companies;
        
        if (query == null || query.trim().isEmpty()) {
            companies = companyRepository.findAllByOrderByNameAsc();
        } else {
            companies = companyRepository.searchCompanies(query.trim());
        }
        
        return companies.stream()
                .map(CompanyDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    /**
     * Buscar empresa por ID
     */
    public CompanyDTO getCompanyById(UUID id) {
        log.info("Buscando empresa por ID: {}", id);
        Company company = companyRepository.findByIdWithDefaultEpis(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + id));
        return CompanyDTO.fromEntity(company);
    }
    
    /**
     * Buscar empresa por sigla
     */
    public CompanyDTO getCompanyBySigla(String sigla) {
        log.info("Buscando empresa por sigla: {}", sigla);
        Company company = companyRepository.findBySigla(sigla)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com sigla: " + sigla));
        return CompanyDTO.fromEntity(company);
    }
    
    /**
     * Criar nova empresa
     */
    public CompanyDTO createCompany(CompanyDTO dto) {
        log.info("Criando nova empresa: {}", dto.getName());
        
        // Validar sigla única
        if (companyRepository.existsBySigla(dto.getSigla())) {
            throw new BusinessException("Já existe uma empresa com a sigla: " + dto.getSigla());
        }
        
        // Validar CNPJ único (se fornecido)
        if (dto.getCnpj() != null && !dto.getCnpj().trim().isEmpty()) {
            if (companyRepository.existsByCnpj(dto.getCnpj())) {
                throw new BusinessException("Já existe uma empresa com o CNPJ: " + dto.getCnpj());
            }
        }
        
        Company company = dto.toEntity();
        company.setStatus(dto.getStatus() != null ? dto.getStatus() : CompanyStatus.ACTIVE);
        
        company = companyRepository.save(company);
        
        // Adicionar EPIs padrão se fornecidos
        if (dto.getDefaultEpis() != null && !dto.getDefaultEpis().isEmpty()) {
            for (int i = 0; i < dto.getDefaultEpis().size(); i++) {
                CompanyDefaultEPIDTO epiDto = dto.getDefaultEpis().get(i);
                CompanyDefaultEPI epi = epiDto.toEntity();
                epi.setCompany(company);
                epi.setOrderIndex(i);
                companyDefaultEPIRepository.save(epi);
            }
            log.info("EPIs padrão adicionados para empresa ID: {}", company.getId());
        }
        
        log.info("Empresa criada com sucesso - ID: {}", company.getId());
        
        // Recarregar empresa com EPIs
        company = companyRepository.findById(company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        
        return CompanyDTO.fromEntity(company);
    }
    
    /**
     * Atualizar empresa
     */
    public CompanyDTO updateCompany(UUID id, CompanyDTO dto) {
        log.info("Atualizando empresa ID: {}", id);
        
        Company existingCompany = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + id));
        
        // Validar sigla única (exceto para a própria empresa)
        if (!existingCompany.getSigla().equals(dto.getSigla()) && 
            companyRepository.existsBySigla(dto.getSigla())) {
            throw new BusinessException("Já existe uma empresa com a sigla: " + dto.getSigla());
        }
        
        // Validar CNPJ único (se fornecido)
        if (dto.getCnpj() != null && !dto.getCnpj().trim().isEmpty()) {
            if (!existingCompany.getCnpj().equals(dto.getCnpj()) && 
                companyRepository.existsByCnpj(dto.getCnpj())) {
                throw new BusinessException("Já existe uma empresa com o CNPJ: " + dto.getCnpj());
            }
        }
        
        // Atualizar campos
        existingCompany.setName(dto.getName());
        existingCompany.setSigla(dto.getSigla());
        existingCompany.setDescription(dto.getDescription());
        existingCompany.setCnpj(dto.getCnpj());
        existingCompany.setAddress(dto.getAddress());
        existingCompany.setEnderecoRua(dto.getEnderecoRua());
        existingCompany.setEnderecoNumero(dto.getEnderecoNumero());
        existingCompany.setEnderecoComplemento(dto.getEnderecoComplemento());
        existingCompany.setEnderecoBairro(dto.getEnderecoBairro());
        existingCompany.setCity(dto.getCity());
        existingCompany.setState(dto.getState());
        existingCompany.setZipCode(dto.getZipCode());
        existingCompany.setPhone(dto.getPhone());
        existingCompany.setEmail(dto.getEmail());
        existingCompany.setWebsite(dto.getWebsite());
        existingCompany.setLogoUrl(dto.getLogoUrl());
        existingCompany.setStatus(dto.getStatus());
        
        existingCompany = companyRepository.save(existingCompany);
        
        // Atualizar EPIs padrão
        if (dto.getDefaultEpis() != null) {
            // Remover EPIs existentes
            companyDefaultEPIRepository.deleteByCompanyId(existingCompany.getId());
            
            // Adicionar novos EPIs
            for (int i = 0; i < dto.getDefaultEpis().size(); i++) {
                CompanyDefaultEPIDTO epiDto = dto.getDefaultEpis().get(i);
                CompanyDefaultEPI epi = epiDto.toEntity();
                epi.setCompany(existingCompany);
                epi.setOrderIndex(i);
                companyDefaultEPIRepository.save(epi);
            }
            log.info("EPIs padrão atualizados para empresa ID: {}", existingCompany.getId());
        }
        
        log.info("Empresa atualizada com sucesso - ID: {}", existingCompany.getId());
        
        // Recarregar empresa com EPIs
        existingCompany = companyRepository.findById(existingCompany.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        
        return CompanyDTO.fromEntity(existingCompany);
    }
    
    /**
     * Excluir empresa
     */
    public void deleteCompany(UUID id) {
        log.info("Excluindo empresa ID: {}", id);
        
        if (!companyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Empresa não encontrada com ID: " + id);
        }
        
        // Verificar se há funcionários associados
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada com ID: " + id));
        
        if (company.getEmployees() != null && !company.getEmployees().isEmpty()) {
            throw new BusinessException("Não é possível excluir a empresa pois há funcionários associados a ela");
        }
        
        companyRepository.deleteById(id);
        log.info("Empresa excluída com sucesso - ID: {}", id);
    }
    
    /**
     * Buscar empresas ativas
     */
    public List<CompanyDTO> getActiveCompanies() {
        log.info("Buscando empresas ativas");
        return companyRepository.findByStatusOrderByNameAsc(CompanyStatus.ACTIVE).stream()
                .map(CompanyDTO::fromEntity)
                .collect(Collectors.toList());
    }
}