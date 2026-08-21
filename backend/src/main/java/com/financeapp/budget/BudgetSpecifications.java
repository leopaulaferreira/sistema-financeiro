package com.financeapp.budget;

import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/** Mesmo padrão de {@code RecurringTransactionSpecifications}: filtros opcionais montados dinamicamente. */
final class BudgetSpecifications {

    private BudgetSpecifications() {
    }

    static Specification<Budget> filter(Long userId, Integer year, Integer month, Long categoryId) {
        return (root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("category", JoinType.INNER);
                query.orderBy(cb.asc(root.get("category").get("name")));
            }

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));
            if (year != null) {
                predicates.add(cb.equal(root.get("year"), year));
            }
            if (month != null) {
                predicates.add(cb.equal(root.get("month"), month));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
