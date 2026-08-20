package com.financeapp.recurring;

import com.financeapp.account.Account;
import com.financeapp.category.Category;
import com.financeapp.common.TransactionType;
import com.financeapp.paymentmethod.PaymentMethod;
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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Regra geradora de {@link com.financeapp.transaction.Transaction} — NUNCA
 * substitui Transaction, que continua o lançamento atômico do sistema
 * (ARCHITECTURE.md §9.3.1). {@code startDate} é sempre a primeira data de
 * execução (não "início da regra" com primeira execução posterior): ao criar
 * uma recorrência, {@code nextExecutionDate} nasce igual a {@code startDate}.
 */
@Entity
@Table(name = "recurring_transactions")
public class RecurringTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_method_id", nullable = false)
    private PaymentMethod paymentMethod;

    @Column(nullable = false, length = 160)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RecurrenceFrequency frequency;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "next_execution_date", nullable = false)
    private LocalDate nextExecutionDate;

    @Column(name = "last_execution_date")
    private LocalDate lastExecutionDate;

    @Column(nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected RecurringTransaction() {
    }

    public RecurringTransaction(User user, Account account, Category category, PaymentMethod paymentMethod,
                                 String description, BigDecimal amount, TransactionType type,
                                 RecurrenceFrequency frequency, LocalDate startDate, LocalDate endDate) {
        this.user = user;
        this.account = account;
        this.category = category;
        this.paymentMethod = paymentMethod;
        this.description = description;
        this.amount = amount;
        this.type = type;
        this.frequency = frequency;
        this.startDate = startDate;
        this.endDate = endDate;
        this.nextExecutionDate = startDate;
        this.active = true;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    /**
     * Atualiza os campos "de conteúdo" da regra. Não mexe em
     * {@code nextExecutionDate}/{@code active} — isso é decidido pelo
     * Service, que sabe se a mudança de frequência/startDate exige
     * recálculo (ARCHITECTURE.md, seção de edição da Fase 6).
     */
    public void update(Account account, Category category, PaymentMethod paymentMethod, String description,
                        BigDecimal amount, RecurrenceFrequency frequency, LocalDate startDate, LocalDate endDate) {
        this.account = account;
        this.category = category;
        this.paymentMethod = paymentMethod;
        this.description = description;
        this.amount = amount;
        this.frequency = frequency;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public void rescheduleNextExecution(LocalDate nextExecutionDate) {
        this.nextExecutionDate = nextExecutionDate;
    }

    /** Chamado pelo processador ao gerar uma ocorrência: avança o ponteiro e registra a última execução real. */
    public void recordExecution(LocalDate occurredOn, LocalDate nextExecutionDate) {
        this.lastExecutionDate = occurredOn;
        this.nextExecutionDate = nextExecutionDate;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Account getAccount() {
        return account;
    }

    public Category getCategory() {
        return category;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public TransactionType getType() {
        return type;
    }

    public RecurrenceFrequency getFrequency() {
        return frequency;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public LocalDate getNextExecutionDate() {
        return nextExecutionDate;
    }

    public LocalDate getLastExecutionDate() {
        return lastExecutionDate;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
