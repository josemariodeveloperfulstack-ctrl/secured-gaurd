package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.EmailAccount;
import com.z7design.secured_guard.repository.EmailAccountRepository;
import com.z7design.secured_guard.repository.EmailCacheRepository;
import com.z7design.secured_guard.exception.BusinessException;
import jakarta.mail.*;
import jakarta.mail.internet.MimeMultipart;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailReadService {

    private final EmailAccountRepository emailAccountRepository;
    private final EmailCacheRepository emailCacheRepository;
    private final EncryptionService encryptionService;

    private Store connectToStore(EmailAccount account) throws Exception {
        String decryptedPassword = encryptionService.decryptPassword(account.getEncryptedPassword());
        Properties props = new Properties();
        props.put("mail.store.protocol", "imaps");
        props.put("mail.imaps.host", account.getImapHost());
        props.put("mail.imaps.port", String.valueOf(account.getImapPort()));
        props.put("mail.imaps.ssl.enable", "true");

        Session session = Session.getInstance(props);
        Store store = session.getStore("imaps");
        store.connect(account.getImapHost(), account.getEmail(), decryptedPassword);
        return store;
    }

    public Map<String, Object> readEmailByUid(UUID accountId, Long uid) {
        EmailAccount account = emailAccountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));

        try {
            Store store = connectToStore(account);
            
            // Aqui precisaria saber de qual pasta o email é, mas a implementação original 
            // assumia INBOX. Para buscar de forma robusta com UID, teríamos que abrir 
            // a pasta onde ele está (que está no EmailCache). Como não passamos a pasta na URL:
            // Por hora mantemos "INBOX" ou buscaremos em múltiplas, mas como é pra teste, 
            // o ideal é passar a pasta.
            // Para não quebrar o endpoint atual, vamos buscar na INBOX, 
            // ideal seria buscar do Cache a pasta correta.
            var cacheOpt = emailCacheRepository.findByAccountIdAndProviderUid(accountId, uid);
            String folderName = cacheOpt.isPresent() ? cacheOpt.get().getFolder() : "INBOX";

            Folder folder = store.getFolder(folderName);
            if (!folder.exists()) {
                folder = store.getFolder("INBOX");
            }
            folder.open(Folder.READ_ONLY);
            
            UIDFolder uidFolder = (UIDFolder) folder;
            Message message = uidFolder.getMessageByUID(uid);
            
            if (message == null) {
                throw new RuntimeException("Mensagem não encontrada no provedor");
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("subject", message.getSubject());
            result.put("htmlBody", getTextFromMessage(message));
            
            List<Map<String, String>> attachmentsInfo = getAttachmentsInfo(message);
            result.put("attachments", attachmentsInfo);
            
            folder.close(false);
            store.close();
            
            return result;
        } catch (Exception e) {
            log.error("Erro ao ler email via IMAP", e);
            throw new RuntimeException("Erro ao buscar conteúdo do e-mail");
        }
    }

    public List<String> getFolders(UUID accountId) {
        EmailAccount account = emailAccountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        try {
            Store store = connectToStore(account);
            Folder[] folders = store.getDefaultFolder().list("*");
            List<String> folderNames = new ArrayList<>();
            for (Folder f : folders) {
                if ((f.getType() & Folder.HOLDS_MESSAGES) != 0) {
                    folderNames.add(f.getFullName());
                }
            }
            store.close();
            return folderNames;
        } catch (AuthenticationFailedException e) {
            log.warn("Autenticação IMAP falhou para conta {} ({}): {}", accountId, account.getEmail(), e.getMessage());
            throw new com.z7design.secured_guard.exception.EmailAuthenticationException(
                    "Credenciais de e-mail inválidas. Atualize a senha da conta em Configurações do Webmail.", e);
        } catch (Exception e) {
            log.error("Erro ao listar pastas", e);
            throw new BusinessException("Não foi possível conectar ao servidor de e-mail.");
        }
    }

    public void createFolder(UUID accountId, String folderName) {
        EmailAccount account = emailAccountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        try {
            Store store = connectToStore(account);
            Folder newFolder = store.getFolder(folderName);
            if (!newFolder.exists()) {
                newFolder.create(Folder.HOLDS_MESSAGES);
            }
            store.close();
        } catch (Exception e) {
            log.error("Erro ao criar pasta", e);
            throw new RuntimeException("Erro ao criar pasta");
        }
    }

    @Transactional
    public void emptyTrash(UUID accountId, String trashFolderName) {
        EmailAccount account = emailAccountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        try {
            Store store = connectToStore(account);
            Folder trash = store.getFolder(trashFolderName);
            if (trash.exists()) {
                trash.open(Folder.READ_WRITE);
                Message[] msgs = trash.getMessages();
                trash.setFlags(msgs, new Flags(Flags.Flag.DELETED), true);
                trash.close(true); // true = expunge (apagar permanentemente)
            }
            store.close();
            
            // Delete from cache as well
            emailCacheRepository.deleteByAccountIdAndFolder(accountId, trashFolderName);
        } catch (Exception e) {
            log.error("Erro ao limpar lixeira", e);
            throw new RuntimeException("Erro ao limpar lixeira");
        }
    }
    
    @Transactional
    public void moveEmail(UUID accountId, Long uid, String targetFolderName) {
        EmailAccount account = emailAccountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Conta não encontrada"));
        try {
            Store store = connectToStore(account);
            
            var cacheOpt = emailCacheRepository.findByAccountIdAndProviderUid(accountId, uid);
            String currentFolderName = cacheOpt.isPresent() ? cacheOpt.get().getFolder() : "INBOX";

            Folder currentFolder = store.getFolder(currentFolderName);
            Folder targetFolder = store.getFolder(targetFolderName);
            
            if (!currentFolder.exists() || !targetFolder.exists()) {
                throw new RuntimeException("Pasta origem ou destino não existe");
            }
            
            currentFolder.open(Folder.READ_WRITE);
            Message msg = ((UIDFolder) currentFolder).getMessageByUID(uid);
            
            if (msg != null) {
                currentFolder.copyMessages(new Message[]{msg}, targetFolder);
                msg.setFlag(Flags.Flag.DELETED, true);
                currentFolder.close(true); // expunge
            } else {
                currentFolder.close(false);
            }
            store.close();
            
            // Atualizar cache
            if (cacheOpt.isPresent()) {
                var cache = cacheOpt.get();
                cache.setFolder(targetFolderName);
                emailCacheRepository.save(cache);
            }
        } catch (Exception e) {
            log.error("Erro ao mover email", e);
            throw new RuntimeException("Erro ao mover email");
        }
    }
    
    private String getTextFromMessage(Message message) throws Exception {
        if (message.isMimeType("text/plain") || message.isMimeType("text/html")) {
            return message.getContent().toString();
        } else if (message.isMimeType("multipart/*")) {
            MimeMultipart mimeMultipart = (MimeMultipart) message.getContent();
            return getTextFromMimeMultipart(mimeMultipart);
        }
        return "";
    }

    private String getTextFromMimeMultipart(MimeMultipart mimeMultipart) throws Exception {
        StringBuilder result = new StringBuilder();
        int count = mimeMultipart.getCount();
        for (int i = 0; i < count; i++) {
            BodyPart bodyPart = mimeMultipart.getBodyPart(i);
            if (bodyPart.isMimeType("text/plain") || bodyPart.isMimeType("text/html")) {
                result.append(bodyPart.getContent());
            } else if (bodyPart.getContent() instanceof MimeMultipart){
                result.append(getTextFromMimeMultipart((MimeMultipart)bodyPart.getContent()));
            }
        }
        return result.toString();
    }
    
    private List<Map<String, String>> getAttachmentsInfo(Message message) throws Exception {
        List<Map<String, String>> list = new ArrayList<>();
        if (message.isMimeType("multipart/*")) {
            MimeMultipart mimeMultipart = (MimeMultipart) message.getContent();
            for (int i = 0; i < mimeMultipart.getCount(); i++) {
                BodyPart bodyPart = mimeMultipart.getBodyPart(i);
                if (Part.ATTACHMENT.equalsIgnoreCase(bodyPart.getDisposition())) {
                    Map<String, String> attach = new HashMap<>();
                    attach.put("filename", bodyPart.getFileName());
                    attach.put("contentType", bodyPart.getContentType());
                    list.add(attach);
                }
            }
        }
        return list;
    }
}
