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
import java.nio.file.Path;
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

        Path uploadPathObj = Paths.get(uploadDir).toAbsolutePath().normalize();
        String uploadUri = uploadPathObj.toUri().toString();
        if (!uploadUri.endsWith("/")) {
            uploadUri += "/";
        }

        log.info("📁 Caminho de uploads (URI): {}", uploadUri);

        // Servir arquivos de upload estaticamente (/uploads/** e /api/uploads/**)
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadUri)
                .setCachePeriod(3600);

        registry.addResourceHandler("/api/uploads/**")
                .addResourceLocations(uploadUri)
                .setCachePeriod(3600);

        // Servir logos de empresas estaticamente (sem autenticação)
        String logoUri = uploadPathObj.resolve("companies").resolve("logos").toUri().toString();
        if (!logoUri.endsWith("/")) {
            logoUri += "/";
        }
        registry.addResourceHandler("/api/uploads/companies/logos/**")
                .addResourceLocations(logoUri)
                .setCachePeriod(3600);

        // Servir carimbos de profissionais SST estaticamente (sem autenticação)
        String stampUri = uploadPathObj.resolve("safety-engineers").resolve("stamps").toUri().toString();
        if (!stampUri.endsWith("/")) {
            stampUri += "/";
        }
        registry.addResourceHandler("/api/uploads/safety-engineers/stamps/**")
                .addResourceLocations(stampUri)
                .setCachePeriod(3600);

        // Servir arquivos de holerites
        registry.addResourceHandler("/holerites/**")
                .addResourceLocations("file:holerites/")
                .setCachePeriod(3600);

        log.info("✅ ResourceHandlers configurados com URIs file:/// absolutas");
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
                        request.getRequestURI().startsWith("/api/uploads/companies/logos/") ||
                        request.getRequestURI().startsWith("/api/uploads/safety-engineers/stamps/")) {
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