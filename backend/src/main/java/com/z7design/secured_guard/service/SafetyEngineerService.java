package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.SafetyEngineerDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.SafetyEngineer;
import com.z7design.secured_guard.model.enums.SstProfessionalType;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.SafetyEngineerRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SafetyEngineerService {
    private final SafetyEngineerRepository safetyEngineerRepository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<SafetyEngineerDTO> getAll() {
        return safetyEngineerRepository.findAllWithCompanies().stream()
                .sorted((a, b) -> {
                    String na = a.getName() != null ? a.getName() : "";
                    String nb = b.getName() != null ? b.getName() : "";
                    return na.compareToIgnoreCase(nb);
                })
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SafetyEngineerDTO> getAllByCompanyId(UUID companyId) {
        log.info("Buscando profissionais de SST para empresa ID: {}", companyId);
        return safetyEngineerRepository.findLinkedToCompany(companyId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SafetyEngineerDTO getById(UUID id) {
        SafetyEngineer engineer = safetyEngineerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional de SST não encontrado com ID: " + id));
        // força carga do N:N
        if (engineer.getCompanies() != null) {
            engineer.getCompanies().size();
        }
        return toDto(engineer);
    }

    public SafetyEngineerDTO create(SafetyEngineerDTO dto) {
        log.info("Criando profissional de SST: {}", dto.getName());
        Set<UUID> companyIds = resolveCompanyIds(dto);
        if (companyIds.isEmpty()) {
            throw new IllegalArgumentException("Selecione ao menos uma empresa.");
        }

        List<Company> companies = loadCompanies(companyIds);
        Company primary = companies.get(0);

        SafetyEngineer engineer = dto.toEntity(primary);
        if (engineer.getProfessionalType() == null) {
            engineer.setProfessionalType(SstProfessionalType.ENGENHEIRO_SEGURANCA);
        }
        if (engineer.getActive() == null) {
            engineer.setActive(true);
        }
        engineer.setCompanies(new HashSet<>(companies));
        engineer = safetyEngineerRepository.save(engineer);

        applyDefaultIfNeeded(engineer, companies, dto.getCompanyDefault());

        log.info("Profissional de SST criado - ID: {}", engineer.getId());
        return toDto(engineer);
    }

    public SafetyEngineerDTO update(UUID id, SafetyEngineerDTO dto) {
        log.info("Atualizando profissional de SST ID: {}", id);
        SafetyEngineer engineer = safetyEngineerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional de SST não encontrado com ID: " + id));

        Set<UUID> companyIds = resolveCompanyIds(dto);
        if (companyIds.isEmpty()) {
            throw new IllegalArgumentException("Selecione ao menos uma empresa.");
        }
        List<Company> companies = loadCompanies(companyIds);
        Company primary = companies.get(0);

        engineer.setName(dto.getName());
        engineer.setCreaNumber(dto.getCreaNumber());
        engineer.setPhone(trimToNull(dto.getPhone()));
        engineer.setEmail(trimToNull(dto.getEmail()));
        if (dto.getProfessionalType() != null) {
            engineer.setProfessionalType(dto.getProfessionalType());
        }
        if (dto.getStampImageUrl() != null) {
            engineer.setStampImageUrl(trimToNull(dto.getStampImageUrl()));
        }
        if (dto.getActive() != null) {
            engineer.setActive(dto.getActive());
        }
        engineer.setNotes(trimToNull(dto.getNotes()));
        engineer.setCompany(primary);
        engineer.getCompanies().clear();
        engineer.getCompanies().addAll(companies);

        engineer = safetyEngineerRepository.save(engineer);

        applyDefaultIfNeeded(engineer, companies, dto.getCompanyDefault());

        return toDto(engineer);
    }

    public void delete(UUID id) {
        log.info("Excluindo profissional de SST ID: {}", id);
        SafetyEngineer engineer = safetyEngineerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional de SST não encontrado com ID: " + id));

        // limpa padrão em todas as empresas vinculadas
        Set<Company> linked = new HashSet<>();
        if (engineer.getCompany() != null) {
            linked.add(engineer.getCompany());
        }
        if (engineer.getCompanies() != null) {
            linked.addAll(engineer.getCompanies());
        }
        for (Company company : linked) {
            if (id.equals(company.getSafetyEngineerId())) {
                company.setSafetyEngineerId(null);
                companyRepository.save(company);
            }
        }

        safetyEngineerRepository.delete(engineer);
    }

    public SafetyEngineerDTO updateStampImageUrl(UUID id, String stampImageUrl) {
        SafetyEngineer engineer = safetyEngineerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional de SST não encontrado com ID: " + id));
        engineer.setStampImageUrl(trimToNull(stampImageUrl));
        engineer = safetyEngineerRepository.save(engineer);
        return toDto(engineer);
    }

    public SafetyEngineerDTO setAsCompanyDefault(UUID id) {
        SafetyEngineer engineer = safetyEngineerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional de SST não encontrado com ID: " + id));
        if (engineer.getCompanies() != null) {
            engineer.getCompanies().size();
        }
        Set<Company> targets = new HashSet<>();
        if (engineer.getCompany() != null) {
            targets.add(engineer.getCompany());
        }
        if (engineer.getCompanies() != null) {
            targets.addAll(engineer.getCompanies());
        }
        for (Company company : targets) {
            company.setSafetyEngineerId(engineer.getId());
            companyRepository.save(company);
        }
        return toDto(engineer);
    }

    private void applyDefaultIfNeeded(SafetyEngineer engineer, List<Company> companies, Boolean companyDefault) {
        for (Company company : companies) {
            if (Boolean.TRUE.equals(companyDefault) || company.getSafetyEngineerId() == null) {
                company.setSafetyEngineerId(engineer.getId());
                companyRepository.save(company);
            }
        }
    }

    private Set<UUID> resolveCompanyIds(SafetyEngineerDTO dto) {
        LinkedHashSet<UUID> ids = new LinkedHashSet<>();
        if (dto.getCompanyIds() != null) {
            dto.getCompanyIds().stream().filter(Objects::nonNull).forEach(ids::add);
        }
        if (ids.isEmpty() && dto.getCompanyId() != null) {
            ids.add(dto.getCompanyId());
        }
        return ids;
    }

    private List<Company> loadCompanies(Set<UUID> companyIds) {
        List<Company> companies = companyRepository.findAllById(companyIds);
        if (companies.size() != companyIds.size()) {
            throw new ResourceNotFoundException("Uma ou mais empresas selecionadas não foram encontradas.");
        }
        // preserva ordem dos IDs enviados (primeiro = principal)
        return companyIds.stream()
                .map(id -> companies.stream().filter(c -> c.getId().equals(id)).findFirst().orElseThrow())
                .collect(Collectors.toList());
    }

    private SafetyEngineerDTO toDto(SafetyEngineer engineer) {
        UUID defaultId = engineer.getCompany() != null ? engineer.getCompany().getSafetyEngineerId() : null;
        if (defaultId == null && engineer.getCompanies() != null) {
            defaultId = engineer.getCompanies().stream()
                    .map(Company::getSafetyEngineerId)
                    .filter(id -> engineer.getId() != null && engineer.getId().equals(id))
                    .findFirst()
                    .orElse(null);
        }
        return SafetyEngineerDTO.fromEntity(engineer, defaultId);
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
