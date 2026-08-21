package com.financeapp.budget.dto;

import com.financeapp.budget.Budget;
import com.financeapp.budget.BudgetStatus;

import java.math.BigDecimal;

/**
 * {@code spent}/{@code remaining}/{@code percentageUsed}/{@code status} são
 * sempre calculados em runtime (nunca persistidos) — ver
 * {@code BudgetService.toResponse}. {@code percentageUsed} pode passar de
 * 100 (orçamento estourado): o valor real é sempre exposto, sem cap.
 */
public record BudgetResponse(
        Long id,
        Integer year,
        Integer month,
        BigDecimal amount,
        BigDecimal spent,
        BigDecimal remaining,
        BigDecimal percentageUsed,
        BudgetStatus status,
        Ref category
) {

    public record Ref(Long id, String name) {
    }

    public static BudgetResponse of(Budget budget, BigDecimal spent, BigDecimal remaining,
                                     BigDecimal percentageUsed, BudgetStatus status) {
        return new BudgetResponse(
                budget.getId(),
                budget.getYear(),
                budget.getMonth(),
                budget.getAmount(),
                spent,
                remaining,
                percentageUsed,
                status,
                new Ref(budget.getCategory().getId(), budget.getCategory().getName())
        );
    }
}
