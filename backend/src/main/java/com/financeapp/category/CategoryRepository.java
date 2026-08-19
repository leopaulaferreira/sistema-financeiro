package com.financeapp.category;

import com.financeapp.common.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByUserIdOrderByNameAsc(Long userId);

    List<Category> findAllByUserIdAndTypeOrderByNameAsc(Long userId, TransactionType type);

    Optional<Category> findByIdAndUserId(Long id, Long userId);
}
