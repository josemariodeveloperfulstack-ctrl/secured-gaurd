package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Absence;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.repository.AbsenceRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.z7design.secured_guard.dto.ReportLayoutConfig;

@Service
@Transactional
@Slf4j
public class AbsenceService {

    @Autowired
    private AbsenceRepository absenceRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private StandardReportLayoutService layoutService;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private EmployeeChangeHistoryService employeeChangeHistoryService;

    @Transactional(readOnly = true)
    public List<Absence> getAllAbsences() {
        try {
            log.info("🔍 Buscando todas as faltas com relacionamentos");
            List<Absence> absences = absenceRepository.findAllWithRelationships();
            log.info("✅ Faltas encontradas: {} registros", absences.size());

            // Inicializar objetos necessários dentro da transação para evitar
            // LazyInitializationException
            for (Absence absence : absences) {
                if (absence.getEmployee() != null) {
                    // Forçar inicialização de campos básicos do Employee dentro da transação
                    absence.getEmployee().getName();
                    absence.getEmployee().getId();
                    absence.getEmployee().getRegistrationNumber();
                }
                if (absence.getCoverageEmployee() != null) {
                    absence.getCoverageEmployee().getName();
                    absence.getCoverageEmployee().getId();
                }
                if (absence.getApprovedBy() != null) {
                    absence.getApprovedBy().getName();
                    absence.getApprovedBy().getId();
                }
            }

            return absences;
        } catch (Exception e) {
            log.error("❌ Erro ao buscar faltas com relacionamentos", e);
            log.error("❌ Tipo de exceção: {}", e.getClass().getName());
            log.error("❌ Mensagem: {}", e.getMessage());
            if (e.getCause() != null) {
                log.error("❌ Causa: {}", e.getCause().getMessage());
                log.error("❌ Tipo da causa: {}", e.getCause().getClass().getName());
                if (e.getCause().getCause() != null) {
                    log.error("❌ Causa da causa: {}", e.getCause().getCause().getMessage());
                }
            }
            log.error("❌ Stack trace completo:", e);
            throw new RuntimeException("Erro ao buscar faltas: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public Optional<Absence> getAbsenceById(UUID id) {
        try {
            Optional<Absence> absenceOpt = absenceRepository.findByIdWithRelationships(id);
            if (absenceOpt.isPresent()) {
                Absence absence = absenceOpt.get();
                // Inicializar objetos necessários dentro da transação
                if (absence.getEmployee() != null) {
                    absence.getEmployee().getName();
                    absence.getEmployee().getId();
                    absence.getEmployee().getRegistrationNumber();
                }
                if (absence.getCoverageEmployee() != null) {
                    absence.getCoverageEmployee().getName();
                    absence.getCoverageEmployee().getId();
                }
                if (absence.getApprovedBy() != null) {
                    absence.getApprovedBy().getName();
                    absence.getApprovedBy().getId();
                }
            }
            return absenceOpt;
        } catch (Exception e) {
            log.error("❌ Erro ao buscar falta por ID: {}", id, e);
            // Fallback para método padrão
            return absenceRepository.findById(id);
        }
    }

    public List<Absence> getAbsencesByEmployee(UUID employeeId) {
        return absenceRepository.findByEmployeeId(employeeId);
    }

    public List<Absence> getAbsencesByDate(LocalDate date) {
        return absenceRepository.findByAbsenceDate(date);
    }

    public List<Absence> getAbsencesByStatus(Absence.AbsenceStatus status) {
        return absenceRepository.findByStatus(status);
    }

    public List<Absence> getAbsencesByType(Absence.AbsenceType type) {
        return absenceRepository.findByAbsenceType(type);
    }

    public List<Absence> getAbsencesByDateRange(LocalDate startDate, LocalDate endDate) {
        return absenceRepository.findByDateRange(startDate, endDate);
    }

    public List<Absence> getAbsencesByEmployeeAndDateRange(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return absenceRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate);
    }

    public Absence createAbsence(Absence absence) {
        // Validar se o funcionário existe
        Employee employee = employeeRepository.findById(absence.getEmployee().getId())
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Validar se o funcionário que cobriu a falta existe (se fornecido)
        if (absence.getCoverageEmployee() != null) {
            Employee coverageEmployee = employeeRepository.findById(absence.getCoverageEmployee().getId())
                    .orElseThrow(() -> new RuntimeException("Funcionário que cobriu a falta não encontrado"));
            absence.setCoverageEmployee(coverageEmployee);
        }

        absence.setEmployee(employee);

        Absence saved = absenceRepository.save(absence);
        String tipo = saved.getIsJustified() != null && saved.getIsJustified() ? "justificada" : "não justificada";
        String desc = String.format("%s - %s (%s)", saved.getAbsenceDate(), saved.getAbsenceType(), tipo);
        employeeChangeHistoryService.recordChange(employee.getId(), EmployeeChangeCategory.FALTA,
                "falta", "Falta", null, desc, getCurrentUserId());
        return saved;
    }

    public Absence updateAbsence(UUID id, Absence updatedAbsence) {
        Absence existingAbsence = absenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Falta não encontrada"));

        // Atualizar campos permitidos
        // IMPORTANTE: Atualizar absenceType sempre que fornecido (não null)
        if (updatedAbsence.getAbsenceType() != null) {
            existingAbsence.setAbsenceType(updatedAbsence.getAbsenceType());
            log.info("✅ Atualizando absenceType de '{}' para '{}'", existingAbsence.getAbsenceType(),
                    updatedAbsence.getAbsenceType());
        } else {
            log.warn("⚠️ absenceType é null no update - mantendo valor atual: {}", existingAbsence.getAbsenceType());
        }

        if (updatedAbsence.getAbsenceDate() != null) {
            existingAbsence.setAbsenceDate(updatedAbsence.getAbsenceDate());
        }
        if (updatedAbsence.getReason() != null) {
            existingAbsence.setReason(updatedAbsence.getReason());
        }
        if (updatedAbsence.getMedicalCertificateDays() != null) {
            existingAbsence.setMedicalCertificateDays(updatedAbsence.getMedicalCertificateDays());
        }
        if (updatedAbsence.getDocumentUrl() != null) {
            existingAbsence.setDocumentUrl(updatedAbsence.getDocumentUrl());
        }
        if (updatedAbsence.getStatus() != null) {
            existingAbsence.setStatus(updatedAbsence.getStatus());
        }
        if (updatedAbsence.getIsJustified() != null) {
            existingAbsence.setIsJustified(updatedAbsence.getIsJustified());
        }
        if (updatedAbsence.getCoverageNotes() != null) {
            existingAbsence.setCoverageNotes(updatedAbsence.getCoverageNotes());
        }

        // Validar e atualizar funcionário que cobriu a falta se fornecido
        if (updatedAbsence.getCoverageEmployee() != null) {
            Employee coverageEmployee = employeeRepository.findById(updatedAbsence.getCoverageEmployee().getId())
                    .orElseThrow(() -> new RuntimeException("Funcionário que cobriu a falta não encontrado"));
            existingAbsence.setCoverageEmployee(coverageEmployee);
        }

        String oldDesc = String.format("%s - %s (%s)", existingAbsence.getAbsenceDate(), existingAbsence.getAbsenceType(),
                existingAbsence.getIsJustified() != null && existingAbsence.getIsJustified() ? "justificada" : "não justificada");
        Absence saved = absenceRepository.save(existingAbsence);
        String newDesc = String.format("%s - %s (%s)", saved.getAbsenceDate(), saved.getAbsenceType(),
                saved.getIsJustified() != null && saved.getIsJustified() ? "justificada" : "não justificada");
        employeeChangeHistoryService.recordChange(saved.getEmployee().getId(), EmployeeChangeCategory.FALTA,
                "falta", "Falta", oldDesc, newDesc, getCurrentUserId());
        return saved;
    }

    public void deleteAbsence(UUID id) {
        if (!absenceRepository.existsById(id)) {
            throw new RuntimeException("Falta não encontrada");
        }
        absenceRepository.deleteById(id);
    }

    public Absence updateStatus(UUID id, Absence.AbsenceStatus status) {
        Absence absence = absenceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Falta não encontrada"));

        absence.setStatus(status);
        absence.setUpdatedAt(java.time.LocalDateTime.now());

        return absenceRepository.save(absence);
    }

    public List<Absence> getPendingAbsences() {
        return absenceRepository.findByStatus(Absence.AbsenceStatus.PENDING);
    }

    public List<Absence> getTodayAbsences() {
        return absenceRepository.findByAbsenceDate(LocalDate.now());
    }

    public Long getEmployeeAbsenceCount(UUID employeeId, LocalDate startDate, LocalDate endDate) {
        return absenceRepository.countApprovedAbsencesByEmployeeAndDateRange(employeeId, startDate, endDate);
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            return ((User) auth.getPrincipal()).getId();
        }
        return null;
    }

