package com.z7design.secured_guard.service;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.repository.CompanyRepository;

class StandardReportLayoutPageNumberTest {

    @Test
    void stampPageNumbersOnPdf_shouldIncludePaginaText() throws Exception {
        StandardReportLayoutService service = new StandardReportLayoutService(
                Mockito.mock(CompanyRepository.class));

        byte[] rawPdf;
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document doc = new Document(pdfDoc);
            doc.add(new Paragraph("Conteudo de teste"));
            doc.close();
            rawPdf = baos.toByteArray();
        }

        ReportLayoutConfig config = ReportLayoutConfig.builder()
                .companyId(UUID.randomUUID())
                .showPageNumbers(true)
                .build();

        byte[] stamped = service.stampPageNumbersOnPdf(rawPdf, config);

        String extracted;
        try (PdfReader reader = new PdfReader(new ByteArrayInputStream(stamped))) {
            PdfDocument pdfDoc = new PdfDocument(reader);
            extracted = PdfTextExtractor.getTextFromPage(pdfDoc.getPage(1));
            pdfDoc.close();
        }

        assertTrue(extracted.contains("Página 1 de 1"), "Texto extraído: " + extracted);
    }
}
