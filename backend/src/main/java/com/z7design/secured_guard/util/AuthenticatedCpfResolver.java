package com.z7design.secured_guard.util;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class AuthenticatedCpfResolver {

    private static final Set<String> PAYSLIP_ADMIN_AUTHORITIES = Set.of(
          "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_ADMINISTRADOR", "ROLE_RH", "ROLE_FINANCEIRO", "ROLE_DEPARTAMENTO_PESSOAL",
          "SUPER_ADMIN", "ADMIN", "ADMINISTRADOR", "RH", "FINANCEIRO", "DEPARTAMENTO_PESSOAL",
          "PAYSLIPS_READ", "PAYSLIPS_WRITE", "PAYSLIPS_CREATE", "PAYSLIPS_DELETE", "PAYSLIPS_PUBLISH");

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    public Optional<String> resolve(Authentication authentication) {
        if (authentication == null) {
            return Optional.empty();
        }

        if (authentication.getPrincipal() instanceof User userPrincipal) {
            Optional<String> cpf = extractCpfFromUser(userPrincipal);
            if (cpf.isPresent()) {
                return cpf;
            }
        }

        String authName = authentication.getName();
        Optional<String> cpfFromName = normalizeCpf(authName);
        if (cpfFromName.isPresent()) {
            return cpfFromName;
        }

        Optional<User> userByUsername = userRepository.findByUsername(authName);
        if (userByUsername.isPresent()) {
            Optional<String> cpf = extractCpfFromUser(userByUsername.get());
            if (cpf.isPresent()) {
                return cpf;
            }
        }

        Optional<User> userByEmail = userRepository.findByEmail(authName);
        if (userByEmail.isPresent()) {
            return extractCpfFromUser(userByEmail.get());
        }

        return Optional.empty();
    }

    public Optional<String> normalizeCpf(String value) {
        if (value == null) {
            return Optional.empty();
        }
        String digits = value.replaceAll("\\D", "");
        if (digits.length() == 11) {
            return Optional.of(digits);
        }
        return Optional.empty();
    }

    public Optional<String> extractCpfFromUser(User user) {
        if (user == null) {
            return Optional.empty();
        }

        Optional<String> cpf = normalizeCpf(user.getUsername());
        if (cpf.isPresent()) {
            return cpf;
        }

        cpf = normalizeCpf(user.getEmail());
        if (cpf.isPresent()) {
            return cpf;
        }

        if (user.getId() != null) {
            Optional<Employee> byUserId = employeeRepository.findByUserId(user.getId());
            if (byUserId.isPresent()) {
                cpf = extractCpfFromEmployee(byUserId.get());
                if (cpf.isPresent()) {
                    return cpf;
                }
            }
        }

        Optional<Employee> byEmail = employeeRepository.findByEmail(user.getEmail());
        if (byEmail.isPresent()) {
            cpf = extractCpfFromEmployee(byEmail.get());
            if (cpf.isPresent()) {
                return cpf;
            }
        }

        Optional<Employee> byDocument = employeeRepository.findByDocument(user.getUsername());
        if (byDocument.isPresent()) {
            cpf = extractCpfFromEmployee(byDocument.get());
            if (cpf.isPresent()) {
                return cpf;
            }
        }

        Optional<Employee> byName = employeeRepository.findByNameExact(user.getName());
        if (byName.isPresent()) {
            cpf = extractCpfFromEmployee(byName.get());
            if (cpf.isPresent()) {
                return cpf;
            }
        }

        return Optional.empty();
    }

    public Optional<String> extractCpfFromEmployee(Employee employee) {
        if (employee == null) {
            return Optional.empty();
        }
        return normalizeCpf(employee.getDocument());
    }

    /**
     * Perfis que não são RH/Financeiro devem ver apenas documentos do próprio CPF
     * (holerites, comprovantes, etc.), inclusive COMERCIAL com vínculo de funcionário.
     */
    public boolean restrictsToOwnEmployeeDocuments(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return true;
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .noneMatch(PAYSLIP_ADMIN_AUTHORITIES::contains);
    }
}

