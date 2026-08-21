package com.financeapp.report;

import com.financeapp.account.AccountType;
import com.financeapp.account.dto.AccountResponse;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
import com.financeapp.paymentmethod.dto.PaymentMethodResponse;
import com.financeapp.support.AbstractIntegrationTest;
import com.financeapp.transaction.dto.TransactionRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReportControllerIntegrationTest extends AbstractIntegrationTest {

    private record Fixture(Session session, AccountResponse checking, AccountResponse creditCard,
                            CategoryResponse expense, CategoryResponse income, PaymentMethodResponse pix,
                            PaymentMethodResponse cash) {
    }

    private Fixture setUpFixture(String emailSeed) throws Exception {
        Session session = registerAndLogin(emailSeed + "@example.com", "senha1234");
        AccountResponse checking = createAccount(session, "Conta Corrente", AccountType.CHECKING, BigDecimal.valueOf(1000));
        AccountResponse creditCard = createAccount(session, "Cartão de Crédito", AccountType.CREDIT_CARD, BigDecimal.ZERO);
        CategoryResponse expense = createCategory(session, "Alimentação", TransactionType.EXPENSE);
        CategoryResponse income = createCategory(session, "Salário", TransactionType.INCOME);
        PaymentMethodResponse pix = createPaymentMethod(session, "PIX");
        PaymentMethodResponse cash = createPaymentMethod(session, "Dinheiro");
        return new Fixture(session, checking, creditCard, expense, income, pix, cash);
    }

    private void createTx(Fixture f, TransactionType type, LocalDate date, String amount, AccountResponse account,
                           PaymentMethodResponse paymentMethod) throws Exception {
        CategoryResponse category = type == TransactionType.INCOME ? f.income() : f.expense();
        createTransaction(f.session(), new TransactionRequest("Lançamento", new BigDecimal(amount), type, date,
                category.id(), account.id(), paymentMethod.id(), null));
    }

    // ---------- validação de período ----------

    @Test
    void summary_toNotAfterFrom_returns400() throws Exception {
        Fixture f = setUpFixture("rep-period-invalid");
        mockMvc.perform(authed(get("/api/reports/summary")
                        .param("from", "2026-08-10").param("to", "2026-08-01"), f.session()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void summary_periodLongerThan5Years_returns400() throws Exception {
        Fixture f = setUpFixture("rep-period-toolong");
        mockMvc.perform(authed(get("/api/reports/summary")
                        .param("from", "2020-01-01").param("to", "2026-01-02"), f.session()))
                .andExpect(status().isBadRequest());
    }

    // ---------- summary ----------

    @Test
    void summary_emptyPeriod_returnsZeros() throws Exception {
        Fixture f = setUpFixture("rep-summary-empty");
        mockMvc.perform(authed(get("/api/reports/summary")
                        .param("from", "2026-08-01").param("to", "2026-09-01"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").value(0))
                .andExpect(jsonPath("$.totalExpenses").value(0))
                .andExpect(jsonPath("$.netResult").value(0))
                .andExpect(jsonPath("$.transactionCount").value(0));
    }

    @Test
    void summary_calculatesTotalsNetResultAndAverages() throws Exception {
        Fixture f = setUpFixture("rep-summary");
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 8, 5), "1000.00", f.checking(), f.pix());
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 8, 6), "2000.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 7), "300.00", f.checking(), f.cash());

        mockMvc.perform(authed(get("/api/reports/summary")
                        .param("from", "2026-08-01").param("to", "2026-09-01"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").value(3000.00))
                .andExpect(jsonPath("$.totalExpenses").value(300.00))
                .andExpect(jsonPath("$.netResult").value(2700.00))
                .andExpect(jsonPath("$.transactionCount").value(3))
                .andExpect(jsonPath("$.averageIncome").value(1500.00))
                .andExpect(jsonPath("$.averageExpense").value(300.00));
    }

    // ---------- income-vs-expense ----------

    @Test
    void incomeVsExpense_day_respectsHalfOpenBoundariesAndFillsZeroDays() throws Exception {
        Fixture f = setUpFixture("rep-series-day");
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 7, 31), "999.00", f.checking(), f.pix()); // antes do período
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 8, 1), "100.00", f.checking(), f.pix()); // from, incluído
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 7), "50.00", f.checking(), f.cash()); // último dia incluído
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 8), "999.00", f.checking(), f.cash()); // to, excluído

        mockMvc.perform(authed(get("/api/reports/income-vs-expense")
                        .param("from", "2026-08-01").param("to", "2026-08-08").param("granularity", "DAY"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7))
                .andExpect(jsonPath("$[0].period").value("2026-08-01"))
                .andExpect(jsonPath("$[0].income").value(100.00))
                .andExpect(jsonPath("$[1].income").value(0))
                .andExpect(jsonPath("$[1].expense").value(0))
                .andExpect(jsonPath("$[6].period").value("2026-08-07"))
                .andExpect(jsonPath("$[6].expense").value(50.00));
    }

    @Test
    void incomeVsExpense_month_aggregatesAcrossCalendarMonths() throws Exception {
        Fixture f = setUpFixture("rep-series-month");
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 7, 20), "100.00", f.checking(), f.pix());
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 8, 5), "200.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 25), "50.00", f.checking(), f.cash());

        mockMvc.perform(authed(get("/api/reports/income-vs-expense")
                        .param("from", "2026-07-15").param("to", "2026-09-15").param("granularity", "MONTH"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].period").value("2026-07"))
                .andExpect(jsonPath("$[0].income").value(100.00))
                .andExpect(jsonPath("$[1].period").value("2026-08"))
                .andExpect(jsonPath("$[1].income").value(200.00))
                .andExpect(jsonPath("$[1].expense").value(50.00))
                .andExpect(jsonPath("$[2].period").value("2026-09"))
                .andExpect(jsonPath("$[2].income").value(0));
    }

    // ---------- categoria ----------

    @Test
    void expensesByCategory_calculatesPercentageAndExcludesOtherUser() throws Exception {
        Fixture f = setUpFixture("rep-cat-expense");
        Fixture other = setUpFixture("rep-cat-expense-other");
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 5), "300.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 6), "100.00", f.checking(), f.cash());
        createTx(other, TransactionType.EXPENSE, LocalDate.of(2026, 8, 5), "5000.00", other.checking(), other.pix());

        mockMvc.perform(authed(get("/api/reports/expenses-by-category")
                        .param("from", "2026-08-01").param("to", "2026-09-01"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].amount").value(400.00))
                .andExpect(jsonPath("$[0].percentage").value(100.0));
    }

    @Test
    void incomeByCategory_onlyIncludesIncomeTransactions() throws Exception {
        Fixture f = setUpFixture("rep-cat-income");
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 8, 5), "1000.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 5), "999.00", f.checking(), f.pix());

        mockMvc.perform(authed(get("/api/reports/income-by-category")
                        .param("from", "2026-08-01").param("to", "2026-09-01"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].categoryName").value("Salário"))
                .andExpect(jsonPath("$[0].amount").value(1000.00));
    }

    // ---------- fluxo por conta ----------

    @Test
    void accountsFlow_includesCreditCardUnlikeDashboardBalance() throws Exception {
        Fixture f = setUpFixture("rep-account-flow");
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 8, 5), "1000.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 6), "300.00", f.checking(), f.cash());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 7), "500.00", f.creditCard(), f.cash());

        // findAllByUserIdOrderByNameAsc: "Cartão de Crédito" vem antes de "Conta Corrente" (a < o no 2º caractere).
        mockMvc.perform(authed(get("/api/reports/accounts-flow")
                        .param("from", "2026-08-01").param("to", "2026-09-01"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].accountName").value("Cartão de Crédito"))
                .andExpect(jsonPath("$[0].netFlow").value(-500.00))
                .andExpect(jsonPath("$[1].accountName").value("Conta Corrente"))
                .andExpect(jsonPath("$[1].netFlow").value(700.00));
    }

    // ---------- evolução de saldo ----------

    @Test
    void balanceEvolution_excludesCreditCardAndCarriesBalanceForward() throws Exception {
        Fixture f = setUpFixture("rep-balance");
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 7, 1), "500.00", f.checking(), f.pix()); // antes do período
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 1), "200.00", f.checking(), f.cash());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 1), "1000.00", f.creditCard(), f.cash()); // excluído

        mockMvc.perform(authed(get("/api/reports/balance-evolution")
                        .param("from", "2026-08-01").param("to", "2026-08-03"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].date").value("2026-08-01"))
                .andExpect(jsonPath("$[0].balance").value(1300.00))
                .andExpect(jsonPath("$[1].date").value("2026-08-02"))
                .andExpect(jsonPath("$[1].balance").value(1300.00));
    }

    // ---------- comparativo mensal ----------

    @Test
    void monthlyComparison_returnsRequestedMonthCountInChronologicalOrder() throws Exception {
        Fixture f = setUpFixture("rep-monthly");
        mockMvc.perform(authed(get("/api/reports/monthly-comparison").param("months", "3"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    @Test
    void monthlyComparison_monthsAboveLimit_returns400() throws Exception {
        Fixture f = setUpFixture("rep-monthly-limit");
        mockMvc.perform(authed(get("/api/reports/monthly-comparison").param("months", "25"), f.session()))
                .andExpect(status().isBadRequest());
    }

    // ---------- top transações ----------

    @Test
    void topExpenses_ordersByAmountDescAndRespectsLimit() throws Exception {
        Fixture f = setUpFixture("rep-top-expenses");
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 1), "50.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 2), "500.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 3), "200.00", f.checking(), f.pix());
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 8, 4), "9000.00", f.checking(), f.pix());

        mockMvc.perform(authed(get("/api/reports/top-expenses")
                        .param("from", "2026-08-01").param("to", "2026-09-01").param("limit", "2"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].amount").value(500.00))
                .andExpect(jsonPath("$[1].amount").value(200.00));
    }

    @Test
    void topIncome_returnsOnlyIncomeTransactions() throws Exception {
        Fixture f = setUpFixture("rep-top-income");
        createTx(f, TransactionType.INCOME, LocalDate.of(2026, 8, 1), "3000.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 2), "9999.00", f.checking(), f.pix());

        mockMvc.perform(authed(get("/api/reports/top-income")
                        .param("from", "2026-08-01").param("to", "2026-09-01"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].type").value("INCOME"))
                .andExpect(jsonPath("$[0].amount").value(3000.00));
    }

    // ---------- métodos de pagamento ----------

    @Test
    void paymentMethods_calculatesAmountPercentageAndCount() throws Exception {
        Fixture f = setUpFixture("rep-payment-methods");
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 1), "300.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 2), "100.00", f.checking(), f.pix());
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 3), "100.00", f.checking(), f.cash());

        mockMvc.perform(authed(get("/api/reports/payment-methods")
                        .param("from", "2026-08-01").param("to", "2026-09-01"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].paymentMethodName").value("PIX"))
                .andExpect(jsonPath("$[0].amount").value(400.00))
                .andExpect(jsonPath("$[0].transactionCount").value(2))
                .andExpect(jsonPath("$[0].percentage").value(80.0))
                .andExpect(jsonPath("$[1].paymentMethodName").value("Dinheiro"))
                .andExpect(jsonPath("$[1].transactionCount").value(1));
    }

    // ---------- ownership ----------

    @Test
    void reports_neverIncludeOtherUsersTransactions() throws Exception {
        Fixture f = setUpFixture("rep-ownership");
        Fixture other = setUpFixture("rep-ownership-other");
        createTx(other, TransactionType.INCOME, LocalDate.of(2026, 8, 5), "50000.00", other.checking(), other.pix());

        mockMvc.perform(authed(get("/api/reports/summary")
                        .param("from", "2026-08-01").param("to", "2026-09-01"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").value(0));
    }

    // ---------- export CSV ----------

    @Test
    void exportCsv_returnsTransactionsAsCsvWithHeaderAndAttachment() throws Exception {
        Fixture f = setUpFixture("rep-csv");
        createTx(f, TransactionType.EXPENSE, LocalDate.of(2026, 8, 5), "123.45", f.checking(), f.pix());

        mockMvc.perform(authed(get("/api/reports/export.csv")
                        .param("from", "2026-08-01").param("to", "2026-09-01"), f.session()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"relatorio-transacoes.csv\""))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Data,Tipo,Descrição,Categoria,Conta,Método de pagamento,Valor")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("123.45")));
    }

    @Test
    void exportCsv_withCategoryFromAnotherUser_returns404() throws Exception {
        Fixture f = setUpFixture("rep-csv-cross");
        Fixture other = setUpFixture("rep-csv-cross-other");

        mockMvc.perform(authed(get("/api/reports/export.csv")
                        .param("from", "2026-08-01").param("to", "2026-09-01")
                        .param("categoryId", String.valueOf(other.expense().id())), f.session()))
                .andExpect(status().isNotFound());
    }
}
