package com.financeapp.goal.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** {@code targetDate}, se informada, não pode ser anterior a hoje (validado no Service — precisa da data atual). */
public record FinancialGoalCreateRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
        String name,

        @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres")
        String description,

        @NotNull(message = "Valor alvo é obrigatório")
        @DecimalMin(value = "0.0", inclusive = false, message = "Valor alvo deve ser maior que zero")
        BigDecimal targetAmount,

        LocalDate targetDate
) {
}
