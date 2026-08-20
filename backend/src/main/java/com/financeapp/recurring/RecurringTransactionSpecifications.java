package com.financeapp.recurring;

import com.financeapp.common.TransactionType;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/** Mesmo padrão de {@code TransactionSpecifications}: filtros opcionais montados dinamicamente. */
final class RecurringTransactionSpecifications {

    private RecurringTransactionSpecifications() {
    }

    static Specification<RecurringTransaction> filter(Long userId, TransactionType type, Boolean active,
                                                        RecurrenceFrequency frequency) {
        return (root, query, cb) -> {
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("account", JoinType.INNER);
                root.fetch("category", JoinType.INNER);
                root.fetch("paymentMethod", JoinType.INNER);
                query.orderBy(cb.desc(root.get("active")), cb.asc(root.get("nextExecutionDate")), cb.asc(root.get("id")));
            }

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (frequency != null) {
                predicates.add(cb.equal(root.get("frequency"), frequency));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
