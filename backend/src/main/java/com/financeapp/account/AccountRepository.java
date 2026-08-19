package com.financeapp.account;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findAllByUserIdOrderByNameAsc(Long userId);

    List<Account> findAllByUserIdAndTypeNotOrderByNameAsc(Long userId, AccountType type);

    Optional<Account> findByIdAndUserId(Long id, Long userId);

    /**
     * {@code null} se o usuário não tiver nenhuma conta de disponibilidade
     * (excluindo CREDIT_CARD) — normalizado para ZERO no Service.
     */
    @Query("select sum(a.initialBalance) from Account a where a.user.id = :userId and a.type <> com.financeapp.account.AccountType.CREDIT_CARD")
    BigDecimal sumInitialBalanceExcludingCreditCard(@Param("userId") Long userId);
}
