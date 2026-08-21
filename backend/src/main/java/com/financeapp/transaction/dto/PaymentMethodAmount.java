package com.financeapp.transaction.dto;

import java.math.BigDecimal;

/** Projeção interna: uma linha do agrupamento de despesas por método de pagamento (Fase 8). */
public record PaymentMethodAmount(Long paymentMethodId, String paymentMethodName, BigDecimal amount, long count) {
}
