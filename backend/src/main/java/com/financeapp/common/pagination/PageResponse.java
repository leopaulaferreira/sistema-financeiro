package com.financeapp.common.pagination;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Contrato de paginação próprio da API, em vez de serializar
 * {@code org.springframework.data.domain.Page} diretamente — evita expor
 * metadados internos do Spring Data e mantém o formato de resposta estável
 * mesmo se a implementação de paginação mudar no futuro.
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}
