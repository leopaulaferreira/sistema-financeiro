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

    /**
     * Mesma agregação de {@link #sumAmountByGoalId}, mas para várias metas
     * de uma vez (Fase 9: evita N+1 em {@code GoalService#list}, que antes
     * disparava uma query por meta retornada).
     */
    @Query("select new com.financeapp.goal.GoalAmount(c.goal.id, sum(c.amount)) " +
            "from GoalContribution c where c.goal.id in :goalIds group by c.goal.id")
    List<GoalAmount> sumAmountByGoalIds(@Param("goalIds") List<Long> goalIds);
}
