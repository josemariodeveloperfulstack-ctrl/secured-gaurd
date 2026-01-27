package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.LGPDConsentRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class LGPDConsentStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final ExcelReportLayoutService excelLayoutService;
        private final CompanyRepository companyRepository;

        private static final String REPORT_TITLE = "Termo de Consentimento - LGPD";

        public byte[] generatePdf(LGPDConsentRequest request) {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        // Configurar layout
                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(request.getCompanyId())
                                        .reportTitle(REPORT_TITLE)
                                        .includeEmailInFooter(true)
                                        .build();

                        // Criar documento com layout padrão
                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();

                        addContent(document, request, docWithPdf.getCompany());

                        // layout é aplicado automaticamente pelo handler registrado no
                        // createDocumentWithLayout

                        document.close();
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF do Termo LGPD", e);
                        throw new RuntimeException("Erro ao gerar PDF do Termo LGPD", e);
                }
        }

        public byte[] generateExcel(LGPDConsentRequest request) {
                try (Workbook workbook = new XSSFWorkbook()) {
                        Sheet sheet = workbook.createSheet("Termo LGPD");
                        Company company = companyRepository.findById(request.getCompanyId())
                                        .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

                        // Adicionar cabeçalho padrão
                        int startRow = excelLayoutService.addHeader(sheet, workbook, company, REPORT_TITLE);

                        // Adicionar conteúdo (simplificado para Excel)
                        Row row = sheet.createRow(startRow);
                        row.createCell(0).setCellValue("Nome do Funcionário:");
                        row.createCell(1).setCellValue(request.getEmployeeName());

                        row = sheet.createRow(startRow + 1);
                        row.createCell(0).setCellValue("CPF:");
                        row.createCell(1).setCellValue(request.getEmployeeCpf());

                        row = sheet.createRow(startRow + 2);
                        row.createCell(0).setCellValue("RG:");
                        row.createCell(1).setCellValue(request.getEmployeeRg());

                        row = sheet.createRow(startRow + 3);
                        row.createCell(0).setCellValue("Cargo:");
                        row.createCell(1).setCellValue(request.getEmployeePosition());

                        row = sheet.createRow(startRow + 5);
                        org.apache.poi.ss.usermodel.Cell contentCell = row.createCell(0);
                        contentCell.setCellValue(
                                        "Este documento confirma o consentimento do funcionário para o tratamento de dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD).");

                        // Ajustar colunas
                        sheet.autoSizeColumn(0);
                        sheet.autoSizeColumn(1);

                        // Adicionar rodapé padrão
                        excelLayoutService.addFooter(sheet, workbook, company);

                        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                        workbook.write(outputStream);
                        return outputStream.toByteArray();
                } catch (Exception e) {
                        log.error("Erro ao gerar Excel do Termo LGPD", e);
                        throw new RuntimeException("Erro ao gerar Excel do Termo LGPD", e);
                }
        }

        private void addContent(Document document, LGPDConsentRequest request, Company company) {
                // Seção: Identificação do Funcionário
                document.add(createSectionHeader("IDENTIFICAÇÃO DO FUNCIONÁRIO"));
                Table employeeTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();
                employeeTable.addCell(createLabelValueCell("NOME:", request.getEmployeeName()));
                employeeTable.addCell(createLabelValueCell("CPF:", request.getEmployeeCpf()));
                employeeTable.addCell(createLabelValueCell("RG:", request.getEmployeeRg()));
                employeeTable.addCell(createLabelValueCell("CARGO:", request.getEmployeePosition()));
                document.add(employeeTable);

                // Texto Introdutório
                document.add(createSectionHeader("CONSENTIMENTO PARA TRATAMENTO DE DADOS"));
                Paragraph intro = new Paragraph()
                                .setFontSize(10f)
                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(10f);

                intro.add("Pelo presente instrumento, eu, acima identificado, declaro que concordo e autorizo a empresa ");
                intro.add(new Text(company != null ? company.getName() : "________________").setBold());
                intro.add(" a realizar o tratamento dos meus dados pessoais, sensíveis ou não, para as finalidades relacionadas ao meu contrato de trabalho, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD).");
                document.add(intro);

                // Cláusulas
                addClauseAsSection(document, "1. FINALIDADE DO TRATAMENTO",
                                "Os dados pessoais serão utilizados para fins de registro de empregados, cumprimento de obrigações legais (eSocial, CAGED, RAIS), concessão de benefícios, controle de ponto, pagamento de salários e outras rotinas trabalhistas.");

                addClauseAsSection(document, "2. COMPARTILHAMENTO DE DADOS",
                                "A empresa poderá compartilhar os dados com órgãos públicos, contabilidade externa, instituições financeiras para pagamento, operadoras de benefícios e outros terceiros estritamente necessários para a execução do contrato.");

                addClauseAsSection(document, "3. SEGURANÇA E DIREITOS",
                                "A empresa adotará medidas de segurança para proteger os dados. O titular tem direito a confirmação da existência de tratamento, acesso, correção e demais direitos previstos no Art. 18 da LGPD.");

                // Assinaturas
                addSignatures(document, request, company);
        }

        private void addClauseAsSection(Document document, String title, String content) {
                document.add(new Paragraph(title).setBold().setFontSize(9f).setMarginTop(8f).setMarginBottom(2f));
                document.add(new Paragraph(content).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED)
                                .setMarginBottom(5f));
        }

        private Cell createLabelValueCell(String label, String value) {
                Paragraph p = new Paragraph();
                p.add(new Text(label).setBold().setFontSize(9f));
                p.add(new Text(" " + (value != null && !value.isEmpty() ? value : "-")).setFontSize(10f));
                return new Cell().add(p).setPadding(5f);
        }

        private Paragraph createSectionHeader(String title) {
                return new Paragraph(title)
                                .setBold()
                                .setFontSize(11f)
                                .setFontColor(com.itextpdf.kernel.colors.DeviceRgb.RED)
                                .setMarginTop(15f)
                                .setMarginBottom(5f)
                                .setBorderLeft(
                                                new com.itextpdf.layout.borders.SolidBorder(
                                                                com.itextpdf.kernel.colors.DeviceRgb.RED, 3f))
                                .setPaddingLeft(5f);
        }

        private void addSignatures(Document document, LGPDConsentRequest request, Company company) {
                String city = request.getCity() != null ? request.getCity()
                                : (company != null && company.getCity() != null ? company.getCity()
                                                : "_______________");
                String date = request.getDate() != null
                                ? request.getDate()
                                                .format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy",
                                                                new Locale("pt", "BR")))
                                : LocalDate.now().format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy",
                                                new Locale("pt", "BR")));

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginTop(30f)
                                .setMarginBottom(40f)
                                .setFontSize(10f);
                document.add(dateLoc);

                Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 100 }))
                                .useAllAvailableWidth();

                Cell cell = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(request.getEmployeeName().toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("Assinatura do Funcionário").setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                sigTable.addCell(cell);
                document.add(sigTable);
        }

}
