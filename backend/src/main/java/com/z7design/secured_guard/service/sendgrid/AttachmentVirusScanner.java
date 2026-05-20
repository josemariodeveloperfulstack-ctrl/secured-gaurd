package com.z7design.secured_guard.service.sendgrid;

import java.nio.file.Path;

/**
 * RNF03 — ponto de extensão para ClamAV ou serviço externo antes de promover anexo.
 */
public interface AttachmentVirusScanner {

    /**
     * @param file arquivo já persistido em disco (quarentena)
     * @return true se seguro para marcar {@code CLEAN}
     */
    boolean scan(Path file);
}
