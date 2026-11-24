package com.z7design.secured_guard.service.prospection;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

/**
 * E-mail informado por cada usuário para ser usado como Reply-To e assinatura
 * nos envios de apresentação comercial. Persistido por usuário em arquivo JSON,
 * seguindo o mesmo padrão das credenciais de prospecção.
 */
@Service
@Slf4j
public class ProspectionSenderEmailService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Path filePath;

    public ProspectionSenderEmailService(@Value("${app.upload.base-dir:uploads}") String baseDir) {
        String dir = baseDir != null && !baseDir.isBlank() ? baseDir : "uploads";
        this.filePath = Paths.get(dir, "prospection_sender_emails.json");
    }

    public synchronized String get(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        Map<String, Object> data = readAll();
        Object value = data.get(username);
        return value == null ? null : value.toString();
    }

    public synchronized String save(String username, String rawEmail) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Usuário não identificado");
        }
        String email = ProspectionContactQualifier.normalizeEmail(rawEmail);
        if (email == null) {
            throw new IllegalArgumentException("E-mail do remetente inválido");
        }
        Map<String, Object> data = readAll();
        data.put(username, email);
        try {
            File parent = filePath.toFile().getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), data);
        } catch (Exception e) {
            log.warn("Falha ao persistir e-mail de envio do usuário {}: {}", username, e.getMessage());
            throw new IllegalStateException("Não foi possível salvar o e-mail informado", e);
        }
        return email;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> readAll() {
        try {
            if (Files.exists(filePath)) {
                Object parsed = objectMapper.readValue(filePath.toFile(), Map.class);
                if (parsed instanceof Map<?, ?> map) {
                    return new HashMap<>((Map<String, Object>) map);
                }
            }
        } catch (Exception e) {
            log.warn("Falha ao ler e-mails de envio persistidos: {}", e.getMessage());
        }
        return new HashMap<>();
    }
}
