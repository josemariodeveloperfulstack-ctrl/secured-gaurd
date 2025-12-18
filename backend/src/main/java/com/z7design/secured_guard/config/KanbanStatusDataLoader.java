package com.z7design.secured_guard.config;

import com.z7design.secured_guard.model.KanbanStatus;
import com.z7design.secured_guard.repository.KanbanStatusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class KanbanStatusDataLoader {

    private final KanbanStatusRepository kanbanStatusRepository;

    @Bean
    @Order(1)
    public CommandLineRunner initKanbanStatuses() {
        return args -> {
            if (kanbanStatusRepository.count() == 0) {
                log.info("📋 Inicializando status padrão do Kanban...");
                
                List<KanbanStatus> defaultStatuses = Arrays.asList(
                    createStatus("Novos Leads", 1),
                    createStatus("Em Contato", 2),
                    createStatus("Proposta Enviada", 3),
                    createStatus("Em Negociação", 4),
                    createStatus("Fechado", 5)
                );
                
                kanbanStatusRepository.saveAll(defaultStatuses);
                log.info("✅ {} status padrão do Kanban criados com sucesso!", defaultStatuses.size());
            } else {
                log.info("📋 Já existem {} status do Kanban no banco de dados. Pulando inicialização.", kanbanStatusRepository.count());
            }
        };
    }

    private KanbanStatus createStatus(String name, Integer orderIndex) {
        KanbanStatus status = new KanbanStatus();
        status.setName(name);
        status.setOrderIndex(orderIndex);
        return status;
    }
}





