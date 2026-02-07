package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ContractDTO;
import com.z7design.secured_guard.dto.CreateMessageRequest;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Contract;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.model.Proposal;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.UserGroupEntity;
import com.z7design.secured_guard.dto.TerminateContractRequest;
import com.z7design.secured_guard.model.enums.ContractOrigin;
import com.z7design.secured_guard.model.enums.ContractStatus;
import com.z7design.secured_guard.model.enums.ContractType;
import com.z7design.secured_guard.model.enums.TerminationReason;
import com.z7design.secured_guard.model.enums.MessageType;
import com.z7design.secured_guard.model.enums.MessagePriority;
import com.z7design.secured_guard.model.enums.UserGroup;
import com.z7design.secured_guard.repository.ContractRepository;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import com.z7design.secured_guard.repository.UserGroupRepository;
import com.z7design.secured_guard.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.z7design.secured_guard.dto.MessageRequestDTO;
import java.util.Set;
import com.z7design.secured_guard.repository.ProposalRepository;
import com.z7design.secured_guard.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
@RequiredArgsConstructor
@Transactional
public class ContractService {
    
    private static final Logger log = LoggerFactory.getLogger(ContractService.class);

    private final ContractRepository contractRepository;
    private final ClientRepository clientRepository;
    private final WorkPostRepository workPostRepository;
    private final ProposalRepository proposalRepository;
    private final MessageService messageService;
    private final UserGroupRepository userGroupRepository;
    private final UserRepository userRepository;
    
    @Transactional(readOnly = true)
    public List<Contract> findAll() {
        return findAllForCurrentUser();
    }

