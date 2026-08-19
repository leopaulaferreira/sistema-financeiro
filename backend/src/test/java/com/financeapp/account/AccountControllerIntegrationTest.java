package com.financeapp.account;

import com.financeapp.account.dto.AccountRequest;
import com.financeapp.account.dto.AccountResponse;
import com.financeapp.account.dto.AccountUpdateRequest;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
import com.financeapp.paymentmethod.dto.PaymentMethodResponse;
import com.financeapp.support.AbstractIntegrationTest;
import com.financeapp.transaction.dto.TransactionRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccountControllerIntegrationTest extends AbstractIntegrationTest {

    @Test
    void createAccount_returns201() throws Exception {
        Session session = registerAndLogin("owner@example.com", "senha1234");
        AccountRequest request = new AccountRequest("Conta Corrente", AccountType.CHECKING, BigDecimal.valueOf(500));

        mockMvc.perform(authed(post("/api/accounts"), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Conta Corrente"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void listAccounts_returnsOnlyOwnAccounts() throws Exception {
        Session owner = registerAndLogin("owner2@example.com", "senha1234");
        createAccount(owner, "Conta do Dono");

        Session other = registerAndLogin("other2@example.com", "senha1234");
        createAccount(other, "Conta de Outro Usuário");

        mockMvc.perform(authed(get("/api/accounts"), owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Conta do Dono"));
    }

    @Test
    void updateAccount_persistsChanges() throws Exception {
        Session session = registerAndLogin("update@example.com", "senha1234");
        AccountResponse created = createAccount(session, "Conta Original");

        AccountUpdateRequest update = new AccountUpdateRequest(
                "Conta Renomeada", AccountType.SAVINGS, BigDecimal.valueOf(999), false);

        mockMvc.perform(authed(put("/api/accounts/" + created.id()), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Conta Renomeada"))
                .andExpect(jsonPath("$.type").value("SAVINGS"))
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    void accessingAnotherUsersAccount_returns404() throws Exception {
        Session owner = registerAndLogin("owner3@example.com", "senha1234");
        AccountResponse account = createAccount(owner, "Conta Privada");

        Session intruder = registerAndLogin("intruder3@example.com", "senha1234");

        mockMvc.perform(authed(get("/api/accounts/" + account.id()), intruder))
                .andExpect(status().isNotFound());

        AccountUpdateRequest update = new AccountUpdateRequest(
                "Hackeada", AccountType.WALLET, BigDecimal.ZERO, true);
        mockMvc.perform(authed(put("/api/accounts/" + account.id()), intruder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(update)))
                .andExpect(status().isNotFound());

        mockMvc.perform(authed(delete("/api/accounts/" + account.id()), intruder))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingAccountWithTransactions_returns409() throws Exception {
        Session session = registerAndLogin("inuse@example.com", "senha1234");
        AccountResponse account = createAccount(session, "Conta em Uso");
        CategoryResponse category = createCategory(session, "Salário", TransactionType.INCOME);
        PaymentMethodResponse paymentMethod = createPaymentMethod(session, "Pix");

        TransactionRequest transaction = new TransactionRequest(
                "Salário de agosto", BigDecimal.valueOf(3000), TransactionType.INCOME,
                LocalDate.of(2026, 8, 5), category.id(), account.id(), paymentMethod.id(), null);
        mockMvc.perform(authed(post("/api/transactions"), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(transaction)))
                .andExpect(status().isCreated());

        mockMvc.perform(authed(delete("/api/accounts/" + account.id()), session))
                .andExpect(status().isConflict());
    }

    @Test
    void deletingUnusedAccount_returns204() throws Exception {
        Session session = registerAndLogin("delete@example.com", "senha1234");
        AccountResponse account = createAccount(session, "Conta Descartável");

        mockMvc.perform(authed(delete("/api/accounts/" + account.id()), session))
                .andExpect(status().isNoContent());

        mockMvc.perform(authed(get("/api/accounts"), session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