    @Transactional
    public Absence approveAbsence(UUID absenceId, String observacoes) {
        Absence absence = absenceRepository.findById(absenceId)
                .orElseThrow(() -> new RuntimeException("Afastamento não encontrado"));

        if (absence.getStatus() != Absence.AbsenceStatus.PENDING) {
            throw new IllegalArgumentException("Apenas afastamentos pendentes podem ser aprovados");
        }

        absence.setStatus(Absence.AbsenceStatus.APPROVED);
        // TODO: Buscar o usuário atual do contexto de segurança para setar approvedBy

        Absence savedAbsence = absenceRepository.save(absence);

        // Inicializar relacionamentos lazy dentro da transação para evitar
        // LazyInitializationException
        try {
            if (savedAbsence.getEmployee() != null) {
                savedAbsence.getEmployee().getName();
                savedAbsence.getEmployee().getId();
                savedAbsence.getEmployee().getRegistrationNumber();
            }
            if (savedAbsence.getCoverageEmployee() != null) {
                savedAbsence.getCoverageEmployee().getName();
                savedAbsence.getCoverageEmployee().getId();
            }
            if (savedAbsence.getApprovedBy() != null) {
                savedAbsence.getApprovedBy().getName();
                savedAbsence.getApprovedBy().getId();
            }
        } catch (Exception e) {
            log.warn("Erro ao inicializar relacionamentos do afastamento {}: {}", absenceId, e.getMessage());
        }

        return savedAbsence;
    }

