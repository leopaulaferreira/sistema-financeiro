package com.financeapp.transaction;

import com.financeapp.common.TransactionType;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Monta o filtro dinamicamente em vez de um JPQL estático com padrão
 * {@code :param is null or campo = :param} — esse padrão faz o driver JDBC
 * do Postgres falhar ao inferir o tipo do bind parameter em alguns casos
 * ("could not determine data type of parameter"), já que o mesmo valor
 * acaba sendo enviado duas vezes (uma no "is null", outra na comparação)
 * sem contexto de tipo suficiente. Com Specification, cada predicado só
 * entra na query quando o filtro correspondente não é nulo.
 */
final class TransactionSpecifications {

    private TransactionSpecifications() {
    }

    static Specification<Transaction> filter(Long userId, LocalDate from, LocalDate to, TransactionType type,
                                               Long categoryId, Long accountId) {
        return (root, query, cb) -> {
            // Fetch join só faz sentido na query de conteúdo — a query de
            // contagem gerada internamente para a paginação tem resultado
            // Long e não deve carregar as associações.
            if (query.getResultType() != Long.class && query.getResultType() != long.class) {
                root.fetch("category", JoinType.INNER);
                root.fetch("account", JoinType.INNER);
                root.fetch("paymentMethod", JoinType.INNER);
                query.orderBy(cb.desc(root.get("date")), cb.desc(root.get("id")));
            }

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), to));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (accountId != null) {
                predicates.add(cb.equal(root.get("account").get("id"), accountId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
