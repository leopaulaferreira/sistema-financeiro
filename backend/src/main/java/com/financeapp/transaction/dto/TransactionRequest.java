package com.financeapp.transaction.dto;

import com.financeapp.common.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Usado tanto na criação quanto na atualização (PUT substitui o registro
 * inteiro). Nunca contém {@code userId} — o dono é sempre derivado do
 * usuário autenticado no backend (ARCHITECTURE.md §6, nunca confiar em
 * user_id vindo do cliente).
 */
public record TransactionRequest(
        @NotBlank(message = "Descrição é obrigatória")
        @Size(max = 160, message = "Descrição deve ter no máximo 160 caracteres")
        String description,

        @NotNull(message = "Valor é obrigatório")
        @DecimalMin(value = "0.0", inclusive = false, message = "Valor deve ser maior que zero")
        BigDecimal amount,

        @NotNull(message = "Tipo é obrigatório")
        TransactionType type,

        @NotNull(message = "Data é obrigatória")
        LocalDate date,

        @NotNull(message = "Categoria é obrigatória")
        Long categoryId,

        @NotNull(message = "Conta é obrigatória")
        Long accountId,

        @NotNull(message = "Método de pagamento é obrigatório")
        Long paymentMethodId,

        @Size(max = 500, message = "Observação deve ter no máximo 500 caracteres")
        String notes
) {
}
