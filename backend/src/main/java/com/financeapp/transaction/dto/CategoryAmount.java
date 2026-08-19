package com.financeapp.transaction.dto;

import java.math.BigDecimal;

/** Projeção interna: uma linha do agrupamento de despesas por categoria. */
public record CategoryAmount(Long categoryId, String categoryName, BigDecimal amount) {
}
