package com.financeapp.recurring;

import com.financeapp.auth.AuthenticatedUser;
import com.financeapp.common.TransactionType;
import com.financeapp.recurring.dto.RecurringTransactionCreateRequest;
import com.financeapp.recurring.dto.RecurringTransactionResponse;
import com.financeapp.recurring.dto.RecurringTransactionUpdateRequest;
import jakarta.validation.Valid;
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

import java.util.List;

@RestController
@RequestMapping("/api/recurring-transactions")
public class RecurringTransactionController {

    private final RecurringTransactionService recurringTransactionService;

    public RecurringTransactionController(RecurringTransactionService recurringTransactionService) {
        this.recurringTransactionService = recurringTransactionService;
    }

    @PostMapping
    public ResponseEntity<RecurringTransactionResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                                                 @Valid @RequestBody RecurringTransactionCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(recurringTransactionService.create(principal.id(), request));
    }

    @GetMapping
    public List<RecurringTransactionResponse> list(@AuthenticationPrincipal AuthenticatedUser principal,
                                                     @RequestParam(required = false) TransactionType type,
                                                     @RequestParam(required = false) Boolean active,
                                                     @RequestParam(required = false) RecurrenceFrequency frequency) {
        return recurringTransactionService.list(principal.id(), type, active, frequency);
    }

    @GetMapping("/{id}")
    public RecurringTransactionResponse get(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        return recurringTransactionService.get(principal.id(), id);
    }

    @PutMapping("/{id}")
    public RecurringTransactionResponse update(@AuthenticationPrincipal AuthenticatedUser principal,
                                                @PathVariable Long id,
                                                @Valid @RequestBody RecurringTransactionUpdateRequest request) {
        return recurringTransactionService.update(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        recurringTransactionService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }
}
