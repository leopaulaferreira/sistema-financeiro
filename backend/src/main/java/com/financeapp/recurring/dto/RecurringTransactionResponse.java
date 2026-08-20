package com.financeapp.recurring.dto;

import com.financeapp.common.TransactionType;
import com.financeapp.recurring.RecurrenceFrequency;
import com.financeapp.recurring.RecurringTransaction;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RecurringTransactionResponse(
        Long id,
        String description,
        BigDecimal amount,
        TransactionType type,
        RecurrenceFrequency frequency,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate nextExecutionDate,
        LocalDate lastExecutionDate,
        boolean active,
        Ref account,
        Ref category,
        Ref paymentMethod
) {

    public record Ref(Long id, String name) {
    }

    public static RecurringTransactionResponse from(RecurringTransaction r) {
        return new RecurringTransactionResponse(
                r.getId(),
                r.getDescription(),
                r.getAmount(),
                r.getType(),
                r.getFrequency(),
                r.getStartDate(),
                r.getEndDate(),
                r.getNextExecutionDate(),
                r.getLastExecutionDate(),
                r.isActive(),
                new Ref(r.getAccount().getId(), r.getAccount().getName()),
                new Ref(r.getCategory().getId(), r.getCategory().getName()),
                new Ref(r.getPaymentMethod().getId(), r.getPaymentMethod().getName())
        );
    }
}