    @Transactional(readOnly = true)
    public List<Contract> findAllForCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            User currentUser = (User) auth.getPrincipal();
            boolean isComercial = currentUser.getRoles().stream()
                    .anyMatch(r -> r.getName() != null && 
                            (r.getName().equals("COMERCIAL") || r.getName().equals("ROLE_COMERCIAL")));
            if (isComercial) {
                List<Contract> contracts = contractRepository.findByResponsibleCommercialId(currentUser.getId());
                initializeClientForContracts(contracts);
                return contracts;
            }
        }
        List<Contract> contracts = contractRepository.findAll();
        initializeClientForContracts(contracts);
        return contracts;
    }

    private void initializeClientForContracts(List<Contract> contracts) {
        for (Contract contract : contracts) {
            if (contract.getClient() != null) {
                try {
                    contract.getClient().getName(); // Força inicialização
                } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                    contract.setClient(null);
                }
            }
        }
    }
    
    @Transactional(readOnly = true)
    public Page<Contract> findAll(Pageable pageable) {
        Page<Contract> contracts = contractRepository.findAll(pageable);
        // Inicializar relacionamentos lazy dentro da transação
        for (Contract contract : contracts.getContent()) {
            if (contract.getClient() != null) {
                try {
                    contract.getClient().getName(); // Força inicialização
                } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                    // Client foi deletado ou não pode ser inicializado
                    contract.setClient(null);
                }
            }
        }
        return contracts;
    }
    
    public Optional<Contract> findById(UUID id) {
        return contractRepository.findById(id);
    }
    
    public Contract getById(UUID id) {
        return contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato não encontrado com ID: " + id));
    }
    
    public List<Contract> findByStatus(ContractStatus status) {
        return contractRepository.findByStatus(status);
    }
    
    public Page<Contract> findByStatus(ContractStatus status, Pageable pageable) {
        return contractRepository.findByStatus(status, pageable);
    }
    
    public List<Contract> findByClient(UUID clientId) {
        return contractRepository.findByClientId(clientId);
    }
    
    public Page<Contract> findByClient(UUID clientId, Pageable pageable) {
        return contractRepository.findByClientId(clientId, pageable);
    }
    
    public Optional<Contract> findByContractNumber(String contractNumber) {
        return contractRepository.findByContractNumber(contractNumber);
    }
    
    public List<Contract> findByStartDateBetween(LocalDate startDate, LocalDate endDate) {
        return contractRepository.findByStartDateBetween(startDate, endDate);
    }
    
    public List<Contract> findByEndDateBetween(LocalDate startDate, LocalDate endDate) {
        return contractRepository.findByEndDateBetween(startDate, endDate);
    }
    
    public List<Contract> findActiveContracts() {
        return contractRepository.findByStatusAndEndDateAfter(ContractStatus.ACTIVE, LocalDate.now());
    }
    
    public List<Contract> findExpiredContracts() {
        return contractRepository.findByStatusAndEndDateBefore(ContractStatus.ACTIVE, LocalDate.now());
    }
    
    public List<Contract> findContractsExpiringBetween(LocalDate startDate, LocalDate endDate) {
        return contractRepository.findContractsExpiringBetween(startDate, endDate);
    }
    
    public Page<Contract> findByFilters(UUID clientId, ContractStatus status, String searchTerm, Pageable pageable) {
        UUID responsibleCommercialId = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            User currentUser = (User) auth.getPrincipal();
            boolean isComercial = currentUser.getRoles().stream()
                    .anyMatch(r -> r.getName() != null && 
                            (r.getName().equals("COMERCIAL") || r.getName().equals("ROLE_COMERCIAL")));
            if (isComercial) {
                responsibleCommercialId = currentUser.getId();
            }
        }
        return contractRepository.findByFilters(clientId, status, responsibleCommercialId, searchTerm, pageable);
    }
    
    public Contract createContract(ContractDTO contractDTO) {
        // Validar se o número do contrato já existe
        if (contractRepository.findByContractNumber(contractDTO.getContractNumber()).isPresent()) {
            throw new BusinessException("Já existe um contrato com o número: " + contractDTO.getContractNumber());
        }
        // Regra: Contrato ACTIVE requer ao menos um posto. Em criação, use DRAFT ou PENDING e ative após vincular postos.
        ContractStatus status = contractDTO.getStatus();
        if (status == ContractStatus.ACTIVE) {
            throw new BusinessException("Para criar um contrato ativo, crie primeiro como 'Em elaboração' ou 'Pendente', vincule postos de serviço e depois ative o contrato.");
        }
        if (status == null) {
            contractDTO.setStatus(ContractStatus.DRAFT);
        }

        // Buscar o cliente
        Client client = clientRepository.findById(contractDTO.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + contractDTO.getClientId()));
        
        Contract contract = new Contract();
        updateContractFromDTO(contract, contractDTO);
        contract.setClient(client);
        resolveAndSetRelatedEntities(contract, contractDTO);
        Contract savedContract = contractRepository.save(contract);
        
        // Enviar notificação para os departamentos
        notifyDepartmentsNewContract(savedContract);
        
        return savedContract;
    }
    
    public ContractDTO updateContract(UUID id, ContractDTO contractDTO) {
        Contract existingContract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contrato não encontrado com ID: " + id));

        // Regra: Contratos CANCELLED ou EXPIRED - apenas notas podem ser editadas
        if (existingContract.getStatus() == ContractStatus.CANCELLED || existingContract.getStatus() == ContractStatus.EXPIRED) {
            existingContract.setNotes(contractDTO.getNotes());
            existingContract.setUpdatedAt(LocalDateTime.now());
            return convertToDTO(contractRepository.save(existingContract));
        }

        // Validar se o cliente existe
        Client client = clientRepository.findById(contractDTO.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com ID: " + contractDTO.getClientId()));

        // Regra: Nenhum contrato ACTIVE sem ao menos um posto válido
        if (contractDTO.getStatus() == ContractStatus.ACTIVE) {
            long postCount = workPostRepository.countByContractId(id);
            if (postCount == 0) {
                throw new BusinessException("Para ativar um contrato, é necessário vincular ao menos um posto de serviço. Adicione postos ao contrato antes de ativá-lo.");
            }
        }

        updateContractFromDTO(existingContract, contractDTO);
        existingContract.setClient(client);
        existingContract.setUpdatedAt(LocalDateTime.now());
        resolveAndSetRelatedEntities(existingContract, contractDTO);

        Contract savedContract = contractRepository.save(existingContract);
        return convertToDTO(savedContract);
    }
    
    public void deleteContract(UUID id) {
        if (!contractRepository.existsById(id)) {
            throw new ResourceNotFoundException("Contrato não encontrado com ID: " + id);
        }
        contractRepository.deleteById(id);
    }
    
    public Contract updateStatus(UUID id, ContractStatus status) {
        Contract contract = getById(id);
        contract.setStatus(status);
        return contractRepository.save(contract);
    }
    
    public long countByStatus(ContractStatus status) {
        return contractRepository.countByStatus(status);
    }
    
    public long countByClient(UUID clientId) {
        return contractRepository.countByClientId(clientId);
    }

    /**
     * Cria um contrato a partir de uma proposta aprovada.
     * Copia cliente, valor, responsável comercial e define origem como PROPOSAL.
     */
    public Contract createFromProposal(UUID proposalId) {
        Proposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("Proposta não encontrada com ID: " + proposalId));
        if (proposal.getStatus() != com.z7design.secured_guard.model.enums.ProposalStatus.APPROVED
                && proposal.getStatus() != com.z7design.secured_guard.model.enums.ProposalStatus.CONVERTED) {
            throw new BusinessException("Apenas propostas aprovadas ou convertidas podem gerar contrato.");
        }
        if (proposal.getContract() != null) {
            throw new BusinessException("Esta proposta já possui um contrato associado.");
        }
        Client client = proposal.getClient();
        if (client == null) {
            throw new BusinessException("Proposta sem cliente associado.");
        }
        String contractNumber = "CON-" + (proposal.getProposalNumber() != null ? proposal.getProposalNumber() : proposalId.toString().substring(0, 8)) + "-" + java.time.LocalDate.now().getYear();
        if (contractRepository.findByContractNumber(contractNumber).isPresent()) {
            contractNumber = contractNumber + "-" + System.currentTimeMillis() % 10000;
        }
        Contract contract = new Contract();
        contract.setContractNumber(contractNumber);
        contract.setDescription("Contrato gerado da proposta: " + proposal.getTitle());
        contract.setStartDate(java.time.LocalDate.now());
        contract.setEndDate(contract.getStartDate().plusYears(1));
        contract.setValue(proposal.getTotalValue());
        contract.setStatus(ContractStatus.DRAFT);
        contract.setClient(client);
        contract.setContractOrigin(ContractOrigin.PROPOSAL);
        contract.setContractType(ContractType.VIGILANCIA_PATRIMONIAL);
        contract.setProposal(proposal);
        contract.setResponsibleCommercial(proposal.getAssignedTo());
        contract.setMonthlyValue(proposal.getTotalValue());
        contract.setAnnualValue(proposal.getTotalValue() != null ? proposal.getTotalValue().multiply(java.math.BigDecimal.valueOf(12)) : null);
        Contract saved = contractRepository.save(contract);
        proposal.setContract(saved);
        proposalRepository.save(proposal);
        notifyDepartmentsNewContract(saved);
        return saved;
    }

    /**
     * Renova um contrato: cria novo contrato com datas prolongadas (1 ano).
     * Opcional: aplicar reajuste no valor.
     */
    @Transactional
    public Contract renewContract(UUID contractId, java.math.BigDecimal newValueIfAdjustment) {
        Contract existing = getById(contractId);
        if (existing.getStatus() == ContractStatus.CANCELLED || existing.getStatus() == ContractStatus.EXPIRED) {
            throw new BusinessException("Não é possível renovar contrato cancelado ou expirado.");
        }

        LocalDate newStartDate = existing.getEndDate() != null && existing.getEndDate().isAfter(LocalDate.now())
                ? existing.getEndDate().plusDays(1)
                : LocalDate.now();
        LocalDate newEndDate = newStartDate.plusYears(1);

        java.math.BigDecimal valueToUse = newValueIfAdjustment != null && newValueIfAdjustment.compareTo(java.math.BigDecimal.ZERO) > 0
                ? newValueIfAdjustment
                : existing.getValue();

        String newNumber = "CON-" + existing.getContractNumber() + "-REN-" + LocalDate.now().getYear();
        if (contractRepository.findByContractNumber(newNumber).isPresent()) {
            newNumber = newNumber + "-" + System.currentTimeMillis() % 10000;
        }

        Contract renewed = new Contract();
        renewed.setContractNumber(newNumber);
        renewed.setDescription("Renovação: " + existing.getDescription());
        renewed.setStartDate(newStartDate);
        renewed.setEndDate(newEndDate);
        renewed.setValue(valueToUse);
        renewed.setStatus(ContractStatus.DRAFT);
        renewed.setClient(existing.getClient());
        renewed.setContractOrigin(ContractOrigin.RENEWAL);
        renewed.setContractType(existing.getContractType());
        renewed.setResponsibleCommercial(existing.getResponsibleCommercial());
        renewed.setResponsibleManager(existing.getResponsibleManager());
        renewed.setAdjustmentType(existing.getAdjustmentType());
        renewed.setMonthlyValue(valueToUse);
        renewed.setAnnualValue(valueToUse.multiply(java.math.BigDecimal.valueOf(12)));

        Contract saved = contractRepository.save(renewed);
        notifyDepartmentsNewContract(saved);
        return saved;
    }

    @Transactional
    public Contract terminateContract(UUID contractId, TerminateContractRequest request) {
        Contract contract = getById(contractId);
        contract.setStatus(ContractStatus.CANCELLED);
        contract.setTerminationReason(request.getTerminationReason());
        contract.setTerminationDate(request.getTerminationDate());
        String checklist = String.format("{\"avisoPrevio\":%s,\"desmobilizacaoEquipe\":%s,\"encerramentoFinanceiro\":%s}",
                request.isAvisoPrevio(), request.isDesmobilizacaoEquipe(), request.isEncerramentoFinanceiro());
        contract.setTerminationChecklist(checklist);
        if (request.getNotes() != null) {
            contract.setNotes((contract.getNotes() != null ? contract.getNotes() + "\n" : "") + request.getNotes());
        }
        return contractRepository.save(contract);
    }

    // Métodos para conversão DTO
    @Transactional(readOnly = true)
    public ContractDTO convertToDTO(Contract contract) {
        ContractDTO dto = new ContractDTO();
        dto.setId(contract.getId());
        dto.setContractNumber(contract.getContractNumber());
        dto.setDescription(contract.getDescription());
        dto.setStartDate(contract.getStartDate());
        dto.setEndDate(contract.getEndDate());
        dto.setValue(contract.getValue());
        dto.setStatus(contract.getStatus());
        dto.setNotes(contract.getNotes());
        dto.setCreatedAt(contract.getCreatedAt());
        dto.setUpdatedAt(contract.getUpdatedAt());
        dto.setContractOrigin(contract.getContractOrigin());
        dto.setContractType(contract.getContractType());
        dto.setMonthlyValue(contract.getMonthlyValue());
        dto.setAnnualValue(contract.getAnnualValue());
        dto.setAdjustmentType(contract.getAdjustmentType());
        dto.setNextAdjustmentDate(contract.getNextAdjustmentDate());
        dto.setAutoRenewal(contract.getAutoRenewal());
        dto.setReplacementTimeHours(contract.getReplacementTimeHours());
        dto.setMaxAbsenceMinutes(contract.getMaxAbsenceMinutes());
        dto.setPatrolFrequency(contract.getPatrolFrequency());
        dto.setReportsRequired(contract.getReportsRequired());
        dto.setObligationsContractor(contract.getObligationsContractor());
        dto.setObligationsContracted(contract.getObligationsContracted());
        dto.setPenalties(contract.getPenalties());
        dto.setTerminationReason(contract.getTerminationReason());
        dto.setTerminationDate(contract.getTerminationDate());
        dto.setTerminationChecklist(contract.getTerminationChecklist());

        if (contract.getClient() != null) {
            try {
                contract.getClient().getName();
                dto.setClientId(contract.getClient().getId());
                dto.setClientName(contract.getClient().getName());
                dto.setClientCnpj(contract.getClient().getCnpj());
            } catch (org.hibernate.LazyInitializationException e) {
                dto.setClientId(contract.getClient().getId());
                log.warn("Não foi possível inicializar o Client para o contrato {}", contract.getId());
            }
        }
        if (contract.getResponsibleCommercial() != null) {
            try {
                contract.getResponsibleCommercial().getName();
                dto.setResponsibleCommercialId(contract.getResponsibleCommercial().getId());
                dto.setResponsibleCommercialName(contract.getResponsibleCommercial().getName());
            } catch (Exception e) {
                dto.setResponsibleCommercialId(contract.getResponsibleCommercial().getId());
            }
        }
        if (contract.getResponsibleManager() != null) {
            try {
                contract.getResponsibleManager().getName();
                dto.setResponsibleManagerId(contract.getResponsibleManager().getId());
                dto.setResponsibleManagerName(contract.getResponsibleManager().getName());
            } catch (Exception e) {
                dto.setResponsibleManagerId(contract.getResponsibleManager().getId());
            }
        }
        if (contract.getProposal() != null) {
            dto.setProposalId(contract.getProposal().getId());
        }
        return dto;
    }
    
    public Page<ContractDTO> convertToDTOPage(Page<Contract> contracts) {
        return contracts.map(this::convertToDTO);
    }
    
    public List<ContractDTO> convertToDTOList(List<Contract> contracts) {
        return contracts.stream()
                .map(this::convertToDTO)
                .toList();
    }
    
    private void updateContractFromDTO(Contract contract, ContractDTO dto) {
        contract.setContractNumber(dto.getContractNumber());
        contract.setDescription(dto.getDescription());
        contract.setStartDate(dto.getStartDate());
        contract.setEndDate(dto.getEndDate());
        contract.setValue(dto.getValue());
        contract.setStatus(dto.getStatus() != null ? dto.getStatus() : ContractStatus.ACTIVE);
        contract.setNotes(dto.getNotes());
        contract.setContractOrigin(dto.getContractOrigin());
        contract.setContractType(dto.getContractType());
        contract.setMonthlyValue(dto.getMonthlyValue());
        contract.setAnnualValue(dto.getAnnualValue());
        contract.setAdjustmentType(dto.getAdjustmentType());
        contract.setNextAdjustmentDate(dto.getNextAdjustmentDate());
        contract.setAutoRenewal(dto.getAutoRenewal() != null ? dto.getAutoRenewal() : false);
        contract.setReplacementTimeHours(dto.getReplacementTimeHours());
        contract.setMaxAbsenceMinutes(dto.getMaxAbsenceMinutes());
        contract.setPatrolFrequency(dto.getPatrolFrequency());
        contract.setReportsRequired(dto.getReportsRequired());
        contract.setObligationsContractor(dto.getObligationsContractor());
        contract.setObligationsContracted(dto.getObligationsContracted());
        contract.setPenalties(dto.getPenalties());
    }

    private void resolveAndSetRelatedEntities(Contract contract, ContractDTO dto) {
        if (dto.getResponsibleCommercialId() != null) {
            User user = userRepository.findById(dto.getResponsibleCommercialId())
                    .orElse(null);
            contract.setResponsibleCommercial(user);
        } else {
            contract.setResponsibleCommercial(null);
        }
        if (dto.getResponsibleManagerId() != null) {
            User user = userRepository.findById(dto.getResponsibleManagerId())
                    .orElse(null);
            contract.setResponsibleManager(user);
        } else {
            contract.setResponsibleManager(null);
        }
        if (dto.getProposalId() != null) {
            proposalRepository.findById(dto.getProposalId()).ifPresent(contract::setProposal);
        } else {
            contract.setProposal(null);
        }
    }
    
    private void notifyDepartmentsNewContract(Contract contract) {
        // Grupos a serem notificados
        UserGroup[] groups = new UserGroup[] {
            UserGroup.GRUPO_FINANCEIRO,
            UserGroup.GRUPO_RH,
            UserGroup.GRUPO_DPE,
            UserGroup.GRUPO_SUPERVISOR
        };

        // Obter usuário autenticado
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User sender = null;
        
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            sender = (User) authentication.getPrincipal();
        }
        
        // Se não conseguir obter o usuário autenticado, buscar um usuário padrão
        if (sender == null) {
            try {
                // Buscar um usuário admin ou o primeiro usuário ativo
                User defaultSender = userRepository.findByActiveTrue().stream()
                    .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName().contains("ADMIN") || role.getName().contains("SUPER_ADMIN")))
                    .findFirst()
                    .orElse(userRepository.findByActiveTrue().stream().findFirst().orElse(null));
                    
                if (defaultSender == null) {
                    log.warn("Não foi possível encontrar um usuário válido para enviar notificações");
                    return; // Não enviar notificações se não houver usuário válido
                }
                sender = defaultSender;
            } catch (Exception e) {
                log.error("Erro ao buscar usuário padrão para notificações", e);
                return; // Não enviar notificações se houver erro
            }
        }

        // Criar uma variável final para usar no lambda
        final User finalSender = sender;

        final String title = "Novo Contrato Criado: " + contract.getContractNumber();
        final String content = String.format(
            "Um novo contrato foi criado para o cliente %s (CNPJ: %s).\n" +
            "Descrição: %s\nValor: R$ %.2f\nInício: %s\nTérmino: %s\n\nProvidencie os recursos necessários para a execução dos serviços.",
            contract.getClient().getName(),
            contract.getClient().getCnpj(),
            contract.getDescription(),
            contract.getValue(),
            contract.getStartDate(),
            contract.getEndDate() != null ? contract.getEndDate().toString() : "-"
        );

        for (UserGroup groupEnum : groups) {
            userGroupRepository.findByGroupName(groupEnum)
                .ifPresent(groupEntity -> sendContractNotificationMessage(title, content, groupEntity.getId(), finalSender));
        }
    }

    private void sendContractNotificationMessage(String title, String content, UUID groupId, User sender) {
        MessageRequestDTO req = new MessageRequestDTO();
        req.setTitle(title);
        req.setContent(content);
        req.setType(MessageType.GROUP);
        req.setPriority(MessagePriority.HIGH);
        req.setSendNotification(true);
        req.setSendEmail(false);
        req.setGroupIds(Set.of(groupId));
        
        // Converter CreateMessageRequest para MessageRequestDTO
        messageService.createMessage(req, sender);
    }
} 