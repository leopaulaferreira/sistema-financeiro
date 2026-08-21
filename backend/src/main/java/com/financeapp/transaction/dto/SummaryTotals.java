package com.financeapp.transaction.dto;

import java.math.BigDecimal;

/**
 * Projeção interna do relatório de resumo financeiro (Fase 8): totais,
 * médias e contagem calculados numa única agregação SQL. {@code avgIncome}/
 * {@code avgExpense} são {@link Double} (não {@link BigDecimal}) porque a
 * especificação JPQL define que {@code AVG()} sempre retorna {@code Double},
 * independente do tipo do campo somado — convertidos para BigDecimal no
 * Service. Campos de valor vêm {@code null} quando não há nenhuma
 * transação do tipo correspondente no período — normalizados pelo Service,
 * nunca aqui.
 */
public record SummaryTotals(BigDecimal income, BigDecimal expense, Double avgIncome, Double avgExpense, long count) {
}
