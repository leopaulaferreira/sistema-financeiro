package com.financeapp.auth;

import com.financeapp.user.User;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testa a lógica de expiração/revogação isoladamente (sem Spring/DB), já que
 * simular a passagem real de 30 dias em um teste de integração não é
 * prático.
 */
class RefreshTokenTest {

    private final User user = new User("Teste", "teste@example.com", "hash");

    @Test
    void tokenWithFutureExpiration_isNotExpired() {
        RefreshToken token = new RefreshToken(user, "hash", Instant.now().plus(1, ChronoUnit.DAYS), "agent");

        assertThat(token.isExpired()).isFalse();
    }

    @Test
    void tokenWithPastExpiration_isExpired() {
        RefreshToken token = new RefreshToken(user, "hash", Instant.now().minus(1, ChronoUnit.SECONDS), "agent");

        assertThat(token.isExpired()).isTrue();
    }

    @Test
    void newToken_isNotRevoked() {
        RefreshToken token = new RefreshToken(user, "hash", Instant.now().plus(1, ChronoUnit.DAYS), "agent");

        assertThat(token.isRevoked()).isFalse();
    }

    @Test
    void afterRevoke_tokenIsRevoked() {
        RefreshToken token = new RefreshToken(user, "hash", Instant.now().plus(1, ChronoUnit.DAYS), "agent");

        token.revoke();

        assertThat(token.isRevoked()).isTrue();
        assertThat(token.getRevokedAt()).isNotNull();
    }
}
