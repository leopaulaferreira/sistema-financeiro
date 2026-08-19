package com.financeapp.paymentmethod.dto;

import com.financeapp.paymentmethod.PaymentMethod;
import com.financeapp.paymentmethod.PaymentMethodType;

import java.time.Instant;

public record PaymentMethodResponse(
        Long id,
        String name,
        PaymentMethodType type,
        Instant createdAt
) {

    public static PaymentMethodResponse from(PaymentMethod paymentMethod) {
        return new PaymentMethodResponse(
                paymentMethod.getId(),
                paymentMethod.getName(),
                paymentMethod.getType(),
                paymentMethod.getCreatedAt()
        );
    }
}
