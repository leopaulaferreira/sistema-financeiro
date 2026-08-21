package com.financeapp.auth;

import com.financeapp.common.exception.RateLimitExceededException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

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
 */
@Component
public class AuthRateLimiter {

    private final int maxAttempts;
    private final Duration window;
    private final ConcurrentHashMap<String, Window> attempts = new ConcurrentHashMap<>();

    public AuthRateLimiter(@Value("${app.auth.rate-limit.max-attempts:10}") int maxAttempts,
                            @Value("${app.auth.rate-limit.window-seconds:60}") long windowSeconds) {
        this.maxAttempts = maxAttempts;
        this.window = Duration.ofSeconds(windowSeconds);
    }

    /**
     * @throws RateLimitExceededException se o cliente já excedeu o limite
     * de tentativas na janela atual.
     */
    public void checkAllowed(String clientKey) {
        Instant now = Instant.now();
        Window updated = attempts.compute(clientKey, (key, existing) -> {
            if (existing == null || existing.resetAt().isBefore(now)) {
                return new Window(1, now.plus(window));
            }
            return new Window(existing.count() + 1, existing.resetAt());
        });
        if (updated.count() > maxAttempts) {
            throw new RateLimitExceededException("Muitas tentativas. Aguarde um momento antes de tentar novamente.");
        }
    }

    private record Window(int count, Instant resetAt) {
    }
}
