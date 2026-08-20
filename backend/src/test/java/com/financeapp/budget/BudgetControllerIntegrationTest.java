package com.financeapp.budget;

import com.financeapp.account.dto.AccountResponse;
import com.financeapp.budget.dto.BudgetResponse;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
import com.financeapp.paymentmethod.dto.PaymentMethodResponse;
import com.financeapp.support.AbstractIntegrationTest;
import com.financeapp.transaction.dto.TransactionRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class BudgetControllerIntegrationTest extends AbstractIntegrationTest {

    private record Fixture(Session session, AccountResponse account, CategoryResponse expense,
                            CategoryResponse income, PaymentMethodResponse paymentMethod) {
    }

    private Fixture setUpFixture(String emailSeed) throws Exception {
        Session session = registerAndLogin(emailSeed + "@example.com", "senha1234");
        AccountResponse account = createAccount(session, "Conta Principal");
        CategoryResponse expense = createCategory(session, "Alimentação", TransactionType.EXPENSE);
        CategoryResponse income = createCategory(session, "Salário", TransactionType.INCOME);
        PaymentMethodResponse paymentMethod = createPaymentMethod(session, "Cartão");
        return new Fixture(session, account, expense, income, paymentMethod);
    }

    private String createBudgetJson(Long categoryId, int year, int month, String amount) {
        return """
                {"categoryId": %d, "year": %d, "month": %d, "amount": %s}
                """.formatted(categoryId, year, month, amount);
    }

    private void createExpense(Fixture f, LocalDate date, String amount) throws Exception {
        createTransaction(f.session(), new TransactionRequest("Compra", new BigDecimal(amount),
                TransactionType.EXPENSE, date, f.expense().id(), f.account().id(), f.paymentMethod().id(), null));
    }

    // ---------- CRUD ----------

    @Test
    void create_returns201_withZeroSpentWhenNoTransactions() throws Exception {
        Fixture f = setUpFixture("bud-create");
        YearMonth period = YearMonth.now();

        mockMvc.perform(authed(post("/api/budgets"), f.session())
                        .contentType(APPLICATION_JSON)
                        .content(createBudgetJson(f.expense().id(), period.getYear(), period.getMonthValue(), "800.00")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.spent").value(0))
                .andExpect(jsonPath("$.remaining").value(800.00))
                .andExpect(jsonPath("$.percentageUsed").value(0))
                .andExpect(jsonPath("$.status").value("SAFE"))
                .andExpect(jsonPath("$.category.name").value("Alimentação"));
    }

    @Test
    void create_withIncomeCategory_returns400() throws Exception {
        Fixture f = setUpFixture("bud-income-cat");
        YearMonth period = YearMonth.now();

        mockMvc.perform(authed(post("/api/budgets"), f.session())
                        .contentType(APPLICATION_JSON)
                        .content(createBudgetJson(f.income().id(), period.getYear(), period.getMonthValue(), "800.00")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_withCategoryFromAnotherUser_returns404() throws Exception {
        Fixture f = setUpFixture("bud-cross-cat");
        Fixture other = setUpFixture("bud-cross-cat-other");
        YearMonth period = YearMonth.now();

        mockMvc.perform(authed(post("/api/budgets"), f.session())
                        .contentType(APPLICATION_JSON)
                        .content(createBudgetJson(other.expense().id(), period.getYear(), period.getMonthValue(), "800.00")))
                .andExpect(status().isNotFound());
    }

    @Test
    void create_withNonPositiveAmount_returns400() throws Exception {
        Fixture f = setUpFixture("bud-badamount");
        YearMonth period = YearMonth.now();

        mockMvc.perform(authed(post("/api/budgets"), f.session())
                        .contentType(APPLICATION_JSON)
                        .content(createBudgetJson(f.expense().id(), period.getYear(), period.getMonthValue(), "0")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_withInvalidMonth_returns400() throws Exception {
        Fixture f = setUpFixture("bud-badmonth");

        mockMvc.perform(authed(post("/api/budgets"), f.session())
                        .contentType(APPLICATION_JSON)
                        .content(createBudgetJson(f.expense().id(), 2026, 13, "800.00")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_duplicateSameCategoryPeriod_returns409() throws Exception {
        Fixture f = setUpFixture("bud-dup");
        YearMonth period = YearMonth.now();
        mockMvc.perform(authed(post("/api/budgets"), f.session())
                        .contentType(APPLICATION_JSON)
                        .content(createBudgetJson(f.expense().id(), period.getYear(), period.getMonthValue(), "800.00")))
                .andExpect(status().isCreated());

        mockMvc.perform(authed(post("/api/budgets"), f.session())
                        .contentType(APPLICATION_JSON)
                        .content(createBudgetJson(f.expense().id(), period.getYear(), period.getMonthValue(), "500.00")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Já existe um orçamento para esta categoria neste período."));
    }

    @Test
    void get_withBudgetFromAnotherUser_returns404() throws Exception {
        Fixture f = setUpFixture("bud-get-cross");
        Fixture other = setUpFixture("bud-get-cross-other");
        YearMonth period = YearMonth.now();
        Long budgetId = createBudget(f, period.getYear(), period.getMonthValue(), "800.00");

        mockMvc.perform(authed(get("/api/budgets/" + budgetId), other.session()))
                .andExpect(status().isNotFound());
    }

    @Test
    void update_changesAmount() throws Exception {
        Fixture f = setUpFixture("bud-update");
        YearMonth period = YearMonth.now();
        Long budgetId = createBudget(f, period.getYear(), period.getMonthValue(), "800.00");

        mockMvc.perform(authed(put("/api/budgets/" + budgetId), f.session())
                        .contentType(APPLICATION_JSON)
                        .content(createBudgetJson(f.expense().id(), period.getYear(), period.getMonthValue(), "1000.00")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(1000.00));
    }

    @Test
    void delete_removesBudget() throws Exception {
        Fixture f = setUpFixture("bud-delete");
        YearMonth period = YearMonth.now();
        Long budgetId = createBudget(f, period.getYear(), period.getMonthValue(), "800.00");

        mockMvc.perform(authed(delete("/api/budgets/" + budgetId), f.session()))
                .andExpect(status().isNoContent());
        mockMvc.perform(authed(get("/api/budgets/" + budgetId), f.session()))
                .andExpect(status().isNotFound());
    }

    // ---------- listagem sem year/month ----------

    @Test
    void list_withoutYearMonth_defaultsToCurrentPeriod() throws Exception {
        Fixture f = setUpFixture("bud-list-default");
        YearMonth current = YearMonth.now();
        YearMonth other = current.plusMonths(2);
        createBudget(f, current.getYear(), current.getMonthValue(), "800.00");
        createBudget(f, other.getYear(), other.getMonthValue(), "500.00");

        mockMvc.perform(authed(get("/api/budgets"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].month").value(current.getMonthValue()));
    }

    // ---------- cálculo de spent/status ----------

    @Test
    void spent_onlyCountsExpenseTransactionsOfSameCategoryWithinMonth() throws Exception {
        Fixture f = setUpFixture("bud-spent-scope");
        YearMonth period = YearMonth.now();
        LocalDate inMonth = LocalDate.of(period.getYear(), period.getMonthValue(), 10);
        LocalDate nextMonth = inMonth.plusMonths(1);
        Long budgetId = createBudget(f, period.getYear(), period.getMonthValue(), "800.00");

        createExpense(f, inMonth, "100.00");
        // fora do mês
        createExpense(f, nextMonth, "999.00");
        // receita não entra
        createTransaction(f.session(), new TransactionRequest("Salário", new BigDecimal("5000.00"),
                TransactionType.INCOME, inMonth, f.income().id(), f.account().id(), f.paymentMethod().id(), null));
        // outra categoria de despesa não entra
        CategoryResponse otherExpense = createCategory(f.session(), "Lazer", TransactionType.EXPENSE);
        createTransaction(f.session(), new TransactionRequest("Cinema", new BigDecimal("50.00"),
                TransactionType.EXPENSE, inMonth, otherExpense.id(), f.account().id(), f.paymentMethod().id(), null));
        // outro usuário não entra
        Fixture other = setUpFixture("bud-spent-scope-other");
        createExpense(other, inMonth, "300.00");

        mockMvc.perform(authed(get("/api/budgets/" + budgetId), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spent").value(100.00))
                .andExpect(jsonPath("$.remaining").value(700.00))
                .andExpect(jsonPath("$.percentageUsed").value(12.50))
                .andExpect(jsonPath("$.status").value("SAFE"));
    }

    @Test
    void status_isWarningAt80Percent() throws Exception {
        Fixture f = setUpFixture("bud-warning");
        YearMonth period = YearMonth.now();
        LocalDate inMonth = LocalDate.of(period.getYear(), period.getMonthValue(), 5);
        Long budgetId = createBudget(f, period.getYear(), period.getMonthValue(), "100.00");
        createExpense(f, inMonth, "80.00");

        mockMvc.perform(authed(get("/api/budgets/" + budgetId), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WARNING"));
    }

    @Test
    void status_isExceededAbove100Percent_andPercentageIsNotCapped() throws Exception {
        Fixture f = setUpFixture("bud-exceeded");
        YearMonth period = YearMonth.now();
        LocalDate inMonth = LocalDate.of(period.getYear(), period.getMonthValue(), 5);
        Long budgetId = createBudget(f, period.getYear(), period.getMonthValue(), "100.00");
        createExpense(f, inMonth, "125.00");

        mockMvc.perform(authed(get("/api/budgets/" + budgetId), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXCEEDED"))
                .andExpect(jsonPath("$.percentageUsed").value(125.00))
                .andExpect(jsonPath("$.remaining").value(-25.00));
    }

    // ---------- categoria em uso ----------

    @Test
    void deleteCategory_withBudgetLinked_returns409() throws Exception {
        Fixture f = setUpFixture("bud-cat-inuse");
        YearMonth period = YearMonth.now();
        createBudget(f, period.getYear(), period.getMonthValue(), "800.00");

        mockMvc.perform(authed(delete("/api/categories/" + f.expense().id()), f.session()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Não é possível excluir uma categoria com orçamentos vinculados"));
    }

    private Long createBudget(Fixture f, int year, int month, String amount) throws Exception {
        var result = mockMvc.perform(authed(post("/api/budgets"), f.session())
                        .contentType(APPLICATION_JSON)
                        .content(createBudgetJson(f.expense().id(), year, month, amount)))
                .andExpect(status().isCreated())
                .andReturn();
        BudgetResponse response = objectMapper.readValue(result.getResponse().getContentAsByteArray(), BudgetResponse.class);
        return response.id();
    }
}
