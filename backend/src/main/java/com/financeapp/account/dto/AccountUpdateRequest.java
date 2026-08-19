package com.financeapp.account.dto;

import com.financeapp.account.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Usado na atualização (PUT) — substitui o registro inteiro, incluindo active. */
public record AccountUpdateRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 80, message = "Nome deve ter no máximo 80 caracteres")
        String name,

        @NotNull(message = "Tipo é obrigatório")
        AccountType type,

        @NotNull(message = "Saldo inicial é obrigatório")
        BigDecimal initialBalance,

        @NotNull(message = "active é obrigatório")
        Boolean active
) {
}
