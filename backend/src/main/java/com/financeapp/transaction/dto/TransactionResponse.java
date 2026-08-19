package com.financeapp.transaction.dto;

import com.financeapp.common.TransactionType;
import com.financeapp.transaction.Transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record TransactionResponse(
        Long id,
        String description,
        BigDecimal amount,
        TransactionType type,
        LocalDate date,
        String notes,
        Long categoryId,
        String categoryName,
        Long accountId,
        String accountName,
        Long paymentMethodId,
        String paymentMethodName,
        Instant createdAt,
        Instant updatedAt
) {

    public static TransactionResponse from(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getDescription(),
                transaction.getAmount(),
                transaction.getType(),
                transaction.getDate(),
                transaction.getNotes(),
                transaction.getCategory().getId(),
                transaction.getCategory().getName(),
                transaction.getAccount().getId(),
                transaction.getAccount().getName(),
                transaction.getPaymentMethod().getId(),
                transaction.getPaymentMethod().getName(),
                transaction.getCreatedAt(),
                transaction.getUpdatedAt()
        );
    }
}
