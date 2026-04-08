package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.ClientContractRequest;
import com.z7design.secured_guard.dto.ContractTemplatePreviewRequest;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.CompanyConfig;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.CompanyConfigRepository;
import com.z7design.secured_guard.service.StandardReportLayoutService.DocumentWithPdf;
import com.z7design.secured_guard.util.CompanyDataFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClientContractStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final CompanyRepository companyRepository;
        private final CompanyConfigRepository companyConfigRepository;

        private static final String DEFAULT_REPORT_TITLE = "Contrato de Prestação de Serviços";

        public byte[] generatePdf(ClientContractRequest request) {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        CompanyConfig companyConfig = resolveCompanyConfigForPdf(request);

                        String reportTitle = companyConfig.getHeaderText() != null
                                        && !companyConfig.getHeaderText().isEmpty()
                                                        ? companyConfig.getHeaderText()
                                                        : DEFAULT_REPORT_TITLE;

                        // Buscar empresa para o layout: request > config.companyId > primeira empresa
                        UUID companyId = request.getCompanyId();
                        if (companyId == null && companyConfig.getCompanyId() != null) {
                                companyId = companyConfig.getCompanyId();
                                log.info("Usando companyId da configuração: {}", companyId);
                        }
                        if (companyId == null) {
                                log.warn("companyId não fornecido, tentando buscar a primeira empresa cadastrada");
                                companyId = companyRepository.findAll().stream()
                                                .findFirst()
                                                .map(Company::getId)
                                                .orElse(null);
                        }
                        if (companyId == null) {
                                throw new ResourceNotFoundException(
                                                "Nenhuma empresa cadastrada. Cadastre uma empresa e ative uma configuração antes de gerar o contrato em PDF.");
                        }

                        // Mesmo padrão visual dos contratos de trabalho e relatórios: template PNG + margens.
                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(companyId)
                                        .reportTitle(reportTitle)
                                        .topMargin(100f)
                                        .bottomMargin(50f)
                                        .includeEmailInFooter(true)
                                        .landscape(false)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company, companyConfig);

                        document.close();
                        return outputStream.toByteArray();
                } catch (ResourceNotFoundException e) {
                        throw e;
                } catch (IllegalArgumentException e) {
                        throw e;
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF do Contrato de Cliente", e);
                        throw new RuntimeException("Erro ao gerar PDF do Contrato de Cliente", e);
                }
        }

        /**
         * Resolve {@link CompanyConfig} para PDF: ID explícito, config ativa no banco, ou
         * fallback sintético a partir da empresa (evita falha em ambientes sem config ativa).
         */
        private CompanyConfig resolveCompanyConfigForPdf(ClientContractRequest request) {
                if (request.getCompanyConfigId() != null) {
                        return companyConfigRepository
                                        .findFirstByIdOrderByCreatedAtDesc(request.getCompanyConfigId())
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Configuração da empresa não encontrada"));
                }
                Optional<CompanyConfig> active = companyConfigRepository
                                .findFirstByActiveTrueOrderByCreatedAtDesc();
                if (active.isPresent()) {
                        return active.get();
                }
                UUID resolvedCompanyId = request.getCompanyId();
                if (resolvedCompanyId == null) {
                        resolvedCompanyId = companyRepository.findAll().stream()
                                        .findFirst()
                                        .map(Company::getId)
                                        .orElse(null);
                }
                if (resolvedCompanyId == null) {
                        throw new ResourceNotFoundException(
                                        "Nenhuma configuração de empresa ativa e nenhuma empresa cadastrada. "
                                                        + "Cadastre uma empresa e ative uma configuração, ou informe companyId no contrato.");
                }
                final UUID companyId = resolvedCompanyId;
                Company company = companyRepository.findById(companyId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Empresa não encontrada com ID: " + companyId));
                log.warn("PDF contrato: sem CompanyConfig ativa — usando dados sintéticos da empresa {} ({})",
                                companyId, company.getName());
                return buildSyntheticCompanyConfig(company);
        }

        private CompanyConfig buildSyntheticCompanyConfig(Company company) {
                String cnpjDigits = company.getCnpj() != null ? company.getCnpj().replaceAll("[^0-9]", "") : "";
                if (cnpjDigits.length() != 14) {
                        cnpjDigits = "00000000000000";
                }
                String cepDigits = company.getZipCode() != null ? company.getZipCode().replaceAll("[^0-9]", "") : "";
                if (cepDigits.length() < 8) {
                        cepDigits = "00000000";
                } else if (cepDigits.length() > 8) {
                        cepDigits = cepDigits.substring(0, 8);
                }
                String uf = "MG";
                if (company.getState() != null && company.getState().length() >= 2) {
                        uf = company.getState().substring(0, 2).toUpperCase();
                }
                return CompanyConfig.builder()
                                .companyId(company.getId())
                                .name(company.getName() != null && !company.getName().isBlank()
                                                ? company.getName()
                                                : "Empresa")
                                .cnpj(cnpjDigits)
                                .address(company.getAddress() != null ? company.getAddress() : "-")
                                .city(company.getCity() != null ? company.getCity() : "-")
                                .state(uf)
                                .zipCode(cepDigits)
                                .phone(company.getPhone() != null ? company.getPhone() : "-")
                                .email(company.getEmail() != null ? company.getEmail() : "contato@empresa.com")
                                .website(company.getWebsite())
                                .logoUrl(company.getLogoUrl())
                                .headerText(null)
                                .footerText("")
                                .contractTerms("")
                                .active(false)
                                .build();
        }

        /**
         * Gera PDF de preview do template com placeholders (ex: [NOME DO CLIENTE]).
         * Suporta overrides de headerText, footerText e contractTerms para alterações não salvas.
         */
        public byte[] generatePreviewPdf(ContractTemplatePreviewRequest previewRequest) {
                UUID companyId = previewRequest.getCompanyId();
                if (companyId == null) {
                        throw new IllegalArgumentException("companyId é obrigatório para preview");
                }
                Company company = companyRepository.findById(companyId)
                                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));

                CompanyConfig companyConfig = resolveCompanyConfig(previewRequest, company);

                ClientContractRequest request = ClientContractRequest.builder()
                                .companyId(companyId)
                                .companyConfigId(previewRequest.getCompanyConfigId())
                                .clientName("[NOME DO CLIENTE]")
                                .clientDocument("[DOCUMENTO DO CLIENTE]")
                                .clientAddress("[ENDEREÇO DO CLIENTE]")
                                .contractNumber("PREVIEW")
                                .description("[DESCRIÇÃO DOS SERVIÇOS]")
                                .value(BigDecimal.ZERO)
                                .startDate(LocalDate.now())
                                .endDate(null)
                                .paymentTerms("Pagamento mensal até o dia 10 de cada mês")
                                .city(company.getCity())
                                .contractDate(LocalDate.now())
                                .build();

                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);
                        String reportTitle = companyConfig.getHeaderText() != null
                                        && !companyConfig.getHeaderText().isEmpty()
                                                        ? companyConfig.getHeaderText()
                                                        : DEFAULT_REPORT_TITLE;

                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(companyId)
                                        .reportTitle(reportTitle)
                                        .topMargin(100f)
                                        .bottomMargin(50f)
                                        .includeEmailInFooter(true)
                                        .landscape(false)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();

                        addContent(document, request, company, companyConfig);

                        document.close();
                        return outputStream.toByteArray();
                } catch (ResourceNotFoundException e) {
                        throw e;
                } catch (IllegalArgumentException e) {
                        throw e;
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF de preview do template", e);
                        throw new RuntimeException("Erro ao gerar PDF de preview do template", e);
                }
        }

        private CompanyConfig resolveCompanyConfig(ContractTemplatePreviewRequest req, Company company) {
                if (req.getCompanyConfigId() != null) {
                        return companyConfigRepository
                                                .findFirstByIdOrderByCreatedAtDesc(req.getCompanyConfigId())
                                                .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Configuração da empresa não encontrada"));
                }
                // Config virtual com overrides (alterações não salvas)
                return CompanyConfig.builder()
                                .companyId(company.getId())
                                .name(company.getName())
                                .cnpj(company.getCnpj() != null ? company.getCnpj() : "00000000000000")
                                .address(company.getAddress() != null ? company.getAddress() : "-")
                                .city(company.getCity() != null ? company.getCity() : "-")
                                .state(company.getState() != null ? company.getState() : "MG")
                                .zipCode(company.getZipCode() != null ? company.getZipCode() : "00000000")
                                .phone(company.getPhone() != null ? company.getPhone() : "-")
                                .email(company.getEmail() != null ? company.getEmail() : "contato@empresa.com")
                                .website(company.getWebsite())
                                .logoUrl(company.getLogoUrl())
                                .headerText(req.getHeaderText() != null ? req.getHeaderText() : DEFAULT_REPORT_TITLE)
                                .footerText(req.getFooterText() != null ? req.getFooterText() : "")
                                .contractTerms(req.getContractTerms() != null ? req.getContractTerms() : "")
                                .active(true)
                                .build();
        }

        private void addContent(Document document, ClientContractRequest request, Company company,
                        CompanyConfig config) {
                document.add(new Paragraph("").setMarginBottom(14f));
                // Seção: Partes Contratantes
                document.add(createSectionHeader("1. PARTES CONTRATANTES").setMarginTop(6f));

                Table partiesTable = new Table(UnitValue.createPercentArray(new float[] { 50, 50 }))
                                .useAllAvailableWidth();

                // Contratada (Empresa)
                Cell contractorCell = new Cell().setPadding(5f);
                contractorCell.add(new Paragraph("CONTRATADA:").setBold().setFontSize(9f));
                contractorCell.add(new Paragraph(company.getName()).setBold().setFontSize(10f));
                contractorCell
                                .add(new Paragraph("CNPJ: " + CompanyDataFormatter.formatCnpj(company.getCnpj()))
                                                .setFontSize(9f));
                contractorCell
                                .add(new Paragraph("Endereço: " + CompanyDataFormatter.formatFullAddress(company))
                                                .setFontSize(9f));
                partiesTable.addCell(contractorCell);

                // Contratante (Cliente)
                Cell clientCell = new Cell().setPadding(5f);
                clientCell.add(new Paragraph("CONTRATANTE:").setBold().setFontSize(9f));
                clientCell.add(new Paragraph(
                                request.getClientName() != null ? request.getClientName() : "-")
                                                .setBold().setFontSize(10f));
                clientCell.add(new Paragraph(
                                "Doc: " + (request.getClientDocument() != null ? request.getClientDocument() : "-"))
                                                .setFontSize(9f));
                clientCell.add(
                                new Paragraph("Endereço: "
                                                + (request.getClientAddress() != null ? request.getClientAddress()
                                                                : "-"))
                                                .setFontSize(9f));
                partiesTable.addCell(clientCell);

                document.add(partiesTable);

                // Seção: Objeto e Valores
                document.add(createSectionHeader("2. OBJETO E VALORES"));

                Table detailsTable = new Table(UnitValue.createPercentArray(new float[] { 30, 70 }))
                                .useAllAvailableWidth();

                detailsTable.addCell(createLabelCell("Número do Contrato:"));
                detailsTable.addCell(createValueCell(
                                request.getContractNumber() != null ? request.getContractNumber() : "-"));

                detailsTable.addCell(createLabelCell("Valor Total:"));
                detailsTable.addCell(createValueCell("R$ " + formatMoney(request.getValue())));

                detailsTable.addCell(createLabelCell("Data de Início:"));
                detailsTable.addCell(createValueCell(formatDate(request.getStartDate())));

                detailsTable.addCell(createLabelCell("Data de Término:"));
                detailsTable.addCell(createValueCell(
                                request.getEndDate() != null ? formatDate(request.getEndDate())
                                                : "Prazo Indeterminado"));

                detailsTable.addCell(createLabelCell("Descrição:"));
                detailsTable.addCell(createValueCell(
                                request.getDescription() != null ? request.getDescription() : "-"));

                document.add(detailsTable);

                // Termos de Pagamento
                if (request.getPaymentTerms() != null && !request.getPaymentTerms().isEmpty()) {
                        document.add(new Paragraph("CONDIÇÕES DE PAGAMENTO").setBold().setFontSize(10f)
                                        .setMarginTop(10f));
                        document.add(new Paragraph(request.getPaymentTerms()).setFontSize(10f)
                                        .setTextAlignment(TextAlignment.JUSTIFIED));
                }

                // Termos Padrão da Empresa (com substituição de placeholders básicos se
                // necessário)
                if (config.getContractTerms() != null && !config.getContractTerms().isEmpty()) {
                        document.add(new Paragraph("CLÁUSULAS CONTRATUAIS").setBold().setFontSize(10f)
                                        .setMarginTop(10f));
                        String terms = processPlaceholders(config.getContractTerms(), request, company);
                        document.add(new Paragraph(terms).setFontSize(10f).setTextAlignment(TextAlignment.JUSTIFIED));
                }

                // Termos Adicionais
                if (request.getAdditionalTerms() != null && !request.getAdditionalTerms().isEmpty()) {
                        document.add(new Paragraph("TERMOS ADICIONAIS").setBold().setFontSize(10f).setMarginTop(10f));
                        document.add(new Paragraph(request.getAdditionalTerms()).setFontSize(10f)
                                        .setTextAlignment(TextAlignment.JUSTIFIED));
                }

                // Observações
                if (request.getObservations() != null && !request.getObservations().isEmpty()) {
                        document.add(new Paragraph("OBSERVAÇÕES").setBold().setFontSize(10f).setMarginTop(10f));
                        document.add(new Paragraph(request.getObservations()).setFontSize(10f).setItalic());
                }

                // Assinaturas
                addSignatures(document, request, company, config);
        }

        private String processPlaceholders(String terms, ClientContractRequest request, Company company) {
                if (terms == null)
                        return "";
                return terms
                                .replace("{{clientName}}",
                                                request.getClientName() != null ? request.getClientName() : "")
                                .replace("{{contractNumber}}",
                                                request.getContractNumber() != null ? request.getContractNumber() : "")
                                .replace("{{companyName}}", company.getName() != null ? company.getName() : "");
        }

        private Cell createLabelCell(String label) {
                return new Cell().add(new Paragraph(label).setBold().setFontSize(9f)).setPadding(5f);
        }

        private Cell createValueCell(String value) {
                return new Cell().add(new Paragraph(value != null ? value : "-").setFontSize(10f)).setPadding(5f);
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

        private void addSignatures(Document document, ClientContractRequest request, Company company,
                        CompanyConfig config) {
                String city = request.getCity() != null ? request.getCity()
                                : (config.getCity() != null ? config.getCity() : "_______________");
                String date = formatDateExtended(
                                request.getContractDate() != null ? request.getContractDate() : LocalDate.now());

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginTop(30f)
                                .setMarginBottom(40f)
                                .setFontSize(10f);
                document.add(dateLoc);

                Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 45, 10, 45 }))
                                .useAllAvailableWidth();

                String contractorName = company.getName() != null ? company.getName() : "";
                String clientSignName = request.getClientName() != null ? request.getClientName() : "";

                Cell cell1 = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(contractorName.toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("CONTRATADA").setTextAlignment(TextAlignment.CENTER).setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell spacer = new Cell().setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                Cell cell2 = new Cell()
                                .add(new Paragraph("_________________________________")
                                                .setTextAlignment(TextAlignment.CENTER))
                                .add(new Paragraph(clientSignName.toUpperCase())
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f).setBold())
                                .add(new Paragraph("CONTRATANTE").setTextAlignment(TextAlignment.CENTER)
                                                .setFontSize(8f))
                                .setBorder(com.itextpdf.layout.borders.Border.NO_BORDER);

                sigTable.addCell(cell1);
                sigTable.addCell(spacer);
                sigTable.addCell(cell2);

                document.add(sigTable);
        }

        private String formatMoney(BigDecimal value) {
                if (value == null)
                        return "0,00";
                return NumberFormat.getCurrencyInstance(new Locale("pt", "BR"))
                                .format(value)
                                .replace("R$", "")
                                .trim();
        }

        private String formatDate(LocalDate date) {
                return date != null ? date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "";
        }

        private String formatDateExtended(LocalDate date) {
                return date != null
                                ? date.format(DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy",
                                                new Locale("pt", "BR")))
                                : "";
        }
}
