package com.z7design.secured_guard.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

@org.springframework.context.annotation.Configuration
public class SeetaFace2Config {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SeetaFace2Config.class);

    @Bean
    public String seetaFace2ModelPath() {
        try {
            // Carregar modelos do classpath
            Resource resource = new ClassPathResource("seetaface2/models/");
            File modelDir = resource.getFile();

            log.info("SeetaFace2 models path: {}", modelDir.getAbsolutePath());

            // Carregar biblioteca nativa
            loadNativeLibrary();

            return modelDir.getAbsolutePath();
        } catch (IOException e) {
            log.warn("Erro ao carregar modelos do SeetaFace2: {}", e.getMessage());
            // Retornar path padrão para desenvolvimento
            return System.getProperty("user.dir") + "/src/main/resources/seetaface2/models/";
        }
    }

    private void loadNativeLibrary() {
        try {
            String osName = System.getProperty("os.name").toLowerCase();
            String libraryName;

            if (osName.contains("win")) {
                libraryName = "seetaface2.dll";
            } else if (osName.contains("linux")) {
                libraryName = "libseetaface2.so";
            } else if (osName.contains("mac")) {
                libraryName = "libseetaface2.dylib";
            } else {
                log.warn("Sistema operacional não suportado: {}", osName);
                return;
            }

            log.info("Tentando carregar biblioteca nativa: {}", libraryName);

            // Carregar biblioteca nativa
            System.loadLibrary("seetaface2");
            log.info("Biblioteca nativa do SeetaFace2 carregada com sucesso");

        } catch (UnsatisfiedLinkError e) {
            log.warn("Erro ao carregar biblioteca nativa do SeetaFace2: {}", e.getMessage());
            log.warn("Continuando com implementação simulada para desenvolvimento");
        }
    }

    @Bean
    public boolean seetaFace2Available() {
        try {
            // Tentar carregar a biblioteca para verificar disponibilidade
            System.loadLibrary("seetaface2");
            return true;
        } catch (UnsatisfiedLinkError e) {
            log.warn("SeetaFace2 não disponível, usando implementação simulada");
            return false;
        }
    }
}
