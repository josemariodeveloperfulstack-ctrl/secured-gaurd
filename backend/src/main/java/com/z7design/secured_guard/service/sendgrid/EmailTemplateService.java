package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.dto.sendgrid.EmailTemplateDto;
import com.z7design.secured_guard.dto.sendgrid.EmailTemplateRequest;
import com.z7design.secured_guard.model.EmailTemplate;
import com.z7design.secured_guard.repository.EmailTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private final EmailTemplateRepository repository;
    private final EmailTemplateRenderer renderer;

    @Transactional(readOnly = true)
    public List<EmailTemplateDto> list(boolean activeOnly) {
        List<EmailTemplate> all = activeOnly
                ? repository.findByIsActiveTrueOrderByIsDefaultDescNameAsc()
                : repository.findAllByOrderByIsDefaultDescNameAsc();
        return all.stream().map(EmailTemplateDto::from).toList();
    }

    @Transactional(readOnly = true)
    public EmailTemplateDto get(UUID id) {
        return EmailTemplateDto.from(loadOrThrow(id));
    }

    @Transactional
    public EmailTemplateDto create(EmailTemplateRequest req) {
        if (req.code() != null && !req.code().isBlank()
                && repository.findByCode(req.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um template com este código");
        }
        EmailTemplate t = EmailTemplate.builder()
                .code(blankToNull(req.code()))
                .name(req.name())
                .subject(req.subject())
                .htmlBody(req.htmlBody())
                .description(req.description())
                .variables(mergeDeclaredAndDetected(req))
                .isDefault(false)
                .isActive(req.isActive() == null ? Boolean.TRUE : req.isActive())
                .build();
        return EmailTemplateDto.from(repository.save(t));
    }

    @Transactional
    public EmailTemplateDto update(UUID id, EmailTemplateRequest req) {
        EmailTemplate t = loadOrThrow(id);
        if (req.code() != null && !req.code().isBlank()
                && !req.code().equals(t.getCode())
                && repository.findByCode(req.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um template com este código");
        }
        t.setCode(blankToNull(req.code()));
        t.setName(req.name());
        t.setSubject(req.subject());
        t.setHtmlBody(req.htmlBody());
        t.setDescription(req.description());
        t.setVariables(mergeDeclaredAndDetected(req));
        if (req.isActive() != null) {
            t.setIsActive(req.isActive());
        }
        return EmailTemplateDto.from(repository.save(t));
    }

    @Transactional
    public void delete(UUID id) {
        EmailTemplate t = loadOrThrow(id);
        if (Boolean.TRUE.equals(t.getIsDefault())) {
            // Templates padrão não são removidos, apenas desativados
            t.setIsActive(false);
            repository.save(t);
            return;
        }
        repository.delete(t);
    }

    private EmailTemplate loadOrThrow(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template não encontrado"));
    }

    private List<String> mergeDeclaredAndDetected(EmailTemplateRequest req) {
        Set<String> merged = new LinkedHashSet<>();
        if (req.variables() != null) merged.addAll(req.variables());
        merged.addAll(renderer.extractVariables(req.subject()));
        merged.addAll(renderer.extractVariables(req.htmlBody()));
        return new ArrayList<>(merged);
    }

    private String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
