package com.financeapp.dashboard;

import com.financeapp.account.AccountType;
import com.financeapp.account.dto.AccountResponse;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
import com.financeapp.paymentmethod.dto.PaymentMethodResponse;
import com.financeapp.support.AbstractIntegrationTest;
import com.financeapp.transaction.dto.TransactionRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DashboardControllerIntegrationTest extends AbstractIntegrationTest {

    private record Fixture(Session session, AccountResponse account, CategoryResponse income,
                            CategoryResponse expense, PaymentMethodResponse paymentMethod) {
    }

    private Fixture setUpFixture(String emailSeed) throws Exception {
        Session session = registerAndLogin(emailSeed + "@example.com", "senha1234");
        AccountResponse account = createAccount(session, "Conta Principal", AccountType.CHECKING, BigDecimal.valueOf(100));
        CategoryResponse income = createCategory(session, "Salário", TransactionType.INCOME);
        CategoryResponse expense = createCategory(session, "Alimentação", TransactionType.EXPENSE);
        PaymentMethodResponse paymentMethod = createPaymentMethod(session, "Pix");
        return new Fixture(session, account, income, expense, paymentMethod);
    }

    private void createTransaction(Fixture f, TransactionType type, BigDecimal amount, LocalDate date) throws Exception {
        createTransaction(f, f.account().id(), type, amount, date);
    }

    private void createTransaction(Fixture f, Long accountId, TransactionType type, BigDecimal amount, LocalDate date)
            throws Exception {
        Long categoryId = type == TransactionType.INCOME ? f.income().id() : f.expense().id();
        TransactionRequest request = new TransactionRequest("Lançamento", amount, type, date, categoryId, accountId,
                f.paymentMethod().id(), null);
        mockMvc.perform(authed(post("/api/transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated());
    }

    // --- summary ---------------------------------------------------------

    @Test
    void summary_withNoData_returnsAllZerosExceptInitialBalance() throws Exception {
        Fixture f = setUpFixture("sum-empty");

        mockMvc.perform(authed(get("/api/dashboard/summary").param("year", "2026").param("month", "8"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").value(0))
                .andExpect(jsonPath("$.totalExpenses").value(0))
                .andExpect(jsonPath("$.netSavings").value(0))
                .andExpect(jsonPath("$.availableBalance").value(100));
    }

    @Test
    void summary_withIncomeOnly() throws Exception {
        Fixture f = setUpFixture("sum-income");
        createTransaction(f, TransactionType.INCOME, BigDecimal.valueOf(3000), LocalDate.of(2026, 8, 5));

        mockMvc.perform(authed(get("/api/dashboard/summary").param("year", "2026").param("month", "8"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").value(3000))
                .andExpect(jsonPath("$.totalExpenses").value(0))
                .andExpect(jsonPath("$.netSavings").value(3000))
                .andExpect(jsonPath("$.availableBalance").value(3100));
    }

    @Test
    void summary_withExpenseOnly() throws Exception {
        Fixture f = setUpFixture("sum-expense");
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(40), LocalDate.of(2026, 8, 6));

        mockMvc.perform(authed(get("/api/dashboard/summary").param("year", "2026").param("month", "8"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").value(0))
                .andExpect(jsonPath("$.totalExpenses").value(40))
                .andExpect(jsonPath("$.netSavings").value(-40))
                .andExpect(jsonPath("$.availableBalance").value(60));
    }

    @Test
    void summary_withIncomeAndExpense_computesNetSavings() throws Exception {
        Fixture f = setUpFixture("sum-both");
        createTransaction(f, TransactionType.INCOME, BigDecimal.valueOf(1000), LocalDate.of(2026, 8, 1));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(300), LocalDate.of(2026, 8, 2));

        mockMvc.perform(authed(get("/api/dashboard/summary").param("year", "2026").param("month", "8"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").value(1000))
                .andExpect(jsonPath("$.totalExpenses").value(300))
                .andExpect(jsonPath("$.netSavings").value(700));
    }

    @Test
    void summary_isIsolatedBetweenUsers() throws Exception {
        Fixture owner = setUpFixture("sum-owner");
        createTransaction(owner, TransactionType.INCOME, BigDecimal.valueOf(5000), LocalDate.of(2026, 8, 1));

        Fixture other = setUpFixture("sum-other");
        createTransaction(other, TransactionType.INCOME, BigDecimal.valueOf(10), LocalDate.of(2026, 8, 1));

        mockMvc.perform(authed(get("/api/dashboard/summary").param("year", "2026").param("month", "8"), other.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").value(10));
    }

    @Test
    void summary_onlyCountsTransactionsWithinQueriedMonth_butAvailableBalanceIsCumulativeUpToPeriodEnd() throws Exception {
        Fixture f = setUpFixture("sum-months");
        createTransaction(f, TransactionType.INCOME, BigDecimal.valueOf(200), LocalDate.of(2026, 7, 10)); // mês anterior
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(50), LocalDate.of(2026, 8, 15));  // mês consultado
        createTransaction(f, TransactionType.INCOME, BigDecimal.valueOf(999), LocalDate.of(2026, 9, 5));   // mês futuro

        mockMvc.perform(authed(get("/api/dashboard/summary").param("year", "2026").param("month", "8"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").value(0))       // julho não conta para agosto
                .andExpect(jsonPath("$.totalExpenses").value(50))
                .andExpect(jsonPath("$.availableBalance").value(250)); // 100 (inicial) + 200 (jul) - 50 (ago); setembro fora
    }

    @Test
    void summary_availableBalanceExcludesCreditCardAccounts() throws Exception {
        Fixture f = setUpFixture("sum-cc");
        AccountResponse creditCard = createAccount(f.session(), "Cartão", AccountType.CREDIT_CARD, BigDecimal.valueOf(-300));
        createTransaction(f, creditCard.id(), TransactionType.EXPENSE, BigDecimal.valueOf(50), LocalDate.of(2026, 8, 10));

        mockMvc.perform(authed(get("/api/dashboard/summary").param("year", "2026").param("month", "8"), f.session()))
                .andExpect(status().isOk())
                // só a conta CHECKING (100) entra — cartão (-300 inicial, -50 de despesa) é ignorado por completo
                .andExpect(jsonPath("$.availableBalance").value(100))
                // totalExpenses do mês, por outro lado, inclui o gasto no cartão (é gasto real do mês)
                .andExpect(jsonPath("$.totalExpenses").value(50));
    }

    // --- expenses-by-category ---------------------------------------------

    @Test
    void expensesByCategory_groupsAndOrdersDescendingWithPercentages() throws Exception {
        Fixture f = setUpFixture("cat-group");
        CategoryResponse transporte = createCategory(f.session(), "Transporte", TransactionType.EXPENSE);

        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(10), LocalDate.of(2026, 8, 1));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(20), LocalDate.of(2026, 8, 2)); // Alimentação: 30 total
        mockMvc.perform(authed(post("/api/transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new TransactionRequest("Uber", BigDecimal.valueOf(50), TransactionType.EXPENSE,
                                LocalDate.of(2026, 8, 3), transporte.id(), f.account().id(), f.paymentMethod().id(), null))))
                .andExpect(status().isCreated());

        // total de despesas no período: 80 (30 Alimentação + 50 Transporte)
        mockMvc.perform(authed(get("/api/dashboard/expenses-by-category").param("year", "2026").param("month", "8"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].categoryName").value("Transporte"))
                .andExpect(jsonPath("$[0].amount").value(50))
                .andExpect(jsonPath("$[0].percentage").value(62.5))
                .andExpect(jsonPath("$[1].categoryName").value("Alimentação"))
                .andExpect(jsonPath("$[1].amount").value(30))
                .andExpect(jsonPath("$[1].percentage").value(37.5));
    }

    @Test
    void expensesByCategory_withNoExpenses_returnsEmptyList() throws Exception {
        Fixture f = setUpFixture("cat-empty");

        mockMvc.perform(authed(get("/api/dashboard/expenses-by-category").param("year", "2026").param("month", "8"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void expensesByCategory_isIsolatedBetweenUsers() throws Exception {
        Fixture owner = setUpFixture("cat-owner");
        createTransaction(owner, TransactionType.EXPENSE, BigDecimal.valueOf(80), LocalDate.of(2026, 8, 1));

        Fixture other = setUpFixture("cat-other");
        createTransaction(other, TransactionType.EXPENSE, BigDecimal.valueOf(15), LocalDate.of(2026, 8, 1));

        mockMvc.perform(authed(get("/api/dashboard/expenses-by-category").param("year", "2026").param("month", "8"), other.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].amount").value(15));
    }

    // --- income-vs-expense -------------------------------------------------

    @Test
    void incomeVsExpense_groupsByDayAndFillsGapsWithZero() throws Exception {
        Fixture f = setUpFixture("ive-fill");
        createTransaction(f, TransactionType.INCOME, BigDecimal.valueOf(4500), LocalDate.of(2026, 8, 1));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(120.50), LocalDate.of(2026, 8, 2));
        // dia 3 sem nenhuma transação — deve aparecer com zero, não ausente

        mockMvc.perform(authed(get("/api/dashboard/income-vs-expense").param("year", "2026").param("month", "8"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(31)) // agosto tem 31 dias
                .andExpect(jsonPath("$[0].date").value("2026-08-01"))
                .andExpect(jsonPath("$[0].income").value(4500))
                .andExpect(jsonPath("$[0].expense").value(0))
                .andExpect(jsonPath("$[1].income").value(0))
                .andExpect(jsonPath("$[1].expense").value(120.50))
                .andExpect(jsonPath("$[2].date").value("2026-08-03"))
                .andExpect(jsonPath("$[2].income").value(0))
                .andExpect(jsonPath("$[2].expense").value(0))
                .andExpect(jsonPath("$[30].date").value("2026-08-31"));
    }

    @Test
    void incomeVsExpense_isIsolatedBetweenUsers() throws Exception {
        Fixture owner = setUpFixture("ive-owner");
        createTransaction(owner, TransactionType.INCOME, BigDecimal.valueOf(500), LocalDate.of(2026, 8, 1));

        Fixture other = setUpFixture("ive-other");

        mockMvc.perform(authed(get("/api/dashboard/income-vs-expense").param("year", "2026").param("month", "8"), other.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].income").value(0));
    }

    // --- recent-transactions ------------------------------------------------

    @Test
    void recentTransactions_ordersByDateDescThenIdDesc() throws Exception {
        Fixture f = setUpFixture("recent-order");
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(10), LocalDate.of(2026, 8, 1));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(20), LocalDate.of(2026, 8, 5));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(21), LocalDate.of(2026, 8, 5)); // mesma data, id maior

        mockMvc.perform(authed(get("/api/dashboard/recent-transactions"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].amount").value(21))
                .andExpect(jsonPath("$[1].amount").value(20))
                .andExpect(jsonPath("$[2].amount").value(10));
    }

    @Test
    void recentTransactions_respectsLimit() throws Exception {
        Fixture f = setUpFixture("recent-limit");
        for (int i = 1; i <= 5; i++) {
            createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(i), LocalDate.of(2026, 8, i));
        }

        mockMvc.perform(authed(get("/api/dashboard/recent-transactions").param("limit", "2"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void recentTransactions_absurdLimitIsCapped() throws Exception {
        Fixture f = setUpFixture("recent-cap");
        for (int i = 1; i <= 5; i++) {
            createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(i), LocalDate.of(2026, 8, i));
        }

        mockMvc.perform(authed(get("/api/dashboard/recent-transactions").param("limit", "999999"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5)); // não trava nem retorna algo absurdo, só limita ao que existe
    }

    @Test
    void recentTransactions_invalidLimitReturns400() throws Exception {
        Fixture f = setUpFixture("recent-invalid");

        mockMvc.perform(authed(get("/api/dashboard/recent-transactions").param("limit", "0"), f.session()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void recentTransactions_isIsolatedBetweenUsers() throws Exception {
        Fixture owner = setUpFixture("recent-owner");
        createTransaction(owner, TransactionType.EXPENSE, BigDecimal.valueOf(10), LocalDate.of(2026, 8, 1));

        Fixture other = setUpFixture("recent-other");

        mockMvc.perform(authed(get("/api/dashboard/recent-transactions"), other.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- accounts-balance -----------------------------------------------------

    @Test
    void accountsBalance_reflectsInitialBalanceOnlyWhenNoTransactions() throws Exception {
        Fixture f = setUpFixture("bal-initial");

        mockMvc.perform(authed(get("/api/dashboard/accounts-balance"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].balance").value(100));
    }

    @Test
    void accountsBalance_addsIncomeAndSubtractsExpense() throws Exception {
        Fixture f = setUpFixture("bal-mix");
        createTransaction(f, TransactionType.INCOME, BigDecimal.valueOf(500), LocalDate.of(2026, 8, 1));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(120), LocalDate.of(2026, 8, 2));

        mockMvc.perform(authed(get("/api/dashboard/accounts-balance"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].balance").value(480)); // 100 + 500 - 120
    }

    @Test
    void accountsBalance_handlesMultipleAccountsIndependently() throws Exception {
        Fixture f = setUpFixture("bal-multi");
        AccountResponse second = createAccount(f.session(), "Poupança", AccountType.SAVINGS, BigDecimal.valueOf(1000));
        createTransaction(f, f.account().id(), TransactionType.EXPENSE, BigDecimal.valueOf(30), LocalDate.of(2026, 8, 1));
        createTransaction(f, second.id(), TransactionType.INCOME, BigDecimal.valueOf(200), LocalDate.of(2026, 8, 1));

        // ordenado por nome (AccountRepository...OrderByNameAsc): "Conta Principal" < "Poupança"
        mockMvc.perform(authed(get("/api/dashboard/accounts-balance"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].accountName").value("Conta Principal"))
                .andExpect(jsonPath("$[0].balance").value(70))
                .andExpect(jsonPath("$[1].accountName").value("Poupança"))
                .andExpect(jsonPath("$[1].balance").value(1200));
    }

    @Test
    void accountsBalance_excludesCreditCardAccounts() throws Exception {
        Fixture f = setUpFixture("bal-cc");
        AccountResponse creditCard = createAccount(f.session(), "Cartão", AccountType.CREDIT_CARD, BigDecimal.valueOf(-500));
        createTransaction(f, creditCard.id(), TransactionType.EXPENSE, BigDecimal.valueOf(100), LocalDate.of(2026, 8, 1));

        mockMvc.perform(authed(get("/api/dashboard/accounts-balance"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1)) // só a conta CHECKING; cartão não aparece
                .andExpect(jsonPath("$[0].accountType").value("CHECKING"));
    }

    @Test
    void accountsBalance_isIsolatedBetweenUsers() throws Exception {
        Fixture owner = setUpFixture("bal-owner");
        Fixture other = setUpFixture("bal-other");

        mockMvc.perform(authed(get("/api/dashboard/accounts-balance"), other.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].accountId").value(other.account().id()));
    }
}
