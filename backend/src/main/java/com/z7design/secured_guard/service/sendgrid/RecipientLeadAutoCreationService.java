package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.model.EmailCampaign;
import com.z7design.secured_guard.model.EmailCampaignRecipient;
import com.z7design.secured_guard.model.Lead;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.LeadSource;
import com.z7design.secured_guard.model.enums.LeadStatus;
import com.z7design.secured_guard.model.enums.RecipientSourceType;
import com.z7design.secured_guard.repository.EmailCampaignRecipientRepository;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * Garante a criação automática de um {@link Lead} sempre que um destinatário
 * importado/manual engaja com um e-mail (abre, clica ou responde).
 *
 * <p>Idempotente: se o destinatário já tem {@code lead} vinculado ou se já
 * existe um Lead com o mesmo e-mail no CRM, apenas vincula sem criar um novo.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecipientLeadAutoCreationService {

    private final LeadRepository leadRepository;
    private final UserRepository userRepository;
    private final EmailCampaignRecipientRepository recipientRepository;

    /** Username opcional configurado para ser o "dono" de leads criados automaticamente. */
    @Value("${app.email.auto-lead.owner-username:}")
    private String fallbackOwnerUsername;

    @Transactional
    public void ensureLeadFor(EmailCampaignRecipient recipient) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        // 1) Já vinculado: nada a fazer.
        if (recipient.getLead() != null) {
            return;
        }

        // 2) Já existe um Lead com o mesmo e-mail: apenas vincular.
        Optional<Lead> existing = leadRepository
                .findFirstByEmailIgnoreCaseOrderByCreatedAtDesc(recipient.getEmail().trim());
        if (existing.isPresent()) {
            recipient.setLead(existing.get());
            recipientRepository.save(recipient);
            return;
        }

        // 3) Criar um novo Lead a partir dos dados do destinatário.
        User owner = resolveOwner(recipient);
        if (owner == null) {
            log.warn("Auto-create lead: nenhum usuário 'owner' disponível para {}", recipient.getEmail());
            return;
        }

        Lead lead = new Lead();
        lead.setEmail(recipient.getEmail().trim());
        lead.setName(deriveName(recipient));
        Map<String, Object> md = recipient.getMetadata();
        if (md != null) {
            lead.setCompany(asString(md.get("company")));
            lead.setPosition(asString(md.get("position")));
            lead.setPhone(asString(md.get("phone")));
            lead.setMobile(asString(md.get("mobile")));
        }
        lead.setStatus(LeadStatus.NEW);
        lead.setSource(LeadSource.OTHER);
        lead.setNotes(buildNotes(recipient));
        lead.setCreatedBy(owner);
        // Atribui ao mesmo dono por padrão para aparecer na carteira de quem criou a campanha.
        lead.setAssignedTo(owner);
        Lead saved = leadRepository.save(lead);

        recipient.setLead(saved);
        recipient.setAutoLeadCreated(true);
        // Se a origem ainda estava como MANUAL/IMPORT, marca também como LEAD agora que existe vínculo.
        if (recipient.getSourceType() == null) {
            recipient.setSourceType(RecipientSourceType.LEAD);
        }
        recipientRepository.save(recipient);

        log.info("Auto-create lead: criado Lead {} a partir do destinatário {} ({})",
                saved.getId(), recipient.getEmail(), recipient.getSourceType());
    }

    private String deriveName(EmailCampaignRecipient r) {
        if (r.getName() != null && !r.getName().isBlank()) return r.getName().trim();
        String email = r.getEmail();
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    private String buildNotes(EmailCampaignRecipient r) {
        EmailCampaign c = r.getCampaign();
        String campaignTitle = c != null ? c.getTitle() : "campanha";
        return "Lead criado automaticamente a partir de engajamento no e-mail "
                + "(campanha: " + campaignTitle + ").";
    }

    private User resolveOwner(EmailCampaignRecipient r) {
        // Preferência 1: autor da campanha
        EmailCampaign campaign = r.getCampaign();
        if (campaign != null && campaign.getCreatedBy() != null) {
            return campaign.getCreatedBy();
        }
        // Preferência 2: username configurado
        if (fallbackOwnerUsername != null && !fallbackOwnerUsername.isBlank()) {
            return userRepository.findByUsername(fallbackOwnerUsername)
                    .orElseGet(() -> userRepository.findByEmail(fallbackOwnerUsername).orElse(null));
        }
        return null;
    }

    private static String asString(Object o) {
        return o == null ? null : o.toString();
    }
}
