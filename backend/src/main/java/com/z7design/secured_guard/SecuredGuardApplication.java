package com.z7design.secured_guard;

// Force recompile to resolve ClassLoader issues
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import com.z7design.secured_guard.config.JwtConfig;

@SpringBootApplication
@EnableConfigurationProperties(JwtConfig.class)
@EnableAspectJAutoProxy
@EnableMethodSecurity
@EnableScheduling
@EnableAsync
// Escanear todo o pacote raiz da app (inclui model e subpacotes). Apenas "model" pode falhar com
// DevTools/class loaders ou deixar de alinhar com o @AutoConfigurationPackage em alguns cenários.
@EntityScan(basePackages = "com.z7design.secured_guard")
@EnableJpaRepositories("com.z7design.secured_guard.repository")
@ComponentScan(basePackages = "com.z7design.secured_guard")
public class SecuredGuardApplication {
    @jakarta.annotation.PostConstruct
    public void init() {
        // Garantir que o Spring e a JVM rodem no fuso horário do Brasil
        // para evitar que relatórios gerados à noite peguem a data do dia seguinte no servidor Docker UTC.
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("America/Sao_Paulo"));
    }

    public static void main(String[] args) {
        String dsUrl = System.getenv("SPRING_DATASOURCE_URL");
        if (dsUrl == null || dsUrl.trim().isEmpty()) {
            if (System.getProperty("spring.datasource.url") == null) {
                System.setProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/secured_guard_test");
            }
            if (System.getProperty("spring.datasource.username") == null) {
                System.setProperty("spring.datasource.username", "postgres");
            }
            if (System.getProperty("spring.datasource.password") == null) {
                System.setProperty("spring.datasource.password", "1234567");
            }
            if (System.getProperty("spring.datasource.driver-class-name") == null) {
                System.setProperty("spring.datasource.driver-class-name", "org.postgresql.Driver");
            }
        }
        SpringApplication.run(SecuredGuardApplication.class, args);
    }
}