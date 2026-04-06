package com.z7design.secured_guard.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * Carrega textos longos de contrato (experiência ou prazo indeterminado) a partir de classpath.
 * O PDF justifica o texto e quebra em várias páginas.
 */
@Component
@Slf4j
public class ExperienceEmploymentContractTemplateLoader {

    private static final String EXP_PART1 = "contracts/contrato-experiencia-part1.txt";
    private static final String EXP_PART2 = "contracts/contrato-experiencia-part2.txt";
    private static final String IND_PART1 = "contracts/contrato-indeterminado-part1.txt";
    private static final String IND_PART2 = "contracts/contrato-indeterminado-part2.txt";

    public String loadRawTemplate() {
        return loadConcat(EXP_PART1, EXP_PART2, "contrato de experiência");
    }

    /** Contrato CLT por prazo indeterminado (pós-experiência), sem termo de prorrogação. */
    public String loadIndefiniteRawTemplate() {
        return loadConcat(IND_PART1, IND_PART2, "contrato por prazo indeterminado");
    }

    private String loadConcat(String part1, String part2, String labelForError) {
        try {
            return readUtf8(part1) + "\n\n" + readUtf8(part2);
        } catch (IOException e) {
            log.error("Falha ao carregar template de {}", labelForError, e);
            throw new IllegalStateException(
                    "Template de " + labelForError + " não encontrado. Verifique resources/contracts/", e);
        }
    }

    private static String readUtf8(String classpathLocation) throws IOException {
        ClassPathResource res = new ClassPathResource(classpathLocation);
        try (InputStream in = res.getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
