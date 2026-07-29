package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateWorkPostAssignmentRequest;
import com.z7design.secured_guard.dto.WorkPostAssignmentResponse;
import com.z7design.secured_guard.model.WorkPostAssignment;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.WorkPostAssignmentRepository;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.model.User;

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
public class WorkPostAssignmentService {

    private static final Logger log = LoggerFactory.getLogger(WorkPostAssignmentService.class);

    @Autowired
    private WorkPostAssignmentRepository workPostAssignmentRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private WorkPostRepository workPostRepository;

    @Autowired
    private StandardReportLayoutService standardReportLayoutService;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private EmployeeChangeHistoryService employeeChangeHistoryService;

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getAllWorkPostAssignments() {
        return workPostAssignmentRepository.findAll().stream()
                .map(this::mapToResponseSafe)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<WorkPostAssignmentResponse> getWorkPostAssignmentById(UUID id) {
        return workPostAssignmentRepository.findById(id).map(this::mapToResponseSafe);
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByEmployee(UUID employeeId) {
        return workPostAssignmentRepository.findByEmployeeId(employeeId).stream()
                .map(this::mapToResponseSafe)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByWorkPost(UUID workPostId) {
        return workPostAssignmentRepository.findByWorkPostId(workPostId).stream()
                .map(this::mapToResponseSafe)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByDate(LocalDate date) {
        return workPostAssignmentRepository.findByAssignmentDate(date).stream()
                .map(this::mapToResponseSafe)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByStatus(WorkPostAssignment.AssignmentStatus status) {
        return workPostAssignmentRepository.findByStatus(status).stream()
                .map(this::mapToResponseSafe)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByDateRange(LocalDate startDate, LocalDate endDate) {
        return workPostAssignmentRepository.findByDateRange(startDate, endDate).stream()
                .map(this::mapToResponseSafe)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByEmployeeAndDateRange(UUID employeeId,
            LocalDate startDate, LocalDate endDate) {
        return workPostAssignmentRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate).stream()
                .map(this::mapToResponseSafe)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getWorkPostAssignmentsByWorkPostAndDateRange(UUID workPostId,
            LocalDate startDate, LocalDate endDate) {
        return workPostAssignmentRepository.findByWorkPostAndDateRange(workPostId, startDate, endDate).stream()
                .map(this::mapToResponseSafe)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    public WorkPostAssignmentResponse createWorkPostAssignment(CreateWorkPostAssignmentRequest request) {
        // Validar se o funcionário existe
        Employee employee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Validar se o posto de trabalho existe
        WorkPost workPost = workPostRepository.findById(request.getWorkPostId())
                .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));

        // Verificar conflitos de horário para o mesmo funcionário na mesma data
        List<WorkPostAssignment> existingAssignments = workPostAssignmentRepository
                .findActiveAssignmentsByDateAndEmployee(request.getAssignmentDate(), employee.getId());

        if (!existingAssignments.isEmpty()) {
            throw new RuntimeException("Funcionário já possui atribuição ativa nesta data");
        }

        // Verificar conflitos de horário para o mesmo posto na mesma data
        List<WorkPostAssignment> existingPostAssignments = workPostAssignmentRepository
                .findActiveAssignmentsByDateAndPost(request.getAssignmentDate(), workPost.getId());

        if (!existingPostAssignments.isEmpty()) {
            throw new RuntimeException("Posto de trabalho já possui atribuição ativa nesta data");
        }

        // Converter ShiftType string para enum
        WorkPostAssignment.ShiftType shiftType = WorkPostAssignment.ShiftType.valueOf(request.getShiftType());

        // Criar a atribuição
        WorkPostAssignment assignment = WorkPostAssignment.builder()
                .employee(employee)
                .workPost(workPost)
                .assignmentDate(request.getAssignmentDate())
                .shiftType(shiftType)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(WorkPostAssignment.AssignmentStatus.PENDING)
                .isPrimaryAssignment(request.getIsPrimaryAssignment() != null ? request.getIsPrimaryAssignment() : true)
                .isBackupAssignment(request.getIsBackupAssignment() != null ? request.getIsBackupAssignment() : false)
                .observations(request.getObservations())
                .specialInstructions(request.getSpecialInstructions())
                .createdAt(java.time.LocalDateTime.now())
                .updatedAt(java.time.LocalDateTime.now())
                .build();

        WorkPostAssignmentResponse saved = mapToResponse(workPostAssignmentRepository.save(assignment));
        String desc = String.format("Posto: %s em %s (%s)", workPost.getName(), request.getAssignmentDate(), shiftType);
        employeeChangeHistoryService.recordChange(employee.getId(), EmployeeChangeCategory.POSTO_TRABALHO,
                "atribuicao_posto", "Atribuição de posto", null, desc, getCurrentUserId());
        return saved;
    }

    public WorkPostAssignmentResponse updateWorkPostAssignment(UUID id, CreateWorkPostAssignmentRequest request) {
        WorkPostAssignment existingAssignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));

        // Atualizar campos permitidos
        if (request.getAssignmentDate() != null) {
            existingAssignment.setAssignmentDate(request.getAssignmentDate());
        }

        if (request.getShiftType() != null) {
            WorkPostAssignment.ShiftType shiftType = WorkPostAssignment.ShiftType.valueOf(request.getShiftType());
            existingAssignment.setShiftType(shiftType);
        }

        existingAssignment.setStartTime(request.getStartTime());
        existingAssignment.setEndTime(request.getEndTime());
        existingAssignment.setObservations(request.getObservations());
        existingAssignment.setSpecialInstructions(request.getSpecialInstructions());

        if (request.getIsPrimaryAssignment() != null) {
            existingAssignment.setIsPrimaryAssignment(request.getIsPrimaryAssignment());
        }

        if (request.getIsBackupAssignment() != null) {
            existingAssignment.setIsBackupAssignment(request.getIsBackupAssignment());
        }

        existingAssignment.setUpdatedAt(java.time.LocalDateTime.now());

        String oldDesc = existingAssignment.getWorkPost() != null
                ? String.format("Posto: %s em %s", existingAssignment.getWorkPost().getName(), existingAssignment.getAssignmentDate())
                : null;
        String newDesc = request.getWorkPostId() != null
                ? workPostRepository.findById(request.getWorkPostId())
                        .map(wp -> String.format("Posto: %s em %s", wp.getName(), request.getAssignmentDate() != null ? request.getAssignmentDate() : existingAssignment.getAssignmentDate()))
                        .orElse(null)
                : oldDesc;
        if (!java.util.Objects.equals(oldDesc, newDesc)) {
            employeeChangeHistoryService.recordChange(existingAssignment.getEmployee().getId(),
                    EmployeeChangeCategory.POSTO_TRABALHO, "atribuicao_posto", "Atribuição de posto",
                    oldDesc, newDesc, getCurrentUserId());
        }

        // Validar e atualizar funcionário se fornecido
        if (request.getEmployeeId() != null) {
            Employee employee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));
            existingAssignment.setEmployee(employee);
        }

        // Validar e atualizar posto de trabalho se fornecido
        if (request.getWorkPostId() != null) {
            WorkPost workPost = workPostRepository.findById(request.getWorkPostId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
            existingAssignment.setWorkPost(workPost);
        }

        return mapToResponse(workPostAssignmentRepository.save(existingAssignment));
    }

    public void deleteWorkPostAssignment(UUID id) {
        if (!workPostAssignmentRepository.existsById(id)) {
            throw new RuntimeException("Atribuição de posto não encontrada");
        }
        workPostAssignmentRepository.deleteById(id);
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            return ((User) auth.getPrincipal()).getId();
        }
        return null;
    }

    public WorkPostAssignmentResponse updateStatus(UUID id, WorkPostAssignment.AssignmentStatus status) {
        WorkPostAssignment assignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));

        assignment.setStatus(status);
        assignment.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(workPostAssignmentRepository.save(assignment));
    }

