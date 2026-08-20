package com.financeapp.recurring.dto;

import com.financeapp.common.TransactionType;
import com.financeapp.recurring.RecurrenceFrequency;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * {@code startDate} é a primeira data de execução (não "início da regra com
 * primeira execução posterior") — ao criar, {@code nextExecutionDate} nasce
 * igual a {@code startDate}. {@code nextExecutionDate} nunca é aceita do
 * cliente: é sempre calculada no backend.
 */
public record RecurringTransactionCreateRequest(
        @NotBlank(message = "Descrição é obrigatória")
        @Size(max = 160, message = "Descrição deve ter no máximo 160 caracteres")
        String description,

        @NotNull(message = "Valor é obrigatório")
        @DecimalMin(value = "0.0", inclusive = false, message = "Valor deve ser maior que zero")
        BigDecimal amount,

        @NotNull(message = "Tipo é obrigatório")
        TransactionType type,

        @NotNull(message = "Categoria é obrigatória")
        Long categoryId,

        @NotNull(message = "Conta é obrigatória")
        Long accountId,

        @NotNull(message = "Método de pagamento é obrigatório")
        Long paymentMethodId,

        @NotNull(message = "Frequência é obrigatória")
        RecurrenceFrequency frequency,

        @NotNull(message = "Data de início é obrigatória")
        LocalDate startDate,

        LocalDate endDate
) {
}
