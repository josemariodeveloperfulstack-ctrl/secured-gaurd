package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateSpecificActivityRequest;
import com.z7design.secured_guard.dto.SpecificActivityResponse;
import com.z7design.secured_guard.model.SpecificActivity;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.SpecificActivityRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class SpecificActivityService {

    private static final Logger log = LoggerFactory.getLogger(SpecificActivityService.class);

    @Autowired
    private SpecificActivityRepository specificActivityRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private WorkPostRepository workPostRepository;

    @Autowired
    private StandardReportLayoutService standardReportLayoutService;

    @Autowired
    private CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getAllSpecificActivities() {
        return specificActivityRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<SpecificActivityResponse> getSpecificActivityById(UUID id) {
        return specificActivityRepository.findById(id).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getSpecificActivitiesByEmployee(UUID employeeId) {
        return specificActivityRepository.findByEmployeeId(employeeId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getSpecificActivitiesByLocation(UUID locationId) {
        return specificActivityRepository.findByLocationId(locationId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getSpecificActivitiesByDate(LocalDate date) {
        return specificActivityRepository.findByActivityDate(date).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getSpecificActivitiesByStatus(SpecificActivity.ActivityStatus status) {
        return specificActivityRepository.findByStatus(status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getSpecificActivitiesByType(SpecificActivity.ActivityType type) {
        return specificActivityRepository.findByActivityType(type).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getSpecificActivitiesByDateRange(LocalDate startDate, LocalDate endDate) {
        return specificActivityRepository.findByDateRange(startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getSpecificActivitiesByEmployeeAndDateRange(UUID employeeId,
            LocalDate startDate, LocalDate endDate) {
        return specificActivityRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getSpecificActivitiesByLocationAndDateRange(UUID locationId,
            LocalDate startDate, LocalDate endDate) {
        return specificActivityRepository.findByLocationAndDateRange(locationId, startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getSpecificActivitiesByTypeAndDateRange(SpecificActivity.ActivityType type,
            LocalDate startDate, LocalDate endDate) {
        return specificActivityRepository.findByActivityTypeAndDateRange(type, startDate, endDate).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public SpecificActivityResponse createSpecificActivity(CreateSpecificActivityRequest request) {
        // Validar se o funcionário existe
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Validar se o local existe (se fornecido)
        WorkPost location = null;
        if (request.getLocationId() != null) {
            location = workPostRepository.findById(request.getLocationId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
        }

        // Converter activityType string para enum
        SpecificActivity.ActivityType activityType = SpecificActivity.ActivityType.valueOf(request.getActivityType());

        // Criar a atividade
        SpecificActivity activity = SpecificActivity.builder()
                .employee(employee)
                .activityType(activityType)
                .activityDate(request.getActivityDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .location(location)
                .description(request.getDescription())
                .observations(request.getObservations())
                .status(SpecificActivity.ActivityStatus.SCHEDULED)
                .isCompleted(false)
                .createdAt(java.time.LocalDateTime.now())
                .updatedAt(java.time.LocalDateTime.now())
                .build();

        return mapToResponse(specificActivityRepository.save(activity));
    }

    public SpecificActivityResponse updateSpecificActivity(UUID id, CreateSpecificActivityRequest request) {
        SpecificActivity existingActivity = specificActivityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atividade específica não encontrada"));

        // Atualizar campos permitidos
        if (request.getEmployeeId() != null) {
            Employee employee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));
            existingActivity.setEmployee(employee);
        }

        if (request.getActivityType() != null) {
            SpecificActivity.ActivityType activityType = SpecificActivity.ActivityType
                    .valueOf(request.getActivityType());
            existingActivity.setActivityType(activityType);
        }

        if (request.getActivityDate() != null) {
            existingActivity.setActivityDate(request.getActivityDate());
        }

        existingActivity.setStartTime(request.getStartTime());
        existingActivity.setEndTime(request.getEndTime());
        existingActivity.setDescription(request.getDescription());
        existingActivity.setObservations(request.getObservations());

        // Validar e atualizar local se fornecido
        if (request.getLocationId() != null) {
            WorkPost location = workPostRepository.findById(request.getLocationId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
            existingActivity.setLocation(location);
        } else {
            existingActivity.setLocation(null);
        }

        existingActivity.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(specificActivityRepository.save(existingActivity));
    }

    public void deleteSpecificActivity(UUID id) {
        if (!specificActivityRepository.existsById(id)) {
            throw new RuntimeException("Atividade específica não encontrada");
        }
        specificActivityRepository.deleteById(id);
    }

    public SpecificActivityResponse updateStatus(UUID id, SpecificActivity.ActivityStatus status) {
        SpecificActivity activity = specificActivityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atividade específica não encontrada"));

        activity.setStatus(status);
        activity.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(specificActivityRepository.save(activity));
    }

    public SpecificActivityResponse startActivity(UUID id) {
        SpecificActivity activity = specificActivityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atividade específica não encontrada"));

        activity.setStatus(SpecificActivity.ActivityStatus.IN_PROGRESS);
        activity.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(specificActivityRepository.save(activity));
    }

    public SpecificActivityResponse completeActivity(UUID id, String observations) {
        SpecificActivity activity = specificActivityRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atividade específica não encontrada"));

        activity.setStatus(SpecificActivity.ActivityStatus.COMPLETED);
        activity.setIsCompleted(true);
        activity.setCompletionDate(java.time.LocalDateTime.now());

        if (observations != null && !observations.trim().isEmpty()) {
            activity.setCompletionNotes(observations);
        }
        activity.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(specificActivityRepository.save(activity));
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getTodayActivities() {
        return specificActivityRepository.findByActivityDate(LocalDate.now()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getPendingActivities() {
        return specificActivityRepository.findByStatus(SpecificActivity.ActivityStatus.SCHEDULED).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getPendingActivitiesByDate(LocalDate date) {
        return specificActivityRepository.findPendingActivitiesByDate(date).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getOverdueActivities() {
        return specificActivityRepository.findOverdueActivities(LocalDate.now()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SpecificActivityResponse> getInProgressActivities() {
        return specificActivityRepository.findByStatus(SpecificActivity.ActivityStatus.IN_PROGRESS).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public byte[] generatePDFReport(UUID employeeId, UUID locationId, LocalDate startDate, LocalDate endDate,
            SpecificActivity.ActivityStatus status, SpecificActivity.ActivityType type) throws IOException {
        log.info(
                "Gerando relatório PDF de atividades específicas - EmployeeId: {}, LocationId: {}, StartDate: {}, EndDate: {}, Status: {}, Type: {}",
                employeeId, locationId, startDate, endDate, status, type);

        List<SpecificActivity> activities;
        if (startDate != null && endDate != null) {
            if (employeeId != null) {
                activities = specificActivityRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate);
            } else if (locationId != null) {
                activities = specificActivityRepository.findByLocationAndDateRange(locationId, startDate, endDate);
            } else {
                activities = specificActivityRepository.findByDateRange(startDate, endDate);
            }
        } else if (type != null) {
            activities = specificActivityRepository.findByActivityType(type);
        } else {
            activities = specificActivityRepository.findAll();
        }

        if (status != null) {
            activities = activities.stream()
                    .filter(a -> a.getStatus() == status)
                    .collect(Collectors.toList());
        }

        // Determinar companyId
        UUID companyId = resolveCompanyId(activities, employeeId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .reportTitle("RELATÓRIO DE ATIVIDADES ESPECÍFICAS")
                    .companyId(companyId)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // Adicionar conteúdo ao PDF
            Paragraph info = new Paragraph(
                    "Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(10);
            document.add(info);

            Table table = new Table(UnitValue.createPercentArray(new float[] { 10, 15, 20, 20, 20, 15 }))
                    .useAllAvailableWidth()
                    .setMarginTop(10);

            table.addHeaderCell(createHeaderCell("Data"));
            table.addHeaderCell(createHeaderCell("Tipo"));
            table.addHeaderCell(createHeaderCell("Funcionário"));
            table.addHeaderCell(createHeaderCell("Local"));
            table.addHeaderCell(createHeaderCell("Descrição"));
            table.addHeaderCell(createHeaderCell("Status"));

            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            for (SpecificActivity activity : activities) {
                table.addCell(createCell(activity.getActivityDate().format(dtf)));
                table.addCell(
                        createCell(activity.getActivityType() != null ? activity.getActivityType().name() : "N/A"));
                table.addCell(createCell(activity.getEmployee() != null ? activity.getEmployee().getName() : "N/A"));
                table.addCell(createCell(activity.getLocation() != null ? activity.getLocation().getName() : "N/A"));
                table.addCell(createCell(activity.getDescription()));
                table.addCell(createCell(activity.getStatus() != null ? activity.getStatus().name() : "N/A"));
            }

            document.add(table);
            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);
            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de atividades específicas", e);
            throw new IOException("Erro ao gerar PDF", e);
        }

        return baos.toByteArray();
    }

    private UUID resolveCompanyId(List<SpecificActivity> activities, UUID employeeId) {
        if (employeeId != null) {
            Employee employee = employeeRepository.findById(employeeId).orElse(null);
            if (employee != null && employee.getCompany() != null) {
                return employee.getCompany().getId();
            }
        }
        if (!activities.isEmpty()) {
            for (SpecificActivity a : activities) {
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

    private com.itextpdf.layout.element.Cell createHeaderCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text).setBold().setFontSize(10))
                .setPadding(5)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY);
    }

    private com.itextpdf.layout.element.Cell createCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(9))
                .setPadding(5);
    }

    private SpecificActivityResponse mapToResponse(SpecificActivity activity) {
        SpecificActivityResponse.SimpleEmployee employeeData = null;
        if (activity.getEmployee() != null) {
            employeeData = new SpecificActivityResponse.SimpleEmployee(
                    activity.getEmployee().getId(),
                    activity.getEmployee().getName());
        }

        SpecificActivityResponse.SimpleWorkPost locationData = null;
        if (activity.getLocation() != null) {
            locationData = new SpecificActivityResponse.SimpleWorkPost(
                    activity.getLocation().getId(),
                    activity.getLocation().getName());
        }

        SpecificActivityResponse.SimpleUser assignedByData = null;
        if (activity.getAssignedBy() != null) {
            assignedByData = new SpecificActivityResponse.SimpleUser(
                    activity.getAssignedBy().getId(),
                    activity.getAssignedBy().getName());
        }

        SpecificActivityResponse.SimpleUser supervisedByData = null;
        if (activity.getSupervisedBy() != null) {
            supervisedByData = new SpecificActivityResponse.SimpleUser(
                    activity.getSupervisedBy().getId(),
                    activity.getSupervisedBy().getName());
        }

        return SpecificActivityResponse.builder()
                .id(activity.getId())
                .employee(employeeData)
                .activityType(activity.getActivityType() != null ? activity.getActivityType().name() : null)
                .activityDate(activity.getActivityDate())
                .startTime(activity.getStartTime())
                .endTime(activity.getEndTime())
                .location(locationData)
                .description(activity.getDescription())
                .observations(activity.getObservations())
                .status(activity.getStatus() != null ? activity.getStatus().name() : null)
                .isCompleted(activity.getIsCompleted())
                .completionNotes(activity.getCompletionNotes())
                .assignedBy(assignedByData)
                .supervisedBy(supervisedByData)
                .completionDate(activity.getCompletionDate())
                .createdAt(activity.getCreatedAt())
                .updatedAt(activity.getUpdatedAt())
                .build();
    }
}
