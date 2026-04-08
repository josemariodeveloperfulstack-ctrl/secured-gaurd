package com.z7design.secured_guard.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.HashMap;
import java.util.Objects;
import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Remanejamento;
import com.z7design.secured_guard.model.RemanejamentoTipo;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import com.z7design.secured_guard.model.enums.UserStatus;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.repository.PositionRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import com.z7design.secured_guard.dto.EmployeeDTO;
import com.z7design.secured_guard.dto.SimpleEmployeeDTO;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeService {

    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PositionRepository positionRepository;
    @Autowired
    private UnitRepository unitRepository;
    @Autowired
    private com.z7design.secured_guard.repository.CompanyRepository companyRepository;
    @Autowired
    private com.z7design.secured_guard.repository.DoctorRepository doctorRepository;
    @Autowired
    private com.z7design.secured_guard.repository.WorkPostRepository workPostRepository;
    @Autowired
    private com.z7design.secured_guard.repository.DepartmentRepository departmentRepository;
    @Autowired
    private EmployeeChangeHistoryService employeeChangeHistoryService;
    @Autowired
    private RemanejamentoService remanejamentoService;

    @Transactional
    @CacheEvict(value = { "employees", "employees-by-company", "dashboard-summary" }, allEntries = true)
    public EmployeeDTO create(EmployeeDTO dto) {
        try {
            System.out.println("[DEBUG] EmployeeService.create - Iniciando criação de funcionário");
            System.out.println("[DEBUG] DTO recebido: " + dto.getName() + " - " + dto.getCpf());

            if (dto.getEmail() != null && !dto.getEmail().trim().isEmpty()
                    && employeeRepository.existsByEmail(dto.getEmail())) {
                throw new java.lang.IllegalArgumentException("Email já cadastrado");
            }

            if (dto.getCpf() != null && employeeRepository.existsByDocument(dto.getCpf())) {
                throw new java.lang.IllegalArgumentException("CPF já cadastrado para outro funcionário");
            }

            System.out.println("[DEBUG] Validações passaram, convertendo DTO para Entity");
            Employee employee = toEntity(dto);

            // Log fields after toEntity conversion
            System.out.println("[DEBUG] Fields after toEntity:");
            System.out.println("  - Sexo: " + employee.getSexo());
            System.out.println("  - MaritalStatus: " + employee.getMaritalStatus());
            System.out.println("  - GrauInstrucao: " + employee.getGrauInstrucao());

            applyTerminationRules(employee, dto);
            System.out.println("[DEBUG] Entity criada, salvando no banco");
            Employee saved = employeeRepository.save(employee);
            System.out.println("[DEBUG] Funcionário salvo com ID: " + saved.getId());
            return toDTO(saved);
        } catch (Exception e) {
            System.err.println("[ERROR] Erro ao criar funcionário: " + e.getMessage());
            if (dto.getSalario() != null) {
                System.err.println("[DEBUG] Valor do salário no DTO: " + dto.getSalario());
            }
            e.printStackTrace();
            throw new RuntimeException("Erro ao criar funcionário: " + e.getMessage(), e);
        }
    }

    @Transactional
    @CacheEvict(value = { "employees", "employees-by-company", "dashboard-summary" }, allEntries = true)
    public EmployeeDTO update(UUID id, EmployeeDTO dto) {
        return update(id, dto, null);
    }

    @Transactional
    @CacheEvict(value = { "employees", "employees-by-company", "dashboard-summary" }, allEntries = true)
    public EmployeeDTO update(UUID id, EmployeeDTO dto, UUID changedByUserId) {
        try {
            System.out.println("[DEBUG] EmployeeService.update - Iniciando atualização do funcionário ID: " + id);
            System.out.println("[DEBUG] DTO recebido - Nome: " + dto.getName() + ", Email: " + dto.getEmail());

            Employee existingEmployee = findById(id);
            Map<String, String> oldSnapshot = (changedByUserId != null) ? buildOldSnapshot(existingEmployee) : null;
            System.out.println("[DEBUG] Funcionário existente encontrado: " + existingEmployee.getName());
            System.out.println("[DEBUG] Email existente: " + existingEmployee.getEmail());

            // Validar email único (exceto para o próprio funcionário)
            if (dto.getEmail() != null && existingEmployee.getEmail() != null &&
                    !existingEmployee.getEmail().equals(dto.getEmail()) &&
                    employeeRepository.existsByEmail(dto.getEmail())) {
                throw new RuntimeException("Email já cadastrado");
            }

            // Validar CPF único (exceto para o próprio funcionário)
            if (dto.getCpf() != null && !dto.getCpf().equals(existingEmployee.getDocument())) {
                if (employeeRepository.existsByDocument(dto.getCpf())) {
                    throw new RuntimeException("CPF já cadastrado para outro funcionário");
                }
            }

            System.out.println("[DEBUG] Atualizando campos do funcionário existente...");

            // Atualizar apenas os campos fornecidos, preservando campos de auditoria
            if (dto.getName() != null) {
                existingEmployee.setName(dto.getName());
            }
            if (dto.getCpf() != null) {
                existingEmployee.setDocument(dto.getCpf());
                existingEmployee.setCpf(dto.getCpf());
            }
            if (dto.getBirthDate() != null) {
                existingEmployee.setBirthDate(dto.getBirthDate());
            }
            if (dto.getMaritalStatus() != null) {
                System.out.println("[DEBUG] Atualizando MaritalStatus: " + dto.getMaritalStatus());
                existingEmployee.setMaritalStatus(dto.getMaritalStatus());
            }
            if (dto.getNationality() != null) {
                existingEmployee.setNationality(dto.getNationality());
            }
            if (dto.getPhotoUrl() != null) {
                existingEmployee.setPhotoUrl(dto.getPhotoUrl());
            }
            if (dto.getGrauInstrucao() != null) {
                System.out.println("[DEBUG] Atualizando GrauInstrucao: " + dto.getGrauInstrucao());
                existingEmployee.setGrauInstrucao(dto.getGrauInstrucao());
            }
            if (dto.getSexo() != null) {
                System.out.println("[DEBUG] Atualizando Sexo: " + dto.getSexo());
                existingEmployee.setSexo(dto.getSexo());
            }
            if (dto.getMunicipioNascimento() != null) {
                existingEmployee.setMunicipioNascimento(dto.getMunicipioNascimento());
            }
            if (dto.getLocalNascimento() != null) {
                existingEmployee.setLocalNascimento(dto.getLocalNascimento());
            }
            if (dto.getEstadoNascimento() != null) {
                existingEmployee.setEstadoNascimento(dto.getEstadoNascimento());
            }
            if (dto.getSpouseName() != null) {
                existingEmployee.setSpouseName(dto.getSpouseName());
            }
            if (dto.getSpouseCpf() != null) {
                existingEmployee.setSpouseCpf(dto.getSpouseCpf());
            }
            if (dto.getSpouseRg() != null) {
                existingEmployee.setSpouseRg(dto.getSpouseRg());
            }
            if (dto.getSpouseBirthDate() != null) {
                existingEmployee.setSpouseBirthDate(dto.getSpouseBirthDate());
            }
            if (dto.getSpousePhone() != null) {
                existingEmployee.setSpousePhone(dto.getSpousePhone());
            }
            if (dto.getSpouseEmail() != null) {
                existingEmployee.setSpouseEmail(dto.getSpouseEmail());
            }
            if (dto.getRegistrationNumber() != null) {
                existingEmployee.setRegistrationNumber(dto.getRegistrationNumber());
            }
            if (dto.getHireDate() != null) {
                existingEmployee.setHireDate(dto.getHireDate());
            }
            if (dto.getTerminationDate() != null) {
                existingEmployee.setTerminationDate(dto.getTerminationDate());
            }
            if (dto.getStatus() != null && !dto.getStatus().trim().isEmpty()) {
                try {
                    EmploymentStatus status = EmploymentStatus.valueOf(dto.getStatus().toUpperCase());
                    existingEmployee.setStatus(status);
                    System.out.println("[DEBUG] Status atualizado: " + status);
                } catch (IllegalArgumentException ex) {
                    System.err.println("[ERROR] Status inválido: " + dto.getStatus());
                    throw new RuntimeException("Status inválido: " + dto.getStatus() + ". Status válidos: " +
                            Arrays.toString(EmploymentStatus.values()));
                }
            }
            if (dto.getNotes() != null) {
                existingEmployee.setNotes(dto.getNotes());
            }
            // Atualizar campo address (compatibilidade) e campos separados
            if (dto.getAddress() != null && dto.getAddress().getStreet() != null
                    && !dto.getAddress().getStreet().isEmpty()) {
                existingEmployee.setAddress(dto.getAddress().getStreet());
                System.out.println("[DEBUG] Address atualizado: " + existingEmployee.getAddress());
            }

            // Se os campos separados vierem no objeto address, usar eles também
            if (dto.getAddress() != null) {
                if (dto.getAddress().getStreet() != null) {
                    existingEmployee.setEnderecoRua(dto.getAddress().getStreet());
                }
                if (dto.getAddress().getNumber() != null) {
                    existingEmployee.setEnderecoNumero(dto.getAddress().getNumber());
                }
                if (dto.getAddress().getComplement() != null) {
                    existingEmployee.setEnderecoComplemento(dto.getAddress().getComplement());
                }
                if (dto.getAddress().getNeighborhood() != null) {
                    existingEmployee.setEnderecoBairro(dto.getAddress().getNeighborhood());
                }
                if (dto.getAddress().getCity() != null) {
                    existingEmployee.setEnderecoCidade(dto.getAddress().getCity());
                }
                if (dto.getAddress().getState() != null) {
                    existingEmployee.setEnderecoEstado(dto.getAddress().getState());
                }
                if (dto.getAddress().getZipCode() != null) {
                    existingEmployee.setEnderecoCep(dto.getAddress().getZipCode());
                }
            }
            if (dto.getPhone() != null) {
                existingEmployee.setPhone(dto.getPhone());
            }
            if (dto.getEmail() != null) {
                existingEmployee.setEmail(dto.getEmail());
            }

            // Atualizar telefone de contato
            if (dto.getTelefoneContato() != null) {
                existingEmployee.setTelefoneContato(dto.getTelefoneContato());
            }

            // Atualizar campos de endereço separados
            if (dto.getEnderecoRua() != null) {
                existingEmployee.setEnderecoRua(dto.getEnderecoRua());
            }
            if (dto.getEnderecoNumero() != null) {
                existingEmployee.setEnderecoNumero(dto.getEnderecoNumero());
            }
            if (dto.getEnderecoComplemento() != null) {
                existingEmployee.setEnderecoComplemento(dto.getEnderecoComplemento());
            }
            if (dto.getEnderecoBairro() != null) {
                existingEmployee.setEnderecoBairro(dto.getEnderecoBairro());
            }
            if (dto.getEnderecoCidade() != null) {
                existingEmployee.setEnderecoCidade(dto.getEnderecoCidade());
            }
            if (dto.getEnderecoEstado() != null) {
                existingEmployee.setEnderecoEstado(dto.getEnderecoEstado());
            }
            if (dto.getEnderecoCep() != null) {
                existingEmployee.setEnderecoCep(dto.getEnderecoCep());
            }

            // Atualizar campos CIN
            if (dto.getCinNumero() != null) {
                existingEmployee.setCinNumero(dto.getCinNumero());
            }
            if (dto.getCinOrgaoEmissor() != null) {
                existingEmployee.setCinOrgaoEmissor(dto.getCinOrgaoEmissor());
            }
            if (dto.getCinDataEmissao() != null) {
                existingEmployee.setCinDataEmissao(dto.getCinDataEmissao());
            }

            // Atualizar CTPS Digital PDF (apenas se fornecido)
            if (dto.getCtpsDigitalPdf() != null) {
                existingEmployee.setCtpsDigitalPdf(dto.getCtpsDigitalPdf());
            }
            if (dto.getCtpsDigitalPdfNome() != null) {
                existingEmployee.setCtpsDigitalPdfNome(dto.getCtpsDigitalPdfNome());
            }
            if (dto.getCtpsDigitalPdfTamanho() != null) {
                existingEmployee.setCtpsDigitalPdfTamanho(dto.getCtpsDigitalPdfTamanho());
            }

            // Atualizar dados bancários se fornecidos
            if (dto.getBankInfo() != null) {
                if (dto.getBankInfo().getBank() != null) {
                    existingEmployee.setBanco(dto.getBankInfo().getBank());
                }
                if (dto.getBankInfo().getAgency() != null) {
                    existingEmployee.setAgencia(dto.getBankInfo().getAgency());
                }
                if (dto.getBankInfo().getAccount() != null) {
                    existingEmployee.setContaCorrente(dto.getBankInfo().getAccount());
                }
                if (dto.getBankInfo().getAccountDigit() != null) {
                    existingEmployee.setContaDigito(dto.getBankInfo().getAccountDigit());
                }
                if (dto.getBankInfo().getPixKey() != null) {
                    existingEmployee.setPixKey(dto.getBankInfo().getPixKey());
                }
                if (dto.getBankInfo().getAccountType() != null) {
                    existingEmployee.setAccountType(dto.getBankInfo().getAccountType());
                }
            }

            // Atualizar entidades relacionais se fornecidas
            if (dto.getUser() != null && dto.getUser().getId() != null) {
                existingEmployee.setUser(userRepository.findById(dto.getUser().getId())
                        .orElseThrow(() -> new RuntimeException("Usuário não encontrado para o id informado.")));
            }
            if (dto.getPosition() != null && dto.getPosition().getId() != null) {
                existingEmployee.setPosition(positionRepository.findById(dto.getPosition().getId())
                        .orElseThrow(() -> new RuntimeException("Cargo não encontrado para o id informado.")));
            }
            if (dto.getUnit() != null && dto.getUnit().getId() != null) {
                existingEmployee.setUnit(unitRepository.findById(dto.getUnit().getId()).orElse(null));
            }
            if (dto.getCompany() != null && dto.getCompany().getId() != null) {
                existingEmployee.setCompany(companyRepository.findById(dto.getCompany().getId()).orElse(null));
            }

            // Atualizar WorkPost se fornecido - criar remanejamento quando houver alteração
            WorkPost oldWorkPost = existingEmployee.getWorkPost();
            if (dto.getWorkPostId() != null && !dto.getWorkPostId().trim().isEmpty() && !dto.getWorkPostId().equalsIgnoreCase("null")) {
                try {
                    UUID workPostId = UUID.fromString(dto.getWorkPostId());
                    WorkPost newWorkPost = workPostRepository.findById(workPostId).orElse(null);
                    if (newWorkPost != null && (oldWorkPost == null || !oldWorkPost.getId().equals(newWorkPost.getId()))) {
                        // Posto está mudando - data de início, escala e horário são obrigatórios para remanejamento
                        if (dto.getRemanejamentoDataInicio() == null) {
                            throw new IllegalArgumentException("Ao alterar o setor/posto de trabalho, informe a data de início no novo setor. A escala de trabalho e horário também são obrigatórios e serão registrados no histórico do funcionário.");
                        }
                        if (dto.getEscalaTrabalho() == null || dto.getEscalaTrabalho().trim().isEmpty()) {
                            throw new IllegalArgumentException("Ao alterar o setor/posto de trabalho, a escala de trabalho é obrigatória.");
                        }
                        if (dto.getHorarioTrabalho() == null || dto.getHorarioTrabalho().trim().isEmpty()) {
                            throw new IllegalArgumentException("Ao alterar o setor/posto de trabalho, o horário de trabalho é obrigatório.");
                        }
                        // Criar remanejamento e registrar no histórico
                        if (dto.getRemanejamentoDataInicio() != null) {
                            Remanejamento remanejamento = new Remanejamento();
                            remanejamento.setEmployee(existingEmployee);
                            remanejamento.setTipo(RemanejamentoTipo.TRANSFERENCIA_POSTO_TRABALHO);
                            remanejamento.setOriginWorkstation(oldWorkPost);
                            remanejamento.setDestinationWorkstation(newWorkPost);
                            remanejamento.setOrigem(oldWorkPost != null ? oldWorkPost.getName() : "-");
                            remanejamento.setDestino(newWorkPost.getName());
                            remanejamento.setDataRemanejamento(dto.getRemanejamentoDataInicio());
                            StringBuilder obs = new StringBuilder();
                            if (dto.getEscalaTrabalho() != null && !dto.getEscalaTrabalho().trim().isEmpty()) {
                                obs.append("Escala: ").append(dto.getEscalaTrabalho());
                            }
                            if (dto.getHorarioTrabalho() != null && !dto.getHorarioTrabalho().trim().isEmpty()) {
                                if (obs.length() > 0) obs.append(" | ");
                                obs.append("Horário: ").append(dto.getHorarioTrabalho());
                            }
                            if (obs.length() > 0) remanejamento.setObservacao(obs.toString());
                            remanejamentoService.create(remanejamento, changedByUserId != null ? userRepository.findById(changedByUserId).orElse(null) : null, "Alteração de setor/posto via edição de funcionário");
                        }
                    }
                    if (newWorkPost != null) {
                        existingEmployee.setWorkPost(newWorkPost);
                    }
                } catch (IllegalArgumentException e) {
                    if (e.getMessage() != null && e.getMessage().contains("Ao alterar o setor")) {
                        throw e; // Re-lançar validações de remanejamento para o cliente
                    }
                    System.err.println("[WARNING] WorkPostId inválido: " + dto.getWorkPostId());
                }
            } else if (dto.getWorkPostId() != null && (dto.getWorkPostId().trim().isEmpty() || dto.getWorkPostId().equalsIgnoreCase("null"))) {
                // Se explicitamente enviado como vazio ou "null", limpar o posto
                existingEmployee.setWorkPost(null);
            }
            // Se dto.getWorkPostId() for null, preservamos o valor atual (comportamento de patch)

            // Atualizar Department se fornecido
            if (dto.getDepartmentId() != null && !dto.getDepartmentId().trim().isEmpty() && !dto.getDepartmentId().equalsIgnoreCase("null")) {
                try {
                    UUID departmentId = UUID.fromString(dto.getDepartmentId());
                    existingEmployee.setDepartment(departmentRepository.findById(departmentId).orElse(null));
                } catch (IllegalArgumentException e) {
                    System.err.println("[WARNING] DepartmentId inválido: " + dto.getDepartmentId());
                }
            } else if (dto.getDepartmentId() != null && (dto.getDepartmentId().trim().isEmpty() || dto.getDepartmentId().equalsIgnoreCase("null"))) {
                // Se explicitamente enviado como vazio ou "null", limpar o departamento
                existingEmployee.setDepartment(null);
            }
            // Se dto.getDepartmentId() for null, preservamos o valor atual (comportamento de patch)

            // Atualizar dados do exame médico (ASO)
            if (dto.getExameMedicoData() != null) {
                existingEmployee.setExameMedicoData(dto.getExameMedicoData());
            }
            if (dto.getExameMedicoVencimento() != null) {
                existingEmployee.setExameMedicoVencimento(dto.getExameMedicoVencimento());
            }
            if (dto.getExameMedicoTipo() != null) {
                existingEmployee.setExameMedicoTipo(dto.getExameMedicoTipo());
            }
            if (dto.getExameMedicoDoctor() != null && dto.getExameMedicoDoctor().getId() != null) {
                existingEmployee.setExameMedicoDoctor(
                        doctorRepository.findById(dto.getExameMedicoDoctor().getId()).orElse(null));
            } else if (dto.getExameMedicoDoctor() == null) {
                existingEmployee.setExameMedicoDoctor(null);
            }
            if (dto.getExameMedicoHorario() != null) {
                existingEmployee.setExameMedicoHorario(dto.getExameMedicoHorario());
            }
            if (dto.getExameMedicoIntervalosRefeicao() != null) {
                existingEmployee.setExameMedicoIntervalosRefeicao(dto.getExameMedicoIntervalosRefeicao());
            }
            if (dto.getExameMedicoHorarioIntervalo() != null) {
                existingEmployee.setExameMedicoHorarioIntervalo(dto.getExameMedicoHorarioIntervalo());
            }
            if (dto.getExameMedicoObservacoes() != null) {
                existingEmployee.setExameMedicoObservacoes(dto.getExameMedicoObservacoes());
            }
            if (dto.getExameMedicoPrimeiroEmprego() != null) {
                existingEmployee.setExameMedicoPrimeiroEmprego(dto.getExameMedicoPrimeiroEmprego());
            }
            if (dto.getExameMedicoContribuicaoSindicalPaga() != null) {
                existingEmployee.setExameMedicoContribuicaoSindicalPaga(dto.getExameMedicoContribuicaoSindicalPaga());
            }

            // Atualizar campos para Estrangeiro
            if (dto.getRneNumero() != null) {
                existingEmployee.setRneNumero(dto.getRneNumero());
            }
            if (dto.getRneValidade() != null) {
                existingEmployee.setRneValidade(dto.getRneValidade());
            }
            if (dto.getRicNumero() != null) {
                existingEmployee.setRicNumero(dto.getRicNumero());
            }
            if (dto.getRicOrgaoEmissor() != null) {
                existingEmployee.setRicOrgaoEmissor(dto.getRicOrgaoEmissor());
            }
            if (dto.getRicDataEmissao() != null) {
                existingEmployee.setRicDataEmissao(dto.getRicDataEmissao());
            }
            if (dto.getTipoVisto() != null) {
                existingEmployee.setTipoVisto(dto.getTipoVisto());
            }

            // Atualizar campos de admissão
            if (dto.getPis() != null) {
                existingEmployee.setPis(dto.getPis());
            }
            if (dto.getTituloEleitor() != null) {
                existingEmployee.setTituloEleitor(dto.getTituloEleitor());
            }
            if (dto.getRg() != null) {
                existingEmployee.setNumeroRg(dto.getRg());
                existingEmployee.setRg(dto.getRg());
            }
            if (dto.getTituloEleitorZona() != null) {
                existingEmployee.setTituloEleitorZona(dto.getTituloEleitorZona());
            }
            if (dto.getTituloEleitorSecao() != null) {
                existingEmployee.setTituloEleitorSecao(dto.getTituloEleitorSecao());
            }
            if (dto.getTituloEleitorDataExpedicao() != null) {
                existingEmployee.setTituloEleitorDataExpedicao(dto.getTituloEleitorDataExpedicao());
            }
            if (dto.getTituloEleitorValidade() != null) {
                existingEmployee.setTituloEleitorValidade(dto.getTituloEleitorValidade());
            }
            if (dto.getNomeConselhoRegional() != null) {
                existingEmployee.setNomeConselhoRegional(dto.getNomeConselhoRegional());
            }
            if (dto.getCarteiraIdentidadeOrgaoEmissor() != null) {
                existingEmployee.setCarteiraIdentidadeOrgaoEmissor(dto.getCarteiraIdentidadeOrgaoEmissor());
            }
            if (dto.getCarteiraIdentidadeDataEmissao() != null) {
                existingEmployee.setCarteiraIdentidadeDataEmissao(dto.getCarteiraIdentidadeDataEmissao());
            }
            if (dto.getRgUf() != null) {
                existingEmployee.setRgUf(dto.getRgUf());
            }
            if (dto.getCertificadoMilitar() != null) {
                existingEmployee.setCertificadoMilitar(dto.getCertificadoMilitar());
            }
            if (dto.getSalario() != null) {
                System.out.println("[DEBUG] Atualizando Salário: " + dto.getSalario());
                existingEmployee.setSalario(dto.getSalario());
            }
            if (dto.getSalarioPorExtenso() != null) {
                existingEmployee.setSalarioPorExtenso(dto.getSalarioPorExtenso());
            }
            if (dto.getPeriodoPagamento() != null) {
                existingEmployee.setPeriodoPagamento(dto.getPeriodoPagamento());
            }
            if (dto.getHorarioTrabalho() != null) {
                existingEmployee.setHorarioTrabalho(dto.getHorarioTrabalho());
            }
            if (dto.getHorarioTrabalhoIntervalo() != null) {
                existingEmployee.setHorarioTrabalhoIntervalo(dto.getHorarioTrabalhoIntervalo());
            }
            if (dto.getDiasTrabalho() != null) {
                existingEmployee.setDiasTrabalho(dto.getDiasTrabalho());
            }
            if (dto.getPrazoExperienciaTexto() != null) {
                existingEmployee.setPrazoExperienciaTexto(dto.getPrazoExperienciaTexto());
            }
            if (dto.getProrrogacaoExperiencia() != null) {
                existingEmployee.setProrrogacaoExperiencia(dto.getProrrogacaoExperiencia());
            }
            if (dto.getFolgaSemanal() != null) {
                existingEmployee.setFolgaSemanal(dto.getFolgaSemanal());
            }
            if (dto.getEscalaTrabalho() != null) {
                existingEmployee.setEscalaTrabalho(dto.getEscalaTrabalho());
            }

            // Campos da Ficha de Registro faltantes na atualização passada
            if (dto.getEmpresaNome() != null)
                existingEmployee.setEmpresaNome(dto.getEmpresaNome());
            if (dto.getEmpresaEndereco() != null)
                existingEmployee.setEmpresaEndereco(dto.getEmpresaEndereco());
            if (dto.getEmpresaCnpj() != null)
                existingEmployee.setEmpresaCnpj(dto.getEmpresaCnpj());
            if (dto.getNomeConselhoRegional() != null)
                existingEmployee.setNomeConselhoRegional(dto.getNomeConselhoRegional());
            if (dto.getNomePai() != null)
                existingEmployee.setNomePai(dto.getNomePai());
            if (dto.getNomeMae() != null)
                existingEmployee.setNomeMae(dto.getNomeMae());
            if (dto.getMatriculaEsocial() != null)
                existingEmployee.setMatriculaEsocial(dto.getMatriculaEsocial());
            if (dto.getRacaCor() != null)
                existingEmployee.setRacaCor(dto.getRacaCor());
            if (dto.getTipoSalarioContratual() != null)
                existingEmployee.setTipoSalarioContratual(dto.getTipoSalarioContratual());
            if (dto.getCbo() != null)
                existingEmployee.setCbo(dto.getCbo());
            if (dto.getFgtsOptante() != null)
                existingEmployee.setFgtsOptante(dto.getFgtsOptante());
            if (dto.getFgtsDataOpcao() != null)
                existingEmployee.setFgtsDataOpcao(dto.getFgtsDataOpcao());
            if (dto.getFgtsBancoDepositario() != null)
                existingEmployee.setFgtsBancoDepositario(dto.getFgtsBancoDepositario());
            if (dto.getFgtsDataRetratacao() != null)
                existingEmployee.setFgtsDataRetratacao(dto.getFgtsDataRetratacao());
            if (dto.getPisDataCadastro() != null)
                existingEmployee.setPisDataCadastro(dto.getPisDataCadastro());
            if (dto.getPisBancoDepositario() != null)
                existingEmployee.setPisBancoDepositario(dto.getPisBancoDepositario());
            if (dto.getPisEnderecoBanco() != null)
                existingEmployee.setPisEnderecoBanco(dto.getPisEnderecoBanco());
            if (dto.getPisCodigoBanco() != null)
                existingEmployee.setPisCodigoBanco(dto.getPisCodigoBanco());
            if (dto.getPisCodigoAgencia() != null)
                existingEmployee.setPisCodigoAgencia(dto.getPisCodigoAgencia());

            // CNH e CTPS
            if (dto.getCnhExpirationDate() != null)
                existingEmployee.setCnhExpirationDate(dto.getCnhExpirationDate());
            if (dto.getCnhCategory() != null)
                existingEmployee.setCnhCategory(dto.getCnhCategory());
            // CNH: persistir null quando vazio para não violar uk_employees_cnh_number (vários sem CNH = null permitido)
            String cnhNum = dto.getCnhNumber();
            existingEmployee.setCnhNumber(cnhNum != null && !cnhNum.trim().isEmpty() ? cnhNum.trim() : null);
            if (dto.getCtps() != null)
                existingEmployee.setCtps(dto.getCtps());
            if (dto.getCtpsRural() != null)
                existingEmployee.setCtpsRural(dto.getCtpsRural());
            if (dto.getCtpsSeries() != null)
                existingEmployee.setCtpsSeries(dto.getCtpsSeries());
            if (dto.getCtpsIssueDate() != null)
                existingEmployee.setCtpsIssueDate(dto.getCtpsIssueDate());
            if (dto.getCtpsIssuingAgency() != null)
                existingEmployee.setCtpsIssuingAgency(dto.getCtpsIssuingAgency());

            // Outros documentos e nacionalidade
            if (dto.getCarteiraModelo19() != null)
                existingEmployee.setCarteiraModelo19(dto.getCarteiraModelo19());
            if (dto.getRegistroGeralEstrangeiro() != null)
                existingEmployee.setRegistroGeralEstrangeiro(dto.getRegistroGeralEstrangeiro());
            if (dto.getCasadoBrasileiro() != null)
                existingEmployee.setCasadoBrasileiro(dto.getCasadoBrasileiro());
            if (dto.getNomeConjugeEstrangeiro() != null)
                existingEmployee.setNomeConjugeEstrangeiro(dto.getNomeConjugeEstrangeiro());
            if (dto.getTemFilhosBrasileiros() != null)
                existingEmployee.setTemFilhosBrasileiros(dto.getTemFilhosBrasileiros());
            if (dto.getQuantidadeFilhosBrasileiros() != null)
                existingEmployee.setQuantidadeFilhosBrasileiros(dto.getQuantidadeFilhosBrasileiros());
            if (dto.getDataChegadaBrasil() != null)
                existingEmployee.setDataChegadaBrasil(dto.getDataChegadaBrasil());
            if (dto.getNaturalizado() != null)
                existingEmployee.setNaturalizado(dto.getNaturalizado());
            if (dto.getDecretoNaturalizacao() != null)
                existingEmployee.setDecretoNaturalizacao(dto.getDecretoNaturalizacao());
            if (dto.getVistoFiscalizacao() != null)
                existingEmployee.setVistoFiscalizacao(dto.getVistoFiscalizacao());
            if (dto.getAssinaturaFuncionario() != null)
                existingEmployee.setAssinaturaFuncionario(dto.getAssinaturaFuncionario());

            applyTerminationRules(existingEmployee, dto);

            if (changedByUserId != null && oldSnapshot != null) {
                recordEmployeeChanges(existingEmployee, oldSnapshot, changedByUserId);
            }

            // Atualizar timestamp
            existingEmployee.setUpdatedAt(LocalDateTime.now());

            System.out.println("[DEBUG] Salvando funcionário atualizado...");
            System.out.println("[DEBUG] Campos de endereço antes de salvar:");
            System.out.println("  - enderecoRua: " + existingEmployee.getEnderecoRua());
            System.out.println("  - enderecoNumero: " + existingEmployee.getEnderecoNumero());
            System.out.println("  - enderecoCidade: " + existingEmployee.getEnderecoCidade());
            System.out.println("  - enderecoEstado: " + existingEmployee.getEnderecoEstado());
            System.out.println("  - enderecoCep: " + existingEmployee.getEnderecoCep());

            Employee saved = employeeRepository.save(existingEmployee);
            System.out.println("[DEBUG] Funcionário salvo com sucesso: " + saved.getName());

            System.out.println("[DEBUG] Convertendo entidade para DTO...");
            EmployeeDTO result = toDTO(saved);
            System.out.println("[DEBUG] DTO retornado - Nome: " + result.getName());

            return result;
        } catch (Exception e) {
            System.err.println("[ERROR] Erro ao atualizar funcionário ID " + id + ": " + e.getMessage());
            System.err.println("[ERROR] Tipo da exceção: " + e.getClass().getName());
            e.printStackTrace();
            throw new RuntimeException("Erro ao atualizar funcionário: " + e.getMessage(), e);
        }
    }

    @Transactional
    @CacheEvict(value = { "employees", "employees-by-company", "dashboard-summary" }, allEntries = true)
    public void bulkUpdateStatus(List<UUID> ids, String statusStr) {
        EmploymentStatus status = EmploymentStatus.valueOf(statusStr.toUpperCase());
        List<Employee> employees = new ArrayList<>(employeeRepository.findAllByIdIn(ids));
        for (Employee employee : employees) {
            employee.setStatus(status);
            employee.setUpdatedAt(LocalDateTime.now());
        }
        employeeRepository.saveAll(employees);
    }

    @Transactional
    @CacheEvict(value = { "employees", "employees-by-company", "dashboard-summary" }, allEntries = true)
    public void bulkTerminate(List<UUID> ids, java.time.LocalDate terminationDate) {
        List<Employee> employees = new ArrayList<>(employeeRepository.findAllByIdIn(ids));
        for (Employee employee : employees) {
            employee.setStatus(EmploymentStatus.TERMINATED);
            employee.setTerminationDate(terminationDate);
            employee.setDataRescisao(terminationDate);
            employee.setUpdatedAt(LocalDateTime.now());

            // Apply termination rules (deactivate user etc.)
            applyTerminationRules(employee, null);
        }
        employeeRepository.saveAll(employees);
    }

    @Transactional
    @CacheEvict(value = { "employees", "employees-by-company", "dashboard-summary" }, allEntries = true)
    public void bulkDelete(List<UUID> ids) {
        List<Employee> employees = new ArrayList<>(employeeRepository.findAllByIdIn(ids));
        for (Employee employee : employees) {
            if (employee.getStatus() != EmploymentStatus.TERMINATED) {
                throw new RuntimeException(
                        "O funcionário " + employee.getName() + " não pode ser excluído pois não está demitido.");
            }
        }
        employeeRepository.deleteAll(employees);
    }

    @Transactional
    @CacheEvict(value = { "employees", "employees-by-company", "dashboard-summary" }, allEntries = true)
    public void delete(UUID id) {
        Employee employee = findById(id);
        if (employee.getStatus() != EmploymentStatus.TERMINATED) {
            throw new RuntimeException("Apenas funcionários demitidos podem ser excluídos");
        }
        employeeRepository.delete(employee);
    }

    private void applyTerminationRules(Employee employee, EmployeeDTO dto) {
        if (employee == null) {
            return;
        }

        if (dto != null) {
            // data_rescisao é o campo usado na ficha/edição; manter termination_date alinhado para listagens e relatórios
            if (dto.getDataRescisao() != null) {
                employee.setDataRescisao(dto.getDataRescisao());
                employee.setTerminationDate(dto.getDataRescisao());
            } else if (dto.getTerminationDate() != null) {
                employee.setTerminationDate(dto.getTerminationDate());
                employee.setDataRescisao(dto.getTerminationDate());
            }
            if (dto.getTerminationReason() != null) {
                employee.setTerminationReason(dto.getTerminationReason());
            }

            if (employee.getTerminationDate() == null && dto.getTerminationDate() == null
                    && dto.getDataRescisao() == null) {
                employee.setTerminationReason(null);
                return;
            }
        }

        if (employee.getTerminationDate() == null) {
            return;
        }

        employee.setStatus(EmploymentStatus.TERMINATED);

        String cpf = dto != null && dto.getCpf() != null && !dto.getCpf().trim().isEmpty()
                ? dto.getCpf()
                : employee.getDocument();
        if (cpf == null || cpf.trim().isEmpty()) {
            return;
        }

        String normalizedCpf = cpf.replaceAll("[^0-9]", "");
        Optional<User> userOpt = userRepository.findByUsername(normalizedCpf);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(cpf);
        }

        userOpt.ifPresent(user -> {
            user.setStatus(UserStatus.INACTIVE);
            user.setActive(false);
            userRepository.save(user);
        });
    }

    private Map<String, String> buildOldSnapshot(Employee e) {
        Map<String, String> m = new HashMap<>();
        if (e.getPosition() != null) m.put("position", e.getPosition().getName());
        else m.put("position", null);
        if (e.getUnit() != null) m.put("unit", e.getUnit().getName());
        else m.put("unit", null);
        if (e.getCompany() != null) m.put("company", e.getCompany().getName());
        else m.put("company", null);
        if (e.getDepartment() != null) m.put("department", e.getDepartment().getName());
        else m.put("department", null);
        if (e.getWorkPost() != null) m.put("workPost", e.getWorkPost().getName());
        else m.put("workPost", null);
        m.put("salario", e.getSalario() != null ? e.getSalario().toString() : null);
        m.put("status", e.getStatus() != null ? e.getStatus().name() : null);
        m.put("horarioTrabalho", e.getHorarioTrabalho());
        m.put("escalaTrabalho", e.getEscalaTrabalho());
        m.put("hireDate", e.getHireDate() != null ? e.getHireDate().toString() : null);
        m.put("terminationDate", e.getTerminationDate() != null ? e.getTerminationDate().toString() : null);
        m.put("exameMedicoVencimento", e.getExameMedicoVencimento() != null ? e.getExameMedicoVencimento().toString() : null);
        return m;
    }

    private void recordEmployeeChanges(Employee emp, Map<String, String> oldSnapshot, UUID changedByUserId) {
        UUID employeeId = emp.getId();
        if (employeeId == null) return;
        try {
            String posNew = emp.getPosition() != null ? emp.getPosition().getName() : null;
            recordIfChanged(employeeId, EmployeeChangeCategory.CARGO, "position", "Cargo", oldSnapshot.get("position"), posNew, changedByUserId);

            String unitNew = emp.getUnit() != null ? emp.getUnit().getName() : null;
            recordIfChanged(employeeId, EmployeeChangeCategory.UNIDADE, "unit", "Unidade", oldSnapshot.get("unit"), unitNew, changedByUserId);

            String companyNew = emp.getCompany() != null ? emp.getCompany().getName() : null;
            recordIfChanged(employeeId, EmployeeChangeCategory.EMPRESA, "company", "Empresa", oldSnapshot.get("company"), companyNew, changedByUserId);

            String deptNew = emp.getDepartment() != null ? emp.getDepartment().getName() : null;
            recordIfChanged(employeeId, EmployeeChangeCategory.SETOR, "department", "Setor/Departamento", oldSnapshot.get("department"), deptNew, changedByUserId);

            String workPostNew = emp.getWorkPost() != null ? emp.getWorkPost().getName() : null;
            recordIfChanged(employeeId, EmployeeChangeCategory.POSTO_TRABALHO, "workPost", "Posto de trabalho", oldSnapshot.get("workPost"), workPostNew, changedByUserId);

            String salNew = emp.getSalario() != null ? emp.getSalario().toString() : null;
            recordIfChanged(employeeId, EmployeeChangeCategory.SALARIO, "salario", "Salário", oldSnapshot.get("salario"), salNew, changedByUserId);

            String statusNew = emp.getStatus() != null ? emp.getStatus().name() : null;
            recordIfChanged(employeeId, EmployeeChangeCategory.STATUS, "status", "Status", oldSnapshot.get("status"), statusNew, changedByUserId);

            recordIfChanged(employeeId, EmployeeChangeCategory.HORARIO, "horarioTrabalho", "Horário de trabalho", oldSnapshot.get("horarioTrabalho"), emp.getHorarioTrabalho(), changedByUserId);
            recordIfChanged(employeeId, EmployeeChangeCategory.ESCALA, "escalaTrabalho", "Escala de trabalho", oldSnapshot.get("escalaTrabalho"), emp.getEscalaTrabalho(), changedByUserId);
            recordIfChanged(employeeId, EmployeeChangeCategory.DADOS_CADASTRAIS, "hireDate", "Data de admissão", oldSnapshot.get("hireDate"), emp.getHireDate() != null ? emp.getHireDate().toString() : null, changedByUserId);
            recordIfChanged(employeeId, EmployeeChangeCategory.DADOS_CADASTRAIS, "terminationDate", "Data de desligamento", oldSnapshot.get("terminationDate"), emp.getTerminationDate() != null ? emp.getTerminationDate().toString() : null, changedByUserId);
            recordIfChanged(employeeId, EmployeeChangeCategory.EXAME_ASO, "exameMedicoVencimento", "Vencimento ASO", oldSnapshot.get("exameMedicoVencimento"), emp.getExameMedicoVencimento() != null ? emp.getExameMedicoVencimento().toString() : null, changedByUserId);
        } catch (Exception ex) {
            log.warn("Falha ao registrar histórico de alterações do funcionário {}: {}", emp.getId(), ex.getMessage());
        }
    }

    private void recordIfChanged(UUID employeeId, EmployeeChangeCategory category, String fieldName, String fieldLabel, String oldVal, String newVal, UUID changedByUserId) {
        if (Objects.equals(oldVal, newVal)) return;
        employeeChangeHistoryService.recordChange(employeeId, category, fieldName, fieldLabel, oldVal, newVal, changedByUserId);
    }

    @Transactional(readOnly = true)
    // Removido @Cacheable - entidade Employee tem relacionamentos circulares que
    // causam problemas no Redis
    // O cache será aplicado apenas nos métodos que retornam DTOs
    public Employee findById(UUID id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        // Forçar inicialização de relacionamentos LAZY para evitar
        // LazyInitializationException
        try {
            if (employee.getUser() != null) {
                org.hibernate.Hibernate.initialize(employee.getUser());
            }
            if (employee.getPosition() != null) {
                org.hibernate.Hibernate.initialize(employee.getPosition());
            }
            if (employee.getUnit() != null) {
                // Inicializar Unit mas evitar inicializar a coleção employees (evita referência
                // circular no cache Redis)
                org.hibernate.Hibernate.initialize(employee.getUnit());
                // Não inicializar a coleção employees do Unit para evitar referência circular
                // A coleção employees já está marcada com @JsonIgnoreProperties no model
            }
            if (employee.getCompany() != null) {
                org.hibernate.Hibernate.initialize(employee.getCompany());
            }
            if (employee.getWorkPost() != null) {
                org.hibernate.Hibernate.initialize(employee.getWorkPost());
            }
            if (employee.getDepartment() != null) {
                org.hibernate.Hibernate.initialize(employee.getDepartment());
            }
        } catch (Exception e) {
            System.err.println("[WARNING] Erro ao inicializar relacionamentos LAZY: " + e.getMessage());
            // Continuar mesmo se houver erro na inicialização
        }

        return employee;
    }

    public Optional<Employee> findByEmail(String email) {
        return employeeRepository.findByEmail(email);
    }

    public List<Employee> findByStatus(EmploymentStatus status) {
        try {
            System.out.println("[DEBUG] EmployeeService.findByStatus - Status recebido: " + status);
            List<Employee> employees = employeeRepository.findByStatus(status);
            System.out.println("[DEBUG] EmployeeService.findByStatus - Funcionários encontrados: " + employees.size());
            return employees;
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeService.findByStatus - Erro ao buscar funcionários: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public List<EmployeeDTO> findAllByIdsAsDTOs(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        List<UUID> distinctIds = ids.stream().distinct().toList();
        // O repositório agora usa JOIN FETCH para carregar relacionamentos em uma única consulta
        java.util.Set<Employee> employees = employeeRepository.findAllByIdIn(distinctIds);
        return employees.stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<Employee> findAllByIds(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        List<UUID> distinctIds = ids.stream().distinct().toList();
        java.util.Set<Employee> employees = employeeRepository.findAllByIdIn(distinctIds);
        return new java.util.ArrayList<>(employees);
    }

    public List<Employee> findByNameContaining(String name) {
        try {
            System.out.println("[DEBUG] EmployeeService.findByNameContaining - Nome recebido: " + name);
            List<Employee> employees = employeeRepository.findByNameContainingIgnoreCase(name);
            System.out.println(
                    "[DEBUG] EmployeeService.findByNameContaining - Funcionários encontrados: " + employees.size());
            return employees;
        } catch (Exception e) {
            System.err.println(
                    "[ERROR] EmployeeService.findByNameContaining - Erro ao buscar funcionários: " + e.getMessage());
            throw new RuntimeException("Erro ao buscar funcionários por nome: " + e.getMessage());
        }
    }

    public List<Employee> findByNameOrDocumentContaining(String searchTerm) {
        try {
            System.out
                    .println("[DEBUG] EmployeeService.findByNameOrDocumentContaining - Termo recebido: " + searchTerm);
            List<Employee> employees = employeeRepository
                    .findByNameContainingIgnoreCaseOrDocumentContainingIgnoreCase(searchTerm, searchTerm);
            System.out.println("[DEBUG] EmployeeService.findByNameOrDocumentContaining - Funcionários encontrados: "
                    + employees.size());
            return employees;
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeService.findByNameOrDocumentContaining - Erro ao buscar funcionários: "
                    + e.getMessage());
            throw new RuntimeException("Erro ao buscar funcionários por nome ou documento: " + e.getMessage());
        }
    }

    public List<SimpleEmployeeDTO> findSimpleEmployeesByNameOrDocument(String searchTerm) {
        try {
            System.out.println(
                    "[DEBUG] EmployeeService.findSimpleEmployeesByNameOrDocument - Termo recebido: " + searchTerm);
            List<Employee> employees = employeeRepository
                    .findByNameContainingIgnoreCaseOrDocumentContainingIgnoreCase(searchTerm, searchTerm);
            System.out
                    .println("[DEBUG] EmployeeService.findSimpleEmployeesByNameOrDocument - Funcionários encontrados: "
                            + employees.size());

            // Deduplicar por ID para evitar duplicatas causadas por dados inconsistentes ou joins
            Map<UUID, Employee> uniqueEmployees = new LinkedHashMap<>();
            for (Employee emp : employees) {
                if (emp != null && emp.getId() != null) {
                    uniqueEmployees.putIfAbsent(emp.getId(), emp);
                }
            }

            return uniqueEmployees.values().stream()
                    .map(emp -> SimpleEmployeeDTO.builder()
                            .id(emp.getId())
                            .name(emp.getName())
                            .document(emp.getDocument())
                            .cpf(emp.getCpf())
                            .email(emp.getEmail())
                            .phone(emp.getPhone())
                            .address(emp.getAddress())
                            .registrationNumber(emp.getRegistrationNumber())
                            .hireDate(emp.getHireDate())
                            .positionName(emp.getPosition() != null ? emp.getPosition().getName() : null)
                            .unitName(emp.getUnit() != null ? emp.getUnit().getName() : null)
                            .companyId(emp.getCompany() != null ? emp.getCompany().getId() : null)
                            .companySigla(emp.getCompany() != null ? emp.getCompany().getSigla() : null)
                            .salario(emp.getSalario())
                            .build())
                    .collect(java.util.stream.Collectors.toList());
        } catch (Exception e) {
            System.err.println(
                    "[ERROR] EmployeeService.findSimpleEmployeesByNameOrDocument - Erro ao buscar funcionários: "
                            + e.getMessage());
            throw new RuntimeException("Erro ao buscar funcionários por nome ou documento: " + e.getMessage());
        }
    }

    public long count() {
        return employeeRepository.count();
    }

    /**
     * Retorna estatísticas de funcionários (total, ativos, férias/atestado, demitidos/suspensos).
     * Se companyId for null, retorna totais globais. Caso contrário, retorna totais da empresa.
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getStatsByCompany(UUID companyId) {
        long total, active, vacation, medicalCertificate, terminated, suspended;
        if (companyId == null) {
            total = employeeRepository.count();
            active = employeeRepository.countByStatus(EmploymentStatus.ACTIVE);
            vacation = employeeRepository.countByStatus(EmploymentStatus.VACATION);
            medicalCertificate = employeeRepository.countByStatus(EmploymentStatus.MEDICAL_CERTIFICATE)
                    + employeeRepository.countByStatus(EmploymentStatus.MATERNITY_LEAVE);
            terminated = employeeRepository.countByStatus(EmploymentStatus.TERMINATED);
            suspended = employeeRepository.countByStatus(EmploymentStatus.SUSPENDED);
        } else {
            total = employeeRepository.countByCompanyId(companyId);
            active = employeeRepository.countByCompanyIdAndStatus(companyId, EmploymentStatus.ACTIVE);
            vacation = employeeRepository.countByCompanyIdAndStatus(companyId, EmploymentStatus.VACATION);
            medicalCertificate = employeeRepository.countByCompanyIdAndStatus(companyId, EmploymentStatus.MEDICAL_CERTIFICATE)
                    + employeeRepository.countByCompanyIdAndStatus(companyId, EmploymentStatus.MATERNITY_LEAVE);
            terminated = employeeRepository.countByCompanyIdAndStatus(companyId, EmploymentStatus.TERMINATED);
            suspended = employeeRepository.countByCompanyIdAndStatus(companyId, EmploymentStatus.SUSPENDED);
        }
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", total);
        stats.put("active", active);
        stats.put("vacation", vacation);
        stats.put("medicalCertificate", medicalCertificate);
        stats.put("terminated", terminated);
        stats.put("suspended", suspended);
        return stats;
    }

    public List<Employee> findByUnit(UUID unitId) {
        return employeeRepository.findByUnitId(unitId);
    }

    public List<Employee> findByPosition(UUID positionId) {
        return employeeRepository.findByPositionId(positionId);
    }

    @Transactional(readOnly = true)
    public List<Employee> findAll() {
        try {
            System.out.println("🔍 EmployeeService.findAll - Iniciando busca deduplicada...");

            try {
                // Utiliza Set/DISTINCT para evitar "Duplicate row was found" no Hibernate 6
                // especialmente em ambientes como CI com dados inconsistentes
                java.util.Set<Employee> employeeSet = employeeRepository.findAllDistinct();
                List<Employee> employees = new ArrayList<>(employeeSet);
                
                System.out.println(
                        "✅ EmployeeService.findAll - Encontrados " + employees.size() + " funcionários únicos");

                return employees;
            } catch (Exception repoError) {
                System.err.println("❌ EmployeeService.findAll - Erro no repository: " + repoError.getMessage());
                repoError.printStackTrace();
                throw repoError;
            }

        } catch (Exception e) {
            System.err.println("❌ EmployeeService.findAll - Erro ao buscar funcionários: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erro ao buscar funcionários: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<UUID> findAllIds() {
        try {
            System.out.println("🔍 EmployeeService.findAllIds - Buscando apenas IDs");
            List<UUID> ids = employeeRepository.findAllIds();
            System.out.println("✅ EmployeeService.findAllIds - Encontrados " + ids.size() + " IDs");
            return ids;
        } catch (Exception e) {
            System.err.println("❌ EmployeeService.findAllIds - Erro: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erro ao buscar IDs: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<Object[]> findBasicData() {
        try {
            System.out.println("🔍 EmployeeService.findBasicData - Buscando dados básicos");
            List<Object[]> data = employeeRepository.findBasicData();
            System.out.println("✅ EmployeeService.findBasicData - Encontrados " + data.size() + " registros");
            return data;
        } catch (Exception e) {
            System.err.println("❌ EmployeeService.findBasicData - Erro: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erro ao buscar dados básicos: " + e.getMessage(), e);
        }
    }

    public List<Object[]> findBasicDataBySearchTerm(String searchTerm) {
        try {
            System.out.println("🔍 EmployeeService.findBasicDataBySearchTerm - Buscando por termo: " + searchTerm);
            List<Object[]> data = employeeRepository.findBasicDataBySearchTerm(searchTerm);
            System.out
                    .println("✅ EmployeeService.findBasicDataBySearchTerm - Encontrados " + data.size() + " registros");
            return data;
        } catch (Exception e) {
            System.err.println("❌ EmployeeService.findBasicDataBySearchTerm - Erro: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erro ao buscar dados básicos por termo: " + e.getMessage(), e);
        }
    }

    /**
     * Dados básicos de funcionários com aniversário no mês informado (1–12).
     */
    @Transactional(readOnly = true)
    public List<Object[]> findBasicDataByBirthMonth(int month, boolean onlyActive, java.util.UUID companyId) {
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Mês deve estar entre 1 e 12");
        }
        int onlyActiveFlag = onlyActive ? 1 : 0;
        int companyFilter = companyId != null ? 1 : 0;
        try {
            System.out.println("🔍 EmployeeService.findBasicDataByBirthMonth - month=" + month + " onlyActive="
                    + onlyActive + " companyId=" + companyId);
            List<Object[]> data = employeeRepository.findBasicDataByBirthMonth(month, onlyActiveFlag, companyFilter,
                    companyId);
            System.out.println("✅ EmployeeService.findBasicDataByBirthMonth - " + data.size() + " registros");
            return data;
        } catch (Exception e) {
            System.err.println("❌ EmployeeService.findBasicDataByBirthMonth - Erro: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erro ao buscar aniversariantes: " + e.getMessage(), e);
        }
    }

    /**
     * Versão paginada de findBasicData para ambientes com muitos registros.
     * status: opcional, ex. "ACTIVE" para filtrar apenas ativos
     */
    @Transactional(readOnly = true)
    public List<Object[]> findBasicDataPaged(int page, int size, java.util.UUID companyId, String status) {
        try {
            int pageSize = Math.min(Math.max(size, 1), 500); // evitar pageSize muito grande
            int offset = Math.max(page, 0) * pageSize;
            System.out.println(
                    "🔍 EmployeeService.findBasicDataPaged - page=" + page + " size=" + pageSize + " offset=" + offset + " companyId=" + companyId + " status=" + status);
            List<Object[]> data = companyId == null
                    ? employeeRepository.findBasicDataPaged(pageSize, offset, status)
                    : employeeRepository.findBasicDataPagedByCompany(pageSize, offset, companyId, status);
            System.out.println("✅ EmployeeService.findBasicDataPaged - Encontrados " + data.size() + " registros");
            return data;
        } catch (Exception e) {
            System.err.println("❌ EmployeeService.findBasicDataPaged - Erro: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erro ao buscar dados básicos paginados: " + e.getMessage(), e);
        }
    }

    /**
     * Versão paginada de findBasicDataBySearchTerm para ambientes com muitos
     * registros. status: opcional para filtrar por status.
     */
    @Transactional(readOnly = true)
    public List<Object[]> findBasicDataBySearchTermPaged(String searchTerm, int page, int size, java.util.UUID companyId, String status) {
        try {
            int pageSize = Math.min(Math.max(size, 1), 500);
            int offset = Math.max(page, 0) * pageSize;
            System.out.println("🔍 EmployeeService.findBasicDataBySearchTermPaged - termo=" + searchTerm + " page="
                    + page + " size=" + pageSize + " offset=" + offset + " companyId=" + companyId + " status=" + status);
            List<Object[]> data = companyId == null
                    ? employeeRepository.findBasicDataBySearchTermPaged(searchTerm, pageSize, offset, status)
                    : employeeRepository.findBasicDataBySearchTermPagedByCompany(searchTerm, pageSize, offset, companyId, status);
            System.out.println(
                    "✅ EmployeeService.findBasicDataBySearchTermPaged - Encontrados " + data.size() + " registros");
            return data;
        } catch (Exception e) {
            System.err.println("❌ EmployeeService.findBasicDataBySearchTermPaged - Erro: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erro ao buscar dados básicos por termo (paginado): " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<EmployeeDTO> getAllAsDTOs() {
        try {
            log.info("Buscando todos os funcionários como DTOs...");
            List<Employee> employees = employeeRepository.findAll();
            log.info("Encontrados {} funcionários", employees.size());

            if (employees.isEmpty()) {
                log.warn("Nenhum funcionário encontrado no banco de dados");
                return java.util.Collections.emptyList();
            }

            log.info("Retornando lista vazia temporariamente para debug");
            return java.util.Collections.emptyList();
        } catch (Exception e) {
            log.error("Erro ao buscar funcionários como DTOs: {}", e.getMessage(), e);
            log.warn("Retornando lista vazia devido ao erro");
            return java.util.Collections.emptyList();
        }
    }

    @Transactional
    public Employee updateStatus(UUID id, EmploymentStatus status) {
        Employee employee = findById(id);
        employee.setStatus(status);
        return employeeRepository.save(employee);
    }

    @Transactional
    @CacheEvict(value = { "employees", "employees-by-company", "dashboard-summary" }, allEntries = true)
    public void deleteById(UUID id) {
        employeeRepository.deleteById(id);
    }

    // Métodos utilitários de mapeamento
    private Employee toEntity(EmployeeDTO dto) {
        try {
            System.out.println("[DEBUG] Iniciando conversão DTO -> Entity");
            System.out.println("[DEBUG] DTO status: " + dto.getStatus());
            System.out.println("[DEBUG] DTO user: " + (dto.getUser() != null ? dto.getUser().getId() : "null"));
            System.out.println(
                    "[DEBUG] DTO position: " + (dto.getPosition() != null ? dto.getPosition().getId() : "null"));

            Employee e = new Employee();
            if (dto.getId() != null) {
                e.setId(dto.getId());
            }
            e.setName(dto.getName());
            e.setDocument(dto.getCpf());
            e.setCpf(dto.getCpf());
            e.setNumeroRg(dto.getRg());
            e.setRg(dto.getRg());
            // e.setTituloEleitor(dto.getTituloEleitor());
            // e.setGrauInstrucao(dto.getGrauInstrucao());
            // e.setPai(dto.getPai());
            // e.setMae(dto.getMae());
            // e.setNaturalidade(dto.getNaturalidade());
            // e.setCep(dto.getCep());
            // e.setCtps(dto.getCep());
            // e.setCbo(dto.getCbo());
            // e.setPis(dto.getPis());
            // e.setSalario(dto.getSalario());
            // e.setFgtsOptante(dto.getFgtsOptante());
            // e.setFgtsDataOpcao(dto.getFgtsDataOpcao());
            // e.setFgtsBancoDepositario(dto.getFgtsBancoDepositario());
            // e.setEmpresaNome(dto.getEmpresaNome());
            // e.setEmpresaEndereco(dto.getEmpresaEndereco());
            // e.setEmpresaCnpj(dto.getEmpresaCnpj());
            e.setBirthDate(dto.getBirthDate());
            e.setMaritalStatus(dto.getMaritalStatus());
            e.setNationality(dto.getNationality());
            e.setPhotoUrl(dto.getPhotoUrl());
            // e.setCurrentScale(dto.getCurrentScale());
            e.setRegistrationNumber(dto.getRegistrationNumber());
            e.setHireDate(dto.getHireDate());
            e.setTerminationDate(dto.getTerminationDate());

            // Validar e converter status
            if (dto.getStatus() != null && !dto.getStatus().trim().isEmpty()) {
                try {
                    EmploymentStatus status = EmploymentStatus.valueOf(dto.getStatus().toUpperCase());
                    e.setStatus(status);
                    System.out.println("[DEBUG] Status convertido com sucesso: " + status);
                } catch (IllegalArgumentException ex) {
                    System.err.println("[ERROR] Status inválido: " + dto.getStatus());
                    throw new RuntimeException("Status inválido: " + dto.getStatus() + ". Status válidos: " +
                            Arrays.toString(EmploymentStatus.values()));
                }
            } else {
                System.out.println("[DEBUG] Status não fornecido, mantendo status atual");
            }

            // e.setPossuiWhatsapp(dto.getPossuiWhatsapp());
            // e.setCaminhoPdf(dto.getCaminhoPdf());
            // e.setMesReferencia(dto.getMesReferencia());
            // e.setAnoReferencia(dto.getAnoReferencia());
            e.setNotes(dto.getNotes());

            // Processar endereço - usar campos separados se disponíveis, senão usar campo
            // address antigo
            if (dto.getAddress() != null) {
                if (dto.getAddress().getStreet() != null && !dto.getAddress().getStreet().isEmpty()) {
                    e.setAddress(dto.getAddress().getStreet());
                    // Também preencher campos separados se vierem no objeto address
                    if (dto.getEnderecoRua() == null) {
                        e.setEnderecoRua(dto.getAddress().getStreet());
                    }
                }
                if (dto.getAddress().getNumber() != null && dto.getEnderecoNumero() == null) {
                    e.setEnderecoNumero(dto.getAddress().getNumber());
                }
                if (dto.getAddress().getComplement() != null && dto.getEnderecoComplemento() == null) {
                    e.setEnderecoComplemento(dto.getAddress().getComplement());
                }
                if (dto.getAddress().getNeighborhood() != null && dto.getEnderecoBairro() == null) {
                    e.setEnderecoBairro(dto.getAddress().getNeighborhood());
                }
                if (dto.getAddress().getCity() != null && dto.getEnderecoCidade() == null) {
                    e.setEnderecoCidade(dto.getAddress().getCity());
                }
                if (dto.getAddress().getState() != null && dto.getEnderecoEstado() == null) {
                    e.setEnderecoEstado(dto.getAddress().getState());
                }
                if (dto.getAddress().getZipCode() != null && dto.getEnderecoCep() == null) {
                    e.setEnderecoCep(dto.getAddress().getZipCode());
                }
            } else {
                e.setAddress(""); // Definir como string vazia se não fornecido
            }
            System.out.println("[DEBUG] Address salvo: " + e.getAddress());

            e.setPhone(dto.getPhone());
            e.setEmail(dto.getEmail());

            // Mapear telefone de contato
            if (dto.getTelefoneContato() != null) {
                e.setTelefoneContato(dto.getTelefoneContato());
            }

            // Mapear campos de endereço separados
            if (dto.getEnderecoRua() != null) {
                e.setEnderecoRua(dto.getEnderecoRua());
            }
            if (dto.getEnderecoNumero() != null) {
                e.setEnderecoNumero(dto.getEnderecoNumero());
            }
            if (dto.getEnderecoComplemento() != null) {
                e.setEnderecoComplemento(dto.getEnderecoComplemento());
            }
            if (dto.getEnderecoBairro() != null) {
                e.setEnderecoBairro(dto.getEnderecoBairro());
            }
            if (dto.getEnderecoCidade() != null) {
                e.setEnderecoCidade(dto.getEnderecoCidade());
            }
            if (dto.getEnderecoEstado() != null) {
                e.setEnderecoEstado(dto.getEnderecoEstado());
            }
            if (dto.getEnderecoCep() != null) {
                e.setEnderecoCep(dto.getEnderecoCep());
            }

            // Mapear campos CIN
            if (dto.getCinNumero() != null) {
                e.setCinNumero(dto.getCinNumero());
            }
            if (dto.getCinOrgaoEmissor() != null) {
                e.setCinOrgaoEmissor(dto.getCinOrgaoEmissor());
            }
            if (dto.getCinDataEmissao() != null) {
                e.setCinDataEmissao(dto.getCinDataEmissao());
            }

            // Mapear CTPS Digital PDF (apenas se fornecido)
            if (dto.getCtpsDigitalPdf() != null) {
                e.setCtpsDigitalPdf(dto.getCtpsDigitalPdf());
            }
            if (dto.getCtpsDigitalPdfNome() != null) {
                e.setCtpsDigitalPdfNome(dto.getCtpsDigitalPdfNome());
            }
            if (dto.getCtpsDigitalPdfTamanho() != null) {
                e.setCtpsDigitalPdfTamanho(dto.getCtpsDigitalPdfTamanho());
            }

            // Mapear dados do cônjuge
            e.setSpouseName(dto.getSpouseName());
            e.setSpouseCpf(dto.getSpouseCpf());
            e.setSpouseRg(dto.getSpouseRg());
            e.setSpouseBirthDate(dto.getSpouseBirthDate());
            e.setSpousePhone(dto.getSpousePhone());
            e.setSpouseEmail(dto.getSpouseEmail());

            // Mapear campos da ficha de registro
            e.setEmpresaNome(dto.getEmpresaNome());
            e.setEmpresaEndereco(dto.getEmpresaEndereco());
            e.setEmpresaCnpj(dto.getEmpresaCnpj());
            e.setTituloEleitor(dto.getTituloEleitor());
            e.setTituloEleitorZona(dto.getTituloEleitorZona());
            e.setTituloEleitorSecao(dto.getTituloEleitorSecao());
            if (dto.getTituloEleitorDataExpedicao() != null) {
                e.setTituloEleitorDataExpedicao(dto.getTituloEleitorDataExpedicao());
            }
            if (dto.getTituloEleitorValidade() != null) {
                e.setTituloEleitorValidade(dto.getTituloEleitorValidade());
            }
            e.setNomeConselhoRegional(dto.getNomeConselhoRegional());
            e.setCarteiraIdentidadeOrgaoEmissor(dto.getCarteiraIdentidadeOrgaoEmissor());
            e.setCarteiraIdentidadeDataEmissao(dto.getCarteiraIdentidadeDataEmissao());
            e.setRgUf(dto.getRgUf());
            e.setCertificadoMilitar(dto.getCertificadoMilitar());
            e.setNomePai(dto.getNomePai());
            e.setNomeMae(dto.getNomeMae());
            e.setLocalNascimento(dto.getLocalNascimento());
            e.setMunicipioNascimento(dto.getMunicipioNascimento());
            e.setEstadoNascimento(dto.getEstadoNascimento());
            e.setMaritalStatus(dto.getMaritalStatus());
            if (dto.getNationality() != null) {
                e.setNationality(dto.getNationality());
            }
            e.setSexo(dto.getSexo());
            e.setGrauInstrucao(dto.getGrauInstrucao());
            e.setRacaCor(dto.getRacaCor());
            e.setTipoSalarioContratual(dto.getTipoSalarioContratual());
            e.setMatriculaEsocial(dto.getMatriculaEsocial());
            e.setCbo(dto.getCbo());
            e.setPis(dto.getPis());
            if (dto.getSalario() != null) {
                System.out.println("[DEBUG] toEntity - Mapeando Salário: " + dto.getSalario());
                e.setSalario(dto.getSalario());
            }
            e.setSalarioPorExtenso(dto.getSalarioPorExtenso());
            e.setPeriodoPagamento(dto.getPeriodoPagamento());
            e.setHorarioTrabalho(dto.getHorarioTrabalho());
            if (dto.getHorarioTrabalhoIntervalo() != null) {
                e.setHorarioTrabalhoIntervalo(dto.getHorarioTrabalhoIntervalo());
            }
            if (dto.getDiasTrabalho() != null) {
                e.setDiasTrabalho(dto.getDiasTrabalho());
            }
            if (dto.getPrazoExperienciaTexto() != null) {
                e.setPrazoExperienciaTexto(dto.getPrazoExperienciaTexto());
            }
            if (dto.getProrrogacaoExperiencia() != null) {
                e.setProrrogacaoExperiencia(dto.getProrrogacaoExperiencia());
            }
            e.setFolgaSemanal(dto.getFolgaSemanal());
            if (dto.getEscalaTrabalho() != null) {
                e.setEscalaTrabalho(dto.getEscalaTrabalho());
            }
            e.setFgtsOptante(dto.getFgtsOptante());
            e.setFgtsDataOpcao(dto.getFgtsDataOpcao());
            e.setFgtsBancoDepositario(dto.getFgtsBancoDepositario());
            e.setFgtsDataRetratacao(dto.getFgtsDataRetratacao());
            e.setPisDataCadastro(dto.getPisDataCadastro());
            e.setPisBancoDepositario(dto.getPisBancoDepositario());
            e.setPisEnderecoBanco(dto.getPisEnderecoBanco());
            e.setPisCodigoBanco(dto.getPisCodigoBanco());
            e.setPisCodigoAgencia(dto.getPisCodigoAgencia());
            // e.setCnhNumber(dto.getCnhNumber()); // Campo já existe no modelo
            e.setCnhExpirationDate(dto.getCnhExpirationDate());
            e.setCnhCategory(dto.getCnhCategory());
            e.setCtps(dto.getCtps());
            e.setCtpsRural(dto.getCtpsRural());
            e.setCtpsSeries(dto.getCtpsSeries());
            e.setCtpsIssueDate(dto.getCtpsIssueDate());
            e.setCtpsIssuingAgency(dto.getCtpsIssuingAgency());
            e.setCarteiraModelo19(dto.getCarteiraModelo19());
            e.setRegistroGeralEstrangeiro(dto.getRegistroGeralEstrangeiro());
            e.setCasadoBrasileiro(dto.getCasadoBrasileiro());
            e.setNomeConjugeEstrangeiro(dto.getNomeConjugeEstrangeiro());
            e.setTemFilhosBrasileiros(dto.getTemFilhosBrasileiros());
            e.setQuantidadeFilhosBrasileiros(dto.getQuantidadeFilhosBrasileiros());
            e.setDataChegadaBrasil(dto.getDataChegadaBrasil());
            e.setNaturalizado(dto.getNaturalizado());
            e.setDecretoNaturalizacao(dto.getDecretoNaturalizacao());
            e.setVistoFiscalizacao(dto.getVistoFiscalizacao());

            // Campos para Estrangeiro
            if (dto.getRneNumero() != null) {
                e.setRneNumero(dto.getRneNumero());
            }
            if (dto.getRneValidade() != null) {
                e.setRneValidade(dto.getRneValidade());
            }
            if (dto.getRicNumero() != null) {
                e.setRicNumero(dto.getRicNumero());
            }
            if (dto.getRicOrgaoEmissor() != null) {
                e.setRicOrgaoEmissor(dto.getRicOrgaoEmissor());
            }
            if (dto.getRicDataEmissao() != null) {
                e.setRicDataEmissao(dto.getRicDataEmissao());
            }
            if (dto.getTipoVisto() != null) {
                e.setTipoVisto(dto.getTipoVisto());
            }
            e.setAssinaturaFuncionario(dto.getAssinaturaFuncionario());
            e.setDataRescisao(dto.getDataRescisao());

            // Setar entidades relacionais (agora opcionais)
            if (dto.getUser() != null && dto.getUser().getId() != null) {
                System.out.println("[DEBUG] Buscando usuário ID: " + dto.getUser().getId());
                e.setUser(userRepository.findById(dto.getUser().getId()).orElse(null));
                if (e.getUser() == null) {
                    System.err
                            .println("[WARNING] Usuário não encontrado para o id informado: " + dto.getUser().getId());
                }
            }

            if (dto.getPosition() != null && dto.getPosition().getId() != null) {
                System.out.println("[DEBUG] Buscando cargo ID: " + dto.getPosition().getId());
                e.setPosition(positionRepository.findById(dto.getPosition().getId()).orElse(null));
                if (e.getPosition() == null) {
                    System.err.println(
                            "[WARNING] Cargo não encontrado para o id informado: " + dto.getPosition().getId());
                }
            }

            if (dto.getUnit() != null && dto.getUnit().getId() != null) {
                e.setUnit(unitRepository.findById(dto.getUnit().getId()).orElse(null));
            }

            if (dto.getCompany() != null && dto.getCompany().getId() != null) {
                e.setCompany(companyRepository.findById(dto.getCompany().getId()).orElse(null));
            }

            // Mapear WorkPost se fornecido
            if (dto.getWorkPostId() != null && !dto.getWorkPostId().trim().isEmpty()) {
                try {
                    UUID workPostId = UUID.fromString(dto.getWorkPostId());
                    e.setWorkPost(workPostRepository.findById(workPostId).orElse(null));
                } catch (IllegalArgumentException ex) {
                    System.err.println("[WARNING] WorkPostId inválido: " + dto.getWorkPostId());
                }
            }

            // Mapear Department se fornecido
            if (dto.getDepartmentId() != null && !dto.getDepartmentId().trim().isEmpty()) {
                try {
                    UUID departmentId = UUID.fromString(dto.getDepartmentId());
                    e.setDepartment(departmentRepository.findById(departmentId).orElse(null));
                } catch (IllegalArgumentException ex) {
                    System.err.println("[WARNING] DepartmentId inválido: " + dto.getDepartmentId());
                }
            }

            // Mapear dados do exame médico (ASO)
            if (dto.getExameMedicoData() != null) {
                e.setExameMedicoData(dto.getExameMedicoData());
            }
            if (dto.getExameMedicoVencimento() != null) {
                e.setExameMedicoVencimento(dto.getExameMedicoVencimento());
            }
            if (dto.getExameMedicoTipo() != null) {
                e.setExameMedicoTipo(dto.getExameMedicoTipo());
            }
            if (dto.getExameMedicoDoctor() != null && dto.getExameMedicoDoctor().getId() != null) {
                e.setExameMedicoDoctor(doctorRepository.findById(dto.getExameMedicoDoctor().getId()).orElse(null));
            }
            if (dto.getExameMedicoHorario() != null) {
                e.setExameMedicoHorario(dto.getExameMedicoHorario());
            }
            if (dto.getExameMedicoIntervalosRefeicao() != null) {
                e.setExameMedicoIntervalosRefeicao(dto.getExameMedicoIntervalosRefeicao());
            }
            if (dto.getExameMedicoObservacoes() != null) {
                e.setExameMedicoObservacoes(dto.getExameMedicoObservacoes());
            }
            if (dto.getExameMedicoPrimeiroEmprego() != null) {
                e.setExameMedicoPrimeiroEmprego(dto.getExameMedicoPrimeiroEmprego());
            }
            if (dto.getExameMedicoContribuicaoSindicalPaga() != null) {
                e.setExameMedicoContribuicaoSindicalPaga(dto.getExameMedicoContribuicaoSindicalPaga());
            }

            // Mapear documentos se fornecidos
            if (dto.getDocuments() != null && !dto.getDocuments().isEmpty()) {
                System.out.println("[DEBUG] Documentos fornecidos: " + dto.getDocuments().size());
            }

            // Mapear contato de emergência se fornecido
            if (dto.getEmergencyContact() != null) {
                System.out.println("[DEBUG] Contato de emergência fornecido: " + dto.getEmergencyContact().getName());
            }

            // Mapear informações bancárias se fornecidas
            if (dto.getBankInfo() != null) {
                System.out.println("[DEBUG] Informações bancárias fornecidas: " + dto.getBankInfo().getBank());
                e.setBanco(dto.getBankInfo().getBank());
                e.setAgencia(dto.getBankInfo().getAgency());
                e.setContaCorrente(dto.getBankInfo().getAccount());
                e.setContaDigito(dto.getBankInfo().getAccountDigit());
                e.setAccountType(dto.getBankInfo().getAccountType());
                e.setPixKey(dto.getBankInfo().getPixKey());
            }

            // Mapear informações profissionais se fornecidas
            if (dto.getJobInfo() != null) {
                System.out.println("[DEBUG] Informações profissionais fornecidas: " + dto.getJobInfo().getPosition());
            }

            System.out.println("[DEBUG] Conversão DTO -> Entity concluída com sucesso");
            return e;
        } catch (Exception ex) {
            System.err.println("[ERROR] Erro na conversão DTO -> Entity: " + ex.getMessage());
            ex.printStackTrace();
            throw new RuntimeException("Erro na conversão DTO -> Entity: " + ex.getMessage(), ex);
        }
    }

    @Transactional(readOnly = true)
    public EmployeeDTO toDTO(Employee e) {
        try {
            System.out.println("[DEBUG] Iniciando conversão Entity -> DTO para funcionário: "
                    + (e != null ? e.getName() : "null"));

            if (e == null) {
                throw new IllegalArgumentException("Employee não pode ser null");
            }

            EmployeeDTO dto = new EmployeeDTO();

            // Campos básicos essenciais
            dto.setId(e.getId());
            dto.setName(e.getName());
            dto.setCpf(e.getCpf() != null && !e.getCpf().trim().isEmpty() ? e.getCpf() : e.getDocument());
            dto.setRg(e.getRg() != null && !e.getRg().trim().isEmpty() ? e.getRg() : e.getNumeroRg());
            // dto.setGender(e.getGender()); // Campo Gender não existe na entidade
            dto.setEmail(e.getEmail());
            dto.setPhone(e.getPhone());
            dto.setStatus(e.getStatus() != null ? e.getStatus().name() : null);
            dto.setNotes(e.getNotes());
            dto.setCreatedAt(e.getCreatedAt());
            dto.setUpdatedAt(e.getUpdatedAt());

            // Campos opcionais com verificação de null
            if (e.getBirthDate() != null) {
                dto.setBirthDate(e.getBirthDate());
            }
            if (e.getMaritalStatus() != null) {
                dto.setMaritalStatus(e.getMaritalStatus());
            }
            if (e.getNationality() != null) {
                dto.setNationality(e.getNationality());
            }
            dto.setPhotoUrl(e.getPhotoUrl());
            dto.setRegistrationNumber(e.getRegistrationNumber());
            if (e.getHireDate() != null) {
                dto.setHireDate(e.getHireDate());
            }
            if (e.getTerminationDate() != null) {
                dto.setTerminationDate(e.getTerminationDate());
            }
            if (e.getTerminationReason() != null) {
                dto.setTerminationReason(e.getTerminationReason());
            }

            // Address - usar campos separados se disponíveis, senão usar campo address
            // antigo
            EmployeeDTO.AddressDTO address = new EmployeeDTO.AddressDTO();
            if (e.getEnderecoRua() != null) {
                address.setStreet(e.getEnderecoRua());
            } else if (e.getAddress() != null && !e.getAddress().trim().isEmpty()) {
                address.setStreet(e.getAddress());
            }
            if (e.getEnderecoNumero() != null) {
                address.setNumber(e.getEnderecoNumero());
            }
            if (e.getEnderecoComplemento() != null) {
                address.setComplement(e.getEnderecoComplemento());
            }
            if (e.getEnderecoBairro() != null) {
                address.setNeighborhood(e.getEnderecoBairro());
            }
            if (e.getEnderecoCidade() != null) {
                address.setCity(e.getEnderecoCidade());
            }
            if (e.getEnderecoEstado() != null) {
                address.setState(e.getEnderecoEstado());
            }
            if (e.getEnderecoCep() != null) {
                address.setZipCode(e.getEnderecoCep());
            }
            if (address.getStreet() != null || address.getNumber() != null ||
                    address.getNeighborhood() != null || address.getCity() != null) {
                dto.setAddress(address);
            }

            // Mapear campos de endereço separados
            dto.setEnderecoRua(e.getEnderecoRua());
            dto.setEnderecoNumero(e.getEnderecoNumero());
            dto.setEnderecoComplemento(e.getEnderecoComplemento());
            dto.setEnderecoBairro(e.getEnderecoBairro());
            dto.setEnderecoCidade(e.getEnderecoCidade());
            dto.setEnderecoEstado(e.getEnderecoEstado());
            dto.setEnderecoCep(e.getEnderecoCep());

            // Mapear telefone de contato
            dto.setTelefoneContato(e.getTelefoneContato());

            // Mapear campos CIN
            dto.setCinNumero(e.getCinNumero());
            dto.setCinOrgaoEmissor(e.getCinOrgaoEmissor());
            dto.setCinDataEmissao(e.getCinDataEmissao());

            // Mapear CTPS Digital PDF (não incluir o byte array no DTO por padrão, apenas
            // metadados)
            // dto.setCtpsDigitalPdf(e.getCtpsDigitalPdf()); // Não incluir byte array no
            // DTO
            dto.setCtpsDigitalPdfNome(e.getCtpsDigitalPdfNome());
            dto.setCtpsDigitalPdfTamanho(e.getCtpsDigitalPdfTamanho());

            // Mapear dados do cônjuge
            dto.setSpouseName(e.getSpouseName());
            dto.setSpouseCpf(e.getSpouseCpf());
            dto.setSpouseRg(e.getSpouseRg());
            dto.setSpouseBirthDate(e.getSpouseBirthDate());
            dto.setSpousePhone(e.getSpousePhone());
            dto.setSpouseEmail(e.getSpouseEmail());

            // Mapear campos da ficha de registro
            dto.setEmpresaNome(e.getEmpresaNome());
            dto.setEmpresaEndereco(e.getEmpresaEndereco());
            dto.setEmpresaCnpj(e.getEmpresaCnpj());
            dto.setTituloEleitor(e.getTituloEleitor());
            dto.setTituloEleitorZona(e.getTituloEleitorZona());
            dto.setTituloEleitorSecao(e.getTituloEleitorSecao());
            dto.setTituloEleitorDataExpedicao(e.getTituloEleitorDataExpedicao());
            dto.setTituloEleitorValidade(e.getTituloEleitorValidade());
            dto.setNomeConselhoRegional(e.getNomeConselhoRegional());
            dto.setCarteiraIdentidadeOrgaoEmissor(e.getCarteiraIdentidadeOrgaoEmissor());
            dto.setCarteiraIdentidadeDataEmissao(e.getCarteiraIdentidadeDataEmissao());
            dto.setRgUf(e.getRgUf());
            dto.setCertificadoMilitar(e.getCertificadoMilitar());
            dto.setNomePai(e.getNomePai());
            dto.setNomeMae(e.getNomeMae());
            dto.setLocalNascimento(e.getLocalNascimento());
            dto.setMunicipioNascimento(e.getMunicipioNascimento());
            dto.setEstadoNascimento(e.getEstadoNascimento());
            dto.setSexo(e.getSexo());
            dto.setGrauInstrucao(e.getGrauInstrucao());
            dto.setRacaCor(e.getRacaCor());
            dto.setTipoSalarioContratual(e.getTipoSalarioContratual());
            dto.setMatriculaEsocial(e.getMatriculaEsocial());
            dto.setCbo(e.getCbo());
            dto.setPis(e.getPis());
            dto.setSalario(e.getSalario());
            dto.setSalarioPorExtenso(e.getSalarioPorExtenso());
            dto.setPeriodoPagamento(e.getPeriodoPagamento());
            dto.setHorarioTrabalho(e.getHorarioTrabalho());
            dto.setFolgaSemanal(e.getFolgaSemanal());
            dto.setEscalaTrabalho(e.getEscalaTrabalho());
            dto.setHorarioTrabalhoIntervalo(e.getHorarioTrabalhoIntervalo());
            dto.setDiasTrabalho(e.getDiasTrabalho());
            dto.setPrazoExperienciaTexto(e.getPrazoExperienciaTexto());
            dto.setProrrogacaoExperiencia(e.getProrrogacaoExperiencia());
            dto.setFgtsOptante(e.getFgtsOptante());
            dto.setFgtsDataOpcao(e.getFgtsDataOpcao());
            dto.setFgtsBancoDepositario(e.getFgtsBancoDepositario());
            dto.setFgtsDataRetratacao(e.getFgtsDataRetratacao());
            dto.setPisDataCadastro(e.getPisDataCadastro());
            dto.setPisBancoDepositario(e.getPisBancoDepositario());
            dto.setPisEnderecoBanco(e.getPisEnderecoBanco());
            dto.setPisCodigoBanco(e.getPisCodigoBanco());
            dto.setPisCodigoAgencia(e.getPisCodigoAgencia());
            dto.setCnhNumber(e.getCnhNumber());
            dto.setCnhExpirationDate(e.getCnhExpirationDate());
            dto.setCnhCategory(e.getCnhCategory());
            dto.setCtps(e.getCtps());
            dto.setCtpsRural(e.getCtpsRural());
            dto.setCtpsSeries(e.getCtpsSeries());
            dto.setCtpsIssueDate(e.getCtpsIssueDate());
            dto.setCtpsIssuingAgency(e.getCtpsIssuingAgency());
            dto.setCarteiraModelo19(e.getCarteiraModelo19());
            dto.setRegistroGeralEstrangeiro(e.getRegistroGeralEstrangeiro());
            dto.setCasadoBrasileiro(e.getCasadoBrasileiro());
            dto.setNomeConjugeEstrangeiro(e.getNomeConjugeEstrangeiro());
            dto.setTemFilhosBrasileiros(e.getTemFilhosBrasileiros());
            dto.setQuantidadeFilhosBrasileiros(e.getQuantidadeFilhosBrasileiros());
            dto.setDataChegadaBrasil(e.getDataChegadaBrasil());
            dto.setNaturalizado(e.getNaturalizado());
            dto.setDecretoNaturalizacao(e.getDecretoNaturalizacao());
            dto.setVistoFiscalizacao(e.getVistoFiscalizacao());
            dto.setAssinaturaFuncionario(e.getAssinaturaFuncionario());
            dto.setDataRescisao(e.getDataRescisao() != null ? e.getDataRescisao() : e.getTerminationDate());

            // Mapear dados do Exame Médico (ASO)
            dto.setExameMedicoData(e.getExameMedicoData());
            dto.setExameMedicoVencimento(e.getExameMedicoVencimento());
            dto.setExameMedicoTipo(e.getExameMedicoTipo());
            dto.setExameMedicoHorario(e.getExameMedicoHorario());
            dto.setExameMedicoIntervalosRefeicao(e.getExameMedicoIntervalosRefeicao());
            dto.setExameMedicoHorarioIntervalo(e.getExameMedicoHorarioIntervalo());
            dto.setExameMedicoObservacoes(e.getExameMedicoObservacoes());
            dto.setExameMedicoPrimeiroEmprego(e.getExameMedicoPrimeiroEmprego());
            dto.setExameMedicoContribuicaoSindicalPaga(e.getExameMedicoContribuicaoSindicalPaga());

            // Mapear campos de CIN
            dto.setCinNumero(e.getCinNumero());
            dto.setCinOrgaoEmissor(e.getCinOrgaoEmissor());
            dto.setCinDataEmissao(e.getCinDataEmissao());

            // Mapear relacionamento de Posto de Trabalho e Departamento
            try {
                org.hibernate.Hibernate.initialize(e.getWorkPost());
                if (e.getWorkPost() != null) {
                    dto.setWorkPostId(e.getWorkPost().getId().toString());
                    EmployeeDTO.IdOnlyDTO workPostDTO = new EmployeeDTO.IdOnlyDTO();
                    workPostDTO.setId(e.getWorkPost().getId());
                    workPostDTO.setName(e.getWorkPost().getName());
                    if (e.getWorkPost().getClient() != null) {
                        workPostDTO.setClientId(e.getWorkPost().getClient().getId());
                        workPostDTO.setClientName(e.getWorkPost().getClient().getName());
                    }
                    if (e.getWorkPost().getEpis() != null) {
                        workPostDTO.setEpis(new java.util.ArrayList<>(e.getWorkPost().getEpis()));
                    }
                    dto.setWorkPost(workPostDTO);
                }
            } catch (Exception wpEx) {
                System.err.println("[WARNING] Erro ao mapear workPost: " + wpEx.getMessage());
            }
            try {
                if (e.getDepartment() != null) {
                    dto.setDepartmentId(e.getDepartment().getId().toString());
                    EmployeeDTO.IdOnlyDTO deptDTO = new EmployeeDTO.IdOnlyDTO();
                    deptDTO.setId(e.getDepartment().getId());
                    deptDTO.setName(e.getDepartment().getName());
                    dto.setDepartment(deptDTO);
                }
            } catch (Exception deptEx) {
                System.err.println("[WARNING] Erro ao mapear department: " + deptEx.getMessage());
            }

            try {
                if (e.getExameMedicoDoctor() != null) {
                    EmployeeDTO.IdOnlyDTO doctorDTO = new EmployeeDTO.IdOnlyDTO();
                    doctorDTO.setId(e.getExameMedicoDoctor().getId());
                    doctorDTO.setName(e.getExameMedicoDoctor().getName());
                    dto.setExameMedicoDoctor(doctorDTO);
                }
            } catch (Exception docEx) {
                System.err.println("[WARNING] Erro ao mapear exameMedicoDoctor: " + docEx.getMessage());
            }

            // Mapear dados bancários
            if (e.getBanco() != null || e.getAgencia() != null || e.getContaCorrente() != null
                    || e.getContaDigito() != null || e.getPixKey() != null || e.getAccountType() != null) {
                EmployeeDTO.BankInfoDTO bankInfo = new EmployeeDTO.BankInfoDTO();
                bankInfo.setBank(e.getBanco());
                bankInfo.setAgency(e.getAgencia());
                bankInfo.setAccount(e.getContaCorrente());
                bankInfo.setAccountDigit(e.getContaDigito());
                bankInfo.setAccountType(e.getAccountType() != null ? e.getAccountType() : "CORRENTE");
                bankInfo.setPixKey(e.getPixKey());
                dto.setBankInfo(bankInfo);
            }

            // Mapear entidades relacionais com verificação de null
            if (e.getUser() != null) {
                try {
                    EmployeeDTO.IdOnlyDTO userDTO = new EmployeeDTO.IdOnlyDTO();
                    userDTO.setId(e.getUser().getId());
                    userDTO.setName(e.getUser().getName());
                    userDTO.setUsername(e.getUser().getUsername());
                    userDTO.setEmail(e.getUser().getEmail());
                    dto.setUser(userDTO);
                } catch (Exception userEx) {
                    System.err.println("[WARNING] Erro ao mapear user: " + userEx.getMessage());
                    dto.setUser(null);
                }
            }

            if (e.getPosition() != null) {
                try {
                    // Forçar inicialização do position (LAZY loading)
                    org.hibernate.Hibernate.initialize(e.getPosition());

                    EmployeeDTO.PositionDTO positionDTO = new EmployeeDTO.PositionDTO();
                    positionDTO.setId(e.getPosition().getId());
                    positionDTO.setName(e.getPosition().getName());
                    if (e.getPosition().getDescription() != null) {
                        positionDTO.setDescription(e.getPosition().getDescription());
                    }
                    dto.setPosition(positionDTO);
                    System.out.println("[DEBUG] Position mapeado com sucesso: " + positionDTO.getName());
                } catch (Exception positionEx) {
                    System.err.println("[WARNING] Erro ao mapear position: " + positionEx.getMessage());
                    positionEx.printStackTrace();
                    dto.setPosition(null);
                }
            }

            if (e.getUnit() != null) {
                try {
                    // Forçar inicialização do unit (LAZY loading)
                    org.hibernate.Hibernate.initialize(e.getUnit());

                    EmployeeDTO.UnitDTO unitDTO = new EmployeeDTO.UnitDTO();
                    unitDTO.setId(e.getUnit().getId());
                    unitDTO.setName(e.getUnit().getName());
                    if (e.getUnit().getDescription() != null) {
                        unitDTO.setDescription(e.getUnit().getDescription());
                    }
                    dto.setUnit(unitDTO);
                    System.out.println("[DEBUG] Unit mapeado com sucesso: " + unitDTO.getName());
                } catch (Exception unitEx) {
                    System.err.println("[WARNING] Erro ao mapear unit: " + unitEx.getMessage());
                    unitEx.printStackTrace();
                    dto.setUnit(null);
                }
            }

            // Mapear Company
            if (e.getCompany() != null) {
                try {
                    EmployeeDTO.IdOnlyDTO companyDTO = new EmployeeDTO.IdOnlyDTO();
                    companyDTO.setId(e.getCompany().getId());
                    companyDTO.setName(e.getCompany().getName());
                    companyDTO.setSigla(e.getCompany().getSigla());
                    companyDTO.setCnpj(e.getCompany().getCnpj());
                    dto.setCompany(companyDTO);
                } catch (Exception companyEx) {
                    System.err.println("[WARNING] Erro ao mapear company: " + companyEx.getMessage());
                    dto.setCompany(null);
                }
            }

            // Mapear Dependentes
            try {
                if (e.getDependents() != null && !e.getDependents().isEmpty()) {
                    org.hibernate.Hibernate.initialize(e.getDependents());
                    List<com.z7design.secured_guard.dto.DependentDTO> dependentsDTO = e.getDependents().stream()
                            .map(d -> com.z7design.secured_guard.dto.DependentDTO.builder()
                                    .id(d.getId())
                                    .name(d.getName())
                                    .cpf(d.getCpf())
                                    .birthDate(d.getBirthDate())
                                    .relationship(d.getRelationship() != null ? d.getRelationship().toString() : null)
                                    .build())
                            .collect(java.util.stream.Collectors.toList());
                    dto.setDependents(dependentsDTO);
                }
            } catch (Exception depEx) {
                System.err.println("[WARNING] Erro ao mapear dependentes: " + depEx.getMessage());
            }

            System.out.println("[DEBUG] DTO criado com sucesso para: " + dto.getName());
            return dto;

        } catch (Exception ex) {
            System.err.println("[ERROR] Erro na conversão Entity -> DTO: " + ex.getMessage());
            ex.printStackTrace();
            throw new RuntimeException("Erro na conversão Entity -> DTO: " + ex.getMessage(), ex);
        }
    }

    /**
     * Lista supervisores ativos para seleção em formulários
     */
    public List<SimpleEmployeeDTO> getSupervisors() {
        // Buscar funcionários ativos com cargo que contenha "supervisor" (case
        // insensitive)
        List<Employee> allActiveEmployees = employeeRepository.findByStatus(EmploymentStatus.ACTIVE);

        return allActiveEmployees.stream()
                .filter(emp -> emp.getPosition() != null &&
                        emp.getPosition().getName() != null &&
                        emp.getPosition().getName().toLowerCase().contains("supervisor"))
                .map(emp -> SimpleEmployeeDTO.builder()
                        .id(emp.getId())
                        .name(emp.getName())
                        .email(emp.getEmail())
                        .positionName(emp.getPosition() != null ? emp.getPosition().getName() : null)
                        .salario(emp.getSalario())
                        .build())
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Busca funcionário por CPF exato (normalizado)
     * Tenta buscar em diferentes campos e com normalização
     * PRIORIDADE: users.username -> employees.document -> employees.cpf
     */
    public Optional<Employee> findByCpfExact(String cpf) {
        // Normalizar CPF (remover caracteres não numéricos)
        String normalizedCpf = cpf.replaceAll("[^0-9]", "");
        log.debug("Buscando funcionário por CPF exato (normalizado): {}", normalizedCpf);

        // PRIORIDADE 1: Buscar User pelo username (que contém o CPF)
        Optional<com.z7design.secured_guard.model.User> userOpt = userRepository.findByUsername(normalizedCpf);
        if (userOpt.isEmpty()) {
            // Tentar também com CPF formatado (com pontos e traço)
            String formattedCpf = normalizedCpf.length() == 11
                    ? String.format("%s.%s.%s-%s",
                            normalizedCpf.substring(0, 3),
                            normalizedCpf.substring(3, 6),
                            normalizedCpf.substring(6, 9),
                            normalizedCpf.substring(9))
                    : normalizedCpf;
            userOpt = userRepository.findByUsername(formattedCpf);
        }

        if (userOpt.isPresent()) {
            com.z7design.secured_guard.model.User user = userOpt.get();
            log.debug("✅ User encontrado pelo username (CPF): {} - ID: {}", user.getUsername(), user.getId());

            // Buscar Employee relacionado ao User
            Optional<Employee> employeeOpt = employeeRepository.findByUserId(user.getId());
            if (employeeOpt.isPresent()) {
                log.debug("✅ Funcionário encontrado através do User: {}", employeeOpt.get().getName());
                return employeeOpt;
            } else {
                log.warn("⚠️ User encontrado mas não há Employee relacionado para userId: {}", user.getId());
            }
        }

        // PRIORIDADE 2: Buscar usando findByCpf (busca na coluna cpf com normalização)
        Optional<Employee> employeeOpt = employeeRepository.findByCpf(normalizedCpf);
        if (employeeOpt.isPresent()) {
            log.debug("✅ Funcionário encontrado usando findByCpf: {}", employeeOpt.get().getName());
            return employeeOpt;
        }

        // PRIORIDADE 3: Buscar usando findByDocument (campo document)
        employeeOpt = employeeRepository.findByDocument(normalizedCpf);
        if (employeeOpt.isPresent()) {
            log.debug("✅ Funcionário encontrado usando findByDocument: {}", employeeOpt.get().getName());
            return employeeOpt;
        }

        // PRIORIDADE 4: Buscar todos e normalizar manualmente (fallback)
        List<Employee> allEmployees = employeeRepository.findAll();
        employeeOpt = allEmployees.stream()
                .filter(e -> e.getDocument() != null)
                .filter(e -> e.getDocument().replaceAll("[^0-9]", "").equals(normalizedCpf))
                .findFirst();

        if (employeeOpt.isPresent()) {
            log.debug("✅ Funcionário encontrado usando busca manual: {}", employeeOpt.get().getName());
            return employeeOpt;
        }

        log.warn(
                "⚠️ Funcionário não encontrado para CPF: {} (tentou users.username, employees.document, employees.cpf)",
                normalizedCpf);
        return Optional.empty();
    }

    /**
     * Busca funcionário por matrícula eSocial (exata, case insensitive).
     * Usado na importação Excel para identificar registro existente quando CPF não for encontrado.
     */
    public Optional<Employee> findByMatriculaEsocial(String matriculaEsocial) {
        if (matriculaEsocial == null || matriculaEsocial.trim().isEmpty()) {
            return Optional.empty();
        }
        return employeeRepository.findByMatriculaEsocialIgnoreCase(matriculaEsocial.trim());
    }

    /**
     * Busca dados básicos do funcionário por CPF
     */
    public Map<String, Object> getEmployeeBasicDataByCpf(String cpf) {
        log.debug("Buscando dados básicos do funcionário por CPF: {}", cpf);

        Optional<Employee> employeeOpt = findByCpfExact(cpf);
        if (employeeOpt.isEmpty()) {
            log.warn("Funcionário não encontrado para CPF: {}", cpf);
            return new HashMap<>();
        }

        Employee employee = employeeOpt.get();
        Map<String, Object> data = new HashMap<>();

        data.put("id", employee.getId());
        data.put("name", employee.getName());
        data.put("cpf", employee.getDocument());
        data.put("email", employee.getEmail());
        data.put("phone", employee.getPhone());
        data.put("status", employee.getStatus());

        if (employee.getPosition() != null) {
            data.put("position", employee.getPosition().getName());
            data.put("positionId", employee.getPosition().getId());
        }

        if (employee.getUnit() != null) {
            data.put("unit", employee.getUnit().getName());
            data.put("unitId", employee.getUnit().getId());
        }

        log.debug("Dados básicos encontrados para funcionário: {}", employee.getName());
        return data;
    }
}