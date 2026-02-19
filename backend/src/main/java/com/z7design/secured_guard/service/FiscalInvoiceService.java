package com.z7design.secured_guard.service;

import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.FiscalInvoice;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.FiscalInvoiceRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FiscalInvoiceService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of("pdf", "xml");
    private static final int SENTINEL_NO_FILTER = -1;

    @Value("${app.upload.base-dir:uploads}")
    private String uploadDir;

    private final FiscalInvoiceRepository repository;
    private final UserRepository userRepository;

    public FiscalInvoice upload(MultipartFile file, String clientName, Integer periodMonth, Integer periodYear, String username) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo não pode estar vazio");
        }
        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            originalName = "documento";
        }
        String ext = getExtension(originalName).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Apenas arquivos PDF e XML são permitidos");
        }
        byte[] content = file.getBytes();
        return saveFile(content, originalName, ext, clientName, periodMonth, periodYear, username);
    }

    /**
     * Importa PDF e XML da mesma nota fiscal e valida se o CNPJ é o mesmo em ambos.
     * O nome do cliente é obtido do XML (dest/xNome) quando disponível.
     */
    public List<FiscalInvoice> uploadPdfAndXml(MultipartFile filePdf, MultipartFile fileXml,
                                              Integer periodMonth, Integer periodYear, String username) throws IOException {
        if (filePdf == null || filePdf.isEmpty()) {
            throw new IllegalArgumentException("O arquivo PDF é obrigatório");
        }
        if (fileXml == null || fileXml.isEmpty()) {
            throw new IllegalArgumentException("O arquivo XML é obrigatório");
        }
        String extPdf = getExtension(filePdf.getOriginalFilename()).toLowerCase();
        String extXml = getExtension(fileXml.getOriginalFilename()).toLowerCase();
        if (!"pdf".equals(extPdf)) {
            throw new IllegalArgumentException("O primeiro arquivo deve ser um PDF");
        }
        if (!"xml".equals(extXml)) {
            throw new IllegalArgumentException("O segundo arquivo deve ser um XML");
        }

        byte[] xmlBytes = fileXml.getBytes();
        byte[] pdfBytes = filePdf.getBytes();

        FiscalCnpjExtractor.XmlData xmlData = FiscalCnpjExtractor.extractFromXml(new ByteArrayInputStream(xmlBytes));
        java.util.Optional<String> cnpjXmlOpt = xmlData.cnpj;
        java.util.Optional<String> cnpjPdfOpt = FiscalCnpjExtractor.extractCnpjFromPdf(new ByteArrayInputStream(pdfBytes));

        if (cnpjXmlOpt.isEmpty()) {
            throw new IllegalArgumentException("Não foi possível extrair o CNPJ do XML da NFe. Verifique se o arquivo é um XML de nota fiscal eletrônica válido.");
        }
        if (cnpjPdfOpt.isEmpty()) {
            throw new IllegalArgumentException("Não foi possível extrair o CNPJ do PDF. O PDF pode estar em imagem ou o CNPJ não está legível.");
        }

        String cnpjXml = FiscalCnpjExtractor.normalizeCnpj(cnpjXmlOpt.get());
        String cnpjPdf = FiscalCnpjExtractor.normalizeCnpj(cnpjPdfOpt.get());
        if (!cnpjXml.equals(cnpjPdf)) {
            throw new IllegalArgumentException(
                "O CNPJ do PDF e do XML não conferem. XML: " + formatCnpj(cnpjXml) + ", PDF: " + formatCnpj(cnpjPdf) + ". Envie a nota fiscal (PDF) e o XML que correspondem ao mesmo documento.");
        }

        String clientName = xmlData.clientName
            .filter(s -> !s.isBlank())
            .orElse("Cliente " + formatCnpj(cnpjXml));
        // Período = data de emissão da nota (do XML), para agrupar todas as notas do mesmo período na mesma pasta
        int year = xmlData.emissionYear.filter(y -> y > 0).orElse(periodYear != null && periodYear > 0 ? periodYear : java.time.Year.now().getValue());
        int month = xmlData.emissionMonth.filter(m -> m >= 1 && m <= 12).orElse(periodMonth != null && periodMonth >= 1 && periodMonth <= 12 ? periodMonth : java.time.LocalDate.now().getMonthValue());

        String originalPdf = filePdf.getOriginalFilename() != null ? filePdf.getOriginalFilename() : "nota.pdf";
        String originalXml = fileXml.getOriginalFilename() != null ? fileXml.getOriginalFilename() : "nota.xml";

        FiscalInvoice savedPdf = saveFile(pdfBytes, originalPdf, "pdf", clientName, month, year, username);
        FiscalInvoice savedXml = saveFile(xmlBytes, originalXml, "xml", clientName, month, year, username);
        return List.of(savedPdf, savedXml);
    }

    private static String formatCnpj(String digits) {
        if (digits == null || digits.length() != 14) return digits;
        return digits.replaceAll("^(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{2})$", "$1.$2.$3/$4-$5");
    }

    private FiscalInvoice saveFile(byte[] content, String originalName, String ext, String clientName,
                                   Integer periodMonth, Integer periodYear, String username) throws IOException {
        String fileType = ext.toUpperCase();
        int y = periodYear != null && periodYear > 0 ? periodYear : java.time.Year.now().getValue();
        int m = periodMonth != null && periodMonth >= 1 && periodMonth <= 12 ? periodMonth : 1;
        // Armazena na pasta por período: uploads/fiscal/ANO/MES/ para agrupar todas as notas do mesmo período
        Path basePath = Paths.get(uploadDir, "fiscal", String.valueOf(y), String.format("%02d", m));
        Files.createDirectories(basePath);
        String uniqueName = UUID.randomUUID().toString() + "." + ext;
        Path targetPath = basePath.resolve(uniqueName);
        Files.write(targetPath, content);

        FiscalInvoice entity = new FiscalInvoice();
        entity.setClientName(clientName != null ? clientName.trim() : "Cliente não informado");
        entity.setPeriodMonth(m);
        entity.setPeriodYear(y);
        entity.setFileType(fileType);
        entity.setFilePath("fiscal/" + y + "/" + String.format("%02d", m) + "/" + uniqueName);
        entity.setFileNameOriginal(originalName);
        entity.setFileSize((long) content.length);
        if (username != null) {
            userRepository.findByUsername(username).ifPresent(entity::setCreatedBy);
        }
        return repository.save(entity);
    }

    public Page<FiscalInvoice> findByFilters(Integer periodYear, Integer periodMonth, String clientName, String fileType, Pageable pageable) {
        int year = (periodYear != null && periodYear > 0) ? periodYear : SENTINEL_NO_FILTER;
        int month = (periodMonth != null && periodMonth > 0) ? periodMonth : SENTINEL_NO_FILTER;
        String client = (clientName != null && !clientName.isBlank()) ? clientName.trim() : "";
        String type = (fileType != null && !fileType.isBlank()) ? fileType : "";
        return repository.findByFilters(year, month, client, type, pageable);
    }

    public FiscalInvoice findById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nota fiscal não encontrada"));
    }

    public Path getFilePath(FiscalInvoice invoice) {
        Path path = Paths.get(uploadDir, invoice.getFilePath());
        if (!Files.exists(path)) {
            throw new ResourceNotFoundException("Arquivo não encontrado no servidor");
        }
        return path;
    }

    public byte[] buildZipDownload(String groupBy, Integer periodYear, Integer periodMonth, String clientName, String fileType) throws IOException {
        int year = (periodYear != null && periodYear > 0) ? periodYear : SENTINEL_NO_FILTER;
        int month = (periodMonth != null && periodMonth > 0) ? periodMonth : SENTINEL_NO_FILTER;
        String client = (clientName != null && !clientName.isBlank()) ? clientName.trim() : "";
        String type = (fileType != null && !fileType.isBlank()) ? fileType : "";
        List<FiscalInvoice> list = repository.findAllByFilters(year, month, client, type);
        if (list.isEmpty()) {
            return new byte[0];
        }

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (FiscalInvoice inv : list) {
                Path filePath = Paths.get(uploadDir, inv.getFilePath());
                if (!Files.exists(filePath)) continue;
                String zipEntryName = buildZipEntryPath(groupBy, inv);
                ZipEntry entry = new ZipEntry(zipEntryName);
                zos.putNextEntry(entry);
                Files.copy(filePath, zos);
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    private String buildZipEntryPath(String groupBy, FiscalInvoice inv) {
        String safeClient = sanitizeFileName(inv.getClientName());
        String periodFolder = inv.getPeriodYear() + "_" + String.format("%02d", inv.getPeriodMonth());
        String fileName = (inv.getFileNameOriginal() != null && !inv.getFileNameOriginal().isBlank())
                ? sanitizeFileName(inv.getFileNameOriginal())
                : inv.getId().toString() + "." + inv.getFileType().toLowerCase();

        return switch (groupBy != null ? groupBy.toUpperCase() : "PERIOD") {
            case "CLIENT" -> safeClient + "/" + periodFolder + "/" + fileName;
            case "TYPE" -> inv.getFileType() + "/" + periodFolder + "/" + safeClient + "/" + fileName;
            default -> periodFolder + "/" + safeClient + "/" + fileName;
        };
    }

    private String sanitizeFileName(String name) {
        if (name == null) return "arquivo";
        return name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
    }

    private String getExtension(String filename) {
        int i = filename.lastIndexOf('.');
        return i > 0 ? filename.substring(i + 1) : "";
    }

    public void deleteById(UUID id) {
        FiscalInvoice inv = findById(id);
        try {
            Path path = Paths.get(uploadDir, inv.getFilePath());
            if (Files.exists(path)) {
                Files.delete(path);
            }
        } catch (IOException e) {
            log.warn("Não foi possível remover arquivo físico: {}", inv.getFilePath());
        }
        repository.delete(inv);
    }
}
