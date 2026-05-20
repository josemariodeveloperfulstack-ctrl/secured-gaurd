package com.z7design.secured_guard.service.sendgrid;

import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Component
public class NoopAttachmentVirusScanner implements AttachmentVirusScanner {

    @Override
    public boolean scan(Path file) {
        return true;
    }
}