    @Transactional
    public Absence rejectAbsence(UUID absenceId, String motivo) {
        Absence absence = absenceRepository.findById(absenceId)
                .orElseThrow(() -> new RuntimeException("Afastamento não encontrado"));

        if (absence.getStatus() != Absence.AbsenceStatus.PENDING) {
            throw new IllegalArgumentException("Apenas afastamentos pendentes podem ser rejeitados");
        }

        absence.setStatus(Absence.AbsenceStatus.REJECTED);
        // TODO: Buscar o usuário atual do contexto de segurança para setar approvedBy

        Absence savedAbsence = absenceRepository.save(absence);

        // Inicializar relacionamentos lazy dentro da transação para evitar
        // LazyInitializationException
        try {
            if (savedAbsence.getEmployee() != null) {
                savedAbsence.getEmployee().getName();
                savedAbsence.getEmployee().getId();
                savedAbsence.getEmployee().getRegistrationNumber();
            }
            if (savedAbsence.getCoverageEmployee() != null) {
                savedAbsence.getCoverageEmployee().getName();
                savedAbsence.getCoverageEmployee().getId();
            }
            if (savedAbsence.getApprovedBy() != null) {
                savedAbsence.getApprovedBy().getName();
                savedAbsence.getApprovedBy().getId();
            }
        } catch (Exception e) {
            log.warn("Erro ao inicializar relacionamentos do afastamento {}: {}", absenceId, e.getMessage());
        }

        return savedAbsence;
    }

    @Transactional(readOnly = true)
    public byte[] generatePDFReport(UUID employeeId, LocalDate startDate, LocalDate endDate,
            Absence.AbsenceStatus status) throws IOException {
        log.info(
                "Gerando relatório PDF de faltas e afastamentos - EmployeeId: {}, StartDate: {}, EndDate: {}, Status: {}",
                employeeId, startDate, endDate, status);

        List<Absence> absences;
        if (employeeId != null && startDate != null && endDate != null) {
            absences = absenceRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate);
        } else if (startDate != null && endDate != null) {
            absences = absenceRepository.findByDateRange(startDate, endDate);
        } else if (employeeId != null) {
            absences = absenceRepository.findByEmployeeId(employeeId);
        } else {
            absences = absenceRepository.findAllWithRelationships();
        }

        if (status != null) {
            absences = absences.stream()
                    .filter(a -> a.getStatus() == status)
                    .toList();
        }

        log.info("Total de faltas encontradas para o relatório: {}", absences.size());

