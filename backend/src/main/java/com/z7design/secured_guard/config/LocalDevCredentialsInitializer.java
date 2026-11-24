package com.z7design.secured_guard.config;

import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Role;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.ClientStatus;
import com.z7design.secured_guard.model.enums.UserStatus;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.ContractRepository;
import com.z7design.secured_guard.repository.RoleRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.HashSet;

/**
 * Garante credenciais conhecidas e integridade de dados para desenvolvimento local (perfis {@code local} e {@code dev}).
 */
@Configuration
@Profile({"local", "dev"})
@RequiredArgsConstructor
@Slf4j
public class LocalDevCredentialsInitializer {

    private static final String DEV_USERNAME = "jose.ramos";
    private static final String DEV_PASSWORD = "Admin1234";

    private static final String DEV_COMERCIAL_USERNAME = "comercial";
    private static final String DEV_COMERCIAL_PASSWORD = "Admin1234";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final ClientRepository clientRepository;
    private final CompanyRepository companyRepository;
    private final ContractRepository contractRepository;

    @Value("${app.local.ensure-dev-credentials:true}")
    private boolean ensureDevCredentials;

    @Bean
    @Order(0)
    public CommandLineRunner ensureLocalDevAdminCredentials() {
        return args -> {
            if (!ensureDevCredentials) {
                return;
            }

            // Garante usuário admin jose.ramos
            userRepository.findByUsername(DEV_USERNAME).ifPresentOrElse(user -> {
                if (!passwordEncoder.matches(DEV_PASSWORD, user.getPassword())) {
                    user.setPassword(passwordEncoder.encode(DEV_PASSWORD));
                    user.setActive(true);
                    userRepository.save(user);
                    log.info("Credenciais de desenvolvimento restauradas para {}", DEV_USERNAME);
                }
            }, () -> log.warn("Usuário {} não encontrado — pulando reset de senha local", DEV_USERNAME));

            // Garante usuário comercial para testes e operação do módulo Comercial
            userRepository.findByUsername(DEV_COMERCIAL_USERNAME).ifPresentOrElse(user -> {
                boolean needsUpdate = false;
                if (!passwordEncoder.matches(DEV_COMERCIAL_PASSWORD, user.getPassword())) {
                    user.setPassword(passwordEncoder.encode(DEV_COMERCIAL_PASSWORD));
                    needsUpdate = true;
                }
                if (!user.isActive()) {
                    user.setActive(true);
                    needsUpdate = true;
                }
                if (user.getStatus() != UserStatus.ACTIVE) {
                    user.setStatus(UserStatus.ACTIVE);
                    needsUpdate = true;
                }
                if (needsUpdate) {
                    userRepository.save(user);
                    log.info("Credenciais de desenvolvimento restauradas para {}", DEV_COMERCIAL_USERNAME);
                }
            }, () -> {
                try {
                    Role comercialRole = roleRepository.findByName("COMERCIAL")
                            .or(() -> roleRepository.findByName("ROLE_COMERCIAL"))
                            .orElse(null);
                    User comercialUser = User.builder()
                            .username(DEV_COMERCIAL_USERNAME)
                            .email("comercial@promovervigilancia.com.br")
                            .name("Usuário Comercial")
                            .password(passwordEncoder.encode(DEV_COMERCIAL_PASSWORD))
                            .active(true)
                            .status(UserStatus.ACTIVE)
                            .roles(comercialRole != null ? new HashSet<>(Collections.singletonList(comercialRole)) : new HashSet<>())
                            .build();
                    userRepository.save(comercialUser);
                    log.info("Usuário {} criado com sucesso para testes do Comercial", DEV_COMERCIAL_USERNAME);
                } catch (Exception e) {
                    log.warn("Não foi possível criar usuário de teste comercial: {}", e.getMessage());
                }
            });

            // Garante clientes cadastrados para testes de contratos e minutas comerciais se a base estiver vazia
            try {
                if (clientRepository.count() == 0) {
                    log.info("Nenhum cliente cadastrado detectado em ambiente local. Inicializando clientes para testes comerciais...");
                    Company defaultCompany = companyRepository.findAll().stream().findFirst().orElse(null);

                    Client client1 = new Client();
                    client1.setName("Empresa Segurança Ltda");
                    client1.setCnpj("12.345.678/0001-90");
                    client1.setEmail("contato@empresaseguranca.com.br");
                    client1.setPhone("(11) 3333-4444");
                    client1.setContactName("João Silva");
                    client1.setContactPhone("(11) 99999-7777");
                    client1.setStatus(ClientStatus.ACTIVE);
                    client1.setCompany(defaultCompany);
                    clientRepository.save(client1);

                    Client client2 = new Client();
                    client2.setName("Shopping Center Plaza");
                    client2.setCnpj("98.765.432/0001-10");
                    client2.setEmail("administracao@shoppingplaza.com.br");
                    client2.setPhone("(21) 2222-3333");
                    client2.setContactName("Maria Santos");
                    client2.setContactPhone("(21) 88888-6666");
                    client2.setStatus(ClientStatus.ACTIVE);
                    client2.setCompany(defaultCompany);
                    clientRepository.save(client2);

                    Client client3 = new Client();
                    client3.setName("Condomínio Residencial Verde");
                    client3.setCnpj("33.222.111/0001-33");
                    client3.setEmail("sindico@condominioverde.com.br");
                    client3.setPhone("(41) 4444-5555");
                    client3.setContactName("Ana Costa");
                    client3.setContactPhone("(41) 66666-4444");
                    client3.setStatus(ClientStatus.ACTIVE);
                    client3.setCompany(defaultCompany);
                    clientRepository.save(client3);

                    log.info("Clientes para testes locais inicializados com sucesso.");
                }
            } catch (Exception e) {
                log.warn("Aviso ao verificar/inicializar clientes locais: {}", e.getMessage());
            }

            // Garante integridade referencial: repara contratos cujos clientes foram excluídos ou não existem
            try {
                Client fallbackClient = clientRepository.findAll().stream().findFirst().orElse(null);
                if (fallbackClient != null) {
                    contractRepository.findAll().forEach(contract -> {
                        try {
                            if (contract.getClient() != null && contract.getClient().getId() != null) {
                                if (!clientRepository.existsById(contract.getClient().getId())) {
                                    log.warn("Reparando contrato {} (apontava para cliente órfão/inexistente {}). Vinculando ao cliente válido {}",
                                            contract.getContractNumber(), contract.getClient().getId(), fallbackClient.getName());
                                    contract.setClient(fallbackClient);
                                    contractRepository.save(contract);
                                }
                            }
                        } catch (Exception ex) {
                            log.warn("Aviso ao verificar contrato {}: {}", contract.getId(), ex.getMessage());
                        }
                    });
                }
            } catch (Exception e) {
                log.warn("Aviso ao verificar contratos órfãos: {}", e.getMessage());
            }
        };
    }
}
