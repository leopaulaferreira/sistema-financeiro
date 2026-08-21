package com.financeapp.budget.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** A categoria deve ser EXPENSE e pertencer ao usuário (validado no Service, a validação de bean não alcança isso). */
public record BudgetCreateRequest(
        @NotNull(message = "Categoria é obrigatória")
        Long categoryId,

        @NotNull(message = "Ano é obrigatório")
        @Min(value = 2000, message = "Ano inválido")
        @Max(value = 2100, message = "Ano inválido")
        Integer year,

        @NotNull(message = "Mês é obrigatório")
        @Min(value = 1, message = "Mês deve estar entre 1 e 12")
        @Max(value = 12, message = "Mês deve estar entre 1 e 12")
        Integer month,

        @NotNull(message = "Valor é obrigatório")
        @DecimalMin(value = "0.0", inclusive = false, message = "Valor deve ser maior que zero")
        BigDecimal amount
) {
}
