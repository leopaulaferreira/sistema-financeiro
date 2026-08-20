package com.financeapp.goal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface GoalContributionRepository extends JpaRepository<GoalContribution, Long> {

    List<GoalContribution> findAllByGoalIdAndUserIdOrderByDateDescIdDesc(Long goalId, Long userId);

    Optional<GoalContribution> findByIdAndGoalIdAndUserId(Long id, Long goalId, Long userId);

    /**
     * Progresso da meta (ARCHITECTURE.md §9.2, Fase 7): sempre a soma real
     * das contribuições, nunca um valor persistido em
     * {@code financial_goals}. {@code null} quando a meta ainda não tem
     * nenhuma contribuição, normalizado para {@link BigDecimal#ZERO} no
     * Service.
     */
    @Query("select sum(c.amount) from GoalContribution c where c.goal.id = :goalId")
    BigDecimal sumAmountByGoalId(@Param("goalId") Long goalId);
}
