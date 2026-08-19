package com.financeapp.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/**
 * Emite e valida exclusivamente o access token (JWT, curta duração,
 * stateless). O refresh token NÃO é um JWT — é um valor opaco validado
 * contra o hash persistido em {@link RefreshTokenRepository}, já que sua
 * validade sempre depende de uma consulta ao banco (revogação/rotação),
 * eliminando qualquer vantagem de ser autocontido.
 */
@Service
public class JwtService {

    private static final String CLAIM_EMAIL = "email";
    private static final int MIN_SECRET_BYTES = 32; // 256 bits, mínimo exigido para HS256

    private final SecretKey key;
    private final JwtProperties properties;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        byte[] secretBytes = properties.getSecret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "app.jwt.secret precisa ter pelo menos 32 bytes (256 bits) para HS256");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
    }

    public String generateAccessToken(AuthenticatedUser user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(Duration.ofMinutes(properties.getAccessTokenExpirationMinutes()));
        return Jwts.builder()
                .subject(user.id().toString())
                .claim(CLAIM_EMAIL, user.email())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    public Duration getAccessTokenTtl() {
        return Duration.ofMinutes(properties.getAccessTokenExpirationMinutes());
    }

    public Duration getRefreshTokenTtl() {
        return Duration.ofDays(properties.getRefreshTokenExpirationDays());
    }

    /**
     * @return o usuário autenticado se o token for válido, ou {@code null}
     * se ausente/inválido/expirado — o filtro decide o que fazer com isso.
     */
    public AuthenticatedUser parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Long userId = Long.parseLong(claims.getSubject());
            String email = claims.get(CLAIM_EMAIL, String.class);
            return new AuthenticatedUser(userId, email);
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }
}
