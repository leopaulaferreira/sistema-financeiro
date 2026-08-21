package com.financeapp.auth;

import com.financeapp.common.exception.RateLimitExceededException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Unitário, sem contexto Spring — a suíte de integração usa um limite alto (ver application.yml de teste). */
class AuthRateLimiterTest {

    @Test
    void allowsUpToTheConfiguredMaxAttempts() {
        AuthRateLimiter limiter = new AuthRateLimiter(3, 60);

        limiter.checkAllowed("1.2.3.4");
        limiter.checkAllowed("1.2.3.4");
        limiter.checkAllowed("1.2.3.4");
    }

    @Test
    void rejectsWhenExceedingMaxAttemptsWithinWindow() {
        AuthRateLimiter limiter = new AuthRateLimiter(2, 60);

        limiter.checkAllowed("1.2.3.4");
        limiter.checkAllowed("1.2.3.4");

        assertThatThrownBy(() -> limiter.checkAllowed("1.2.3.4"))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void tracksEachClientKeyIndependently() {
        AuthRateLimiter limiter = new AuthRateLimiter(1, 60);

        limiter.checkAllowed("1.2.3.4");
        assertThatThrownBy(() -> limiter.checkAllowed("1.2.3.4")).isInstanceOf(RateLimitExceededException.class);

        // Outro IP não deve ser afetado pelo limite do primeiro.
        assertThat(catchThrowable(() -> limiter.checkAllowed("5.6.7.8"))).isNull();
    }

    private Throwable catchThrowable(Runnable runnable) {
        try {
            runnable.run();
            return null;
        } catch (Throwable t) {
            return t;
        }
    }
}
