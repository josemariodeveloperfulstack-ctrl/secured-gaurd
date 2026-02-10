package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ProposalDTO;
import com.z7design.secured_guard.dto.ProposalItemDTO;
import com.z7design.secured_guard.model.Proposal;
import com.z7design.secured_guard.model.ProposalItem;
import com.z7design.secured_guard.model.enums.ProposalStatus;
import com.z7design.secured_guard.repository.ProposalRepository;
import com.z7design.secured_guard.repository.ProposalItemRepository;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.repository.LeadRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ProposalService {

    @Autowired
    private ProposalRepository proposalRepository;

    @Autowired
    private ProposalItemRepository proposalItemRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private LeadRepository leadRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public long count() {
        return proposalRepository.count();
    }

    public List<ProposalDTO> findAll() {
        List<Proposal> proposals = proposalRepository.findAll();
        return proposals.stream()
                .map(this::mapToDTO)
                .toList();
    }

    public Page<ProposalDTO> findAll(Pageable pageable) {
        Page<Proposal> proposals = proposalRepository.findAll(pageable);
        return proposals.map(this::mapToDTO);
    }

    public ProposalDTO mapToDTO(Proposal proposal) {
        if (proposal == null) {
            return null;
        }

        ProposalDTO dto = new ProposalDTO();
        dto.setId(proposal.getId());
        dto.setTitle(proposal.getTitle());
        dto.setProposalNumber(proposal.getProposalNumber());

        if (proposal.getClient() != null) {
            try {
                dto.setClientId(proposal.getClient().getId());
                dto.setClientName(proposal.getClient().getName());
            } catch (Exception e) {
                // Client deletado ou erro de proxy
            }
        }

        if (proposal.getLead() != null) {
            try {
                dto.setLeadId(proposal.getLead().getId());
                dto.setLeadName(proposal.getLead().getName());
            } catch (Exception e) {
                // Lead deletado ou erro de proxy
            }
        }

        dto.setStatus(proposal.getStatus());
        dto.setTotalValue(proposal.getTotalValue());
        dto.setValidUntil(proposal.getValidUntil());
        dto.setDescription(proposal.getDescription());
        dto.setTermsConditions(proposal.getTermsConditions());
        dto.setNotes(proposal.getNotes());

        if (proposal.getCreatedBy() != null) {
            try {
                dto.setCreatedById(proposal.getCreatedBy().getId());
                dto.setCreatedByName(proposal.getCreatedBy().getName());
            } catch (Exception e) {
                // User deletado ou erro de proxy
            }
        }

        if (proposal.getAssignedTo() != null) {
            try {
                dto.setAssignedToId(proposal.getAssignedTo().getId());
                dto.setAssignedToName(proposal.getAssignedTo().getName());
            } catch (Exception e) {
                // User deletado ou erro de proxy
            }
        }

        if (proposal.getItems() != null) {
            dto.setItems(proposal.getItems().stream()
                    .map(item -> {
                        ProposalItemDTO itemDto = new ProposalItemDTO();
                        itemDto.setId(item.getId());
                        itemDto.setDescription(item.getDescription());
                        itemDto.setQuantity(item.getQuantity());
                        itemDto.setUnitPrice(item.getUnitPrice());
                        itemDto.setTotalPrice(item.getTotalPrice());
                        itemDto.setNotes(item.getNotes());
                        return itemDto;
                    })
                    .toList());
        }

        dto.setCreatedAt(proposal.getCreatedAt());
        dto.setUpdatedAt(proposal.getUpdatedAt());

        return dto;
    }

    public Proposal findById(UUID id) {
        return proposalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proposta não encontrada com ID: " + id));
    }

    /** Busca proposta por ID e retorna DTO com todos os campos (itens, cliente, lead, etc.) em uma única transação. */
    @Transactional(readOnly = true)
    public ProposalDTO getProposalDTOById(UUID id) {
        Proposal proposal = proposalRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResourceNotFoundException("Proposta não encontrada com ID: " + id));
        return mapToDTO(proposal);
    }

    public Proposal create(ProposalDTO proposalDTO, UUID createdById) {
        Proposal proposal = new Proposal();
        proposal.setTitle(proposalDTO.getTitle());
        proposal.setProposalNumber(generateProposalNumber());
        proposal.setStatus(ProposalStatus.DRAFT);
        proposal.setTotalValue(proposalDTO.getTotalValue());
        proposal.setValidUntil(proposalDTO.getValidUntil());
        proposal.setDescription(proposalDTO.getDescription());
        proposal.setCreatedBy(userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado")));

        if (proposalDTO.getClientId() != null) {
            proposal.setClient(clientRepository.findById(proposalDTO.getClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado")));
        }

        if (proposalDTO.getLeadId() != null) {
            proposal.setLead(leadRepository.findById(proposalDTO.getLeadId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado")));
        }

        if (proposalDTO.getAssignedToId() != null) {
            proposal.setAssignedTo(userRepository.findById(UUID.fromString(proposalDTO.getAssignedToId().toString()))
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário responsável não encontrado")));
        }

        proposal = proposalRepository.save(proposal);

        // Salvar itens da proposta
        if (proposalDTO.getItems() != null) {
            for (ProposalItemDTO itemDTO : proposalDTO.getItems()) {
                ProposalItem item = new ProposalItem();
                item.setProposal(proposal);
                item.setDescription(itemDTO.getDescription());
                item.setQuantity(itemDTO.getQuantity());
                item.setUnitPrice(itemDTO.getUnitPrice());
                item.setTotalPrice(BigDecimal.valueOf(itemDTO.getQuantity()).multiply(itemDTO.getUnitPrice()));
                if (itemDTO.getNotes() != null) {
                    item.setNotes(itemDTO.getNotes());
                }
                proposalItemRepository.save(item);
            }
        }

        return proposal;
    }

    public Proposal update(UUID id, ProposalDTO proposalDTO) {
        Proposal proposal = findById(id);
        proposal.setTitle(proposalDTO.getTitle());
        proposal.setTotalValue(proposalDTO.getTotalValue());
        proposal.setValidUntil(proposalDTO.getValidUntil());
        proposal.setDescription(proposalDTO.getDescription());
        proposal.setTermsConditions(proposalDTO.getTermsConditions());
        proposal.setNotes(proposalDTO.getNotes());
        if (proposalDTO.getStatus() != null) {
            proposal.setStatus(proposalDTO.getStatus());
        }

        if (proposalDTO.getClientId() != null) {
            proposal.setClient(clientRepository.findById(proposalDTO.getClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado")));
        } else {
            proposal.setClient(null);
        }

        if (proposalDTO.getLeadId() != null) {
            proposal.setLead(leadRepository.findById(proposalDTO.getLeadId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado")));
        } else {
            proposal.setLead(null);
        }

        if (proposalDTO.getAssignedToId() != null) {
            proposal.setAssignedTo(userRepository.findById(UUID.fromString(proposalDTO.getAssignedToId().toString()))
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário responsável não encontrado")));
        } else {
            proposal.setAssignedTo(null);
        }

        return proposalRepository.save(proposal);
    }

    public Proposal updateStatus(UUID id, String status) {
        Proposal proposal = findById(id);
        proposal.setStatus(ProposalStatus.valueOf(status));
        return proposalRepository.save(proposal);
    }

    public void delete(UUID id) {
        Proposal proposal = findById(id);
        proposalRepository.delete(proposal);
    }

    public List<Proposal> findByStatus(ProposalStatus status) {
        return proposalRepository.findByStatus(status);
    }

    public List<Proposal> findByClient(UUID clientId) {
        return proposalRepository.findByClientId(clientId);
    }

    public List<Proposal> findByLead(UUID leadId) {
        return proposalRepository.findByLeadId(leadId);
    }

    public List<Proposal> findByAssignedTo(UUID userId) {
        return proposalRepository.findByAssignedToId(userId);
    }

    public List<Proposal> findByCreatedBy(UUID userId) {
        return proposalRepository.findByCreatedById(userId);
    }

    public List<Proposal> findExpiredProposals() {
        return proposalRepository.findByValidUntilBefore(LocalDate.now());
    }

    public List<Proposal> findProposalsExpiringSoon(int days) {
        LocalDate expiryDate = LocalDate.now().plusDays(days);
        return proposalRepository.findByValidUntilBefore(expiryDate);
    }

    public long countByStatus(ProposalStatus status) {
        return proposalRepository.countByStatus(status);
    }

    public BigDecimal getTotalValueByStatus(ProposalStatus status) {
        BigDecimal value = proposalRepository.getTotalValueByStatus(status);
        return value != null ? value : BigDecimal.ZERO;
    }

    public List<Proposal> searchProposals(String searchTerm) {
        return proposalRepository.searchProposals(searchTerm);
    }

    private String generateProposalNumber() {
        String prefix = "PROP-" + LocalDateTime.now().getYear() + "-";
        long count = proposalRepository.countByYear(LocalDateTime.now().getYear());
        return prefix + String.format("%03d", count + 1);
    }
}