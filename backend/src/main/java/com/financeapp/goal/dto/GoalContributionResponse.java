package com.financeapp.goal.dto;

import com.financeapp.goal.GoalContribution;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record GoalContributionResponse(
        Long id,
        BigDecimal amount,
        LocalDate date,
        String note,
        Instant createdAt
) {

    public static GoalContributionResponse from(GoalContribution contribution) {
        return new GoalContributionResponse(
                contribution.getId(),
                contribution.getAmount(),
                contribution.getDate(),
                contribution.getNote(),
                contribution.getCreatedAt()
        );
    }
}
