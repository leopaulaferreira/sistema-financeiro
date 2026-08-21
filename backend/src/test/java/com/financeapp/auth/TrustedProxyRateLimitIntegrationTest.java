package com.financeapp.auth;

import com.financeapp.TestcontainersConfiguration;
import com.financeapp.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Fase 10 §18: com o backend rodando atrás do Nginx, {@code AuthRateLimiter}
 * precisa distinguir clientes pelo IP real recebido via {@code X-Forwarded-For}
 * — sem {@code server.forward-headers-strategy=native} +
 * {@code internal-proxies}, {@code getRemoteAddr()} sempre devolveria o IP do
 * proxy (127.0.0.1) e todos os usuários cairiam no mesmo bucket.
 *
 * <p>Usa {@code webEnvironment = RANDOM_PORT} com {@link HttpClient} puro do
 * JDK (em vez de MockMvc) porque {@code RemoteIpValve} é uma Valve do Tomcat
 * — não participa do pipeline simulado do MockMvc, só existe com um
 * container HTTP de verdade recebendo a conexão TCP.
 *
 * <p><strong>Limitação conhecida:</strong> só é possível exercitar aqui o
 * caminho "confiável" (conexão direta vinda de 127.0.0.1, igual ao Nginx
 * rodando na mesma máquina) — não há como, num ambiente de teste local,
 * originar uma conexão TCP de fora da loopback para provar que o header É
 * ignorado nesse caso. Essa garantia vem da allowlist {@code internal-proxies}
 * do {@code RemoteIpValve} do Tomcat, mecanismo padrão e amplamente auditado
 * do próprio framework — não é lógica nova escrita por este projeto.
 * Documentado em ARCHITECTURE.md (Fase 10).
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "server.forward-headers-strategy=native",
                "server.tomcat.remoteip.internal-proxies=127\\.0\\.0\\.1",
                "app.auth.rate-limit.max-attempts=2",
                "app.auth.rate-limit.window-seconds=60"
        })
@Import(TestcontainersConfiguration.class)
class TrustedProxyRateLimitIntegrationTest {

    @LocalServerPort
    int port;

    @Autowired
    UserRepository userRepository;

    private final HttpClient client = HttpClient.newHttpClient();

    @AfterEach
    void cleanUp() {
        userRepository.deleteAll();
    }

    @Test
    void honorsForwardedForOnlyFromTrustedLoopbackProxy() throws Exception {
        // max-attempts=2: a 3ª tentativa do mesmo IP forjado estoura o limite.
        registerAs("9.9.9.1", 1, 201);
        registerAs("9.9.9.1", 2, 201);
        registerAs("9.9.9.1", 3, 429);

        // IP forjado diferente: bucket independente. Só é possível porque a
        // conexão local (loopback) foi confiada e o header foi honrado —
        // caso contrário todas as chamadas acima já teriam colidido no mesmo
        // getRemoteAddr() real (127.0.0.1) e esta também estaria bloqueada.
        registerAs("9.9.9.2", 1, 201);
    }

    private void registerAs(String forwardedFor, int seq, int expectedStatus) throws Exception {
        String csrfToken = fetchCsrfToken();
        String email = "proxy-test-" + forwardedFor.replace('.', '-') + "-" + seq + "@example.com";
        String body = """
                {"name":"Proxy Test","email":"%s","password":"senha1234"}
                """.formatted(email);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + "/api/auth/register"))
                .header("Content-Type", "application/json")
                .header("X-Forwarded-For", forwardedFor)
                .header("X-XSRF-TOKEN", csrfToken)
                .header("Cookie", "XSRF-TOKEN=" + csrfToken)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(expectedStatus);
    }

    private String fetchCsrfToken() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + "/api/auth/me"))
                .GET()
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        return response.headers().allValues("Set-Cookie").stream()
                .filter(c -> c.startsWith("XSRF-TOKEN="))
                .findFirst()
                .map(this::extractCookieValue)
                .orElseThrow(() -> new IllegalStateException("XSRF-TOKEN cookie não emitido"));
    }

    private String extractCookieValue(String setCookieHeader) {
        Matcher matcher = Pattern.compile("XSRF-TOKEN=([^;]+)").matcher(setCookieHeader);
        if (!matcher.find()) {
            throw new IllegalStateException("não foi possível extrair XSRF-TOKEN de: " + setCookieHeader);
        }
        return matcher.group(1);
    }

    private String baseUrl() {
        return "http://localhost:" + port;
    }
}
