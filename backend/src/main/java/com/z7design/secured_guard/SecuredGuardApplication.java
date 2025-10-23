package com.z7design.secured_guard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import com.z7design.secured_guard.config.JwtConfig;

@SpringBootApplication
@EnableConfigurationProperties(JwtConfig.class)
@EnableAspectJAutoProxy
@EnableMethodSecurity
@EnableScheduling
@EntityScan("com.z7design.secured_guard.model")
@EnableJpaRepositories("com.z7design.secured_guard.repository")
@ComponentScan(basePackages = "com.z7design.secured_guard")
public class SecuredGuardApplication {

    public static void main(String[] args) {
        SpringApplication.run(SecuredGuardApplication.class, args);
    }
}