package com.financeapp.auth;

import tools.jackson.databind.ObjectMapper;
import com.financeapp.TestcontainersConfiguration;
import com.financeapp.auth.dto.LoginRequest;
import com.financeapp.auth.dto.RegisterRequest;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cobre o fluxo completo de autenticação (ARCHITECTURE.md §5) de ponta a
 * ponta, contra um PostgreSQL real via Testcontainers — evita falsos
 * positivos que um banco em memória poderia esconder (ex.: comportamento de
 * enums/constraints específicos do Postgres).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private com.financeapp.user.UserRepository userRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @AfterEach
    void cleanUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    // --- helpers -----------------------------------------------------

    private Cookie fetchCsrfCookie() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me")).andReturn();
        Cookie xsrf = result.getResponse().getCookie("XSRF-TOKEN");
        assertThat(xsrf).as("cookie XSRF-TOKEN deve ser emitido mesmo para requisição anônima").isNotNull();
        return xsrf;
    }

    private MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder builder, Cookie csrf, Cookie... extra) {
        builder.cookie(csrf).header("X-XSRF-TOKEN", csrf.getValue());
        if (extra.length > 0) {
            builder.cookie(extra);
        }
        return builder;
    }

    private MvcResult registerUser(Cookie csrf, String email, String password) throws Exception {
        RegisterRequest request = new RegisterRequest("Usuário Teste", email, password);
        return mockMvc.perform(withCsrf(post("/api/auth/register"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private MvcResult login(Cookie csrf, String email, String password) throws Exception {
        LoginRequest request = new LoginRequest(email, password);
        return mockMvc.perform(withCsrf(post("/api/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();
    }

    // --- testes --------------------------------------------------------

    @Test
    void registerWithValidData_returns201AndUser() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        RegisterRequest request = new RegisterRequest("Ana Silva", "ana@example.com", "senha1234");

        mockMvc.perform(withCsrf(post("/api/auth/register"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("ana@example.com"))
                .andExpect(jsonPath("$.id").exists());
    }

    @Test
    void registerWithoutCsrfHeader_returns403() throws Exception {
        RegisterRequest request = new RegisterRequest("Sem CSRF", "semcsrf@example.com", "senha1234");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void registerWithInvalidCsrfHeader_returns403() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        RegisterRequest request = new RegisterRequest("CSRF Inválido", "csrfinvalido@example.com", "senha1234");

        // Cookie XSRF-TOKEN válido, mas header X-XSRF-TOKEN com valor diferente
        // (double-submit exige que os dois batam) — deve ser rejeitado como o
        // caso de header ausente, não silenciosamente aceito.
        mockMvc.perform(post("/api/auth/register")
                        .cookie(csrf)
                        .header("X-XSRF-TOKEN", csrf.getValue() + "-adulterado")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    void registerWithDuplicateEmail_returns409() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        registerUser(csrf, "duplicado@example.com", "senha1234");

        RegisterRequest again = new RegisterRequest("Outro Nome", "duplicado@example.com", "outrasenha");
        mockMvc.perform(withCsrf(post("/api/auth/register"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(again)))
                .andExpect(status().isConflict());
    }

    @Test
    void loginWithValidCredentials_returns200AndSetsAuthCookies() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        registerUser(csrf, "login@example.com", "senha1234");

        MvcResult result = login(csrf, "login@example.com", "senha1234");

        assertThat(result.getResponse().getCookie("access_token")).isNotNull();
        assertThat(result.getResponse().getCookie("refresh_token")).isNotNull();
    }

    @Test
    void loginWithWrongPassword_returns401() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        registerUser(csrf, "senhaerrada@example.com", "senha1234");

        LoginRequest request = new LoginRequest("senhaerrada@example.com", "senha-diferente");
        mockMvc.perform(withCsrf(post("/api/auth/login"), csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void accessProtectedEndpointWithoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void accessProtectedEndpointWithValidAccessToken_returns200() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        registerUser(csrf, "me@example.com", "senha1234");
        MvcResult loginResult = login(csrf, "me@example.com", "senha1234");
        Cookie accessToken = loginResult.getResponse().getCookie("access_token");

        mockMvc.perform(get("/api/auth/me").cookie(accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("me@example.com"));
    }

    @Test
    void refreshWithValidToken_rotatesTokenAndOldOneStopsWorking() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        registerUser(csrf, "refresh@example.com", "senha1234");
        MvcResult loginResult = login(csrf, "refresh@example.com", "senha1234");
        Cookie originalRefresh = loginResult.getResponse().getCookie("refresh_token");

        MvcResult refreshResult = mockMvc.perform(withCsrf(post("/api/auth/refresh"), csrf, originalRefresh))
                .andExpect(status().isOk())
                .andReturn();

        Cookie rotatedRefresh = refreshResult.getResponse().getCookie("refresh_token");
        assertThat(rotatedRefresh).isNotNull();
        assertThat(rotatedRefresh.getValue()).isNotEqualTo(originalRefresh.getValue());
        assertThat(refreshResult.getResponse().getCookie("access_token")).isNotNull();
    }

    @Test
    void refreshWithoutCookie_returns401() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        mockMvc.perform(withCsrf(post("/api/auth/refresh"), csrf))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_revokesRefreshTokenAndClearsCookies() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        registerUser(csrf, "logout@example.com", "senha1234");
        MvcResult loginResult = login(csrf, "logout@example.com", "senha1234");
        Cookie refreshCookie = loginResult.getResponse().getCookie("refresh_token");

        MvcResult logoutResult = mockMvc.perform(withCsrf(post("/api/auth/logout"), csrf, refreshCookie))
                .andExpect(status().isOk())
                .andReturn();

        Cookie clearedAccess = logoutResult.getResponse().getCookie("access_token");
        assertThat(clearedAccess).isNotNull();
        assertThat(clearedAccess.getMaxAge()).isZero();

        // token revogado pelo logout não pode mais ser usado para renovar sessão
        mockMvc.perform(withCsrf(post("/api/auth/refresh"), csrf, refreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reusingRotatedRefreshToken_isDetectedAndRevokesAllActiveSessions() throws Exception {
        Cookie csrf = fetchCsrfCookie();
        registerUser(csrf, "reuse@example.com", "senha1234");
        MvcResult loginResult = login(csrf, "reuse@example.com", "senha1234");
        Cookie firstRefresh = loginResult.getResponse().getCookie("refresh_token");

        // uso legítimo: rotaciona o token
        MvcResult rotateResult = mockMvc.perform(withCsrf(post("/api/auth/refresh"), csrf, firstRefresh))
                .andExpect(status().isOk())
                .andReturn();
        Cookie secondRefresh = rotateResult.getResponse().getCookie("refresh_token");

        // reuso do token já rotacionado (ex.: token roubado sendo usado em paralelo)
        mockMvc.perform(withCsrf(post("/api/auth/refresh"), csrf, firstRefresh))
                .andExpect(status().isUnauthorized());

        // efeito colateral esperado: TODAS as sessões do usuário são revogadas,
        // inclusive a "legítima" (secondRefresh), que ainda não havia sido usada
        mockMvc.perform(withCsrf(post("/api/auth/refresh"), csrf, secondRefresh))
                .andExpect(status().isUnauthorized());
    }
}
