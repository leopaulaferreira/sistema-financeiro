package com.financeapp.account.dto;

import com.financeapp.account.AccountType;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Usado na criação — a conta sempre nasce ativa. */
public record AccountRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 80, message = "Nome deve ter no máximo 80 caracteres")
        String name,

        @NotNull(message = "Tipo é obrigatório")
        AccountType type,

        @NotNull(message = "Saldo inicial é obrigatório")
        @Digits(integer = 10, fraction = 2, message = "Saldo inicial deve ter no máximo 10 dígitos inteiros e 2 casas decimais")
        BigDecimal initialBalance
) {
}
