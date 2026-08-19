package com.financeapp.transaction.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Projeção interna: uma linha do agrupamento diário de receitas/despesas. */
public record DailyTotals(LocalDate date, BigDecimal income, BigDecimal expense) {
}
