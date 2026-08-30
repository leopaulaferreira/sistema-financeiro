package com.financeapp.auth;

import com.financeapp.common.exception.RateLimitExceededException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Unitário, sem contexto Spring — a suíte de integração usa um limite alto (ver application.yml de teste). */
class AuthRateLimiterTest {

    private static final long DEFAULT_CACHE_MAX_SIZE = 10_000;

    @Test
    void allowsUpToTheConfiguredMaxAttempts() {
        AuthRateLimiter limiter = new AuthRateLimiter(3, 60, DEFAULT_CACHE_MAX_SIZE);

        limiter.checkAllowed("1.2.3.4");
        limiter.checkAllowed("1.2.3.4");
        limiter.checkAllowed("1.2.3.4");
    }

    @Test
    void rejectsWhenExceedingMaxAttemptsWithinWindow() {
        AuthRateLimiter limiter = new AuthRateLimiter(2, 60, DEFAULT_CACHE_MAX_SIZE);

        limiter.checkAllowed("1.2.3.4");
        limiter.checkAllowed("1.2.3.4");

        assertThatThrownBy(() -> limiter.checkAllowed("1.2.3.4"))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    void tracksEachClientKeyIndependently() {
        AuthRateLimiter limiter = new AuthRateLimiter(1, 60, DEFAULT_CACHE_MAX_SIZE);

        limiter.checkAllowed("1.2.3.4");
        assertThatThrownBy(() -> limiter.checkAllowed("1.2.3.4")).isInstanceOf(RateLimitExceededException.class);

        // Outro IP não deve ser afetado pelo limite do primeiro.
        assertThat(catchThrowable(() -> limiter.checkAllowed("5.6.7.8"))).isNull();
    }

    // ---------- SEC-001: cache limitado (não cresce indefinidamente) ----------

    @Test
    void cacheSize_isBoundedByMaximumSize_evenWithManyDistinctKeys() {
        long maxSize = 50;
        AuthRateLimiter limiter = new AuthRateLimiter(10, 60, maxSize);

        // dez vezes o limite configurado — suficiente para provar eviction
        // sem o custo de um teste de 100 mil entradas.
        for (int i = 0; i < maxSize * 10; i++) {
            limiter.checkAllowed("ip-" + i);
        }

        assertThat(limiter.estimatedSize()).isLessThanOrEqualTo(maxSize);
    }

    @Test
    void windowStillExpires_afterEviction_infrastructureChangeDoesNotBreakBehavior() throws InterruptedException {
        AuthRateLimiter limiter = new AuthRateLimiter(1, 1, DEFAULT_CACHE_MAX_SIZE);

        limiter.checkAllowed("1.2.3.4");
        assertThatThrownBy(() -> limiter.checkAllowed("1.2.3.4")).isInstanceOf(RateLimitExceededException.class);

        Thread.sleep(1100);

        // depois que a janela expira, o mesmo IP volta a ter orçamento —
        // trocar ConcurrentHashMap por Caffeine não pode ter quebrado isso.
        assertThat(catchThrowable(() -> limiter.checkAllowed("1.2.3.4"))).isNull();
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
