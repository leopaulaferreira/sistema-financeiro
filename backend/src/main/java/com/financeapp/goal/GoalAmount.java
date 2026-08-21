package com.financeapp.goal;

import java.math.BigDecimal;

/** Projeção interna: soma de contribuições agrupada por meta (evita N+1 em {@code GoalService#list}). */
public record GoalAmount(Long goalId, BigDecimal amount) {
}
