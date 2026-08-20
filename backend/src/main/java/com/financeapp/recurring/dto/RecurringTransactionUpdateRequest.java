package com.financeapp.recurring.dto;

import com.financeapp.recurring.RecurrenceFrequency;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * PUT substitui o registro inteiro, igual ao padrão de
 * {@code AccountUpdateRequest} (inclui {@code active}, reaproveitado para
 * pausar/reativar em vez de um endpoint PATCH dedicado). {@code type} não é
 * editável — trocar receita↔despesa é semanticamente uma nova recorrência.
 * {@code startDate} só é aceita se a regra ainda não gerou nenhuma
 * ocorrência (validado no Service).
 */
public record RecurringTransactionUpdateRequest(
        @NotBlank(message = "Descrição é obrigatória")
        @Size(max = 160, message = "Descrição deve ter no máximo 160 caracteres")
        String description,

        @NotNull(message = "Valor é obrigatório")
        @DecimalMin(value = "0.0", inclusive = false, message = "Valor deve ser maior que zero")
        BigDecimal amount,

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

        LocalDate endDate,

        @NotNull(message = "active é obrigatório")
        Boolean active
) {
}
