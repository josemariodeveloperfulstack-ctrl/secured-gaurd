package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.EmailAccount;
import com.z7design.secured_guard.model.EmailCache;
import com.z7design.secured_guard.model.EmailRule;
import com.z7design.secured_guard.model.ScheduledEmail;
import com.z7design.secured_guard.repository.EmailAccountRepository;
import com.z7design.secured_guard.repository.EmailCacheRepository;
import com.z7design.secured_guard.repository.EmailRuleRepository;
import com.z7design.secured_guard.repository.ScheduledEmailRepository;
import com.z7design.secured_guard.service.EmailReadService;
import com.z7design.secured_guard.service.EmailScheduleService;
import com.z7design.secured_guard.service.EmailSendService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/webmail")
@RequiredArgsConstructor
public class EmailController {

    private final EmailAccountRepository accountRepository;
    private final EmailCacheRepository cacheRepository;
    private final EmailRuleRepository ruleRepository;
    private final ScheduledEmailRepository scheduledRepository;
    private final EmailReadService readService;
    private final EmailSendService sendService;
    private final EmailScheduleService scheduleService;
    private final com.z7design.secured_guard.service.EncryptionService encryptionService;
    private final com.z7design.secured_guard.repository.UserRepository userRepository;

    @GetMapping("/accounts/{userId}")
    public ResponseEntity<List<EmailAccount>> getUserAccounts(@PathVariable UUID userId) {
        return ResponseEntity.ok(accountRepository.findByUserId(userId));
    }

    @GetMapping("/cache/{accountId}")
    public ResponseEntity<Page<EmailCache>> getEmails(
            @PathVariable UUID accountId,
            @RequestParam(defaultValue = "INBOX") String folder,
            Pageable pageable) {
        return ResponseEntity.ok(cacheRepository.findByAccountIdAndFolderOrderByReceivedDateDesc(accountId, folder, pageable));
    }

    @GetMapping("/{accountId}/read/{uid}")
    public ResponseEntity<Map<String, Object>> readEmail(@PathVariable UUID accountId, @PathVariable Long uid) {
        return ResponseEntity.ok(readService.readEmailByUid(accountId, uid));
    }

    @PostMapping("/{accountId}/send")
    public ResponseEntity<String> sendEmail(
            @PathVariable UUID accountId,
            @RequestParam String to,
            @RequestParam(required = false) String cc,
            @RequestParam(required = false) String bcc,
            @RequestParam String subject,
            @RequestParam String htmlBody,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime scheduledTime,
            @RequestParam(required = false) List<MultipartFile> attachments) {
            
        EmailAccount account = accountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
            
        if (scheduledTime != null && scheduledTime.isAfter(LocalDateTime.now())) {
            scheduleService.schedule(account, to, cc, bcc, subject, htmlBody, scheduledTime, attachments);
            return ResponseEntity.ok("E-mail agendado com sucesso");
        } else {
            sendService.sendEmail(account, to, cc, bcc, subject, htmlBody, attachments);
            return ResponseEntity.ok("Enviado com sucesso");
        }
    }

    @GetMapping("/{accountId}/rules")
    public ResponseEntity<List<EmailRule>> getRules(@PathVariable UUID accountId) {
        return ResponseEntity.ok(ruleRepository.findByAccountIdAndActiveTrue(accountId));
    }

    @PostMapping("/{accountId}/rules")
    public ResponseEntity<EmailRule> createRule(@PathVariable UUID accountId, @RequestBody EmailRule rule) {
        EmailAccount account = accountRepository.findById(accountId).orElseThrow();
        rule.setAccount(account);
        return ResponseEntity.ok(ruleRepository.save(rule));
    }

    @DeleteMapping("/rules/{ruleId}")
    public ResponseEntity<Void> deleteRule(@PathVariable UUID ruleId) {
        ruleRepository.deleteById(ruleId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{accountId}/scheduled")
    public ResponseEntity<List<ScheduledEmail>> getScheduled(@PathVariable UUID accountId) {
        return ResponseEntity.ok(scheduledRepository.findByAccountIdOrderByScheduledTimeDesc(accountId));
    }

    @PostMapping("/accounts")
    public ResponseEntity<EmailAccount> createAccount(@RequestBody Map<String, Object> payload) {
        UUID userId = UUID.fromString((String) payload.get("userId"));
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        EmailAccount account = new EmailAccount();
        account.setUser(user);
        account.setEmail((String) payload.get("email"));
        account.setImapHost((String) payload.get("imapHost"));
        account.setImapPort((Integer) payload.get("imapPort"));
        account.setSmtpHost((String) payload.get("smtpHost"));
        account.setSmtpPort((Integer) payload.get("smtpPort"));
        account.setStatus("ACTIVE");

        String password = (String) payload.get("password");
        account.setEncryptedPassword(encryptionService.encryptPassword(password));
        account.setSignature((String) payload.get("signature"));

        return ResponseEntity.ok(accountRepository.save(account));
    }

    @PutMapping("/{accountId}/signature")
    public ResponseEntity<EmailAccount> updateSignature(@PathVariable UUID accountId, @RequestBody Map<String, String> payload) {
        EmailAccount account = accountRepository.findById(accountId).orElseThrow();
        account.setSignature(payload.get("signature"));
        return ResponseEntity.ok(accountRepository.save(account));
    }

    @GetMapping("/{accountId}/folders")
    public ResponseEntity<List<String>> getFolders(@PathVariable UUID accountId) {
        return ResponseEntity.ok(readService.getFolders(accountId));
    }

    @PostMapping("/{accountId}/folders")
    public ResponseEntity<String> createFolder(@PathVariable UUID accountId, @RequestParam String folderName) {
        readService.createFolder(accountId, folderName);
        return ResponseEntity.ok("Pasta criada com sucesso");
    }

    @DeleteMapping("/{accountId}/folders/{folderName}/empty")
    public ResponseEntity<String> emptyTrash(@PathVariable UUID accountId, @PathVariable String folderName) {
        readService.emptyTrash(accountId, folderName);
        return ResponseEntity.ok("Lixeira limpa");
    }

    @PutMapping("/{accountId}/emails/{uid}/move")
    public ResponseEntity<String> moveEmail(@PathVariable UUID accountId, @PathVariable Long uid, @RequestParam String targetFolder) {
        readService.moveEmail(accountId, uid, targetFolder);
        return ResponseEntity.ok("Email movido com sucesso");
    }
}
