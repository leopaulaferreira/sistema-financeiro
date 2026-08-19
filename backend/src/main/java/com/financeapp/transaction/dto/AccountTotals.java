package com.financeapp.transaction.dto;

import java.math.BigDecimal;

/** Projeção interna: uma linha do agrupamento de receitas/despesas por conta. */
public record AccountTotals(Long accountId, BigDecimal income, BigDecimal expense) {
}
