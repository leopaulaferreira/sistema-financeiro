package com.financeapp.category.dto;

import com.financeapp.category.Category;
import com.financeapp.common.TransactionType;

import java.time.Instant;

public record CategoryResponse(
        Long id,
        String name,
        TransactionType type,
        String color,
        String icon,
        boolean isDefault,
        Instant createdAt
) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getType(),
                category.getColor(),
                category.getIcon(),
                category.isDefault(),
                category.getCreatedAt()
        );
    }
}
