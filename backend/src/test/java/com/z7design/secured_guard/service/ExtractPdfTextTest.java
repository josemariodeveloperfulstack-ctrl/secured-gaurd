package com.z7design.secured_guard.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

public class ExtractPdfTextTest {

    @Test
    public void testExtractPdfText() throws IOException {
        File pdfFile = new File("c:/dev/secured-guard/backend/docs/modelo-contrato-comercial/Minuta contratual Promover Vigilancia e servicos - vig-servicos.pdf");
        System.out.println("Checking PDF file: " + pdfFile.getAbsolutePath());
        if (!pdfFile.exists()) {
            System.err.println("File does not exist!");
            return;
        }

        try (PDDocument document = PDDocument.load(pdfFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            File outputFile = new File("c:/dev/secured-guard/scratch/extracted_pdf_text.txt");
            outputFile.getParentFile().mkdirs();
            try (FileWriter writer = new FileWriter(outputFile)) {
                writer.write(text);
            }
            System.out.println("SUCCESSFULLY EXTRACTED PDF TEXT to " + outputFile.getAbsolutePath());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
