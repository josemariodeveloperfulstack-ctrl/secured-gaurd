package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.EmailAccount;
import com.z7design.secured_guard.model.EmailCache;
import com.z7design.secured_guard.model.EmailRule;
import com.z7design.secured_guard.repository.EmailAccountRepository;
import com.z7design.secured_guard.repository.EmailCacheRepository;
import com.z7design.secured_guard.repository.EmailRuleRepository;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailSyncService {

    private final EmailAccountRepository emailAccountRepository;
    private final EmailCacheRepository emailCacheRepository;
    private final EmailRuleRepository emailRuleRepository;
    private final EncryptionService encryptionService;

    public void syncAllActiveAccounts() {
        var accounts = emailAccountRepository.findByStatus("ACTIVE");
        for (EmailAccount account : accounts) {
            try {
                syncAccount(account);
            } catch (jakarta.mail.AuthenticationFailedException authEx) {
                // Credenciais inválidas: marca a conta como AUTH_FAILED para
                // interromper o loop de retentativas a cada 5 minutos (que polui logs).
                // O usuário deve reativar manualmente após atualizar a senha.
                log.warn("Falha de autenticação IMAP para a conta {} — marcando como AUTH_FAILED. "
                        + "Atualize a senha (ou senha de app) e reative a conta. Detalhe: {}",
                        account.getEmail(), authEx.getMessage());
                account.setStatus("AUTH_FAILED");
                account.setLastSyncError("Falha de autenticação IMAP: " + authEx.getMessage());
                emailAccountRepository.save(account);
            } catch (Exception e) {
                log.error("Erro ao sincronizar conta: {}", account.getEmail(), e);
                account.setLastSyncError(e.getMessage());
                emailAccountRepository.save(account);
            }
        }
    }

    private void syncAccount(EmailAccount account) throws Exception {
        String decryptedPassword = encryptionService.decryptPassword(account.getEncryptedPassword());
        
        Properties props = new Properties();
        props.put("mail.store.protocol", "imaps");
        props.put("mail.imaps.host", account.getImapHost());
        props.put("mail.imaps.port", String.valueOf(account.getImapPort()));
        props.put("mail.imaps.ssl.enable", "true");
        props.put("mail.imaps.connectiontimeout", "5000");
        props.put("mail.imaps.timeout", "5000");

        Session session = Session.getInstance(props);
        Store store = session.getStore("imaps");
        store.connect(account.getImapHost(), account.getEmail(), decryptedPassword);

        List<EmailRule> rules = emailRuleRepository.findByAccountIdAndActiveTrue(account.getId());

        Folder[] folders = store.getDefaultFolder().list("*");
        for (Folder folder : folders) {
            if ((folder.getType() & Folder.HOLDS_MESSAGES) != 0) {
                boolean isInbox = folder.getName().equalsIgnoreCase("INBOX");
                folder.open(isInbox && !rules.isEmpty() ? Folder.READ_WRITE : Folder.READ_ONLY);
                
                Message[] messages = folder.getMessages();
                
                FetchProfile fp = new FetchProfile();
                fp.add(FetchProfile.Item.ENVELOPE);
                fp.add(FetchProfile.Item.FLAGS);
                fp.add("X-Spam-Flag");
                fp.add("Message-ID");
                folder.fetch(messages, fp);

                for (Message msg : messages) {
                    try {
                        long uid = ((UIDFolder) folder).getUID(msg);
                        
                        if (emailCacheRepository.findByAccountIdAndProviderUid(account.getId(), uid).isPresent()) {
                            continue;
                        }

                        EmailCache cache = new EmailCache();
                        cache.setAccount(account);
                        cache.setProviderUid(uid);
                        cache.setFolder(folder.getFullName());
                        
                        Address[] froms = msg.getFrom();
                        if (froms != null && froms.length > 0) {
                            cache.setSender(((InternetAddress) froms[0]).getAddress());
                        } else {
                            cache.setSender("unknown");
                        }
                        
                        cache.setSubject(msg.getSubject());
                        if (msg.getReceivedDate() != null) {
                            cache.setReceivedDate(msg.getReceivedDate().toInstant()
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime());
                        } else {
                            cache.setReceivedDate(LocalDateTime.now());
                        }
                        
                        cache.setIsRead(msg.isSet(Flags.Flag.SEEN));
                        
                        String[] spamFlags = msg.getHeader("X-Spam-Flag");
                        if (spamFlags != null && spamFlags.length > 0 && "YES".equalsIgnoreCase(spamFlags[0])) {
                            cache.setIsSpam(true);
                        }

                        String[] messageIds = msg.getHeader("Message-ID");
                        if (messageIds != null && messageIds.length > 0) {
                            cache.setMessageId(messageIds[0]);
                        }

                        if (msg.getContentType() != null && msg.getContentType().toLowerCase().contains("multipart")) {
                            cache.setHasAttachment(true);
                        }

                        // Apply Rules for INBOX
                        if (isInbox && !rules.isEmpty()) {
                            if (applyRules(account, cache, msg, folder, store, rules)) {
                                continue; // Email was deleted or moved, don't save cache in current folder
                            }
                        }

                        emailCacheRepository.save(cache);
                    } catch (Exception ex) {
                        log.warn("Falha ao processar mensagem individual na conta {}", account.getEmail(), ex);
                    }
                }
                folder.close(true); // Expunge deleted messages if any
            }
        }

        account.setLastSyncDate(LocalDateTime.now());
        account.setLastSyncError(null);
        emailAccountRepository.save(account);

        store.close();
    }

    private boolean applyRules(EmailAccount account, EmailCache cache, Message msg, Folder currentFolder, Store store, List<EmailRule> rules) {
        for (EmailRule rule : rules) {
            boolean match = false;
            String sender = cache.getSender();
            String subject = cache.getSubject() != null ? cache.getSubject().toLowerCase() : "";

            if ("DOMAIN".equals(rule.getConditionType())) {
                match = sender.endsWith("@" + rule.getConditionValue()) || sender.endsWith("." + rule.getConditionValue());
            } else if ("SUBJECT".equals(rule.getConditionType())) {
                match = subject.contains(rule.getConditionValue().toLowerCase());
            } else if ("SENDER".equals(rule.getConditionType())) {
                match = sender.equalsIgnoreCase(rule.getConditionValue());
            }

            if (match) {
                if ("MOVE".equals(rule.getActionType())) {
                    try {
                        Folder targetFolder = store.getFolder(rule.getActionValue());
                        if (targetFolder.exists()) {
                            currentFolder.copyMessages(new Message[]{msg}, targetFolder);
                            msg.setFlag(Flags.Flag.DELETED, true);
                            cache.setFolder(rule.getActionValue());
                            return false; // Will save with new folder name
                        }
                    } catch (MessagingException e) {
                        log.error("Erro ao aplicar regra de mover", e);
                    }
                } else if ("DELETE".equals(rule.getActionType())) {
                    try {
                        msg.setFlag(Flags.Flag.DELETED, true);
                        return true; // Don't save to cache
                    } catch (MessagingException e) {
                        log.error("Erro ao aplicar regra de deletar", e);
                    }
                }
            }
        }
        return false;
    }
}

