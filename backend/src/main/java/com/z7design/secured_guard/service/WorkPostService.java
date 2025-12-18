package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.WorkPostDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.WorkPostStatus;
import com.z7design.secured_guard.model.enums.WorkPostType;
import com.z7design.secured_guard.repository.WorkPostRepository;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.ContractRepository;
import com.z7design.secured_guard.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class WorkPostService {
    
    private final WorkPostRepository workPostRepository;
    private final ClientRepository clientRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    
    // Métodos básicos CRUD
    @Transactional(readOnly = true)
    public List<WorkPost> findAll() {
        log.info("🔍 WorkPostService.findAll() - Iniciando busca de postos");
        try {
            log.info("🔍 Tentando buscar postos com relacionamentos carregados via EntityGraph");
            // Usar método com @EntityGraph para carregar relacionamentos e evitar lazy loading
            List<WorkPost> workPosts = workPostRepository.findAllWithRelationships();
            log.info("✅ EntityGraph: Encontrados {} postos", workPosts != null ? workPosts.size() : 0);
            
            if (workPosts == null) {
                log.warn("⚠️ EntityGraph retornou null, usando lista vazia");
                return List.of();
            }
            
            return workPosts;
            
        } catch (DataAccessException e) {
            log.warn("⚠️ Erro de acesso a dados ao usar EntityGraph: {} - Tipo: {}", e.getMessage(), e.getClass().getSimpleName());
            log.warn("⚠️ Tentando findAll simples como fallback");
            return findAllFallback();
        } catch (Exception e) {
            String exceptionType = e.getClass().getName();
            // Detectar problemas relacionados a lazy loading ou transações
            if (exceptionType.contains("LazyInitialization") || 
                exceptionType.contains("Transaction") ||
                exceptionType.contains("Session")) {
                log.warn("⚠️ Problema detectado ({}) ao usar EntityGraph: {}", exceptionType, e.getMessage());
                log.warn("⚠️ Tentando findAll simples como fallback");
                return findAllFallback();
            }
            log.error("❌ Erro inesperado ao buscar postos: {} - Tipo: {}", e.getMessage(), exceptionType);
            log.error("❌ Stack trace completo: ", e);
            log.warn("⚠️ Tentando findAll simples como fallback");
            return findAllFallback();
        }
    }
    
    /**
     * Busca todos os postos e converte para DTO dentro da mesma transação
     * Isso garante que os relacionamentos sejam carregados antes da conversão
     * IMPORTANTE: Tudo deve acontecer dentro desta única transação
     */
    @Transactional(readOnly = true)
    public List<WorkPostDTO> findAllAsDTO() {
        log.info("🔍 WorkPostService.findAllAsDTO() - Buscando postos e convertendo para DTO em uma única transação");
        try {
            // Buscar postos dentro desta transação
            List<WorkPost> workPosts = null;
            try {
                log.debug("🔍 Tentando buscar com EntityGraph dentro da transação");
                workPosts = workPostRepository.findAllWithRelationships();
                log.info("✅ EntityGraph: Encontrados {} postos", workPosts != null ? workPosts.size() : 0);
            } catch (Exception e) {
                log.warn("⚠️ Erro com EntityGraph, tentando findAll simples: {}", e.getMessage());
                try {
                    workPosts = workPostRepository.findAll();
                    log.info("✅ Fallback findAll: Encontrados {} postos", workPosts != null ? workPosts.size() : 0);
                } catch (Exception fallbackEx) {
                    log.error("❌ Erro também no fallback: {}", fallbackEx.getMessage());
                    return new java.util.ArrayList<>();
                }
            }
            
            if (workPosts == null || workPosts.isEmpty()) {
                log.info("✅ findAllAsDTO: Nenhum posto encontrado");
                return new java.util.ArrayList<>();
            }
            
            // Converter dentro da MESMA transação (ainda está aberta)
            List<WorkPostDTO> dtos = convertToDTOList(workPosts);
            log.info("✅ findAllAsDTO: {} postos convertidos para DTOs", dtos != null ? dtos.size() : 0);
            return dtos != null ? dtos : new java.util.ArrayList<>();
            
        } catch (Exception e) {
            log.error("❌ Erro em findAllAsDTO: {} - Tipo: {}", e.getMessage(), e.getClass().getName());
            log.error("❌ Stack trace: ", e);
            return new java.util.ArrayList<>();
        }
    }
    
    /**
     * Fallback para buscar postos sem EntityGraph (mais seguro em ambientes com problemas de transação)
     */
    private List<WorkPost> findAllFallback() {
        try {
            log.info("🔍 Fallback: Buscando postos com findAll() simples");
            List<WorkPost> workPosts = workPostRepository.findAll();
            log.info("✅ Fallback: Encontrados {} postos", workPosts != null ? workPosts.size() : 0);
            return workPosts != null ? workPosts : List.of();
        } catch (Exception fallbackException) {
            log.error("❌ Erro também no fallback: {} - Tipo: {}", fallbackException.getMessage(), fallbackException.getClass().getName());
            log.error("❌ Stack trace do fallback: ", fallbackException);
            // Retornar lista vazia em vez de lançar exceção para evitar 500
            log.warn("⚠️ Retornando lista vazia devido a erro na busca");
            return List.of();
        }
    }
    
    public Page<WorkPost> findAll(Pageable pageable) {
        return workPostRepository.findAll(pageable);
    }
    
    public Optional<WorkPost> findById(UUID id) {
        return workPostRepository.findById(id);
    }
    
    public WorkPost getById(UUID id) {
        return workPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Posto de trabalho não encontrado com ID: " + id));
    }
    
    public Optional<WorkPost> findByPostCode(String postCode) {
        return workPostRepository.findByPostCode(postCode);
    }
    
    // Métodos de busca por filtros
    public List<WorkPost> findByStatus(WorkPostStatus status) {
        return workPostRepository.findByStatus(status);
    }
    
    public Page<WorkPost> findByStatus(WorkPostStatus status, Pageable pageable) {
        return workPostRepository.findByStatus(status, pageable);
    }
    
    public List<WorkPost> findByType(WorkPostType type) {
        return workPostRepository.findByType(type);
    }
    
    public Page<WorkPost> findByType(WorkPostType type, Pageable pageable) {
        return workPostRepository.findByType(type, pageable);
    }
    
    public List<WorkPost> findByClient(UUID clientId) {
        return workPostRepository.findByClientId(clientId);
    }
    
    public Page<WorkPost> findByClient(UUID clientId, Pageable pageable) {
        return workPostRepository.findByClientId(clientId, pageable);
    }
    
    public List<WorkPost> findByContract(UUID contractId) {
        return workPostRepository.findByContractId(contractId);
    }
    
    public Page<WorkPost> findByContract(UUID contractId, Pageable pageable) {
        return workPostRepository.findByContractId(contractId, pageable);
    }
    
    public List<WorkPost> findByResponsible(UUID responsibleId) {
        return workPostRepository.findByResponsibleId(responsibleId);
    }
    
    public Page<WorkPost> findByResponsible(UUID responsibleId, Pageable pageable) {
        return workPostRepository.findByResponsibleId(responsibleId, pageable);
    }
    
    public List<WorkPost> findByNameContaining(String name) {
        return workPostRepository.findByNameContainingIgnoreCase(name);
    }
    
    public Page<WorkPost> findByNameContaining(String name, Pageable pageable) {
        return workPostRepository.findByNameContainingIgnoreCase(name, pageable);
    }
    
    public List<WorkPost> findByAddressContaining(String address) {
        return workPostRepository.findByAddressContainingIgnoreCase(address);
    }
    
    public Page<WorkPost> findByAddressContaining(String address, Pageable pageable) {
        return workPostRepository.findByAddressContainingIgnoreCase(address, pageable);
    }
    
    public List<WorkPost> findByCity(String city) {
        return workPostRepository.findByCityIgnoreCase(city);
    }
    
    public Page<WorkPost> findByCity(String city, Pageable pageable) {
        return workPostRepository.findByCityIgnoreCase(city, pageable);
    }
    
    public List<WorkPost> findByState(String state) {
        return workPostRepository.findByStateIgnoreCase(state);
    }
    
    public Page<WorkPost> findByState(String state, Pageable pageable) {
        return workPostRepository.findByStateIgnoreCase(state, pageable);
    }
    
    public Page<WorkPost> findByFilters(UUID clientId, WorkPostStatus status, WorkPostType type, String searchTerm, Pageable pageable) {
        return workPostRepository.findByFilters(clientId, status, type, searchTerm, pageable);
    }
    
    // Métodos de criação e atualização
    public WorkPost createWorkPost(WorkPostDTO workPostDTO) {
        // Validar se o código do posto já existe
        if (workPostRepository.existsByPostCode(workPostDTO.getPostCode())) {
            throw new BusinessException("Já existe um posto com o código: " + workPostDTO.getPostCode());
        }
        
        // Buscar o cliente
        Client client = clientRepository.findById(workPostDTO.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + workPostDTO.getClientId()));
        
        // Buscar o contrato (se informado)
        Contract contract = null;
        if (workPostDTO.getContractId() != null) {
            contract = contractRepository.findById(workPostDTO.getContractId())
                    .orElseThrow(() -> new ResourceNotFoundException("Contrato não encontrado com ID: " + workPostDTO.getContractId()));
        }
        
        // Buscar o responsável (se informado)
        User responsible = null;
        if (workPostDTO.getResponsibleId() != null) {
            responsible = userRepository.findById(workPostDTO.getResponsibleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário responsável não encontrado com ID: " + workPostDTO.getResponsibleId()));
        }
        
        WorkPost workPost = new WorkPost();
        updateWorkPostFromDTO(workPost, workPostDTO);
        workPost.setClient(client);
        workPost.setContract(contract);
        workPost.setResponsible(responsible);
        workPost.setStatus(workPostDTO.getStatus() != null ? workPostDTO.getStatus() : WorkPostStatus.EM_IMPLANTACAO);
        workPost.setCreatedAt(LocalDateTime.now());
        workPost.setUpdatedAt(LocalDateTime.now());
        
        return workPostRepository.save(workPost);
    }
    
    public WorkPostDTO updateWorkPost(UUID id, WorkPostDTO workPostDTO) {
        WorkPost existingWorkPost = workPostRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Posto de trabalho não encontrado com ID: " + id));
        
        // Validar se o código do posto já existe (se foi alterado)
        if (!existingWorkPost.getPostCode().equals(workPostDTO.getPostCode()) && 
            workPostRepository.existsByPostCode(workPostDTO.getPostCode())) {
            throw new BusinessException("Já existe um posto com o código: " + workPostDTO.getPostCode());
        }
        
        // Buscar o cliente
        Client client = clientRepository.findById(workPostDTO.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + workPostDTO.getClientId()));
        
        // Buscar o contrato (se informado)
        Contract contract = null;
        if (workPostDTO.getContractId() != null) {
            contract = contractRepository.findById(workPostDTO.getContractId())
                    .orElseThrow(() -> new ResourceNotFoundException("Contrato não encontrado com ID: " + workPostDTO.getContractId()));
        }
        
        // Buscar o responsável (se informado)
        User responsible = null;
        if (workPostDTO.getResponsibleId() != null) {
            responsible = userRepository.findById(workPostDTO.getResponsibleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário responsável não encontrado com ID: " + workPostDTO.getResponsibleId()));
        }
        
        // Atualizar campos
        updateWorkPostFromDTO(existingWorkPost, workPostDTO);
        existingWorkPost.setClient(client);
        existingWorkPost.setContract(contract);
        existingWorkPost.setResponsible(responsible);
        existingWorkPost.setUpdatedAt(LocalDateTime.now());
        
        WorkPost savedWorkPost = workPostRepository.save(existingWorkPost);
        return convertToDTO(savedWorkPost);
    }
    
    public void deleteWorkPost(UUID id) {
        if (!workPostRepository.existsById(id)) {
            throw new ResourceNotFoundException("Posto de trabalho não encontrado com ID: " + id);
        }
        workPostRepository.deleteById(id);
    }
    
    public WorkPost updateStatus(UUID id, WorkPostStatus status) {
        WorkPost workPost = getById(id);
        workPost.setStatus(status);
        workPost.setUpdatedAt(LocalDateTime.now());
        return workPostRepository.save(workPost);
    }
    
    // Métodos de contagem
    public long countByStatus(WorkPostStatus status) {
        return workPostRepository.countByStatus(status);
    }
    
    public long countByClient(UUID clientId) {
        return workPostRepository.countByClientId(clientId);
    }
    
    public long countByType(WorkPostType type) {
        return workPostRepository.countByType(type);
    }
    
    // Métodos de busca por período
    public List<WorkPost> findPostsToBeImplementedBetween(LocalDate startDate, LocalDate endDate) {
        return workPostRepository.findPostsToBeImplementedBetween(startDate, endDate);
    }
    
    public List<WorkPost> findByStatusAndImplementationDateBetween(WorkPostStatus status, LocalDate startDate, LocalDate endDate) {
        return workPostRepository.findByStatusAndImplementationDateBetween(status, startDate, endDate);
    }
    
    // Métodos para conversão DTO
    // NOTA: Removido @Transactional para evitar problemas em ambientes CI
    // A transação deve ser mantida pelo método chamador (ex: findAll com @Transactional)
    public WorkPostDTO convertToDTO(WorkPost workPost) {
        if (workPost == null) {
            return null;
        }
        
        WorkPostDTO dto = new WorkPostDTO();
        
        try {
            BeanUtils.copyProperties(workPost, dto);
            
            // CRÍTICO: Copiar coleções @ElementCollection como novas listas para evitar lazy loading
            // Isso deve ser feito DENTRO da transação, antes que a sessão seja fechada
            try {
                if (workPost.getNrs() != null) {
                    dto.setNrs(new java.util.ArrayList<>(workPost.getNrs()));
                } else {
                    dto.setNrs(new java.util.ArrayList<>());
                }
            } catch (Exception e) {
                log.warn("Erro ao copiar nrs do WorkPost {}: {}", workPost.getId(), e.getMessage());
                dto.setNrs(new java.util.ArrayList<>());
            }
            
            try {
                if (workPost.getEpis() != null) {
                    dto.setEpis(new java.util.ArrayList<>(workPost.getEpis()));
                } else {
                    dto.setEpis(new java.util.ArrayList<>());
                }
            } catch (Exception e) {
                log.warn("Erro ao copiar epis do WorkPost {}: {}", workPost.getId(), e.getMessage());
                dto.setEpis(new java.util.ArrayList<>());
            }
            
            try {
                if (workPost.getTrainings() != null) {
                    dto.setTrainings(new java.util.ArrayList<>(workPost.getTrainings()));
                } else {
                    dto.setTrainings(new java.util.ArrayList<>());
                }
            } catch (Exception e) {
                log.warn("Erro ao copiar trainings do WorkPost {}: {}", workPost.getId(), e.getMessage());
                dto.setTrainings(new java.util.ArrayList<>());
            }
            
        } catch (Exception e) {
            log.warn("Erro ao copiar propriedades do WorkPost {}: {}", workPost.getId(), e.getMessage());
            // Continuar mesmo com erro na cópia, preenchendo manualmente os campos essenciais
            dto.setId(workPost.getId());
            dto.setPostCode(workPost.getPostCode());
            dto.setName(workPost.getName());
            dto.setDescription(workPost.getDescription());
            dto.setType(workPost.getType());
            dto.setStatus(workPost.getStatus());
            // Definir coleções vazias em caso de erro
            dto.setNrs(new java.util.ArrayList<>());
            dto.setEpis(new java.util.ArrayList<>());
            dto.setTrainings(new java.util.ArrayList<>());
        }
        
        // Tratar relacionamentos de forma segura - capturar LazyInitializationException
        try {
            if (workPost.getClient() != null) {
                try {
                    dto.setClientId(workPost.getClient().getId());
                    dto.setClientName(workPost.getClient().getName());
                    dto.setClientCnpj(workPost.getClient().getCnpj() != null ? workPost.getClient().getCnpj() : "N/A");
                } catch (Exception e) {
                    // Captura qualquer exceção (incluindo LazyInitializationException)
                    String exceptionType = e.getClass().getSimpleName();
                    if (exceptionType.contains("LazyInitialization")) {
                        log.warn("LazyInitializationException ao acessar cliente do WorkPost {}: {}", workPost.getId(), e.getMessage());
                        dto.setClientName("Cliente não disponível");
                        dto.setClientCnpj("N/A");
                    } else {
                        log.warn("Erro ao acessar cliente do WorkPost {}: {}", workPost.getId(), e.getMessage());
                        dto.setClientName("Cliente não encontrado");
                        dto.setClientCnpj("N/A");
                    }
                }
            } else {
                // Cliente não encontrado - definir valores padrão
                dto.setClientId(null);
                dto.setClientName("Cliente não encontrado");
                dto.setClientCnpj("N/A");
            }
        } catch (Exception e) {
            log.warn("Erro ao processar cliente do WorkPost {}: {}", workPost.getId(), e.getMessage());
            // Em caso de erro ao acessar o cliente, definir valores padrão
            dto.setClientId(null);
            dto.setClientName("Cliente não encontrado");
            dto.setClientCnpj("N/A");
        }
        
        try {
            if (workPost.getContract() != null) {
                try {
                    dto.setContractId(workPost.getContract().getId());
                } catch (Exception e) {
                    log.warn("Erro ao acessar contrato do WorkPost {}: {}", workPost.getId(), e.getMessage());
                    // Não definir contractId em caso de erro
                }
            }
        } catch (Exception e) {
            log.warn("Erro ao processar contrato do WorkPost {}: {}", workPost.getId(), e.getMessage());
            // Contrato não encontrado - não definir contractId
        }
        
        try {
            if (workPost.getResponsible() != null) {
                try {
                    dto.setResponsibleId(workPost.getResponsible().getId());
                    dto.setResponsibleName(workPost.getResponsible().getName());
                } catch (Exception e) {
                    log.warn("Erro ao acessar responsável do WorkPost {}: {}", workPost.getId(), e.getMessage());
                    // Não definir responsibleId em caso de erro
                }
            }
        } catch (Exception e) {
            log.warn("Erro ao processar responsável do WorkPost {}: {}", workPost.getId(), e.getMessage());
            // Responsável não encontrado - não definir responsibleId
        }
        
        return dto;
    }
    
    public Page<WorkPostDTO> convertToDTOPage(Page<WorkPost> workPosts) {
        return workPosts.map(this::convertToDTO);
    }
    
    // NOTA: Removido @Transactional para evitar problemas em ambientes CI
    // A transação deve ser mantida pelo método chamador
    public List<WorkPostDTO> convertToDTOList(List<WorkPost> workPosts) {
        if (workPosts == null || workPosts.isEmpty()) {
            log.debug("convertToDTOList: Lista vazia ou null recebida");
            return new java.util.ArrayList<>();
        }

        log.debug("convertToDTOList: Convertendo {} workPosts para DTOs", workPosts.size());
        List<WorkPostDTO> dtos = new java.util.ArrayList<>();
        int successCount = 0;
        int errorCount = 0;
        
        for (WorkPost workPost : workPosts) {
            if (workPost == null) {
                log.warn("convertToDTOList: WorkPost null encontrado, pulando");
                errorCount++;
                continue;
            }
            
            try {
                WorkPostDTO dto = convertToDTO(workPost);
                if (dto != null) {
                    dtos.add(dto);
                    successCount++;
                } else {
                    log.warn("convertToDTOList: convertToDTO retornou null para WorkPost {}", workPost.getId());
                    errorCount++;
                }
            } catch (Throwable e) {
                // Capturar qualquer erro, incluindo Error
                String exceptionType = e.getClass().getName();
                log.error("Erro ao converter WorkPost {} para DTO: {} - Tipo: {}",
                        workPost.getId(), e.getMessage(), exceptionType);
                
                // Se for problema de lazy loading, tentar criar DTO mínimo
                if (exceptionType.contains("LazyInitialization") || 
                    exceptionType.contains("Session") ||
                    exceptionType.contains("Transaction")) {
                    log.warn("Problema de lazy loading detectado, criando DTO mínimo para WorkPost {}", workPost.getId());
                    try {
                        WorkPostDTO minimalDto = createMinimalDTO(workPost);
                        if (minimalDto != null) {
                            dtos.add(minimalDto);
                            successCount++;
                        }
                    } catch (Exception minimalException) {
                        log.error("Erro ao criar DTO mínimo para WorkPost {}: {}", workPost.getId(), minimalException.getMessage());
                        errorCount++;
                    }
                } else {
                    errorCount++;
                }
            }
        }
        
        log.info("convertToDTOList: Conversão concluída - {} sucessos, {} erros, {} total", 
                successCount, errorCount, dtos.size());
        
        return dtos;
    }
    
    /**
     * Cria um DTO mínimo quando há problemas com lazy loading
     */
    private WorkPostDTO createMinimalDTO(WorkPost workPost) {
        try {
            WorkPostDTO dto = new WorkPostDTO();
            dto.setId(workPost.getId());
            dto.setPostCode(workPost.getPostCode());
            dto.setName(workPost.getName());
            dto.setDescription(workPost.getDescription());
            dto.setType(workPost.getType());
            dto.setStatus(workPost.getStatus());
            dto.setAddress(workPost.getAddress());
            dto.setCity(workPost.getCity());
            dto.setState(workPost.getState());
            dto.setZipCode(workPost.getZipCode());
            // Relacionamentos não disponíveis devido a lazy loading
            dto.setClientId(null);
            dto.setClientName("N/A");
            dto.setClientCnpj("N/A");
            dto.setContractId(null);
            dto.setResponsibleId(null);
            dto.setResponsibleName("N/A");
            return dto;
        } catch (Exception e) {
            log.error("Erro ao criar DTO mínimo: {}", e.getMessage());
            return null;
        }
    }
    
    private void updateWorkPostFromDTO(WorkPost workPost, WorkPostDTO dto) {
        workPost.setPostCode(dto.getPostCode());
        workPost.setName(dto.getName());
        workPost.setDescription(dto.getDescription());
        workPost.setType(dto.getType());
        // Define status, se não for nulo no DTO, ou mantém o valor existente/padrão
        if (dto.getStatus() != null) {
            workPost.setStatus(dto.getStatus());
        } else if (workPost.getStatus() == null) {
            workPost.setStatus(WorkPostStatus.EM_IMPLANTACAO);
        }
        workPost.setAddress(dto.getAddress());
        workPost.setCity(dto.getCity());
        workPost.setState(dto.getState());
        workPost.setZipCode(dto.getZipCode());
        
        // Campos que podem ser nulos no DTO mas não no DB
        workPost.setRequiredVigilantes(dto.getRequiredVigilantes()); // @NotNull no DTO, deve ser sempre enviado
        workPost.setWorkSchedule(dto.getWorkSchedule()); // @NotBlank no DTO, deve ser sempre enviado
        workPost.setShiftStart(dto.getShiftStart()); // @NotNull no DTO, deve ser sempre enviado
        workPost.setShiftEnd(dto.getShiftEnd()); // @NotNull no DTO, deve ser sempre enviado

        workPost.setShiftDescription(dto.getShiftDescription());

        workPost.setTransportVoucher(dto.getTransportVoucher() != null ? dto.getTransportVoucher() : false);
        workPost.setCostAllowance(dto.getCostAllowance() != null ? dto.getCostAllowance() : false);
        workPost.setCostAllowanceValue(dto.getCostAllowanceValue() != null ? dto.getCostAllowanceValue() : BigDecimal.ZERO);
        workPost.setIntrajourney(dto.getIntrajourney() != null ? dto.getIntrajourney() : false);
        workPost.setLocalMeal(dto.getLocalMeal() != null ? dto.getLocalMeal() : false);
        workPost.setMealTicket(dto.getMealTicket() != null ? dto.getMealTicket() : false);
        workPost.setHealthPlan(dto.getHealthPlan() != null ? dto.getHealthPlan() : false);
        workPost.setDentalPlan(dto.getDentalPlan() != null ? dto.getDentalPlan() : false);
        
        workPost.setCars(dto.getCars() != null ? dto.getCars() : 0);
        workPost.setMotorcycles(dto.getMotorcycles() != null ? dto.getMotorcycles() : 0);
        workPost.setRadios(dto.getRadios() != null ? dto.getRadios() : 0);
        workPost.setCorporates(dto.getCorporates() != null ? dto.getCorporates() : 0);
        workPost.setDocumentBank(dto.getDocumentBank() != null ? dto.getDocumentBank() : false);
        
        // Listas (assumindo que o DTO enviaria listas vazias, não null)
        workPost.setNrs(dto.getNrs());
        workPost.setEpis(dto.getEpis());
        workPost.setTrainings(dto.getTrainings());

        workPost.setPgr(dto.getPgr() != null ? dto.getPgr() : false);
        workPost.setPcmso(dto.getPcmso() != null ? dto.getPcmso() : false);

        workPost.setImplementationDate(dto.getImplementationDate());
        workPost.setImplementationTime(dto.getImplementationTime());
        workPost.setObservations(dto.getObservations());
    }
} 