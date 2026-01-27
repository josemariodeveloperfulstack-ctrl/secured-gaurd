package com.z7design.secured_guard.config;

import com.z7design.secured_guard.model.PersonalProtectiveEquipment;
import com.z7design.secured_guard.model.enums.EPICategory;
import com.z7design.secured_guard.repository.PersonalProtectiveEquipmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;

@Configuration
public class EPIDataLoader {

        private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(EPIDataLoader.class);
        private final PersonalProtectiveEquipmentRepository epiRepository;

        public EPIDataLoader(PersonalProtectiveEquipmentRepository epiRepository) {
                this.epiRepository = epiRepository;
        }

        @Bean
        @Profile("!prod")
        public CommandLineRunner initEPIData() {
                return args -> {
                        long count = epiRepository.count();
                        if (count > 0) {
                                log.info("✅ Já existem {} EPIs. Pulando init.", count);
                                return;
                        }

                        log.info("📦 Inicializando dados de teste de EPIs...");

                        epiRepository.save(createEPI("Capacete de Segurança", "Industrial", EPICategory.CABECA,
                                        "ABNT 8221", 50));
                        epiRepository.save(
                                        createEPI("Luvas de Proteção", "Resistentes", EPICategory.MAOS, "EN 388", 200));
                        epiRepository.save(createEPI("Óculos de Proteção", "Proteção UV", EPICategory.OLHOS,
                                        "ANSI Z87.1", 100));
                        epiRepository.save(createEPI("Calçado de Segurança", "Biqueira de aço", EPICategory.PES,
                                        "ABNT 20345", 80));
                        epiRepository.save(createEPI("Uniforme de Trabalho", "Corporativo", EPICategory.CORPO,
                                        "ABNT 15777", 120));

                        log.info("✅ Dados de teste de EPIs inicializados!");
                };
        }

        private PersonalProtectiveEquipment createEPI(String name, String desc, EPICategory cat, String ca, int stock) {
                PersonalProtectiveEquipment epi = new PersonalProtectiveEquipment();
                epi.setName(name);
                epi.setDescription(desc);
                epi.setCategory(cat);
                epi.setCaNumber(ca);
                epi.setCurrentStock(stock);
                epi.setIsActive(true);
                epi.setUnitOfMeasurement("UNIDADE");
                epi.setUnitCost(BigDecimal.valueOf(50.0));
                epi.setMinimumStock(10);
                return epi;
        }
}
