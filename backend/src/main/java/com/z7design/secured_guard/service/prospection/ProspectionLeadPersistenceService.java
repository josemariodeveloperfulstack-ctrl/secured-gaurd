package com.z7design.secured_guard.service.prospection;

import com.z7design.secured_guard.model.EmailMarketingImportedList;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.LeadSource;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.repository.EmailMarketingImportedListRepository;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.service.sendgrid.EmailMarketingRejectionService;
import com.z7design.secured_guard.service.sendgrid.EmailUnsubscribeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Grava automaticamente os prospects encontrados na prospecção comercial:
 * <ol>
 *   <li>No CRM, como leads (Nome, E-mail, WhatsApp qualificado e Empresa);</li>
 *   <li>Na lista de e-mail marketing "Prospecção Comercial - Leads Quentes"
 *       (Nome + E-mail + metadados da empresa), pronta para o envio da
 *       apresentação institucional.</li>
 * </ol>
 *
 * <p>Nenhum e-mail é disparado aqui: apenas a base é preparada e qualificada.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProspectionLeadPersistenceService {

    public static final String MARKETING_LIST_NAME = "Prospecção Comercial - Leads Quentes";
    private static final String AUTO_SAVE_MARKER = "[PROSPECÇÃO AUTOMÁTICA]";

    private final LeadRepository leadRepository;
    private final EmailMarketingImportedListRepository importedListRepository;
    private final EmailUnsubscribeService unsubscribeService;
    private final EmailMarketingRejectionService rejectionService;

    /** Resumo da gravação automática, devolvido ao front via cabeçalho da resposta. */
    public record AutoSaveSummary(
            int total,
            int qualified,
            int leadsCreated,
            int leadsUpdated,
            int marketingAdded,
            int withWhatsapp,
            int skippedNoName,
            int skippedInvalidEmail,
            int skippedAccountingEmail,
            int skippedUnsubscribed,
            int skippedRejected,
            int skippedDuplicates) {

        public String toJson() {
            return "{\"total\":" + total
                    + ",\"qualified\":" + qualified
                    + ",\"leadsCreated\":" + leadsCreated
                    + ",\"leadsUpdated\":" + leadsUpdated
                    + ",\"marketingAdded\":" + marketingAdded
                    + ",\"withWhatsapp\":" + withWhatsapp
                    + ",\"skippedNoName\":" + skippedNoName
                    + ",\"skippedInvalidEmail\":" + skippedInvalidEmail
                    + ",\"skippedAccountingEmail\":" + skippedAccountingEmail
                    + ",\"skippedUnsubscribed\":" + skippedUnsubscribed
                    + ",\"skippedRejected\":" + skippedRejected
                    + ",\"skippedDuplicates\":" + skippedDuplicates + "}";
        }

        @Override
        public String toString() {
            return "total=" + total + ", qualificados=" + qualified
                    + ", leadsCriados=" + leadsCreated + ", leadsAtualizados=" + leadsUpdated
                    + ", marketingAdicionados=" + marketingAdded + ", whatsapp=" + withWhatsapp
                    + ", ignorados(noName=" + skippedNoName + ", invalidEmail=" + skippedInvalidEmail
                    + ", contabilidade=" + skippedAccountingEmail + ", optOut=" + skippedUnsubscribed
                    + ", rejeitados=" + skippedRejected + ", duplicados=" + skippedDuplicates + ")";
        }
    }

    @Transactional
    public AutoSaveSummary saveAll(List<Map<String, Object>> prospects, User createdBy) {
        if (prospects == null || prospects.isEmpty()) {
            return emptySummary();
        }
        if (createdBy == null) {
            log.warn("Prospecção: usuário autenticado não resolvido; gravação automática ignorada.");
            return emptySummary();
        }

        EmailMarketingImportedList marketingList = importedListRepository
                .findByNameIgnoreCase(MARKETING_LIST_NAME)
                .orElse(null);
        List<Map<String, Object>> recipients = marketingList == null || marketingList.getRecipients() == null
                ? new ArrayList<>()
                : new ArrayList<>(marketingList.getRecipients());
        Set<String> knownRecipientEmails = new HashSet<>();
        for (Map<String, Object> recipient : recipients) {
            String email = asText(recipient.get("email"));
            if (email != null) {
                knownRecipientEmails.add(email.toLowerCase(Locale.ROOT));
            }
        }

        int leadsCreated = 0;
        int leadsUpdated = 0;
        int marketingAdded = 0;
        int withWhatsapp = 0;
        int skippedNoName = 0;
        int skippedInvalidEmail = 0;
        int skippedAccountingEmail = 0;
        int skippedUnsubscribed = 0;
        int skippedRejected = 0;
        int skippedDuplicates = 0;
        Set<String> batchEmails = new HashSet<>();
        boolean listChanged = false;

        for (Map<String, Object> item : prospects) {
            ProspectionContactQualifier.QualifiedContact contact = ProspectionContactQualifier.qualify(item);

            if (contact.name() == null) {
                skippedNoName++;
                continue;
            }
            if (!contact.hasValidEmail()) {
                if ("ACCOUNTING_EMAIL".equals(contact.emailRejectionReason())) {
                    skippedAccountingEmail++;
                } else {
                    skippedInvalidEmail++;
                }
                continue;
            }
            if (unsubscribeService.isUnsubscribed(contact.email())) {
                skippedUnsubscribed++;
                continue;
            }
            if (rejectionService.isRejected(contact.email())) {
                skippedRejected++;
                continue;
            }
            if (!batchEmails.add(contact.email())) {
                skippedDuplicates++;
                continue;
            }

            UpsertResult upsert = upsertLead(item, contact, createdBy);
            if (upsert == null) {
                skippedInvalidEmail++;
                continue;
            }
            Lead savedLead = upsert.lead();
            if (upsert.created()) {
                leadsCreated++;
            } else {
                leadsUpdated++;
            }
            if (contact.whatsapp() != null) {
                withWhatsapp++;
            }

            String emailKey = contact.email().toLowerCase(Locale.ROOT);
            if (knownRecipientEmails.add(emailKey)) {
                recipients.add(buildRecipient(item, contact, savedLead));
                listChanged = true;
                marketingAdded++;
            }
        }

        if (listChanged) {
            if (marketingList == null) {
                marketingList = EmailMarketingImportedList.builder()
                        .name(MARKETING_LIST_NAME)
                        .description("Contatos e tomadores de decisão qualificados automaticamente na prospecção comercial. Base para o envio da apresentação institucional.")
                        .sourceType(com.z7design.secured_guard.model.enums.ImportedListSourceType.PROSPECTION)
                        .recipients(recipients)
                        .recipientCount(recipients.size())
                        .createdByUserId(createdBy.getId())
                        .build();
            } else {
                marketingList.setRecipients(recipients);
                marketingList.setRecipientCount(recipients.size());
            }
            importedListRepository.save(marketingList);
        }

        AutoSaveSummary summary = new AutoSaveSummary(
                prospects.size(),
                leadsCreated + leadsUpdated,
                leadsCreated,
                leadsUpdated,
                marketingAdded,
                withWhatsapp,
                skippedNoName,
                skippedInvalidEmail,
                skippedAccountingEmail,
                skippedUnsubscribed,
                skippedRejected,
                skippedDuplicates);
        log.info("Prospecção: gravação automática concluída — {}", summary);
        return summary;
    }

    /** Resultado do upsert: lead persistido e se era um lead novo. */
    private record UpsertResult(Lead lead, boolean created) {
    }

    /** Upsert por e-mail: evita duplicar leads em buscas repetidas do mesmo segmento. */
    private UpsertResult upsertLead(Map<String, Object> item,
                                    ProspectionContactQualifier.QualifiedContact contact,
                                    User createdBy) {
        try {
            Optional<Lead> existingOpt = leadRepository.findTopByEmailIncludingDeleted(contact.email());
            String notes = buildNotes(item, contact);

            if (existingOpt.isPresent()) {
                Lead existing = existingOpt.get();
                if (existing.isDeleted()) {
                    existing.setDeleted(false);
                    existing.setDeletionReason(null);
                    existing.setDeletedAt(null);
                    existing.setDeletedBy(null);
                }
                if (existing.getName() == null || existing.getName().isBlank()) {
                    existing.setName(contact.name());
                }
                if (contact.whatsapp() != null) {
                    existing.setWhatsapp(contact.whatsapp());
                }
                if (contact.company() != null
                        && (existing.getCompany() == null || existing.getCompany().isBlank())) {
                    existing.setCompany(contact.company());
                }
                String oldNotes = existing.getNotes();
                if (oldNotes == null || !oldNotes.contains(AUTO_SAVE_MARKER)) {
                    existing.setNotes(oldNotes == null || oldNotes.isBlank()
                            ? notes
                            : oldNotes + "\n\n" + notes);
                }
                return new UpsertResult(leadRepository.save(existing), false);
            }

            Lead lead = new Lead();
            lead.setName(contact.name());
            lead.setEmail(contact.email());
            lead.setWhatsapp(contact.whatsapp());
            lead.setCompany(contact.company());
            lead.setPosition(asText(item.get("cargo")));
            lead.setSource(LeadSource.PROSPECTION);
            lead.setStatus(LeadStatus.NEW);
            lead.setNotes(notes);
            lead.setCreatedBy(createdBy);
            return new UpsertResult(leadRepository.save(lead), true);
        } catch (Exception e) {
            log.warn("Prospecção: falha ao gravar lead qualificado {}: {}", contact.email(), e.getMessage());
            return null;
        }
    }

    private static Map<String, Object> buildRecipient(Map<String, Object> item,
                                                       ProspectionContactQualifier.QualifiedContact contact,
                                                       Lead lead) {
        Map<String, Object> recipient = new LinkedHashMap<>();
        recipient.put("email", contact.email());
        recipient.put("name", contact.name());
        recipient.put("sourceType", "PROSPECTION");
        recipient.put("leadId", lead.getId() != null ? lead.getId().toString() : null);

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("empresa", contact.company());
        metadata.put("cnpj", asText(item.get("cnpj")));
        metadata.put("whatsapp", contact.whatsapp());
        metadata.put("municipio", asText(item.get("municipio")));
        metadata.put("uf", asText(item.get("uf")));
        metadata.put("cnae", cnaeDescription(item));
        recipient.put("metadata", metadata);
        return recipient;
    }

    private static String buildNotes(Map<String, Object> item,
                                     ProspectionContactQualifier.QualifiedContact contact) {
        StringBuilder sb = new StringBuilder(AUTO_SAVE_MARKER)
                .append(" em ").append(LocalDateTime.now()).append('\n')
                .append("Empresa: ").append(contact.company() != null ? contact.company() : "-").append('\n')
                .append("E-mail qualificado: ").append(contact.email()).append('\n')
                .append("WhatsApp qualificado: ")
                .append(contact.whatsapp() != null ? contact.whatsapp() : "não informado/inválido").append('\n')
                .append("CNPJ: ").append(asText(item.get("cnpj")))
                .append(" | Local: ").append(asText(item.get("municipio")))
                .append('/').append(asText(item.get("uf")));
        return sb.toString();
    }

    private static String cnaeDescription(Map<String, Object> item) {
        Object cnae = item.get("cnaePrincipal");
        if (cnae instanceof Map<?, ?> map && map.get("descricao") != null) {
            return map.get("descricao").toString();
        }
        return asText(item.get("cnaeDescricao"));
    }

    private static String asText(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private static AutoSaveSummary emptySummary() {
        return new AutoSaveSummary(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
