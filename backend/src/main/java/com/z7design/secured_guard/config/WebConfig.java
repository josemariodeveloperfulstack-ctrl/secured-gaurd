package com.z7design.secured_guard.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import com.z7design.secured_guard.service.FileStorageService;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.HandlerInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.nio.file.Paths;
import java.nio.file.Files;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebConfig.class);

    // Usar a mesma propriedade que FileUploadController
    @org.springframework.beans.factory.annotation.Value("${app.upload.base-dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        log.info("🔧 Configurando ResourceHandlers para arquivos estáticos");
        log.info("📁 uploadDir configurado: {}", uploadDir);

        // Obter caminho absoluto para garantir funcionamento independente do diretório
        // de execução
        String absoluteUploadPath = Paths.get(uploadDir).toAbsolutePath().normalize().toString().replace("\\", "/");
        if (!absoluteUploadPath.endsWith("/")) {
            absoluteUploadPath += "/";
        }

        log.info("📁 Caminho de uploads (absoluto): {}", absoluteUploadPath);

        // Servir arquivos de upload estaticamente
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + absoluteUploadPath)
                .setCachePeriod(3600);

        // Servir arquivos de holerites
        registry.addResourceHandler("/holerites/**")
                .addResourceLocations("file:holerites/")
                .setCachePeriod(3600);

        // Servir logos de empresas estaticamente (sem autenticação)
        String logoPath = absoluteUploadPath + "companies/logos/";
        registry.addResourceHandler("/api/uploads/companies/logos/**")
                .addResourceLocations("file:" + logoPath)
                .setCachePeriod(3600);

        log.info("✅ ResourceHandlers configurados com caminhos absolutos");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
                    throws Exception {
                // Adicionar headers CORS para arquivos estáticos
                if (request.getRequestURI().startsWith("/uploads/") ||
                        request.getRequestURI().startsWith("/holerites/") ||
                        request.getRequestURI().startsWith("/api/uploads/companies/logos/")) {
                    response.setHeader("Access-Control-Allow-Origin", "*");
                    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
                    response.setHeader("Access-Control-Allow-Headers", "*");
                    // NÃO definir Content-Disposition aqui - será definido pelo ResourceHandler ou
                    // pelo endpoint do controller
                    // Não definir X-Frame-Options para permitir iframe
                }
                return true;
            }
        });
    }

    @Bean(name = "receiptStorageService")
    public FileStorageService receiptStorageService() {
        return new FileStorageService("receipts");
    }
}