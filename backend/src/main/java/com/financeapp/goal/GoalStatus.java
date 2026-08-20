package com.financeapp.goal;

/**
 * Único campo persistido de estado em {@link FinancialGoal} — o progresso
 * em si nunca é (é sempre {@code SUM(goal_contributions.amount)}, ver
 * {@link GoalContribution}). ACTIVE/COMPLETED são recalculados
 * automaticamente a cada mudança de contribuição
 * ({@link GoalService#recalculateStatus}); CANCELLED é sempre uma ação
 * manual do usuário e nunca é sobrescrito automaticamente.
 */
public enum GoalStatus {
    ACTIVE,
    COMPLETED,
    CANCELLED
}
