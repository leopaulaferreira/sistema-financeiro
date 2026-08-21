package com.financeapp.transaction;

import com.financeapp.transaction.dto.AccountTotals;
import com.financeapp.transaction.dto.CategoryAmount;
import com.financeapp.transaction.dto.DailyTotals;
import com.financeapp.transaction.dto.PaymentMethodAmount;
import com.financeapp.transaction.dto.PeriodTotals;
import com.financeapp.transaction.dto.SummaryTotals;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long>, JpaSpecificationExecutor<Transaction> {

    Optional<Transaction> findByIdAndUserId(Long id, Long userId);

    /** Usado por testes de idempotência/catch-up da Fase 6 — produção nunca precisa listar por regra. */
    List<Transaction> findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(Long recurringTransactionId);

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

    /**
     * Gasto realizado de uma categoria no período [from, to) — usado por
     * {@code BudgetService} para calcular {@code spent} sempre por
     * agregação sobre transactions, nunca persistido (ARCHITECTURE.md
     * §9.2, Fase 7). {@code null} quando não há nenhuma despesa no
     * período, normalizado para {@link java.math.BigDecimal#ZERO} no
     * Service.
     */
    @Query("""
            select sum(t.amount) from Transaction t
            where t.user.id = :userId and t.type = com.financeapp.common.TransactionType.EXPENSE
              and t.category.id = :categoryId and t.date >= :from and t.date < :to
            """)
    BigDecimal sumExpenseForCategoryAndPeriod(@Param("userId") Long userId, @Param("categoryId") Long categoryId,
                                               @Param("from") LocalDate from, @Param("to") LocalDate to);

    /**
     * Resumo financeiro do relatório (Fase 8) — totais, médias (só sobre as
     * transações do tipo correspondente, {@code avg()} ignora NULL em SQL,
     * mesmo truque de {@code sumIncomeAndExpense}) e contagem total, numa
     * única agregação. {@code count(t.id)} conta ambos os tipos.
     */
    @Query("""
            select new com.financeapp.transaction.dto.SummaryTotals(
                sum(case when t.type = com.financeapp.common.TransactionType.INCOME then t.amount end),
                sum(case when t.type = com.financeapp.common.TransactionType.EXPENSE then t.amount end),
                avg(case when t.type = com.financeapp.common.TransactionType.INCOME then t.amount end),
                avg(case when t.type = com.financeapp.common.TransactionType.EXPENSE then t.amount end),
                count(t.id))
            from Transaction t
            where t.user.id = :userId and t.date >= :from and t.date < :to
            """)
    SummaryTotals sumSummaryTotals(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    /** Espelha {@link #sumExpensesByCategory}, mas para receitas — relatório "receitas por categoria" (Fase 8). */
    @Query("""
            select new com.financeapp.transaction.dto.CategoryAmount(c.id, c.name, sum(t.amount))
            from Transaction t join t.category c
            where t.user.id = :userId and t.type = com.financeapp.common.TransactionType.INCOME
              and t.date >= :from and t.date < :to
            group by c.id, c.name
            order by sum(t.amount) desc
            """)
    List<CategoryAmount> sumIncomeByCategory(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    /**
     * Totais de receita/despesa por conta dentro do período [from, to) —
     * relatório "fluxo por conta" (Fase 8). Ao contrário de
     * {@link #sumTotalsByAccountExcludingCreditCard}, inclui TODAS as
     * contas (inclusive CREDIT_CARD): fluxo de período é um conceito
     * diferente de saldo/disponibilidade, e excluir o cartão esconderia
     * gasto real (ARCHITECTURE.md, seção de relatórios da Fase 8).
     */
    @Query("""
            select new com.financeapp.transaction.dto.AccountTotals(t.account.id,
                sum(case when t.type = com.financeapp.common.TransactionType.INCOME then t.amount end),
                sum(case when t.type = com.financeapp.common.TransactionType.EXPENSE then t.amount end))
            from Transaction t
            where t.user.id = :userId and t.date >= :from and t.date < :to
            group by t.account.id
            """)
    List<AccountTotals> sumTotalsByAccountForPeriod(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    /**
     * Igual a {@link #sumDailyTotals}, mas cumulativo (sem limite inferior,
     * como {@link #sumIncomeAndExpenseForAvailableAccounts}) e restrito a
     * contas de disponibilidade (exclui CREDIT_CARD) — usado por
     * {@code ReportService.balanceEvolution} para reaproveitar exatamente a
     * mesma regra de saldo disponível do dashboard (ARCHITECTURE.md §10.6),
     * só que dia a dia em vez de um único total.
     */
    @Query("""
            select new com.financeapp.transaction.dto.DailyTotals(t.date,
                sum(case when t.type = com.financeapp.common.TransactionType.INCOME then t.amount end),
                sum(case when t.type = com.financeapp.common.TransactionType.EXPENSE then t.amount end))
            from Transaction t
            where t.user.id = :userId and t.date < :to
              and t.account.type <> com.financeapp.account.AccountType.CREDIT_CARD
            group by t.date
            order by t.date
            """)
    List<DailyTotals> sumDailyTotalsForAvailableAccounts(@Param("userId") Long userId, @Param("to") LocalDate to);

    /**
     * Maiores transações de um tipo no período — relatórios "top despesas"/
     * "top receitas" (Fase 8). Fetch join evita N+1 ao montar
     * {@code TransactionResponse} (mesmas três associações de
     * {@link TransactionSpecifications#filter}). Ordenação por valor é o
     * motivo de não reaproveitar a Specification aqui: ela já fixa
     * {@code ORDER BY date DESC, id DESC} para a listagem normal.
     */
    @Query("""
            select t from Transaction t
            join fetch t.category
            join fetch t.account
            join fetch t.paymentMethod
            where t.user.id = :userId and t.type = :type and t.date >= :from and t.date < :to
            order by t.amount desc, t.date desc, t.id desc
            """)
    List<Transaction> findTopByUserAndTypeAndPeriod(@Param("userId") Long userId, @Param("type") com.financeapp.common.TransactionType type,
                                                      @Param("from") LocalDate from, @Param("to") LocalDate to, Pageable pageable);

    /** Distribuição de despesas por método de pagamento no período — relatório da Fase 8. */
    @Query("""
            select new com.financeapp.transaction.dto.PaymentMethodAmount(pm.id, pm.name, sum(t.amount), count(t.id))
            from Transaction t join t.paymentMethod pm
            where t.user.id = :userId and t.type = com.financeapp.common.TransactionType.EXPENSE
              and t.date >= :from and t.date < :to
            group by pm.id, pm.name
            order by sum(t.amount) desc
            """)
    List<PaymentMethodAmount> sumExpensesByPaymentMethod(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
