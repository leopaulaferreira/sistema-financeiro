package com.financeapp.recurring;

import com.financeapp.account.dto.AccountResponse;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
import com.financeapp.paymentmethod.dto.PaymentMethodResponse;
import com.financeapp.recurring.dto.RecurringTransactionCreateRequest;
import com.financeapp.recurring.dto.RecurringTransactionResponse;
import com.financeapp.recurring.dto.RecurringTransactionUpdateRequest;
import com.financeapp.support.AbstractIntegrationTest;
import com.financeapp.transaction.Transaction;
import com.financeapp.transaction.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RecurringTransactionControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private RecurringTransactionRepository recurringTransactionRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private RecurringTransactionProcessor processor;

    private record Fixture(Session session, AccountResponse account, CategoryResponse income,
                            CategoryResponse expense, PaymentMethodResponse paymentMethod) {
    }

    private Fixture setUpFixture(String emailSeed) throws Exception {
        Session session = registerAndLogin(emailSeed + "@example.com", "senha1234");
        AccountResponse account = createAccount(session, "Conta Principal");
        CategoryResponse income = createCategory(session, "Salário", TransactionType.INCOME);
        CategoryResponse expense = createCategory(session, "Assinaturas", TransactionType.EXPENSE);
        PaymentMethodResponse paymentMethod = createPaymentMethod(session, "Cartão");
        return new Fixture(session, account, income, expense, paymentMethod);
    }

    private RecurringTransactionCreateRequest requestFor(Fixture f, TransactionType type, RecurrenceFrequency frequency,
                                                           LocalDate startDate, LocalDate endDate) {
        Long categoryId = type == TransactionType.INCOME ? f.income().id() : f.expense().id();
        return new RecurringTransactionCreateRequest("Netflix", BigDecimal.valueOf(39.90), type, categoryId,
                f.account().id(), f.paymentMethod().id(), frequency, startDate, endDate);
    }

    // ---------- CRUD ----------

    @Test
    void create_returns201_withNextExecutionEqualToStartDate() throws Exception {
        Fixture f = setUpFixture("rt-create");
        LocalDate start = LocalDate.now().plusDays(5);
        RecurringTransactionCreateRequest request = requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.MONTHLY, start, null);

        mockMvc.perform(authed(post("/api/recurring-transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nextExecutionDate").value(start.toString()))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.account.name").value("Conta Principal"));
    }

    @Test
    void create_withNonPositiveAmount_returns400() throws Exception {
        Fixture f = setUpFixture("rt-badamount");
        RecurringTransactionCreateRequest request = new RecurringTransactionCreateRequest("Ruim", BigDecimal.ZERO,
                TransactionType.EXPENSE, f.expense().id(), f.account().id(), f.paymentMethod().id(),
                RecurrenceFrequency.MONTHLY, LocalDate.now(), null);

        mockMvc.perform(authed(post("/api/recurring-transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_withIncompatibleCategoryType_returns400() throws Exception {
        Fixture f = setUpFixture("rt-incompatible");
        RecurringTransactionCreateRequest request = new RecurringTransactionCreateRequest("Errado", BigDecimal.TEN,
                TransactionType.EXPENSE, f.income().id(), f.account().id(), f.paymentMethod().id(),
                RecurrenceFrequency.MONTHLY, LocalDate.now(), null);

        mockMvc.perform(authed(post("/api/recurring-transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_withEndDateBeforeStartDate_returns400() throws Exception {
        Fixture f = setUpFixture("rt-baddates");
        LocalDate start = LocalDate.now();
        RecurringTransactionCreateRequest request = requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.MONTHLY,
                start, start.minusDays(1));

        mockMvc.perform(authed(post("/api/recurring-transactions"), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_withAnotherUsersAccount_returns404() throws Exception {
        Fixture owner = setUpFixture("rt-accowner");
        Fixture intruder = setUpFixture("rt-accintruder");

        RecurringTransactionCreateRequest request = new RecurringTransactionCreateRequest("Invasão", BigDecimal.TEN,
                TransactionType.EXPENSE, intruder.expense().id(), owner.account().id(), intruder.paymentMethod().id(),
                RecurrenceFrequency.MONTHLY, LocalDate.now(), null);

        mockMvc.perform(authed(post("/api/recurring-transactions"), intruder.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void accessingAnotherUsersRecurringTransaction_returns404() throws Exception {
        Fixture owner = setUpFixture("rt-privowner");
        RecurringTransactionResponse created = createRecurringTransaction(owner.session(),
                requestFor(owner, TransactionType.EXPENSE, RecurrenceFrequency.MONTHLY, LocalDate.now(), null));

        Fixture intruder = setUpFixture("rt-privintruder");

        mockMvc.perform(authed(get("/api/recurring-transactions/" + created.id()), intruder.session()))
                .andExpect(status().isNotFound());
    }

    @Test
    void list_filtersByActiveAndType() throws Exception {
        Fixture f = setUpFixture("rt-list");
        RecurringTransactionResponse expense = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.MONTHLY, LocalDate.now(), null));
        createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.INCOME, RecurrenceFrequency.MONTHLY, LocalDate.now(), null));

        deactivate(f.session(), expense);

        mockMvc.perform(authed(get("/api/recurring-transactions").queryParam("type", "INCOME"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].type").value("INCOME"));

        mockMvc.perform(authed(get("/api/recurring-transactions").queryParam("active", "false"), f.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(expense.id()));
    }

    @Test
    void deletingRecurringTransaction_doesNotRemoveGeneratedTransactions() throws Exception {
        Fixture f = setUpFixture("rt-delete");
        RecurringTransactionResponse recurring = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.DAILY, LocalDate.now().minusDays(2), null));
        processor.processDue();
        List<Transaction> generated = transactionRepository.findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(recurring.id());
        assertThat(generated).isNotEmpty();

        mockMvc.perform(authed(delete("/api/recurring-transactions/" + recurring.id()), f.session()))
                .andExpect(status().isNoContent());

        for (Transaction t : generated) {
            assertThat(transactionRepository.findById(t.getId())).isPresent();
        }
    }

    @Test
    void editingRecurringTransaction_doesNotChangeAlreadyGeneratedTransactions() throws Exception {
        Fixture f = setUpFixture("rt-edit-history");
        RecurringTransactionResponse recurring = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.DAILY, LocalDate.now().minusDays(1), null));
        processor.processDue();
        List<Transaction> before = transactionRepository.findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(recurring.id());
        assertThat(before).isNotEmpty();
        BigDecimal originalAmount = before.get(0).getAmount();

        RecurringTransactionUpdateRequest update = new RecurringTransactionUpdateRequest("Netflix Premium",
                BigDecimal.valueOf(44.90), f.expense().id(), f.account().id(), f.paymentMethod().id(),
                RecurrenceFrequency.DAILY, recurring.startDate(), null, true);
        mockMvc.perform(authed(put("/api/recurring-transactions/" + recurring.id()), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(44.90));

        Transaction reloaded = transactionRepository.findById(before.get(0).getId()).orElseThrow();
        assertThat(reloaded.getAmount()).isEqualByComparingTo(originalAmount);
        assertThat(reloaded.getDescription()).isEqualTo("Netflix");
    }

    @Test
    void changingStartDateAfterGeneration_returns400() throws Exception {
        Fixture f = setUpFixture("rt-startdate-locked");
        RecurringTransactionResponse recurring = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.DAILY, LocalDate.now().minusDays(1), null));
        processor.processDue();

        RecurringTransactionUpdateRequest update = new RecurringTransactionUpdateRequest("Netflix",
                BigDecimal.valueOf(39.90), f.expense().id(), f.account().id(), f.paymentMethod().id(),
                RecurrenceFrequency.DAILY, recurring.startDate().plusDays(1), null, true);

        mockMvc.perform(authed(put("/api/recurring-transactions/" + recurring.id()), f.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(update)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deletingAccountUsedByRecurringTransaction_returns409() throws Exception {
        Fixture f = setUpFixture("rt-account-inuse");
        createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.MONTHLY, LocalDate.now(), null));

        mockMvc.perform(authed(delete("/api/accounts/" + f.account().id()), f.session()))
                .andExpect(status().isConflict());
    }

    // ---------- Processador: catch-up, idempotência, pausa, endDate ----------

    @Test
    void processor_generatesTransactionForDueRecurrence() throws Exception {
        Fixture f = setUpFixture("rt-proc-basic");
        RecurringTransactionResponse recurring = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.MONTHLY, LocalDate.now(), null));

        processor.processDue();

        List<Transaction> generated = transactionRepository.findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(recurring.id());
        assertThat(generated).hasSize(1);
        assertThat(generated.get(0).getRecurrenceDate()).isEqualTo(recurring.startDate());
    }

    @Test
    void processor_catchesUpMultipleMissedDailyOccurrences() throws Exception {
        Fixture f = setUpFixture("rt-proc-catchup");
        LocalDate start = LocalDate.now().minusDays(5);
        RecurringTransactionResponse recurring = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.DAILY, start, null));

        processor.processDue();

        List<Transaction> generated = transactionRepository.findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(recurring.id());
        assertThat(generated).hasSize(6); // start .. hoje, inclusive
        assertThat(generated.get(0).getRecurrenceDate()).isEqualTo(start);
        assertThat(generated.get(5).getRecurrenceDate()).isEqualTo(LocalDate.now());
    }

    @Test
    void processor_runningTwice_doesNotDuplicateTransactions() throws Exception {
        Fixture f = setUpFixture("rt-proc-idempotent");
        RecurringTransactionResponse recurring = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.DAILY, LocalDate.now().minusDays(3), null));

        processor.processDue();
        int afterFirstRun = transactionRepository.findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(recurring.id()).size();
        processor.processDue();
        int afterSecondRun = transactionRepository.findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(recurring.id()).size();

        assertThat(afterFirstRun).isEqualTo(4);
        assertThat(afterSecondRun).isEqualTo(afterFirstRun);
    }

    @Test
    void processor_skipsInactiveRecurrence() throws Exception {
        Fixture f = setUpFixture("rt-proc-inactive");
        RecurringTransactionResponse recurring = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.DAILY, LocalDate.now().minusDays(3), null));
        deactivate(f.session(), recurring);

        processor.processDue();

        assertThat(transactionRepository.findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(recurring.id())).isEmpty();
    }

    @Test
    void processor_stopsAtEndDate() throws Exception {
        Fixture f = setUpFixture("rt-proc-enddate");
        LocalDate start = LocalDate.now().minusDays(5);
        LocalDate end = LocalDate.now().minusDays(2);
        RecurringTransactionResponse recurring = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.DAILY, start, end));

        processor.processDue();

        List<Transaction> generated = transactionRepository.findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(recurring.id());
        assertThat(generated).hasSize(4); // start..end, inclusive
        assertThat(generated.get(generated.size() - 1).getRecurrenceDate()).isEqualTo(end);
    }

    @Test
    void reactivating_repositionsNextExecutionToTodayInsteadOfGeneratingBacklog() throws Exception {
        Fixture f = setUpFixture("rt-reactivate");
        RecurringTransactionResponse recurring = createRecurringTransaction(f.session(),
                requestFor(f, TransactionType.EXPENSE, RecurrenceFrequency.DAILY, LocalDate.now().minusDays(10), null));

        deactivate(f.session(), recurring);
        RecurringTransactionResponse reactivated = setActive(f.session(), recurring, true);

        assertThat(reactivated.nextExecutionDate()).isEqualTo(LocalDate.now());

        processor.processDue();
        List<Transaction> generated = transactionRepository.findAllByRecurringTransactionIdOrderByRecurrenceDateAsc(recurring.id());
        assertThat(generated).hasSize(1);
        assertThat(generated.get(0).getRecurrenceDate()).isEqualTo(LocalDate.now());
    }

    // ---------- helpers ----------

    private void deactivate(Session session, RecurringTransactionResponse recurring) throws Exception {
        setActive(session, recurring, false);
    }

    private RecurringTransactionResponse setActive(Session session, RecurringTransactionResponse recurring, boolean active)
            throws Exception {
        RecurringTransactionUpdateRequest update = new RecurringTransactionUpdateRequest(recurring.description(),
                recurring.amount(), recurring.category().id(), recurring.account().id(), recurring.paymentMethod().id(),
                recurring.frequency(), recurring.startDate(), recurring.endDate(), active);
        var result = mockMvc.perform(authed(put("/api/recurring-transactions/" + recurring.id()), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(update)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsByteArray(), RecurringTransactionResponse.class);
    }
}
