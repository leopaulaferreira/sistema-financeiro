package com.financeapp.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken t set t.revokedAt = :now where t.user.id = :userId and t.revokedAt is null")
    void revokeAllActiveForUser(@Param("userId") Long userId, @Param("now") Instant now);

    /**
     * UPDATE condicional atômico: revoga o token apenas se ainda estiver
     * ativo. O predicado {@code revokedAt is null} é reavaliado pelo
     * próprio banco no momento da escrita (não numa leitura anterior),
     * então duas chamadas concorrentes com o mesmo token nunca conseguem
     * as duas retornar 1 — a segunda sempre vê {@code revokedAt} já
     * preenchido pela primeira e recebe 0. Isso fecha a corrida que
     * existia no padrão "ler depois revogar" (SEC-005).
     */
    @Modifying
    @Query("update RefreshToken t set t.revokedAt = :now where t.id = :id and t.revokedAt is null")
    int revokeIfActive(@Param("id") Long id, @Param("now") Instant now);
}
