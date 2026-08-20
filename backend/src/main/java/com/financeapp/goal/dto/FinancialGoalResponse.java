package com.financeapp.goal.dto;

import com.financeapp.goal.FinancialGoal;
import com.financeapp.goal.GoalStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * {@code currentAmount}/{@code remainingAmount}/{@code progressPercentage}
 * nunca são persistidos — sempre calculados em {@code GoalService.toResponse}
 * a partir de {@code SUM(goal_contributions.amount)}. {@code daysRemaining}
 * só é preenchido quando há {@code targetDate}; pode ser negativo (meta
 * vencida sem ter sido concluída).
 */
public record FinancialGoalResponse(
        Long id,
        String name,
        String description,
        BigDecimal targetAmount,
        BigDecimal currentAmount,
        BigDecimal remainingAmount,
        BigDecimal progressPercentage,
        LocalDate targetDate,
        Long daysRemaining,
        GoalStatus status,
        Instant createdAt
) {

    public static FinancialGoalResponse of(FinancialGoal goal, BigDecimal currentAmount, BigDecimal remainingAmount,
                                            BigDecimal progressPercentage, Long daysRemaining) {
        return new FinancialGoalResponse(
                goal.getId(),
                goal.getName(),
                goal.getDescription(),
                goal.getTargetAmount(),
                currentAmount,
                remainingAmount,
                progressPercentage,
                goal.getTargetDate(),
                daysRemaining,
                goal.getStatus(),
                goal.getCreatedAt()
        );
    }
}
