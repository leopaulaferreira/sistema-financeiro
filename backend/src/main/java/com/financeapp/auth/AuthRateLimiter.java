package com.financeapp.auth;

import com.financeapp.common.exception.RateLimitExceededException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Limite de tentativas simples, em memória, para os endpoints sensíveis de
 * auth (login/register/refresh) — Fase 9, seção 11: "avaliar implementação
 * simples apenas em auth, sem Redis ou infraestrutura pesada".
 *
 * <p>Chave por IP do cliente (não por e-mail): manter a mesma abordagem de
 * "custo igual independente do usuário existir ou não" já usada na mitigação
 * de timing attack do login (ver {@link AuthService}) — se o rate limit
 * disparasse mais cedo para e-mails cadastrados do que para inexistentes (ou
 * vice-versa), isso reabriria um canal de enumeração de e-mail.
 *
 * <p><strong>Limitação conhecida:</strong> em memória, por instância — não
 * funciona corretamente atrás de múltiplas instâncias do backend sem sticky
 * sessions ou um estado compartilhado (Redis). Aceitável para a infraestrutura
 * atual (instância única); documentado em ARCHITECTURE.md.
 *
 * <p><strong>SEC-001:</strong> o mapa de tentativas é um {@link Cache}
 * Caffeine limitado por {@code maximumSize} e {@code expireAfterWrite} (igual
 * à janela configurada) — diferente do {@code ConcurrentHashMap} manual
 * anterior, que nunca removia entradas e crescia indefinidamente por IP
 * distinto (risco de OOM na instância única, {@code -Xmx256m}).
 */
@Component
public class AuthRateLimiter {

    private final int maxAttempts;
    private final Duration window;
    private final Cache<String, Window> attempts;

    public AuthRateLimiter(@Value("${app.auth.rate-limit.max-attempts:10}") int maxAttempts,
                            @Value("${app.auth.rate-limit.window-seconds:60}") long windowSeconds,
                            @Value("${app.auth.rate-limit.cache-max-size:10000}") long cacheMaxSize) {
        this.maxAttempts = maxAttempts;
        this.window = Duration.ofSeconds(windowSeconds);
        this.attempts = Caffeine.newBuilder()
                .maximumSize(cacheMaxSize)
                .expireAfterWrite(this.window)
                .build();
    }

    /**
     * @throws RateLimitExceededException se o cliente já excedeu o limite
     * de tentativas na janela atual.
     */
    public void checkAllowed(String clientKey) {
        Instant now = Instant.now();
        Window updated = attempts.asMap().compute(clientKey, (key, existing) -> {
            if (existing == null || existing.resetAt().isBefore(now)) {
                return new Window(1, now.plus(window));
            }
            return new Window(existing.count() + 1, existing.resetAt());
        });
        if (updated.count() > maxAttempts) {
            throw new RateLimitExceededException("Muitas tentativas. Aguarde um momento antes de tentar novamente.");
        }
    }

    /** Só para teste de regressão de SEC-001 (força a manutenção pendente antes de reportar o tamanho). */
    long estimatedSize() {
        attempts.cleanUp();
        return attempts.estimatedSize();
    }

    private record Window(int count, Instant resetAt) {
    }
}
