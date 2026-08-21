package com.financeapp.report.dto;

import java.math.BigDecimal;

public record PaymentMethodReportResponse(
        Long paymentMethodId,
        String paymentMethodName,
        BigDecimal amount,
        BigDecimal percentage,
        long transactionCount
) {
}
