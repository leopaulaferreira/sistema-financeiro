package com.financeapp.budget;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long>, JpaSpecificationExecutor<Budget> {

    Optional<Budget> findByIdAndUserId(Long id, Long userId);

    boolean existsByCategoryId(Long categoryId);

    boolean existsByUserIdAndCategoryIdAndYearAndMonth(Long userId, Long categoryId, Integer year, Integer month);

    boolean existsByUserIdAndCategoryIdAndYearAndMonthAndIdNot(Long userId, Long categoryId, Integer year,
                                                                 Integer month, Long id);
}
