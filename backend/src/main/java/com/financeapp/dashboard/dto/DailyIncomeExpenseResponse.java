package com.financeapp.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyIncomeExpenseResponse(
        LocalDate date,
        BigDecimal income,
        BigDecimal expense
) {
}
