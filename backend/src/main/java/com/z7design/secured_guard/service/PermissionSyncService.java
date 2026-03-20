package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Permission;
import com.z7design.secured_guard.repository.PermissionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PermissionSyncService {

    private final PermissionRepository permissionRepository;

    @PostConstruct
    public void syncPermissions() {
        int created = 0;
        int updated = 0;
        for (com.z7design.secured_guard.model.enums.Permission perm : com.z7design.secured_guard.model.enums.Permission.values()) {
            String name = perm.name();
            var byName = permissionRepository.findAllByName(name);
            if (byName.size() > 1) {
                log.warn("Permissão duplicada no banco: '{}' ({} registros). Usando o primeiro para sync.", name, byName.size());
            }
            Permission entity = byName.stream().findFirst().orElse(null);
            String description = buildDescription(name);
            if (entity == null) {
                Permission newPerm = new Permission();
                newPerm.setName(name);
                newPerm.setDescription(description);
                permissionRepository.save(newPerm);
                created++;
            } else if (entity.getDescription() == null || entity.getDescription().trim().isEmpty()) {
                entity.setDescription(description);
                permissionRepository.save(entity);
                updated++;
            }
        }
        log.info("✅ Sincronização de permissões concluída. Criadas: {}, Atualizadas: {}", created, updated);
    }

    private String buildDescription(String name) {
        if ("ALL_PERMISSIONS".equals(name)) {
            return "Todas as permissões";
        }

        String[] parts = name.split("_");
        if (parts.length <= 1) {
            return humanize(parts[0]);
        }

        String actionKey = parts[parts.length - 1];
        String resourceKey = String.join("_", Arrays.copyOf(parts, parts.length - 1));
        String action = actionLabels().getOrDefault(actionKey, humanize(actionKey));
        String resource = humanize(resourceKey);
        return action + " " + resource;
    }

    private Map<String, String> actionLabels() {
        Map<String, String> map = new HashMap<>();
        map.put("READ", "Visualizar");
        map.put("WRITE", "Editar");
        map.put("CREATE", "Criar");
        map.put("DELETE", "Excluir");
        map.put("MANAGE", "Gerenciar");
        map.put("EXPORT", "Exportar");
        map.put("PUBLISH", "Publicar");
        map.put("SEND", "Enviar");
        map.put("UPLOAD", "Enviar");
        map.put("EXECUTE", "Executar");
        return map;
    }

    private String humanize(String raw) {
        String[] tokens = raw.split("_");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < tokens.length; i++) {
            if (i > 0) sb.append(" ");
            String token = tokens[i];
            if (token.length() <= 3 && token.equals(token.toUpperCase(Locale.ROOT))) {
                sb.append(token);
            } else {
                String lower = token.toLowerCase(Locale.ROOT);
                sb.append(Character.toUpperCase(lower.charAt(0))).append(lower.substring(1));
            }
        }
        return sb.toString();
    }
}
