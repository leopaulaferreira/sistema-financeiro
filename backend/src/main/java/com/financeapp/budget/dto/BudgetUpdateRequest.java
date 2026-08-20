package com.financeapp.budget.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** PUT substitui o registro inteiro, mesmo padrão das demais entidades do projeto. */
public record BudgetUpdateRequest(
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
