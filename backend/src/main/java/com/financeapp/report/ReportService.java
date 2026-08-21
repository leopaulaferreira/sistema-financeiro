package com.financeapp.report;

import com.financeapp.account.Account;
import com.financeapp.account.AccountRepository;
import com.financeapp.category.CategoryRepository;
import com.financeapp.common.TransactionType;
import com.financeapp.common.exception.InvalidTransactionException;
import com.financeapp.common.exception.ResourceNotFoundException;
import com.financeapp.report.dto.AccountFlowResponse;
import com.financeapp.report.dto.BalancePointResponse;
import com.financeapp.report.dto.CategoryReportResponse;
import com.financeapp.report.dto.FinancialSummaryResponse;
import com.financeapp.report.dto.IncomeExpenseSeriesPointResponse;
import com.financeapp.report.dto.MonthlyComparisonResponse;
import com.financeapp.report.dto.PaymentMethodReportResponse;
import com.financeapp.transaction.Transaction;
import com.financeapp.transaction.TransactionRepository;
import com.financeapp.transaction.TransactionSpecifications;
import com.financeapp.transaction.dto.AccountTotals;
import com.financeapp.transaction.dto.CategoryAmount;
import com.financeapp.transaction.dto.DailyTotals;
import com.financeapp.transaction.dto.PaymentMethodAmount;
import com.financeapp.transaction.dto.PeriodTotals;
import com.financeapp.transaction.dto.SummaryTotals;
import com.financeapp.transaction.dto.TransactionResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Todos os relatórios agregam sobre {@code transactions} — nenhuma nova
 * fonte de verdade (ARCHITECTURE.md §9.3, Fase 8). budgets/goals/recurring
 * não entram em nenhum cálculo aqui: o realizado é sempre Transaction.
 * Contrato de período: {@code [from, to)} — {@code from} inclusivo,
 * {@code to} exclusivo, igual ao {@code DashboardService} (nota: diferente
 * do filtro de {@code /api/transactions}, onde {@code to} é inclusivo —
 * ver {@link TransactionSpecifications}).
 */
@Service
public class ReportService {

    private static final int PERCENTAGE_SCALE = 2;
    private static final int MONEY_SCALE = 2;
    private static final int MAX_PERIOD_YEARS = 5;
    private static final DateTimeFormatter CSV_DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    public ReportService(TransactionRepository transactionRepository, AccountRepository accountRepository,
                          CategoryRepository categoryRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public FinancialSummaryResponse summary(Long userId, LocalDate from, LocalDate to) {
        validatePeriod(from, to);
        SummaryTotals totals = transactionRepository.sumSummaryTotals(userId, from, to);
        BigDecimal income = nz(totals.income());
        BigDecimal expense = nz(totals.expense());
        return new FinancialSummaryResponse(
                income, expense, income.subtract(expense), totals.count(),
                money(totals.avgIncome()), money(totals.avgExpense()));
    }

    @Transactional(readOnly = true)
    public List<IncomeExpenseSeriesPointResponse> incomeVsExpense(Long userId, LocalDate from, LocalDate to, Granularity granularity) {
        validatePeriod(from, to);
        return granularity == Granularity.MONTH ? monthlySeries(userId, from, to) : dailySeries(userId, from, to);
    }

    @Transactional(readOnly = true)
    public List<CategoryReportResponse> expensesByCategory(Long userId, LocalDate from, LocalDate to) {
        validatePeriod(from, to);
        return toCategoryReport(transactionRepository.sumExpensesByCategory(userId, from, to));
    }

    @Transactional(readOnly = true)
    public List<CategoryReportResponse> incomeByCategory(Long userId, LocalDate from, LocalDate to) {
        validatePeriod(from, to);
        return toCategoryReport(transactionRepository.sumIncomeByCategory(userId, from, to));
    }

    @Transactional(readOnly = true)
    public List<AccountFlowResponse> accountsFlow(Long userId, LocalDate from, LocalDate to) {
        validatePeriod(from, to);
        List<Account> accounts = accountRepository.findAllByUserIdOrderByNameAsc(userId);
        Map<Long, AccountTotals> totalsByAccount = transactionRepository.sumTotalsByAccountForPeriod(userId, from, to).stream()
                .collect(Collectors.toMap(AccountTotals::accountId, Function.identity()));

        return accounts.stream()
                .map(account -> {
                    AccountTotals totals = totalsByAccount.get(account.getId());
                    BigDecimal income = totals == null ? BigDecimal.ZERO : nz(totals.income());
                    BigDecimal expense = totals == null ? BigDecimal.ZERO : nz(totals.expense());
                    return new AccountFlowResponse(account.getId(), account.getName(), income, expense, income.subtract(expense));
                })
                .toList();
    }

    /**
     * Saldo acumulado dia a dia — mesma regra de disponibilidade do
     * dashboard (initialBalance das contas não-CREDIT_CARD + receitas -
     * despesas dessas contas, cumulativo). {@code balance} de uma data é o
     * saldo ao final daquele dia.
     */
    @Transactional(readOnly = true)
    public List<BalancePointResponse> balanceEvolution(Long userId, LocalDate from, LocalDate to) {
        validatePeriod(from, to);
        BigDecimal running = nz(accountRepository.sumInitialBalanceExcludingCreditCard(userId));
        Map<LocalDate, DailyTotals> byDate = transactionRepository.sumDailyTotalsForAvailableAccounts(userId, to).stream()
                .collect(Collectors.toMap(DailyTotals::date, Function.identity()));

        // Soma tudo antes de "from" para achar o saldo de partida do período pedido.
        for (Map.Entry<LocalDate, DailyTotals> entry : byDate.entrySet()) {
            if (entry.getKey().isBefore(from)) {
                running = running.add(nz(entry.getValue().income())).subtract(nz(entry.getValue().expense()));
            }
        }

        List<BalancePointResponse> result = new ArrayList<>();
        for (LocalDate date = from; date.isBefore(to); date = date.plusDays(1)) {
            DailyTotals row = byDate.get(date);
            if (row != null) {
                running = running.add(nz(row.income())).subtract(nz(row.expense()));
            }
            result.add(new BalancePointResponse(date, running));
        }
        return result;
    }

    /** {@code months} já validado (1-24) pelo controller via {@code @Min}/{@code @Max}. */
    @Transactional(readOnly = true)
    public List<MonthlyComparisonResponse> monthlyComparison(Long userId, int months) {
        LocalDate currentMonthStart = LocalDate.now().withDayOfMonth(1);
        List<MonthlyComparisonResponse> result = new ArrayList<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate monthStart = currentMonthStart.minusMonths(i);
            PeriodTotals totals = transactionRepository.sumIncomeAndExpense(userId, monthStart, monthStart.plusMonths(1));
            BigDecimal income = nz(totals.income());
            BigDecimal expense = nz(totals.expense());
            result.add(new MonthlyComparisonResponse(yearMonth(monthStart), income, expense, income.subtract(expense)));
        }
        return result;
    }

