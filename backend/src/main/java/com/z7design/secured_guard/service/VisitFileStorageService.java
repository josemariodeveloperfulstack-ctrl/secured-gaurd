package com.z7design.secured_guard.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

/**
 * Armazenamento de arquivos relacionados a visitas de supervisor (fotos da ata,
 * fotos do posto, fotos de entrega de EPI).
 *
 * <p>Mesmo padrão do {@code FileStorageService} (filesystem local), mas com
 * diretório próprio. Quando migrarmos para Contabo Object Storage, basta trocar
 * a implementação concreta — interface pública (storeFile/deleteFile) fica igual.
 *
 * <p>Diretório default: {@code ./uploads/visits} (configurável via
 * {@code app.file.visit-upload-dir} no application.properties).
 */
@Service
@Slf4j
public class VisitFileStorageService {

    private static final String BASE_URL = "/uploads/visits";

    private final Path storageLocation;

    public VisitFileStorageService(
        @Value("${app.file.visit-upload-dir:./uploads/visits}") String uploadDir) {
        this.storageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageLocation);
        } catch (Exception ex) {
            throw new IllegalStateException(
                "Não foi possível criar o diretório de upload de visitas: " + uploadDir, ex);
        }
        log.info("Diretório de upload de visitas inicializado em: {}", this.storageLocation);
    }

    /**
     * Persiste o arquivo no filesystem e retorna a URL relativa (servida estaticamente).
     */
    public String storeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio.");
        }
        String original = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename(), "arquivo"));
        if (original.contains("..")) {
            throw new IllegalArgumentException("Nome de arquivo inválido: " + original);
        }
        String safeName = UUID.randomUUID() + "_" + original.replaceAll("\\s+", "_");
        try {
            Path target = this.storageLocation.resolve(safeName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            log.info("Arquivo de visita armazenado: {}", target);
            return BASE_URL + "/" + safeName;
        } catch (IOException ex) {
            log.error("Erro ao armazenar arquivo de visita {}: {}", original, ex.getMessage());
            throw new IllegalStateException(
                "Falha ao armazenar arquivo de visita: " + original, ex);
        }
    }

    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return;
        }
        try {
            String fileName;
            if (fileUrl.startsWith(BASE_URL)) {
                fileName = fileUrl.substring(BASE_URL.length() + 1);
            } else if (fileUrl.contains("/")) {
                fileName = fileUrl.substring(fileUrl.lastIndexOf('/') + 1);
            } else {
                fileName = fileUrl;
            }
            Path filePath = this.storageLocation.resolve(fileName).normalize();
            if (!filePath.startsWith(this.storageLocation)) {
                log.warn("Tentativa de acessar arquivo fora do diretório de visitas: {}", filePath);
                return;
            }
            if (Files.deleteIfExists(filePath)) {
                log.info("Arquivo de visita removido: {}", fileName);
            }
        } catch (Exception ex) {
            log.error("Erro ao remover arquivo de visita {}: {}", fileUrl, ex.getMessage());
        }
    }
}
