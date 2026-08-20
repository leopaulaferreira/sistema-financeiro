package com.financeapp.goal.dto;

import com.financeapp.goal.GoalStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * PUT substitui o registro inteiro, mesmo padrão das demais entidades.
 * {@code status} só aceita {@code ACTIVE}/{@code CANCELLED} do cliente —
 * {@code COMPLETED} é sempre derivado automaticamente das contribuições
 * (rejeitado com 400 pelo Service se enviado aqui).
 */
public record FinancialGoalUpdateRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres")
        String name,

        @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres")
        String description,

        @NotNull(message = "Valor alvo é obrigatório")
        @DecimalMin(value = "0.0", inclusive = false, message = "Valor alvo deve ser maior que zero")
        BigDecimal targetAmount,

        LocalDate targetDate,

        @NotNull(message = "Status é obrigatório")
        GoalStatus status
) {
}
