package com.financeapp.paymentmethod;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, Long> {

    List<PaymentMethod> findAllByUserIdOrderByNameAsc(Long userId);

    Optional<PaymentMethod> findByIdAndUserId(Long id, Long userId);
}
