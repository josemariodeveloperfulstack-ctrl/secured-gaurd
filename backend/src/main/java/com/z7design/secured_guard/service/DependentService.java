package com.z7design.secured_guard.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.z7design.secured_guard.dto.DependentDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Dependent;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.DependentRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.validation.CpfValidationUtils;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class DependentService {
    
    private final DependentRepository dependentRepository;
    private final EmployeeRepository employeeRepository;
    
    @Transactional
    public DependentDTO create(DependentDTO.CreateRequest request) {
        log.info("Criando dependente para funcionário ID: {}", request.getEmployeeId());
        
        // Validar se funcionário existe
        Employee employee = employeeRepository.findById(request.getEmployeeId())
            .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado"));
        
        String cpfNormalizado = normalizeAndAssertValidCpf(request.getCpf());

        assertCpfNotAlreadyRegistered(request.getEmployeeId(), cpfNormalizado, null);
        
        Dependent dependent = Dependent.builder()
            .employee(employee)
            .name(request.getName())
            .relationship(request.getRelationship())
            .birthDate(request.getBirthDate())
            .cpf(cpfNormalizado)
            .rg(request.getRg())
            .gender(request.getGender())
            .phone(blankToNull(request.getPhone()))
            .email(blankToNull(request.getEmail()))
            .address(request.getAddress())
            .city(request.getCity())
            .state(request.getState())
            .zipCode(request.getZipCode())
            .isStudent(request.getIsStudent())
            .schoolName(request.getSchoolName())
            .isBeneficiary(request.getIsBeneficiary())
            .notes(request.getNotes())
            .build();
        
        validateDependent(dependent);
        Dependent saved = dependentRepository.save(dependent);
        
        log.info("Dependente criado com sucesso. ID: {}", saved.getId());
        return mapToDTO(saved);
    }
    
    @Transactional
    public DependentDTO update(UUID id, DependentDTO.UpdateRequest request) {
        log.info("Atualizando dependente ID: {}", id);
        
        Dependent existingDependent = findByIdEntity(id);
        
        if (request.getCpf() != null) {
            String cpfNormalizado = normalizeAndAssertValidCpf(request.getCpf());
            String cpfAtual = CpfValidationUtils.digitsOnly(existingDependent.getCpf());
            if (!cpfNormalizado.equals(cpfAtual)) {
                assertCpfNotAlreadyRegistered(existingDependent.getEmployee().getId(), cpfNormalizado, id);
            }
            existingDependent.setCpf(cpfNormalizado);
        }
        
        // Atualizar campos
        if (request.getName() != null) existingDependent.setName(request.getName());
        if (request.getRelationship() != null) existingDependent.setRelationship(request.getRelationship());
        if (request.getBirthDate() != null) existingDependent.setBirthDate(request.getBirthDate());
        if (request.getRg() != null) existingDependent.setRg(request.getRg());
        if (request.getGender() != null) existingDependent.setGender(request.getGender());
        if (request.getPhone() != null) existingDependent.setPhone(blankToNull(request.getPhone()));
        if (request.getEmail() != null) existingDependent.setEmail(blankToNull(request.getEmail()));
        if (request.getAddress() != null) existingDependent.setAddress(request.getAddress());
        if (request.getCity() != null) existingDependent.setCity(request.getCity());
        if (request.getState() != null) existingDependent.setState(request.getState());
        if (request.getZipCode() != null) existingDependent.setZipCode(request.getZipCode());
        if (request.getIsStudent() != null) existingDependent.setIsStudent(request.getIsStudent());
        if (request.getSchoolName() != null) existingDependent.setSchoolName(request.getSchoolName());
        if (request.getIsBeneficiary() != null) existingDependent.setIsBeneficiary(request.getIsBeneficiary());
        if (request.getNotes() != null) existingDependent.setNotes(request.getNotes());
        
        validateDependent(existingDependent);
        Dependent saved = dependentRepository.save(existingDependent);
        
        log.info("Dependente atualizado com sucesso. ID: {}", saved.getId());
        return mapToDTO(saved);
    }
    
    @Transactional
    public void delete(UUID id) {
        log.info("Excluindo dependente ID: {}", id);
        Dependent dependent = findByIdEntity(id);
        dependentRepository.delete(dependent);
        log.info("Dependente excluído com sucesso. ID: {}", id);
    }
    
    public DependentDTO findById(UUID id) {
        return mapToDTO(findByIdEntity(id));
    }
    
    public List<DependentDTO> findByEmployeeId(UUID employeeId) {
        log.info("Buscando dependentes do funcionário ID: {}", employeeId);
        return dependentRepository.findByEmployeeId(employeeId)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public List<DependentDTO> findAll() {
        log.info("Buscando todos os dependentes");
        return dependentRepository.findAll()
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public List<DependentDTO> findByCpf(String cpf) {
        log.info("Buscando dependente por CPF: {}", cpf);
        return dependentRepository.findByCpf(cpf)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    public List<DependentDTO> findByRelationship(String relationship) {
        log.info("Buscando dependentes por relacionamento: {}", relationship);
        return dependentRepository.findByRelationship(relationship)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    
    private Dependent findByIdEntity(UUID id) {
        return dependentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Dependente não encontrado"));
    }
    
    private DependentDTO mapToDTO(Dependent dependent) {
        return DependentDTO.builder()
            .id(dependent.getId())
            .employeeId(dependent.getEmployee().getId())
            .employeeName(dependent.getEmployee().getName())
            .name(dependent.getName())
            .relationship(dependent.getRelationship())
            .birthDate(dependent.getBirthDate())
            .cpf(dependent.getCpf())
            .rg(dependent.getRg())
            .gender(dependent.getGender())
            .phone(dependent.getPhone())
            .email(dependent.getEmail())
            .address(dependent.getAddress())
            .city(dependent.getCity())
            .state(dependent.getState())
            .zipCode(dependent.getZipCode())
            .isStudent(dependent.getIsStudent())
            .schoolName(dependent.getSchoolName())
            .isBeneficiary(dependent.getIsBeneficiary())
            .notes(dependent.getNotes())
            .createdAt(dependent.getCreatedAt())
            .updatedAt(dependent.getUpdatedAt())
            .build();
    }
    
    private void validateDependent(Dependent dependent) {
        if (dependent.getName() == null || dependent.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Nome do dependente é obrigatório");
        }
        
        if (dependent.getRelationship() == null || dependent.getRelationship().trim().isEmpty()) {
            throw new IllegalArgumentException("Relação com o dependente é obrigatória");
        }
        
        if (dependent.getBirthDate() == null) {
            throw new IllegalArgumentException("Data de nascimento é obrigatória");
        }
        
        if (dependent.getCpf() == null || dependent.getCpf().trim().isEmpty()) {
            throw new IllegalArgumentException("CPF é obrigatório");
        }
        
        if (dependent.getEmployee() == null) {
            throw new IllegalArgumentException("Funcionário é obrigatório");
        }
    }

    /**
     * Impede CPF duplicado na base (mesmo ou outro funcionário). {@code excludeDependentId} ignora
     * o registo em atualização.
     */
    private void assertCpfNotAlreadyRegistered(UUID employeeId, String cpfDigits, UUID excludeDependentId) {
        for (UUID depId : dependentRepository.findIdsByCpfDigitsNormalized(cpfDigits)) {
            if (excludeDependentId != null && depId.equals(excludeDependentId)) {
                continue;
            }
            Dependent d = dependentRepository.findById(depId)
                    .orElseThrow(() -> new IllegalStateException("Dependente inconsistente na verificação de CPF"));
            if (!d.getEmployee().getId().equals(employeeId)) {
                throw new IllegalArgumentException("CPF já está cadastrado para outro dependente");
            }
            throw new IllegalArgumentException("Este CPF já está cadastrado como dependente deste funcionário");
        }
    }

    private static String blankToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /** CPF apenas com dígitos, 11 posições e DV válidos — antes do persist para evitar rollback por Bean Validation. */
    private String normalizeAndAssertValidCpf(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            throw new IllegalArgumentException("CPF é obrigatório");
        }
        String digits = CpfValidationUtils.digitsOnly(raw);
        if (digits.length() != 11) {
            throw new IllegalArgumentException("CPF deve conter 11 dígitos");
        }
        if (!CpfValidationUtils.isValid(digits)) {
            throw new IllegalArgumentException("CPF inválido. Verifique os dígitos verificadores.");
        }
        return digits;
    }
} 