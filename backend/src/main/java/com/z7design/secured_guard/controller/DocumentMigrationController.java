package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.factory.DocumentLayoutFactory;
import com.z7design.secured_guard.factory.DocumentLayoutFactory.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller para informações sobre migração de documentos.
 * Fornece endpoints para monitorar o progresso da padronização de layout.
 */
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class DocumentMigrationController {

        private final DocumentLayoutFactory documentLayoutFactory;

        /**
         * Retorna o status geral de migração de documentos
         * GET /api/documents/migration-status
         */
        @GetMapping("/migration-status")
        public ResponseEntity<MigrationStatusResponse> getMigrationStatus() {
                log.info("📊 Consultando status de migração de documentos");

                MigrationStatus status = documentLayoutFactory.getMigrationStatus();
                List<WaveStatus> waveStatuses = documentLayoutFactory.getWaveStatuses();
                List<DocumentInfo> migrated = documentLayoutFactory.getMigratedDocuments();
                List<DocumentInfo> pending = documentLayoutFactory.getPendingDocuments();

                MigrationStatusResponse response = new MigrationStatusResponse(
                                status.total(),
                                status.migrated(),
                                status.pending(),
                                status.getPercentage(),
                                waveStatuses,
                                migrated,
                                pending);

                log.info("✅ Status de migração: {}/{} documentos migrados ({}%)",
                                status.migrated(), status.total(), String.format("%.1f", status.getPercentage()));

                return ResponseEntity.ok(response);
        }

        /**
         * Verifica se um documento específico usa o novo layout
         * GET /api/documents/{slug}/uses-new-layout
         */
        @GetMapping("/{slug}/uses-new-layout")
        public ResponseEntity<Map<String, Object>> checkNewLayout(@PathVariable String slug) {
                log.debug("🔍 Verificando se documento '{}' usa novo layout", slug);

                boolean usesNewLayout = documentLayoutFactory.useNewLayout(slug);

                return ResponseEntity.ok(Map.of(
                                "slug", slug,
                                "usesNewLayout", usesNewLayout));
        }

        /**
         * Lista todos os tipos de documentos
         * GET /api/documents/types
         */
        @GetMapping("/migration/types")
        public ResponseEntity<List<DocumentTypeInfo>> getAllDocumentTypes() {
                log.debug("📋 Listando todos os tipos de documentos");

                List<DocumentTypeInfo> types = java.util.Arrays.stream(LayoutDocumentType.values())
                                .map(type -> new DocumentTypeInfo(
                                                type.name(),
                                                type.getDisplayName(),
                                                type.getSlug(),
                                                type.getWave().name(),
                                                type.getWave().getDescription(),
                                                documentLayoutFactory.useNewLayout(type)))
                                .toList();

                return ResponseEntity.ok(types);
        }

        /**
         * Response para status de migração
         */
        public record MigrationStatusResponse(
                        int total,
                        int migrated,
                        int pending,
                        double percentage,
                        List<WaveStatus> waves,
                        List<DocumentInfo> migratedDocuments,
                        List<DocumentInfo> pendingDocuments) {
        }

        /**
         * Informações detalhadas de um tipo de documento
         */
        public record DocumentTypeInfo(
                        String type,
                        String displayName,
                        String slug,
                        String wave,
                        String waveDescription,
                        boolean usesNewLayout) {
        }
}
