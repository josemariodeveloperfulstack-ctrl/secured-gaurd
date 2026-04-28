package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.EmailAccount;
import com.z7design.secured_guard.model.ScheduledEmail;
import com.z7design.secured_guard.model.ScheduledEmailAttachment;
import com.z7design.secured_guard.repository.ScheduledEmailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmailScheduleService {

    private final ScheduledEmailRepository scheduledEmailRepository;

    @Transactional
    public void schedule(EmailAccount account, String to, String cc, String bcc, String subject, String body, LocalDateTime time, List<MultipartFile> attachments) {
        ScheduledEmail scheduled = ScheduledEmail.builder()
                .account(account)
                .toAddress(to)
                .ccAddress(cc)
                .bccAddress(bcc)
                .subject(subject)
                .body(body)
                .scheduledTime(time)
                .status("PENDING")
                .attachments(new ArrayList<>())
                .build();

        if (attachments != null) {
            for (MultipartFile file : attachments) {
                try {
                    if (file.isEmpty()) continue;
                    
                    scheduled.getAttachments().add(ScheduledEmailAttachment.builder()
                            .scheduledEmail(scheduled)
                            .filename(file.getOriginalFilename())
                            .contentType(file.getContentType())
                            .content(file.getBytes())
                            .build());
                } catch (Exception e) {
                    throw new RuntimeException("Erro ao processar anexo para agendamento", e);
                }
            }
        }

        scheduledEmailRepository.save(scheduled);
    }
}
