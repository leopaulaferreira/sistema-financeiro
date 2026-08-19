package com.financeapp.paymentmethod;

import com.financeapp.account.dto.AccountResponse;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
import com.financeapp.paymentmethod.dto.PaymentMethodRequest;
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

class PaymentMethodControllerIntegrationTest extends AbstractIntegrationTest {

    @Test
    void createPaymentMethod_returns201() throws Exception {
        Session session = registerAndLogin("pmowner@example.com", "senha1234");
        PaymentMethodRequest request = new PaymentMethodRequest("Pix", PaymentMethodType.PIX);

        mockMvc.perform(authed(post("/api/payment-methods"), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Pix"));
    }

    @Test
    void listPaymentMethods_isIsolatedBetweenUsers() throws Exception {
        Session owner = registerAndLogin("pmowner2@example.com", "senha1234");
        createPaymentMethod(owner, "Cartão de Crédito");

        Session other = registerAndLogin("pmother2@example.com", "senha1234");
        createPaymentMethod(other, "Dinheiro");

        mockMvc.perform(authed(get("/api/payment-methods"), owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Cartão de Crédito"));
    }

    @Test
    void accessingAnotherUsersPaymentMethod_returns404() throws Exception {
        Session owner = registerAndLogin("pmowner3@example.com", "senha1234");
        PaymentMethodResponse paymentMethod = createPaymentMethod(owner, "Transferência");

        Session intruder = registerAndLogin("pmintruder3@example.com", "senha1234");

        mockMvc.perform(authed(get("/api/payment-methods/" + paymentMethod.id()), intruder))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletingPaymentMethodWithTransactions_returns409() throws Exception {
        Session session = registerAndLogin("pminuse@example.com", "senha1234");
        AccountResponse account = createAccount(session, "Conta");
        CategoryResponse category = createCategory(session, "Lazer", TransactionType.EXPENSE);
        PaymentMethodResponse paymentMethod = createPaymentMethod(session, "Débito");

        TransactionRequest transaction = new TransactionRequest(
                "Cinema", BigDecimal.valueOf(40), TransactionType.EXPENSE,
                LocalDate.of(2026, 8, 15), category.id(), account.id(), paymentMethod.id(), null);
        mockMvc.perform(authed(post("/api/transactions"), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(transaction)))
                .andExpect(status().isCreated());

        mockMvc.perform(authed(delete("/api/payment-methods/" + paymentMethod.id()), session))
                .andExpect(status().isConflict());
    }
}
