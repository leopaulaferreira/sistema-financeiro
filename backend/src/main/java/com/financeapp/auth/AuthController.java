package com.financeapp.auth;

import com.financeapp.auth.dto.LoginRequest;
import com.financeapp.auth.dto.RegisterRequest;
import com.financeapp.auth.dto.UserResponse;
import com.financeapp.common.exception.InvalidTokenException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final CookieService cookieService;
    private final AuthRateLimiter rateLimiter;

    public AuthController(AuthService authService, CookieService cookieService, AuthRateLimiter rateLimiter) {
        this.authService = authService;
        this.cookieService = cookieService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request,
                                                  HttpServletRequest httpRequest) {
        rateLimiter.checkAllowed(clientIp(httpRequest));
        UserResponse created = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest,
                                               HttpServletResponse httpResponse) {
        rateLimiter.checkAllowed(clientIp(httpRequest));
        AuthService.LoginResult result = authService.login(request, userAgent(httpRequest));
        cookieService.addAccessTokenCookie(httpResponse, result.tokens().accessToken());
        cookieService.addRefreshTokenCookie(httpResponse, result.tokens().rawRefreshToken());
        return ResponseEntity.ok(result.user());
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        rateLimiter.checkAllowed(clientIp(httpRequest));
        String rawRefreshToken = extractCookie(httpRequest, CookieService.REFRESH_TOKEN_COOKIE)
                .orElseThrow(() -> new InvalidTokenException("Refresh token ausente"));
        AuthService.TokenPair tokens = authService.refresh(rawRefreshToken, userAgent(httpRequest));
        cookieService.addAccessTokenCookie(httpResponse, tokens.accessToken());
        cookieService.addRefreshTokenCookie(httpResponse, tokens.rawRefreshToken());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        extractCookie(httpRequest, CookieService.REFRESH_TOKEN_COOKIE)
                .ifPresent(authService::logout);
        cookieService.clearAuthCookies(httpResponse);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal AuthenticatedUser principal) {
        return ResponseEntity.ok(authService.me(principal.id()));
    }

    private String userAgent(HttpServletRequest request) {
        String value = request.getHeader("User-Agent");
        return value == null ? "unknown" : value;
    }

    // getRemoteAddr() (não X-Forwarded-For): não há proxy reverso confiável
    // nesta fase (fica para a Fase 10), então confiar num header vindo do
    // próprio cliente permitiria burlar o rate limit trivialmente.
    private String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    private Optional<String> extractCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return Optional.empty();
        }
        return Arrays.stream(cookies)
                .filter(c -> c.getName().equals(name))
                .map(Cookie::getValue)
                .findFirst();
    }
}
