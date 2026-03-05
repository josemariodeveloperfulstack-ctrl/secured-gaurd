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

        Optional<Employee> existing = employeeRepository.findByDocument(cpf);
        Employee emp = existing.orElseGet(Employee::new);
        isNewRef[0] = existing.isEmpty();

        emp.setName(nome.trim().toUpperCase());
        emp.setDocument(cpf);
        emp.setMatriculaEsocial(matricula);
        emp.setNationality(nationality);
        emp.setBirthDate(birthDate);
        emp.setMunicipioNascimento(municipioNasc);
        emp.setEstadoNascimento(estadoNasc);
        emp.setNomeMae(nomeMae);
        emp.setNomePai(nomePai);
        emp.setSexo(sexo);
        emp.setMaritalStatus(maritalStatus);
        emp.setGrauInstrucao(grauInstrucao);
        emp.setCbo(cbo);
        emp.setHireDate(hireDate);
        emp.setTerminationDate(null);
        if (salario != null)
            emp.setSalario(salario);
        emp.setHorarioTrabalho(horario);
        emp.setEscalaTrabalho(escalaTrabalho);
        emp.setPis(pis);
        emp.setCtps(ctps);
        emp.setNumeroRg(rg);
        emp.setTituloEleitor(tituloEleitor);
        emp.setEnderecoRua(rua);
        emp.setEnderecoNumero(numero);
        emp.setEnderecoComplemento(complemento);
        emp.setEnderecoBairro(bairro);
        emp.setEnderecoCidade(cidade);
        emp.setEnderecoEstado(estado);
        emp.setEnderecoCep(cep);
        emp.setStatus(EmploymentStatus.ACTIVE);
        emp.setCompany(company);

        if (departamentoNome != null && !departamentoNome.isBlank()) {
            String setorClean = departamentoNome.trim();
            // Prioridade 1: Tentar vincular a um Posto de Trabalho (WorkPost) pelo nome
            Optional<WorkPost> workPostOpt = workPostRepository.findByName(setorClean)
                    .or(() -> workPostRepository.findByNameContainingIgnoreCase(setorClean).stream().findFirst());

            if (workPostOpt.isPresent()) {
                emp.setWorkPost(workPostOpt.get());
                log.info("📌 Posto de Trabalho '{}' vinculado ao funcionário", setorClean);
            } else {
                // Prioridade 2: Tentar vincular a Unidade ou Departamento pelo nome (legado)
                emp.setDepartment(resolveOrCreateDepartment(setorClean));
            }
        }
        if (funcaoNome != null && !funcaoNome.isBlank()) {
            emp.setPosition(resolveOrCreatePosition(funcaoNome.trim()));
        }

        employeeRepository.save(emp);
        return isNewRef[0];
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
