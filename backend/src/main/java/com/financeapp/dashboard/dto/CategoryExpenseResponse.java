package com.financeapp.dashboard.dto;

import java.math.BigDecimal;

public record CategoryExpenseResponse(
        Long categoryId,
        String categoryName,
        BigDecimal amount,
        BigDecimal percentage
) {
}
