package com.financeapp.config;

import com.financeapp.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SEC-016: garante que o HSTS enviado pela API bate exatamente com o do
 * Nginx (deploy/nginx/sistema-financeiro.conf) — max-age=15552000, sem
 * includeSubDomains — em vez do default do Spring Security
 * (max-age=31536000; includeSubDomains).
 */
class SecurityHeadersIntegrationTest extends AbstractIntegrationTest {

    @Test
    void apiResponse_overHttps_sendsHstsMatchingNginxConfig() throws Exception {
        Session session = registerAndLogin("hsts-test@example.com", "senha1234");

        mockMvc.perform(authed(get("/api/accounts"), session).secure(true))
                .andExpect(status().isOk())
                .andExpect(header().string("Strict-Transport-Security", "max-age=15552000"));
    }
}
