package com.financeapp.common.exception;

/**
 * Lançada ao tentar excluir um recurso (conta, categoria, método de
 * pagamento) que ainda possui transações vinculadas.
 */
public class ResourceInUseException extends RuntimeException {

    public ResourceInUseException(String message) {
        super(message);
    }
}
