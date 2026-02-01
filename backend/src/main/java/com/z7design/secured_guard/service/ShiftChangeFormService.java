package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ShiftChangeFormDTO;
import com.z7design.secured_guard.model.ShiftChangeForm;
import com.z7design.secured_guard.model.enums.ShiftTime;
import com.z7design.secured_guard.repository.ShiftChangeFormRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShiftChangeFormService {

    private final ShiftChangeFormRepository shiftChangeFormRepository;
    private final StandardReportLayoutService layoutService;
    private final CompanyRepository companyRepository;

    /**
     * Gera relatório PDF de troca de plantão com layout premium
     */
    public byte[] generatePDFReport(Long id) throws IOException {
        log.info("Gerando relatório PDF de troca de plantão ID: {}", id);

        ShiftChangeForm shiftChange = shiftChangeFormRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitação de troca de plantão não encontrada"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            // Resolver companyId (fallback para primeira empresa ativa)
            java.util.UUID companyId = companyRepository.findAll().stream()
                    .filter(c -> c.getStatus() == Company.CompanyStatus.ACTIVE)
                    .findFirst()
                    .map(Company::getId)
                    .orElse(null);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("SOLICITAÇÃO DE TROCA DE PLANTÃO")
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // Informações gerais
            document.add(new Paragraph("Data da Solicitação: " +
                    shiftChange.getDateOfRequest().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                    .setFontSize(10)
                    .setMarginBottom(5));

            document.add(new Paragraph("Horário do Plantão: " + getShiftTimeLabel(shiftChange.getShiftTime()))
                    .setFontSize(10)
                    .setMarginBottom(15));

            // Tabela com dados dos funcionários
            Table table = new Table(UnitValue.createPercentArray(new float[] { 1, 1 }))
                    .useAllAvailableWidth()
                    .setMarginBottom(15);

            // Cabeçalhos
            table.addHeaderCell(layoutService.createHeaderCell("DADOS DO SOLICITANTE"));
            table.addHeaderCell(layoutService.createHeaderCell("DADOS DO COLEGA"));

            // Dados
            table.addCell(layoutService.createDataCell(
                    "Nome: " + (shiftChange.getRequesterFullName() != null ? shiftChange.getRequesterFullName() : "")));
            table.addCell(layoutService.createDataCell(
                    "Nome: " + (shiftChange.getReplacingFullName() != null ? shiftChange.getReplacingFullName() : "")));

            table.addCell(layoutService.createDataCell(
                    "Setor: " + (shiftChange.getRequesterSector() != null ? shiftChange.getRequesterSector() : "")));
            table.addCell(layoutService.createDataCell(
                    "Setor: " + (shiftChange.getReplacingSector() != null ? shiftChange.getReplacingSector() : "")));

            table.addCell(layoutService.createDataCell("Data do Plantão: " +
                    (shiftChange.getRequesterShiftDate() != null
                            ? shiftChange.getRequesterShiftDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            : "-")));
            table.addCell(layoutService.createDataCell("Data do Plantão: " +
                    (shiftChange.getReplacingShiftDate() != null
                            ? shiftChange.getReplacingShiftDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                            : "-")));

            if (shiftChange.getRequesterDayOffDate() != null) {
                table.addCell(layoutService.createDataCell("Data da Folga: " +
                        shiftChange.getRequesterDayOffDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
            } else {
                table.addCell(layoutService.createDataCell("Data da Folga: -"));
            }

            if (shiftChange.getReplacingDayOffDate() != null) {
                table.addCell(layoutService.createDataCell("Data da Folga: " +
                        shiftChange.getReplacingDayOffDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
            } else {
                table.addCell(layoutService.createDataCell("Data da Folga: -"));
            }

            document.add(table);

            // Termo de responsabilidade
            document.add(new Paragraph("TERMO DE RESPONSABILIDADE")
                    .setFontSize(12)
                    .setBold()
                    .setMarginTop(10)
                    .setMarginBottom(10));

            document.add(new Paragraph(
                    "Declaro que estou ciente das responsabilidades inerentes à troca de plantão e me comprometo a cumprir "
                            +
                            "todas as normas e procedimentos estabelecidos pela empresa. A troca será realizada de forma voluntária "
                            +
                            "e com total acordo entre as partes envolvidas.")
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.JUSTIFIED)
                    .setMarginBottom(20));

            // Campos de assinatura
            Table signatureTable = new Table(UnitValue.createPercentArray(new float[] { 1, 1 }))
                    .useAllAvailableWidth()
                    .setMarginTop(30);

            signatureTable.addCell(layoutService.createDataCell("_______________________________\n" +
                    (shiftChange.getRequesterFullName() != null ? shiftChange.getRequesterFullName() : "Solicitante")
                    + "\nAssinatura do Solicitante"));
            signatureTable.addCell(layoutService.createDataCell("_______________________________\n" +
                    (shiftChange.getReplacingFullName() != null ? shiftChange.getReplacingFullName() : "Colega")
                    + "\nAssinatura do Colega"));

            document.add(signatureTable);

            layoutService.finalizeDocumentLayout(docWithPdf);
            document.close();
            log.info("Relatório PDF de troca de plantão gerado com sucesso");

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de troca de plantão", e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    private String getShiftTimeLabel(ShiftTime shiftTime) {
        if (shiftTime == null)
            return "Não informado";
        switch (shiftTime) {
            case SHIFT_6H_18H:
                return "6h às 18h";
            case SHIFT_18H_6H:
                return "18h às 6h";
            case SHIFT_7H_19H:
                return "7h às 19h";
            case SHIFT_19H_7H:
                return "19h às 7h";
            default:
                return shiftTime.toString();
        }
    }

    @Transactional
    public ShiftChangeFormDTO createShiftChangeForm(ShiftChangeFormDTO dto) {
        log.info("Criando nova solicitação de troca de plantão: {}", dto.getRequesterFullName());
        validateShiftChange(dto);
        ShiftChangeForm entity = dto.toEntity();
        return new ShiftChangeFormDTO(shiftChangeFormRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<ShiftChangeFormDTO> getAllShiftChangeForms() {
        log.info("Buscando todas as solicitações de troca de plantão");
        return shiftChangeFormRepository.findAll().stream()
                .map(ShiftChangeFormDTO::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ShiftChangeFormDTO getShiftChangeFormById(Long id) {
        log.info("Buscando solicitação de troca de plantão por ID: {}", id);
        return shiftChangeFormRepository.findById(id)
                .map(ShiftChangeFormDTO::new)
                .orElseThrow(() -> new RuntimeException("Solicitação de troca de plantão não encontrada"));
    }

    @Transactional
    public ShiftChangeFormDTO updateShiftChangeForm(Long id, ShiftChangeFormDTO dto) {
        log.info("Atualizando solicitação de troca de plantão ID: {}", id);
        ShiftChangeForm existingEntity = shiftChangeFormRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitação de troca de plantão não encontrada"));

        validateShiftChange(dto);

        existingEntity.setDateOfRequest(dto.getDateOfRequest());
        existingEntity.setRequesterFullName(dto.getRequesterFullName());
        existingEntity.setRequesterSector(dto.getRequesterSector());
        existingEntity.setRequesterDayOffDate(dto.getRequesterDayOffDate());
        existingEntity.setRequesterShiftDate(dto.getRequesterShiftDate());
        existingEntity.setReplacingFullName(dto.getReplacingFullName());
        existingEntity.setReplacingSector(dto.getReplacingSector());
        existingEntity.setReplacingShiftDate(dto.getReplacingShiftDate());
        existingEntity.setReplacingDayOffDate(dto.getReplacingDayOffDate());
        existingEntity.setShiftTime(dto.getShiftTime());

        // Só atualiza o status se foi enviado (não nulo)
        if (dto.getStatus() != null) {
            existingEntity.setStatus(dto.getStatus());
        }

        return new ShiftChangeFormDTO(shiftChangeFormRepository.save(existingEntity));
    }

    @Transactional
    public void deleteShiftChangeForm(Long id) {
        log.info("Excluindo solicitação de troca de plantão ID: {}", id);
        if (!shiftChangeFormRepository.existsById(id)) {
            throw new RuntimeException("Solicitação de troca de plantão não encontrada");
        }
        shiftChangeFormRepository.deleteById(id);
    }

    private void validateShiftChange(ShiftChangeFormDTO dto) {
        // Regra de validação: Não será permitida trocas entre funcionários de turnos
        // diferentes (Dia/Noite)
        boolean isRequesterDayShift = isDayShift(dto.getShiftTime());
        boolean isReplacingDayShift = isDayShift(dto.getShiftTime()); // O colega assumirá o mesmo turno

        if (isRequesterDayShift != isReplacingDayShift) {
            throw new IllegalArgumentException(
                    "Não é permitida a troca de plantão entre turnos diferentes (Dia/Noite).");
        }
    }

    private boolean isDayShift(ShiftTime shiftTime) {
        return shiftTime == ShiftTime.SHIFT_6H_18H || shiftTime == ShiftTime.SHIFT_7H_19H;
    }
}
