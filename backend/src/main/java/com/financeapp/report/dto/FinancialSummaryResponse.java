package com.financeapp.report.dto;

import java.math.BigDecimal;

public record FinancialSummaryResponse(
        BigDecimal totalIncome,
        BigDecimal totalExpenses,
        BigDecimal netResult,
        long transactionCount,
        BigDecimal averageIncome,
        BigDecimal averageExpense
) {
}