    public WorkPostAssignmentResponse confirmAssignment(UUID id) {
        WorkPostAssignment assignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));

        assignment.setStatus(WorkPostAssignment.AssignmentStatus.CONFIRMED);
        assignment.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(workPostAssignmentRepository.save(assignment));
    }

    public WorkPostAssignmentResponse completeAssignment(UUID id) {
        WorkPostAssignment assignment = workPostAssignmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Atribuição de posto não encontrada"));

        assignment.setStatus(WorkPostAssignment.AssignmentStatus.COMPLETED);
        assignment.setUpdatedAt(java.time.LocalDateTime.now());

        return mapToResponse(workPostAssignmentRepository.save(assignment));
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getTodayAssignments() {
        return workPostAssignmentRepository.findByAssignmentDate(LocalDate.now()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getPendingAssignments() {
        return workPostAssignmentRepository.findByStatus(WorkPostAssignment.AssignmentStatus.PENDING).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorkPostAssignmentResponse> getActiveAssignments() {
        return workPostAssignmentRepository.findByStatus(WorkPostAssignment.AssignmentStatus.CONFIRMED).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public byte[] generatePDFReport(UUID employeeId, UUID workPostId, LocalDate startDate, LocalDate endDate,
            WorkPostAssignment.AssignmentStatus status) throws IOException {
        log.info(
                "Gerando relatório PDF de atribuições de posto - EmployeeId: {}, WorkPostId: {}, StartDate: {}, EndDate: {}, Status: {}",
                employeeId, workPostId, startDate, endDate, status);

        List<WorkPostAssignment> assignments;
        if (startDate != null && endDate != null) {
            if (employeeId != null) {
                assignments = workPostAssignmentRepository.findByEmployeeAndDateRange(employeeId, startDate, endDate);
            } else if (workPostId != null) {
                assignments = workPostAssignmentRepository.findByWorkPostAndDateRange(workPostId, startDate, endDate);
            } else {
                assignments = workPostAssignmentRepository.findByDateRange(startDate, endDate);
            }
        } else {
            assignments = workPostAssignmentRepository.findAll();
        }

        if (status != null) {
            assignments = assignments.stream()
                    .filter(a -> a.getStatus() == status)
                    .collect(Collectors.toList());
        }

        // Determinar companyId
        UUID companyId = resolveCompanyId(assignments, employeeId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .reportTitle("RELATÓRIO DE ATRIBUIÇÕES DE POSTO")
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

            Table table = new Table(UnitValue.createPercentArray(new float[] { 15, 25, 25, 10, 10, 15 }))
                    .useAllAvailableWidth()
                    .setMarginTop(10);

            table.addHeaderCell(createHeaderCell("Data"));
            table.addHeaderCell(createHeaderCell("Funcionário"));
            table.addHeaderCell(createHeaderCell("Posto"));
            table.addHeaderCell(createHeaderCell("Turno"));
            table.addHeaderCell(createHeaderCell("Horário"));
            table.addHeaderCell(createHeaderCell("Status"));

            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            for (WorkPostAssignment assignment : assignments) {
                table.addCell(createCell(assignment.getAssignmentDate().format(dtf)));
                table.addCell(
                        createCell(assignment.getEmployee() != null ? assignment.getEmployee().getName() : "N/A"));
                table.addCell(
                        createCell(assignment.getWorkPost() != null ? assignment.getWorkPost().getName() : "N/A"));
                table.addCell(createCell(assignment.getShiftType() != null ? assignment.getShiftType().name() : "N/A"));

                String time = "N/A";
                if (assignment.getStartTime() != null && assignment.getEndTime() != null) {
                    time = assignment.getStartTime().toString() + " - " + assignment.getEndTime().toString();
                }
                table.addCell(createCell(time));
                table.addCell(createCell(assignment.getStatus() != null ? assignment.getStatus().name() : "N/A"));
            }

            document.add(table);
            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);
            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de atribuições de posto", e);
            throw new IOException("Erro ao gerar PDF", e);
        }

        return baos.toByteArray();
    }

    private UUID resolveCompanyId(List<WorkPostAssignment> assignments, UUID employeeId) {
        if (employeeId != null) {
            Employee employee = employeeRepository.findById(employeeId).orElse(null);
            if (employee != null && employee.getCompany() != null) {
                return employee.getCompany().getId();
            }
        }
        if (!assignments.isEmpty()) {
            for (WorkPostAssignment a : assignments) {
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

    private WorkPostAssignmentResponse mapToResponseSafe(WorkPostAssignment assignment) {
        try {
            return mapToResponse(assignment);
        } catch (jakarta.persistence.EntityNotFoundException e) {
            log.warn("Ignorando alocação {} com referência órfã: {}", assignment.getId(), e.getMessage());
            return null;
        } catch (Exception e) {
            log.warn("Ignorando alocação {} por erro ao mapear: {}", assignment.getId(), e.getMessage());
            return null;
        }
    }

    private WorkPostAssignmentResponse mapToResponse(WorkPostAssignment assignment) {
        WorkPostAssignmentResponse.SimpleEmployee employeeData = null;
        try {
            if (assignment.getEmployee() != null) {
                employeeData = new WorkPostAssignmentResponse.SimpleEmployee(
                        assignment.getEmployee().getId(),
                        assignment.getEmployee().getName());
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            log.warn("Alocação {} referencia funcionário inexistente", assignment.getId());
        }

        WorkPostAssignmentResponse.SimpleWorkPost workPostData = null;
        try {
            if (assignment.getWorkPost() != null) {
                workPostData = new WorkPostAssignmentResponse.SimpleWorkPost(
                        assignment.getWorkPost().getId(),
                        assignment.getWorkPost().getName());
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            log.warn("Alocação {} referencia posto inexistente", assignment.getId());
            workPostData = new WorkPostAssignmentResponse.SimpleWorkPost(
                    null,
                    "Posto removido");
        }

        String shift = assignment.getShiftType() != null ? assignment.getShiftType().name() : null;

        String status = null;
        if (assignment.getStatus() != null) {
            switch (assignment.getStatus()) {
                case PENDING -> status = "SCHEDULED";
                case ACTIVE, CONFIRMED -> status = "CONFIRMED";
                case COMPLETED -> status = "COMPLETED";
                case CANCELLED -> status = "CANCELLED";
                case MODIFIED -> status = "MODIFIED";
                default -> status = assignment.getStatus().name();
            }
        }

        UUID assignedById = null;
        try {
            assignedById = assignment.getAssignedBy() != null ? assignment.getAssignedBy().getId() : null;
        } catch (jakarta.persistence.EntityNotFoundException ignored) {
            // usuário removido
        }

        return WorkPostAssignmentResponse.builder()
                .id(assignment.getId())
                .employee(employeeData)
                .workPost(workPostData)
                .assignmentDate(assignment.getAssignmentDate())
                .shift(shift)
                .startTime(assignment.getStartTime())
                .endTime(assignment.getEndTime())
                .status(status)
                .primaryAssignment(assignment.getIsPrimaryAssignment())
                .backupAssignment(assignment.getIsBackupAssignment())
                .observations(assignment.getObservations())
                .specialInstructions(assignment.getSpecialInstructions())
                .assignedById(assignedById)
                .assignmentDateTime(assignment.getAssignmentDateTime())
                .createdAt(assignment.getCreatedAt())
                .updatedAt(assignment.getUpdatedAt())
                .build();
    }
}
