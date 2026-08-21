package com.financeapp.report.dto;

import java.math.BigDecimal;

/**
 * Um ponto da série receitas x despesas (Fase 8). {@code period} é
 * {@code "yyyy-MM-dd"} para granularidade DAY e {@code "yyyy-MM"} para
 * MONTH — mesmo DTO reaproveitado para as duas granularidades (só o
 * formato da string muda), documentado em ARCHITECTURE.md.
 */
public record IncomeExpenseSeriesPointResponse(String period, BigDecimal income, BigDecimal expense) {
}
