package com.financeapp;

import com.financeapp.auth.CookieProperties;
import com.financeapp.auth.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

// UserDetailsServiceAutoConfiguration é excluída porque a autenticação deste
// projeto é 100% custom (JWT em cookie, ver auth/), sem AuthenticationManager
// baseado em UserDetailsService — sem essa exclusão o Spring Boot gera um
// usuário em memória com senha aleatória a cada boot, que nunca é usado e só
// polui o log.
// @EnableScheduling ativa o processador de recorrências da Fase 6
// (RecurringTransactionScheduler) — único uso de @Scheduled no projeto.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableConfigurationProperties({JwtProperties.class, CookieProperties.class})
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

}
