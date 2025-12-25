package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.QuoteDTO;
import com.z7design.secured_guard.dto.QuoteItemDTO;
import com.z7design.secured_guard.model.Quote;
import com.z7design.secured_guard.model.QuoteItem;
import com.z7design.secured_guard.model.enums.QuoteStatus;
import com.z7design.secured_guard.repository.QuoteRepository;
import com.z7design.secured_guard.repository.QuoteItemRepository;
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
public class QuoteService {

    @Autowired
    private QuoteRepository quoteRepository;

    @Autowired
    private QuoteItemRepository quoteItemRepository;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private LeadRepository leadRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<Quote> findAll() {
        List<Quote> quotes = quoteRepository.findAll();
        // Inicializar relacionamentos lazy dentro da transação
        for (Quote quote : quotes) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }

    @Transactional(readOnly = true)
    public Page<Quote> findAll(Pageable pageable) {
        Page<Quote> quotes = quoteRepository.findAll(pageable);
        // Inicializar relacionamentos lazy dentro da transação
        for (Quote quote : quotes.getContent()) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }
    
    /**
     * Inicializa relacionamentos lazy de um Quote, tratando casos onde entidades foram deletadas
     */
    private void initializeQuoteRelationships(Quote quote) {
        // Inicializar Client
        if (quote.getClient() != null) {
            try {
                quote.getClient().getName(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                // Client foi deletado ou não pode ser inicializado, definir como null
                quote.setClient(null);
            }
        }
        
        // Inicializar Lead
        if (quote.getLead() != null) {
            try {
                quote.getLead().getName(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                // Lead foi deletado ou não pode ser inicializado, definir como null
                quote.setLead(null);
            }
        }
        
        // Inicializar CreatedBy
        if (quote.getCreatedBy() != null) {
            try {
                quote.getCreatedBy().getName(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                // User foi deletado ou não pode ser inicializado, definir como null
                quote.setCreatedBy(null);
            }
        }
        
        // Inicializar AssignedTo
        if (quote.getAssignedTo() != null) {
            try {
                quote.getAssignedTo().getName(); // Força inicialização
            } catch (org.hibernate.LazyInitializationException | jakarta.persistence.EntityNotFoundException e) {
                // User foi deletado ou não pode ser inicializado, definir como null
                quote.setAssignedTo(null);
            }
        }
    }

    @Transactional(readOnly = true)
    public Quote findById(UUID id) {
        Quote quote = quoteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Orçamento não encontrado com ID: " + id));
        initializeQuoteRelationships(quote);
        return quote;
    }

    public Quote create(QuoteDTO quoteDTO, UUID createdById) {
        Quote quote = new Quote();
        quote.setTitle(quoteDTO.getTitle());
        quote.setQuoteNumber(generateQuoteNumber());
        quote.setStatus(QuoteStatus.DRAFT);
        quote.setTotalValue(quoteDTO.getTotalValue());
        quote.setValidUntil(quoteDTO.getValidUntil());
        quote.setDescription(quoteDTO.getDescription());
        quote.setCreatedBy(userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado")));
        
        if (quoteDTO.getClientId() != null) {
            quote.setClient(clientRepository.findById(quoteDTO.getClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado")));
        }
        
        if (quoteDTO.getLeadId() != null) {
            quote.setLead(leadRepository.findById(quoteDTO.getLeadId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado")));
        }
        
        if (quoteDTO.getAssignedToId() != null) {
            quote.setAssignedTo(userRepository.findById(UUID.fromString(quoteDTO.getAssignedToId().toString()))
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário responsável não encontrado")));
        }

        quote = quoteRepository.save(quote);

        // Salvar itens do orçamento
        if (quoteDTO.getItems() != null) {
            for (QuoteItemDTO itemDTO : quoteDTO.getItems()) {
                QuoteItem item = new QuoteItem();
                item.setQuote(quote);
                item.setDescription(itemDTO.getDescription());
                item.setQuantity(itemDTO.getQuantity());
                item.setUnitPrice(itemDTO.getUnitPrice());
                item.setTotalPrice(BigDecimal.valueOf(itemDTO.getQuantity()).multiply(itemDTO.getUnitPrice()));
                quoteItemRepository.save(item);
            }
        }

        return quote;
    }

    public Quote update(UUID id, QuoteDTO quoteDTO) {
        Quote quote = findById(id);
        quote.setTitle(quoteDTO.getTitle());
        quote.setTotalValue(quoteDTO.getTotalValue());
        quote.setValidUntil(quoteDTO.getValidUntil());
        quote.setDescription(quoteDTO.getDescription());
        
        if (quoteDTO.getClientId() != null) {
            quote.setClient(clientRepository.findById(quoteDTO.getClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado")));
        } else {
            quote.setClient(null);
        }
        
        if (quoteDTO.getLeadId() != null) {
            quote.setLead(leadRepository.findById(quoteDTO.getLeadId())
                    .orElseThrow(() -> new ResourceNotFoundException("Lead não encontrado")));
        } else {
            quote.setLead(null);
        }
        
        if (quoteDTO.getAssignedToId() != null) {
            quote.setAssignedTo(userRepository.findById(UUID.fromString(quoteDTO.getAssignedToId().toString()))
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário responsável não encontrado")));
        } else {
            quote.setAssignedTo(null);
        }

        return quoteRepository.save(quote);
    }

    public Quote updateStatus(UUID id, String status) {
        Quote quote = findById(id);
        quote.setStatus(QuoteStatus.valueOf(status));
        return quoteRepository.save(quote);
    }

    public void delete(UUID id) {
        Quote quote = findById(id);
        quoteRepository.delete(quote);
    }

    @Transactional(readOnly = true)
    public List<Quote> findByStatus(QuoteStatus status) {
        List<Quote> quotes = quoteRepository.findByStatus(status);
        for (Quote quote : quotes) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }

    @Transactional(readOnly = true)
    public List<Quote> findByClient(UUID clientId) {
        List<Quote> quotes = quoteRepository.findByClientId(clientId);
        for (Quote quote : quotes) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }

    @Transactional(readOnly = true)
    public List<Quote> findByLead(UUID leadId) {
        List<Quote> quotes = quoteRepository.findByLeadId(leadId);
        for (Quote quote : quotes) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }

    @Transactional(readOnly = true)
    public List<Quote> findByAssignedTo(UUID userId) {
        List<Quote> quotes = quoteRepository.findByAssignedToId(userId);
        for (Quote quote : quotes) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }

    @Transactional(readOnly = true)
    public List<Quote> findByCreatedBy(UUID userId) {
        List<Quote> quotes = quoteRepository.findByCreatedById(userId);
        for (Quote quote : quotes) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }

    @Transactional(readOnly = true)
    public List<Quote> findExpiredQuotes() {
        List<Quote> quotes = quoteRepository.findByValidUntilBefore(LocalDate.now());
        for (Quote quote : quotes) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }

    @Transactional(readOnly = true)
    public List<Quote> findQuotesExpiringSoon(int days) {
        LocalDate expiryDate = LocalDate.now().plusDays(days);
        List<Quote> quotes = quoteRepository.findByValidUntilBefore(expiryDate);
        for (Quote quote : quotes) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }

    public long countByStatus(QuoteStatus status) {
        return quoteRepository.countByStatus(status);
    }

    public BigDecimal getTotalValueByStatus(QuoteStatus status) {
        BigDecimal value = quoteRepository.getTotalValueByStatus(status);
        return value != null ? value : BigDecimal.ZERO;
    }

    @Transactional(readOnly = true)
    public List<Quote> searchQuotes(String searchTerm) {
        List<Quote> quotes = quoteRepository.searchQuotes(searchTerm);
        for (Quote quote : quotes) {
            initializeQuoteRelationships(quote);
        }
        return quotes;
    }

    private String generateQuoteNumber() {
        String prefix = "ORC-" + LocalDateTime.now().getYear() + "-";
        long count = quoteRepository.countByYear(LocalDateTime.now().getYear());
        return prefix + String.format("%03d", count + 1);
    }
} 