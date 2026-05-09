package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.sendgrid.CreateEmailCampaignRequest;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignMetricsDto;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignSummaryDto;
import com.z7design.secured_guard.dto.sendgrid.EmailLogRowDto;
import com.z7design.secured_guard.dto.sendgrid.SendEmailCampaignRequest;
import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.service.sendgrid.EmailCampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/email-campaigns")
@RequiredArgsConstructor
public class EmailCampaignController {

    private final EmailCampaignService emailCampaignService;

    @GetMapping
    public ResponseEntity<List<EmailCampaignSummaryDto>> list() {
        return ResponseEntity.ok(emailCampaignService.listSummaries());
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

    @GetMapping("/{id}/logs")
    public ResponseEntity<List<EmailLogRowDto>> logs(@PathVariable UUID id) {
        return ResponseEntity.ok(emailCampaignService.listLogs(id));
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<Void> send(@PathVariable UUID id, @Valid @RequestBody SendEmailCampaignRequest request) {
        emailCampaignService.sendCampaign(id, request);
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/{id}/metrics")
    public ResponseEntity<EmailCampaignMetricsDto> metrics(@PathVariable UUID id) {
        return ResponseEntity.ok(emailCampaignService.metrics(id));
    }
}
