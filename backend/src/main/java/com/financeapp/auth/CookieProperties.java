package com.financeapp.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.cookie")
public class CookieProperties {

    /**
     * Controla o atributo {@code Secure} dos cookies de autenticação.
     * {@code true} em produção (HTTPS); {@code false} em desenvolvimento
     * local (HTTP), pois o navegador descarta cookies "Secure" fora de HTTPS.
     */
    private boolean secure = true;

    public boolean isSecure() {
        return secure;
    }

    public void setSecure(boolean secure) {
        this.secure = secure;
    }
}
