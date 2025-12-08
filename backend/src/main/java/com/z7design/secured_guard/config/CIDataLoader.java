package com.z7design.secured_guard.config;

import com.z7design.secured_guard.model.PersonalProtectiveEquipment;
import com.z7design.secured_guard.model.enums.EPICategory;
import com.z7design.secured_guard.repository.PersonalProtectiveEquipmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DataLoader para popular o banco de dados com dados de teste no ambiente CI
 * Executa apenas no perfil "ci" e apenas se não houver dados cadastrados
 */
@Configuration
@Slf4j
@RequiredArgsConstructor
public class CIDataLoader {

    private final PersonalProtectiveEquipmentRepository epiRepository;

    @Bean
    @Profile("ci") // Executa apenas no ambiente CI
    public CommandLineRunner initCIData() {
        return args -> {
            log.info("🌱 Iniciando seed de dados para ambiente CI...");

            // Popular EPIs se não existirem
            initEPIData();

            log.info("✅ Seed de dados para CI concluído com sucesso!");
        };
    }

    /**
     * Inicializa dados de EPIs se não existirem
     */
    private void initEPIData() {
        long count = epiRepository.count();
        if (count > 0) {
            log.info("✅ Já existem {} EPIs no banco de dados. Pulando inicialização.", count);
            return;
        }

        log.info("📦 Inicializando dados de EPIs para CI...");

        // EPI 1: Capacete de Segurança
        PersonalProtectiveEquipment capacete = PersonalProtectiveEquipment.builder()
                .name("Capacete de Segurança")
                .description("Capacete de segurança industrial com regulagem")
                .category(EPICategory.CABECA)
                .caNumber("ABNT NBR 8221")
                .caValidity(LocalDate.of(2027, 1, 15))
                .manufacturer("3M")
                .model("SecureFit Pro")
                .unitOfMeasurement("UNIDADE")
                .minimumStock(10)
                .currentStock(50)
                .unitCost(new BigDecimal("89.90"))
                .isActive(true)
                .build();

        // EPI 2: Luvas de Proteção
        PersonalProtectiveEquipment luvas = PersonalProtectiveEquipment.builder()
                .name("Luvas de Proteção")
                .description("Luvas resistentes a cortes e produtos químicos")
                .category(EPICategory.MAOS)
                .caNumber("EN 388")
                .caValidity(null)
                .manufacturer("Ansell")
                .model("HyFlex 11-800")
                .unitOfMeasurement("UNIDADE")
                .minimumStock(50)
                .currentStock(200)
                .unitCost(new BigDecimal("45.50"))
                .isActive(true)
                .build();

        // EPI 3: Óculos de Proteção
        PersonalProtectiveEquipment oculos = PersonalProtectiveEquipment.builder()
                .name("Óculos de Proteção")
                .description("Óculos de segurança com proteção UV")
                .category(EPICategory.OLHOS)
                .caNumber("ANSI Z87.1")
                .caValidity(null)
                .manufacturer("Uvex")
                .model("Genesis XC")
                .unitOfMeasurement("UNIDADE")
                .minimumStock(20)
                .currentStock(100)
                .unitCost(new BigDecimal("32.80"))
                .isActive(true)
                .build();

        // EPI 4: Calçado de Segurança
        PersonalProtectiveEquipment calcado = PersonalProtectiveEquipment.builder()
                .name("Calçado de Segurança")
                .description("Tênis de segurança com biqueira de aço")
                .category(EPICategory.PES)
                .caNumber("ABNT NBR 20345")
                .caValidity(null)
                .manufacturer("Safety")
                .model("Steel Toe Pro")
                .unitOfMeasurement("UNIDADE")
                .minimumStock(15)
                .currentStock(80)
                .unitCost(new BigDecimal("189.90"))
                .isActive(true)
                .build();

        // EPI 5: Uniforme de Trabalho
        PersonalProtectiveEquipment uniforme = PersonalProtectiveEquipment.builder()
                .name("Uniforme de Trabalho")
                .description("Uniforme corporativo com tecido resistente")
                .category(EPICategory.CORPO)
                .caNumber("ABNT NBR 15777")
                .caValidity(null)
                .manufacturer("WorkWear")
                .model("Corporate Pro")
                .unitOfMeasurement("UNIDADE")
                .minimumStock(30)
                .currentStock(120)
                .unitCost(new BigDecimal("75.00"))
                .isActive(true)
                .build();

        // Salvar todos os EPIs
        epiRepository.save(capacete);
        epiRepository.save(luvas);
        epiRepository.save(oculos);
        epiRepository.save(calcado);
        epiRepository.save(uniforme);

        log.info("✅ {} EPIs criados com sucesso para ambiente CI!", 5);
    }
}
