package com.z7design.secured_guard.service.sendgrid;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.dto.sendgrid.EmailCampaignRecipientDto;
import com.z7design.secured_guard.dto.sendgrid.EmailMarketingImportedListDetailDto;
import com.z7design.secured_guard.dto.sendgrid.EmailMarketingImportedListSummaryDto;
import com.z7design.secured_guard.dto.sendgrid.SaveEmailMarketingImportedListRequest;
import com.z7design.secured_guard.model.EmailMarketingImportedList;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.ImportedListSourceType;
import com.z7design.secured_guard.repository.EmailMarketingImportedListRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
@Service
@RequiredArgsConstructor
public class EmailMarketingImportedListService {

    private static final java.util.regex.Pattern EMAIL_PATTERN =
            java.util.regex.Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final EmailMarketingImportedListRepository repository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<EmailMarketingImportedListSummaryDto> listSummaries() {
        return repository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public EmailMarketingImportedListDetailDto getDetail(UUID id) {
        return toDetail(find(id));
    }

    @Transactional
    public EmailMarketingImportedListDetailDto create(SaveEmailMarketingImportedListRequest request) {
        List<EmailCampaignRecipientDto> normalized = normalizeRecipients(request.recipients());
        EmailMarketingImportedList entity = EmailMarketingImportedList.builder()
                .name(request.name().trim())
                .description(trimToNull(request.description()))
                .sourceType(parseSourceType(request.sourceType()))
                .recipients(toStorage(normalized))
                .recipientCount(normalized.size())
                .createdByUserId(currentUserId().orElse(null))
                .build();
        return toDetail(repository.save(entity));
    }

    @Transactional
    public EmailMarketingImportedListDetailDto update(UUID id, SaveEmailMarketingImportedListRequest request) {
        EmailMarketingImportedList entity = find(id);
        List<EmailCampaignRecipientDto> normalized = normalizeRecipients(request.recipients());
        entity.setName(request.name().trim());
        entity.setDescription(trimToNull(request.description()));
        entity.setSourceType(parseSourceType(request.sourceType()));
        entity.setRecipients(toStorage(normalized));
        entity.setRecipientCount(normalized.size());
        return toDetail(repository.save(entity));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lista importada não encontrada");
        }
        repository.deleteById(id);
    }

    private EmailMarketingImportedList find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lista importada não encontrada"));
    }

    private List<EmailCampaignRecipientDto> normalizeRecipients(List<EmailCampaignRecipientDto> raw) {
        if (raw == null || raw.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe ao menos um destinatário válido");
        }
        Map<String, EmailCampaignRecipientDto> deduped = new LinkedHashMap<>();
        for (EmailCampaignRecipientDto dto : raw) {
            if (dto == null || dto.email() == null || dto.email().isBlank()) {
                continue;
            }
            String email = dto.email().trim();
            if (!EMAIL_PATTERN.matcher(email).matches()) {
                continue;
            }
            String key = email.toLowerCase(Locale.ROOT);
            deduped.putIfAbsent(key, new EmailCampaignRecipientDto(
                    email,
                    dto.name() != null ? dto.name().trim() : null,
                    dto.metadata(),
                    dto.sourceType() != null ? dto.sourceType() : "IMPORT",
                    dto.leadId()));
        }
        if (deduped.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nenhum e-mail válido na lista");
        }
        return new ArrayList<>(deduped.values());
    }

    private List<Map<String, Object>> toStorage(List<EmailCampaignRecipientDto> recipients) {
        return recipients.stream()
                .map(dto -> objectMapper.convertValue(dto, new TypeReference<Map<String, Object>>() {}))
                .toList();
    }

    private List<EmailCampaignRecipientDto> fromStorage(List<Map<String, Object>> stored) {
        if (stored == null || stored.isEmpty()) {
            return List.of();
        }
        return stored.stream()
                .map(map -> objectMapper.convertValue(map, EmailCampaignRecipientDto.class))
                .toList();
    }

    private ImportedListSourceType parseSourceType(String raw) {
        if (raw == null || raw.isBlank()) {
            return ImportedListSourceType.IMPORT;
        }
        try {
            return ImportedListSourceType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return ImportedListSourceType.MIXED;
        }
    }

    private EmailMarketingImportedListSummaryDto toSummary(EmailMarketingImportedList entity) {
        return new EmailMarketingImportedListSummaryDto(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getSourceType().name(),
                entity.getRecipientCount(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    private EmailMarketingImportedListDetailDto toDetail(EmailMarketingImportedList entity) {
        return new EmailMarketingImportedListDetailDto(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getSourceType().name(),
                fromStorage(entity.getRecipients()),
                entity.getRecipientCount(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    private java.util.Optional<UUID> currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return java.util.Optional.empty();
        }
        String username = auth.getName();
        if (username == null || username.isBlank()) {
            return java.util.Optional.empty();
        }
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .map(User::getId);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
