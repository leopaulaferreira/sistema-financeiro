package com.financeapp.paymentmethod.dto;

import com.financeapp.paymentmethod.PaymentMethodType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PaymentMethodRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 60, message = "Nome deve ter no máximo 60 caracteres")
        String name,

        @NotNull(message = "Tipo é obrigatório")
        PaymentMethodType type
) {
}
