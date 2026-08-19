package com.financeapp.transaction;

import com.financeapp.transaction.dto.AccountTotals;
import com.financeapp.transaction.dto.CategoryAmount;
import com.financeapp.transaction.dto.DailyTotals;
import com.financeapp.transaction.dto.PeriodTotals;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long>, JpaSpecificationExecutor<Transaction> {

    Optional<Transaction> findByIdAndUserId(Long id, Long userId);

    boolean existsByAccountId(Long accountId);

    boolean existsByCategoryId(Long categoryId);

    boolean existsByPaymentMethodId(Long paymentMethodId);

    /**
     * Totais de receita/despesa do usuário no intervalo [from, to). Sempre
     * retorna uma linha (agregação sem GROUP BY nunca retorna "nenhum
     * resultado" em SQL) — campos vêm {@code null} quando não há transações
     * do tipo correspondente, normalizado para {@link java.math.BigDecimal#ZERO}
     * no Service, nunca aqui.
     */
    @Query("""
            select new com.financeapp.transaction.dto.PeriodTotals(
                sum(case when t.type = com.financeapp.common.TransactionType.INCOME then t.amount end),
                sum(case when t.type = com.financeapp.common.TransactionType.EXPENSE then t.amount end))
            from Transaction t
            where t.user.id = :userId and t.date >= :from and t.date < :to
            """)
    PeriodTotals sumIncomeAndExpense(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    /**
     * Igual à anterior, mas sem limite inferior de data (saldo é cumulativo
     * desde sempre, não do mês) e restrita a contas de disponibilidade —
     * exclui CREDIT_CARD, que representa dívida, não saldo disponível
     * (ARCHITECTURE.md §10.6). Usada para {@code availableBalance}.
     */
    @Query("""
            select new com.financeapp.transaction.dto.PeriodTotals(
                sum(case when t.type = com.financeapp.common.TransactionType.INCOME then t.amount end),
                sum(case when t.type = com.financeapp.common.TransactionType.EXPENSE then t.amount end))
            from Transaction t
            where t.user.id = :userId and t.date < :to
              and t.account.type <> com.financeapp.account.AccountType.CREDIT_CARD
            """)
    PeriodTotals sumIncomeAndExpenseForAvailableAccounts(@Param("userId") Long userId, @Param("to") LocalDate to);

    /** Só retorna categorias com pelo menos uma despesa no período — lista vazia se não houver nenhuma. */
    @Query("""
            select new com.financeapp.transaction.dto.CategoryAmount(c.id, c.name, sum(t.amount))
            from Transaction t join t.category c
            where t.user.id = :userId and t.type = com.financeapp.common.TransactionType.EXPENSE
              and t.date >= :from and t.date < :to
            group by c.id, c.name
            order by sum(t.amount) desc
            """)
    List<CategoryAmount> sumExpensesByCategory(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    /** Só retorna dias com pelo menos uma transação — dias sem movimentação são preenchidos pelo Service. */
    @Query("""
            select new com.financeapp.transaction.dto.DailyTotals(t.date,
                sum(case when t.type = com.financeapp.common.TransactionType.INCOME then t.amount end),
                sum(case when t.type = com.financeapp.common.TransactionType.EXPENSE then t.amount end))
            from Transaction t
            where t.user.id = :userId and t.date >= :from and t.date < :to
            group by t.date
            order by t.date
            """)
    List<DailyTotals> sumDailyTotals(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    /**
     * Totais de receita/despesa por conta, cumulativos (sem filtro de data)
     * — só para contas de disponibilidade (exclui CREDIT_CARD). Contas sem
     * nenhuma transação simplesmente não aparecem na lista; o Service trata
     * isso como zero.
     */
    @Query("""
            select new com.financeapp.transaction.dto.AccountTotals(t.account.id,
                sum(case when t.type = com.financeapp.common.TransactionType.INCOME then t.amount end),
                sum(case when t.type = com.financeapp.common.TransactionType.EXPENSE then t.amount end))
            from Transaction t
            where t.user.id = :userId
              and t.account.type <> com.financeapp.account.AccountType.CREDIT_CARD
            group by t.account.id
            """)
    List<AccountTotals> sumTotalsByAccountExcludingCreditCard(@Param("userId") Long userId);
}
