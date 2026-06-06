package com.z7design.secured_guard.service;

import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
public class TesseractService {
    private static final Logger logger = LoggerFactory.getLogger(TesseractService.class);
    private static final String TRAINED_DATA = "por.traineddata";

    private final Tesseract tesseract = new Tesseract();
    private final boolean tesseractEnabled;
    private final String configuredDatapath;
    private boolean tesseractAvailable = false;

    public TesseractService(
            @Value("${tesseract.enabled:true}") boolean tesseractEnabled,
            @Value("${tesseract.datapath:}") String configuredDatapath) {
        this.tesseractEnabled = tesseractEnabled;
        this.configuredDatapath = configuredDatapath;
        if (!tesseractEnabled) {
            logger.info("Tesseract desabilitado por configuração (tesseract.enabled=false)");
            return;
        }
        try {
            initializeTesseract();
        } catch (Exception e) {
            logger.warn("Tesseract não está disponível. Funcionalidades OCR serão desabilitadas: {}", e.getMessage());
            tesseractAvailable = false;
        }
    }

    private void initializeTesseract() throws IOException {
        String datapath = resolveDatapath();
        if (datapath == null) {
            logger.info("Tesseract: tessdata não encontrado — OCR local desabilitado (use Gemini ou monte /app/tessdata no container)");
            tesseractAvailable = false;
            return;
        }

        File trainedDataFile = new File(datapath, TRAINED_DATA);
        if (!trainedDataFile.isFile()) {
            logger.info("Tesseract: {} não encontrado em {} — OCR local desabilitado", TRAINED_DATA, datapath);
            tesseractAvailable = false;
            return;
        }

        tesseract.setDatapath(datapath);
        tesseract.setLanguage("por");
        tesseractAvailable = true;
        logger.info("Tesseract configurado. Datapath: {}, idioma: por", datapath);
    }

    /**
     * Resolve datapath: propriedade externa, diretório no filesystem ou extração do classpath (JAR).
     */
    private String resolveDatapath() throws IOException {
        if (StringUtils.hasText(configuredDatapath)) {
            Path external = Path.of(configuredDatapath);
            if (Files.isDirectory(external)) {
                return external.toAbsolutePath().toString();
            }
            logger.warn("tesseract.datapath configurado mas diretório não existe: {}", configuredDatapath);
        }

        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();

        Resource tessdataRoot = resolver.getResource("classpath:tessdata/");
        if (tessdataRoot.exists()) {
            try {
                return tessdataRoot.getFile().getAbsolutePath();
            } catch (IOException ignored) {
                // Dentro do JAR — extrair abaixo
            }
        }

        Resource[] trainedFiles = resolver.getResources("classpath:tessdata/*.traineddata");
        if (trainedFiles.length == 0) {
            return null;
        }

        Path tempDir = Files.createTempDirectory("secured-guard-tessdata");
        tempDir.toFile().deleteOnExit();
        for (Resource trainedFile : trainedFiles) {
            String filename = trainedFile.getFilename();
            if (filename == null) {
                continue;
            }
            Path target = tempDir.resolve(filename);
            try (InputStream in = trainedFile.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            target.toFile().deleteOnExit();
        }
        logger.info("Tesseract: tessdata extraído do JAR para {}", tempDir);
        return tempDir.toAbsolutePath().toString();
    }

    public String extractTextFromImage(File imageFile) throws TesseractException {
        if (!tesseractAvailable) {
            logger.debug("Tesseract indisponível — retornando texto vazio");
            return "";
        }

        logger.info("Iniciando extração de texto da imagem: {}", imageFile.getName());
        String result = tesseract.doOCR(imageFile);
        logger.info("Texto extraído com sucesso da imagem: {}", imageFile.getName());
        return result;
    }

    public String extractTextFromPdf(MultipartFile pdfFile) throws IOException, TesseractException {
        if (!tesseractAvailable) {
            logger.debug("Tesseract indisponível — retornando texto vazio");
            return "";
        }

        logger.info("Iniciando extração de texto do PDF: {}", pdfFile.getOriginalFilename());

        Path tempDir = Files.createTempDirectory("pdf_temp");
        File tempPdfFile = new File(tempDir.toFile(), pdfFile.getOriginalFilename());

        try {
            pdfFile.transferTo(tempPdfFile);
            logger.info("PDF salvo temporariamente em: {}", tempPdfFile.getAbsolutePath());
            return tesseract.doOCR(tempPdfFile);
        } finally {
            if (tempPdfFile.exists()) {
                tempPdfFile.delete();
            }
            Files.deleteIfExists(tempDir);
        }
    }

    public boolean isAvailable() {
        return tesseractAvailable;
    }

    public boolean isEnabled() {
        return tesseractEnabled;
    }
}
