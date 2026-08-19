package com.financeapp.transaction.dto;

import java.math.BigDecimal;

/**
 * Projeção interna de agregação (não é resposta HTTP — {@code dashboard.dto}
 * tem os DTOs expostos pela API). Campos nulos quando não há nenhuma
 * transação do tipo correspondente no período — normalizados para
 * {@link BigDecimal#ZERO} pelo Service, nunca pelo repository.
 */
public record PeriodTotals(BigDecimal income, BigDecimal expense) {
}
