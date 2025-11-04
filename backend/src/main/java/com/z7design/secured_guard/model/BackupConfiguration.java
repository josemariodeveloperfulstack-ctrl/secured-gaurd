package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Configuração de backup do banco de dados
 * Suporta backup local e remoto (VPS)
 */
@Entity
@Table(name = "backup_configurations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupConfiguration {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false, unique = true)
    private String name; // "local", "vps", "ci", "dev", "test", "prod"
    
    @Column(nullable = false)
    private String type; // "LOCAL" ou "REMOTE"
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private com.z7design.secured_guard.model.BackupEnvironment environment; // CI, DEV, TEST, PROD
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private com.z7design.secured_guard.model.BackupType backupType = com.z7design.secured_guard.model.BackupType.FULL;
    
    // Configurações do Banco de Dados
    @Column(nullable = false)
    private String host;
    
    @Column(nullable = false)
    private Integer port;
    
    @Column(nullable = false)
    private String database;
    
    @Column(nullable = false)
    private String username;
    
    @Column(nullable = false)
    private String password; // ⚠️ Será criptografado
    
    // Configurações de Backup
    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean autoBackup = true; // Backup automático
    
    @Column(nullable = false)
    @Builder.Default
    private String schedule = "0 0 2 * * ?"; // Cron: Todo dia às 2h da manhã
    
    @Column(nullable = false)
    @Builder.Default
    private Integer retentionDays = 30; // Manter backups por 30 dias
    
    @Column(nullable = true)
    private String backupPath; // Caminho para salvar arquivos de backup
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean compressBackup = true; // Comprimir backup
    
    @Column(nullable = true)
    private LocalDateTime lastBackupDate;
    
    @Column(nullable = true)
    private String lastBackupStatus; // SUCCESS, FAILED, RUNNING
    
    @Column(nullable = true)
    private String lastBackupMessage;
    
    // Segurança
    @Column(nullable = false)
    @Builder.Default
    private Boolean encryptionEnabled = false;
    
    @Column(nullable = true)
    private String encryptionKey; // Chave de criptografia (armazenar no Vault em produção)
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean checksumEnabled = true;
    
    @Column(nullable = true)
    private String lastChecksum; // SHA-256 do último backup
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}

