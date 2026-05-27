package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.sendgrid.EmailMarketingUnsubscribeRowDto;
import com.z7design.secured_guard.dto.sendgrid.AppendRecipientsRequest;
import com.z7design.secured_guard.dto.sendgrid.CreateEmailCampaignRequest;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignMetricsDto;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignSummaryDto;
import com.z7design.secured_guard.dto.sendgrid.EmailLogRowDto;
import com.z7design.secured_guard.dto.sendgrid.ImportRecipientsResponse;
import com.z7design.secured_guard.dto.sendgrid.SendEmailCampaignRequest;
import com.z7design.secured_guard.dto.sendgrid.UpdateEmailCampaignRequest;
import com.z7design.secured_guard.dto.sendgrid.UnsubscribeCheckRequest;
import com.z7design.secured_guard.dto.sendgrid.UnsubscribeCheckResponse;
import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.model.enums.EmailLogStatus;
import com.z7design.secured_guard.service.sendgrid.EmailCampaignService;
import com.z7design.secured_guard.service.sendgrid.EmailRecipientImportService;
import com.z7design.secured_guard.service.sendgrid.EmailUnsubscribeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/email-campaigns")
@RequiredArgsConstructor
public class EmailCampaignController {

    private final EmailCampaignService emailCampaignService;
    private final EmailRecipientImportService emailRecipientImportService;
    private final EmailUnsubscribeService emailUnsubscribeService;

    @GetMapping
    public ResponseEntity<List<EmailCampaignSummaryDto>> list() {
        return ResponseEntity.ok(emailCampaignService.listSummaries());
    }

    /**
     * Lista e-mails que cancelaram o recebimento de campanhas de marketing (opt-out confirmado).
     */
    @GetMapping("/marketing-unsubscribes")
    public ResponseEntity<Page<EmailMarketingUnsubscribeRowDto>> listMarketingUnsubscribes(Pageable pageable) {
        return ResponseEntity.ok(emailUnsubscribeService.listConfirmedUnsubscribes(pageable));
    }

    @PostMapping
    public ResponseEntity<EmailCampaign> create(@Valid @RequestBody CreateEmailCampaignRequest request) {
        EmailCampaign saved = emailCampaignService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmailCampaign> get(@PathVariable UUID id) {
        return ResponseEntity.ok(emailCampaignService.get(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<EmailCampaign> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateEmailCampaignRequest body) {
        return ResponseEntity.ok(emailCampaignService.updateCampaign(id, body));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        emailCampaignService.deleteCampaign(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<List<EmailLogRowDto>> logs(
            @PathVariable UUID id,
            @RequestParam(name = "status", required = false) String status) {
        Set<EmailLogStatus> statuses = parseStatuses(status);
        return ResponseEntity.ok(emailCampaignService.listLogs(id, statuses));
    }

    private Set<EmailLogStatus> parseStatuses(String raw) {
        if (raw == null || raw.isBlank()) return Set.of();
        Set<EmailLogStatus> out = EnumSet.noneOf(EmailLogStatus.class);
        for (String token : Arrays.asList(raw.split(","))) {
            try {
                out.add(EmailLogStatus.valueOf(token.trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) {
                // status desconhecido — ignora
            }
        }
        return out;
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<Void> send(@PathVariable UUID id, @Valid @RequestBody SendEmailCampaignRequest request) {
        emailCampaignService.sendCampaign(id, request);
        return ResponseEntity.accepted().build();
    }

    /** Pausa a campanha (mantém PENDING para retomada posterior). */
    @PostMapping("/{id}/pause")
    public ResponseEntity<Void> pause(@PathVariable UUID id) {
        emailCampaignService.pauseCampaign(id);
        return ResponseEntity.noContent().build();
    }

    /** Retoma campanha pausada (volta para RUNNING). */
    @PostMapping("/{id}/resume")
    public ResponseEntity<Void> resume(@PathVariable UUID id) {
        emailCampaignService.resumeCampaign(id);
        return ResponseEntity.noContent().build();
    }

    /** Cancela campanha — PENDING vira DROPPED, status final CANCELED. */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        emailCampaignService.cancelCampaign(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/metrics")
    public ResponseEntity<EmailCampaignMetricsDto> metrics(@PathVariable UUID id) {
        return ResponseEntity.ok(emailCampaignService.metrics(id));
    }

    /**
     * Faz o parse de um arquivo CSV/XLSX e devolve a lista de destinatários extraídos
     * (sem persistir) para o front pré-popular o wizard de criação.
     * Aceita {@code multipart/form-data} com o campo {@code file}.
     */
    @PostMapping(path = "/import-recipients", consumes = "multipart/form-data")
    public ResponseEntity<ImportRecipientsResponse> importRecipients(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(emailRecipientImportService.parse(file));
    }

    /**
     * Verifica, entre os e-mails informados, quais constam como descadastrados (opt-out).
     * Limite de 500 endereços por requisição.
     */
    @PostMapping("/unsubscribe-check")
    public ResponseEntity<UnsubscribeCheckResponse> unsubscribeCheck(@Valid @RequestBody UnsubscribeCheckRequest request) {
        List<String> validEmails = request.emails().stream()
                .filter(e -> e != null && !e.isBlank())
                .map(String::trim)
                .filter(this::looksLikeEmail)
                .distinct()
                .toList();
        if (validEmails.isEmpty()) {
            return ResponseEntity.ok(new UnsubscribeCheckResponse(List.of()));
        }
        List<String> unsubscribed = emailUnsubscribeService.findUnsubscribedAmong(validEmails);
        return ResponseEntity.ok(new UnsubscribeCheckResponse(unsubscribed));
    }

    private boolean looksLikeEmail(String value) {
        return value.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    /** Acrescenta destinatários a uma campanha em rascunho (ignora duplicados). */
    @PutMapping("/{id}/recipients")
    public ResponseEntity<EmailCampaign> appendRecipients(
            @PathVariable UUID id,
            @Valid @RequestBody AppendRecipientsRequest body) {
        return ResponseEntity.ok(emailCampaignService.appendRecipients(id, body.recipients()));
    }
}