        // Determinar companyId
        UUID companyId = resolveCompanyId(absences, employeeId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .reportTitle("RELATÓRIO DE FALTAS E AFASTAMENTOS")
                    .companyId(companyId)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer,
                    config);
            Document document = docWithPdf.getDocument();

            // Filtros aplicados
            if (employeeId != null || startDate != null || endDate != null || status != null) {
                Paragraph filtersInfo = new Paragraph("Filtros aplicados:")
                        .setFontSize(10)
                        .setBold()
                        .setMarginBottom(5);
                document.add(filtersInfo);

                if (startDate != null && endDate != null) {
                    document.add(
                            new Paragraph("Período: " + startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) +
                                    " a " + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10)
                                    .setMarginBottom(2));
                }
                if (employeeId != null && !absences.isEmpty()) {
                    String employeeName = absences.stream()
                            .filter(a -> a.getEmployee() != null && a.getEmployee().getId().equals(employeeId))
                            .map(a -> a.getEmployee().getName())
                            .findFirst().orElse("ID: " + employeeId);
                    document.add(new Paragraph("Funcionário: " + employeeName).setFontSize(10).setMarginBottom(2));
                }
                if (status != null) {
                    document.add(new Paragraph("Status: " + status).setFontSize(10).setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Tabela de faltas
            if (absences.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhum registro encontrado com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(new float[] { 3, 2, 2, 2, 4 }).useAllAvailableWidth();

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Funcionário"));
                table.addHeaderCell(createHeaderCell("Data"));
                table.addHeaderCell(createHeaderCell("Tipo"));
                table.addHeaderCell(createHeaderCell("Status"));
                table.addHeaderCell(createHeaderCell("Motivo/Observações"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (Absence absence : absences) {
                    table.addCell(createCell(absence.getEmployee() != null ? absence.getEmployee().getName() : ""));
                    table.addCell(createCell(
                            absence.getAbsenceDate() != null ? absence.getAbsenceDate().format(dateFormatter) : ""));
                    table.addCell(createCell(
                            absence.getAbsenceType() != null ? getAbsenceTypeLabel(absence.getAbsenceType()) : ""));
                    table.addCell(
                            createCell(absence.getStatus() != null ? getAbsenceStatusLabel(absence.getStatus()) : ""));
                    table.addCell(createCell(absence.getReason() != null ? absence.getReason() : ""));
                }

                document.add(table);
            }

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de faltas: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    private com.itextpdf.layout.element.Cell createHeaderCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text).setBold().setFontSize(9))
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY);
    }

    private com.itextpdf.layout.element.Cell createCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(8))
                .setTextAlignment(TextAlignment.LEFT);
    }

    private String getAbsenceTypeLabel(Absence.AbsenceType type) {
        if (type == null)
            return "";
        switch (type) {
            case SICK_LEAVE:
                return "Atestado Médico";
            case PERSONAL_LEAVE:
                return "Falta Pessoal/Justificada";
            case UNAUTHORIZED:
                return "Falta não autorizada";
            case MEDICAL_APPOINTMENT:
                return "Consulta Médica";
            case FAMILY_EMERGENCY:
                return "Emergência Familiar";
            case WEDDING:
                return "Casamento";
            case OTHER:
                return "Outros";
            default:
                return type.toString();
        }
    }

    private String getAbsenceStatusLabel(Absence.AbsenceStatus status) {
        if (status == null)
            return "";
        switch (status) {
            case PENDING:
                return "Pendente";
            case APPROVED:
                return "Aprovado";
            case REJECTED:
                return "Rejeitado";
            case CANCELLED:
                return "Cancelado";
            default:
                return status.toString();
        }
    }

    private UUID resolveCompanyId(List<Absence> absences, UUID employeeId) {
        if (employeeId != null) {
            Employee employee = employeeRepository.findById(employeeId).orElse(null);
            if (employee != null && employee.getCompany() != null) {
                return employee.getCompany().getId();
            }
        }
        if (!absences.isEmpty()) {
            for (Absence a : absences) {
                if (a.getEmployee() != null && a.getEmployee().getCompany() != null) {
                    return a.getEmployee().getCompany().getId();
                }
            }
        }

        // Fallback for company resolution
        return companyRepository.findAll().stream()
                .filter(c -> c.getStatus() == Company.CompanyStatus.ACTIVE)
                .findFirst()
                .map(Company::getId)
                .orElse(null);
    }
}
