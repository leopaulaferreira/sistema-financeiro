package com.financeapp.common;

/**
 * Compartilhado entre {@code Category} e {@code Transaction} — o tipo de
 * uma categoria precisa ser comparável ao tipo da transação que a usa
 * (ARCHITECTURE.md §9.1), por isso um único enum em vez de dois.
 */
public enum TransactionType {
    INCOME,
    EXPENSE
}
