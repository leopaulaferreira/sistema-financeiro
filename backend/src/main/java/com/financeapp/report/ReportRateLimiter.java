package com.financeapp.report;

import com.financeapp.common.exception.RateLimitExceededException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * SEC-017: nenhum endpoint de {@code /api/reports/*} (incl. {@code
 * export.csv}, que monta a lista completa de transações do período em
 * memória) tinha limite de taxa — o único controle era o teto de 5 anos de
 * período ({@link ReportService}), que limita o tamanho de uma resposta,
 * não a frequência de chamadas.
 *
 * <p>Chaveado por {@code userId} autenticado (não por IP, diferente de
 * {@link com.financeapp.auth.AuthRateLimiter}) — não há aqui o mesmo risco
 * de enumeração de e-mail por timing que existe no fluxo público de
 * login/registro, já que todo endpoint de relatório exige sessão válida.
 * Limites generosos para uso normal (o objetivo é conter loop apertado
 * repetindo chamadas, não o uso interativo real de um usuário navegando
 * pelos relatórios).
 *
 * <p>Mesmo padrão do {@code AuthRateLimiter} pós-SEC-001: cache Caffeine
 * limitado por {@code maximumSize}/{@code expireAfterWrite}, nunca um mapa
 * manual sem eviction.
 */
@Component
public class ReportRateLimiter {

    private final int maxAttempts;
    private final Duration window;
    private final Cache<String, Window> attempts;

    public ReportRateLimiter(@Value("${app.reports.rate-limit.max-attempts:60}") int maxAttempts,
                              @Value("${app.reports.rate-limit.window-seconds:60}") long windowSeconds,
                              @Value("${app.reports.rate-limit.cache-max-size:10000}") long cacheMaxSize) {
        this.maxAttempts = maxAttempts;
        this.window = Duration.ofSeconds(windowSeconds);
        this.attempts = Caffeine.newBuilder()
                .maximumSize(cacheMaxSize)
                .expireAfterWrite(this.window)
                .build();
    }

    /**
     * @throws RateLimitExceededException se o usuário já excedeu o limite
     * de chamadas na janela atual.
     */
    public void checkAllowed(Long userId) {
        Instant now = Instant.now();
        String key = userId.toString();
        Window updated = attempts.asMap().compute(key, (k, existing) -> {
            if (existing == null || existing.resetAt().isBefore(now)) {
                return new Window(1, now.plus(window));
            }
            return new Window(existing.count() + 1, existing.resetAt());
        });
        if (updated.count() > maxAttempts) {
            throw new RateLimitExceededException("Muitas requisições de relatório. Aguarde um momento antes de tentar novamente.");
        }
    }

    private record Window(int count, Instant resetAt) {
    }
}
