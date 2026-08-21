package com.financeapp.report.dto;

import java.math.BigDecimal;

/** {@code netFlow} é receita menos despesa DO PERÍODO — não é o saldo atual da conta (ver ARCHITECTURE.md, Fase 8). */
public record AccountFlowResponse(Long accountId, String accountName, BigDecimal income, BigDecimal expense, BigDecimal netFlow) {
}
