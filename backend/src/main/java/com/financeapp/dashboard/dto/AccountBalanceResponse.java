package com.financeapp.dashboard.dto;

import com.financeapp.account.AccountType;

import java.math.BigDecimal;

public record AccountBalanceResponse(
        Long accountId,
        String accountName,
        AccountType accountType,
        BigDecimal balance
) {
}
