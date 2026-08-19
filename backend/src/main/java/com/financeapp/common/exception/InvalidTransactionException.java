package com.financeapp.common.exception;

/**
 * Violação de regra de negócio da transação que não é capturável por
 * Bean Validation isolado no DTO (ex.: categoria com tipo incompatível
 * com o tipo da transação).
 */
public class InvalidTransactionException extends RuntimeException {

    public InvalidTransactionException(String message) {
        super(message);
    }
}
