package com.financeapp.budget;

/**
 * Nunca persistido — sempre derivado de {@code spent/amount} em
 * {@link BudgetService} (ARCHITECTURE.md §9.2). Thresholds: SAFE {@code <
 * 80%}, WARNING {@code 80–100%}, EXCEEDED {@code > 100%} (sugestão do
 * prompt da Fase 7, mantida sem alteração).
 */
public enum BudgetStatus {
    SAFE,
    WARNING,
    EXCEEDED
}
