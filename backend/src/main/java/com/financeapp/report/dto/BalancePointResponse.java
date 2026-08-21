package com.financeapp.report.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BalancePointResponse(LocalDate date, BigDecimal balance) {
}
