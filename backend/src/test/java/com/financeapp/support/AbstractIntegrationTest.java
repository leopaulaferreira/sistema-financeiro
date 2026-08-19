package com.financeapp.support;

import com.financeapp.TestcontainersConfiguration;
import com.financeapp.account.AccountType;
import com.financeapp.account.dto.AccountRequest;
import com.financeapp.account.dto.AccountResponse;
import com.financeapp.auth.dto.LoginRequest;
import com.financeapp.auth.dto.RegisterRequest;
import com.financeapp.category.dto.CategoryRequest;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
import com.financeapp.paymentmethod.PaymentMethodType;
import com.financeapp.paymentmethod.dto.PaymentMethodRequest;
import com.financeapp.paymentmethod.dto.PaymentMethodResponse;
import com.financeapp.user.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base compartilhada pelos testes de integração da Fase 2 — concentra o
 * boilerplate de autenticação (CSRF + registro + login) que toda feature
 * protegida precisa para ser testada via MockMvc.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public abstract class AbstractIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected UserRepository userRepository;

    protected record Session(Cookie access, Cookie csrf) {
    }

    // Apagar apenas users é suficiente: accounts, categories, payment_methods,
    // transactions e refresh_tokens têm ON DELETE CASCADE em user_id (V1/V2).
    @AfterEach
    void cleanUpBase() {
        userRepository.deleteAll();
    }

    protected Cookie fetchCsrfCookie() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me")).andReturn();
        Cookie xsrf = result.getResponse().getCookie("XSRF-TOKEN");
        assertThat(xsrf).isNotNull();
        return xsrf;
    }

    protected Session registerAndLogin(String email, String password) throws Exception {
        Cookie csrf = fetchCsrfCookie();
        RegisterRequest register = new RegisterRequest("Usuário Teste", email, password);
        mockMvc.perform(withCsrf(post("/api/auth/register"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated());

        LoginRequest login = new LoginRequest(email, password);
        MvcResult loginResult = mockMvc.perform(withCsrf(post("/api/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie access = loginResult.getResponse().getCookie("access_token");
        assertThat(access).isNotNull();
        return new Session(access, csrf);
    }

    protected MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder builder, Session session) {
        return withCsrf(builder, session.csrf()).cookie(session.access());
    }

    protected MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder builder, Cookie csrf) {
        return builder.cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue());
    }

    protected String json(Object body) {
        return objectMapper.writeValueAsString(body);
    }

    protected AccountResponse createAccount(Session session, String name) throws Exception {
        AccountRequest request = new AccountRequest(name, AccountType.CHECKING, BigDecimal.valueOf(100));
        MvcResult result = mockMvc.perform(authed(post("/api/accounts"), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsByteArray(), AccountResponse.class);
    }

    protected CategoryResponse createCategory(Session session, String name, TransactionType type) throws Exception {
        CategoryRequest request = new CategoryRequest(name, type, "#7C5CFC", "wallet");
        MvcResult result = mockMvc.perform(authed(post("/api/categories"), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsByteArray(), CategoryResponse.class);
    }

    protected PaymentMethodResponse createPaymentMethod(Session session, String name) throws Exception {
        PaymentMethodRequest request = new PaymentMethodRequest(name, PaymentMethodType.PIX);
        MvcResult result = mockMvc.perform(authed(post("/api/payment-methods"), session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readValue(result.getResponse().getContentAsByteArray(), PaymentMethodResponse.class);
    }
}
