package com.financeapp.common.exception;

import java.time.Instant;
import java.util.List;

public record ApiError(
        int status,
        String message,
        List<FieldError> errors,
        Instant timestamp
) {

    public record FieldError(String field, String message) {
    }

    public static ApiError of(int status, String message) {
        return new ApiError(status, message, List.of(), Instant.now());
    }

    public static ApiError of(int status, String message, List<FieldError> errors) {
        return new ApiError(status, message, errors, Instant.now());
    }
}
