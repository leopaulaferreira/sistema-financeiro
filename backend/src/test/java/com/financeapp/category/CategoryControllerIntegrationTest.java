package com.financeapp.category;

import com.financeapp.account.dto.AccountResponse;
import com.financeapp.category.dto.CategoryRequest;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CategoryControllerIntegrationTest extends AbstractIntegrationTest {

    @Test
    void createCategory_returns201() throws Exception {
        Session session = registerAndLogin("catowner@example.com", "senha1234");
        CategoryRequest request = new CategoryRequest("Alimentação", TransactionType.EXPENSE, "#F0596B", "utensils");

        mockMvc.perform(authed(post("/api/categories"), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Alimentação"))
                .andExpect(jsonPath("$.type").value("EXPENSE"));
    }

    @Test
    void listCategories_isIsolatedBetweenUsers() throws Exception {
        Session owner = registerAndLogin("catowner2@example.com", "senha1234");
        createCategory(owner, "Salário", TransactionType.INCOME);

        Session other = registerAndLogin("catother2@example.com", "senha1234");
        createCategory(other, "Moradia", TransactionType.EXPENSE);

        mockMvc.perform(authed(get("/api/categories"), owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Salário"));
    }

    @Test
    void accessingAnotherUsersCategory_returns404() throws Exception {
        Session owner = registerAndLogin("catowner3@example.com", "senha1234");
        CategoryResponse category = createCategory(owner, "Lazer", TransactionType.EXPENSE);

        Session intruder = registerAndLogin("catintruder3@example.com", "senha1234");

        mockMvc.perform(authed(get("/api/categories/" + category.id()), intruder))
                .andExpect(status().isNotFound());
    }

    @Test
    void creatingTransactionWithAnotherUsersCategory_returns404() throws Exception {
        Session owner = registerAndLogin("catowner4@example.com", "senha1234");
        CategoryResponse foreignCategory = createCategory(owner, "Transporte", TransactionType.EXPENSE);

        Session intruder = registerAndLogin("catintruder4@example.com", "senha1234");
        AccountResponse account = createAccount(intruder, "Conta do Intruso");
        PaymentMethodResponse paymentMethod = createPaymentMethod(intruder, "Dinheiro");

        TransactionRequest transaction = new TransactionRequest(
                "Uber", BigDecimal.valueOf(25), TransactionType.EXPENSE,
                LocalDate.of(2026, 8, 10), foreignCategory.id(), account.id(), paymentMethod.id(), null);

        mockMvc.perform(authed(post("/api/transactions"), intruder)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(transaction)))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingCategoryWithTransactions_returns409() throws Exception {
        Session session = registerAndLogin("catinuse@example.com", "senha1234");
        AccountResponse account = createAccount(session, "Conta");
        CategoryResponse category = createCategory(session, "Saúde", TransactionType.EXPENSE);
        PaymentMethodResponse paymentMethod = createPaymentMethod(session, "Débito");

        TransactionRequest transaction = new TransactionRequest(
                "Farmácia", BigDecimal.valueOf(80), TransactionType.EXPENSE,
                LocalDate.of(2026, 8, 12), category.id(), account.id(), paymentMethod.id(), null);
        mockMvc.perform(authed(post("/api/transactions"), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(transaction)))
                .andExpect(status().isCreated());

        mockMvc.perform(authed(delete("/api/categories/" + category.id()), session))
                .andExpect(status().isConflict());
    }
}
