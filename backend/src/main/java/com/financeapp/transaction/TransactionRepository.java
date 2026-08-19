package com.financeapp.transaction;

import com.financeapp.common.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByIdAndUserId(Long id, Long userId);

    boolean existsByAccountId(Long accountId);

    boolean existsByCategoryId(Long categoryId);

    boolean existsByPaymentMethodId(Long paymentMethodId);

    @Query(
            value = """
                    select t from Transaction t
                    join fetch t.category
                    join fetch t.account
                    join fetch t.paymentMethod
                    where t.user.id = :userId
                      and (:from is null or t.date >= :from)
                      and (:to is null or t.date <= :to)
                      and (:type is null or t.type = :type)
                      and (:categoryId is null or t.category.id = :categoryId)
                      and (:accountId is null or t.account.id = :accountId)
                    order by t.date desc, t.id desc
                    """,
            countQuery = """
                    select count(t) from Transaction t
                    where t.user.id = :userId
                      and (:from is null or t.date >= :from)
                      and (:to is null or t.date <= :to)
                      and (:type is null or t.type = :type)
                      and (:categoryId is null or t.category.id = :categoryId)
                      and (:accountId is null or t.account.id = :accountId)
                    """
    )
    Page<Transaction> search(@Param("userId") Long userId,
                              @Param("from") LocalDate from,
                              @Param("to") LocalDate to,
                              @Param("type") TransactionType type,
                              @Param("categoryId") Long categoryId,
                              @Param("accountId") Long accountId,
                              Pageable pageable);
}
