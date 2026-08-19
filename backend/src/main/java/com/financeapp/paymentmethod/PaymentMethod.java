package com.financeapp.paymentmethod;

import com.financeapp.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Registro por usuário (não global) — cada usuário tem seus próprios
 * métodos de pagamento, podendo nomeá-los livremente (ex.: "Nubank Crédito"
 * vs "Inter Crédito"), conforme ARCHITECTURE.md §9.1.
 */
@Entity
@Table(name = "payment_methods")
public class PaymentMethod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 60)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethodType type;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PaymentMethod() {
    }

    public PaymentMethod(User user, String name, PaymentMethodType type) {
        this.user = user;
        this.name = name;
        this.type = type;
        this.createdAt = Instant.now();
    }

    public void update(String name, PaymentMethodType type) {
        this.name = name;
        this.type = type;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getName() {
        return name;
    }

    public PaymentMethodType getType() {
        return type;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
