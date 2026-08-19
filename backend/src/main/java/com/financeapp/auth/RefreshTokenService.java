package com.financeapp.auth;

import com.financeapp.common.exception.InvalidTokenException;
import com.financeapp.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Gera, valida e rotaciona refresh tokens. O valor bruto do token só existe
 * em memória e no cookie da resposta — nunca é persistido, apenas seu hash
 * SHA-256 (ver {@link RefreshToken}).
 */
@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, JwtService jwtService) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
    }

    public record IssuedToken(String rawValue, Instant expiresAt) {
    }

    public record RotatedToken(User user, IssuedToken issued) {
    }

    @Transactional
    public IssuedToken issue(User user, String userAgent) {
        String rawToken = generateRawToken();
        Instant expiresAt = Instant.now().plus(jwtService.getRefreshTokenTtl());
        RefreshToken entity = new RefreshToken(user, hash(rawToken), expiresAt, userAgent);
        refreshTokenRepository.save(entity);
        return new IssuedToken(rawToken, expiresAt);
    }

    /**
     * Valida o refresh token apresentado e o rotaciona (revoga o atual,
     * emite um novo). Se o token apresentado já estiver revogado, isso é
     * tratado como reuso indevido (token roubado/copiado) e TODAS as
     * sessões ativas do usuário são revogadas imediatamente.
     */
    // noRollbackFor é essencial aqui: a revogação de todas as sessões, no
    // ramo de reuso detectado abaixo, precisa ser persistida mesmo que o
    // método termine lançando InvalidTokenException — caso contrário o
    // rollback padrão do Spring desfaria a própria revogação de segurança.
    @Transactional(noRollbackFor = InvalidTokenException.class)
    public RotatedToken rotate(String rawToken, String userAgent) {
        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new InvalidTokenException("Refresh token inválido"));

        if (existing.isRevoked()) {
            log.warn("Reuso de refresh token detectado para userId={} — revogando todas as sessões",
                    existing.getUser().getId());
            refreshTokenRepository.revokeAllActiveForUser(existing.getUser().getId(), Instant.now());
            throw new InvalidTokenException("Refresh token inválido");
        }

        if (existing.isExpired()) {
            throw new InvalidTokenException("Refresh token expirado");
        }

        existing.revoke();
        refreshTokenRepository.save(existing);
        User owner = existing.getUser();
        return new RotatedToken(owner, issue(owner, userAgent));
    }

    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .filter(token -> !token.isRevoked())
                .ifPresent(token -> {
                    token.revoke();
                    refreshTokenRepository.save(token);
                });
    }

    private String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 não disponível", e);
        }
    }
}
