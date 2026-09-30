package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CompanyContractTemplateDTO;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.CompanyContractTemplate;
import com.z7design.secured_guard.repository.CompanyContractTemplateRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Gerencia os templates (minutas) de contrato com as 14 cláusulas.
 *
 * Fluxo: os 3 modelos oficiais (ARMADA, DESARMADA, PORTARIA) são globais
 * (company_id NULL). Quando uma empresa salva edições em um modelo, é criada
 * uma cópia vinculada à empresa (companyId). A leitura para a empresa devolve
 * a cópia dela se existir; senão, o modelo global.
 *
 * Regra por tipo de empresa:
 * - VIG (Vigilância Patrimonial): modelos ARMADA e DESARMADA
 * - TERC / ADM: modelo PORTARIA
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CompanyContractTemplateService {

    public static final String KEY_ARMADA = "ARMADA";
    public static final String KEY_DESARMADA = "DESARMADA";
    public static final String KEY_PORTARIA = "PORTARIA";

    private final CompanyContractTemplateRepository repository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<CompanyContractTemplateDTO> listForCompany(UUID companyId) {
        List<CompanyContractTemplateDTO> result = new ArrayList<>();
        if (companyId != null) {
            // Templates globais como base
            for (CompanyContractTemplate global : repository
                    .findByCompanyIdIsNullAndActiveTrueOrderByTemplateKeyAsc()) {
                result.add(convertToDTO(global));
            }
            // Override por empresa substitui o global de mesma chave
            for (CompanyContractTemplate own : repository
                    .findByCompanyIdAndActiveTrueOrderByTemplateKeyAsc(companyId)) {
                result.removeIf(dto -> dto.getTemplateKey().equalsIgnoreCase(own.getTemplateKey()));
                result.add(convertToDTO(own));
            }

            // Regra por ramo: VIG usa ARMADA e DESARMADA; TERC e ADM usam PORTARIA
            Company company = companyRepository.findById(companyId).orElse(null);
            if (company != null) {
                boolean isVig = (company.getSigla() != null && "VIG".equalsIgnoreCase(company.getSigla().trim()))
                        || (company.getName() != null && (company.getName().toUpperCase().contains("VIGILANCIA") || company.getName().toUpperCase().contains("VIGILÂNCIA")));
                if (isVig) {
                    result.removeIf(dto -> KEY_PORTARIA.equalsIgnoreCase(dto.getTemplateKey()));
                } else {
                    result.removeIf(dto -> KEY_ARMADA.equalsIgnoreCase(dto.getTemplateKey()) || KEY_DESARMADA.equalsIgnoreCase(dto.getTemplateKey()));
                }
            }

            result.sort(Comparator.comparing(CompanyContractTemplateDTO::getTemplateKey));
            return result;
        }
        return repository.findByCompanyIdIsNullAndActiveTrueOrderByTemplateKeyAsc().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<CompanyContractTemplateDTO> getForCompany(UUID companyId, String templateKey) {
        if (companyId != null) {
            Optional<CompanyContractTemplateDTO> own = repository
                    .findFirstByCompanyIdAndTemplateKeyAndActiveTrueOrderByUpdatedAtDesc(companyId, templateKey)
                    .map(this::convertToDTO);
            if (own.isPresent()) {
                return own;
            }
        }
        return repository
                .findFirstByCompanyIdIsNullAndTemplateKeyAndActiveTrueOrderByUpdatedAtDesc(templateKey)
                .map(this::convertToDTO);
    }

    /**
     * Entity resolvida para geração de PDF: cópia da empresa ou global.
     */
    @Transactional(readOnly = true)
    public Optional<CompanyContractTemplate> resolveEntity(UUID companyId, String templateKey) {
        if (companyId != null) {
            Optional<CompanyContractTemplate> own = repository
                    .findFirstByCompanyIdAndTemplateKeyAndActiveTrueOrderByUpdatedAtDesc(companyId, templateKey);
            if (own.isPresent()) {
                return own;
            }
        }
        return repository
                .findFirstByCompanyIdIsNullAndTemplateKeyAndActiveTrueOrderByUpdatedAtDesc(templateKey);
    }

    /**
     * Salva (cria ou atualiza) o template da empresa. Se a empresa editar um
     * template global, cria uma cópia com o companyId dela preservando o texto.
     */
    public CompanyContractTemplateDTO saveForCompany(UUID companyId, CompanyContractTemplateDTO dto) {
        if (companyId == null) {
            throw new IllegalArgumentException("companyId é obrigatório para salvar o template do contrato");
        }
        String key = dto.getTemplateKey() != null ? dto.getTemplateKey().trim().toUpperCase() : null;
        if (key == null || key.isEmpty()) {
            throw new IllegalArgumentException("templateKey é obrigatório (ARMADA, DESARMADA ou PORTARIA)");
        }

        Company company = companyRepository.findById(companyId).orElse(null);
        if (company != null && !isTemplateAllowedForCompany(company, key)) {
            throw new IllegalArgumentException(String.format("O modelo %s não é aplicável para a empresa %s",
                    key, company.getSigla() != null ? company.getSigla() : company.getName()));
        }

        CompanyContractTemplate entity = repository
                .findFirstByCompanyIdAndTemplateKeyAndActiveTrueOrderByUpdatedAtDesc(companyId, key)
                .orElseGet(() -> CompanyContractTemplate.builder()
                        .companyId(companyId)
                        .templateKey(key)
                        .build());

        entity.setCompanyId(companyId);
        entity.setTemplateKey(key);
        entity.setTitle(dto.getTitle() != null && !dto.getTitle().isBlank()
                ? dto.getTitle()
                : defaultTitle(key));
        entity.setClause1(dto.getClause1());
        entity.setClause2(dto.getClause2());
        entity.setClause3(dto.getClause3());
        entity.setClause4(dto.getClause4());
        entity.setClause5(dto.getClause5());
        entity.setClause6(dto.getClause6());
        entity.setClause7(dto.getClause7());
        entity.setClause8(dto.getClause8());
        entity.setClause9(dto.getClause9());
        entity.setClause10(dto.getClause10());
        entity.setClause11(dto.getClause11());
        entity.setClause12(dto.getClause12());
        entity.setClause13(dto.getClause13());
        entity.setClause14(dto.getClause14());
        entity.setActive(true);

        entity = repository.save(entity);
        log.info("Template de contrato {} salvo para a empresa {}", key, companyId);
        return convertToDTO(entity);
    }

    /**
     * Restaura as cláusulas do template da empresa para o texto oficial global.
     */
    public CompanyContractTemplateDTO resetForCompany(UUID companyId, String templateKey) {
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company != null && !isTemplateAllowedForCompany(company, templateKey)) {
            throw new IllegalArgumentException(String.format("O modelo %s não é aplicável para a empresa %s",
                    templateKey, company.getSigla() != null ? company.getSigla() : company.getName()));
        }

        CompanyContractTemplate global = repository
                .findFirstByCompanyIdIsNullAndTemplateKeyAndActiveTrueOrderByUpdatedAtDesc(templateKey)
                .orElseThrow(() -> new IllegalArgumentException("Modelo global não encontrado: " + templateKey));

        CompanyContractTemplateDTO dto = convertToDTO(global);
        dto.setId(null);
        return saveForCompany(companyId, dto);
    }

    public static boolean isTemplateAllowedForCompany(Company company, String templateKey) {
        if (company == null || templateKey == null) return true;
        boolean isVig = (company.getSigla() != null && "VIG".equalsIgnoreCase(company.getSigla().trim()))
                || (company.getName() != null && (company.getName().toUpperCase().contains("VIGILANCIA") || company.getName().toUpperCase().contains("VIGILÂNCIA")));
        if (isVig) {
            return KEY_ARMADA.equalsIgnoreCase(templateKey) || KEY_DESARMADA.equalsIgnoreCase(templateKey);
        } else {
            return KEY_PORTARIA.equalsIgnoreCase(templateKey);
        }
    }

    public static String defaultTitle(String key) {
        return switch (key) {
            case KEY_ARMADA -> "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE VIGILÂNCIA PATRIMONIAL ARMADA";
            case KEY_DESARMADA -> "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE VIGILÂNCIA PATRIMONIAL DESARMADA";
            case KEY_PORTARIA -> "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PORTARIA E CONTROLE DE ACESSO";
            default -> "CONTRATO DE PRESTAÇÃO DE SERVIÇOS";
        };
    }

    private CompanyContractTemplateDTO convertToDTO(CompanyContractTemplate entity) {
        CompanyContractTemplateDTO dto = new CompanyContractTemplateDTO();
        BeanUtils.copyProperties(entity, dto);
        return dto;
    }
}
