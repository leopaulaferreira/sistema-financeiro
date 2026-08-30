package com.financeapp.report;

import com.financeapp.TestcontainersConfiguration;
import com.financeapp.auth.CookieService;
import com.financeapp.auth.dto.LoginRequest;
import com.financeapp.auth.dto.RegisterRequest;
import com.financeapp.user.UserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SEC-017: nenhum endpoint de /api/reports/* tinha limite de taxa. Roda com
 * limite baixo só nesta classe (contexto Spring próprio, não compartilhado
 * com {@code AbstractIntegrationTest}) para não depender de disparar 60+
 * requisições reais num teste — mesmo padrão de
 * {@code TrustedProxyRateLimitIntegrationTest} para {@code AuthRateLimiter}.
 */
@SpringBootTest(properties = {
        "app.reports.rate-limit.max-attempts=3",
        "app.reports.rate-limit.window-seconds=60"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ReportRateLimitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @AfterEach
    void cleanUp() {
        userRepository.deleteAll();
    }

    @Test
    void exceedingLimit_returns429() throws Exception {
        Cookie access = registerAndGetAccessToken("reports-ratelimit@example.com", "senha1234");

        // max-attempts=3: as 3 primeiras chamadas passam, a 4ª estoura o limite.
        callSummary(access, 200);
        callSummary(access, 200);
        callSummary(access, 200);
        callSummary(access, 429);
    }

    private void callSummary(Cookie access, int expectedStatus) throws Exception {
        mockMvc.perform(get("/api/reports/summary")
                        .param("from", "2026-08-01")
                        .param("to", "2026-08-31")
                        .cookie(access))
                .andExpect(status().is(expectedStatus));
    }

    private Cookie registerAndGetAccessToken(String email, String password) throws Exception {
        MvcResult csrfResult = mockMvc.perform(get("/api/auth/me")).andReturn();
        Cookie csrf = csrfResult.getResponse().getCookie("XSRF-TOKEN");

        RegisterRequest registerRequest = new RegisterRequest("Usuário Relatório", email, password);
        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrf)
                        .header("X-XSRF-TOKEN", csrf.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        LoginRequest loginRequest = new LoginRequest(email, password);
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .cookie(csrf)
                        .header("X-XSRF-TOKEN", csrf.getValue())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        return loginResult.getResponse().getCookie(CookieService.ACCESS_TOKEN_COOKIE);
    }
}
