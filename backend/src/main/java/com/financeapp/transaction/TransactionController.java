package com.financeapp.transaction;

import com.financeapp.auth.AuthenticatedUser;
import com.financeapp.common.TransactionType;
import com.financeapp.common.pagination.PageResponse;
import com.financeapp.transaction.dto.TransactionRequest;
import com.financeapp.transaction.dto.TransactionResponse;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                                        @Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(transactionService.create(principal.id(), request));
    }

    @GetMapping
    public PageResponse<TransactionResponse> search(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int cappedSize = Math.min(Math.max(size, 1), 100);
        return transactionService.search(principal.id(), from, to, type, categoryId, accountId, page, cappedSize);
    }

    @GetMapping("/{id}")
    public TransactionResponse get(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        return transactionService.get(principal.id(), id);
    }

    @PutMapping("/{id}")
    public TransactionResponse update(@AuthenticationPrincipal AuthenticatedUser principal,
                                       @PathVariable Long id,
                                       @Valid @RequestBody TransactionRequest request) {
        return transactionService.update(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        transactionService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }
}
