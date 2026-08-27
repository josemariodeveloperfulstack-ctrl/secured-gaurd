package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CidSuggestionDTO;
import com.z7design.secured_guard.dto.MedicalDocumentDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.model.enums.MedicalDocumentType;
import com.z7design.secured_guard.repository.MedicalDocumentHistoryRepository;
import com.z7design.secured_guard.repository.MedicalDocumentRepository;
import com.z7design.secured_guard.repository.MedicalDocumentSpecs;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Gestão de atestados/declarações com cálculo de períodos e alerta INSS.
 * Regra (Dec. 3.048/99 art. 75): afastamentos pela mesma causa/CID intercalados
 * em até 60 dias se somam; empresa paga até 15 dias, a partir do 16º → INSS.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MedicalDocumentService {

    private static final int INSS_EMPLOYER_DAYS = 15;
    private static final int INSS_RECURRENCE_WINDOW_DAYS = 60;

    private final MedicalDocumentRepository medicalDocumentRepository;
    private final CidLookupService cidLookupService;
    private final MedicalDocumentHistoryRepository historyRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    @Transactional
    public MedicalDocumentDTO create(MedicalDocumentDTO dto, UUID createdByUserId) {
        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado"));

        MedicalDocument doc = MedicalDocument.builder()
                .employee(employee)
                .company(resolveCompany(dto.getCompanyId(), employee))
                .documentType(requireType(dto.getDocumentType()))
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .days(dto.getDays())
                .hours(dto.getHours())
                .cidCode(normalizeCid(dto.getCidCode()))
                .cidDescription(trimToNull(dto.getCidDescription()))
                .specialty(trimToNull(dto.getSpecialty()))
                .crm(trimToNull(dto.getCrm()))
                .doctorName(trimToNull(dto.getDoctorName()))
                .documentUrl(trimToNull(dto.getDocumentUrl()))
                .observations(trimToNull(dto.getObservations()))
                .status("ACTIVE")
                .createdBy(createdByUserId != null ? userRepository.findById(createdByUserId).orElse(null) : null)
                .build();

        applyPeriodCalculations(doc);
        applyInssRules(doc, null);
        MedicalDocument saved = medicalDocumentRepository.save(doc);
        recordHistory(saved, "CRIAÇÃO", "Documento médico cadastrado", createdByUserId);
        return MedicalDocumentDTO.fromEntity(saved);
    }

    @Transactional
    public MedicalDocumentDTO update(UUID id, MedicalDocumentDTO dto, UUID userId) {
        MedicalDocument doc = medicalDocumentRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documento médico não encontrado"));

        if (dto.getEmployeeId() != null && !dto.getEmployeeId().equals(doc.getEmployee().getId())) {
            Employee employee = employeeRepository.findById(dto.getEmployeeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado"));
            doc.setEmployee(employee);
        }
        if (dto.getDocumentType() != null) {
            doc.setDocumentType(dto.getDocumentType());
        }
        doc.setCompany(resolveCompany(dto.getCompanyId(), doc.getEmployee()));
        doc.setStartDate(dto.getStartDate() != null ? dto.getStartDate() : doc.getStartDate());
        doc.setEndDate(dto.getEndDate());
        doc.setDays(dto.getDays());
        doc.setHours(dto.getHours());
        doc.setCidCode(normalizeCid(dto.getCidCode()));
        doc.setCidDescription(trimToNull(dto.getCidDescription()));
        doc.setSpecialty(trimToNull(dto.getSpecialty()));
        doc.setCrm(trimToNull(dto.getCrm()));
        doc.setDoctorName(trimToNull(dto.getDoctorName()));
        if (dto.getDocumentUrl() != null) {
            doc.setDocumentUrl(trimToNull(dto.getDocumentUrl()));
        }
        doc.setObservations(trimToNull(dto.getObservations()));

        applyPeriodCalculations(doc);
        applyInssRules(doc, doc.getId());
        MedicalDocument saved = medicalDocumentRepository.save(doc);
        recordHistory(saved, "ATUALIZAÇÃO", "Documento médico atualizado", userId);
        return MedicalDocumentDTO.fromEntity(saved);
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        MedicalDocument doc = medicalDocumentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Documento médico não encontrado"));
        doc.setStatus("CANCELLED");
        medicalDocumentRepository.save(doc);
        recordHistory(doc, "CANCELAMENTO", "Documento cancelado", userId);
    }

    @Transactional(readOnly = true)
    public MedicalDocumentDTO findById(UUID id) {
        return medicalDocumentRepository.findByIdWithDetails(id)
                .map(MedicalDocumentDTO::fromEntity)
                .orElseThrow(() -> new ResourceNotFoundException("Documento médico não encontrado"));
    }

    @Transactional(readOnly = true)
    public Page<MedicalDocumentDTO> search(UUID employeeId, UUID companyId, MedicalDocumentType type,
                                           LocalDate from, LocalDate to, String cid, String search, Pageable pageable) {
        Page<MedicalDocument> page = medicalDocumentRepository.findAll(
                MedicalDocumentSpecs.search(employeeId, companyId, type, from, to, cid, search),
                pageable);
        // Inicializa associações dentro da transação (evita LazyInitializationException)
        page.forEach(d -> {
            if (d.getEmployee() != null) {
                d.getEmployee().getName();
                try {
                    if (d.getEmployee().getDepartment() != null) {
                        d.getEmployee().getDepartment().getName();
                    }
                } catch (Exception ignored) { /* órfão */ }
                try {
                    if (d.getEmployee().getPosition() != null) {
                        d.getEmployee().getPosition().getName();
                    }
                } catch (Exception ignored) { /* órfão */ }
            }
            if (d.getCompany() != null) {
                d.getCompany().getName();
            }
            if (d.getCreatedBy() != null) {
                d.getCreatedBy().getName();
            }
        });
        return page.map(MedicalDocumentDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<MedicalDocumentDTO> historyByEmployee(UUID employeeId) {
        return medicalDocumentRepository.findByEmployeeIdOrderByStartDateDesc(employeeId).stream()
                .filter(d -> !"CANCELLED".equals(d.getStatus()))
                .map(MedicalDocumentDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> dashboard(LocalDate from, LocalDate to, UUID companyId) {
        List<MedicalDocument> docs = medicalDocumentRepository.findAll(
                MedicalDocumentSpecs.forDashboard(companyId, from, to));

        // Garante inicialização do que o fetch pode ter deixado lazy em alguns providers
        docs.forEach(d -> {
            if (d.getEmployee() != null) {
                d.getEmployee().getName();
            }
            if (d.getCompany() != null) {
                d.getCompany().getName();
            }
        });

        long atestados = docs.stream()
                .filter(d -> d.getDocumentType() == MedicalDocumentType.ATESTADO)
                .count();
        long declaracoes = docs.stream().filter(d ->
                d.getDocumentType() == MedicalDocumentType.DECLARACAO_COMPARECIMENTO
                        || d.getDocumentType() == MedicalDocumentType.DECLARACAO_MEDICA).count();
        int dias = docs.stream()
                .filter(d -> d.getDocumentType() == MedicalDocumentType.ATESTADO
                        || d.getDocumentType() == MedicalDocumentType.AFASTAMENTO)
                .mapToInt(d -> d.getDays() != null ? d.getDays() : 0).sum();
        BigDecimal horas = docs.stream()
                .map(d -> d.getHours() != null ? d.getHours() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long inssAlerts = docs.stream().filter(d -> Boolean.TRUE.equals(d.getInssAlert())).count();

        Map<String, Long> byCid = docs.stream()
                .filter(d -> d.getCidCode() != null && !d.getCidCode().isBlank())
                .collect(Collectors.groupingBy(MedicalDocument::getCidCode, Collectors.counting()));

        String topCid = byCid.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        Map<String, Long> porTipo = docs.stream()
                .filter(d -> d.getDocumentType() != null)
                .collect(Collectors.groupingBy(d -> d.getDocumentType().name(), Collectors.counting()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", docs.size());
        result.put("atestados", atestados);
        result.put("declaracoes", declaracoes);
        result.put("diasAfastados", dias);
        result.put("horasAusentes", horas);
        result.put("alertasInss", inssAlerts);
        result.put("cidMaisRecorrente", topCid);
        result.put("porTipo", porTipo);
        return result;
    }

    @Transactional(readOnly = true)
    public Optional<String> lookupCidDescription(String cid) {
        String normalized = normalizeCid(cid);
        if (normalized == null) {
            return Optional.empty();
        }
        List<String> fromDb = medicalDocumentRepository.findCidDescriptions(normalized);
        if (!fromDb.isEmpty() && fromDb.get(0) != null && !fromDb.get(0).isBlank()) {
            return Optional.of(fromDb.get(0).trim());
        }
        Optional<String> fromCatalog = cidLookupService.findDescription(normalized);
        if (fromCatalog.isPresent()) {
            return fromCatalog;
        }
        return Optional.ofNullable(COMMON_CID_DESCRIPTIONS.get(normalized));
    }

    @Transactional(readOnly = true)
    public List<CidSuggestionDTO> searchCid(String query, Integer limit) {
        return cidLookupService.search(query, limit);
    }

    private static final Map<String, String> COMMON_CID_DESCRIPTIONS = Map.ofEntries(
            Map.entry("J06.9", "Infecção aguda das vias aéreas superiores, não especificada"),
            Map.entry("J06.0", "Laringofaringite aguda"),
            Map.entry("J00", "Nasofaringite aguda (resfriado comum)"),
            Map.entry("J02.9", "Faringite aguda não especificada"),
            Map.entry("J03.9", "Amigdalite aguda não especificada"),
            Map.entry("J11", "Influenza devida a vírus não identificado"),
            Map.entry("J18.9", "Pneumonia não especificada"),
            Map.entry("M54.5", "Dor lombar baixa"),
            Map.entry("M54.2", "Cervicalgia"),
            Map.entry("K52.9", "Gastroenterite e colite não infecciosas não especificadas"),
            Map.entry("A09", "Diarréia e gastroenterite de origem infecciosa presumível"),
            Map.entry("R51", "Cefaléia"),
            Map.entry("R50.9", "Febre não especificada"),
            Map.entry("G43.9", "Enxaqueca não especificada"),
            Map.entry("F32.9", "Episódio depressivo não especificado"),
            Map.entry("F41.1", "Ansiedade generalizada"),
            Map.entry("S93.4", "Entorse e distensão do tornozelo"),
            Map.entry("T14.9", "Traumatismo não especificado")
    );

    /**
     * Calcula data final a partir de dias, ou dias a partir das datas.
     * Convenção: N dias a partir de start => end = start + (N - 1).
     */
    private void applyPeriodCalculations(MedicalDocument doc) {
        if (doc.getStartDate() == null) {
            throw new BusinessException("Data inicial é obrigatória");
        }
        if (doc.getStartDate().isAfter(LocalDate.now())) {
            throw new BusinessException("Data inicial não pode ser futura");
        }

        if (doc.getDocumentType() == MedicalDocumentType.DECLARACAO_COMPARECIMENTO
                || doc.getDocumentType() == MedicalDocumentType.DECLARACAO_MEDICA) {
            doc.setDays(0);
            if (doc.getEndDate() == null) {
                doc.setEndDate(doc.getStartDate());
            }
            return;
        }

        if (doc.getDays() != null && doc.getDays() > 0 && doc.getEndDate() == null) {
            doc.setEndDate(doc.getStartDate().plusDays(doc.getDays() - 1L));
        } else if (doc.getEndDate() != null && (doc.getDays() == null || doc.getDays() <= 0)) {
            if (doc.getEndDate().isBefore(doc.getStartDate())) {
                throw new BusinessException("Data final não pode ser anterior à data inicial");
            }
            long days = ChronoUnit.DAYS.between(doc.getStartDate(), doc.getEndDate()) + 1;
            doc.setDays((int) days);
        } else if (doc.getEndDate() != null && doc.getDays() != null && doc.getDays() > 0) {
            if (doc.getEndDate().isBefore(doc.getStartDate())) {
                throw new BusinessException("Data final não pode ser anterior à data inicial");
            }
            // Mantém dias informados; recalcula end se inconsistente
            LocalDate expectedEnd = doc.getStartDate().plusDays(doc.getDays() - 1L);
            if (!expectedEnd.equals(doc.getEndDate())) {
                long days = ChronoUnit.DAYS.between(doc.getStartDate(), doc.getEndDate()) + 1;
                doc.setDays((int) days);
            }
        } else if (doc.getHours() == null || doc.getHours().compareTo(BigDecimal.ZERO) <= 0) {
            // Comparecimento sem dias: default 1 dia
            if (doc.getDocumentType() == MedicalDocumentType.ATESTADO
                    || doc.getDocumentType() == MedicalDocumentType.AFASTAMENTO) {
                doc.setDays(1);
                doc.setEndDate(doc.getStartDate());
            }
        }
    }

    /**
     * Soma afastamentos do mesmo CID em janela de 60 dias (recaída/intercalados).
     * Alerta quando total &gt; 15 dias (encaminhamento INSS a partir do 16º).
     */
    private void applyInssRules(MedicalDocument doc, UUID excludeId) {
        doc.setInssAlert(false);
        doc.setInssAlertMessage(null);
        doc.setRelatedDaysInWindow(doc.getDays() != null ? doc.getDays() : 0);

        if (doc.getCidCode() == null || doc.getCidCode().isBlank()) {
            return;
        }
        if (doc.getDocumentType() != MedicalDocumentType.ATESTADO
                && doc.getDocumentType() != MedicalDocumentType.AFASTAMENTO) {
            return;
        }

        LocalDate end = doc.getEndDate() != null ? doc.getEndDate() : doc.getStartDate();
        LocalDate windowStart = doc.getStartDate().minusDays(INSS_RECURRENCE_WINDOW_DAYS);
        LocalDate windowEnd = end.plusDays(INSS_RECURRENCE_WINDOW_DAYS);

        List<MedicalDocument> related = medicalDocumentRepository.findRelatedByEmployeeAndCidInWindow(
                doc.getEmployee().getId(), doc.getCidCode(), windowStart, windowEnd);

        int totalDays = 0;
        LocalDate lastEnd = null;
        List<MedicalDocument> chain = new ArrayList<>(related);
        chain.add(doc);
        chain.sort(Comparator.comparing(MedicalDocument::getStartDate));

        for (MedicalDocument item : chain) {
            if (excludeId != null && excludeId.equals(item.getId())) {
                continue;
            }
            if (item.getId() != null && doc.getId() != null && item.getId().equals(doc.getId())) {
                // will count current via doc fields below if not yet persisted in list
            }
            LocalDate itemStart = item.getStartDate();
            LocalDate itemEnd = item.getEndDate() != null ? item.getEndDate() : itemStart;
            int itemDays = item.getDays() != null ? item.getDays()
                    : (int) ChronoUnit.DAYS.between(itemStart, itemEnd) + 1;

            if (lastEnd == null) {
                totalDays += itemDays;
                lastEnd = itemEnd;
                continue;
            }
            long gap = ChronoUnit.DAYS.between(lastEnd, itemStart);
            // Mesmo CID e intervalo entre fim do anterior e início do novo <= 60 dias → soma
            if (gap <= INSS_RECURRENCE_WINDOW_DAYS) {
                totalDays += itemDays;
                if (itemEnd.isAfter(lastEnd)) {
                    lastEnd = itemEnd;
                }
            } else {
                totalDays = itemDays;
                lastEnd = itemEnd;
            }
        }

        // Garante inclusão do documento atual se ainda não estava na lista
        boolean currentInList = related.stream().anyMatch(r -> r.getId() != null && r.getId().equals(doc.getId()));
        if (!currentInList && doc.getId() == null) {
            // já adicionado em chain
        }

        doc.setRelatedDaysInWindow(totalDays);
        if (totalDays > INSS_EMPLOYER_DAYS) {
            doc.setInssAlert(true);
            doc.setInssAlertMessage(String.format(
                    "Alerta INSS: %d dias acumulados com CID %s em janela de %d dias (mesmo motivo). " +
                            "Empresa paga os primeiros %d dias; a partir do 16º dia o afastamento deve ser encaminhado ao INSS " +
                            "(Dec. 3.048/99, art. 75). Verifique também a regra de recaída em até 60 dias do retorno.",
                    totalDays, doc.getCidCode(), INSS_RECURRENCE_WINDOW_DAYS, INSS_EMPLOYER_DAYS));
        } else if (totalDays == INSS_EMPLOYER_DAYS) {
            doc.setInssAlert(true);
            doc.setInssAlertMessage(String.format(
                    "Atenção: atingidos %d dias com CID %s na janela de %d dias. " +
                            "Novo afastamento pelo mesmo motivo pode exigir encaminhamento ao INSS.",
                    totalDays, doc.getCidCode(), INSS_RECURRENCE_WINDOW_DAYS));
        }
    }

    private void recordHistory(MedicalDocument doc, String action, String details, UUID userId) {
        MedicalDocumentHistory h = MedicalDocumentHistory.builder()
                .medicalDocument(doc)
                .action(action)
                .details(details)
                .changedBy(userId != null ? userRepository.findById(userId).orElse(null) : null)
                .build();
        historyRepository.save(h);
    }

    private Company resolveCompany(UUID companyId, Employee employee) {
        if (companyId != null) {
            return companyRepository.findById(companyId).orElse(null);
        }
        return employee.getCompany();
    }

    private MedicalDocumentType requireType(MedicalDocumentType type) {
        if (type == null) {
            throw new BusinessException("Tipo do documento é obrigatório");
        }
        return type;
    }

    private String normalizeCid(String cid) {
        if (cid == null || cid.isBlank()) {
            return null;
        }
        return cid.trim().toUpperCase().replace(" ", "");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
