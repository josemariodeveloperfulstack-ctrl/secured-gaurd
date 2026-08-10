package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.InteractionHistory;
import com.z7design.secured_guard.repository.InteractionHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class InteractionHistoryService {
    @Autowired
    private InteractionHistoryRepository interactionHistoryRepository;

    @Transactional(readOnly = true)
    public List<InteractionHistory> findAll() {
        return interactionHistoryRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<InteractionHistory> findById(UUID id) {
        return interactionHistoryRepository.findById(id);
    }

    @Transactional
    public InteractionHistory save(InteractionHistory history) {
        return interactionHistoryRepository.save(history);
    }

    @Transactional
    public void delete(UUID id) {
        interactionHistoryRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<InteractionHistory> findByLeadId(UUID leadId) {
        return interactionHistoryRepository.findByLeadIdOrderByCreatedAtDesc(leadId);
    }

    @Transactional(readOnly = true)
    public List<InteractionHistory> findByOpportunityId(UUID opportunityId) {
        return interactionHistoryRepository.findByOpportunityIdOrderByCreatedAtDesc(opportunityId);
    }
}
