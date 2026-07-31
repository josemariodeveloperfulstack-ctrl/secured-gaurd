package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.MedicalDocument;
import com.z7design.secured_guard.model.enums.MedicalDocumentType;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Specs dinâmicas evitam o erro PostgreSQL de parâmetros NULL tipados como bytea
 * em consultas JPQL do tipo {@code (:param IS NULL OR ...)}.
 */
public final class MedicalDocumentSpecs {

    private MedicalDocumentSpecs() {
    }

    public static Specification<MedicalDocument> search(
            UUID employeeId,
            UUID companyId,
            MedicalDocumentType type,
            LocalDate from,
            LocalDate to,
            String cid,
            String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "ACTIVE"));

            Join<?, ?> employee = root.join("employee", JoinType.LEFT);

            if (employeeId != null) {
                predicates.add(cb.equal(employee.get("id"), employeeId));
            }
            if (companyId != null) {
                predicates.add(cb.equal(root.get("company").get("id"), companyId));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("documentType"), type));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("startDate"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("startDate"), to));
            }
            if (cid != null && !cid.isBlank()) {
                predicates.add(cb.like(cb.upper(root.get("cidCode")), "%" + cid.trim().toUpperCase() + "%"));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(employee.get("name")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("cidCode"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("cidDescription"), "")), pattern)
                ));
            }

            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    public static Specification<MedicalDocument> forDashboard(UUID companyId, LocalDate from, LocalDate to) {
        return (root, query, cb) -> {
            if (query != null && Long.class != query.getResultType() && long.class != query.getResultType()) {
                root.fetch("employee", JoinType.LEFT);
                root.fetch("company", JoinType.LEFT);
                query.distinct(true);
            }

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), "ACTIVE"));
            if (companyId != null) {
                predicates.add(cb.equal(root.get("company").get("id"), companyId));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("startDate"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("startDate"), to));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