    /** {@code limit} já validado (1-50) pelo controller via {@code @Min}/{@code @Max}. */
    @Transactional(readOnly = true)
    public List<TransactionResponse> topExpenses(Long userId, LocalDate from, LocalDate to, int limit) {
        validatePeriod(from, to);
        return topByType(userId, TransactionType.EXPENSE, from, to, limit);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> topIncome(Long userId, LocalDate from, LocalDate to, int limit) {
        validatePeriod(from, to);
        return topByType(userId, TransactionType.INCOME, from, to, limit);
    }

    @Transactional(readOnly = true)
    public List<PaymentMethodReportResponse> paymentMethods(Long userId, LocalDate from, LocalDate to) {
        validatePeriod(from, to);
        List<PaymentMethodAmount> rows = transactionRepository.sumExpensesByPaymentMethod(userId, from, to);
        BigDecimal total = rows.stream().map(PaymentMethodAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return rows.stream()
                .map(row -> new PaymentMethodReportResponse(
                        row.paymentMethodId(), row.paymentMethodName(), row.amount(), percentageOf(row.amount(), total), row.count()))
                .toList();
    }

    /**
     * CSV das transações filtradas, em memória (não é uma agregação — é
     * literalmente a lista de lançamentos do período, o mesmo propósito de
     * {@code GET /api/transactions}). O período máximo de 5 anos
     * ({@link #validatePeriod}) já limita o tamanho razoável do arquivo;
     * não há um segundo cap por linha porque cortar um export no meio
     * geraria um CSV incompleto sem aviso — pior que simplesmente respeitar
     * o limite de período.
     */
    @Transactional(readOnly = true)
    public byte[] exportCsv(Long userId, LocalDate from, LocalDate to, TransactionType type, Long categoryId, Long accountId) {
        validatePeriod(from, to);
        if (categoryId != null) {
            categoryRepository.findByIdAndUserId(categoryId, userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
        }
        if (accountId != null) {
            accountRepository.findByIdAndUserId(accountId, userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Conta não encontrada"));
        }

        // TransactionSpecifications usa "to" inclusivo — o contrato de /api/reports é [from, to).
        LocalDate inclusiveTo = to.minusDays(1);
        var spec = TransactionSpecifications.filter(userId, from, inclusiveTo, type, categoryId, accountId);
        List<Transaction> transactions = transactionRepository.findAll(spec);

        StringBuilder csv = new StringBuilder();
        csv.append('﻿'); // BOM — sem ele, o Excel no Windows decodifica UTF-8 como Latin-1.
        csv.append("Data,Tipo,Descrição,Categoria,Conta,Método de pagamento,Valor\r\n");
        for (Transaction t : transactions) {
            csv.append(t.getDate().format(CSV_DATE_FORMATTER)).append(',');
            csv.append(t.getType() == TransactionType.INCOME ? "Receita" : "Despesa").append(',');
            csv.append(csvField(t.getDescription())).append(',');
            csv.append(csvField(t.getCategory().getName())).append(',');
            csv.append(csvField(t.getAccount().getName())).append(',');
            csv.append(csvField(t.getPaymentMethod().getName())).append(',');
            csv.append(t.getAmount().toPlainString());
            csv.append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private List<IncomeExpenseSeriesPointResponse> dailySeries(Long userId, LocalDate from, LocalDate to) {
        Map<LocalDate, DailyTotals> byDate = transactionRepository.sumDailyTotals(userId, from, to).stream()
                .collect(Collectors.toMap(DailyTotals::date, Function.identity()));

        List<IncomeExpenseSeriesPointResponse> result = new ArrayList<>();
        for (LocalDate date = from; date.isBefore(to); date = date.plusDays(1)) {
            DailyTotals row = byDate.get(date);
            BigDecimal income = row == null ? BigDecimal.ZERO : nz(row.income());
            BigDecimal expense = row == null ? BigDecimal.ZERO : nz(row.expense());
            result.add(new IncomeExpenseSeriesPointResponse(date.format(CSV_DATE_FORMATTER), income, expense));
        }
        return result;
    }

    /**
     * Reaproveita {@code sumDailyTotals} (agregação diária já existente) e
     * funde os buckets por mês em Java — evita adicionar uma segunda query
     * JPQL com {@code extract(year/month from date)} só para isso (o
     * volume de linhas diárias de um usuário pessoa física é pequeno o
     * bastante para não justificar o risco/complexidade de outra query).
     */
    private List<IncomeExpenseSeriesPointResponse> monthlySeries(Long userId, LocalDate from, LocalDate to) {
        Map<String, BigDecimal> incomeByMonth = new HashMap<>();
        Map<String, BigDecimal> expenseByMonth = new HashMap<>();
        for (DailyTotals row : transactionRepository.sumDailyTotals(userId, from, to)) {
            String key = yearMonth(row.date());
            incomeByMonth.merge(key, nz(row.income()), BigDecimal::add);
            expenseByMonth.merge(key, nz(row.expense()), BigDecimal::add);
        }

        List<IncomeExpenseSeriesPointResponse> result = new ArrayList<>();
        for (LocalDate cursor = from.withDayOfMonth(1); cursor.isBefore(to); cursor = cursor.plusMonths(1)) {
            String key = yearMonth(cursor);
            result.add(new IncomeExpenseSeriesPointResponse(
                    key, incomeByMonth.getOrDefault(key, BigDecimal.ZERO), expenseByMonth.getOrDefault(key, BigDecimal.ZERO)));
        }
        return result;
    }

    private List<TransactionResponse> topByType(Long userId, TransactionType type, LocalDate from, LocalDate to, int limit) {
        return transactionRepository.findTopByUserAndTypeAndPeriod(userId, type, from, to, PageRequest.of(0, limit)).stream()
                .map(TransactionResponse::from)
                .toList();
    }

    private List<CategoryReportResponse> toCategoryReport(List<CategoryAmount> rows) {
        BigDecimal total = rows.stream().map(CategoryAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return rows.stream()
                .map(row -> new CategoryReportResponse(row.categoryId(), row.categoryName(), row.amount(), percentageOf(row.amount(), total)))
                .toList();
    }

    private void validatePeriod(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new InvalidTransactionException("Informe o período (from e to)");
        }
        if (!to.isAfter(from)) {
            throw new InvalidTransactionException("Data final deve ser posterior à data inicial");
        }
        if (from.plusYears(MAX_PERIOD_YEARS).isBefore(to)) {
            throw new InvalidTransactionException("Período máximo permitido para este relatório é de " + MAX_PERIOD_YEARS + " anos");
        }
    }

    private BigDecimal percentageOf(BigDecimal part, BigDecimal total) {
        if (total.signum() == 0) {
            return BigDecimal.ZERO.setScale(PERCENTAGE_SCALE, RoundingMode.HALF_UP);
        }
        return part.multiply(BigDecimal.valueOf(100)).divide(total, PERCENTAGE_SCALE, RoundingMode.HALF_UP);
    }

    private static String yearMonth(LocalDate date) {
        return "%04d-%02d".formatted(date.getYear(), date.getMonthValue());
    }

    private static String csvField(String value) {
        if (value == null) return "";
        boolean needsQuoting = value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r");
        String escaped = value.replace("\"", "\"\"");
        return needsQuoting ? "\"" + escaped + "\"" : escaped;
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal money(Double value) {
        BigDecimal decimal = value == null ? BigDecimal.ZERO : BigDecimal.valueOf(value);
        return decimal.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }
}
