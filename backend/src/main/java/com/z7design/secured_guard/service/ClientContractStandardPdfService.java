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
import com.z7design.secured_guard.model.CompanyContractTemplate;
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
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.repository.WorkPostRepository;
import java.util.List;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClientContractStandardPdfService {

        private final StandardReportLayoutService pdfLayoutService;
        private final CompanyRepository companyRepository;
        private final CompanyConfigRepository companyConfigRepository;
        private final WorkPostRepository workPostRepository;
        private final CompanyContractTemplateService companyContractTemplateService;

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
                                        .bottomMargin(65f) // 50pt + 15pt (20px) de espaçamento adicionado ao topo do rodapé
                                        .includeEmailInFooter(true)
                                        .landscape(false)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();
                        Company company = docWithPdf.getCompany();

                        addContent(document, request, company, companyConfig);

                        return docWithPdf.closeAndGetPdfBytes(outputStream, pdfLayoutService);
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
         * Resolve {@link CompanyConfig} para PDF: ID explícito, config da empresa,
         * config ativa no banco, ou fallback sintético a partir da empresa.
         */
        private CompanyConfig resolveCompanyConfigForPdf(ClientContractRequest request) {
                if (request.getCompanyConfigId() != null) {
                        return companyConfigRepository
                                        .findFirstByIdOrderByCreatedAtDesc(request.getCompanyConfigId())
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                        "Configuração da empresa não encontrada"));
                }
                UUID resolvedCompanyId = request.getCompanyId();
                if (resolvedCompanyId != null) {
                        final UUID companyIdForLookup = resolvedCompanyId;
                        Optional<CompanyConfig> byCompany = companyConfigRepository
                                        .findFirstByCompanyIdAndActiveTrueOrderByUpdatedAtDesc(companyIdForLookup)
                                        .or(() -> companyConfigRepository
                                                        .findFirstByCompanyIdOrderByUpdatedAtDesc(companyIdForLookup));
                        if (byCompany.isPresent()) {
                                return byCompany.get();
                        }
                }
                Optional<CompanyConfig> active = companyConfigRepository
                                .findFirstByActiveTrueOrderByCreatedAtDesc();
                if (active.isPresent()) {
                        return active.get();
                }
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
                log.warn("PDF contrato: sem CompanyConfig — usando dados sintéticos da empresa {} ({})",
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

                // Preview da minuta de 14 cláusulas (ARMADA/DESARMADA/PORTARIA)
                if (previewRequest.getContractTemplateKey() != null
                                && !previewRequest.getContractTemplateKey().isBlank()) {
                        return generateTemplatePreviewPdf(previewRequest, company);
                }

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
                                        .bottomMargin(65f) // 50pt + 15pt (20px) de espaçamento adicionado ao topo do rodapé
                                        .includeEmailInFooter(true)
                                        .landscape(false)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();

                        addContent(document, request, company, companyConfig);

                        return docWithPdf.closeAndGetPdfBytes(outputStream, pdfLayoutService);
                } catch (ResourceNotFoundException e) {
                        throw e;
                } catch (IllegalArgumentException e) {
                        throw e;
                } catch (Exception e) {
                        log.error("Erro ao gerar PDF de preview do template", e);
                        throw new RuntimeException("Erro ao gerar PDF de preview do template", e);
                }
        }

        /**
         * Preview da minuta de 14 cláusulas com placeholders, usando overrides
         * das cláusulas quando o usuário está editando e ainda não salvou.
         */
        private byte[] generateTemplatePreviewPdf(ContractTemplatePreviewRequest previewRequest, Company company) {
                try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                        PdfWriter writer = new PdfWriter(outputStream);

                        String rawKey = previewRequest.getContractTemplateKey();
                        String templateKey = (rawKey != null && !rawKey.isBlank())
                                        ? rawKey.trim().toUpperCase()
                                        : "ARMADA";

                        CompanyContractTemplate template = companyContractTemplateService
                                        .resolveEntity(company.getId(), templateKey)
                                        .orElse(null);

                        // Aplica overrides de cláusulas não salvas (índice 0 = cláusula 1)
                        CompanyContractTemplate effective = template;
                        if (previewRequest.getClauses() != null && !previewRequest.getClauses().isEmpty()) {
                                CompanyContractTemplate base = template != null ? template
                                                : CompanyContractTemplate.builder()
                                                                .companyId(company.getId())
                                                                .templateKey(templateKey)
                                                                .title(CompanyContractTemplateService.defaultTitle(templateKey))
                                                                .build();
                                effective = CompanyContractTemplate.builder()
                                                .companyId(base.getCompanyId())
                                                .templateKey(base.getTemplateKey())
                                                .title(base.getTitle() != null ? base.getTitle() : CompanyContractTemplateService.defaultTitle(templateKey))
                                                .clause1(getOverride(previewRequest.getClauses(), 0, base.getClause1()))
                                                .clause2(getOverride(previewRequest.getClauses(), 1, base.getClause2()))
                                                .clause3(getOverride(previewRequest.getClauses(), 2, base.getClause3()))
                                                .clause4(getOverride(previewRequest.getClauses(), 3, base.getClause4()))
                                                .clause5(getOverride(previewRequest.getClauses(), 4, base.getClause5()))
                                                .clause6(getOverride(previewRequest.getClauses(), 5, base.getClause6()))
                                                .clause7(getOverride(previewRequest.getClauses(), 6, base.getClause7()))
                                                .clause8(getOverride(previewRequest.getClauses(), 7, base.getClause8()))
                                                .clause9(getOverride(previewRequest.getClauses(), 8, base.getClause9()))
                                                .clause10(getOverride(previewRequest.getClauses(), 9, base.getClause10()))
                                                .clause11(getOverride(previewRequest.getClauses(), 10, base.getClause11()))
                                                .clause12(getOverride(previewRequest.getClauses(), 11, base.getClause12()))
                                                .clause13(getOverride(previewRequest.getClauses(), 12, base.getClause13()))
                                                .clause14(getOverride(previewRequest.getClauses(), 13, base.getClause14()))
                                                .build();
                        } else if (effective == null) {
                                effective = CompanyContractTemplate.builder()
                                                .companyId(company.getId())
                                                .templateKey(templateKey)
                                                .title(CompanyContractTemplateService.defaultTitle(templateKey))
                                                .build();
                        }

                        final CompanyContractTemplate eff = effective;
                        String signingCity = CompanyDataFormatter.resolveContractSigningCity(company);
                        if (signingCity == null || signingCity.isBlank()) {
                                signingCity = company.getCity() != null ? company.getCity() : "";
                        }

                        ClientContractRequest request = ClientContractRequest.builder()
                                        .companyId(company.getId())
                                        .contractTemplateKey(templateKey)
                                        .clientName("[NOME DO CLIENTE]")
                                        .clientDocument("[CNPJ/CPF DO CLIENTE]")
                                        .clientAddress("[ENDEREÇO DO CLIENTE]")
                                        .contractNumber("PREVIEW")
                                        .description("[DESCRIÇÃO DOS SERVIÇOS]")
                                        .value(BigDecimal.ZERO)
                                        .startDate(LocalDate.now())
                                        .city(signingCity)
                                        .contractDate(LocalDate.now())
                                        .build();

                        String reportTitle = (eff != null && eff.getTitle() != null && !eff.getTitle().isBlank())
                                        ? eff.getTitle()
                                        : CompanyContractTemplateService.defaultTitle(templateKey);

                        ReportLayoutConfig config = ReportLayoutConfig.builder()
                                        .companyId(company.getId())
                                        .reportTitle(reportTitle)
                                        .topMargin(100f)
                                        .bottomMargin(65f) // 50pt + 15pt (20px) de espaçamento adicionado ao topo do rodapé
                                        .includeEmailInFooter(true)
                                        .landscape(false)
                                        .build();

                        DocumentWithPdf docWithPdf = pdfLayoutService.createDocumentWithLayout(writer, config);
                        Document document = docWithPdf.getDocument();

                        CompanyConfig companyConfig = resolveCompanyConfig(previewRequest, company);
                        addCompanyContractTemplateContent(document, request, company, companyConfig, eff);

                        return docWithPdf.closeAndGetPdfBytes(outputStream, pdfLayoutService);
                } catch (ResourceNotFoundException e) {
                        throw e;
                } catch (IllegalArgumentException e) {
                        throw e;
                } catch (Exception e) {
                        log.error("Erro ao gerar preview da minuta de 14 cláusulas", e);
                        throw new RuntimeException("Erro ao gerar preview da minuta", e);
                }
        }

        private static String getOverride(java.util.List<String> overrides, int index, String fallback) {
                if (overrides != null && index < overrides.size()) {
                        String value = overrides.get(index);
                        return value != null ? value : fallback;
                }
                return fallback;
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
                
                // Minutas oficiais de 14 cláusulas (ARMADA, DESARMADA, PORTARIA)
                if (request.getContractTemplateKey() != null && !request.getContractTemplateKey().isBlank()) {
                        log.info("Gerando contrato com a minuta de 14 cláusulas: {}", request.getContractTemplateKey());
                        addCompanyContractTemplateContent(document, request, company, config);
                        return;
                }
                if (request.getContractTemplate() != null && !request.getContractTemplate().isBlank()) {
                        log.info("Gerando contrato comercial baseado no template: {}", request.getContractTemplate());
                        addCommercialTemplateContent(document, request, company, config);
                } else {
                        log.info("Gerando contrato com layout padrão genérico.");
                        generateDefaultLayoutContent(document, request, company, config);
                }
        }

        /**
         * Renderiza a minuta oficial (ARMADA/DESARMADA/PORTARIA) com as 14 cláusulas
         * do template resolvido para a empresa, qualificação das partes e assinaturas.
         */
        private void addCompanyContractTemplateContent(Document document, ClientContractRequest request, Company company,
                        CompanyConfig config) {
                addCompanyContractTemplateContent(document, request, company, config, null);
        }

        private void addCompanyContractTemplateContent(Document document, ClientContractRequest request, Company company,
                        CompanyConfig config, CompanyContractTemplate templateOverride) {
                String rawKey = request != null ? request.getContractTemplateKey() : null;
                String templateKey = (rawKey != null && !rawKey.isBlank())
                                ? rawKey.trim().toUpperCase()
                                : "ARMADA";
                CompanyContractTemplate template = templateOverride != null ? templateOverride
                                : companyContractTemplateService
                                                .resolveEntity(request != null ? request.getCompanyId() : company.getId(), templateKey)
                                                .orElse(null);

                document.add(new Paragraph("").setMarginBottom(10f));

                // Título
                String title = template != null && template.getTitle() != null && !template.getTitle().isBlank()
                                ? template.getTitle()
                                : CompanyContractTemplateService.defaultTitle(templateKey);
                document.add(new Paragraph(title)
                                .setBold().setFontSize(13f)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(15f));

                // Qualificação das Partes
                document.add(new Paragraph("CONTRATANTE:").setBold().setFontSize(10f).setMarginBottom(2f));
                document.add(new Paragraph(String.format(
                                "%s%s%s%s%s",
                                request != null && request.getClientName() != null ? request.getClientName() : "[RAZÃO SOCIAL / NOME]",
                                request != null && request.getClientDocument() != null ? " — CNPJ/CPF: " + request.getClientDocument() : "",
                                request != null && request.getClientAddress() != null ? " — Endereço: " + request.getClientAddress() : "",
                                request != null && request.getClientPhone() != null ? " — Tel: " + request.getClientPhone() : "",
                                request != null && request.getClientEmail() != null ? " — E-mail: " + request.getClientEmail() : ""))
                                .setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(8f));

                document.add(new Paragraph("CONTRATADA:").setBold().setFontSize(10f).setMarginBottom(2f));
                document.add(new Paragraph(String.format(
                                "%s — CNPJ: %s — Endereço: %s — Tel: %s — E-mail: %s",
                                company.getName() != null ? company.getName() : "-",
                                CompanyDataFormatter.formatCnpj(company.getCnpj()),
                                CompanyDataFormatter.formatFullAddress(company),
                                company.getPhone() != null ? company.getPhone() : "-",
                                company.getEmail() != null ? company.getEmail() : "-"))
                                .setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(12f));

                // Preâmbulo
                document.add(new Paragraph(
                                "As PARTES acima qualificadas, por seus representantes legais ao final identificados e assinados, têm entre si justo e acertado o presente Contrato de Prestação de Serviços, que se regerá pelas disposições do Código Civil brasileiro, pelas normas laborais vigentes e pelas seguintes cláusulas e condições pactuadas de comum acordo:")
                                .setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(12f));

                // Postos de trabalho vinculados (se houver)
                if (request != null) {
                        addWorkPostsTable(document, request);
                }

                // As 14 cláusulas do template
                if (template != null) {
                        String[] clauses = {
                                        template.getClause1(), template.getClause2(), template.getClause3(),
                                        template.getClause4(), template.getClause5(), template.getClause6(),
                                        template.getClause7(), template.getClause8(), template.getClause9(),
                                        template.getClause10(), template.getClause11(), template.getClause12(),
                                        template.getClause13(), template.getClause14()
                        };
                        boolean hasAnyClause = false;
                        for (String clause : clauses) {
                                if (clause == null || clause.isBlank()) {
                                        continue;
                                }
                                hasAnyClause = true;
                                document.add(new Paragraph(clause)
                                                .setFontSize(9f)
                                                .setTextAlignment(TextAlignment.JUSTIFIED)
                                                .setMarginBottom(10f));
                        }
                        if (!hasAnyClause) {
                                document.add(new Paragraph("[Nenhuma cláusula cadastrada no modelo: " + templateKey + "]")
                                                .setFontSize(9f).setItalic());
                        }
                } else {
                        document.add(new Paragraph("[Modelo de contrato não encontrado: " + templateKey + "]")
                                        .setFontSize(9f).setItalic());
                }

                // Fechamento e assinaturas
                document.add(new Paragraph(
                                "E, por estarem assim justas e contratadas, as PARTES firmam o presente instrumento em 02 (duas) vias de igual teor e forma para um só efeito, perante as duas testemunhas abaixo qualificadas, ou realizam a sua assinatura digital integrada.")
                                .setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginTop(10f));

                addSignatures(document, request, company, config, company.getName());
        }

        /**
         * Tabela de postos de trabalho vinculados (usada nas minutas de 14 cláusulas).
         */
        private void addWorkPostsTable(Document document, ClientContractRequest request) {
                if (request.getWorkPostIds() == null || request.getWorkPostIds().isEmpty()) {
                        return;
                }
                try {
                        List<WorkPost> posts = workPostRepository.findAllById(request.getWorkPostIds());
                        if (posts.isEmpty()) {
                                return;
                        }
                        document.add(new Paragraph("Relação de Setores de Trabalho Contratados:").setBold()
                                        .setFontSize(9f).setMarginBottom(4f));
                        Table postsTable = new Table(UnitValue.createPercentArray(new float[] { 25, 20, 20, 20, 15 }))
                                        .useAllAvailableWidth().setMarginBottom(10f);
                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Setor / Código").setBold().setFontSize(8f)));
                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Escala / Turno").setBold().setFontSize(8f)));
                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Posto").setBold().setFontSize(8f)));
                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Cidade/UF").setBold().setFontSize(8f)));
                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Efetivo").setBold().setFontSize(8f)));
                        for (WorkPost post : posts) {
                                postsTable.addCell(new Cell().add(new Paragraph(post.getName() + " ("
                                                + (post.getPostCode() != null ? post.getPostCode() : "N/D") + ")")
                                                .setFontSize(8f)));
                                postsTable.addCell(new Cell().add(new Paragraph(
                                                (post.getWorkSchedule() != null ? post.getWorkSchedule() : "-") + "\n"
                                                                + (post.getShiftDescription() != null ? post.getShiftDescription() : "-"))
                                                .setFontSize(8f)));
                                postsTable.addCell(new Cell().add(new Paragraph(
                                                post.getType() != null ? post.getType().toString() : "-").setFontSize(8f)));
                                postsTable.addCell(new Cell().add(new Paragraph(
                                                (post.getCity() != null ? post.getCity() : "-") + "/"
                                                                + (post.getState() != null ? post.getState() : "-"))
                                                .setFontSize(8f)));
                                postsTable.addCell(new Cell().add(new Paragraph(
                                                post.getRequiredVigilantes() != null ? post.getRequiredVigilantes().toString() : "1")
                                                .setFontSize(8f)));
                        }
                        document.add(postsTable);
                } catch (Exception e) {
                        log.error("Erro ao buscar setores de trabalho para o PDF", e);
                }
        }

        private void generateDefaultLayoutContent(Document document, ClientContractRequest request, Company company,
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
                addSignatures(document, request, company, config, null);
        }

        private void addCommercialTemplateContent(Document document, ClientContractRequest request, Company company,
                        CompanyConfig config) {
                document.add(new Paragraph("").setMarginBottom(10f));

                boolean isVigilancia = "VIGILANCIA_PATRIMONIAL".equalsIgnoreCase(request.getContractTemplate());
                boolean isCombinado = "COMBINADO".equalsIgnoreCase(request.getContractTemplate());

                // Determinar dados da Contratada baseada na minuta e na empresa selecionada
                String contractedName = "PROMOVER SERVIÇOS ADMINISTRATIVOS LTDA";
                String contractedCnpj = "57.303.811/0001-89";
                String contractedAddress = "Rua Pelegrino de Paula Ferreira, 77, Bairro Centro, Contagem/MG, CEP: 32017-400";

                if (request.getContractedCompanyCnpj() != null && !request.getContractedCompanyCnpj().isBlank()) {
                        String cleanCnpj = request.getContractedCompanyCnpj().replaceAll("[^0-9]", "");
                        if ("43576260000112".equals(cleanCnpj) || cleanCnpj.contains("43576260")) {
                                contractedName = "PROMOVER VIGILÂNCIA PATRIMONIAL LTDA";
                                contractedCnpj = "43.576.260/0001-12";
                                contractedAddress = "Rua Coronel João Camargos, 267, Bairro Centro, Contagem/MG, CEP: 32040-620";
                        } else {
                                contractedName = "PROMOVER SERVIÇOS ADMINISTRATIVOS LTDA";
                                contractedCnpj = "57.303.811/0001-89";
                                contractedAddress = "Rua Pelegrino de Paula Ferreira, 77, Bairro Centro, Contagem/MG, CEP: 32017-400";
                        }
                } else if (isVigilancia) {
                        contractedName = "PROMOVER VIGILÂNCIA PATRIMONIAL LTDA";
                        contractedCnpj = "43.576.260/0001-12";
                        contractedAddress = "Rua Coronel João Camargos, 267, Bairro Centro, Contagem/MG, CEP: 32040-620";
                }

                // Título em destaque no iText
                document.add(new Paragraph("CONTRATO DE PRESTAÇÃO DE SERVIÇOS")
                                .setBold().setFontSize(14f)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(15f));

                // CLÁUSULA PRIMEIRA - Das Partes
                document.add(new Paragraph("CLÁUSULA PRIMEIRA - DAS PARTES CONTRATANTES").setBold().setFontSize(10f).setMarginBottom(4f));
                
                String contratanteText = String.format(
                                "CONTRATANTE: %s, com endereço situado a %s, inscrita no CNPJ/CPF sob nº %s, neste ato representada por %s, doravante denominada CONTRATANTE.",
                                request.getClientName() != null ? request.getClientName() : "[NOME DO CLIENTE]",
                                request.getClientAddress() != null ? request.getClientAddress() : "[ENDEREÇO DO CLIENTE]",
                                request.getClientDocument() != null ? request.getClientDocument() : "[DOCUMENTO DO CLIENTE]",
                                request.getRepresentativeName() != null ? request.getRepresentativeName() : "[REPRESENTANTE LEGAL]"
                );
                
                String contratadaText = String.format(
                                "CONTRATADA: %s, com sede na %s, inscrita no CNPJ sob o nº %s, doravante denominada CONTRATADA.",
                                contractedName, contractedAddress, contractedCnpj
                );

                document.add(new Paragraph(contratanteText).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(4f));
                document.add(new Paragraph(contratadaText).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(12f));

                // CLÁUSULA SEGUNDA - Do Objeto
                document.add(new Paragraph("CLÁUSULA SEGUNDA - DO OBJETO E DOS SETORES DE TRABALHO").setBold().setFontSize(10f).setMarginBottom(4f));
                
                String objetoBase = isVigilancia 
                                ? "Constitui objeto do presente Contrato a prestação, pela CONTRATADA ao CONTRATANTE, de serviços especializados de vigilância e segurança patrimonial ativa, através de mão de obra qualificada."
                                : "Constitui objeto do presente Contrato o fornecimento, pela CONTRATADA ao CONTRATANTE, de mão de obra qualificada para a realização de serviços administrativos, facilidades, apoio operacional e controle de portaria.";
                
                if (isCombinado) {
                        objetoBase = "Constitui objeto do presente Contrato a prestação de serviços integrados, envolvendo o fornecimento de mão de obra qualificada para facilidades administrativas, apoio operacional e vigilância patrimonial ativa.";
                }

                document.add(new Paragraph(objetoBase).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(6f));

                // Listar Setores de Trabalho vinculados se existirem
                if (request.getWorkPostIds() != null && !request.getWorkPostIds().isEmpty()) {
                        document.add(new Paragraph("Relação de Setores de Trabalho Contratados:").setBold().setFontSize(9f).setMarginBottom(4f));
                        
                        try {
                                List<WorkPost> posts = workPostRepository.findAllById(request.getWorkPostIds());
                                if (!posts.isEmpty()) {
                                        Table postsTable = new Table(UnitValue.createPercentArray(new float[] { 25, 20, 20, 20, 15 }))
                                                        .useAllAvailableWidth().setMarginBottom(10f);
                                        
                                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Setor / Código").setBold().setFontSize(8f)));
                                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Escala / Turno").setBold().setFontSize(8f)));
                                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Posto").setBold().setFontSize(8f)));
                                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Cidade/UF").setBold().setFontSize(8f)));
                                        postsTable.addHeaderCell(new Cell().add(new Paragraph("Efetivo").setBold().setFontSize(8f)));

                                        for (WorkPost post : posts) {
                                                postsTable.addCell(new Cell().add(new Paragraph(post.getName() + " (" + (post.getPostCode() != null ? post.getPostCode() : "N/D") + ")").setFontSize(8f)));
                                                postsTable.addCell(new Cell().add(new Paragraph((post.getWorkSchedule() != null ? post.getWorkSchedule() : "-") + "\n" + (post.getShiftDescription() != null ? post.getShiftDescription() : "-")).setFontSize(8f)));
                                                postsTable.addCell(new Cell().add(new Paragraph(post.getType() != null ? post.getType().toString() : "-").setFontSize(8f)));
                                                postsTable.addCell(new Cell().add(new Paragraph((post.getCity() != null ? post.getCity() : "-") + "/" + (post.getState() != null ? post.getState() : "-")).setFontSize(8f)));
                                                postsTable.addCell(new Cell().add(new Paragraph(post.getRequiredVigilantes() != null ? post.getRequiredVigilantes().toString() : "1").setFontSize(8f)));
                                        }
                                        document.add(postsTable);
                                } else {
                                        document.add(new Paragraph("Efetivos e setores de trabalho conforme proposta comercial em anexo.").setFontSize(9f).setItalic().setMarginBottom(6f));
                                }
                        } catch (Exception e) {
                                log.error("Erro ao buscar setores de trabalho para o PDF", e);
                                document.add(new Paragraph("Efetivos e setores de trabalho conforme proposta comercial em anexo.").setFontSize(9f).setItalic().setMarginBottom(6f));
                        }
                } else {
                        document.add(new Paragraph("Efetivos e setores de trabalho conforme proposta comercial em anexo.").setFontSize(9f).setItalic().setMarginBottom(6f));
                }

                // CLÁUSULA TERCEIRA - Obrigações da Contratada
                document.add(new Paragraph("CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DA CONTRATADA").setBold().setFontSize(10f).setMarginBottom(4f));
                int replacementHours = request.getReplacementTimeHours() != null ? request.getReplacementTimeHours() : 72;
                
                String obrigacaotrab = String.format(
                                "Fica a CONTRATADA obrigada a manter profissionais habilitados, devidamente treinados e uniformizados. É de inteira e exclusiva responsabilidade da CONTRATADA todos os encargos trabalhistas, previdenciários e securitários de seu pessoal. Fica também estabelecido que qualquer membro da equipe alocado será substituído em até %d (setenta e duas) horas em caso de falta, férias, licença ou por solicitação expressa da CONTRATANTE.",
                                replacementHours
                );

                if (isVigilancia) {
                        obrigacaotrab += String.format(
                                        " Tratando-se de vigilância patrimonial ativa, a CONTRATADA compromete-se a manter rondas periódicas de frequência de '%s' e assegurar que a ausência máxima ininterrupta no posto não ultrapasse %d minutos.",
                                        request.getPatrolFrequency() != null ? request.getPatrolFrequency() : "conforme plano de segurança",
                                        request.getMaxAbsenceMinutes() != null ? request.getMaxAbsenceMinutes() : 15
                        );
                }
                
                document.add(new Paragraph(obrigacaotrab).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(12f));

                // CLÁUSULA QUARTA - Obrigações da Contratante
                document.add(new Paragraph("CLÁUSULA QUARTA - DAS OBRIGAÇÕES DA CONTRATANTE").setBold().setFontSize(10f).setMarginBottom(4f));
                String obrigacaoContratante = "Fica a CONTRATANTE obrigada a franquear o acesso livre dos funcionários da CONTRATADA devidamente identificados aos locais de prestação de serviços, bem como disponibilizar a infraestrutura mínima necessária para o desempenho das funções e efetuar os pagamentos de forma pontual conforme acordado neste instrumento.";
                document.add(new Paragraph(obrigacaoContratante).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(12f));

                // CLÁUSULA QUINTA - Do Preço e Condições
                document.add(new Paragraph("CLÁUSULA QUINTA - DO PREÇO E DO REAJUSTE").setBold().setFontSize(10f).setMarginBottom(4f));
                
                BigDecimal monthlyVal = request.getMonthlyValue() != null ? request.getMonthlyValue() : request.getValue();
                String precoText = String.format(
                                "Pelos serviços ora contratados, a CONTRATANTE pagará à CONTRATADA o valor mensal fixo de R$ %s (conforme demonstrado em algarismos), sendo efetuado o pagamento nas condições a seguir: %s. O contrato será reajustado anualmente pela variação acumulada do IPCA/IBGE ou outro índice oficial substituto.",
                                formatMoney(monthlyVal),
                                request.getPaymentTerms() != null ? request.getPaymentTerms() : "até o 5º dia útil do mês subsequente"
                );
                document.add(new Paragraph(precoText).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(12f));

                // CLÁUSULA SEXTA - Da Vigência e Penalidades
                document.add(new Paragraph("CLÁUSULA SEXTA - DA VIGÊNCIA E DAS PENALIDADES").setBold().setFontSize(10f).setMarginBottom(4f));
                
                String dataFim = request.getEndDate() != null ? formatDate(request.getEndDate()) : "Prazo Indeterminado";
                String vigenciaText = String.format(
                                "O presente contrato entra em vigor na data de %s, com término previsto para %s. Fica pactuada multa penal correspondente a 10%% (dez por cento) sobre o saldo devedor ou conforme regras adicionais de multas: %s para a parte que descumprir as cláusulas contratuais, sem prejuízo da rescisão de pleno direito mediante aviso prévio de 30 dias.",
                                formatDate(request.getStartDate()),
                                dataFim,
                                request.getPenalties() != null && !request.getPenalties().isEmpty() ? request.getPenalties() : "multa padrão contratual de 10%"
                );
                document.add(new Paragraph(vigenciaText).setFontSize(9f).setTextAlignment(TextAlignment.JUSTIFIED).setMarginBottom(12f));

                // Observações Extras
                if (request.getObservations() != null && !request.getObservations().isEmpty()) {
                        document.add(new Paragraph("OBSERVAÇÕES COMPLEMENTARES").setBold().setFontSize(9f).setMarginBottom(2f));
                        document.add(new Paragraph(request.getObservations()).setFontSize(8.5f).setItalic().setMarginBottom(12f));
                }

                // Assinaturas
                addSignatures(document, request, company, config, contractedName);
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
                        CompanyConfig config, String contractorNameOverride) {
                String city = (request != null && request.getCity() != null && !request.getCity().isBlank())
                                ? request.getCity()
                                : (config != null && config.getCity() != null && !config.getCity().isBlank())
                                                ? config.getCity()
                                                : (company != null && company.getCity() != null && !company.getCity().isBlank())
                                                                ? company.getCity()
                                                                : "_______________";
                String date = formatDateExtended(
                                request != null && request.getContractDate() != null ? request.getContractDate() : LocalDate.now());

                Paragraph dateLoc = new Paragraph(city + ", " + date)
                                .setTextAlignment(TextAlignment.RIGHT)
                                .setMarginTop(30f)
                                .setMarginBottom(40f)
                                .setFontSize(10f);
                document.add(dateLoc);

                Table sigTable = new Table(UnitValue.createPercentArray(new float[] { 45, 10, 45 }))
                                .useAllAvailableWidth();

                String contractorName = contractorNameOverride != null ? contractorNameOverride
                                : (company.getName() != null ? company.getName() : "");
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
