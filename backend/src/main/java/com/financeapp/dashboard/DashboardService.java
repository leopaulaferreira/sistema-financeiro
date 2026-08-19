package com.financeapp.dashboard;

import com.financeapp.account.Account;
import com.financeapp.account.AccountRepository;
import com.financeapp.account.AccountType;
import com.financeapp.dashboard.dto.AccountBalanceResponse;
import com.financeapp.dashboard.dto.CategoryExpenseResponse;
import com.financeapp.dashboard.dto.DailyIncomeExpenseResponse;
import com.financeapp.dashboard.dto.DashboardSummaryResponse;
import com.financeapp.transaction.TransactionRepository;
import com.financeapp.transaction.TransactionSpecifications;
import com.financeapp.transaction.dto.AccountTotals;
import com.financeapp.transaction.dto.CategoryAmount;
import com.financeapp.transaction.dto.DailyTotals;
import com.financeapp.transaction.dto.PeriodTotals;
import com.financeapp.transaction.dto.TransactionResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Todas as agregações são calculadas no Postgres (SUM/GROUP BY via
 * {@link TransactionRepository}) — nenhum endpoint carrega a lista completa
 * de transações do usuário para somar em memória Java.
 */
@Service
public class DashboardService {

    private static final int PERCENTAGE_SCALE = 2;
    private static final int DEFAULT_RECENT_LIMIT = 10;
    private static final int MAX_RECENT_LIMIT = 50;

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

    public DashboardService(TransactionRepository transactionRepository, AccountRepository accountRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary(Long userId, int year, int month) {
        LocalDate from = firstDayOf(year, month);
        LocalDate to = from.plusMonths(1);

        PeriodTotals monthTotals = transactionRepository.sumIncomeAndExpense(userId, from, to);
        BigDecimal totalIncome = nz(monthTotals.income());
        BigDecimal totalExpenses = nz(monthTotals.expense());
        BigDecimal netSavings = totalIncome.subtract(totalExpenses);

        BigDecimal availableBalance = availableBalanceAsOf(userId, to);

        return new DashboardSummaryResponse(totalIncome, totalExpenses, netSavings, availableBalance);
    }

    @Transactional(readOnly = true)
    public List<CategoryExpenseResponse> expensesByCategory(Long userId, int year, int month) {
        LocalDate from = firstDayOf(year, month);
        LocalDate to = from.plusMonths(1);

        List<CategoryAmount> rows = transactionRepository.sumExpensesByCategory(userId, from, to);
        BigDecimal total = rows.stream().map(CategoryAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add);

        return rows.stream()
                .map(row -> new CategoryExpenseResponse(
                        row.categoryId(), row.categoryName(), row.amount(), percentageOf(row.amount(), total)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DailyIncomeExpenseResponse> incomeVsExpense(Long userId, int year, int month) {
        LocalDate from = firstDayOf(year, month);
        LocalDate to = from.plusMonths(1);

        Map<LocalDate, DailyTotals> byDate = transactionRepository.sumDailyTotals(userId, from, to).stream()
                .collect(Collectors.toMap(DailyTotals::date, Function.identity()));

        List<DailyIncomeExpenseResponse> result = new ArrayList<>();
        for (LocalDate date = from; date.isBefore(to); date = date.plusDays(1)) {
            DailyTotals row = byDate.get(date);
            BigDecimal income = row == null ? BigDecimal.ZERO : nz(row.income());
            BigDecimal expense = row == null ? BigDecimal.ZERO : nz(row.expense());
            result.add(new DailyIncomeExpenseResponse(date, income, expense));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> recentTransactions(Long userId, Integer limit) {
        int requested = limit == null ? DEFAULT_RECENT_LIMIT : limit;
        int cappedLimit = Math.min(Math.max(requested, 1), MAX_RECENT_LIMIT);

        var spec = TransactionSpecifications.filter(userId, null, null, null, null, null);
        return transactionRepository.findAll(spec, PageRequest.of(0, cappedLimit)).getContent().stream()
                .map(TransactionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AccountBalanceResponse> accountsBalance(Long userId) {
        List<Account> availabilityAccounts =
                accountRepository.findAllByUserIdAndTypeNotOrderByNameAsc(userId, AccountType.CREDIT_CARD);

        Map<Long, AccountTotals> totalsByAccount = transactionRepository
                .sumTotalsByAccountExcludingCreditCard(userId).stream()
                .collect(Collectors.toMap(AccountTotals::accountId, Function.identity()));

        return availabilityAccounts.stream()
                .map(account -> {
                    AccountTotals totals = totalsByAccount.get(account.getId());
                    BigDecimal income = totals == null ? BigDecimal.ZERO : nz(totals.income());
                    BigDecimal expense = totals == null ? BigDecimal.ZERO : nz(totals.expense());
                    BigDecimal balance = account.getInitialBalance().add(income).subtract(expense);
                    return new AccountBalanceResponse(account.getId(), account.getName(), account.getType(), balance);
                })
                .toList();
    }

    /**
     * Disponibilidade financeira (ARCHITECTURE.md §8/§10.6): soma do saldo
     * inicial das contas de disponibilidade (todos os tipos exceto
     * CREDIT_CARD) + receitas - despesas dessas mesmas contas, cumulativo
     * até {@code to} (exclusivo). Uma despesa lançada num cartão de crédito
     * não reduz esse número — ela ainda não saiu do caixa, é dívida futura.
     */
    private BigDecimal availableBalanceAsOf(Long userId, LocalDate to) {
        BigDecimal initialBalances = nz(accountRepository.sumInitialBalanceExcludingCreditCard(userId));
        PeriodTotals totals = transactionRepository.sumIncomeAndExpenseForAvailableAccounts(userId, to);
        return initialBalances.add(nz(totals.income())).subtract(nz(totals.expense()));
    }

    private BigDecimal percentageOf(BigDecimal part, BigDecimal total) {
        if (total.signum() == 0) {
            return BigDecimal.ZERO.setScale(PERCENTAGE_SCALE, RoundingMode.HALF_UP);
        }
        return part.multiply(BigDecimal.valueOf(100)).divide(total, PERCENTAGE_SCALE, RoundingMode.HALF_UP);
    }

    private LocalDate firstDayOf(int year, int month) {
        return LocalDate.of(year, month, 1);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
