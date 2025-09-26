package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CompanyDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.repository.CompanyRepository;

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
    
    /**
     * Buscar todas as empresas
     */
    public List<CompanyDTO> getAllCompanies() {
        log.info("Buscando todas as empresas");
        return companyRepository.findAllByOrderByNameAsc().stream()
                .map(CompanyDTO::fromEntity)
                .collect(Collectors.toList());
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
        Company company = companyRepository.findById(id)
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
        log.info("Empresa criada com sucesso - ID: {}", company.getId());
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
        existingCompany.setPhone(dto.getPhone());
        existingCompany.setEmail(dto.getEmail());
        existingCompany.setWebsite(dto.getWebsite());
        existingCompany.setStatus(dto.getStatus());
        
        existingCompany = companyRepository.save(existingCompany);
        log.info("Empresa atualizada com sucesso - ID: {}", existingCompany.getId());
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