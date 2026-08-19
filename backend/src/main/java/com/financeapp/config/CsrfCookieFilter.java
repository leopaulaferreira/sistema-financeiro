package com.financeapp.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * O {@code CsrfToken} do Spring Security é resolvido de forma preguiçosa —
 * só é efetivamente lido (e o cookie XSRF-TOKEN só é de fato escrito na
 * resposta) se algo chamar {@code getToken()}. Este filtro força essa
 * leitura em toda requisição, garantindo que o cookie sempre esteja
 * disponível para o frontend, mesmo em chamadas GET simples (ex.: o
 * bootstrap inicial via GET /api/auth/me). Padrão recomendado pela
 * documentação do Spring Security para SPAs.
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain filterChain) throws ServletException, IOException {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            csrfToken.getToken();
        }
        filterChain.doFilter(request, response);
    }
}
