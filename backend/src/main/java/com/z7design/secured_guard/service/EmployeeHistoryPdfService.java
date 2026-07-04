package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.EmployeeChangeHistoryDTO;
import com.z7design.secured_guard.dto.EmployeeEmploymentPeriodDTO;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.dto.WorkPostAssignmentResponse;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.MedicalExam;
import com.z7design.secured_guard.model.TrainingParticipation;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Serviço para gerar PDF do histórico completo do funcionário
 * (postos, alterações, ASO, treinamentos).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeHistoryPdfService {

    private final EmployeeService employeeService;
    private final EmployeeChangeHistoryService employeeChangeHistoryService;
    private final EmployeeEmploymentPeriodService employmentPeriodService;
    private final WorkPostAssignmentService workPostAssignmentService;
    private final MedicalExamService medicalExamService;
    private final SSTTrainingService sstTrainingService;
    private final CompanyRepository companyRepository;
    private final StandardReportLayoutService standardReportLayoutService;

    @Transactional(readOnly = true)
    public byte[] generateEmployeeHistoryPdf(UUID employeeId) throws Exception {
        log.info("📄 Gerando PDF do histórico completo do funcionário ID: {}", employeeId);

        Employee employee = employeeService.findById(employeeId);
        if (employee == null) {
            throw new RuntimeException("Funcionário não encontrado");
        }

        Company company = null;
        if (employee.getCompany() != null) {
            company = companyRepository.findById(employee.getCompany().getId()).orElse(null);
        }

        List<EmployeeChangeHistoryDTO> changes = employeeChangeHistoryService
                .findByEmployeeId(employeeId, null, null, null, null, PageRequest.of(0, 50))
                .getContent();
        List<WorkPostAssignmentResponse> assignments = workPostAssignmentService.getWorkPostAssignmentsByEmployee(employeeId);
        List<MedicalExam> medicalExams = medicalExamService.getExamsByEmployee(employeeId);
        List<TrainingParticipation> trainings = sstTrainingService.getParticipationsByEmployee(employeeId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;
        ReportLayoutConfig layoutConfig = null;

        try {
            UUID companyId = resolveCompanyId(company);
            PdfWriter writer = new PdfWriter(baos);

            layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("HISTÓRICO COMPLETO DO FUNCIONÁRIO")
                    .topMargin(130f)
                    .bottomMargin(50f)
                    .leftMargin(50f)
                    .rightMargin(50f)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            Paragraph dateTop = new Paragraph(
                    "Data do Relatório: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .setFontSize(9)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setMarginBottom(10)
                    .setMarginTop(0);
            document.add(dateTop);

            // Identificação do funcionário
            Paragraph empTitle = new Paragraph("FUNCIONÁRIO")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(5)
                    .setMarginBottom(10);
            document.add(empTitle);

            Table empTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);
            addTableRow(empTable, "Nome:", employee.getName());
            addTableRow(empTable, "Matrícula:", employee.getRegistrationNumber() != null ? employee.getRegistrationNumber() : "-");
            addTableRow(empTable, "Cargo:", employee.getPosition() != null ? employee.getPosition().getName() : "-");
            document.add(empTable);

            // Postos de trabalho
            Paragraph postosTitle = new Paragraph("POSTOS DE TRABALHO")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(postosTitle);

            String currentPost = "-";
            String lastPost = "-";
            if (!assignments.isEmpty()) {
                List<WorkPostAssignmentResponse> sorted = assignments.stream()
                        .sorted((a, b) -> (b.getAssignmentDate() != null && a.getAssignmentDate() != null)
                                ? b.getAssignmentDate().compareTo(a.getAssignmentDate())
                                : 0)
                        .toList();
                currentPost = sorted.get(0).getWorkPost() != null ? sorted.get(0).getWorkPost().getName() : "-";
                if (sorted.size() > 1 && sorted.get(1).getWorkPost() != null) {
                    lastPost = sorted.get(1).getWorkPost().getName();
                }
            } else if (employee.getWorkPost() != null) {
                currentPost = employee.getWorkPost().getName();
            } else if (employee.getDepartment() != null) {
                currentPost = employee.getDepartment().getName();
            }

            Table postosTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);
            addTableRow(postosTable, "Posto atual:", currentPost);
            addTableRow(postosTable, "Último posto:", lastPost);
            document.add(postosTable);

            // Dados atuais
            Paragraph dadosTitle = new Paragraph("DADOS ATUAIS")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(dadosTitle);

            Table dadosTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);
            addTableRow(dadosTable, "Horário de trabalho:", employee.getHorarioTrabalho() != null ? employee.getHorarioTrabalho() : "-");
            addTableRow(dadosTable, "Escala de trabalho:", employee.getEscalaTrabalho() != null ? employee.getEscalaTrabalho() : "-");
            addTableRow(dadosTable, "Dias de trabalho:", employee.getDiasTrabalho() != null ? employee.getDiasTrabalho() : "-");
            addTableRow(dadosTable, "Admissão:", formatDate(employee.getHireDate()));
            if (employee.getTerminationDate() != null) {
                addTableRow(dadosTable, "Demissão:", formatDate(employee.getTerminationDate()));
            }
            String asoLine = formatDate(employee.getExameMedicoData()) + " | Vencimento: " + formatDate(employee.getExameMedicoVencimento());
            if (employee.getExameMedicoTipo() != null && !employee.getExameMedicoTipo().trim().isEmpty()) {
                asoLine += " (" + employee.getExameMedicoTipo() + ")";
            }
            addTableRow(dadosTable, "ASO:", asoLine);
            document.add(dadosTable);

            // Histórico de alterações
            Paragraph changesTitle = new Paragraph("HISTÓRICO DE ALTERAÇÕES")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(changesTitle);

            if (changes.isEmpty()) {
                document.add(new Paragraph("Nenhuma alteração registrada.").setFontSize(10).setMarginBottom(15));
            } else {
                Table changesTable = new Table(UnitValue.createPercentArray(new float[] { 25f, 75f }))
                        .useAllAvailableWidth()
                        .setMarginBottom(15);
                addTableHeader(changesTable, "Data", "Alteração");
                for (EmployeeChangeHistoryDTO c : changes) {
                    String changeText = (c.getCategoryLabel() != null ? c.getCategoryLabel() : c.getCategory()) + ": "
                            + (c.getFieldLabel() != null ? c.getFieldLabel() : c.getFieldName()) + " → "
                            + (c.getNewValue() != null ? c.getNewValue() : "-");
                    addTableRow(changesTable, formatInstant(c.getChangedAt()), changeText);
                }
                document.add(changesTable);
            }

            // Histórico de postos
            Paragraph histPostosTitle = new Paragraph("HISTÓRICO DE POSTOS")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(histPostosTitle);

            if (assignments.isEmpty()) {
                document.add(new Paragraph("Nenhuma atribuição de posto.").setFontSize(10).setMarginBottom(15));
            } else {
                Table histPostosTable = new Table(UnitValue.createPercentArray(new float[] { 30f, 50f, 20f }))
                        .useAllAvailableWidth()
                        .setMarginBottom(15);
                addTableHeader(histPostosTable, "Data", "Posto", "Turno");
                for (WorkPostAssignmentResponse a : assignments) {
                    addTableRow(histPostosTable,
                            formatLocalDate(a.getAssignmentDate()),
                            a.getWorkPost() != null ? a.getWorkPost().getName() : "-",
                            a.getShift() != null ? a.getShift() : "-");
                }
                document.add(histPostosTable);
            }

            // Exames ASO
            Paragraph asoTitle = new Paragraph("EXAMES ASO")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(asoTitle);

            if (medicalExams.isEmpty()) {
                document.add(new Paragraph("Nenhum exame registrado.").setFontSize(10).setMarginBottom(15));
            } else {
                Table asoTable = new Table(UnitValue.createPercentArray(new float[] { 25f, 35f, 25f, 15f }))
                        .useAllAvailableWidth()
                        .setMarginBottom(15);
                addTableHeader(asoTable, "Agendamento", "Realização", "Tipo", "Status");
                for (MedicalExam m : medicalExams) {
                    String typeName = m.getExamType() != null ? m.getExamType().getName() : "-";
                    addTableRow(asoTable,
                            formatLocalDate(m.getScheduledDate()),
                            formatLocalDate(m.getExamDate()),
                            typeName,
                            m.getStatus() != null ? m.getStatus().name() : "-");
                }
                document.add(asoTable);
            }

            // Treinamentos e reciclagem
            Paragraph trainTitle = new Paragraph("TREINAMENTOS E RECICLAGEM")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(trainTitle);

            if (trainings.isEmpty()) {
                document.add(new Paragraph("Nenhum treinamento.").setFontSize(10).setMarginBottom(15));
            } else {
                Table trainTable = new Table(UnitValue.createPercentArray(new float[] { 45f, 30f, 25f }))
                        .useAllAvailableWidth()
                        .setMarginBottom(15);
                addTableHeader(trainTable, "Treinamento", "Conclusão", "Status");
                for (TrainingParticipation t : trainings) {
                    String trainName = t.getTraining() != null ? t.getTraining().getName() : "-";
                    addTableRow(trainTable,
                            trainName,
                            formatLocalDate(t.getCompletionDate()),
                            t.getStatus() != null ? t.getStatus().name() : "-");
                }
                document.add(trainTable);
            }

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do histórico do funcionário", e);
            throw e;
        }

        log.info("✅ PDF do histórico gerado com sucesso. Tamanho: {} bytes", baos.size());
        return standardReportLayoutService.finalizePdfBytes(baos, layoutConfig);
    }

    /**
     * PDF somente com vínculos empregatícios e histórico de alterações de dados (aba Histórico).
     */
    @Transactional(readOnly = true)
    public byte[] generateChangeHistoryPdf(UUID employeeId) throws Exception {
        log.info("📄 Gerando PDF do histórico de mudanças do funcionário ID: {}", employeeId);

        Employee employee = employeeService.findById(employeeId);
        if (employee == null) {
            throw new RuntimeException("Funcionário não encontrado");
        }

        Company company = null;
        if (employee.getCompany() != null) {
            company = companyRepository.findById(employee.getCompany().getId()).orElse(null);
        }

        List<EmployeeEmploymentPeriodDTO> periods = employmentPeriodService.findByEmployeeId(employeeId);
        List<EmployeeChangeHistoryDTO> changes = employeeChangeHistoryService
                .findByEmployeeId(employeeId, null, null, null, null, PageRequest.of(0, 500))
                .getContent();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;
        ReportLayoutConfig layoutConfig = null;

        try {
            UUID companyId = resolveCompanyId(company);
            PdfWriter writer = new PdfWriter(baos);

            layoutConfig = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("HISTÓRICO DE MUDANÇAS DO FUNCIONÁRIO")
                    .topMargin(130f)
                    .bottomMargin(50f)
                    .leftMargin(25f)
                    .rightMargin(25f)
                    .landscape(true)
                    .build();

            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            document.add(new Paragraph(
                    "Data do Relatório: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .setFontSize(9)
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setMarginBottom(10)
                    .setMarginTop(0));

            Paragraph empTitle = new Paragraph("FUNCIONÁRIO")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(5)
                    .setMarginBottom(10);
            document.add(empTitle);

            Table empTable = new Table(UnitValue.createPercentArray(new float[] { 40f, 60f }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);
            addTableRow(empTable, "Nome:", employee.getName());
            addTableRow(empTable, "CPF:", employee.getDocument() != null ? employee.getDocument() : "-");
            addTableRow(empTable, "Matrícula:", employee.getRegistrationNumber() != null ? employee.getRegistrationNumber() : "-");
            addTableRow(empTable, "Cargo atual:", employee.getPosition() != null ? employee.getPosition().getName() : "-");
            addTableRow(empTable, "Empresa atual:", company != null ? company.getName() : "-");
            document.add(empTable);

            Paragraph periodsTitle = new Paragraph("VÍNCULOS EMPREGATÍCIOS")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(periodsTitle);

            if (periods.isEmpty()) {
                document.add(new Paragraph("Nenhum vínculo registrado.").setFontSize(10).setMarginBottom(15));
            } else {
                Table periodsTable = new Table(UnitValue.createPercentArray(new float[] { 14f, 24f, 18f, 14f, 14f, 16f }))
                        .useAllAvailableWidth()
                        .setMarginBottom(15);
                addTableHeader(periodsTable, "Tipo", "Empresa", "Cargo", "Admissão", "Demissão", "Status");
                for (EmployeeEmploymentPeriodDTO p : periods) {
                    String statusLabel = "TERMINATED".equals(p.getStatus()) ? "Demitido" : "Ativo";
                    addTableRow(periodsTable,
                            p.getAdmissionTypeLabel() != null ? p.getAdmissionTypeLabel() : "-",
                            p.getCompanyName() != null ? p.getCompanyName() : "-",
                            p.getPositionName() != null ? p.getPositionName() : "-",
                            formatDate(p.getHireDate()),
                            formatDate(p.getTerminationDate()),
                            statusLabel);
                }
                document.add(periodsTable);
            }

            Paragraph changesTitle = new Paragraph("HISTÓRICO DE ALTERAÇÕES")
                    .setBold()
                    .setFontSize(12)
                    .setMarginTop(10)
                    .setMarginBottom(10);
            document.add(changesTitle);

            if (changes.isEmpty()) {
                document.add(new Paragraph("Nenhuma alteração registrada.").setFontSize(10).setMarginBottom(15));
            } else {
                Table changesTable = new Table(UnitValue.createPercentArray(new float[] { 12f, 12f, 12f, 22f, 22f, 20f }))
                        .useAllAvailableWidth()
                        .setMarginBottom(15);
                addTableHeader(changesTable, "Data/Hora", "Categoria", "Campo", "Valor antigo", "Valor novo", "Alterado por");
                for (EmployeeChangeHistoryDTO c : changes) {
                    addTableRow(changesTable,
                            formatInstant(c.getChangedAt()),
                            c.getCategoryLabel() != null ? c.getCategoryLabel() : (c.getCategory() != null ? c.getCategory() : "-"),
                            c.getFieldLabel() != null ? c.getFieldLabel() : (c.getFieldName() != null ? c.getFieldName() : "-"),
                            c.getOldValue() != null ? c.getOldValue() : "-",
                            c.getNewValue() != null ? c.getNewValue() : "-",
                            c.getChangedByUserName() != null ? c.getChangedByUserName() : "-");
                }
                document.add(changesTable);
            }

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF do histórico de mudanças do funcionário", e);
            throw e;
        }

        log.info("✅ PDF do histórico de mudanças gerado. Tamanho: {} bytes", baos.size());
        return standardReportLayoutService.finalizePdfBytes(baos, layoutConfig);
    }

    private void addTableRow(Table table, String c1, String c2, String c3, String c4, String c5, String c6) {
        table.addCell(createValueCell(c1));
        table.addCell(createValueCell(c2));
        table.addCell(createValueCell(c3));
        table.addCell(createValueCell(c4));
        table.addCell(createValueCell(c5));
        table.addCell(createValueCell(c6));
    }

    private void addTableRow(Table table, String label, String value) {
        table.addCell(createLabelCell(label));
        table.addCell(createValueCell(value));
    }

    private void addTableRow(Table table, String c1, String c2, String c3) {
        table.addCell(createValueCell(c1));
        table.addCell(createValueCell(c2));
        table.addCell(createValueCell(c3));
    }

    private void addTableRow(Table table, String c1, String c2, String c3, String c4) {
        table.addCell(createValueCell(c1));
        table.addCell(createValueCell(c2));
        table.addCell(createValueCell(c3));
        table.addCell(createValueCell(c4));
    }

    private void addTableHeader(Table table, String... headers) {
        for (String h : headers) {
            table.addCell(new Cell()
                    .add(new Paragraph(h != null ? h : "").setBold().setFontSize(9))
                    .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(240, 240, 240))
                    .setPadding(4f));
        }
    }

    private Cell createLabelCell(String text) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "").setBold().setFontSize(10).setMultipliedLeading(1.25f))
                .setBackgroundColor(new com.itextpdf.kernel.colors.DeviceRgb(240, 240, 240))
                .setPadding(4f);
    }

    private Cell createValueCell(String text) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(10).setMultipliedLeading(1.25f))
                .setPadding(4f);
    }

    private String formatDate(LocalDate date) {
        if (date == null) return "-";
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private String formatLocalDate(LocalDate date) {
        return formatDate(date);
    }

    private String formatInstant(Instant instant) {
        if (instant == null) return "-";
        return instant.atZone(ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    private UUID resolveCompanyId(Company company) {
        if (company != null) return company.getId();
        List<Company> active = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (active != null && !active.isEmpty()) return active.get(0).getId();
        List<Company> all = companyRepository.findAll();
        if (all != null && !all.isEmpty()) return all.get(0).getId();
        throw new RuntimeException("Não foi possível determinar a empresa para o relatório.");
    }
}
