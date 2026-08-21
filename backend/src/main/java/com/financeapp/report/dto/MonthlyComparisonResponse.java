package com.financeapp.report.dto;

import java.math.BigDecimal;

/** {@code month} no formato {@code "yyyy-MM"} — mesmo padrão da série MONTH de {@link IncomeExpenseSeriesPointResponse}. */
public record MonthlyComparisonResponse(String month, BigDecimal income, BigDecimal expense, BigDecimal netResult) {
}
