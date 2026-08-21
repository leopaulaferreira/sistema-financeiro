package com.financeapp.report.dto;

import java.math.BigDecimal;

/** Reaproveitado para "despesas por categoria" e "receitas por categoria" (Fase 8) — mesmo shape, tipo já filtra a query. */
public record CategoryReportResponse(Long categoryId, String categoryName, BigDecimal amount, BigDecimal percentage) {
}
