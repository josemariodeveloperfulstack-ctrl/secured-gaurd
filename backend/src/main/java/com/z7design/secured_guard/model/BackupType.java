package com.z7design.secured_guard.model;

/**
 * Tipo de backup
 */
public enum BackupType {
    FULL,         // Backup completo
    INCREMENTAL,  // Apenas mudanças desde último backup
    DIFFERENTIAL, // Mudanças desde último full
    LOGS_ONLY     // Apenas logs (para CI)
}

