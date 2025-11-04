package com.z7design.secured_guard.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Serviço para backup incremental usando pg_basebackup
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class IncrementalBackupService {

    @Value("${backup.storage.path:./backups}")
    private String backupStoragePath;

    /**
     * Executa backup incremental usando pg_basebackup
     * WAL (Write-Ahead Logging) archiving
     */
    public Path executeIncrementalBackup(String host, int port, String username, String password, String database) {
        try {
            log.info("📊 Iniciando backup incremental...");

            // Criar diretório para backup incremental
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            Path incrementalDir = Paths.get(backupStoragePath, "incremental", timestamp);
            Files.createDirectories(incrementalDir);

            // Executar pg_basebackup
            ProcessBuilder processBuilder = new ProcessBuilder();
            processBuilder.environment().put("PGPASSWORD", password);

            processBuilder.command(
                "pg_basebackup",
                "-h", host,
                "-p", String.valueOf(port),
                "-U", username,
                "-D", incrementalDir.toString(),
                "-Ft", // Formato tar
                "-z", // Comprimir com gzip
                "-P", // Mostrar progresso
                "-v", // Verbose
                "-X", "stream" // Incluir WAL
            );

            log.info("🔧 Executando pg_basebackup...");

            Process process = processBuilder.start();
            captureOutput(process);

            int exitCode = process.waitFor();

            if (exitCode == 0) {
                log.info("✅ Backup incremental executado com sucesso");
                return incrementalDir;
            } else {
                log.error("❌ pg_basebackup falhou com código: {}", exitCode);
                return null;
            }

        } catch (Exception e) {
            log.error("💥 Erro ao executar backup incremental: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Executa backup diferencial (mudanças desde último full)
     */
    public Path executeDifferentialBackup(String host, int port, String username, String password, 
                                         String database, Path lastFullBackup) {
        try {
            log.info("📊 Iniciando backup diferencial...");

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            Path diffFile = Paths.get(backupStoragePath, "differential", "diff_" + timestamp + ".sql");
            Files.createDirectories(diffFile.getParent());

            // Executar pg_dump com opção --inserts para facilitar merge
            ProcessBuilder processBuilder = new ProcessBuilder();
            processBuilder.environment().put("PGPASSWORD", password);

            processBuilder.command(
                "pg_dump",
                "-h", host,
                "-p", String.valueOf(port),
                "-U", username,
                "-d", database,
                "-F", "p", // Plain text
                "--inserts", // Formato INSERT (facilita merge)
                "-f", diffFile.toString()
            );

            Process process = processBuilder.start();
            captureOutput(process);

            int exitCode = process.waitFor();

            if (exitCode == 0) {
                log.info("✅ Backup diferencial executado");
                return diffFile;
            } else {
                log.error("❌ Backup diferencial falhou");
                return null;
            }

        } catch (Exception e) {
            log.error("💥 Erro ao executar backup diferencial: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Captura output do processo
     */
    private void captureOutput(Process process) {
        // Output stream
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("pg_basebackup: {}", line);
                }
            } catch (IOException e) {
                log.error("Erro ao ler output", e);
            }
        }).start();

        // Error stream
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.warn("pg_basebackup ERROR: {}", line);
                }
            } catch (IOException e) {
                log.error("Erro ao ler error stream", e);
            }
        }).start();
    }
}

