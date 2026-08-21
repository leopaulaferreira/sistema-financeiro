package com.financeapp.goal;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FinancialGoalRepository extends JpaRepository<FinancialGoal, Long> {

    Optional<FinancialGoal> findByIdAndUserId(Long id, Long userId);

    /**
     * Ordenação da seção 18 da Fase 7: ativas primeiro, depois por
     * {@code targetDate} crescente (metas sem data ficam por último), por
     * fim as mais recentes primeiro. Uma única query cobre com e sem
     * filtro de status — quando filtrado, o CASE de "ativa primeiro" é só
     * inofensivo (todas as linhas têm o mesmo status).
     */
    @Query("""
            select g from FinancialGoal g
            where g.user.id = :userId and (:status is null or g.status = :status)
            order by case when g.status = com.financeapp.goal.GoalStatus.ACTIVE then 0 else 1 end,
                     g.targetDate asc nulls last,
                     g.createdAt desc
            """)
    List<FinancialGoal> findAllOrdered(@Param("userId") Long userId, @Param("status") GoalStatus status);
}
