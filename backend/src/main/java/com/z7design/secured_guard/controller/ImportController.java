package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ImportResultDto;
import com.z7design.secured_guard.service.ImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/funcionarios")
@RequiredArgsConstructor
@Slf4j
public class ImportController {

    private final ImportService importService;

    @PostMapping("/import")
    public ResponseEntity<ImportResultDto> importEmployees(@RequestParam("file") MultipartFile file) {
        log.info("📥 Importação de funcionários - arquivo recebido: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
        if (file == null || file.isEmpty()) {
            log.warn("Arquivo de importação ausente ou vazio");
            return ResponseEntity.badRequest().body(ImportResultDto.builder()
                    .totalRows(0)
                    .inserted(0)
                    .updated(0)
                    .skipped(0)
                    .errors(java.util.List.of("Arquivo não enviado ou vazio. Envie um PDF contendo CPFs e WhatsApps"))
                    .build());
        }
        ImportResultDto result = importService.importPdf(file);
        return ResponseEntity.ok(result);
    }
}


