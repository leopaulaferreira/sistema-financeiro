package com.financeapp.auth;

import com.financeapp.TestcontainersConfiguration;
import com.financeapp.common.exception.InvalidTokenException;
import com.financeapp.user.User;
import com.financeapp.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regressão de SEC-005: duas chamadas concorrentes a
 * {@link RefreshTokenService#rotate} com o MESMO rawToken não podem ambas
 * emitir um token filho válido. Usa {@link CountDownLatch} para sincronizar
 * o início das duas chamadas (evita teste flaky baseado em sleep) contra
 * Postgres real via Testcontainers, igual ao padrão já usado em
 * {@link AuthControllerIntegrationTest}.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class RefreshTokenConcurrencyTest {

    @Autowired
    private RefreshTokenService refreshTokenService;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @AfterEach
    void cleanUp() {
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void concurrentRotate_withSameToken_onlyOneSucceeds() throws Exception {
        User user = userRepository.save(new User("Concorrência", "concorrencia@example.com", "hash"));
        String rawToken = refreshTokenService.issue(user, "agent").rawValue();

        int attempts = 2;
        CountDownLatch ready = new CountDownLatch(attempts);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(attempts);
        AtomicInteger successes = new AtomicInteger();
        AtomicInteger reuseDetections = new AtomicInteger();

        try {
            var tasks = java.util.stream.IntStream.range(0, attempts)
                    .<java.util.concurrent.Callable<Void>>mapToObj(i -> () -> {
                        ready.countDown();
                        start.await();
                        try {
                            refreshTokenService.rotate(rawToken, "agent");
                            successes.incrementAndGet();
                        } catch (InvalidTokenException e) {
                            reuseDetections.incrementAndGet();
                        }
                        return null;
                    })
                    .toList();

            java.util.List<Future<Void>> futures = tasks.stream().map(pool::submit).toList();
            ready.await(5, TimeUnit.SECONDS);
            start.countDown();
            for (Future<Void> future : futures) {
                future.get(10, TimeUnit.SECONDS);
            }
        } finally {
            pool.shutdown();
        }

        assertThat(successes.get())
                .as("exatamente uma das chamadas concorrentes deve rotacionar com sucesso")
                .isEqualTo(1);
        assertThat(reuseDetections.get())
                .as("a outra chamada deve ser tratada como reuso, não como sucesso")
                .isEqualTo(1);

        // estado final do banco: exatamente 2 refresh tokens ativos (não-revogados)
        // pertencem ao usuário — o original (agora revogado) não conta, e o
        // reuso detectado revogou TODAS as sessões, incluindo o filho recém-emitido
        // pela chamada vencedora. Ou seja, nenhum token deve seguir utilizável.
        long activeTokens = refreshTokenRepository.findAll().stream()
                .filter(t -> t.getUser().getId().equals(user.getId()))
                .filter(t -> !t.isRevoked())
                .count();
        assertThat(activeTokens)
                .as("reuso detectado revoga toda a família — nenhum token deve continuar ativo")
                .isZero();
    }
}
