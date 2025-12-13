package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.VisitControl;
import com.z7design.secured_guard.model.enums.VisitControlStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public class VisitControlRepositoryImpl implements VisitControlRepositoryCustom {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<VisitControl> findByFiltersWithFetch(UUID workPostId, VisitControlStatus status,
                                                     LocalDate startDate, LocalDate endDate) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<VisitControl> query = cb.createQuery(VisitControl.class);
        Root<VisitControl> root = query.from(VisitControl.class);
        query.distinct(true);
        
        // Eager fetch joins
        root.fetch("workPost", JoinType.LEFT);
        root.fetch("supervisor", JoinType.LEFT);
        
        List<Predicate> predicates = new ArrayList<>();
        
        if (workPostId != null) {
            predicates.add(cb.equal(root.get("workPost").get("id"), workPostId));
        }
        
        if (status != null) {
            predicates.add(cb.equal(root.get("status"), status));
        }
        
        if (startDate != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("visitDate"), startDate));
        }
        
        if (endDate != null) {
            predicates.add(cb.lessThanOrEqualTo(root.get("visitDate"), endDate));
        }
        
        if (!predicates.isEmpty()) {
            query.where(cb.and(predicates.toArray(new Predicate[0])));
        }
        
        TypedQuery<VisitControl> typedQuery = entityManager.createQuery(query);
        List<VisitControl> results = typedQuery.getResultList();
        
        // Forçar inicialização das relações para evitar lazy loading
        for (VisitControl visit : results) {
            if (visit.getWorkPost() != null) {
                Hibernate.initialize(visit.getWorkPost());
                // Acessar o nome para garantir que está carregado
                visit.getWorkPost().getName();
            }
            if (visit.getSupervisor() != null) {
                Hibernate.initialize(visit.getSupervisor());
                // Acessar o nome para garantir que está carregado
                visit.getSupervisor().getName();
            }
        }
        
        return results;
    }
}

