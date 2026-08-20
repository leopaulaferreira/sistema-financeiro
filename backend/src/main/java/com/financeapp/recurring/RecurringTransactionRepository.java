package com.financeapp.recurring;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RecurringTransactionRepository
        extends JpaRepository<RecurringTransaction, Long>, JpaSpecificationExecutor<RecurringTransaction> {

    Optional<RecurringTransaction> findByIdAndUserId(Long id, Long userId);

    boolean existsByAccountId(Long accountId);

    boolean existsByCategoryId(Long categoryId);

    boolean existsByPaymentMethodId(Long paymentMethodId);

    /**
     * Varredura do processador: sem filtro de usuário de propósito (o
     * scheduler roda para todos os usuários), só o mínimo necessário
     * (ids) — cada regra é depois relida com lock dentro da própria
     * transação de processamento (ver {@link #findByIdForUpdate}).
     */
    @Query("select r.id from RecurringTransaction r where r.active = true and r.nextExecutionDate <= :today")
    List<Long> findDueIds(@Param("today") LocalDate today);

    /**
     * Releitura com {@code SELECT ... FOR UPDATE} antes de processar uma
     * regra — serializa duas execuções concorrentes da MESMA regra (ex.:
     * scheduler sobreposto), complementando a constraint UNIQUE no banco
     * (última linha de defesa contra duplicidade, não a única).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RecurringTransaction r where r.id = :id")
    Optional<RecurringTransaction> findByIdForUpdate(@Param("id") Long id);

}
