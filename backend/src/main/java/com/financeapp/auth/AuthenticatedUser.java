package com.financeapp.auth;

/**
 * Principal mínimo populado no {@link org.springframework.security.core.context.SecurityContext}
 * a partir das claims do access token — evita uma consulta ao banco a cada
 * requisição autenticada só para descobrir quem é o usuário.
 */
public record AuthenticatedUser(Long id, String email) {
}
