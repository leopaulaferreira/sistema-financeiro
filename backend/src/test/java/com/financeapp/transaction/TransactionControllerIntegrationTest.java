package com.financeapp.transaction;

import com.financeapp.account.dto.AccountResponse;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
import com.financeapp.paymentmethod.dto.PaymentMethodResponse;
import com.financeapp.support.AbstractIntegrationTest;
import com.financeapp.transaction.dto.TransactionRequest;
import com.financeapp.transaction.dto.TransactionResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TransactionControllerIntegrationTest extends AbstractIntegrationTest {

    private record Fixture(Session session, AccountResponse account, CategoryResponse income,
                            CategoryResponse expense, PaymentMethodResponse paymentMethod) {
    }

    private Fixture setUpFixture(String emailSeed) throws Exception {
        Session session = registerAndLogin(emailSeed + "@example.com", "senha1234");
        AccountResponse account = createAccount(session, "Conta Principal");
        CategoryResponse income = createCategory(session, "Salário", TransactionType.INCOME);
        CategoryResponse expense = createCategory(session, "Alimentação", TransactionType.EXPENSE);
        PaymentMethodResponse paymentMethod = createPaymentMethod(session, "Pix");
        return new Fixture(session, account, income, expense, paymentMethod);
    }

    private TransactionRequest requestFor(Fixture f, TransactionType type, BigDecimal amount, LocalDate date) {
        Long categoryId = type == TransactionType.INCOME ? f.income().id() : f.expense().id();
        return new TransactionRequest("Lançamento " + type, amount, type, date, categoryId, f.account().id(),
                f.paymentMethod().id(), "obs");
    }

    @Test
    void createIncome_returns201() throws Exception {
        Fixture f = setUpFixture("tx-income");
        TransactionRequest request = requestFor(f, TransactionType.INCOME, BigDecimal.valueOf(3000), LocalDate.of(2026, 8, 5));

        mockMvc.perform(authed(post("/api/transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("INCOME"))
                .andExpect(jsonPath("$.categoryName").value("Salário"))
                .andExpect(jsonPath("$.accountName").value("Conta Principal"));
    }

    @Test
    void createExpense_returns201() throws Exception {
        Fixture f = setUpFixture("tx-expense");
        TransactionRequest request = requestFor(f, TransactionType.EXPENSE, BigDecimal.valueOf(45.90), LocalDate.of(2026, 8, 6));

        mockMvc.perform(authed(post("/api/transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("EXPENSE"));
    }

    @Test
    void createWithNonPositiveAmount_returns400() throws Exception {
        Fixture f = setUpFixture("tx-badamount");
        TransactionRequest request = requestFor(f, TransactionType.EXPENSE, BigDecimal.ZERO, LocalDate.of(2026, 8, 6));

        mockMvc.perform(authed(post("/api/transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createWithIncompatibleCategoryType_returns400() throws Exception {
        Fixture f = setUpFixture("tx-incompatible");
        // categoria de INCOME usada numa transação de EXPENSE
        TransactionRequest request = new TransactionRequest("Errado", BigDecimal.TEN, TransactionType.EXPENSE,
                LocalDate.of(2026, 8, 6), f.income().id(), f.account().id(), f.paymentMethod().id(), null);

        mockMvc.perform(authed(post("/api/transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createWithAnotherUsersAccount_returns404() throws Exception {
        Fixture owner = setUpFixture("tx-accowner");
        Fixture intruder = setUpFixture("tx-accintruder");

        TransactionRequest request = new TransactionRequest("Invasão", BigDecimal.TEN, TransactionType.EXPENSE,
                LocalDate.of(2026, 8, 6), intruder.expense().id(), owner.account().id(), intruder.paymentMethod().id(), null);

        mockMvc.perform(authed(post("/api/transactions"), intruder.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void createWithAnotherUsersCategory_returns404() throws Exception {
        Fixture owner = setUpFixture("tx-catowner");
        Fixture intruder = setUpFixture("tx-catintruder");

        TransactionRequest request = new TransactionRequest("Invasão", BigDecimal.TEN, TransactionType.EXPENSE,
                LocalDate.of(2026, 8, 6), owner.expense().id(), intruder.account().id(), intruder.paymentMethod().id(), null);

        mockMvc.perform(authed(post("/api/transactions"), intruder.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void getOwnTransaction_returns200() throws Exception {
        Fixture f = setUpFixture("tx-get");
        TransactionResponse created = createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(20), LocalDate.of(2026, 8, 7));

        mockMvc.perform(authed(get("/api/transactions/" + created.id()), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(created.id()));
    }

    @Test
    void accessingAnotherUsersTransaction_returns404() throws Exception {
        Fixture owner = setUpFixture("tx-privowner");
        TransactionResponse created = createTransaction(owner, TransactionType.EXPENSE, BigDecimal.valueOf(20), LocalDate.of(2026, 8, 7));

        Fixture intruder = setUpFixture("tx-privintruder");

        mockMvc.perform(authed(get("/api/transactions/" + created.id()), intruder.session()))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateTransaction_persistsChanges() throws Exception {
        Fixture f = setUpFixture("tx-update");
        TransactionResponse created = createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(20), LocalDate.of(2026, 8, 7));

        TransactionRequest update = new TransactionRequest("Atualizada", BigDecimal.valueOf(99.90), TransactionType.EXPENSE,
                LocalDate.of(2026, 8, 9), f.expense().id(), f.account().id(), f.paymentMethod().id(), "nova obs");

        mockMvc.perform(authed(put("/api/transactions/" + created.id()), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Atualizada"))
                .andExpect(jsonPath("$.amount").value(99.90));
    }

    @Test
    void deleteTransaction_removesIt() throws Exception {
        Fixture f = setUpFixture("tx-delete");
        TransactionResponse created = createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(20), LocalDate.of(2026, 8, 7));

        mockMvc.perform(authed(delete("/api/transactions/" + created.id()), f.session()))
                .andExpect(status().isNoContent());

        mockMvc.perform(authed(get("/api/transactions/" + created.id()), f.session()))
                .andExpect(status().isNotFound());
    }

    @Test
    void filterByPeriod_returnsOnlyTransactionsWithinRange() throws Exception {
        Fixture f = setUpFixture("tx-period");
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(10), LocalDate.of(2026, 7, 15));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(20), LocalDate.of(2026, 8, 10));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(30), LocalDate.of(2026, 9, 1));

        mockMvc.perform(authed(get("/api/transactions")
                                .param("from", "2026-08-01")
                                .param("to", "2026-08-31"),
                        f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].amount").value(20));
    }

    @Test
    void filterByCategory_returnsOnlyMatchingTransactions() throws Exception {
        Fixture f = setUpFixture("tx-catfilter");
        createTransaction(f, TransactionType.INCOME, BigDecimal.valueOf(3000), LocalDate.of(2026, 8, 5));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(50), LocalDate.of(2026, 8, 6));

        mockMvc.perform(authed(get("/api/transactions").param("categoryId", f.expense().id().toString()), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].categoryName").value("Alimentação"));
    }

    @Test
    void filterByType_returnsOnlyMatchingTransactions() throws Exception {
        Fixture f = setUpFixture("tx-typefilter");
        createTransaction(f, TransactionType.INCOME, BigDecimal.valueOf(3000), LocalDate.of(2026, 8, 5));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(50), LocalDate.of(2026, 8, 6));
        createTransaction(f, TransactionType.EXPENSE, BigDecimal.valueOf(70), LocalDate.of(2026, 8, 7));

        mockMvc.perform(authed(get("/api/transactions").param("type", "EXPENSE"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void listTransactions_isPaginatedAndIsolatedBetweenUsers() throws Exception {
        Fixture owner = setUpFixture("tx-page-owner");
        for (int i = 0; i < 3; i++) {
            createTransaction(owner, TransactionType.EXPENSE, BigDecimal.valueOf(10 + i), LocalDate.of(2026, 8, 1 + i));
        }
        Fixture other = setUpFixture("tx-page-other");
        createTransaction(other, TransactionType.EXPENSE, BigDecimal.valueOf(999), LocalDate.of(2026, 8, 1));

        MvcResult result = mockMvc.perform(authed(get("/api/transactions").param("page", "0").param("size", "2"), owner.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andReturn();

        assertThat(result.getResponse().getContentAsString()).doesNotContain("999");
    }

    private TransactionResponse createTransaction(Fixture f, TransactionType type, BigDecimal amount, LocalDate date) throws Exception {
        TransactionRequest request = requestFor(f, type, amount, date);
        MvcResult result = mockMvc.perform(authed(post("/api/transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsByteArray(), TransactionResponse.class);
    }
}
