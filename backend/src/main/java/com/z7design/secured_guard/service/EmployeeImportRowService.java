package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import com.z7design.secured_guard.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Processa cada linha da planilha em transação independente (REQUIRES_NEW).
 * Isso garante que a falha em uma linha não cancele as demais.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeImportRowService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final WorkPostRepository workPostRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean processRow(
            String cpf, String nome,
            String matricula, String nationality,
            LocalDate birthDate, String municipioNasc, String estadoNasc,
            String nomeMae, String nomePai, String sexo,
            String maritalStatus, String grauInstrucao,
            String departamentoNome, String funcaoNome,
            String cbo, LocalDate hireDate,
            BigDecimal salario, String horario, String escalaTrabalho,
            String pis, String ctps, String rg,
            String tituloEleitor, String rua, String numero,
            String complemento, String bairro, String cidade,
            String estado, String cep,
            Company company,
            boolean[] isNewRef) {

        // Permite cadastrar o mesmo CPF para empresas diferentes ou re-admissão se demitido. Bloqueia apenas se ativo na mesma empresa.
        UUID companyId = company != null ? company.getId() : null;
        if (employeeRepository.existsByNormalizedDocumentAndCompanyIdAndNotTerminated(cpf, companyId)) {
            throw new IllegalStateException("Funcionário com CPF " + cpf + " já existe e está ativo nesta empresa. O cadastro existente foi preservado sem alterações.");
        }

        Employee emp = new Employee();
        isNewRef[0] = true;

        emp.setName(truncate(nome != null ? nome.trim().toUpperCase() : null, 500));
        emp.setDocument(truncate(cpf, 14));
        emp.setMatriculaEsocial(truncate(matricula, 50));
        emp.setNationality(truncate(nationality, 50));
        emp.setBirthDate(birthDate);
        emp.setMunicipioNascimento(truncate(municipioNasc, 100));
        emp.setEstadoNascimento(truncate(estadoNasc, 2));
        emp.setNomeMae(truncate(nomeMae, 100));
        emp.setNomePai(truncate(nomePai, 100));
        emp.setSexo(truncate(sexo, 50));
        emp.setMaritalStatus(truncate(maritalStatus, 50));
        emp.setGrauInstrucao(truncate(grauInstrucao, 50));
        emp.setCbo(truncate(cbo, 50));
        emp.setHireDate(hireDate);
        emp.setTerminationDate(null);
        if (salario != null)
            emp.setSalario(salario);
        emp.setHorarioTrabalho(horario);
        emp.setEscalaTrabalho(escalaTrabalho);
        emp.setPis(truncate(pis, 50));
        emp.setCtps(truncate(ctps, 30));
        emp.setNumeroRg(truncate(rg, 30));
        emp.setTituloEleitor(truncate(tituloEleitor, 50));
        emp.setEnderecoRua(truncate(rua, 255));
        emp.setEnderecoNumero(truncate(numero, 50));
        emp.setEnderecoComplemento(truncate(complemento, 100));
        emp.setEnderecoBairro(truncate(bairro, 100));
        emp.setEnderecoCidade(truncate(cidade, 100));
        emp.setEnderecoEstado(truncate(estado, 2));
        emp.setEnderecoCep(truncate(cep, 10));
        emp.setStatus(EmploymentStatus.ACTIVE);
        emp.setCompany(company);

        if (departamentoNome != null && !departamentoNome.isBlank()) {
            String setorClean = departamentoNome.trim();
            // Match apenas exato (case-insensitive) — evita trocar posto errado em produção
            // por substring (ex.: "BH" casar com "BH BUS CENTRO").
            Optional<WorkPost> workPostOpt = workPostRepository.findByName(setorClean)
                    .or(() -> workPostRepository.findByNameIgnoreCase(setorClean));

            if (workPostOpt.isPresent()) {
                emp.setWorkPost(workPostOpt.get());
                log.info("📌 Posto de Trabalho '{}' vinculado ao funcionário", workPostOpt.get().getName());
            } else if (emp.getWorkPost() == null) {
                // Só grava departamento se o funcionário ainda NÃO tiver posto.
                // Nunca remove work_post_id existente quando o nome da planilha não casa.
                emp.setDepartment(resolveOrCreateDepartment(setorClean));
                log.warn("⚠️ Posto '{}' não encontrado — mantido work_post atual (se houver); setor salvo como departamento",
                        setorClean);
            } else {
                log.warn("⚠️ Posto '{}' não encontrado na planilha — mantido posto atual '{}' (não alterado)",
                        setorClean, emp.getWorkPost().getName());
            }
        }
        if (funcaoNome != null && !funcaoNome.isBlank()) {
            emp.setPosition(resolveOrCreatePosition(funcaoNome.trim()));
        }

        employeeRepository.save(emp);
        return isNewRef[0];
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.isBlank()) return value;
        if (value.length() <= maxLength) return value;
        return value.substring(0, maxLength).trim();
    }

    private Department resolveOrCreateDepartment(String nome) {
        List<Department> found = departmentRepository.findByNameContainingIgnoreCase(nome);
        if (!found.isEmpty())
            return found.get(0);

        Department dep = new Department();
        dep.setName(nome.toUpperCase());
        dep.setIsActive(true);
        dep = departmentRepository.save(dep);
        log.info("🏢 Departamento criado: {}", nome);
        return dep;
    }

    private Position resolveOrCreatePosition(String nome) {
        Optional<Position> found = positionRepository.findByName(nome.toUpperCase());
        if (found.isPresent())
            return found.get();

        List<Position> partial = positionRepository.searchPositions(nome);
        if (!partial.isEmpty())
            return partial.get(0);

        Position pos = new Position();
        pos.setName(nome.toUpperCase());
        pos.setBaseSalary(BigDecimal.ZERO);
        pos = positionRepository.save(pos);
        log.info("💼 Cargo criado: {}", nome);
        return pos;
    }
}
