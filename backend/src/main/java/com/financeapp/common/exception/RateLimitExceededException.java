package com.financeapp.common.exception;

/** Lançada quando um cliente excede o limite de tentativas em um endpoint sensível (Fase 9). */
public class RateLimitExceededException extends RuntimeException {

    public RateLimitExceededException(String message) {
        super(message);
    }
}
