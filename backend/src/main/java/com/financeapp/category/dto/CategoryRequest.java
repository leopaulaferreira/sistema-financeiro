package com.financeapp.category.dto;

import com.financeapp.common.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 60, message = "Nome deve ter no máximo 60 caracteres")
        String name,

        @NotNull(message = "Tipo é obrigatório")
        TransactionType type,

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Cor deve ser um hex válido, ex.: #7C5CFC")
        String color,

        @Size(max = 40, message = "Ícone deve ter no máximo 40 caracteres")
        String icon
) {
}
