package com.financeapp.config;

import com.financeapp.auth.JwtAuthFilter;
import com.financeapp.auth.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletResponse;
import java.util.List;

/**
 * Configuração central de segurança. Decisões que refletem ARCHITECTURE.md §5:
 * - sessão stateless (o estado vive no JWT do cookie, não no servidor);
 * - CSRF via cookie {@code XSRF-TOKEN} legível + header {@code X-XSRF-TOKEN}
 *   (padrão double-submit, {@link CookieCsrfTokenRepository});
 * - autenticação via {@link JwtAuthFilter}, que lê o cookie HttpOnly
 *   {@code access_token} — nunca um header Authorization;
 * - CORS restrito à origem configurada (frontend), com credenciais habilitadas
 *   (necessário para o navegador enviar os cookies em chamadas cross-origin
 *   durante o desenvolvimento, caso o proxy do Vite não seja usado).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/logout",
            // Healthcheck de infra (systemd/monitoramento) — não pode exigir
            // sessão. Só expõe status UP/DOWN: management.endpoint.health.show-details
            // = never (application.yml) garante que nenhum detalhe interno vaza.
            "/actuator/health"
    };

    private final JwtService jwtService;
    private final String allowedOrigin;

    public SecurityConfig(JwtService jwtService,
                           @Value("${app.cors.allowed-origin}") String allowedOrigin) {
        this.jwtService = jwtService;
        this.allowedOrigin = allowedOrigin;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        var csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        var csrfRequestHandler = new CsrfTokenRequestAttributeHandler();

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(csrfRequestHandler)
                )
                // Fase 10 §23-24: a API só devolve JSON, nunca HTML/script — CSP
                // restritiva por padrão (default-src/frame-ancestors 'none'). O CSP
                // "de verdade" (permitindo o bundle React/Recharts) é responsabilidade
                // do Nginx, que serve o HTML/assets estáticos — evita headers
                // duplicados/conflitantes entre as duas camadas (ver DEPLOYMENT.md).
                // X-Content-Type-Options/Cache-Control/X-Frame-Options e HSTS
                // (só sobre HTTPS) já vêm habilitados por padrão pelo Spring Security.
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"))
                        .referrerPolicy(referrer -> referrer
                                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicy(permissions -> permissions
                                .policy("geolocation=(), microphone=(), camera=()"))
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated()
                )
                // Sem isto, o Spring Security cai no fallback padrão
                // (Http403ForbiddenEntryPoint) para requisições não
                // autenticadas, retornando 403 em vez do 401 semanticamente
                // correto para "não autenticado".
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        (request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
                .addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigin));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
