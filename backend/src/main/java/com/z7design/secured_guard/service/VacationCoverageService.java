package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateVacationCoverageRequest;
import com.z7design.secured_guard.dto.VacationCoverageResponse;
import com.z7design.secured_guard.model.VacationCoverage;
import com.z7design.secured_guard.model.Vacation;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.enums.VacationStatus;
import com.z7design.secured_guard.repository.VacationCoverageRepository;
import com.z7design.secured_guard.repository.VacationRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import java.util.stream.Collectors;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class VacationCoverageService {

    @Autowired
    private VacationCoverageRepository vacationCoverageRepository;

    @Autowired
    private VacationRepository vacationRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private WorkPostRepository workPostRepository;

    @Autowired
    private StandardReportLayoutService layoutService;

    @Autowired
    private CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<VacationCoverageResponse> getAllVacationCoverages() {
        return vacationCoverageRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<VacationCoverageResponse> getVacationCoverageById(UUID id) {
        return vacationCoverageRepository.findById(id).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<VacationCoverageResponse> getVacationCoveragesByEmployee(UUID employeeId) {
        return vacationCoverageRepository.findByVacationEmployeeId(employeeId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VacationCoverageResponse> getVacationCoveragesBySubstitute(UUID substituteEmployeeId) {
        return vacationCoverageRepository.findBySubstituteEmployeeId(substituteEmployeeId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VacationCoverageResponse> getVacationCoveragesByStatus(VacationCoverage.CoverageStatus status) {
        return vacationCoverageRepository.findByStatus(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VacationCoverageResponse> getVacationCoveragesByDateRange(LocalDate startDate, LocalDate endDate) {
        return vacationCoverageRepository.findByDateRange(startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public VacationCoverageResponse createVacationCoverage(CreateVacationCoverageRequest request) {
        // Validar se o funcionário existe
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Criar ou buscar vacation
        Vacation vacation;
        if (request.getVacationId() != null) {
            vacation = vacationRepository.findById(request.getVacationId())
                    .orElseThrow(() -> new RuntimeException("Férias não encontradas"));
        } else {
            // Criar vacation temporária para esta cobertura
            // Calcular dias de férias
            long daysBetween = java.time.temporal.ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate())
                    + 1;
            int daysTaken = (int) daysBetween;

            vacation = Vacation.builder()
                    .employee(employee)
                    .startDate(request.getStartDate())
                    .endDate(request.getEndDate())
                    .daysTaken(daysTaken)
                    .remainingDays(30 - daysTaken) // Assumindo 30 dias de direito
                    .status(VacationStatus.APPROVED)
                    .build();
            vacation = vacationRepository.save(vacation);
        }

        // Validar e buscar substituto (se fornecido)
        Employee substitute = null;
        if (request.getSubstituteEmployeeId() != null) {
            substitute = employeeRepository.findById(request.getSubstituteEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Funcionário substituto não encontrado"));
        }

        // Validar e buscar local (se fornecido)
        WorkPost location = null;
        if (request.getLocationId() != null) {
            location = workPostRepository.findById(request.getLocationId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
        }

        // Converter shift string para enum
        VacationCoverage.ShiftType shiftType = VacationCoverage.ShiftType.valueOf(request.getShift());

        // Determinar status inicial
        VacationCoverage.CoverageStatus status = substitute != null
                ? VacationCoverage.CoverageStatus.PENDING
                : VacationCoverage.CoverageStatus.NO_COVERAGE;

        // Criar cobertura
        VacationCoverage coverage = VacationCoverage.builder()
                .vacation(vacation)
                .substituteEmployee(substitute)
                .coverageStartDate(request.getStartDate())
                .coverageEndDate(request.getEndDate())
                .location(location)
                .shift(shiftType)
                .status(status)
                .observations(request.getObservations())
                .isConfirmed(false)
                .createdAt(java.time.LocalDateTime.now())
                .updatedAt(java.time.LocalDateTime.now())
                .build();

        return mapToResponse(vacationCoverageRepository.save(coverage));
    }

    public VacationCoverageResponse updateVacationCoverage(UUID id, CreateVacationCoverageRequest request) {
        VacationCoverage existingCoverage = vacationCoverageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cobertura de férias não encontrada"));

        // Atualizar campos permitidos
        if (request.getStartDate() != null) {
            existingCoverage.setCoverageStartDate(request.getStartDate());
        }

        if (request.getEndDate() != null) {
            existingCoverage.setCoverageEndDate(request.getEndDate());
        }

        if (request.getShift() != null) {
            VacationCoverage.ShiftType shiftType = VacationCoverage.ShiftType.valueOf(request.getShift());
            existingCoverage.setShift(shiftType);
        }

        existingCoverage.setObservations(request.getObservations());

        // Atualizar substituto se fornecido
        if (request.getSubstituteEmployeeId() != null) {
            Employee substitute = employeeRepository.findById(request.getSubstituteEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Funcionário substituto não encontrado"));
            existingCoverage.setSubstituteEmployee(substitute);
            // Se tinha NO_COVERAGE e agora tem substituto, mudar para PENDING
            if (existingCoverage.getStatus() == VacationCoverage.CoverageStatus.NO_COVERAGE) {
                existingCoverage.setStatus(VacationCoverage.CoverageStatus.PENDING);
            }
        }

        // Atualizar local se fornecido
        if (request.getLocationId() != null) {
            WorkPost location = workPostRepository.findById(request.getLocationId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
            existingCoverage.setLocation(location);
        } else {
            existingCoverage.setLocation(null);
        }

        existingCoverage.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(vacationCoverageRepository.save(existingCoverage));
    }

    public void deleteVacationCoverage(UUID id) {
        if (!vacationCoverageRepository.existsById(id)) {
            throw new RuntimeException("Cobertura de férias não encontrada");
        }
        vacationCoverageRepository.deleteById(id);
    }

    public VacationCoverageResponse updateStatus(UUID id, VacationCoverage.CoverageStatus status) {
        VacationCoverage coverage = vacationCoverageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cobertura de férias não encontrada"));

        coverage.setStatus(status);

        // Se confirmar, registrar data e confirmação
        if (status == VacationCoverage.CoverageStatus.CONFIRMED) {
            coverage.setIsConfirmed(true);
            coverage.setConfirmationDate(java.time.LocalDateTime.now());
        }

        coverage.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(vacationCoverageRepository.save(coverage));
    }

    @Transactional(readOnly = true)
    public List<VacationCoverageResponse> getVacationCoveragesNeedingAttention() {
        LocalDate today = LocalDate.now();
        LocalDate nextWeek = today.plusWeeks(1);

        return vacationCoverageRepository.findByDateRange(today, nextWeek).stream()
                .filter(coverage -> coverage.getStatus() == VacationCoverage.CoverageStatus.PENDING ||
                        coverage.getStatus() == VacationCoverage.CoverageStatus.NO_COVERAGE)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private VacationCoverageResponse mapToResponse(VacationCoverage coverage) {
        VacationCoverageResponse.SimpleEmployee employeeData = null;
        if (coverage.getVacation() != null && coverage.getVacation().getEmployee() != null) {
            employeeData = new VacationCoverageResponse.SimpleEmployee(
                    coverage.getVacation().getEmployee().getId(),
                    coverage.getVacation().getEmployee().getName());
        }

        VacationCoverageResponse.SimpleEmployee substituteData = null;
        if (coverage.getSubstituteEmployee() != null) {
            substituteData = new VacationCoverageResponse.SimpleEmployee(
                    coverage.getSubstituteEmployee().getId(),
                    coverage.getSubstituteEmployee().getName());
        }

        VacationCoverageResponse.SimpleWorkPost locationData = null;
        if (coverage.getLocation() != null) {
            locationData = new VacationCoverageResponse.SimpleWorkPost(
                    coverage.getLocation().getId(),
                    coverage.getLocation().getName());
        }

        return VacationCoverageResponse.builder()
                .id(coverage.getId())
                .employee(employeeData)
                .substituteEmployee(substituteData)
                .startDate(coverage.getCoverageStartDate())
                .endDate(coverage.getCoverageEndDate())
                .location(locationData)
                .shift(coverage.getShift() != null ? coverage.getShift().name() : null)
                .status(coverage.getStatus() != null ? coverage.getStatus().name() : null)
                .observations(coverage.getObservations())
                .isConfirmed(coverage.getIsConfirmed())
                .confirmedById(coverage.getConfirmedBy() != null ? coverage.getConfirmedBy().getId() : null)
                .confirmationDate(coverage.getConfirmationDate())
                .createdAt(coverage.getCreatedAt())
                .updatedAt(coverage.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public byte[] generatePDFReport(LocalDate startDate, LocalDate endDate, VacationCoverage.CoverageStatus status)
            throws IOException {
        log.info("Gerando relatório PDF de coberturas de férias - StartDate: {}, EndDate: {}, Status: {}",
                startDate, endDate, status);

        List<VacationCoverage> coverages;
        if (startDate != null && endDate != null) {
            coverages = vacationCoverageRepository.findByDateRange(startDate, endDate);
        } else {
            coverages = vacationCoverageRepository.findAll();
        }

        if (status != null) {
            coverages = coverages.stream()
                    .filter(c -> c.getStatus() == status)
                    .collect(Collectors.toList());
        }

        log.info("Total de coberturas encontradas para o relatório: {}", coverages.size());

        // Determinar companyId
        UUID companyId = resolveCompanyId(coverages);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .reportTitle("RELATÓRIO DE COBERTURA DE FÉRIAS")
                    .companyId(companyId)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer,
                    config);
            Document document = docWithPdf.getDocument();

            // Filtros aplicados
            if (startDate != null || endDate != null || status != null) {
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
                if (status != null) {
                    document.add(new Paragraph("Status: " + status).setFontSize(10).setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Tabela de coberturas
            if (coverages.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhum registro encontrado com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(new float[] { 3, 3, 2, 2, 2, 3 }).useAllAvailableWidth();

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Funcionário (Férias)"));
                table.addHeaderCell(createHeaderCell("Substituto"));
                table.addHeaderCell(createHeaderCell("Início"));
                table.addHeaderCell(createHeaderCell("Fim"));
                table.addHeaderCell(createHeaderCell("Status"));
                table.addHeaderCell(createHeaderCell("Posto/Local"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (VacationCoverage coverage : coverages) {
                    table.addCell(
                            createCell(coverage.getVacation() != null && coverage.getVacation().getEmployee() != null
                                    ? coverage.getVacation().getEmployee().getName()
                                    : ""));
                    table.addCell(createCell(
                            coverage.getSubstituteEmployee() != null ? coverage.getSubstituteEmployee().getName()
                                    : "Sem substituto"));
                    table.addCell(createCell(coverage.getCoverageStartDate() != null
                            ? coverage.getCoverageStartDate().format(dateFormatter)
                            : ""));
                    table.addCell(createCell(
                            coverage.getCoverageEndDate() != null ? coverage.getCoverageEndDate().format(dateFormatter)
                                    : ""));
                    table.addCell(createCell(
                            coverage.getStatus() != null ? getCoverageStatusLabel(coverage.getStatus()) : ""));
                    table.addCell(createCell(coverage.getLocation() != null ? coverage.getLocation().getName() : ""));
                }

                document.add(table);
            }

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de coberturas: {}", e.getMessage(), e);
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

    private String getCoverageStatusLabel(VacationCoverage.CoverageStatus status) {
        if (status == null)
            return "";
        switch (status) {
            case PENDING:
                return "Pendente";
            case CONFIRMED:
                return "Confirmado";
            case CANCELLED:
                return "Cancelado";
            case NO_COVERAGE:
                return "Sem Cobertura";
            case COMPLETED:
                return "Concluído";
            default:
                return status.toString();
        }
    }

    private UUID resolveCompanyId(List<VacationCoverage> coverages) {
        if (!coverages.isEmpty()) {
            for (VacationCoverage c : coverages) {
                if (c.getVacation() != null && c.getVacation().getEmployee() != null
                        && c.getVacation().getEmployee().getCompany() != null) {
                    return c.getVacation().getEmployee().getCompany().getId();
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
