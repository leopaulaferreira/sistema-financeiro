package com.financeapp.common.exception;

/**
 * Cobre tanto e-mail inexistente quanto senha incorreta — a mensagem exposta
 * ao cliente é sempre genérica para não revelar qual das duas falhou.
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
